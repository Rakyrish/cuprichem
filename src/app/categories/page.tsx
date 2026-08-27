import type { Metadata } from "next";
import Link from "next/link";
import { getAllCategories } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Chemical categories",
  description:
    "Browse Cuprichem's industrial chemicals by category — water treatment, industrial cleaning, laboratory reagents and construction chemistry — supplied across Kenya.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const categories = await getAllCategories();
  return (
    <>
      <Breadcrumbs trail={[{ name: "Categories", path: "/categories" }]} />
      <PageHero
        kicker="Catalogue · Categories"
        title="Chemicals by category."
        intro="Cuprichem's catalogue is organised by the type of chemistry you are sourcing. Category pages are being populated with confirmed products — request a quote for anything within an area today."
      />
      <section className="u-container py-16">
        <ul className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2">
          {categories.map((category, i) => (
            <li key={category.slug} className="bg-paper">
              <Link
                href={`/categories/${category.slug}`}
                className="group flex h-full flex-col p-8 transition-colors hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.72rem] tracking-[0.14em] text-brand-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand-700"
                  >
                    →
                  </span>
                </div>
                <h2 className="mt-5 text-xl text-ink">{category.name}</h2>
                <p className="mt-2 text-muted">{category.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
