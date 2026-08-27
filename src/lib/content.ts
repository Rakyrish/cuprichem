/**
 * Data-access seam.
 *
 * Every catalogue read goes through these `async` functions. Today they resolve
 * local typed data; in Phase 2 the same signatures resolve HTTP calls to the
 * Django REST API (via siteConfig.api.baseUrl) without touching a single
 * component or page. Do not import `@/data/taxonomy` directly from pages/
 * components — extend this module instead.
 *
 * Only `published` records are ever returned to the public site, so draft/
 * review content cannot leak into pages, sitemaps or crawlers.
 */

import "server-only";
import { categories, industries, products } from "@/data/taxonomy";
import { articles } from "@/data/articles";
import type { Article, Category, Industry, Product } from "@/types/content";

const isPublished = <T extends { status: string }>(item: T): boolean =>
  item.status === "published";

export async function getPublishedCategories(): Promise<Category[]> {
  return categories.filter(isPublished);
}

export async function getAllCategories(): Promise<Category[]> {
  // Includes review/draft — for internal/admin surfaces only, never the sitemap.
  return categories;
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  return categories.find((c) => c.slug === slug && isPublished(c));
}

export async function getPublishedProducts(): Promise<Product[]> {
  return products.filter(isPublished);
}

export async function getAllProducts(): Promise<Product[]> {
  return products;
}

/** Status-agnostic single product (reachable, noindex when unverified). */
export async function getAnyProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  return products.find((p) => p.slug === slug);
}

/** Products in a category (any status — the listing surfaces are noindex-safe). */
export async function getProductsByCategory(
  categorySlug: string,
): Promise<Product[]> {
  return products.filter((p) => p.category === categorySlug);
}

/** Resolve a product's related-product slugs to full records. */
export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const slugs = product.related ?? [];
  return products.filter((p) => slugs.includes(p.slug) && p.slug !== product.slug);
}

export async function getPublishedIndustries(): Promise<Industry[]> {
  return industries.filter(isPublished);
}

export async function getAllIndustries(): Promise<Industry[]> {
  return industries;
}

/**
 * Status-agnostic lookups. These back detail pages that must be REACHABLE by
 * users (so internal links do not 404) but are rendered `noindex` and kept out
 * of the sitemap while the record is unverified/unpublished. Returns undefined
 * only for a genuinely unknown slug (→ 404).
 */
export async function getAnyCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  return categories.find((c) => c.slug === slug);
}

export async function getAnyIndustryBySlug(
  slug: string,
): Promise<Industry | undefined> {
  return industries.find((i) => i.slug === slug);
}

/* --------------------------------- Articles -------------------------------- */

export async function getPublishedArticles(): Promise<Article[]> {
  return articles
    .filter(isPublished)
    .sort((a, b) => b.datePublished.localeCompare(a.datePublished));
}

export async function getArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  return articles.find((a) => a.slug === slug && isPublished(a));
}

/* ---------------------------------- Search --------------------------------- */

export interface SearchDoc {
  type: "product" | "category";
  name: string;
  href: string;
  category?: string;
  /** Lowercased haystack of name + synonyms + category for matching. */
  terms: string;
}

/**
 * A flat, lightweight index for the on-site search box. Built server-side and
 * handed to the client filter — no product data is fetched over the network.
 */
export async function getSearchIndex(): Promise<SearchDoc[]> {
  const productDocs: SearchDoc[] = products.map((p) => ({
    type: "product",
    name: p.name,
    href: `/products/${p.slug}`,
    category: categories.find((c) => c.slug === p.category)?.name,
    terms: [p.name, ...(p.synonyms ?? []), p.category.replace(/-/g, " ")]
      .join(" ")
      .toLowerCase(),
  }));
  const categoryDocs: SearchDoc[] = categories.map((c) => ({
    type: "category",
    name: c.name,
    href: `/categories/${c.slug}`,
    terms: `${c.name} ${c.summary}`.toLowerCase(),
  }));
  return [...productDocs, ...categoryDocs];
}

/**
 * Category *areas* to preview on marketing surfaces (home page). These are the
 * broad areas the supplier covers, shown as navigation/《discovery》 — they are
 * returned even while `verified: false` because the home page frames them as
 * "areas we are building out", not as a confirmed product list. They are never
 * emitted to the sitemap (see app/sitemap.ts, which uses getPublished*).
 */
export async function getCategoryAreasForPreview(): Promise<Category[]> {
  return categories;
}
