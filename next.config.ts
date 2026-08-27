import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/**
 * The repository root `.env` is the ONLY environment file in this project — the
 * public site, the admin console and the Django API all read it. Loading it
 * explicitly (rather than relying on Next's implicit lookup) keeps this config
 * identical in shape to `admin/next.config.ts`, which must reach up a level.
 */
const REPO_ROOT = __dirname;
loadEnvConfig(REPO_ROOT, process.env.NODE_ENV !== "production");

/**
 * Keys inlined into the browser bundle.
 *
 * This list IS the public surface of the environment: everything named here is
 * readable by anyone who loads the site. Never add a credential. Server-only
 * values (OpenAI, Cloudinary, Postgres, Django) are deliberately absent — they
 * are read by the backend from the same `.env`.
 */
const BROWSER_ENV_KEYS = [
  "SITE_NAME",
  "SITE_LEGAL_NAME",
  "SITE_TAGLINE",
  "SITE_DESCRIPTION",
  "SITE_URL",
  "SITE_LOCALE",
  "SITE_LANGUAGE",
  "SITE_OG_HEADLINE",
  "SITE_PROCESS_STEPS",
  "COMPANY_EMAIL",
  "COMPANY_SALES_EMAIL",
  "COMPANY_PHONES",
  "COMPANY_WHATSAPP",
  "COMPANY_ADDRESS_BUILDING",
  "COMPANY_ADDRESS_STREET",
  "COMPANY_ADDRESS_LOCALITY",
  "COMPANY_ADDRESS_REGION",
  "COMPANY_ADDRESS_COUNTRY",
  "COMPANY_ADDRESS_COUNTRY_CODE",
  "COMPANY_POSTAL_ADDRESS",
  "BRAND_LOGO_PATH",
  "BRAND_LOGO_WIDTH",
  "BRAND_LOGO_HEIGHT",
  "BRAND_ICON_PATH",
  "BRAND_APPLE_ICON_PATH",
  "BRAND_COLOR_HEADER",
  "BRAND_COLOR_INK",
  "BRAND_COLOR_PAPER",
  "BRAND_COLOR_ACCENT",
  "BRAND_COLOR_MUTED",
  "API_BASE_URL",
  "MEDIA_CDN_ORIGIN",
] as const;

/**
 * Next rejects a non-string value in `env`, so a missing key must fail here
 * with a message that names it — not later, as a blank field on a live page.
 */
function browserEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of BROWSER_ENV_KEYS) {
    const value = process.env[key];
    // Optional integrations may legitimately be blank; identity fields may not.
    if (value === undefined) {
      missing.push(key);
      continue;
    }
    out[key] = value;
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}.\n` +
        `Copy .env.example to .env at ${REPO_ROOT} and fill it in.`,
    );
  }
  return out;
}

/** Remote image hosts, derived from the one CDN origin in `.env`. */
function remotePatterns() {
  const origin = process.env.MEDIA_CDN_ORIGIN?.trim();
  if (!origin) return [];
  const { protocol, hostname } = new URL(origin);
  return [
    {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      pathname: "/**",
    },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  env: browserEnv(),

  // Self-contained build output for a minimal production image (Phase 2/deploy).
  output: "standalone",

  // Do not advertise the framework version in response headers.
  poweredByHeader: false,

  turbopack: { root: REPO_ROOT },
  outputFileTracingRoot: path.resolve(REPO_ROOT),

  images: {
    // Modern formats first; Next negotiates fallbacks automatically.
    formats: ["image/avif", "image/webp"],
    // Any `quality` passed to <Image> must be allow-listed here or Next
    // silently falls back to 75. 92 is used for the full-bleed hero and page
    // banners, where the source photography is already low-resolution and
    // extra compression shows badly.
    qualities: [75, 92],
    // Declared up front from MEDIA_CDN_ORIGIN so a stray remote <Image src>
    // cannot silently pull from anywhere.
    remotePatterns: remotePatterns(),
  },

  // Baseline security headers. The document-level policy (CSP, HSTS) is built
  // from the same environment in src/middleware.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
