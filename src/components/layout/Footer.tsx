import Link from "next/link";
import { siteConfig } from "@/config/site";
import { footerNav } from "@/config/navigation";
import { Logo } from "@/components/ui/Logo";

/** Site footer — carries the complete verified NAP block for consistency. */
export function Footer() {
  const { company, contact, legalName } = siteConfig;
  const { address } = company;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-ink-strong text-on-dark">
      <div className="u-container grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
        {/* Brand + address */}
        <div>
          <div className="inline-flex rounded-[var(--radius)] bg-paper px-3 py-2">
            <Logo height={30} />
          </div>
          <address className="mt-6 not-italic leading-relaxed text-muted-on-dark">
            {address.building}
            <br />
            {address.street}, {address.locality}
            <br />
            {address.region}, {address.country}
            <br />
            {address.poBox}
          </address>
          <dl className="mt-6 space-y-1 font-mono text-sm">
            {company.phones.map((p) => (
              <div key={p.href}>
                <a href={p.href} className="hover:text-accent-bright">
                  {p.display}
                </a>
              </div>
            ))}
            <div className="pt-2">
              <a href={contact.emailHref} className="hover:text-accent-bright">
                {company.email}
              </a>
            </div>
          </dl>
        </div>

        {/* Link groups */}
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted-on-dark">
              {group.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-on-dark transition-colors hover:text-accent-bright"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="u-container flex flex-col gap-2 py-6 text-sm text-muted-on-dark md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {legalName}. All rights reserved.
          </p>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.12em]">
            KRA PIN {company.kraPin} · Director {company.director}
          </p>
        </div>
      </div>
    </footer>
  );
}
