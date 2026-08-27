
import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import {
  getPublishedArticles,
  getPublishedCategories,
  getPublishedIndustries,
  getPublishedProducts,
} from "@/lib/content";

/**
 * XML sitemap. Contains only indexable, canonical URLs:
 *  - the fixed public pages that exist and return 200
 *  - every PUBLISHED catalogue record (draft/review are excluded by the data
 *    seam, so unconfirmed placeholder content can never appear here)
 * /search is omitted deliberately (noindex).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const staticPaths: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/products", priority: 0.9 },
    { path: "/categories", priority: 0.8 },
    { path: "/industries", priority: 0.8 },
    { path: "/resources", priority: 0.6 },
    { path: "/about", priority: 0.6 },
    { path: "/contact", priority: 0.7 },
    { path: "/request-a-quote", priority: 0.7 },
  ];

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: p.priority,
  }));

  const [categories, products, industries, articles] = await Promise.all([
    getPublishedCategories(),
    getPublishedProducts(),
    getPublishedIndustries(),
    getPublishedArticles(),
  ]);

  const dynamicEntries: MetadataRoute.Sitemap = [
    ...categories.map((c) => ({ url: `${base}/categories/${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}` })),
    ...industries.map((i) => ({ url: `${base}/industries/${i.slug}` })),
    ...articles.map((a) => ({ url: `${base}/resources/${a.slug}` })),
  ].map((e) => ({
    ...e,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...dynamicEntries];
}
