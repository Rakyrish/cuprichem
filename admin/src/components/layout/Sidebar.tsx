"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CAP, useSession } from "@/lib/session";
import { cn } from "@/components/ui/primitives";
import { appConfig } from "@/config/app";

/**
 * Primary navigation.
 *
 * Sections mirror the operator's mental model (catalogue → content → AI → SEO →
 * business → system) rather than the database layout. Items whose capability
 * the user lacks are hidden — Django still enforces access on every request,
 * so this only removes dead ends from the UI.
 */

interface NavItem {
  label: string;
  href: string;
  capability?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/" }],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Products", href: "/products", capability: CAP.PRODUCT_VIEW },
      { label: "Categories", href: "/categories", capability: CAP.PRODUCT_VIEW },
      { label: "Industries", href: "/industries", capability: CAP.PRODUCT_VIEW },
    ],
  },
  {
    title: "AI Studio",
    items: [
      { label: "Product Studio", href: "/ai/studio", capability: CAP.AI_GENERATE },
      { label: "Generation history", href: "/ai/history", capability: CAP.AI_GENERATE },
    ],
  },
  {
    title: "SEO",
    items: [
      { label: "SEO health", href: "/seo", capability: CAP.SEO_VIEW },
      { label: "Duplicates", href: "/seo/duplicates", capability: CAP.SEO_VIEW },
    ],
  },
  {
    title: "Business",
    items: [{ label: "Inquiries", href: "/inquiries", capability: CAP.INQUIRY_VIEW }],
  },
  {
    title: "Media",
    items: [{ label: "Media library", href: "/media", capability: CAP.MEDIA_VIEW }],
  },
  {
    title: "System",
    items: [
      { label: "Audit log", href: "/audit", capability: CAP.AUDIT_VIEW },
      { label: "Users", href: "/users", capability: CAP.USER_MANAGE },
      { label: "Settings", href: "/settings", capability: CAP.SETTINGS_MANAGE },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useSession();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Primary"
      className="u-scroll flex h-full flex-col overflow-y-auto bg-navy-deep"
    >
      <div className="flex h-[var(--topbar-h)] shrink-0 items-center gap-2.5 border-b border-navy-line px-5">
        <span aria-hidden className="h-2 w-2 rounded-full bg-lime" />
        <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-white">
          {appConfig.brandName}
        </span>
      </div>

      <div className="flex-1 px-3 py-4">
        {SECTIONS.map((section) => {
          const visible = section.items.filter(
            (item) => !item.capability || can(item.capability),
          );
          if (visible.length === 0) return null;

          return (
            <div key={section.title} className="mb-5">
              <p className="px-2 pb-1.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-on-dark/70">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex items-center rounded-[var(--radius)] px-3 py-2 text-[0.83rem] transition-colors",
                          active
                            ? "bg-navy text-white"
                            : "text-muted-on-dark hover:bg-navy/60 hover:text-white",
                        )}
                      >
                        {/* Lime marks the active location — the one place in
                            navigation where the accent colour is spent. */}
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r bg-lime"
                          />
                        )}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
