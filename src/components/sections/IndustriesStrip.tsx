import Link from "next/link";
import { getCategoryAreasForPreview } from "@/lib/content";
import { industries } from "@/data/taxonomy";

/**
 * Compact internal-linking strip to industry pages. Uses the taxonomy directly
 * (navigation surface, not a published-content guarantee) so the home page
 * always links into the industry section for crawlers.
 */
export async function IndustriesStrip() {
  // Touch the seam so this stays consistent with the async data pattern.
  await getCategoryAreasForPreview();

  return (
    <section className="border-t border-line bg-ink-strong text-on-dark">
      <div className="u-container py-16">
        <div className="flex flex-col gap-2 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-on-dark">
              04 · Industries
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl">Solutions by sector.</h2>
          </div>
          <Link
            href="/industries"
            className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-accent-bright hover:underline"
          >
            View all industries →
          </Link>
        </div>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-lg)] bg-white/10 sm:grid-cols-3">
          {industries.map((industry) => (
            <li key={industry.slug}>
              <Link
                href={`/industries/${industry.slug}`}
                className="group flex h-full flex-col bg-ink-strong p-6 transition-colors hover:bg-white/5"
              >
                <h3 className="text-xl text-on-dark">{industry.name}</h3>
                <p className="mt-2 text-sm text-muted-on-dark">
                  {industry.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
