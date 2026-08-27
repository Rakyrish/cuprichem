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
 *  2. The main navigation bar (sticky) with logo, links and the primary CTA.
 */
export function Header() {
  const { company, contact } = siteConfig;

  return (
    <header>
      {/* Utility strip — verified location + contact */}
      <div className="hidden bg-ink-strong text-on-dark md:block">
        <div className="u-container flex h-9 items-center justify-between">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-on-dark">
            Nairobi · {company.address.locality} · Kenya
          </span>
          <div className="flex items-center gap-5 font-mono text-[0.72rem] tracking-wide">
            <a href={contact.phoneHref} className="hover:text-accent-bright">
              {contact.phoneDisplay}
            </a>
            <span aria-hidden className="text-muted-on-dark">
              |
            </span>
            <a href={contact.salesEmailHref} className="hover:text-accent-bright">
              Sales enquiries
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
        <div className="u-container flex h-16 items-center justify-between gap-6">
          <Logo priority height={34} />

          <nav
            aria-label="Primary"
            className="hidden items-center gap-7 lg:flex"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink transition-colors hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/search"
              aria-label="Search the catalogue"
              className="hidden h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-line-strong text-ink transition-colors hover:border-brand hover:text-brand-700 sm:inline-flex"
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
            <Button href={primaryCta.href} className="hidden sm:inline-flex">
              {primaryCta.label}
            </Button>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}
