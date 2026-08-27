import { NextResponse } from "next/server";
import { appConfig } from "@/config/app";

/**
 * Security headers for the admin.
 *
 * This file must exist even though the public site has its own middleware:
 * Next resolves middleware from the inferred project root, and because the
 * admin lives inside the public site's repository it was picking up the PUBLIC
 * site's policy — whose `connect-src 'self'` silently blocked every call to the
 * Django API. Owning the policy here makes the admin's requirements explicit.
 *
 * The API runs on a different origin so it must be named in `connect-src`.
 * Everything else stays locked down: this is an internal tool with no
 * third-party embeds.
 *
 * The origins below are NOT written here — they come from `API_BASE_URL` and
 * `MEDIA_CDN_ORIGIN` in the single repository-root `.env`, so the policy and
 * the origins the admin actually calls cannot drift apart.
 */

const API_ORIGIN = appConfig.apiOrigin;

// The CDN serves product imagery; media may also be proxied from the API.
const IMG_SOURCES = ["'self'", "data:", "blob:", appConfig.mediaCdnOrigin, API_ORIGIN].filter(
  Boolean,
);

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  `img-src ${IMG_SOURCES.join(" ")}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next's inline bootstrap requires 'unsafe-inline'; moving to a nonce would
  // make every admin page dynamic, which is not worth it for an internal tool
  // that renders no user-supplied HTML.
  "script-src 'self' 'unsafe-inline'",
  `connect-src ${["'self'", API_ORIGIN].filter(Boolean).join(" ")}`,
  "manifest-src 'self'",
].join("; ");

export function middleware() {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
