import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories, getSearchIndex } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import { SearchBox } from "@/components/search/SearchBox";

// Search-result surfaces are intentionally not indexed.
export const metadata: Metadata = buildMetadata({
  title: "Search the catalogue",
  description:
    "Search Cuprichem's industrial chemical catalogue by product name, synonym or category.",
  path: "/search",
  noindex: true,
});

export default async function SearchPage() {
  const [docs, categories] = await Promise.all([
    getSearchIndex(),
    getAllCategories(),
  ]);
  return (
    <>
      <Breadcrumbs trail={[{ name: "Search", path: "/search" }]} />
      <PageHero
        kicker="Search"
        title="Find a chemical."
        intro="Search the catalogue by product name, common synonym or category. Not finding it? Send a direct enquiry for any chemical."
      >
        <SearchBox docs={docs} />
      </PageHero>

      <section className="u-container py-16">
        <h2 className="u-mono-label">Browse categories</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/categories/${category.slug}`}
                className="inline-flex rounded-full border border-line-strong px-4 py-2 text-sm text-ink transition-colors hover:border-brand hover:text-brand-700"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
