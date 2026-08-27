import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/layout/PageHero";
import { photos } from "@/config/images";
import { primaryNav } from "@/config/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <PageHero
        photo={photos.drumStoreWide}
        kicker="Error · 404"
        title="We couldn't find that page."
        intro="The page may have moved or never existed. Continue from one of the main sections below, or head back to the homepage."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/" size="lg" variant="onPhotoSolid">
            Back to home
          </Button>
          <Button href="/products" size="lg" variant="onPhoto">
            Browse products
          </Button>
        </div>
      </PageHero>

      <nav aria-label="Site sections" className="u-container py-16">
        <ul className="flex flex-wrap gap-x-8 gap-y-3">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-brand-700 hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
