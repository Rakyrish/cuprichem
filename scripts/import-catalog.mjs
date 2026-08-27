#!/usr/bin/env node
/**
 * Catalogue importer — turns client-supplied CSVs into the typed data the site
 * reads, with correct slugs, category links and publish flags. No chemistry is
 * invented: every field comes from the CSV; blanks stay absent.
 *
 *   npm run import:catalog
 *
 * Inputs (in ./data), UTF-8, comma-separated, first row = headers:
 *   catalog.csv       (REQUIRED) one row per product
 *   categories.csv    (optional) category summaries/intros
 *   industries.csv    (optional) industry summaries
 *
 * Output (overwritten): src/data/taxonomy.ts
 *
 * Multi-value cells (synonyms, packaging, applications, industries, related)
 * are separated by ";". See data/README.md for the full column reference.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OUT = join(ROOT, "src", "data", "taxonomy.ts");

/* -------------------------------- helpers --------------------------------- */

function slugify(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Minimal RFC-4180-ish CSV parser: quotes, "" escapes, CR/LF, embedded commas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, ""); // strip BOM
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

function readCsv(name, required = false) {
  const path = join(DATA, name);
  if (!existsSync(path)) {
    if (required) {
      console.error(`\n✖ Missing required file: data/${name}\n  See data/README.md for the format and templates.\n`);
      process.exit(1);
    }
    return [];
  }
  return parseCsv(readFileSync(path, "utf8"));
}

const list = (v) => (v ? v.split(";").map((s) => s.trim()).filter(Boolean) : []);
const bool = (v, dflt) => {
  if (v === "" || v == null) return dflt;
  return /^(true|yes|1|y)$/i.test(v.trim());
};
const status = (v) => {
  const s = (v || "").trim().toLowerCase();
  return ["draft", "review", "published"].includes(s) ? s : "published";
};
const ts = (v) => JSON.stringify(v ?? "");

/* --------------------------------- import --------------------------------- */

const productRows = readCsv("catalog.csv", true);
const categoryMeta = readCsv("categories.csv");
const industryMeta = readCsv("industries.csv");

// Category metadata keyed by slug.
const catMetaBySlug = new Map();
for (const r of categoryMeta) {
  const name = r.name || r.category;
  if (!name) continue;
  const slug = r.slug ? slugify(r.slug) : slugify(name);
  catMetaBySlug.set(slug, {
    slug,
    name,
    summary: r.summary || "",
    intro: r.intro || "",
    verified: bool(r.verified, true),
    status: status(r.status),
  });
}

const indMetaBySlug = new Map();
for (const r of industryMeta) {
  const name = r.name || r.industry;
  if (!name) continue;
  const slug = r.slug ? slugify(r.slug) : slugify(name);
  indMetaBySlug.set(slug, {
    slug,
    name,
    summary: r.summary || "",
    verified: bool(r.verified, true),
    status: status(r.status),
  });
}

// Build products; collect referenced categories/industries.
const seenProductSlugs = new Set();
const usedCategories = new Map(); // slug -> name
const usedIndustries = new Map();
const productsByCategory = new Map();

const products = productRows.map((r, idx) => {
  const name = r.name || r.product;
  if (!name) {
    console.error(`✖ Row ${idx + 2}: missing 'name'.`);
    process.exit(1);
  }
  let slug = r.slug ? slugify(r.slug) : slugify(name);
  if (seenProductSlugs.has(slug)) {
    console.error(`✖ Duplicate product slug '${slug}' (row ${idx + 2}). Give a unique 'slug' or name.`);
    process.exit(1);
  }
  seenProductSlugs.add(slug);

  const catName = r.category;
  if (!catName) {
    console.error(`✖ Row ${idx + 2} ('${name}'): missing 'category'.`);
    process.exit(1);
  }
  const catSlug = slugify(catName);
  if (!usedCategories.has(catSlug)) usedCategories.set(catSlug, catName);
  if (!productsByCategory.has(catSlug)) productsByCategory.set(catSlug, []);
  productsByCategory.get(catSlug).push(slug);

  const industries = list(r.industries).map((n) => {
    const s = slugify(n);
    if (!usedIndustries.has(s)) usedIndustries.set(s, n);
    return s;
  });

  const technical = {};
  if (r.cas_number) technical.casNumber = r.cas_number;
  if (r.formula) technical.formula = r.formula;
  if (r.molecular_weight) technical.molecularWeight = r.molecular_weight;
  if (r.grade) technical.grade = r.grade;
  if (r.purity) technical.purity = r.purity;
  if (r.appearance) technical.appearance = r.appearance;
  const packaging = list(r.packaging);
  if (packaging.length) technical.packaging = packaging;

  return {
    slug,
    name,
    synonyms: list(r.synonyms),
    category: catSlug,
    shortDescription:
      r.short_description ||
      `${name} supplied by Cuprichem Industrial Chemicals. Request a quote for grade, packaging and availability.`,
    description: r.description || "",
    status: status(r.status),
    verified: bool(r.verified, true),
    technical: Object.keys(technical).length ? technical : null,
    applications: list(r.applications),
    industries,
    related: list(r.related).map(slugify),
    _catSlug: catSlug,
  };
});

