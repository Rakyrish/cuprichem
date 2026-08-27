import type { Metadata, Viewport } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { organizationLd, websiteLd } from "@/lib/seo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingContact } from "@/components/layout/FloatingContact";
import { JsonLd } from "@/components/ui/JsonLd";

// Display / headings — geometric technical grotesk (distinct identity).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["500", "600", "700"],
});
// Body / UI — industrial humanist sans.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
});
// Data / metadata labels — monospace for CAS, specs, indices.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.legalName} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.shortDescription,
  applicationName: siteConfig.legalName,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.legalName,
    locale: siteConfig.locale,
    url: siteConfig.url,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // Matches the solid header bar, so mobile browser chrome blends into it.
  themeColor: siteConfig.brand.colors.header,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang={siteConfig.language}
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>
        <a href="#main" className="u-skip">
          Skip to content
        </a>
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <FloatingContact />
      </body>
    </html>
  );
}
