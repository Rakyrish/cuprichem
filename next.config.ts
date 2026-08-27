import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Self-contained build output for a minimal production image (Phase 2/deploy).
  output: "standalone",

  // Do not advertise the framework version in response headers.
  poweredByHeader: false,

  images: {
    // Modern formats first; Next negotiates fallbacks automatically.
    formats: ["image/avif", "image/webp"],
    // Cloudinary is the only remote host we intend to allow later. Declared up
    // front so a stray remote <Image src> cannot silently pull from anywhere.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },

  // Baseline security headers. A full CSP + HSTS is written against the real
  // origin at the reverse proxy during production hardening — a wrong CSP
  // silently breaks pages, so it is deliberately not guessed here.
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
