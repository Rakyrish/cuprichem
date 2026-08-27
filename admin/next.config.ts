import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/**
 * The admin is an internal control centre, not a public site: it must never be
 * indexed, embedded, or served over an untrusted origin.
 */

/**
 * There is exactly ONE environment file in this repository and it lives at the
 * root, one level up. The admin has no `.env` of its own — every origin, name
 * and brand asset below comes from the same file the public site and the Django
 * API read, so the three can never drift apart.
 */
const REPO_ROOT = path.resolve(__dirname, "..");
// `forceReload` matters: Next has already called loadEnvConfig() for the admin
// directory (which has no .env), and @next/env caches that result. Without it
// this call is a no-op and every value below comes back undefined.
loadEnvConfig(REPO_ROOT, process.env.NODE_ENV !== "production", console, true);

/**
 * Keys inlined into the admin bundle. Everything here is readable by anyone who
 * loads the console — no credential may be added. In particular there is no
 * OpenAI or Cloudinary key: the admin never calls those services, it calls
 * Django, which holds them.
 */
const BROWSER_ENV_KEYS = [
  "SITE_NAME",
  "SITE_LEGAL_NAME",
  "SITE_URL",
  "SITE_LANGUAGE",
  "ADMIN_APP_NAME",
  "ADMIN_APP_DESCRIPTION",
  "API_BASE_URL",
  "MEDIA_CDN_ORIGIN",
] as const;

function browserEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const key of BROWSER_ENV_KEYS) {
    const value = process.env[key];
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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  env: browserEnv(),

  // The admin lives inside the public site's repository. Without pinning the
  // root, Next walks up and treats the parent as the project — which pulled in
  // the public site's middleware and broke API access. Keep this.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
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
