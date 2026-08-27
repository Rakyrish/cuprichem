import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * robots.txt — allow legitimate crawling of all content (including CSS/JS, which
 * must never be blocked for rendering). Only genuinely non-indexable surfaces
 * are disallowed. Points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Search-result pages are handled with meta noindex; the API surface has
        // nothing to index. Content (products/categories/articles) stays open.
        disallow: ["/api/", "/search"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
