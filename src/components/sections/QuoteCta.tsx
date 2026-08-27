import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";

/** Primary conversion band — request a quote / contact sales. */
export function QuoteCta() {
  const { contact, company } = siteConfig;
  return (
    <section className="u-container py-20">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-brand px-8 py-14 text-white md:px-14">
        {/* Bright-lime rule echoing the logo swoosh */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-brand-bright"
        />
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-white/70">
              Request for quote
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl md:text-4xl">
              Tell us the chemical, grade and quantity — we&rsquo;ll handle the
              rest.
            </h2>
            <p className="mt-4 max-w-xl text-white/85">
              Send a direct enquiry to our sales team and get availability,
              pricing and lead time for your requirement.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              href="/request-a-quote"
              size="lg"
              variant="accent"
              className="w-full"
            >
              Request a quote
            </Button>
            <a
              href={contact.salesEmailHref}
              className="text-center font-mono text-[0.78rem] tracking-wide text-white/80 hover:text-white"
            >
              or email {company.salesEmail}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
