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
      <div className="u-container py-20">
        <SectionHeading
          index="02"
          kicker="How sourcing works"
          title="A procurement path built for technical buyers."
        />
        <Reveal as="ol" className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.n}
              className="relative border-t-2 border-brand pt-6"
            >
              <span className="font-mono text-sm font-medium tracking-[0.14em] text-brand-700">
                {step.n}
              </span>
              <h3 className="mt-3 text-2xl text-ink">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
