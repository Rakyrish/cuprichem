"use client";

import { siteConfig } from "@/config/site";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { photos } from "@/config/images";

/**
 * Home hero — full-bleed photographic stage with a rotating set of statements
 * laid over it, in the manner of a modern ingredient-supplier site.
 *
 * Structure: stacked full-cover photos that cross-fade, a fixed contrast scrim,
 * and centred copy anchored toward the lower third. The header sits transparent
 * on top of this, so the section is pulled up under it by `--header-h`.
 *
 * Every claim in `slides` is neutral and verifiable — capability and category
 * statements only, no invented figures, certifications or client names.
 */

const slides = [
  {
    eyebrow: `Industrial chemical supply · ${siteConfig.company.address.region}, ${siteConfig.company.address.country}`,
    title: "The chemistry your process depends on.",
    body: `${siteConfig.legalName} supplies manufacturers, institutions and laboratories across ${siteConfig.company.address.country} — specified to the right grade, sourced through a direct quote.`,
    photo: photos.drumStoreWide,
    cta: { label: "Request a quote", href: "/request-a-quote" },
    secondary: { label: "Browse the catalogue", href: "/products" },
  },
  {
    eyebrow: "Bulk and packed supply",
    title: "From bulk storage to the drum at your door.",
    body: "Drums, IBCs, jerrycans and packed goods — the grade and packaging confirmed per enquiry, with documentation supplied where we hold it.",
    photo: photos.drumsStacked,
    cta: { label: "How sourcing works", href: "/about" },
    secondary: { label: "Talk to sales", href: "/contact" },
  },
  {
    eyebrow: "Coatings and allied chemicals",
    title: "Stock that keeps your line running.",
    body: "Solvents, resins, pigments and allied chemistry for the coatings, construction and manufacturing sectors across the region.",
    photo: photos.coatingsAisle,
    cta: { label: "Explore categories", href: "/categories" },
    secondary: { label: "Industries we serve", href: "/industries" },
  },
];

const ROTATE_MS = 7000;

export function Hero() {
  const [active, setActive] = useState(0);
  // Autoplay stops for good once the visitor takes control, so a click is
  // never fought by the timer.
  const [userEngaged, setUserEngaged] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const select = useCallback((index: number) => {
    setUserEngaged(true);
    setActive(index);
  }, []);

  useEffect(() => {
    if (userEngaged) return;
    // Respect reduced-motion: no automatic slide changes at all.
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    timer.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [userEngaged]);

  const current = slides[active];

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${siteConfig.name} introduction`}
      // Height accounts for the opaque header above it (utility strip 2.25rem
      // + bar 4.5rem) so the first screen still resolves to exactly one view.
      className="relative isolate flex min-h-[34rem] flex-col justify-end overflow-hidden bg-ink-strong md:min-h-[42rem] lg:h-[calc(100svh-6.75rem)] lg:max-h-[52rem]"
    >
      {/* Photographic stage — all slides mounted, cross-faded. */}
      {slides.map((slide, i) => (
        <div
          key={slide.photo.src}
          aria-hidden={i !== active}
          className="absolute inset-0 -z-10 transition-opacity duration-[1200ms] ease-out"
          style={{ opacity: i === active ? 1 : 0 }}
        >
          <Image
            src={slide.photo.src}
            alt={i === active ? slide.photo.alt : ""}
            fill
            priority={i === 0}
            sizes="100vw"
            quality={92}
            className={i === active ? "photo-drift object-cover" : "object-cover"}
            style={{ objectPosition: slide.photo.position }}
          />
        </div>
      ))}

      {/* Contrast layers — above the photos, below the content. The flat scrim
          holds the header and the bottom edge; the focus pool sits under the
          copy so bright frames can't wash the type out. */}
      <div aria-hidden className="u-photo-scrim absolute inset-0 -z-10" />
      <div aria-hidden className="u-photo-focus absolute inset-0 -z-10" />

      {/* Copy */}
      <div
        className="u-container relative w-full pb-16 pt-20 md:pb-24 md:pt-24"
        aria-live="polite"
      >
        <div className="u-photo-text mx-auto max-w-3xl text-center">
          {/* `key` restarts the entrance animation on every slide change. */}
          <div key={active}>
            <p
              // Tighter and smaller on narrow screens — the eyebrows run long
              // and wide tracking makes them wrap badly at phone widths.
              className="hero-rise font-mono text-[0.6rem] uppercase tracking-[0.1em] text-brand-bright sm:text-[0.72rem] sm:tracking-[0.18em]"
              style={{ "--d": "0ms" } as React.CSSProperties}
            >
              {current.eyebrow}
            </p>
            <h1
              className="hero-rise mt-6 text-4xl text-white sm:text-5xl lg:text-[3.75rem]"
              style={{ "--d": "90ms" } as React.CSSProperties}
            >
              {current.title}
            </h1>
            <p
              className="hero-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/95"
              style={{ "--d": "180ms" } as React.CSSProperties}
            >
              {current.body}
            </p>
            <div
              className="hero-rise mt-9 flex flex-wrap items-center justify-center gap-3"
              style={{ "--d": "270ms" } as React.CSSProperties}
            >
              <Button href={current.cta.href} size="lg" variant="onPhotoSolid">
                {current.cta.label}
                <span aria-hidden>+</span>
              </Button>
              <Button href={current.secondary.href} size="lg" variant="onPhoto">
                {current.secondary.label}
              </Button>
            </div>
          </div>
        </div>

        {/* Slide controls */}
        <div className="mt-14 flex items-center justify-center gap-3">
          {slides.map((slide, i) => (
            <button
              key={slide.photo.src}
              type="button"
              onClick={() => select(i)}
              aria-label={`Show slide ${i + 1}: ${slide.title}`}
              aria-current={i === active}
              className="group p-2"
            >
              <span
                className={
                  "block h-[3px] w-10 transition-all duration-300 " +
                  (i === active
                    ? "bg-white"
                    : "bg-white/35 group-hover:bg-white/70")
                }
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
