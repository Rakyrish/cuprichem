import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared section heading in the "ledger" style: a monospace index + kicker on a
 * ruled line, then the title. Reused across the site so sections read as one
 * system. `index` is a two-digit section number (e.g. "02").
 */
export function SectionHeading({
  index,
  kicker,
  title,
  intro,
  className,
  as: Tag = "h2",
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  intro?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <div className="flex items-center gap-3 border-b border-line pb-3">
        <span className="font-mono text-[0.72rem] font-medium tracking-[0.18em] text-brand-700">
          {index}
        </span>
        <span className="u-mono-label">{kicker}</span>
      </div>
      <Tag className="mt-6 text-3xl md:text-4xl">{title}</Tag>
      {intro ? (
        <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>
      ) : null}
    </div>
  );
}
