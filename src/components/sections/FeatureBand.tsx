import type { ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import type { SitePhoto } from "@/config/images";
import { cn } from "@/lib/cn";

/**
 * Alternating photo / copy feature band — the workhorse content pattern.
 *
 * A tall square-cornered photograph on one side, a copy column on the other,
 * flipped per instance so a page reads as a rhythm rather than a stack. Set
 * `reverse` to move the photo to the right.
 */
export function FeatureBand({
  kicker,
  title,
  body,
  photo,
  cta,
  reverse = false,
  tone = "paper",
  children,
}: {
  kicker: string;
  title: ReactNode;
  body: ReactNode;
  photo: SitePhoto;
  cta?: { label: string; href: string };
  reverse?: boolean;
  /** `surface` tints the band so consecutive bands separate cleanly. */
  tone?: "paper" | "surface";
  children?: ReactNode;
}) {
  return (
    <section className={cn(tone === "surface" ? "bg-surface" : "bg-paper")}>
      <div className="u-container u-section">
        <div
          className={cn(
            "grid items-center gap-12 lg:grid-cols-2 lg:gap-20",
            reverse && "lg:[&>*:first-child]:order-2",
          )}
        >
          <Reveal>
            <div className="relative aspect-[5/4] overflow-hidden bg-surface lg:aspect-[4/5]">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 92vw"
                className="object-cover"
                style={{ objectPosition: photo.position }}
              />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted">
              {kicker}
            </p>
            <h2 className="mt-5 text-3xl text-ink md:text-[2.4rem] md:leading-[1.1]">
              {title}
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted">
              {body}
            </div>
            {children}
            {cta && (
              <div className="mt-9">
                <Button href={cta.href} size="lg">
                  {cta.label}
                  <span aria-hidden>+</span>
                </Button>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
