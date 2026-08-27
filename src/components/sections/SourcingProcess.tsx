import { SectionHeading } from "@/components/sections/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";

const steps = [
  {
    n: "01",
    title: "Discover",
    body: "Find chemistry by name, category or the industry you work in. Every product page is written to be understood by both buyers and technical staff.",
  },
  {
    n: "02",
    title: "Specify",
    body: "Confirm the grade, purity and packaging that fit your process. Where we hold documentation, specifications are shown against each product.",
  },
  {
    n: "03",
    title: "Source",
    body: "Send a direct request for quote. Our sales team responds with availability, pricing and lead time — no account or checkout required.",
  },
];

/** The platform's guiding concept, "Discover → Specify → Source", made concrete. */
export function SourcingProcess() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="u-container u-section">
        <SectionHeading
          index="02"
          kicker="How sourcing works"
          title="A procurement path built for technical buyers."
        />

        <Reveal as="ol" className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step) => (
            <li key={step.n} className="relative">
              {/* Logo blue, not the lime — the lime is only 1.9:1 on this
                  surface, and the step number carries meaning. */}
              <span className="block font-mono text-5xl font-medium leading-none text-accent">
                {step.n}
              </span>
              <h3 className="mt-6 text-2xl text-ink">{step.title}</h3>
              <span
                aria-hidden
                className="mt-4 block h-px w-10 bg-brand-bright"
              />
              <p className="mt-4 leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
