/**
 * Resource articles — Phase 1 typed data.
 *
 * Content integrity: every article must provide genuine value and contain no
 * fabricated chemistry. The single published article below is about Cuprichem's
 * OWN sourcing/quote process — factual and useful, not invented product data —
 * so the article system (listing, detail, Article JSON-LD, sitemap) can ship
 * honestly. Chemical explainer/guide articles will be added only when their
 * facts can be verified.
 */

import { siteConfig } from "@/config/site";
import type { Article } from "@/types/content";

export const articles: Article[] = [
  {
    slug: "how-to-request-a-chemical-quote",
    title: "How to request an industrial chemical quote in Kenya",
    summary:
      "What to include in a request for quote so a chemical supplier can respond quickly and accurately — from chemical identity to packaging and delivery.",
    datePublished: "2026-08-24",
    dateModified: "2026-08-24",
    status: "published",
    verified: true,
    relatedCategories: ["water-treatment-chemicals", "industrial-cleaning-chemicals"],
    body: [
      {
        type: "paragraph",
        text: "Sourcing industrial chemicals is a technical purchase. A clear request for quote (RFQ) helps a supplier respond with accurate availability, pricing and lead time on the first reply — and avoids the back-and-forth that slows procurement down. This guide covers the details worth including.",
      },
      { type: "heading", text: "1. Identify the chemical clearly" },
      {
        type: "paragraph",
        text: "Chemicals are often known by several names. Giving the specific name — and a CAS number if you have one — removes ambiguity between similar products.",
      },
      {
        type: "list",
        items: [
          "The chemical name you use internally, plus any synonyms.",
          "The CAS number, if it is on your specification or safety data sheet.",
          "The grade or purity your process requires (for example technical, food or laboratory grade).",
        ],
      },
      { type: "heading", text: "2. State quantity and packaging" },
      {
        type: "paragraph",
        text: "Quantity and packaging drive both price and availability. Be specific about the volume you need and how you would prefer it supplied.",
      },
      {
        type: "list",
        items: [
          "The quantity per order and how often you expect to reorder.",
          "Preferred packaging — for example drums, jerricans, bags or bulk.",
          "Any handling or storage constraints at your site.",
        ],
      },
      { type: "heading", text: "3. Give context for the application" },
      {
        type: "paragraph",
        text: "Telling the supplier what the chemical is for helps them confirm the right grade and flag anything you should know about handling or documentation such as a safety data sheet.",
      },
      { type: "heading", text: "4. Include delivery and contact details" },
      {
        type: "paragraph",
        text: "Finally, add your delivery location and the best way to reach you. With that, a supplier can quote landed pricing and a realistic lead time.",
      },
      {
        type: "paragraph",
        text: `${siteConfig.name} handles sourcing through a direct request for quote rather than an online checkout, so every response reflects your specific quantity and requirements.`,
      },
    ],
  },
];
