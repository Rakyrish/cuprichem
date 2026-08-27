import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared section heading: a rule, a monospace index + uppercase kicker, then
 * the title. Reused across the site so sections read as one system.
 *
 * `align="center"` is the default rhythm for full-width content sections;
 * `align="left"` is used inside split layouts where the copy column is already
 * offset. `index` is a two-digit section number (e.g. "02").
 */
export function SectionHeading({
  index,
  kicker,
  title,
  intro,
  className,
  align = "center",
  tone = "dark",
  as: Tag = "h2",
}: {
  index?: string;
  kicker: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
  align?: "left" | "center";
  /** `light` = light type for placement on dark surfaces. */
  tone?: "dark" | "light";
  as?: "h1" | "h2";
}) {
  const centered = align === "center";
  const light = tone === "light";

  return (
    <div
      className={cn(
        "max-w-3xl",
        centered && "mx-auto text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3",
          centered && "justify-center",
        )}
      >
        {index && (
          <span
            className={cn(
              "font-mono text-[0.72rem] font-medium tracking-[0.18em]",
              light ? "text-accent-bright" : "text-brand-700",
            )}
          >
            {index}
          </span>
        )}
        <span
          className={cn(
            "font-mono text-[0.72rem] uppercase tracking-[0.18em]",
            light ? "text-white/70" : "text-muted",
          )}
        >
          {kicker}
        </span>
      </div>

      <Tag
        className={cn(
          "mt-5 text-3xl md:text-[2.6rem] md:leading-[1.08]",
          light ? "text-white" : "text-ink",
        )}
      >
        {title}
      </Tag>

      {intro ? (
        <p
          className={cn(
            "mt-5 text-lg leading-relaxed",
            centered && "mx-auto max-w-2xl",
            light ? "text-white/80" : "text-muted",
          )}
        >
          {intro}
        </p>
      ) : null}

      {/* Short accent rule closing the heading block. Drawn at 3px — the logo
          lime is light enough that a hairline disappears on paper. */}
      <span
        aria-hidden
        className={cn(
          "mt-8 block h-[3px] w-14 rounded-full bg-brand-bright",
          centered && "mx-auto",
        )}
      />
    </div>
  );
}
