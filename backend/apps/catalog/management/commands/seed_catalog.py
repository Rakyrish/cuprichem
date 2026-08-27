"""
Import the existing front-end catalogue into the database.

The public site currently reads typed data from `src/data/taxonomy.ts`. This
command migrates that content into Postgres so the admin becomes the source of
truth, without inventing anything: records arrive with the same `status` and
`verified` flags they already carry, so nothing unconfirmed becomes public as a
side effect of the migration.

    python manage.py seed_catalog --create-admin you@example.com
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import Role
from apps.business.models import CompanySettings
from apps.catalog.models import Category, Industry, Product
from apps.core.models import PublishStatus
from apps.seo.services import rescore

# commands -> management -> catalog -> apps -> backend -> repository root
FRONTEND_ROOT = Path(__file__).resolve().parents[5]

#: The front-end statuses map onto the richer admin workflow.
STATUS_MAP = {
    "draft": PublishStatus.DRAFT,
    "review": PublishStatus.NEEDS_REVIEW,
    "published": PublishStatus.PUBLISHED,
}


class Command(BaseCommand):
    help = "Seed the catalogue from the Next.js taxonomy data and create an admin user."

    def add_arguments(self, parser):
        parser.add_argument("--create-admin", metavar="EMAIL", help="Create a super admin user.")
        parser.add_argument("--password", help="Password for the created admin.")
        parser.add_argument(
            "--taxonomy",
            default=str(FRONTEND_ROOT / "src" / "data" / "taxonomy.ts"),
            help="Path to the front-end taxonomy.ts file.",
        )

    def handle(self, *args, **options):
        if options["create_admin"]:
            self._create_admin(options["create_admin"], options.get("password"))

        self._ensure_company_settings()

        taxonomy_path = Path(options["taxonomy"])
        if not taxonomy_path.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"No taxonomy file at {taxonomy_path} — skipping catalogue import."
                )
            )
            return

        data = self._load_taxonomy(taxonomy_path)
        with transaction.atomic():
            counts = self._import(data)

        self.stdout.write(
            self.style.SUCCESS(
                "Imported "
                f"{counts['categories']} categories, "
                f"{counts['industries']} industries, "
                f"{counts['products']} products."
            )
        )

    # -- helpers ----------------------------------------------------------- #

    def _load_taxonomy(self, path: Path) -> dict:
        """
        Read the catalogue out of taxonomy.ts.

        The file is transpiled with the repository's own TypeScript compiler
        rather than pattern-stripped: type annotations appear in function
        signatures and generics that regexes mangle, and a silently mis-parsed
        catalogue is far worse than a loud failure. Reading the real file also
        means there is never a second, drifting copy of the catalogue.
        """
        script = """
        const fs = require('fs'), path = require('path'), os = require('os');
        const ts = require(process.argv[1]);
        const source = fs.readFileSync(process.argv[2], 'utf8');
        const js = ts.transpileModule(source, {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText;
        const tmp = path.join(os.tmpdir(), 'cuprichem_taxonomy_' + process.pid + '.cjs');
        fs.writeFileSync(tmp, js);
        try {
          const mod = require(tmp);
          process.stdout.write(JSON.stringify({
            categories: mod.categories || [],
            products: mod.products || [],
            industries: mod.industries || [],
          }));
        } finally {
          fs.unlinkSync(tmp);
        }
        """
        typescript_entry = FRONTEND_ROOT / "node_modules" / "typescript"
        if not typescript_entry.exists():
            raise CommandError(
                "The TypeScript package was not found. Run `npm install` in the "
                "repository root before seeding."
            )

        try:
            result = subprocess.run(
                ["node", "-e", script, str(typescript_entry), str(path)],
                capture_output=True,
                text=True,
                timeout=60,
                check=True,
                cwd=str(FRONTEND_ROOT),
            )
        except FileNotFoundError as exc:
            raise CommandError("Node.js is required to read taxonomy.ts.") from exc
        except subprocess.CalledProcessError as exc:
            raise CommandError(f"Could not parse taxonomy.ts:\n{exc.stderr[:1000]}") from exc

        return json.loads(result.stdout)

    def _import(self, data: dict) -> dict:
        categories: dict[str, Category] = {}
        for index, item in enumerate(data.get("categories", [])):
            obj, _ = Category.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["name"],
                    "summary": item.get("summary", ""),
                    "intro": item.get("intro", "") or "",
                    "status": STATUS_MAP.get(item.get("status"), PublishStatus.DRAFT),
                    "verified": bool(item.get("verified")),
                    "display_order": index,
                },
            )
            rescore(obj)
            categories[item["slug"]] = obj

        industries: dict[str, Industry] = {}
        for index, item in enumerate(data.get("industries", [])):
            obj, _ = Industry.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["name"],
                    "summary": item.get("summary", ""),
                    "status": STATUS_MAP.get(item.get("status"), PublishStatus.DRAFT),
                    "verified": bool(item.get("verified")),
                    "display_order": index,
                },
            )
            rescore(obj)
            industries[item["slug"]] = obj

        products: dict[str, Product] = {}
        for item in data.get("products", []):
            obj, _ = Product.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["name"],
                    "synonyms": item.get("synonyms") or [],
                    "category": categories.get(item.get("category")),
                    "short_description": item.get("shortDescription", "")[:500],
                    "description": item.get("description", "") or "",
                    "status": STATUS_MAP.get(item.get("status"), PublishStatus.DRAFT),
                    "verified": bool(item.get("verified")),
                },
            )
            products[item["slug"]] = obj

        # Second pass so every related slug already resolves to a row.
        for item in data.get("products", []):
            obj = products[item["slug"]]
            related = [products[s] for s in (item.get("related") or []) if s in products]
            obj.related_products.set(related)
            linked = [industries[s] for s in (item.get("industries") or []) if s in industries]
            obj.industries.set(linked)
            rescore(obj)

        return {
            "categories": len(categories),
            "industries": len(industries),
            "products": len(products),
        }

    def _create_admin(self, email: str, password: str | None) -> None:
        User = get_user_model()
        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"User {email} already exists — skipping."))
            return
        if not password:
            raise CommandError(
                "--password is required with --create-admin. Do not use a shared or "
                "reused password; the account has full control of the site."
            )
        User.objects.create_superuser(email=email, password=password, role=Role.SUPER_ADMIN)
        self.stdout.write(self.style.SUCCESS(f"Created super admin {email}."))

    def _ensure_company_settings(self) -> None:
        """
        Populate the company row from the shared root `.env`.

        Nothing is written here: the facts come from COMPANY_* / SITE_LEGAL_NAME
        in the one environment file the public site also reads. The KRA PIN and
        the director name are deliberately not among them — see CompanySettings.
        """
        settings_obj = CompanySettings.load()
        if not settings_obj.email:
            for field, value in CompanySettings.defaults_from_env().items():
                setattr(settings_obj, field, value)
            settings_obj.save()
            self.stdout.write(self.style.SUCCESS("Company settings initialised."))
