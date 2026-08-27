import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { getAllIndustries } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { photos } from "@/config/images";

export const metadata: Metadata = buildMetadata({
  title: "Industries we supply",
  description: `${siteConfig.name} supplies industrial chemicals to manufacturing, water and utilities, institutions and laboratories across ${siteConfig.company.address.country}. Explore chemistry by the sector you work in.`,
  path: "/industries",
});

export default async function IndustriesPage() {
  const industries = await getAllIndustries();
  return (
    <>
      <PageHero
        trail={[{ name: "Industries", path: "/industries" }]}
        photo={photos.coatingsStore}
        kicker="Catalogue · Industries"
        title="Chemistry by the sector you work in."
        intro={`Different industries need different chemistry, packaging and support. These are the sectors ${siteConfig.name} serves — industry pages expand as products and applications are confirmed.`}
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
