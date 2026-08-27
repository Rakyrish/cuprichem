import Link from "next/link";
import { breadcrumbLd } from "@/lib/seo";
import { JsonLd } from "@/components/ui/JsonLd";

export type Crumb = { name: string; path: string };

/**
 * Breadcrumb trail + matching BreadcrumbList JSON-LD. Always starts at Home.
 * The last crumb is the current page (not a link).
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const full: Crumb[] = [{ name: "Home", path: "/" }, ...trail];
  return (
    <nav aria-label="Breadcrumb" className="u-container pt-8">
      <JsonLd data={breadcrumbLd(full)} />
      <ol className="flex flex-wrap items-center gap-2 font-mono text-[0.72rem] tracking-[0.08em] text-muted">
        {full.map((crumb, i) => {
          const isLast = i === full.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {isLast ? (
                <span aria-current="page" className="text-ink">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="hover:text-brand-700">
                  {crumb.name}
                </Link>
              )}
              {!isLast && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
