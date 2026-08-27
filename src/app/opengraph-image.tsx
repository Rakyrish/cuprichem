import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

const { company, brand, og } = siteConfig;
const place = `${company.address.locality} · ${company.address.country}`;
const descriptor = siteConfig.legalName.replace(siteConfig.name, "").trim();

export const alt = `${siteConfig.legalName} — ${siteConfig.shortDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social-share card. Branded, text-based (no external fonts/images) so
 * it renders deterministically at build. Every string and colour comes from the
 * root `.env` via siteConfig — nothing on this card is written here.
 */
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: brand.colors.ink,
          color: brand.colors.paper,
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: brand.colors.accent,
            }}
          />
          <div
            style={{
              fontSize: 30,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: brand.colors.muted,
            }}
          >
            {place}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, color: brand.colors.accent }}>
            {siteConfig.name}
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              marginTop: 12,
              maxWidth: 900,
            }}
          >
            {og.headline}
          </div>
        </div>

        <div style={{ fontSize: 28, color: brand.colors.muted }}>
          {[descriptor, og.processSteps.join(" → ")].filter(Boolean).join(" · ")}
        </div>
      </div>
    ),
    { ...size },
  );
}
