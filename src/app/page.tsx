import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { CategoryAreas } from "@/components/sections/CategoryAreas";
import { SourcingProcess } from "@/components/sections/SourcingProcess";
import { CapabilityBand } from "@/components/sections/CapabilityBand";
import { WhyCuprichem } from "@/components/sections/WhyCuprichem";
import { IndustriesStrip } from "@/components/sections/IndustriesStrip";
import { QuoteCta } from "@/components/sections/QuoteCta";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Industrial chemical supplier in Nairobi, Kenya",
  description:
    "Cuprichem Industrial Chemicals Ltd supplies industrial chemicals to manufacturers, institutions and laboratories across Kenya. Discover, specify and source with a direct request for quote.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryAreas />
      <SourcingProcess />
      <CapabilityBand />
      <WhyCuprichem />
      <IndustriesStrip />
      <QuoteCta />
    </>
  );
}
