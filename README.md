# Cuprichem Industrial Chemicals — website

SEO-first marketing + catalogue website for **Cuprichem Industrial Chemicals Ltd**
(Syokimau, Nairobi, Kenya). Built to present the company honestly and to scale
into a large, crawlable chemical catalogue.

## Stack

| Layer | What is here |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4; tokens in `src/app/globals.css` `@theme` |
| Fonts | `next/font/google` — Space Grotesk (display), IBM Plex Sans (body), IBM Plex Mono (data) |
| Data | Local typed TS in `src/data/`, read through the `src/lib/content.ts` seam — no DB in this repo yet |
| Backend | **Phase 2:** Django + PostgreSQL as a *separate* service, consumed via `lib/content.ts` |
| Images | `next/image`; Cloudinary loader to be wired when configured |

## Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

Node is pinned via `.nvmrc` (22) and enforced by `.npmrc` (`engine-strict`).

## Architecture

```
src/app/          routes (App Router) + robots.ts, sitemap.ts, manifest.ts
src/components/   ui/ layout/ sections/ forms/
src/config/       site.ts (the ONLY place company/brand/contact facts live), navigation.ts
src/data/         taxonomy.ts — the Phase 1 typed "database" (placeholders flagged)
src/lib/          content.ts (async data seam), seo.ts, cn.ts
src/types/        content.ts — shapes the UI consumes
```

**Data seam.** All catalogue reads go through `src/lib/content.ts` async
functions. Phase 2 swaps their bodies for HTTP calls to the Django API without
touching a component. Only `published` records reach the public site, sitemap
and crawlers.

## Content integrity

Company facts come from client documentation (see
`docs/pending-cuprichem-data.md`). No product chemistry (CAS, purity, specs,
prices, documents, certifications) has been fabricated. Unverified placeholder
categories/industries render `noindex` and are excluded from the sitemap until
confirmed.

## SEO

- Per-page canonical, unique titles/descriptions, Open Graph/Twitter via
  `src/lib/seo.ts`.
- `Organization` + `WebSite` JSON-LD site-wide; `BreadcrumbList` on interior
  pages.
- Dynamic `robots.txt` and `sitemap.xml`; server-rendered content throughout.

## Motion & imagery

Subtle, accessible motion: an animated hero backdrop (SVG molecular lattice),
staggered hero entrance, and scroll-reveal on sections via
`components/motion/Reveal.tsx`. All motion is gated by `prefers-reduced-motion`
and the base (un-animated) state is fully visible, so reduced-motion / no-JS
users see everything. The industrial visuals (`IndustrialArt`, hero backdrop)
are **original SVG illustration** — no stock photography and no implied real
facility. Real or generated photography can be layered into `HeroBackdrop` /
`CapabilityBand` later without touching the sections.

## Security (production hardening)

- `src/middleware.ts` sets a **Content-Security-Policy** (locks down
  script/style/img/connect/form-action, blocks framing and external objects),
  **HSTS**, `Cross-Origin-Opener-Policy` and `X-DNS-Prefetch-Control` on document
  routes. Baseline headers (`X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`) are in `next.config.ts` for all paths.
- The CSP keeps SSG (no per-request nonce; `'unsafe-inline'` for Next's inline
  bootstrap + next/font). A stricter nonce-based `script-src` upgrade path is
  documented in the middleware — it trades SSG for dynamic rendering.
- `Caddyfile` re-asserts the same headers at the edge (defense-in-depth) and
  handles automatic HTTPS.
- RFQ intake (`/api/quote`) validates server-side and includes a honeypot.

## Deployment

```bash
cp .env.example .env      # fill in, then:
docker compose up -d --build
```

The multi-stage `Dockerfile` builds the `output: "standalone"` bundle and runs
it as a non-root user. The browser-visible values are inlined at build time, so
the build needs the real `.env`; compose mounts it as a BuildKit **secret**, and
it therefore never lands in an image layer. Compose also passes it to both
containers via `env_file`, so `Caddyfile` gets `SITE_ADDRESS`, `WEB_PORT` and
`MEDIA_CDN_ORIGIN` from the same file the apps use.

## Configuration

There is **one** environment file for the whole repository: `.env` at the root.
The public site, the admin console (`admin/`) and the Django API (`backend/`)
all read it — none of them has an `.env` of its own. Copy `.env.example` → `.env`
and fill it in.

| Consumer | How it loads the root `.env` |
| --- | --- |
| Public site | `next.config.ts` calls `loadEnvConfig()` and inlines the browser-visible keys via `env` |
| Admin | `admin/next.config.ts` does the same, resolving one directory up |
| Backend | `backend/config/settings/base.py` calls `load_dotenv(REPO_ROOT / ".env")` |

Nothing company-, brand- or origin-specific is written in source: company facts
come from `COMPANY_*`, identity from `SITE_*`, assets and runtime colours from
`BRAND_*`, and origins/ports from `SITE_URL`, `API_BASE_URL`, `ADMIN_ORIGIN`,
`WEB_PORT` and `ADMIN_PORT`. `SITE_URL` must be the real production origin — it
drives canonical URLs, the sitemap, OG URLs and the backend's revalidation
hooks. Both Next apps and Django **fail to start** naming any missing variable,
rather than rendering a blank field.

Only the keys listed in each `next.config.ts` `BROWSER_ENV_KEYS` array reach the
browser. Credentials (`OPENAI_API_KEY`, `CLOUDINARY_*`, `POSTGRES_PASSWORD`,
`DJANGO_SECRET_KEY`) are deliberately absent from those lists and are read only
by the backend.
