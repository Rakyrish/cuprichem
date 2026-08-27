import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/taxonomy";
import {
  getAnyCategoryBySlug,
  getAnyProductBySlug,
  getRelatedProducts,
} from "@/lib/content";
import { buildMetadata, productLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/ui/JsonLd";
import { PendingNotice } from "@/components/ui/PendingNotice";
import { ProductCard } from "@/components/cards/ProductCard";
import type { ProductTechnical } from "@/types/content";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getAnyProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return buildMetadata({
    title: product.name,
    description: product.shortDescription,
    path: `/products/${product.slug}`,
    noindex: !product.verified,
  });
}

const TECH_LABELS: Record<keyof ProductTechnical, string> = {
  casNumber: "CAS number",
  formula: "Formula",
  molecularWeight: "Molecular weight",
  grade: "Grade",
  purity: "Purity",
  appearance: "Appearance",
  packaging: "Packaging",
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getAnyProductBySlug(slug);
  if (!product) notFound();

  const category = await getAnyCategoryBySlug(product.category);
  const related = await getRelatedProducts(product);

  const techEntries = product.technical
    ? (Object.entries(product.technical).filter(
        ([, v]) => v != null && (Array.isArray(v) ? v.length > 0 : true),
      ) as [keyof ProductTechnical, string | string[]][])
    : [];

  const rfqHref = `/request-a-quote?product=${encodeURIComponent(product.name)}`;

  return (
    <>
      {product.verified && (
        <JsonLd
          data={productLd({
            name: product.name,
            description: product.shortDescription,
            category: category?.name,
            url: `/products/${product.slug}`,
          })}
        />
      )}

      <Breadcrumbs
        trail={[
          { name: "Products", path: "/products" },
          ...(category
            ? [{ name: category.name, path: `/categories/${category.slug}` }]
            : []),
          { name: product.name, path: `/products/${product.slug}` },
        ]}
      />

      {/* Above the fold */}
      <section className="u-container grid gap-10 border-b border-line py-12 md:py-16 lg:grid-cols-[1.3fr_1fr]">
        <div>
          {category && (
            <Link
              href={`/categories/${category.slug}`}
              className="u-mono-label hover:text-brand-700"
            >
              {category.name}
            </Link>
          )}
          <h1 className="mt-4 text-4xl md:text-5xl">{product.name}</h1>
          {product.synonyms && product.synonyms.length > 0 && (
            <p className="mt-3 font-mono text-sm text-muted">
              Also known as: {product.synonyms.join(", ")}
            </p>
          )}
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {product.shortDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href={rfqHref} size="lg">
              Request a quote
            </Button>
            {category && (
              <Button
                href={`/categories/${category.slug}`}
                size="lg"
                variant="outline"
              >
                More in {category.name}
              </Button>
            )}
          </div>
        </div>

        {/* Identity / spec panel */}
        <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <h2 className="u-mono-label">Product identity</h2>
          {techEntries.length > 0 ? (
            <dl className="mt-5 divide-y divide-line">
              {techEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 py-2.5">
                  <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                    {TECH_LABELS[key]}
                  </dt>
                  <dd className="text-right font-mono text-sm text-ink">
                    {Array.isArray(value) ? value.join(", ") : value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-5">
              <PendingNotice>
                Verified specifications (grade, purity, CAS number and packaging)
                for {product.name} are being confirmed. Request a quote and our
                team will send exact details.
              </PendingNotice>
            </div>
          )}
        </aside>
      </section>

      {/* Applications */}
      {product.applications && product.applications.length > 0 && (
        <section className="u-container py-12">
          <h2 className="text-2xl">Applications</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {product.applications.map((app) => (
              <li key={app} className="border-l-2 border-brand pl-4 text-muted">
                {app}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {product.faqs && product.faqs.length > 0 && (
        <section className="u-container py-12">
          <h2 className="text-2xl">Frequently asked questions</h2>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {product.faqs.map((faq) => (
              <details key={faq.question} className="group py-4">
                <summary className="cursor-pointer list-none font-medium text-ink">
                  {faq.question}
                </summary>
                <p className="mt-2 text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="u-container py-12">
          <h2 className="text-2xl">Related products</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ProductCard
                key={r.slug}
                product={r}
                categoryName={category?.name}
              />
            ))}
          </div>
        </section>
      )}

      {/* RFQ band */}
      <section className="u-container py-12">
        <div className="rounded-[var(--radius-lg)] border border-line bg-brand px-8 py-10 text-white">
          <h2 className="text-2xl">Need {product.name}?</h2>
          <p className="mt-2 max-w-xl text-white/85">
            Send your grade, quantity and packaging requirements and our sales
            team will respond with availability, pricing and lead time.
          </p>
          <div className="mt-6">
            <Button href={rfqHref} size="lg" variant="accent">
              Request a quote
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
