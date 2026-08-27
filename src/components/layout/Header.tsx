import Link from "next/link";
import { siteConfig } from "@/config/site";
import { primaryCta, primaryNav } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "@/components/layout/MobileNav";

/**
 * Site header. Two rows:
 *  1. A dark monospace utility strip carrying verified NAP (location + phone) —
 *     reinforces local relevance and keeps contact one glance away.
 *  2. The main navigation bar, in the deep logo blue.
 *
 * The bar is opaque at every scroll position — it never rides transparent over
 * the hero. That keeps the navigation legible regardless of what photograph a
 * page opens with, and means this can stay a server component: there is no
 * scroll state to track, so no client JS ships for the header itself.
 *
 * The WHOLE header is the sticky element, not the bar inside it. A sticky child
 * can only travel within its parent's box, so pinning the inner bar would let
 * it scroll away with <header>. Sticking the header at a NEGATIVE offset equal
 * to the utility strip's height lets the strip slide out of view while the main
 * bar comes to rest at the top. The strip is hidden below `md`, so that offset
 * only applies from that breakpoint up.
 */
export function Header() {
  const { company, contact } = siteConfig;

  return (
    <header className="sticky top-0 z-50 md:top-[-2.25rem]">
      {/* Utility strip — verified location + contact */}
      <div className="hidden bg-header-strip text-on-dark md:block">
        <div className="u-container flex h-9 items-center justify-between">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-on-dark">
            Nairobi · {company.address.locality} · Kenya
          </span>
          <div className="flex items-center gap-5 font-mono text-[0.72rem] tracking-wide">
            <a href={contact.phoneHref} className="hover:text-brand-bright">
              {contact.phoneDisplay}
            </a>
            <span aria-hidden className="text-muted-on-dark">
              |
            </span>
            <a href={contact.salesEmailHref} className="hover:text-brand-bright">
              Sales enquiries
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div
        className="u-header-solid relative shadow-[0_2px_28px_rgba(7,32,52,0.28)]"
        style={{ height: "var(--header-h)" }}
      >
        {/* Lime hairline echoing the logo swoosh. */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-bright"
        />

        <div className="u-container flex h-full items-center justify-between gap-6">
          {/* The logo keeps a white plaque — its blue wordmark and dark
              subtitle have no contrast on the navy bar. */}
          <span className="inline-flex rounded-[var(--radius)] bg-white/95 px-3 py-1.5">
            <Logo priority height={32} />
          </span>

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-sm font-medium text-white/90 transition-colors hover:text-white
                  after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:w-0 after:bg-brand-bright
                  after:transition-all after:duration-300 hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/search"
              aria-label="Search the catalogue"
              className="hidden h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] border border-white/50 text-white transition-colors hover:border-brand-bright hover:text-brand-bright sm:inline-flex"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m20 20-3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </Link>

            {/* Visibility is handled by a wrapper, not by passing `hidden` to
                Button: `cn` is a plain joiner, so a `hidden` in className does
                not beat the `inline-flex` in Button's own base classes — both
                land in the markup and CSS source order decides. */}
            <span className="hidden sm:block">
              <Button href={primaryCta.href} variant="lime">
                {primaryCta.label}
              </Button>
            </span>

            <MobileNav light />
          </div>
        </div>
      </div>
    </header>
  );
}
