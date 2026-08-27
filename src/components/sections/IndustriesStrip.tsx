import Link from "next/link";
import { getCategoryAreasForPreview } from "@/lib/content";
import { industries } from "@/data/taxonomy";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Internal-linking section for industry pages, on the dark surface so it reads
 * as a distinct chapter between the light bands above and the CTA below. Uses
 * the taxonomy directly (a navigation surface, not a published-content
 * guarantee) so the home page always links into the industry section.
 */
export async function IndustriesStrip() {
  // Touch the seam so this stays consistent with the async data pattern.
  await getCategoryAreasForPreview();

  return (
    <section className="bg-ink-strong">
      <div className="u-container u-section">
        <SectionHeading
          index="04"
          kicker="Industries"
          title="Solutions by sector."
          tone="light"
          intro="Chemistry selected for the way each sector actually uses it — from process plants to laboratories and utilities."
        />

        <Reveal
          as="ul"
          className="mt-16 grid gap-px overflow-hidden bg-white/10 sm:grid-cols-3"
        >
          {industries.map((industry, i) => (
            <li key={industry.slug}>
              <Link
                href={`/industries/${industry.slug}`}
                className="group flex h-full flex-col bg-ink-strong p-8 transition-colors hover:bg-white/[0.06]"
              >
                <span className="font-mono text-[0.72rem] tracking-[0.18em] text-accent-bright">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 text-xl text-white">{industry.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-white/70">
                  {industry.summary}
                </p>
                <span className="mt-8 inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-accent-bright">
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:rotate-90"
                  >
                    +
                  </span>
                  Info
                </span>
              </Link>
            </li>
          ))}
        </Reveal>

        <div className="mt-12 text-center">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-white/80 transition-colors hover:text-white"
          >
            View all industries
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
