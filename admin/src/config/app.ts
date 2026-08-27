/**
 * Admin configuration.
 *
 * Nothing here is a literal. Every value comes from the single repository-root
 * `.env` — the same file the public site and the Django API read — inlined by
 * the `env` block in `admin/next.config.ts`.
 *
 * `process.env.X` is written out longhand on purpose: Next inlines only
 * statically analysable member expressions, so `process.env[name]` would
 * resolve to `undefined` in the browser bundle.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env at the repository root and fill it in.`,
    );
  }
  return value.trim();
}

/** Origin of a URL, or "" when unset/unparseable. */
function originOf(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const siteUrl = required("SITE_URL", process.env.SITE_URL).replace(/\/$/, "");
const apiBaseUrl = required("API_BASE_URL", process.env.API_BASE_URL).replace(/\/$/, "");

export const appConfig = {
  /** Brand shown in the sidebar, the login screen and the document title. */
  brandName: required("SITE_NAME", process.env.SITE_NAME),
  legalName: required("SITE_LEGAL_NAME", process.env.SITE_LEGAL_NAME),
  appName: required("ADMIN_APP_NAME", process.env.ADMIN_APP_NAME),
  appDescription: required("ADMIN_APP_DESCRIPTION", process.env.ADMIN_APP_DESCRIPTION),
  language: required("SITE_LANGUAGE", process.env.SITE_LANGUAGE),

  /** Public website — used only to build "view public page" links. */
  siteUrl,
  /** Bare host of the public site, as shown in the SERP preview. */
  siteHost: new URL(siteUrl).host,

  /**
   * Django API origin.
   *
   * This MUST use the same host as the admin itself (ports may differ). The
   * auth cookie is SameSite=Lax, which is decided by host, not port:
   * localhost:3001 -> localhost:8000 works, but localhost:3001 ->
   * 127.0.0.1:8000 is cross-site and the browser drops the cookie on every
   * request.
   */
  apiBaseUrl,
  apiOrigin: originOf(apiBaseUrl),

  /** Remote image host allowed by the CSP. Blank => none. */
  mediaCdnOrigin: originOf(process.env.MEDIA_CDN_ORIGIN),
} as const;
