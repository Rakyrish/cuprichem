import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { primaryNav } from "@/config/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="u-container flex min-h-[60vh] flex-col justify-center py-24">
      <p className="u-mono-label">Error · 404</p>
      <h1 className="mt-4 max-w-2xl text-4xl md:text-6xl">
        We couldn&rsquo;t find that page.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        The page may have moved or never existed. Continue from one of the main
        sections below, or head back to the homepage.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/">Back to home</Button>
        <Button href="/products" variant="outline">
          Browse products
        </Button>
      </div>
      <nav aria-label="Site sections" className="mt-12 border-t border-line pt-6">
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
    </section>
  );
}
