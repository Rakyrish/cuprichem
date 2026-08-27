import { siteConfig } from "@/config/site";
import Image from "next/image";
import Link from "next/link";
import { getCategoryAreasForPreview } from "@/lib/content";
import { SectionHeading } from "@/components/sections/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { rotatePhoto } from "@/config/images";

/**
 * "What we supply" — the broad category areas as a photographic card grid.
 * Square-cornered imagery, a hairline-ruled caption block and a "+ INFO"
 * affordance, matching the card language used across the rest of the site.
 *
 * Framed honestly as areas being built out (data is `verified: false` and held
 * in review), so nothing is claimed as a confirmed product line.
 */
export async function CategoryAreas() {
  const areas = await getCategoryAreasForPreview();

  return (
    <section className="u-container u-section">
      <SectionHeading
        index="01"
        kicker="What we supply"
        title="Chemistry organised by the way you buy it."
        intro={`The catalogue is being populated with confirmed products and specifications. These are the core areas ${siteConfig.name} covers — request a quote for anything within them today.`}
      />

      <Reveal className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map((area, i) => {
          const photo = rotatePhoto(i);
          return (
            <Link
              key={area.slug}
              href={`/categories/${area.slug}`}
              className="group flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{ objectPosition: photo.position }}
                />
                {/* Only a small top-corner gradient, so the index stays
                    readable without tinting the whole photograph. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink-strong/45 to-transparent"
                />
                <span className="absolute left-4 top-4 font-mono text-[0.7rem] tracking-[0.18em] text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex flex-1 flex-col border-t-2 border-ink/10 pt-5 transition-colors group-hover:border-brand">
                <h3 className="text-xl text-ink">{area.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {area.summary}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-brand-700">
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:rotate-90"
                  >
                    +
                  </span>
                  Info
                </span>
              </div>
            </Link>
          );
        })}
      </Reveal>
    </section>
  );
}
