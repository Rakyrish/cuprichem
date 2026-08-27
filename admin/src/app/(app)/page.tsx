"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { CAP, useSession } from "@/lib/session";
import type { DashboardOverview, SeoHealth } from "@/types";
import {
  ButtonLink,
  ErrorState,
  SeoScore,
  cn,
} from "@/components/ui/primitives";

/**
 * Dashboard.
 *
 * Every figure on this page comes from `/dashboard/overview/` and
 * `/dashboard/seo-health/`, which are live aggregates over the database. There
 * are no constants here — an empty catalogue shows real zeroes.
 */

function Stat({
  label,
  value,
  href,
  tone = "neutral",
  hint,
  loading,
}: {
  label: string;
  value: number | undefined;
  href?: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
  hint?: string;
  loading?: boolean;
}) {
  const toneClass = {
    neutral: "text-ink",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
  }[tone];

  const body = (
    <>
      <p className="u-label">{label}</p>
      {loading ? (
        <span className="u-skeleton mt-2 block h-8 w-16" />
      ) : (
        <p className={cn("mt-1.5 text-3xl font-semibold tabular", toneClass)}>
          {value ?? 0}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );

  const className = cn(
    "u-card px-5 py-4 transition-colors",
    href && "hover:border-blue/50",
  );

  // Clicking a number must open the records it counts — never a dead tile.
  return href ? (
    <Link href={href} className={cn(className, "block")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default function DashboardPage() {
  const { can, user } = useSession();
  const overview = useApi<DashboardOverview>("/dashboard/overview/");
  const health = useApi<SeoHealth>("/dashboard/seo-health/");

  if (overview.error) {
    return (
      <ErrorState
        message="The dashboard could not load."
        detail={overview.error.message}
        onRetry={overview.reload}
      />
    );
  }

  const data = overview.data;
  const loading = overview.loading;
  const bands = health.data?.bands;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="u-label">Overview</p>
          <h1 className="mt-1.5 text-2xl font-semibold text-ink">
            {user?.full_name ? `Welcome, ${user.full_name.split(" ")[0]}` : "Dashboard"}
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
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

      {/* Catalogue */}
      <section aria-labelledby="catalogue-heading" className="mb-8">
        <h2 id="catalogue-heading" className="u-label mb-3">
          Catalogue
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Total products"
            value={data?.catalog.total}
            href="/products"
            loading={loading}
          />
          <Stat
            label="Published"
            value={data?.catalog.published}
            href="/products?status=published"
            tone="ok"
            loading={loading}
          />
          <Stat
            label="Awaiting review"
            value={data?.catalog.needs_review}
            href="/products?status=needs_review"
            tone={data?.catalog.needs_review ? "warn" : "neutral"}
            loading={loading}
          />
          <Stat
            label="Drafts"
            value={data?.catalog.draft}
            href="/products?status=draft"
            loading={loading}
          />
        </div>
      </section>

      {/* SEO health */}
      <section aria-labelledby="seo-heading" className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="seo-heading" className="u-label">
            Content / SEO quality
          </h2>
          <Link href="/seo" className="text-xs text-blue-ink hover:underline">
            Open SEO health →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Healthy"
            value={bands?.healthy}
            href="/seo"
            tone="ok"
            loading={health.loading}
          />
          <Stat
            label="Need improvement"
            value={bands?.needs_attention}
            href="/seo"
            tone="warn"
            loading={health.loading}
          />
          <Stat
            label="Critical"
            value={bands?.critical}
            href="/seo"
            tone="danger"
            loading={health.loading}
          />
          <Stat
            label="Indexable"
            value={data?.seo.indexable}
            hint="Published, verified and set to index"
            loading={loading}
          />
        </div>

        {/* Concrete defects, each linking to the affected records. */}
        <div className="u-card mt-3 divide-y divide-line">
          {[
            {
              label: "Missing meta description",
              value: data?.seo.missing_description,
              href: "/products?missing=meta_description",
            },
            {
              label: "Missing SEO title",
              value: data?.seo.missing_title,
              href: "/products?missing=seo_title",
            },
            {
              label: "Missing product image",
              value: data?.seo.missing_image,
              href: "/products?missing=image",
            },
            {
              label: "Not assigned to a category",
              value: data?.seo.missing_category,
              href: "/products?missing=category",
            },
          ].map((row) => (
            <Link
              key={row.label}
              href={row.href}
              className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-surface"
            >
              <span className="text-ink">{row.label}</span>
              <span
                className={cn(
                  "font-mono text-sm tabular",
                  row.value ? "text-warn" : "text-muted",
                )}
              >
                {loading ? "—" : (row.value ?? 0)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI activity */}
        {can(CAP.AI_GENERATE) && (
          <section aria-labelledby="ai-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="ai-heading" className="u-label">
                AI activity
              </h2>
              <Link
                href="/ai/history"
                className="text-xs text-blue-ink hover:underline"
              >
                History →
              </Link>
            </div>
            <div className="u-card divide-y divide-line">
              {[
                { label: "Generations run", value: data?.ai.total },
                { label: "Completed", value: data?.ai.completed },
                { label: "Failed", value: data?.ai.failed },
                {
                  label: "Awaiting review",
                  value: data?.ai.pending_review,
                  emphasis: true,
                },
                { label: "Tokens used", value: data?.ai.total_tokens },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <span className="text-muted">{row.label}</span>
                  <span
                    className={cn(
                      "font-mono tabular",
                      row.emphasis && row.value ? "text-warn" : "text-ink",
                    )}
                  >
                    {loading ? "—" : (row.value ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Worst-scoring products */}
        <section aria-labelledby="worst-heading">
          <h2 id="worst-heading" className="u-label mb-3">
            Lowest quality scores
          </h2>
          <div className="u-card divide-y divide-line">
            {health.loading && (
              <div className="px-5 py-4">
                <span className="u-skeleton block h-4 w-2/3" />
              </div>
            )}
            {!health.loading && (health.data?.worst.length ?? 0) === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted">
                No products need attention.
              </p>
            )}
            {health.data?.worst.slice(0, 6).map((row) => (
              <Link
                key={row.id}
                href={`/products/${row.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-surface"
              >
                <span className="truncate text-sm text-ink">{row.name}</span>
                <SeoScore score={row.seo_score} band={row.band} showBar={false} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
