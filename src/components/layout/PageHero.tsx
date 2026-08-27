import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";
import { photos, type SitePhoto } from "@/config/images";
import { cn } from "@/lib/cn";

/** One step in a breadcrumb trail. */
export type Crumb = { name: string; path: string };

/**
 * Interior page banner — the template every non-home page shares.
 *
 * Same photographic language as the home hero: full-bleed image, contrast
 * scrim, light type. The breadcrumb trail lives INSIDE the banner (over the
 * photo) rather than above it, so the transparent site header always has dark
 * imagery behind it and page tops stay visually identical across the site.
 *
 * `size="compact"` is for detail pages (a product, an article) where the
 * banner introduces a record rather than a section.
 */
export function PageHero({
  kicker,
  title,
  intro,
  trail,
  photo = photos.drumStoreWide,
  size = "default",
  children,
}: {
  kicker: string;
  title: string;
  intro?: ReactNode;
  /** Breadcrumb trail WITHOUT the leading Home crumb — it is added here. */
  trail?: Crumb[];
  photo?: SitePhoto;
  size?: "default" | "compact";
  children?: ReactNode;
}) {
  const full: Crumb[] = trail ? [{ name: "Home", path: "/" }, ...trail] : [];

  return (
    <section
      className={cn(
        "relative isolate flex flex-col justify-end overflow-hidden bg-ink-strong",
        size === "compact"
          ? "min-h-[18rem] md:min-h-[22rem]"
          : "min-h-[22rem] md:min-h-[28rem]",
      )}
    >
      <Image
        src={photo.src}
        alt=""
        fill
        priority
        sizes="100vw"
        quality={92}
        className="-z-10 object-cover"
        style={{ objectPosition: photo.position }}
      />
      {/* The soft scrim is already left- and bottom-weighted for this layout,
          so no extra focus pool is needed here. */}
      <div aria-hidden className="u-photo-scrim-soft absolute inset-0 -z-10" />

      <div className="u-photo-text u-container relative w-full pb-12 pt-14 md:pb-16 md:pt-20">
        {full.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-8">
            <JsonLd data={breadcrumbLd(full)} />
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.72rem] tracking-[0.08em] text-white/80">
              {full.map((crumb, i) => {
                const isLast = i === full.length - 1;
                return (
                  <li key={crumb.path} className="flex items-center gap-2">
                    {isLast ? (
                      <span aria-current="page" className="text-white">
                        {crumb.name}
                      </span>
                    ) : (
                      <Link
                        href={crumb.path}
                        className="transition-colors hover:text-white"
                      >
                        {crumb.name}
                      </Link>
                    )}
                    {!isLast && <span aria-hidden>/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-brand-bright">
          {kicker}
        </p>
        <h1
          className={cn(
            "mt-5 max-w-4xl text-white",
            size === "compact"
              ? "text-3xl md:text-4xl lg:text-5xl"
              : "text-4xl md:text-5xl lg:text-6xl",
          )}
        >
          {title}
        </h1>
        {intro ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/95">
            {intro}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
