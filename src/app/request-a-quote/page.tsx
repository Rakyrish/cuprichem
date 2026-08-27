import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { photos } from "@/config/images";
import { RequestQuoteForm } from "@/components/forms/RequestQuoteForm";

export const metadata: Metadata = buildMetadata({
  title: "Request a quote for industrial chemicals",
  description: `Request a quote from ${siteConfig.legalName}. Send the chemical, grade and quantity you need and our ${siteConfig.company.address.region} sales team responds with availability, pricing and lead time.`,
  path: "/request-a-quote",
});

export default async function RequestQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { company, contact } = siteConfig;
  const { product } = await searchParams;
  const defaultProduct = typeof product === "string" ? product.slice(0, 150) : "";
  return (
    <>
      <PageHero
        trail={[{ name: "Request a quote", path: "/request-a-quote" }]}
        photo={photos.drumsStacked}
        kicker="Request for quote"
        title="Request a quote."
        intro="Tell us what you need and our sales team will respond with availability, pricing and lead time. No account or checkout required."
      />

      <section className="u-container grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <RequestQuoteForm defaultProduct={defaultProduct} />
        </div>

        <aside className="h-fit rounded-[var(--radius-lg)] border border-line bg-surface p-6">
          <h2 className="u-mono-label">Prefer to reach us directly?</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                Sales email
              </dt>
              <dd className="mt-1 break-words">
                <a href={contact.salesEmailHref} className="text-ink hover:text-brand-700">
                  {company.salesEmail}
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                Phone
              </dt>
              <dd className="mt-1 space-y-1">
                {company.phones.map((p) => (
                  <a
                    key={p.href}
                    href={p.href}
                    className="block font-mono text-ink hover:text-brand-700"
                  >
                    {p.display}
                  </a>
                ))}
              </dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-medium text-ink">
              Helpful details to include
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>· Chemical name (and grade/purity if known)</li>
              <li>· Quantity and packaging preference</li>
              <li>· Intended application or industry</li>
              <li>· Delivery location</li>
            </ul>
          </div>
        </aside>
      </section>
    </>
  );
}