// Auto-relate within category when a product has no explicit 'related'.
for (const p of products) {
  if (p.related.length) continue;
  const siblings = (productsByCategory.get(p._catSlug) || []).filter((s) => s !== p.slug);
  p.related = siblings.slice(0, 2);
  delete p._catSlug;
}

// Categories: metadata rows + any referenced by products.
const categories = [];
const allCatSlugs = new Set([...catMetaBySlug.keys(), ...usedCategories.keys()]);
for (const slug of allCatSlugs) {
  const meta = catMetaBySlug.get(slug);
  const name = meta?.name || usedCategories.get(slug) || slug;
  categories.push({
    slug,
    name,
    summary: meta?.summary || `${name} supplied by Cuprichem.`,
    intro: meta?.intro || "",
    status: meta?.status || "published",
    verified: meta ? meta.verified : true,
  });
}

const industries = [];
const allIndSlugs = new Set([...indMetaBySlug.keys(), ...usedIndustries.keys()]);
for (const slug of allIndSlugs) {
  const meta = indMetaBySlug.get(slug);
  const name = meta?.name || usedIndustries.get(slug) || slug;
  industries.push({
    slug,
    name,
    summary: meta?.summary || `${name} sector served by Cuprichem.`,
    status: meta?.status || "published",
    verified: meta ? meta.verified : false, // industries need a real summary to be verified
  });
}

/* --------------------------------- emit ----------------------------------- */

function emitProduct(p) {
  const lines = [`  {`, `    slug: ${ts(p.slug)},`, `    name: ${ts(p.name)},`];
  if (p.synonyms.length) lines.push(`    synonyms: [${p.synonyms.map(ts).join(", ")}],`);
  lines.push(`    category: ${ts(p.category)},`);
  lines.push(`    shortDescription: ${ts(p.shortDescription)},`);
  if (p.description) lines.push(`    description: ${ts(p.description)},`);
  lines.push(`    status: ${ts(p.status)},`, `    verified: ${p.verified},`);
  if (p.technical) {
    const t = p.technical;
    const parts = [];
    for (const k of ["casNumber", "formula", "molecularWeight", "grade", "purity", "appearance"]) {
      if (t[k]) parts.push(`${k}: ${ts(t[k])}`);
    }
    if (t.packaging) parts.push(`packaging: [${t.packaging.map(ts).join(", ")}]`);
    lines.push(`    technical: { ${parts.join(", ")} },`);
  }
  if (p.applications.length) lines.push(`    applications: [${p.applications.map(ts).join(", ")}],`);
  if (p.industries.length) lines.push(`    industries: [${p.industries.map(ts).join(", ")}],`);
  if (p.related.length) lines.push(`    related: [${p.related.map(ts).join(", ")}],`);
  lines.push(`  }`);
  return lines.join("\n");
}

const header = `// GENERATED FILE — do not edit by hand.
// Source: data/catalog.csv (+ data/categories.csv, data/industries.csv)
// Regenerate: npm run import:catalog
//
// This is the Phase 1 typed "database" the site reads through lib/content.ts.
import type { Category, Industry, Product } from "@/types/content";
`;

const catBlock =
  `export const categories: Category[] = [\n` +
  categories
    .map(
      (c) =>
        `  {\n    slug: ${ts(c.slug)},\n    name: ${ts(c.name)},\n    summary: ${ts(c.summary)},` +
        (c.intro ? `\n    intro: ${ts(c.intro)},` : ``) +
        `\n    status: ${ts(c.status)},\n    verified: ${c.verified},\n  }`,
    )
    .join(",\n") +
  `\n];\n`;

const prodBlock = `export const products: Product[] = [\n${products.map(emitProduct).join(",\n")}\n];\n`;

const indBlock =
  `export const industries: Industry[] = [\n` +
  industries
    .map(
      (i) =>
        `  {\n    slug: ${ts(i.slug)},\n    name: ${ts(i.name)},\n    summary: ${ts(i.summary)},\n    status: ${ts(i.status)},\n    verified: ${i.verified},\n  }`,
    )
    .join(",\n") +
  `\n];\n`;

writeFileSync(OUT, [header, catBlock, prodBlock, indBlock].join("\n"), "utf8");

console.log(`✓ Imported ${products.length} products, ${categories.length} categories, ${industries.length} industries`);
console.log(`  → wrote src/data/taxonomy.ts`);
const unpub = products.filter((p) => p.status !== "published" || !p.verified).length;
if (unpub) console.log(`  note: ${unpub} product(s) are draft/review/unverified → noindex + not in sitemap.`);
console.log(`  Next: npm run typecheck && npm run build`);
