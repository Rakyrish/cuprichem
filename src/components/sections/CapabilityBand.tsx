import { siteConfig } from "@/config/site";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { photos } from "@/config/images";

/**
 * Full-bleed photographic statement band. Breaks the run of contained,
 * light sections with an edge-to-edge image and centred light type — the same
 * visual register as the hero, used once mid-page as a pause.
 *
 * Content is a neutral, verifiable capability statement, not a facility or
 * capacity claim.
 */
export function CapabilityBand() {
  const photo = photos.drumsStacked;

  return (
    <section className="relative isolate flex min-h-[30rem] items-center overflow-hidden bg-ink-strong md:min-h-[36rem]">
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes="100vw"
        quality={92}
        className="-z-10 object-cover"
        style={{ objectPosition: photo.position }}
      />
      <div aria-hidden className="u-photo-scrim absolute inset-0 -z-10" />

      <div className="u-photo-text u-container relative py-20 text-center md:py-28">
        <Reveal>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-brand-bright">
            Supply, specified
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl text-3xl text-white md:text-[2.75rem] md:leading-[1.08]">
            From bulk storage to the drum at your door.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
            {siteConfig.name} connects industrial buyers to the chemistry they
            need and supplies it in the grade and packaging that suit the job —
            confirmed per enquiry, with documentation where available.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href="/products" size="lg" variant="onPhotoSolid">
              Explore the catalogue
              <span aria-hidden>+</span>
            </Button>
            <Button href="/contact" size="lg" variant="onPhoto">
              Talk to sales
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
