"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { CAP, useSession } from "@/lib/session";
import { useToast } from "@/components/ui/Toast";
import type { Category, Industry, Paginated, Product } from "@/types";
import { SeoEditor } from "@/components/product/SeoEditor";
import { AiAssistant } from "@/components/product/AiAssistant";
import {
  Button,
  ConfidenceBadge,
  ErrorState,
  Field,
  OriginBadge,
  SeoScore,
  StatusBadge,
  cn,
} from "@/components/ui/primitives";
import { appConfig } from "@/config/app";

const TABS = ["Overview", "Technical", "SEO", "AI assistant"] as const;
type Tab = (typeof TABS)[number];

const TECHNICAL_FIELDS: { key: keyof Product; label: string; mono?: boolean }[] = [
  { key: "cas_number", label: "CAS number", mono: true },
  { key: "formula", label: "Formula", mono: true },
  { key: "molecular_weight", label: "Molecular weight", mono: true },
  { key: "grade", label: "Grade" },
  { key: "purity", label: "Purity" },
  { key: "appearance", label: "Appearance" },
  { key: "manufacturer", label: "Manufacturer" },
];

export default function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const toast = useToast();
  const { can } = useSession();

  const { data, error, loading, reload, setData } = useApi<Product>(
    `/products/${id}/`,
  );
  const categories = useApi<Paginated<Category>>("/categories/", { page_size: 100 });
  const industries = useApi<Paginated<Industry>>("/industries/", { page_size: 100 });

  const [draft, setDraft] = useState<Product | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [saving, setSaving] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const dirty = useMemo(
    () => Boolean(draft && data && JSON.stringify(draft) !== JSON.stringify(data)),
    [draft, data],
  );

  // Guard against losing edits to an accidental navigation or refresh.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (error) {
    return (
      <ErrorState
        message="This product could not be loaded."
        detail={error.message}
        onRetry={reload}
      />
    );
  }
  if (loading || !draft) {
    return <p className="u-label">Loading product…</p>;
  }

  const patch = (changes: Partial<Product>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  async function save(): Promise<Product | null> {
    if (!draft) return null;
    setSaving(true);
    setFieldErrors({});
    try {
      const saved = await api.patch<Product>(`/products/${id}/`, {
        name: draft.name,
        slug: draft.slug,
        synonyms: draft.synonyms,
        category: draft.category,
        industries: draft.industries,
        short_description: draft.short_description,
        description: draft.description,
        procurement_notes: draft.procurement_notes,
        cas_number: draft.cas_number,
        formula: draft.formula,
        molecular_weight: draft.molecular_weight,
        grade: draft.grade,
        purity: draft.purity,
        appearance: draft.appearance,
        packaging: draft.packaging,
        manufacturer: draft.manufacturer,
        verified_fields: draft.verified_fields,
        verified: draft.verified,
        seo_title: draft.seo_title,
        meta_description: draft.meta_description,
        canonical_url: draft.canonical_url,
        robots_index: draft.robots_index,
        robots_follow: draft.robots_follow,
        primary_keyword: draft.primary_keyword,
        secondary_keywords: draft.secondary_keywords,
      });
      setData(saved);
      setDraft(saved);
      toast.success("Product saved.");
      return saved;
    } catch (caught) {
      if (caught instanceof ApiError) {
        setFieldErrors(caught.fieldErrors);
        toast.error("Could not save.", caught.message);
      }
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    const saved = dirty ? await save() : draft;
    if (!saved) return;
    setBlockers([]);
    try {
      const published = await api.post<Product>(`/products/${id}/publish/`);
      setData(published);
      setDraft(published);
      toast.success("Product published.", `Live at ${published.public_path}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setBlockers(caught.blockers);
        toast.error(
          "Not published.",
          caught.blockers.length
            ? "Resolve the listed items first."
            : caught.message,
        );
      }
    }
  }

  async function unpublish() {
    try {
      const result = await api.post<Product>(`/products/${id}/unpublish/`, {
        mode: "410",
        reason: "Withdrawn from the catalogue by an administrator.",
      });
      setData(result);
      setDraft(result);
      toast.success("Product unpublished.", "The URL now returns 410 Gone.");
    } catch (caught) {
      if (caught instanceof ApiError) toast.error("Could not unpublish.", caught.message);
    }
  }

  function toggleVerifiedField(field: string) {
    const current = new Set(draft!.verified_fields ?? []);
    if (current.has(field)) current.delete(field);
    else current.add(field);
    patch({ verified_fields: [...current] });
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6">
        <Link href="/products" className="text-xs text-blue-ink hover:underline">
          ← Products
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-ink">{draft.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={draft.status} />
              <OriginBadge origin={draft.content_origin} />
              <SeoScore score={draft.seo_score} band={draft.seo_band} />
              <span className="font-mono text-[0.7rem] text-muted">
                {draft.public_path}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="secondary"
              onClick={() => void save()}
              disabled={!dirty || saving}
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
            {can(CAP.PRODUCT_PUBLISH) &&
              (draft.status === "published" ? (
                <Button variant="ghost" onClick={() => void unpublish()}>
                  Unpublish
                </Button>
              ) : (
                <Button variant="primary" onClick={() => void publish()}>
                  Publish
                </Button>
              ))}
          </div>
        </div>
      </header>

      {blockers.length > 0 && (
        <div className="u-card mb-5 border-danger/30 bg-danger-tint p-5">
          <p className="text-sm font-medium text-ink">
            This product cannot be published yet
          </p>
          <ul className="mt-3 space-y-1.5">
            {blockers.map((blocker) => (
              <li key={blocker} className="text-sm leading-relaxed text-ink">
                • {blocker}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <div
            role="tablist"
            className="mb-5 flex gap-1 border-b border-line"
            aria-label="Product sections"
          >
            {TABS.map((name) => (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={tab === name}
                onClick={() => setTab(name)}
                className={cn(
                  "-mb-px border-b-2 px-3.5 py-2.5 text-sm transition-colors",
                  tab === name
                    ? "border-lime font-medium text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {name}
              </button>
            ))}
          </div>

          {tab === "Overview" && (
            <div className="u-card space-y-5 p-5">
              <Field label="Product name" htmlFor="name" error={fieldErrors.name}>
                <input
                  id="name"
                  className="u-input"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </Field>

              <Field
                label="Synonyms"
                htmlFor="synonyms"
                hint="Comma separated. Real, verified alternatives only."
              >
                <input
                  id="synonyms"
                  className="u-input"
                  value={draft.synonyms.join(", ")}
                  onChange={(e) =>
                    patch({
                      synonyms: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="category" error={fieldErrors.category}>
                  <select
                    id="category"
                    className="u-input"
                    value={draft.category ?? ""}
                    onChange={(e) =>
                      patch({ category: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">— Unassigned —</option>
                    {categories.data?.results.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Industries"
                  hint="Ctrl/Cmd-click to select more than one."
                >
                  <select
                    multiple
                    size={4}
                    className="u-input"
                    value={draft.industries.map(String)}
                    onChange={(e) =>
                      patch({
                        industries: [...e.target.selectedOptions].map((o) =>
                          Number(o.value),
                        ),
                      })
                    }
                  >
                    {industries.data?.results.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field
                label="Short description"
                htmlFor="short_description"
                hint="Used on cards, listings and as a meta fallback."
              >
                <textarea
                  id="short_description"
                  rows={2}
                  className="u-input resize-y"
                  value={draft.short_description}
                  onChange={(e) => patch({ short_description: e.target.value })}
                />
              </Field>

              <Field
                label="Full description"
                htmlFor="description"
                hint="What the product is and its confirmed applications. Never state stock, price or certification unless confirmed."
              >
                <textarea
                  id="description"
                  rows={10}
                  className="u-input resize-y leading-relaxed"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>

              <Field label="Procurement notes" htmlFor="procurement_notes">
                <textarea
                  id="procurement_notes"
                  rows={3}
                  className="u-input resize-y"
                  value={draft.procurement_notes}
                  onChange={(e) => patch({ procurement_notes: e.target.value })}
                />
              </Field>
            </div>
          )}

          {tab === "Technical" && (
            <div className="u-card p-5">
              <p className="mb-1 text-sm text-ink">Technical identity</p>
              <p className="mb-5 text-xs text-muted">
                Tick <strong>Verified</strong> once you have confirmed a value against
                supplier documentation. Verified fields are locked — AI can propose a
                change but can never overwrite them.
              </p>

              <div className="space-y-4">
                {TECHNICAL_FIELDS.map(({ key, label, mono }) => {
                  const name = key as string;
                  const isVerified = (draft.verified_fields ?? []).includes(name);
                  const confidence = draft.field_confidence?.[name];
                  return (
                    <Field
                      key={name}
                      label={label}
                      htmlFor={name}
                      trailing={
                        <div className="flex items-center gap-2">
                          {confidence && !isVerified && (
                            <ConfidenceBadge level={confidence} />
                          )}
                          <label className="flex items-center gap-1.5 text-[0.7rem] text-muted">
                            <input
                              type="checkbox"
                              checked={isVerified}
                              onChange={() => toggleVerifiedField(name)}
                            />
                            Verified
                          </label>
                        </div>
                      }
                    >
                      <input
                        id={name}
                        className={cn("u-input", mono && "u-mono-input")}
                        value={(draft[key] as string) ?? ""}
                        onChange={(e) => patch({ [key]: e.target.value } as Partial<Product>)}
                      />
                    </Field>
                  );
                })}

                <Field
                  label="Packaging"
                  htmlFor="packaging"
                  hint="Comma separated, e.g. 25 L jerrican, 200 L drum."
                  trailing={
                    <label className="flex items-center gap-1.5 text-[0.7rem] text-muted">
                      <input
                        type="checkbox"
                        checked={(draft.verified_fields ?? []).includes("packaging")}
                        onChange={() => toggleVerifiedField("packaging")}
                      />
                      Verified
                    </label>
                  }
                >
                  <input
                    id="packaging"
                    className="u-input"
                    value={draft.packaging.join(", ")}
                    onChange={(e) =>
                      patch({
                        packaging: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          )}

          {tab === "SEO" && <SeoEditor draft={draft} onChange={patch} />}

          {tab === "AI assistant" &&
            (can(CAP.AI_GENERATE) ? (
              <AiAssistant
                product={draft}
                onProductUpdated={(updated) => {
                  setData(updated);
                  setDraft(updated);
                }}
              />
            ) : (
              <div className="u-card p-6 text-sm text-muted">
                You do not have permission to run AI generation.
              </div>
            ))}
        </div>

        {/* Publishing rail */}
        <aside className="space-y-4">
          <div className="u-card p-4">
            <p className="u-label mb-3">Publishing</p>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Status</dt>
                <dd>
                  <StatusBadge status={draft.status} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Public</dt>
                <dd className={draft.is_public ? "text-ok" : "text-muted"}>
                  {draft.is_public ? "Live" : "Not live"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Indexable</dt>
                <dd className={draft.robots_index ? "text-ok" : "text-warn"}>
                  {draft.robots_index ? "Yes" : "noindex"}
                </dd>
              </div>
            </dl>

            <label className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.verified}
                onChange={(e) => patch({ verified: e.target.checked })}
              />
              <span>
                Verified record
                <span className="mt-0.5 block text-xs text-muted">
                  Required to publish. Only confirmed information goes live.
                </span>
              </span>
            </label>
          </div>

          <div className="u-card p-4">
            <p className="u-label mb-3">Quality</p>
            <SeoScore score={draft.seo_score} band={draft.seo_band} />
            <p className="mt-3 text-xs text-muted">
              {(draft.seo_issues ?? []).length} open issue
              {(draft.seo_issues ?? []).length === 1 ? "" : "s"}.{" "}
              <button
                type="button"
                onClick={() => setTab("SEO")}
                className="text-blue-ink hover:underline"
              >
                Review
              </button>
            </p>
          </div>

          {draft.is_public && (
            <a
              href={`${appConfig.siteUrl}${draft.public_path}`}
              target="_blank"
              rel="noreferrer"
              className="u-card block px-4 py-3 text-sm text-blue-ink hover:border-blue/50"
            >
              View public page ↗
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
