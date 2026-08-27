import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Primary conversion band — request a quote / contact sales. Kept flat and
 * brand-coloured (not photographic) so the page's final call reads as a plain
 * instruction rather than another image.
 */
export function QuoteCta() {
  const { contact, company } = siteConfig;

  return (
    <section className="relative bg-brand">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brand-bright" />
      <div className="u-container relative py-20 text-center md:py-24">
        <Reveal>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-white/70">
            Request for quote
          </p>
          <h2 className="mx-auto mt-6 max-w-3xl text-3xl text-white md:text-[2.6rem] md:leading-[1.08]">
            Tell us the chemical, grade and quantity — we&rsquo;ll handle the
            rest.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            Send a direct enquiry to our sales team and get availability,
            pricing and lead time for your requirement.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button href="/request-a-quote" size="lg" variant="onPhotoSolid">
              Request a quote
              <span aria-hidden>+</span>
            </Button>
            <Button href="/contact" size="lg" variant="onPhoto">
              Contact us
            </Button>
          </div>
          <p className="mt-8 font-mono text-[0.78rem] tracking-wide text-white/75">
            or email{" "}
            <a
              href={contact.salesEmailHref}
              className="underline underline-offset-4 hover:text-white"
            >
              {company.salesEmail}
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
