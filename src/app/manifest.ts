import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  const { brand } = siteConfig;
  return {
    name: siteConfig.legalName,
    short_name: siteConfig.name,
    description: siteConfig.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: brand.colors.paper,
    theme_color: brand.colors.ink,
    icons: [
      { src: brand.icon, sizes: "512x512", type: "image/png" },
      { src: brand.appleIcon, sizes: "180x180", type: "image/png" },
    ],
  };
}
