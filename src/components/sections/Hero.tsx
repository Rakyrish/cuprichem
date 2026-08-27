import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { HeroBackdrop } from "@/components/sections/HeroBackdrop";

/**
 * Home hero — deliberately NOT a giant photo. An asymmetric split: a strong
 * editorial statement on the left, and a "catalogue index" ledger panel on the
 * right that doubles as primary navigation into the information architecture.
 * The index lists site sections (navigation), not fabricated product claims.
 */
const indexRows = [
  { code: "PRD", label: "Products", href: "/products", note: "Catalogue in build-out" },
  { code: "CAT", label: "Categories", href: "/categories", note: "By chemical type" },
  { code: "IND", label: "Industries", href: "/industries", note: "By sector served" },
  { code: "RES", label: "Resources", href: "/resources", note: "Guides & technical notes" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <HeroBackdrop />
      <div className="u-container relative grid gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        {/* Statement */}
        <div className="flex flex-col justify-center">
          <p className="hero-rise u-mono-label" style={{ "--d": "0ms" } as React.CSSProperties}>
            Industrial chemical supply · Nairobi, Kenya
          </p>
          <h1
            className="hero-rise mt-6 text-4xl leading-[1.03] sm:text-5xl lg:text-6xl"
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
            Source industrial chemicals with{" "}
            <span className="text-brand-700">technical precision</span>.
          </h1>
          <p
            className="hero-rise mt-6 max-w-xl text-lg leading-relaxed text-muted"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            Cuprichem Industrial Chemicals Ltd supplies manufacturers,
            institutions and laboratories across Kenya. Discover the chemistry
            you need, specify it to the right grade, and source it through a
            direct, transparent quote.
          </p>
          <div
            className="hero-rise mt-8 flex flex-wrap items-center gap-3"
            style={{ "--d": "240ms" } as React.CSSProperties}
          >
            <Button href="/request-a-quote" size="lg">
              Request a quote
            </Button>
            <Button href="/products" size="lg" variant="outline">
              Browse the catalogue
            </Button>
          </div>
          <p
            className="hero-rise mt-6 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-muted"
            style={{ "--d": "320ms" } as React.CSSProperties}
          >
            Discover → Specify → Source
          </p>
        </div>

        {/* Catalogue index ledger */}
        <div
          className="hero-rise lg:pl-6"
          style={{ "--d": "360ms" } as React.CSSProperties}
        >
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="u-mono-label">Catalogue index</span>
              <span className="font-mono text-[0.7rem] text-muted">/ 04</span>
            </div>
            <ul>
              {indexRows.map((row, i) => (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    className="group flex items-center gap-4 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-brand-050"
                  >
                    <span className="font-mono text-[0.72rem] tracking-[0.12em] text-brand-700">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[0.72rem] tracking-[0.12em] text-muted">
                      {row.code}
                    </span>
                    <span className="flex-1">
                      <span className="block font-display text-lg text-ink">
                        {row.label}
                      </span>
                      <span className="block text-sm text-muted">
                        {row.note}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="text-brand-700 transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 px-1 font-mono text-[0.7rem] leading-relaxed text-muted">
            The product catalogue is being populated with confirmed data.
            Request a quote for a specific chemical any time.
          </p>
        </div>
      </div>
    </section>
  );
}
