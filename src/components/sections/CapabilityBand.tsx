import { IndustrialArt } from "@/components/sections/IndustrialArt";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";

/**
 * Full-width dark "plant" band — gives the page a premium industrial visual
 * using original illustration (no stock photography). Content is a neutral,
 * verifiable capability statement, not a facility or capacity claim.
 */
export function CapabilityBand() {
  return (
    <section className="relative overflow-hidden bg-ink-strong text-on-dark">
      {/* subtle brand wash */}
      <div
        aria-hidden
        className="pan-slow absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(50% 60% at 80% 30%, rgba(124,193,66,0.10), transparent 60%), radial-gradient(50% 60% at 15% 90%, rgba(76,151,214,0.12), transparent 60%)",
        }}
      />
      <div className="u-container relative grid items-center gap-10 py-16 md:py-20 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted-on-dark">
            Supply, specified
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl">
            From bulk storage to the drum at your door.
          </h2>
          <p className="mt-4 max-w-lg text-muted-on-dark">
            Cuprichem connects industrial buyers to the chemistry they need and
            supplies it in the grade and packaging that suit the job — confirmed
            per enquiry, with documentation where available.
          </p>
          <div className="mt-8">
            <Button href="/products" variant="accent">
              Explore the catalogue
            </Button>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <IndustrialArt className="h-auto w-full" />
        </Reveal>
      </div>
    </section>
  );
}
