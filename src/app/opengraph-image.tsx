import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.legalName} — industrial chemical supplier in Nairobi, Kenya`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Default social-share card. Branded, text-based (no external fonts/images) so
 * it renders deterministically at build. Colours match the logo palette.
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
          background: "#0e2033",
          color: "#fbfaf7",
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
              background: "#7cc142",
            }}
          />
          <div
            style={{
              fontSize: 30,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#93a3b4",
            }}
          >
            Nairobi · Kenya
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, color: "#7cc142" }}>Cuprichem</div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              marginTop: 12,
              maxWidth: 900,
            }}
          >
            Source industrial chemicals with technical precision.
          </div>
        </div>

        <div style={{ fontSize: 28, color: "#93a3b4" }}>
          Industrial Chemicals Ltd · Discover → Specify → Source
        </div>
      </div>
    ),
    { ...size },
  );
}
