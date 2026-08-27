/**
 * Local catalogue data — the Phase 1 "database".
 *
 * ⚠️ PLACEHOLDER / PENDING CLIENT CONFIRMATION ⚠️
 * No real Cuprichem product list, CAS numbers, grades, purities or packaging
 * have been supplied. To avoid fabricating chemistry (a hard content-integrity
 * rule) this file intentionally contains ONLY a small set of broad, common
 * industrial-chemical CATEGORY areas, every one flagged `verified: false` and
 * held at `status: "review"` so nothing is presented as confirmed fact or
 * published to crawlers until the client confirms it.
 *
 * These are category *areas* a Kenyan industrial-chemical supplier commonly
 * covers — not specific product/spec claims. Replace/confirm via
 * docs/pending-cuprichem-data.md before launch. Add real Products here (or wire
 * the Phase 2 API in lib/content.ts) once the catalogue is provided.
 */

import type { Category, Industry, Product } from "@/types/content";

export const categories: Category[] = [
  {
    slug: "water-treatment-chemicals",
    name: "Water Treatment Chemicals",
    summary:
      "Coagulants, flocculants, pH correction and disinfection chemistry for potable and process water.",
    status: "review",
    verified: false,
  },
  {
    slug: "industrial-cleaning-chemicals",
    name: "Industrial Cleaning Chemicals",
    summary:
      "Detergents, degreasers, descalers and sanitising chemistry for plant and facility hygiene.",
    status: "review",
    verified: false,
  },
  {
    slug: "laboratory-reagents",
    name: "Laboratory Reagents",
    summary:
      "Analytical and general-purpose reagents for laboratories and quality-control use.",
    status: "review",
    verified: false,
  },
  {
    slug: "construction-chemicals",
    name: "Construction Chemicals",
    summary:
      "Admixtures, curing compounds and surface treatments for the building sector.",
    status: "review",
    verified: false,
  },
];

/**
 * Placeholder products.
 *
 * These use REAL chemical common names mapped to a category, so the catalogue
 * UI (listing, detail, related, search) can be built and demonstrated. They are
 * `status: "review"`, `verified: false` → REACHABLE but rendered `noindex`,
 * excluded from the sitemap, and shown with a "pending confirmation" notice.
 *
 * No commercial or technical data is invented: `technical`, `purity`, `grade`,
 * CAS numbers, packaging and prices are deliberately ABSENT until the client
 * supplies them. The one-line `shortDescription` states only general, factual
 * common-use context about the substance — not a Cuprichem stock/spec claim.
 */
function placeholder(
  category: string,
  entries: { slug: string; name: string; use: string; synonyms?: string[] }[],
): Product[] {
  return entries.map((e, i) => ({
    slug: e.slug,
    name: e.name,
    synonyms: e.synonyms,
    category,
    shortDescription: `${e.use} Product specifications for this listing are being confirmed — request a quote for grade, packaging and availability.`,
    status: "review" as const,
    verified: false,
    // Relate to the next item in the same category for internal linking.
    related: [entries[(i + 1) % entries.length].slug],
  }));
}

export const products: Product[] = [
  ...placeholder("water-treatment-chemicals", [
    { slug: "sodium-hypochlorite", name: "Sodium Hypochlorite", use: "A chlorine-based chemical widely used for water disinfection and sanitation.", synonyms: ["liquid chlorine", "bleach"] },
    { slug: "aluminium-sulphate", name: "Aluminium Sulphate", use: "A coagulant commonly used to clarify potable and process water.", synonyms: ["alum"] },
    { slug: "hydrated-lime", name: "Hydrated Lime", use: "Used for pH correction and alkalinity adjustment in water treatment.", synonyms: ["calcium hydroxide"] },
  ]),
  ...placeholder("industrial-cleaning-chemicals", [
    { slug: "caustic-soda", name: "Caustic Soda", use: "A strong alkali used in industrial cleaning, degreasing and processing.", synonyms: ["sodium hydroxide", "lye"] },
    { slug: "sodium-metasilicate", name: "Sodium Metasilicate", use: "An alkaline builder used in detergents and industrial cleaners.", synonyms: [] },
    { slug: "citric-acid", name: "Citric Acid", use: "A mild organic acid used for descaling and cleaning applications.", synonyms: [] },
  ]),
  ...placeholder("laboratory-reagents", [
    { slug: "hydrochloric-acid", name: "Hydrochloric Acid", use: "A common mineral acid used across laboratory and industrial processes.", synonyms: ["muriatic acid"] },
    { slug: "sulphuric-acid", name: "Sulphuric Acid", use: "A widely used strong mineral acid for laboratory and industrial use.", synonyms: [] },
    { slug: "ethanol", name: "Ethanol", use: "A general-purpose solvent used in laboratories and cleaning.", synonyms: ["ethyl alcohol"] },
  ]),
  ...placeholder("construction-chemicals", [
    { slug: "calcium-chloride", name: "Calcium Chloride", use: "Used as a concrete set accelerator and for dust control.", synonyms: [] },
    { slug: "sodium-nitrite", name: "Sodium Nitrite", use: "Used in corrosion inhibition and certain construction applications.", synonyms: [] },
  ]),
];

export const industries: Industry[] = [
  {
    slug: "manufacturing",
    name: "Manufacturing",
    summary:
      "Process and utility chemistry for production plants and light industry.",
    status: "review",
    verified: false,
  },
  {
    slug: "water-utilities",
    name: "Water & Utilities",
    summary:
      "Treatment chemistry for water providers, effluent handling and utilities.",
    status: "review",
    verified: false,
  },
  {
    slug: "institutions-laboratories",
    name: "Institutions & Laboratories",
    summary:
      "Supply for schools, hospitals, research institutions and QC laboratories.",
    status: "review",
    verified: false,
  },
];
