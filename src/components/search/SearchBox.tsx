"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchDoc } from "@/lib/content";

/**
 * Client-side catalogue search. The index is built server-side and passed in,
 * so there is no network round-trip and no client data fetching. Matches on
 * product/category name, synonyms and category.
 */
export function SearchBox({ docs }: { docs: SearchDoc[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    return docs
      .filter((d) => d.terms.includes(q))
      .sort((a, b) => {
        // Prefer name-prefix matches, then products before categories.
        const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.type === b.type ? 0 : a.type === "product" ? -1 : 1;
      })
      .slice(0, 12);
  }, [docs, q]);

  return (
    <div className="max-w-2xl">
      <label htmlFor="catalogue-search" className="sr-only">
        Search the catalogue
      </label>
      <div className="flex items-center gap-3 rounded-[var(--radius)] border border-line-strong bg-paper px-4 focus-within:border-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" className="text-muted" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted" />
        </svg>
        <input
          id="catalogue-search"
          type="search"
          autoComplete="off"
          placeholder="Search by chemical name or category…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 w-full bg-transparent text-ink outline-none placeholder:text-muted/70"
        />
      </div>

      <div className="mt-6" aria-live="polite">
        {q.length >= 2 && results.length === 0 && (
          <div className="rounded-[var(--radius)] border border-line bg-surface p-5">
            <p className="text-ink">No matches for “{query}”.</p>
            <p className="mt-2 text-sm text-muted">
              We may still be able to supply it —{" "}
              <Link href="/request-a-quote" className="text-brand-700 hover:underline">
                request a quote
              </Link>{" "}
              with the chemical name.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line">
            {results.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="flex items-center justify-between gap-4 bg-paper px-4 py-3 transition-colors hover:bg-surface"
                >
                  <span>
                    <span className="block text-ink">{r.name}</span>
                    <span className="block font-mono text-[0.72rem] uppercase tracking-wide text-muted">
                      {r.type === "product" ? r.category ?? "Product" : "Category"}
                    </span>
                  </span>
                  <span aria-hidden className="text-brand-700">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
