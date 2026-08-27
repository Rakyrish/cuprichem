/**
 * Site-wide configuration.
 *
 * Nothing here is a literal. Every value is read from the single repository
 * root `.env` (see `.env.example`) and surfaced to the browser by the `env`
 * block in `next.config.ts`. Changing a company fact, an origin or a brand
 * asset is an `.env` edit, never a code edit.
 *
 * `process.env.X` is written out longhand on purpose: Next inlines only
 * statically analysable member expressions, so `process.env[name]` would
 * resolve to `undefined` in the browser bundle.
 */

/** Fail loudly at build time rather than shipping a page with a blank field. */
function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env at the repository root and fill it in.`,
    );
  }
  return value.trim();
}

function optional(value: string | undefined, fallback = ""): string {
  return value?.trim() || fallback;
}

function integer(name: string, value: string | undefined): number {
  const parsed = Number.parseInt(required(name, value), 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer.`);
  }
  return parsed;
}

/** "a,b, c" -> ["a", "b", "c"] */
function list(value: string | undefined): string[] {
  return optional(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * COMPANY_PHONES is a comma-separated list of `display|E.164` pairs, so the
 * printed form and the dialled form stay together and cannot drift apart.
 */
function phones(name: string, value: string | undefined): { display: string; href: string }[] {
  const parsed = list(value).map((entry) => {
    const [display, e164] = entry.split("|").map((part) => part.trim());
    if (!display || !e164) {
      throw new Error(
        `Environment variable ${name} entry "${entry}" must be "display|+E164".`,
      );
    }
    return { display, href: `tel:${e164}` };
  });
  if (parsed.length === 0) {
    throw new Error(`Environment variable ${name} must list at least one number.`);
  }
  return parsed;
}

const url = required("SITE_URL", process.env.SITE_URL).replace(/\/$/, "");

const companyPhones = phones("COMPANY_PHONES", process.env.COMPANY_PHONES);
const email = required("COMPANY_EMAIL", process.env.COMPANY_EMAIL);
const salesEmail = required("COMPANY_SALES_EMAIL", process.env.COMPANY_SALES_EMAIL);
const whatsapp = required("COMPANY_WHATSAPP", process.env.COMPANY_WHATSAPP);

export const siteConfig = {
  name: required("SITE_NAME", process.env.SITE_NAME),
  legalName: required("SITE_LEGAL_NAME", process.env.SITE_LEGAL_NAME),
  tagline: required("SITE_TAGLINE", process.env.SITE_TAGLINE),
  shortDescription: required("SITE_DESCRIPTION", process.env.SITE_DESCRIPTION),
  url,
  locale: required("SITE_LOCALE", process.env.SITE_LOCALE),
  language: required("SITE_LANGUAGE", process.env.SITE_LANGUAGE),

  /** Copy used only by the generated Open Graph card. */
  og: {
    headline: required("SITE_OG_HEADLINE", process.env.SITE_OG_HEADLINE),
    processSteps: list(process.env.SITE_PROCESS_STEPS),
  },

  company: {
    email,
    salesEmail,
    phones: companyPhones,
    address: {
      building: required("COMPANY_ADDRESS_BUILDING", process.env.COMPANY_ADDRESS_BUILDING),
      street: required("COMPANY_ADDRESS_STREET", process.env.COMPANY_ADDRESS_STREET),
      locality: required("COMPANY_ADDRESS_LOCALITY", process.env.COMPANY_ADDRESS_LOCALITY),
      region: required("COMPANY_ADDRESS_REGION", process.env.COMPANY_ADDRESS_REGION),
      country: required("COMPANY_ADDRESS_COUNTRY", process.env.COMPANY_ADDRESS_COUNTRY),
      countryCode: required(
        "COMPANY_ADDRESS_COUNTRY_CODE",
        process.env.COMPANY_ADDRESS_COUNTRY_CODE,
      ),
      poBox: required("COMPANY_POSTAL_ADDRESS", process.env.COMPANY_POSTAL_ADDRESS),
    },
  },

  contact: {
    /** Primary display phone — the first entry in COMPANY_PHONES. */
    phoneDisplay: companyPhones[0].display,
    phoneHref: companyPhones[0].href,
    email,
    emailHref: `mailto:${email}`,
    salesEmailHref: `mailto:${salesEmail}`,
    whatsappHref: `https://wa.me/${whatsapp}`,
  },

  brand: {
    logo: required("BRAND_LOGO_PATH", process.env.BRAND_LOGO_PATH),
    logoWidth: integer("BRAND_LOGO_WIDTH", process.env.BRAND_LOGO_WIDTH),
    logoHeight: integer("BRAND_LOGO_HEIGHT", process.env.BRAND_LOGO_HEIGHT),
    icon: required("BRAND_ICON_PATH", process.env.BRAND_ICON_PATH),
    appleIcon: required("BRAND_APPLE_ICON_PATH", process.env.BRAND_APPLE_ICON_PATH),
    colors: {
      header: required("BRAND_COLOR_HEADER", process.env.BRAND_COLOR_HEADER),
      ink: required("BRAND_COLOR_INK", process.env.BRAND_COLOR_INK),
      paper: required("BRAND_COLOR_PAPER", process.env.BRAND_COLOR_PAPER),
      accent: required("BRAND_COLOR_ACCENT", process.env.BRAND_COLOR_ACCENT),
      muted: required("BRAND_COLOR_MUTED", process.env.BRAND_COLOR_MUTED),
    },
  },

  api: {
    /** Django REST API base URL. Empty => catalogue is read from local files. */
    baseUrl: optional(process.env.API_BASE_URL).replace(/\/$/, ""),
    /** Remote image host allowed by next/image and the CSP. Blank => none. */
    mediaCdnOrigin: optional(process.env.MEDIA_CDN_ORIGIN).replace(/\/$/, ""),
  },
} as const;

export type SiteConfig = typeof siteConfig;
