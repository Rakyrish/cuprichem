/**
 * Site-wide configuration — the ONLY place company/contact/brand facts live.
 *
 * Every value in `company` is taken verbatim from the client-supplied Cuprichem
 * documentation (letterhead + KRA registration). Nothing here is invented. Where
 * a fact was NOT supplied (e.g. opening hours, social handles, service area) it
 * is deliberately absent rather than guessed — see docs/pending-cuprichem-data.md.
 *
 * Environment-specific values read from process.env so no deployment detail is
 * baked into source.
 */

const rawSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://www.cuprichem.co.ke";

export const siteConfig = {
  name: "Cuprichem",
  legalName: "Cuprichem Industrial Chemicals Ltd",
  /** Working strapline for the platform concept — not a supplied tagline. */
  tagline: "Industrial chemicals, specified and sourced.",
  shortDescription:
    "Cuprichem Industrial Chemicals Ltd is a Nairobi-based supplier of industrial chemicals, serving manufacturers, institutions and technical buyers across Kenya.",
  url: rawSiteUrl,
  locale: "en_KE",
  language: "en",

  // --- Verified company facts (client documentation) ---
  company: {
    director: "Cendric Wasua",
    kraPin: "P052472985Q",
    email: "cuprichemindustrialchemicals@gmail.com",
    salesEmail: "salescuprichemindustrialchemic@gmail.com",
    phones: [
      { display: "0721 856 061", href: "tel:+254721856061" },
      { display: "0111 314 860", href: "tel:+254111314860" },
      { display: "0736 672 323", href: "tel:+254736672323" },
    ],
    address: {
      building: "Repen/Repem Complex Bld, 2nd Floor",
      street: "Katani Road",
      locality: "Syokimau",
      region: "Nairobi",
      country: "Kenya",
      countryCode: "KE",
      poBox: "P.O. Box 18648-00100, Nairobi",
    },
  },

  contact: {
    // Primary display phone (first listed on the letterhead).
    phoneDisplay: "0721 856 061",
    phoneHref: "tel:+254721856061",
    email: "cuprichemindustrialchemicals@gmail.com",
    emailHref: "mailto:cuprichemindustrialchemicals@gmail.com",
    salesEmailHref: "mailto:salescuprichemindustrialchemic@gmail.com",
    whatsappHref: "https://wa.me/254721856061",
  },

  brand: {
    logo: "/brand/cuprichem-logo.png",
    logoWidth: 247,
    logoHeight: 140,
  },

  api: {
    // Phase 2: the Django REST API base URL. Empty => read from local files.
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  },
} as const;

export type SiteConfig = typeof siteConfig;
