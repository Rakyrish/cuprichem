import Link from "next/link";
import { getCategoryAreasForPreview } from "@/lib/content";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";

/**
 * "What we supply" — the broad category areas rendered as a ruled ledger.
 * Framed honestly as areas being built out (data is `verified: false` and held
 * in review), so nothing is claimed as a confirmed product line.
 */
export async function CategoryAreas() {
  const areas = await getCategoryAreasForPreview();

  return (
    <section className="u-container py-20">
      <SectionHeading
        index="01"
        kicker="What we supply"
        title="Chemistry organised by the way you buy it."
        intro="The catalogue is being populated with confirmed products and specifications. These are the core areas Cuprichem covers — request a quote for anything within them today."
      />

      <Reveal className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line sm:grid-cols-2">
        {areas.map((area, i) => (
          <Link
            key={area.slug}
            href={`/categories/${area.slug}`}
            className="group flex flex-col bg-paper p-6 transition-colors hover:bg-surface md:p-8"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[0.72rem] tracking-[0.14em] text-brand-700">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className="text-muted transition-all group-hover:translate-x-1 group-hover:text-brand-700"
              >
                →
              </span>
            </div>
            <h3 className="mt-5 text-xl text-ink">{area.name}</h3>
            <p className="mt-2 text-muted">{area.summary}</p>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
