"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { primaryCta, primaryNav } from "@/config/navigation";
import { cn } from "@/lib/cn";

/**
 * Off-canvas navigation for small screens. Keyboard- and Escape-friendly.
 * `light` renders the trigger for a transparent header sitting over hero
 * photography; the open panel is always solid paper.
 */
export function MobileNav({ light = false }: { light?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] border transition-colors",
          // While the panel is open it overlays a paper background, so the
          // trigger must go dark even when the header itself is transparent.
          light && !open
            ? "border-white/50 text-white"
            : "border-line-strong text-ink",
        )}
      >
        <span className="relative block h-3.5 w-5">
          <span
            className={cn(
              "absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform",
              open && "translate-y-[6px] rotate-45",
            )}
          />
          <span
            className={cn(
              "absolute left-0 top-[6px] h-0.5 w-5 bg-current transition-opacity",
              open && "opacity-0",
            )}
          />
          <span
            className={cn(
              "absolute left-0 top-[12px] h-0.5 w-5 bg-current transition-transform",
              open && "-translate-y-[6px] -rotate-45",
            )}
          />
        </span>
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="fixed inset-0 top-0 z-60 bg-paper"
        >
          <div className="u-container flex h-16 items-center justify-between border-b border-line">
            <span className="u-mono-label">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] border border-line-strong text-ink"
            >
              <span aria-hidden className="text-xl leading-none">
                &times;
              </span>
            </button>
          </div>
          <nav className="u-container flex flex-col py-4">
            {primaryNav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-baseline gap-3 border-b border-line py-4 text-2xl font-display text-ink"
              >
                <span className="u-mono-label w-8 shrink-0 pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </Link>
            ))}
            <Link
              href={primaryCta.href}
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-brand px-6 text-base font-medium text-white"
            >
              {primaryCta.label}
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
