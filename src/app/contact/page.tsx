import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = buildMetadata({
  title: "Contact Cuprichem — Syokimau, Nairobi",
  description:
    "Contact Cuprichem Industrial Chemicals Ltd in Syokimau, Nairobi. Phone, email and registered address for sales enquiries and industrial chemical supply across Kenya.",
  path: "/contact",
});

export default function ContactPage() {
  const { company, contact } = siteConfig;
  return (
    <>
      <Breadcrumbs trail={[{ name: "Contact", path: "/contact" }]} />
      <PageHero
        kicker="Contact"
        title="Talk to our sales team."
        intro="Reach us by phone or email, or send a request for quote with your requirement. We are based in Syokimau, Nairobi."
      />

      <section className="u-container grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line md:grid-cols-3 my-16">
        <div className="bg-paper p-8">
          <h2 className="u-mono-label">Phone</h2>
          <ul className="mt-4 space-y-2">
            {company.phones.map((p) => (
              <li key={p.href}>
                <a
                  href={p.href}
                  className="font-mono text-lg text-ink hover:text-brand-700"
                >
                  {p.display}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-paper p-8">
          <h2 className="u-mono-label">Email</h2>
          <ul className="mt-4 space-y-3 break-words">
            <li>
              <a
                href={contact.emailHref}
                className="text-ink hover:text-brand-700"
              >
                {company.email}
              </a>
              <span className="mt-1 block text-sm text-muted">General</span>
            </li>
            <li>
              <a
                href={contact.salesEmailHref}
                className="text-ink hover:text-brand-700"
              >
                {company.salesEmail}
              </a>
              <span className="mt-1 block text-sm text-muted">Sales</span>
            </li>
          </ul>
        </div>
        <div className="bg-paper p-8">
          <h2 className="u-mono-label">Registered address</h2>
          <address className="mt-4 not-italic leading-relaxed text-ink">
            {company.address.building}
            <br />
            {company.address.street}, {company.address.locality}
            <br />
            {company.address.region}, {company.address.country}
            <br />
            {company.address.poBox}
          </address>
        </div>
      </section>

      <section className="u-container pb-8">
        <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 md:p-10">
          <h2 className="text-2xl">Have a specific chemical in mind?</h2>
          <p className="mt-3 max-w-xl text-muted">
            Send the chemical name, grade and quantity you need and our team will
            respond with availability, pricing and lead time.
          </p>
          <div className="mt-6">
            <Button href="/request-a-quote" size="lg">
              Request a quote
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
