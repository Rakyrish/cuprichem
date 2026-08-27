import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = buildMetadata({
  title: "About Cuprichem Industrial Chemicals",
  description:
    "Cuprichem Industrial Chemicals Ltd is a registered industrial-chemical supplier based in Syokimau, Nairobi, serving manufacturers, institutions and laboratories across Kenya.",
  path: "/about",
});

export default function AboutPage() {
  const { company, legalName } = siteConfig;
  return (
    <>
      <Breadcrumbs trail={[{ name: "About", path: "/about" }]} />
      <PageHero
        kicker="About the company"
        title="A Nairobi-based industrial chemical supplier."
        intro={`${legalName} supplies industrial chemicals to manufacturers, institutions and laboratories across Kenya, with a focus on getting buyers the right chemistry, grade and packaging for their process.`}
      />

      <section className="u-container grid gap-12 py-16 lg:grid-cols-[1.3fr_1fr]">
        <div className="max-w-2xl">
          <h2 className="text-2xl">What we do</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Cuprichem sources and supplies industrial chemicals for a range of
            technical and industrial uses. Our approach is built around clear
            product information and a direct request-for-quote process, so
            procurement teams can specify exactly what they need and receive
            availability, pricing and lead time without unnecessary steps.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            The product catalogue on this site is being populated with confirmed
            products and specifications. In the meantime, you can enquire about
            any specific chemical directly with our sales team.
          </p>

          <h2 className="mt-12 text-2xl">How we work with buyers</h2>
          <ul className="mt-4 space-y-3 text-muted">
            <li className="border-l-2 border-brand pl-4">
              Discover chemistry by category and industry.
            </li>
            <li className="border-l-2 border-brand pl-4">
              Specify the grade, purity and packaging that suit your process.
            </li>
            <li className="border-l-2 border-brand pl-4">
              Source through a direct quote handled by our sales team.
            </li>
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/request-a-quote">Request a quote</Button>
            <Button href="/contact" variant="outline">
              Contact us
            </Button>
          </div>
        </div>

        {/* Verified company facts */}
        <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <h2 className="u-mono-label">Company details</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                Registered name
              </dt>
              <dd className="mt-1 text-ink">{legalName}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                Director
              </dt>
              <dd className="mt-1 text-ink">{company.director}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                KRA PIN
              </dt>
              <dd className="mt-1 font-mono text-ink">{company.kraPin}</dd>
            </div>
            <div>
              <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                Registered address
              </dt>
              <dd className="mt-1 not-italic leading-relaxed text-ink">
                {company.address.building}
                <br />
                {company.address.street}, {company.address.locality}
                <br />
                {company.address.region}, {company.address.country}
                <br />
                {company.address.poBox}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </>
  );
}
