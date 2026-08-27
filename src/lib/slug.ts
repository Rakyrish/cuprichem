/**
 * Deterministic slugify — shared by the catalogue importer (build time) and any
 * runtime code, so a product's stored slug always matches what links generate.
 * Lowercase, ASCII-ish, hyphen-separated; stable for URLs.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
