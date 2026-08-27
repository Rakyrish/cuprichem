/**
 * Shapes the UI consumes. These are the contract that the local file "database"
 * satisfies today and that the Phase 2 Django REST API will satisfy later — the
 * components never learn which one answered.
 *
 * `status` gates publication so incomplete records cannot leak to crawlers.
 * `verified` marks whether the client has confirmed the record as fact; an
 * unverified record is reachable but rendered `noindex` and kept out of the
 * sitemap. No technical/commercial field is ever invented — optional fields are
 * simply absent until supplied.
 */

export type PublishStatus = "draft" | "review" | "published";

export interface Category {
  slug: string;
  name: string;
  /** One-line summary for cards and meta descriptions. */
  summary: string;
  /** Longer intro rendered on the category page (may be empty while pending). */
  intro?: string;
  status: PublishStatus;
  /** True when the client has confirmed this category is actually supplied. */
  verified: boolean;
}

/** Verified technical identity. Every field optional — shown only if present. */
export interface ProductTechnical {
  casNumber?: string;
  formula?: string;
  molecularWeight?: string;
  grade?: string;
  purity?: string;
  appearance?: string;
  packaging?: string[];
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface Product {
  slug: string;
  name: string;
  /** Common synonyms (real, verified only) for on-page context and search. */
  synonyms?: string[];
  category: string; // Category.slug
  shortDescription: string;
  /** Optional longer body (verified). */
  description?: string;
  status: PublishStatus;
  verified: boolean;
  technical?: ProductTechnical;
  /** Verified real-world applications (plain text bullet points). */
  applications?: string[];
  /** Industry slugs this product is relevant to (internal linking). */
  industries?: string[];
  /** Related product slugs (internal linking). */
  related?: string[];
  faqs?: ProductFaq[];
}

export interface Industry {
  slug: string;
  name: string;
  summary: string;
  status: PublishStatus;
  verified: boolean;
}

/** Resource / article. Body is a small set of typed blocks (no raw HTML). */
export type ArticleBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export interface Article {
  slug: string;
  title: string;
  summary: string;
  /** ISO date (YYYY-MM-DD). */
  datePublished: string;
  dateModified?: string;
  status: PublishStatus;
  verified: boolean;
  body: ArticleBlock[];
  /** Related internal links by slug for the "keep reading" rail. */
  relatedCategories?: string[];
}
