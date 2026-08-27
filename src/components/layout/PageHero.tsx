import type { ReactNode } from "react";

/**
 * Interior page hero: monospace kicker + H1 + intro, on a ruled baseline.
 * Keeps every top-level page visually consistent with the ledger system.
 */
export function PageHero({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="u-container border-b border-line py-12 md:py-16">
      <p className="u-mono-label">{kicker}</p>
      <h1 className="mt-5 max-w-4xl text-4xl md:text-5xl lg:text-6xl">
        {title}
      </h1>
      {intro ? (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          {intro}
        </p>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
