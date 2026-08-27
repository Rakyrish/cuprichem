import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

/**
 * Security headers applied to document responses.
 *
 * These layer on top of the baseline headers in next.config.ts (which cover all
 * paths including static assets). Here we add the policy headers that only make
 * sense on HTML documents.
 *
 * Content-Security-Policy notes:
 *  - This site is statically generated with no user-generated HTML, so we keep
 *    SSG (no per-request nonce) and accept `'unsafe-inline'` for Next's inline
 *    bootstrap/RSC scripts and next/font's inline styles. The high-value
 *    protection — blocking injected EXTERNAL scripts/objects/frames and locking
 *    base-uri/form-action — is fully enforced.
 *  - The external origins allowed below are NOT written here: they come from
 *    `MEDIA_CDN_ORIGIN` / `API_BASE_URL` in the root `.env`, so the policy and
 *    the origins the app actually uses cannot drift apart.
 *  - To move to a strict nonce-based `script-src` later, generate a nonce here,
 *    pass it via an `x-nonce` request header, read it in the JsonLd component,
 *    and drop `'unsafe-inline'`. That makes rendering dynamic (nonce is
 *    per-request), which is why it is not the default for this content site.
 */

/** Same-origin API calls need no entry; a cross-origin API must be named. */
function crossOrigin(value: string): string[] {
  if (!value) return [];
  try {
    return [new URL(value).origin];
  } catch {
    return [];
  }
}

const IMG_SRC = ["'self'", "data:", ...crossOrigin(siteConfig.api.mediaCdnOrigin)];
const CONNECT_SRC = ["'self'", ...crossOrigin(siteConfig.api.baseUrl)];

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' mailto:",
  `img-src ${IMG_SRC.join(" ")}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src ${CONNECT_SRC.join(" ")}`,
  "manifest-src 'self'",
  "frame-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export function middleware() {
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  return response;
}

export const config = {
  // Run on document routes only — skip Next's static assets, image optimiser,
  // favicon and the manifest, which do not need these document-level policies.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.png$).*)",
  ],
};
