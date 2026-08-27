"use client";

import type { Product, SeoIssue } from "@/types";
import { CharCount, Field, cn } from "@/components/ui/primitives";
import { appConfig } from "@/config/app";

/**
 * SEO editor.
 *
 * Two things this screen must never do: imply the preview is what Google will
 * actually render, or present the score as a ranking prediction. Both are
 * labelled explicitly.
 */

const TITLE = { min: 20, ideal: 60, max: 70 };
const DESC = { min: 70, ideal: 160, max: 180 };

const SEVERITY_STYLE = {
  critical: "border-danger/30 bg-danger-tint",
  warning: "border-warn/30 bg-warn-tint",
  info: "border-blue/25 bg-blue-tint",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical",
  warning: "Warning",
  info: "Suggestion",
} as const;

export function SearchPreview({
  title,
  description,
  path,
  siteUrl = appConfig.siteHost,
}: {
  title: string;
  description: string;
  path: string;
  siteUrl?: string;
}) {
  const shownTitle = title || "Untitled page";
  const shownDescription =
    description ||
    "No meta description set — search engines will excerpt arbitrary page text.";

  return (
    <div className="rounded-[var(--radius)] border border-line bg-paper p-4">
      <p className="u-label mb-3">Search preview</p>
      <div className="max-w-xl">
        <p className="text-[0.72rem] text-muted">
          {siteUrl}
          <span className="text-faint">{path}</span>
        </p>
        <p className="mt-0.5 truncate text-[1.05rem] leading-snug text-serp-title">
          {shownTitle}
        </p>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-[0.82rem] leading-relaxed",
            description ? "text-serp-text" : "italic text-faint",
          )}
        >
          {shownDescription}
        </p>
      </div>
      <p className="mt-3 text-[0.68rem] text-faint">
        A simulation for length and tone only. Search engines rewrite titles and
        descriptions at their discretion; this is not what will necessarily appear.
      </p>
    </div>
  );
}

export function SeoIssues({ issues }: { issues: SeoIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-ok/30 bg-ok-tint px-4 py-3 text-sm text-ink">
        No SEO issues detected on this record.
      </div>
    );
  }

  // Critical first — that is the order they must be resolved in.
  const order = { critical: 0, warning: 1, info: 2 } as const;
  const sorted = [...issues].sort(
    (a, b) => order[a.severity] - order[b.severity],
  );

  return (
    <ul className="space-y-2">
      {sorted.map((issue) => (
        <li
          key={issue.code + issue.field}
          className={cn(
            "rounded-[var(--radius)] border px-4 py-3",
            SEVERITY_STYLE[issue.severity],
          )}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
              {SEVERITY_LABEL[issue.severity]}
            </span>
            <p className="text-sm leading-relaxed text-ink">{issue.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SeoEditor({
  draft,
  onChange,
}: {
  draft: Product;
  onChange: (patch: Partial<Product>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="u-card space-y-5 p-5">
        <Field
          label="SEO title"
          htmlFor="seo_title"
          hint={`Aim for ${TITLE.min}–${TITLE.ideal} characters. Longer titles are truncated in results.`}
          trailing={<CharCount value={draft.seo_title} {...TITLE} />}
        >
          <input
            id="seo_title"
            className="u-input"
            value={draft.seo_title}
            onChange={(e) => onChange({ seo_title: e.target.value })}
          />
        </Field>

        <Field
          label="Meta description"
          htmlFor="meta_description"
          hint={`Aim for ${DESC.min}–${DESC.ideal} characters. Describe the page honestly; this is not ad copy.`}
          trailing={<CharCount value={draft.meta_description} {...DESC} />}
        >
          <textarea
            id="meta_description"
            rows={3}
            className="u-input resize-y"
            value={draft.meta_description}
            onChange={(e) => onChange({ meta_description: e.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="URL slug"
            htmlFor="slug"
            hint="Changing this changes the public URL."
          >
            <input
              id="slug"
              className="u-input u-mono-input"
              value={draft.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
            />
          </Field>

          <Field
            label="Primary keyword"
            htmlFor="primary_keyword"
            hint="The dominant search term this page targets."
          >
            <input
              id="primary_keyword"
              className="u-input"
              value={draft.primary_keyword}
              onChange={(e) => onChange({ primary_keyword: e.target.value })}
            />
          </Field>
        </div>

        <Field
          label="Canonical URL"
          htmlFor="canonical_url"
          hint="Leave blank to use this page's own URL."
        >
          <input
            id="canonical_url"
            className="u-input u-mono-input"
            placeholder="(derived automatically)"
            value={draft.canonical_url}
            onChange={(e) => onChange({ canonical_url: e.target.value })}
          />
        </Field>

        <div className="flex flex-wrap gap-6 border-t border-line pt-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.robots_index}
              onChange={(e) => onChange({ robots_index: e.target.checked })}
            />
            Allow indexing
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={draft.robots_follow}
              onChange={(e) => onChange({ robots_follow: e.target.checked })}
            />
            Follow links
          </label>
        </div>

        {!draft.robots_index && draft.is_public && (
          <p className="rounded-[var(--radius)] border border-danger/30 bg-danger-tint px-4 py-3 text-sm text-ink">
            This product is published but set to noindex, so it will not appear
            in search results. Enable indexing, or unpublish it.
          </p>
        )}
      </div>

      <SearchPreview
        title={draft.seo_title}
        description={draft.meta_description}
        path={`/products/${draft.slug}`}
      />

      <div>
        <p className="u-label mb-3">
          Content / SEO quality — {draft.seo_score}/100
        </p>
        <p className="mb-3 text-xs text-muted">
          A deterministic checklist of on-page completeness. It is not a
          prediction of search ranking.
        </p>
        <SeoIssues issues={draft.seo_issues ?? []} />
      </div>
    </div>
  );
}
