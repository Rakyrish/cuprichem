import { siteConfig } from "@/config/site";
import { FeatureBand } from "@/components/sections/FeatureBand";
import { photos } from "@/config/images";

/**
 * Trust points, laid out as a photo/copy band so the page keeps alternating
 * rather than stacking another grid.
 *
 * Every claim here is neutral and verifiable from the company documentation
 * (a registered Nairobi supplier, direct sales contact, technical framing) —
 * no fabricated statistics, certifications, awards or client logos.
 */
const { address } = siteConfig.company;

const points = [
  {
    title: `A registered ${address.country === "Kenya" ? "Kenyan" : address.country} supplier`,
    body: `${siteConfig.legalName} is a registered company based in ${address.locality}, ${address.region}, with published contact details and a sales team you can reach directly.`,
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
    title: `Serving industry across ${address.country}`,
    body: "We supply manufacturers, institutions and laboratories — with the catalogue and documentation expanding as products are confirmed.",
  },
];

export function WhyCuprichem() {
  return (
    <FeatureBand
      reverse
      kicker={`03 · Why source through ${siteConfig.name}`}
      title="Straightforward supply, backed by real information."
      photo={photos.coatingsStore}
      body={
        <p>
          We keep the buying path short and the product information honest —
          what we can confirm is published, and what is still being verified is
          marked as such.
        </p>
      }
      cta={{ label: "About the company", href: "/about" }}
    >
      <ul className="mt-10 space-y-6">
        {points.map((p) => (
          <li key={p.title} className="border-l-2 border-brand-bright pl-5">
            <h3 className="text-lg text-ink">{p.title}</h3>
            <p className="mt-1.5 leading-relaxed text-muted">{p.body}</p>
          </li>
        ))}
      </ul>
    </FeatureBand>
  );
}
