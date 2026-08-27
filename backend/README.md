# Cuprichem Control Centre — Backend

Django + DRF + PostgreSQL. This is the business, content and data layer behind
the public Next.js site and the admin frontend.

```
Admin (Next.js)  →  Django REST API  →  business logic / validation  →  PostgreSQL
                          ↓
                       OpenAI  →  schema validation  →  admin review  →  publish
```

AI is an assistant. It cannot write to a public page on its own — see
[The two rules](#the-two-rules).

---

## Requirements

| Component  | Version | Required |
|------------|---------|----------|
| Python     | 3.13    | yes |
| PostgreSQL | 14+     | yes — the only supported database |
| Redis      | 7+      | for background jobs |
| Node.js    | 20+     | only for `seed_catalog` (reads the front-end taxonomy) |

PostgreSQL is used in development, test and production. There is no SQLite
fallback: the catalogue depends on Postgres JSON, constraint and transaction
semantics, and testing on a different engine hides real bugs.

---

## Setup

```bash
# 1. Dependencies
cd backend
uv venv .venv --python 3.13
uv pip install --python "$PWD/.venv/bin/python" -r requirements-dev.txt

# 2. Database (Docker)
docker compose up -d db redis
#    …or on the host:
#    sudo -u postgres createuser --pwprompt cuprichem
#    sudo -u postgres createdb --owner=cuprichem cuprichem

# 3. Configuration
cp .env.example .env      # then fill in POSTGRES_PASSWORD and DJANGO_SECRET_KEY

# 4. Schema + first user + catalogue import
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_catalog \
    --create-admin you@cuprichem.co.ke --password '<a long unique password>'

# 5. Run
.venv/bin/python manage.py runserver 8000
.venv/bin/celery -A config worker --loglevel=info      # separate shell
```

Tests create and drop `test_cuprichem` automatically:

```bash
.venv/bin/python -m pytest
```

---

## The two rules

Everything else in this codebase is negotiable. These are not.

**1. AI output never reaches the public site without a human.**

A model's response is written to an `AIJob` row and nowhere else. The only path
from there into a product is `POST /api/admin/ai/jobs/{id}/accept/`, which
requires an explicit list of accepted field names — there is no "accept all"
shortcut. Publication is separately gated behind the `product.publish`
capability and `publish_product()`, which refuses incomplete records.

**2. AI never overwrites what a human verified.**

Fields listed in `Product.verified_fields` are immutable to AI. When a model
proposes a different value, `apply_ai_payload()` records a conflict and keeps
the administrator's value:

```json
{"field": "purity", "admin_value": "99%", "ai_value": "98%",
 "resolution": "admin_value_retained"}
```

Source-of-truth order: supplied documentation → administrator entry → approved
internal content → AI suggestion.

---

## Security

**The OpenAI key is server-side only.** It lives in `OPENAI_API_KEY` on the
backend, is read only by `apps/ai/services/openai_client.py`, and is never
serialised into a response or written to a log. There is no `NEXT_PUBLIC_*`
variable for it and the browser never calls OpenAI. The same applies to the
Cloudinary secret — uploads are proxied through Django, never signed in the
browser.

**Auth** is a JWT in an HTTP-only cookie, not `localStorage`. A token in
`localStorage` is readable by any script that achieves XSS; an HTTP-only cookie
is not. The CSRF exposure that cookies create is handled by requiring the CSRF
header on every unsafe method. The user's password hash is embedded in the
token, so changing a password invalidates every outstanding session.

**Authorisation** is capability-based and enforced in `HasCapability`, which
fails closed: a view that does not declare `required_capabilities` is denied,
not allowed. Frontend hiding is cosmetic only.

**Uploads** are validated by magic bytes, not the client-supplied
`Content-Type`. SVG is refused because it can carry script.

**Rate limits** protect the paid endpoints (`THROTTLE_AI_*`).

---

## SEO scoring

`apps/seo/scoring.py` is a deterministic weighted checklist — not a ranking
prediction, and it must never be labelled as one. Every point traces to a named
check with a stated threshold, so the same record always scores the same and an
operator can see exactly why. An LLM is never asked to produce the number.

Adding a check means appending to `PRODUCT_CHECKS`; weights are normalised, so
the score stays 0–100 automatically.

`validate_for_publish()` is stricter than the score and is the hard gate: an
SEO-critical page cannot go live incomplete.

**Unpublishing** always writes a `ProductRedirect` stating what the retired URL
now does (410 / 404 / 301). A 301 requires an explicit replacement path —
blanket-redirecting retired products to the homepage is exactly what this
prevents.

---

## Layout

```
config/settings/     base · dev · test · prod   (prod refuses unsafe config)
apps/core/           base models, pagination, error envelope, health
apps/accounts/       User, roles → capabilities, cookie JWT auth
apps/audit/          append-only audit log (no write API by design)
apps/catalog/        Category, Industry, Application, Product, publish services
apps/content/        Article (typed blocks, never raw HTML)
apps/mediahub/       upload validation, Cloudinary, media library
apps/seo/            scoring engine, duplicate detection, dashboard aggregates
apps/ai/             OpenAI client, prompts (versioned), schemas, validators
apps/business/       Inquiry, CompanySettings
```

---

## API

All admin routes live under `/api/admin/` and require authentication.

| Method | Path | Capability |
|---|---|---|
| `POST` | `/auth/login/` · `/auth/logout/` · `/auth/refresh/` | — |
| `GET` | `/auth/me/` · `/auth/csrf/` | authenticated |
| `GET POST PATCH DELETE` | `/products/` | `product.view` / `product.edit` / `product.delete` |
| `POST` | `/products/{id}/publish/` · `/unpublish/` | `product.publish` |
| `GET` | `/products/{id}/publish-check/` | `product.view` |
| `GET POST PATCH` | `/categories/` `/industries/` `/applications/` | `taxonomy.edit` |
| `GET POST DELETE` | `/media/` | `media.view` / `media.edit` |
| `POST` | `/ai/analyze-image/` `/generate-product/` `/generate-seo/` `/review-content/` | `ai.generate` |
| `GET` | `/ai/jobs/` | `ai.generate` |
| `POST` | `/ai/jobs/{id}/accept/` · `/reject/` | `ai.generate` |
| `POST` | `/seo/audit/` | `seo.audit` |
| `GET` | `/seo/duplicates/` · `/dashboard/overview/` · `/dashboard/seo-health/` | `seo.view` / `product.view` |
| `GET PATCH` | `/inquiries/` | `inquiry.view` / `inquiry.edit` |
| `GET` | `/audit-log/` | `audit.view` |
| `GET POST` | `/users/` | `user.manage` |

Health: `GET /health/` (liveness) and `GET /ready/` (dependencies). Neither
returns a hostname, credential or version.

Errors use one envelope:

```json
{"error": {"code": "publish_blocked", "message": "…", "details": {"blockers": ["…"]}}}
```

---

## Deliberately excluded

The **KRA PIN** and the **director's name** are not stored, not exposed and not
in `CompanySettings`. They are sensitive identity data, they do not help a buyer
source a chemical, and they were explicitly removed from the public site. If
they are ever needed, add them as admin-only, permission-gated and audited —
never as public content.

---

## Dashboard data

Every figure returned by `/dashboard/` is a live aggregate. There are no
constants, seeded demo numbers or placeholder percentages anywhere in
`apps/seo/views.py`; an empty database returns real zeroes. This is covered by
`test_dashboard_is_all_zeroes_on_an_empty_database`.

Likewise, when `OPENAI_API_KEY` is unset the AI endpoints return HTTP 503 with
`ai_not_configured`. They never simulate a successful generation.
