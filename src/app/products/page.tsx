import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/cards/ProductCard";

export const metadata: Metadata = buildMetadata({
  title: "Industrial chemical products",
  description:
    "Browse Cuprichem's industrial chemical catalogue by category — request a quote for the chemistry, grade and quantity you need, supplied across Kenya.",
  path: "/products",
});

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  const byCategory = categories
    .map((category) => ({
      category,
      items: products.filter((p) => p.category === category.slug),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Breadcrumbs trail={[{ name: "Products", path: "/products" }]} />
      <PageHero
        kicker="Catalogue · Products"
        title="The Cuprichem chemical catalogue."
        intro="Browse the chemistry we supply, grouped by category. Confirmed grades, specifications and packaging are being added — request a quote for exact details and availability on any product."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/request-a-quote">Request a quote</Button>
          <Button href="/search" variant="outline">
            Search the catalogue
          </Button>
        </div>
      </PageHero>

      <div className="u-container py-16">
        {byCategory.map(({ category, items }) => (
          <section key={category.slug} className="mb-16 last:mb-0">
            <div className="flex items-end justify-between border-b border-line pb-3">
              <h2 className="text-2xl">
                <Link
                  href={`/categories/${category.slug}`}
                  className="hover:text-brand-700"
                >
                  {category.name}
                </Link>
              </h2>
              <span className="font-mono text-[0.72rem] tracking-[0.12em] text-muted">
                {items.length} product{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.slug} product={p} categoryName={category.name} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
