"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { CAP, useSession } from "@/lib/session";
import type { Category, Paginated, ProductListItem } from "@/types";
import {
  ButtonLink,
  EmptyState,
  ErrorState,
  OriginBadge,
  SeoScore,
  SkeletonRows,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";

const STATUSES = [
  "draft",
  "ai_generated",
  "needs_review",
  "approved",
  "published",
  "unpublished",
] as const;

const MISSING_FILTERS = [
  { value: "", label: "Any completeness" },
  { value: "meta_description", label: "Missing meta description" },
  { value: "seo_title", label: "Missing SEO title" },
  { value: "image", label: "Missing image" },
  { value: "category", label: "Missing category" },
];

function ProductsTable() {
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useSession();

  const [search, setSearch] = useState(params.get("search") ?? "");

  const query = {
    page: params.get("page") ?? 1,
    search: params.get("search") ?? "",
    status: params.get("status") ?? "",
    missing: params.get("missing") ?? "",
    ordering: params.get("ordering") ?? "-updated_at",
    page_size: 25,
  };

  const { data, error, loading, reload } = useApi<Paginated<ProductListItem>>(
    "/products/",
    query,
  );
  const categories = useApi<Paginated<Category>>("/categories/", { page_size: 100 });

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Any filter change invalidates the current page number.
    if (key !== "page") next.delete("page");
    router.push(`/products?${next.toString()}`);
  }

  if (error) {
    return (
      <ErrorState
        message="Products could not be loaded."
        detail={error.message}
        onRetry={reload}
      />
    );
  }

  const results = data?.results ?? [];
  const noFiltersApplied = !query.search && !query.status && !query.missing;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="u-label">Catalogue</p>
          <h1 className="mt-1.5 text-2xl font-semibold text-ink">Products</h1>
          {data && (
            <p className="mt-1 text-sm text-muted">
              {data.count} {data.count === 1 ? "product" : "products"}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {can(CAP.AI_GENERATE) && (
            <ButtonLink href="/ai/studio" variant="ai">
              Generate with AI
            </ButtonLink>
          )}
          {can(CAP.PRODUCT_EDIT) && (
            <ButtonLink href="/products/new" variant="primary">
              Add product
            </ButtonLink>
          )}
        </div>
      </header>

      {/* Filters — all applied server-side; the browser never holds the catalogue. */}
      <div className="u-card mb-4 flex flex-wrap items-center gap-3 p-3">
        <form
          className="min-w-[15rem] flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setParam("search", search);
          }}
        >
          <input
            type="search"
            className="u-input"
            placeholder="Search name, slug or CAS number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </form>

        <select
          className="u-input w-auto"
          value={query.status}
          onChange={(e) => setParam("status", e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          className="u-input w-auto"
          value={query.missing}
          onChange={(e) => setParam("missing", e.target.value)}
          aria-label="Filter by completeness"
        >
          {MISSING_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className="u-input w-auto"
          value={query.ordering}
          onChange={(e) => setParam("ordering", e.target.value)}
          aria-label="Sort"
        >
          <option value="-updated_at">Recently updated</option>
          <option value="name">Name A–Z</option>
          <option value="seo_score">Lowest SEO score</option>
          <option value="-seo_score">Highest SEO score</option>
          <option value="-created_at">Newest</option>
        </select>
      </div>

      {!loading && results.length === 0 ? (
        <EmptyState
          title={noFiltersApplied ? "No products yet." : "No products match these filters."}
          description={
            noFiltersApplied
              ? "Add your first product manually, or upload a product label and let the AI studio extract what it can."
              : "Try clearing the search box or choosing a different status."
          }
          action={
            noFiltersApplied && can(CAP.PRODUCT_EDIT) ? (
              <ButtonLink href="/products/new" variant="primary">
                Add product
              </ButtonLink>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="text-sm text-blue-ink hover:underline"
              >
                Clear filters
              </button>
            )
          }
        />
      ) : (
        <div className="u-card overflow-hidden">
          <div className="u-scroll overflow-x-auto">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["Product", "Category", "Status", "Origin", "SEO", "Updated"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-2.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows rows={8} cols={6} />
                ) : (
                  results.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-line last:border-b-0 transition-colors hover:bg-surface/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-[var(--radius-sm)] object-cover"
                            />
                          ) : (
                            <span
                              aria-label="No image"
                              title="No image"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-line-strong text-[0.6rem] text-faint"
                            >
                              —
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/products/${product.id}`}
                              className="block truncate font-medium text-ink hover:text-blue-ink"
                            >
                              {product.name}
                            </Link>
                            <span className="block truncate font-mono text-[0.68rem] text-muted">
                              /{product.slug}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {product.category_name || (
                          <span className="text-danger">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="px-4 py-3">
                        <OriginBadge origin={product.content_origin} />
                      </td>
                      <td className="px-4 py-3">
                        <SeoScore score={product.seo_score} band={product.seo_band} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[0.72rem] text-muted">
                        {new Date(product.updated_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3">
              <p className="text-xs text-muted">
                Page {data.page} of {data.pages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setParam("page", String(data.page - 1))}
                  className={cn(
                    "rounded-[var(--radius)] border border-line-strong px-3 py-1.5 text-xs",
                    data.page <= 1 ? "opacity-40" : "hover:border-blue",
                  )}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.pages}
                  onClick={() => setParam("page", String(data.page + 1))}
                  className={cn(
                    "rounded-[var(--radius)] border border-line-strong px-3 py-1.5 text-xs",
                    data.page >= data.pages ? "opacity-40" : "hover:border-blue",
                  )}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  // useSearchParams requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={<p className="u-label">Loading…</p>}>
      <ProductsTable />
    </Suspense>
  );
}
