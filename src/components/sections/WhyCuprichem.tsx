import { SectionHeading } from "@/components/sections/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Trust points. Every claim here is neutral and verifiable from the company
 * documentation (a registered Nairobi supplier, direct sales contact, technical
 * framing) — no fabricated statistics, certifications, awards or client logos.
 */
const points = [
  {
    title: "A registered Kenyan supplier",
    body: "Cuprichem Industrial Chemicals Ltd is a registered company based in Syokimau, Nairobi, with published contact details and KRA registration.",
  },
  {
    title: "Technical, not transactional",
    body: "Product information is structured around what buyers actually need to confirm — chemical identity, grade and packaging — rather than marketing copy.",
  },
  {
    title: "Direct quotes, not checkouts",
    body: "Sourcing runs through a direct request-for-quote to our sales team, so pricing and availability reflect your quantity and requirements.",
  },
  {
    title: "Serving industry across Kenya",
    body: "We supply manufacturers, institutions and laboratories — with the catalogue and documentation expanding as products are confirmed.",
  },
];

export function WhyCuprichem() {
  return (
    <section className="u-container py-20">
      <SectionHeading
        index="03"
        kicker="Why source through Cuprichem"
        title="Straightforward supply, backed by real information."
      />
      <Reveal className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-line bg-line md:grid-cols-2">
        {points.map((p) => (
          <div key={p.title} className="bg-paper p-8">
            <h3 className="text-lg text-ink">{p.title}</h3>
            <p className="mt-3 leading-relaxed text-muted">{p.body}</p>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
