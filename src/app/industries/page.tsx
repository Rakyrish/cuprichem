import type { Metadata } from "next";
import Link from "next/link";
import { getAllIndustries } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Industries we supply",
  description:
    "Cuprichem supplies industrial chemicals to manufacturing, water and utilities, institutions and laboratories across Kenya. Explore chemistry by the sector you work in.",
  path: "/industries",
});

export default async function IndustriesPage() {
  const industries = await getAllIndustries();
  return (
    <>
      <Breadcrumbs trail={[{ name: "Industries", path: "/industries" }]} />
      <PageHero
        kicker="Catalogue · Industries"
        title="Chemistry by the sector you work in."
        intro="Different industries need different chemistry, packaging and support. These are the sectors Cuprichem serves — industry pages expand as products and applications are confirmed."
      />
      <section className="u-container py-16">
        <ul className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-3">
          {industries.map((industry, i) => (
            <li key={industry.slug} className="bg-paper">
              <Link
                href={`/industries/${industry.slug}`}
                className="group flex h-full flex-col p-8 transition-colors hover:bg-surface"
              >
                <span className="font-mono text-[0.72rem] tracking-[0.14em] text-brand-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-5 text-xl text-ink">{industry.name}</h2>
                <p className="mt-2 text-muted">{industry.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
