/**
 * SEO helpers — one place that builds page metadata and structured data so
 * titles, canonicals and Open Graph stay consistent and correct site-wide.
 */

import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

const BASE = siteConfig.url;

/** Build an absolute URL from a site-relative path (e.g. "/about"). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, BASE).toString();
}

interface PageMetaInput {
  title: string;
  description: string;
  /** Site-relative path, e.g. "/about". Drives the canonical URL. */
  path: string;
  /** Set true only on pages that must not be indexed (e.g. search results). */
  noindex?: boolean;
  ogType?: "website" | "article";
}

/**
 * Canonical, unique metadata for a page. `metadataBase` (set in the root layout)
 * lets Next resolve relative OG image paths; canonical + OG url are set here.
 */
export function buildMetadata({
  title,
  description,
  path,
  noindex = false,
  ogType = "website",
}: PageMetaInput): Metadata {
  const canonical = path === "/" ? "/" : path.replace(/\/$/, "");
  const fullTitle =
    path === "/" ? `${siteConfig.legalName} — ${siteConfig.tagline}` : `${title} | ${siteConfig.name}`;

  return {
    // `absolute` bypasses the root layout's title.template so the "| Cuprichem"
    // suffix (already included above for interior pages) is never doubled.
    title: { absolute: fullTitle },
    description,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      type: ogType,
      title: fullTitle,
      description,
      url: canonical,
      siteName: siteConfig.legalName,
      locale: siteConfig.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Structured data (JSON-LD). Only properties backed by real content.  */
/* ------------------------------------------------------------------ */

export function organizationLd() {
  const { company, legalName, url } = siteConfig;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: legalName,
    url,
    logo: absoluteUrl(siteConfig.brand.logo),
    email: company.email,
    telephone: company.phones[0].href.replace("tel:", ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${company.address.building}, ${company.address.street}`,
      addressLocality: company.address.locality,
      addressRegion: company.address.region,
      addressCountry: company.address.countryCode,
    },
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.legalName,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
  };
}

/**
 * Product JSON-LD. Deliberately minimal: name, brand and description only.
 * No `offers`, `price`, `availability`, `review` or `aggregateRating` — none of
 * that is known, and inventing it would be both dishonest and a structured-data
 * violation. Call this ONLY for verified products.
 */
export function productLd(input: {
  name: string;
  description: string;
  category?: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    ...(input.category ? { category: input.category } : {}),
    brand: { "@type": "Brand", name: siteConfig.legalName },
    url: absoluteUrl(input.url),
  };
}

export function articleLd(input: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@type": "Organization", name: siteConfig.legalName },
    publisher: {
      "@type": "Organization",
      name: siteConfig.legalName,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(siteConfig.brand.logo),
      },
    },
    mainEntityOfPage: absoluteUrl(input.url),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
