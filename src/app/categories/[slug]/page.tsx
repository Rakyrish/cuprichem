import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categories } from "@/data/taxonomy";
import { getAnyCategoryBySlug, getProductsByCategory } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { rotatePhoto } from "@/config/images";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/cards/ProductCard";

/** Pre-render the known category slugs; unknown slugs 404. */
export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getAnyCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  return buildMetadata({
    title: `${category.name}`,
    description: category.summary,
    path: `/categories/${category.slug}`,
    // Unconfirmed placeholder areas are reachable but not indexed or in the
    // sitemap until the client confirms them (verified === true).
    noindex: !category.verified,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getAnyCategoryBySlug(slug);
  if (!category) notFound();

  const catProducts = await getProductsByCategory(category.slug);

  return (
    <>
      <PageHero
        trail={[
          { name: "Categories", path: "/categories" },
          { name: category.name, path: `/categories/${category.slug}` },
        ]}
        // Keyed to taxonomy position so each category keeps a stable, distinct
        // banner rather than every category page looking identical.
        photo={rotatePhoto(
          categories.findIndex((c) => c.slug === category.slug),
        )}
        kicker="Category"
        title={category.name}
        intro={category.summary}
      />

      <section className="u-container py-16">
        {category.intro ? (
          <p className="max-w-2xl leading-relaxed text-muted">{category.intro}</p>
        ) : (
          <div className="max-w-2xl rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <p className="u-mono-label">Catalogue in build-out</p>
            <p className="mt-3 text-muted">
              The products below cover this category. Confirmed grades,
              specifications and packaging are being added — request a quote for
              current details on any of them.
            </p>
          </div>
        )}

        {catProducts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl">Products in this category</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catProducts.map((p) => (
                <ProductCard key={p.slug} product={p} categoryName={category.name} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/request-a-quote">Request a quote</Button>
          <Button href="/categories" variant="outline">
            All categories
          </Button>
        </div>
      </section>
    </>
  );
}
