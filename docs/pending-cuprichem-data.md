# Pending client data — Cuprichem

This file lists everything the website needs from Cuprichem before content can be
published as verified fact. **Nothing on this list has been fabricated in the
code.** Placeholder records exist only where noted and are held `noindex` / out
of the sitemap until confirmed.

## Verified and in use (from supplied documents)

These are already wired into `src/config/site.ts` and rendered site-wide:

- Registered name: **Cuprichem Industrial Chemicals Ltd**
- Director: **Cendric Wasua**
- KRA PIN: **P052472985Q**
- Registered address: Repen/Repem Complex Bld, 2nd Floor, Katani Road,
  Syokimau, Nairobi; P.O. Box 18648-00100, Nairobi
- Phones: 0721 856 061 · 0111 314 860 · 0736 672 323
- Emails: cuprichemindustrialchemicals@gmail.com (general),
  salescuprichemindustrialchemic@gmail.com (sales)
- Logo artwork: supplied PNG → processed into `/public/brand/` and the favicon.

## Required before launch (NOT yet supplied — do not invent)

### 1. Product catalogue
For **each** product Cuprichem actually supplies:
- Product name and any common synonyms
- Category it belongs to
- CAS number, chemical formula, molecular weight (where applicable)
- Grade / purity offered
- Appearance
- Packaging sizes actually stocked/available
- Genuine applications and industries served
- Any documents you can share (SDS / COA / spec sheet / TDS)

> The placeholder categories in `src/data/taxonomy.ts` (water treatment,
> industrial cleaning, laboratory reagents, construction chemicals) are broad
> **areas** only. Confirm which you actually supply, correct/replace them, and
> add real products. They are currently `verified: false` → **noindex, not in
> the sitemap**.

### 2. Company / trust facts (optional but valuable, only if true)
- Year established
- Physical service area / delivery coverage (city only? nationwide?)
- Opening hours
- Social media handles (Facebook / Instagram / LinkedIn / WhatsApp business)
- Any genuine certifications, memberships or accreditations (with proof)

Do **not** provide fabricated testimonials, client logos, awards or statistics —
they will not be added.

### 3. Domain & deployment
- Confirm the production domain (assumed `www.cuprichem.co.ke` in `.env.example`
  — set `NEXT_PUBLIC_SITE_URL` to the real one; it drives canonicals, sitemap
  and Open Graph URLs).

## Open questions to resolve (do not answer in code)

- Is "Industrial Chemicals" the full scope, or does Cuprichem also supply
  laboratory / specialty / agricultural lines? This shapes the category tree.
- Which industries does Cuprichem genuinely serve? (Current three are
  placeholders pending confirmation.)
- Preferred primary contact for RFQs — the sales email is assumed.
