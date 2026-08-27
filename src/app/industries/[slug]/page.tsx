import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { industries } from "@/data/taxonomy";
import { getAnyIndustryBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { rotatePhoto } from "@/config/images";
import { Button } from "@/components/ui/Button";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = await getAnyIndustryBySlug(slug);
  if (!industry) return { title: "Industry not found", robots: { index: false } };
  return buildMetadata({
    title: industry.name,
    description: industry.summary,
    path: `/industries/${industry.slug}`,
    noindex: !industry.verified,
  });
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = await getAnyIndustryBySlug(slug);
  if (!industry) notFound();

  return (
    <>
      <PageHero
        trail={[
          { name: "Industries", path: "/industries" },
          { name: industry.name, path: `/industries/${industry.slug}` },
        ]}
        // Offset by one so an industry page and the category page at the same
        // taxonomy position don't land on the same photograph.
        photo={rotatePhoto(
          industries.findIndex((i) => i.slug === industry.slug) + 1,
        )}
        kicker="Industry"
        title={industry.name}
        intro={industry.summary}
      />

      <section className="u-container py-16">
        <div className="max-w-2xl">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6">
            <p className="u-mono-label">Sector coverage in build-out</p>
            <p className="mt-3 text-muted">
              Relevant chemical categories, applications and confirmed products
              for the {industry.name.toLowerCase()} sector are being added. Tell
              us what you are sourcing and our team will respond directly.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/request-a-quote">Request a quote</Button>
            <Button href="/industries" variant="outline">
              All industries
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
