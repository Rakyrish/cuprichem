"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { AIJob, Product } from "@/types";
import {
  Button,
  ConfidenceBadge,
  Field,
  cn,
} from "@/components/ui/primitives";

/**
 * AI assistant panel.
 *
 * The contract this UI enforces:
 *   - Nothing a model produces is written to the product until the operator
 *     ticks the field and presses Apply. There is no "accept all" button.
 *   - Every proposed value is shown as BEFORE → AFTER so a replacement is
 *     always a visible, deliberate choice.
 *   - Fields the operator has marked verified are shown as locked, and the
 *     server refuses to overwrite them regardless of what is ticked here.
 */

type Operation = "product_generate" | "seo_generate" | "image_analyze" | "content_review";

const ENDPOINTS: Record<Operation, string> = {
  product_generate: "/ai/generate-product/",
  seo_generate: "/ai/generate-seo/",
  image_analyze: "/ai/analyze-image/",
  content_review: "/ai/review-content/",
};

/** Which result keys map onto editable product fields, and how to label them. */
const FIELD_LABELS: Record<string, string> = {
  short_description: "Short description",
  description: "Full description",
  procurement_notes: "Procurement notes",
  seo_title: "SEO title",
  meta_description: "Meta description",
  primary_keyword: "Primary keyword",
  secondary_keywords: "Secondary keywords",
  cas_number: "CAS number",
  formula: "Formula",
  grade: "Grade",
  purity: "Purity",
  packaging: "Packaging",
  manufacturer: "Manufacturer",
  appearance: "Appearance",
  faqs: "FAQs",
};

const APPLICABLE = new Set(Object.keys(FIELD_LABELS));

/** Result keys that are advisory context, never applied to the record. */
const ADVISORY_KEYS = new Set([
  "warnings",
  "confidence",
  "unknown_fields",
  "needs_verification",
  "label_text",
  "internal_link_suggestions",
  "related_search_terms",
  "search_intent",
  "suggested_h1",
  "suggested_slug",
  "strengths",
  "weaknesses",
  "missing_information",
  "recommendations",
  "readability",
  "search_intent_alignment",
  "applications",
  "industries",
  "packaging_description",
  "product_name",
  "chemical_name",
]);

const STAGES: Record<Operation, string[]> = {
  image_analyze: ["Uploading context", "Reading the label", "Validating extraction"],
  product_generate: ["Assembling confirmed facts", "Generating copy", "Checking claims"],
  seo_generate: ["Collecting page data", "Generating metadata", "Verifying internal links"],
  content_review: ["Reading the page", "Assessing quality", "Compiling recommendations"],
};

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === "object" && v !== null
          ? ((v as Record<string, unknown>).question as string) ?? JSON.stringify(v)
          : String(v),
      )
      .join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DiffRow({
  field,
  before,
  after,
  checked,
  locked,
  confidence,
  onToggle,
}: {
  field: string;
  before: unknown;
  after: unknown;
  checked: boolean;
  locked: boolean;
  confidence?: string;
  onToggle: () => void;
}) {
  const beforeText = display(before);
  const afterText = display(after);
  const isNew = !beforeText;

  return (
    <li
      className={cn(
        "rounded-[var(--radius)] border p-3",
        locked ? "border-line bg-surface/60" : "border-line bg-paper",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked && !locked}
          disabled={locked}
          onChange={onToggle}
          aria-label={`Accept ${FIELD_LABELS[field] ?? field}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">
              {FIELD_LABELS[field] ?? field}
            </span>
            {confidence && <ConfidenceBadge level={confidence as never} />}
            {locked && (
              <span className="rounded-[var(--radius-sm)] border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted">
                Verified — locked
              </span>
            )}
            {isNew && !locked && (
              <span className="rounded-[var(--radius-sm)] border border-ok/30 bg-ok-tint px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-ok">
                New
              </span>
            )}
          </div>

          {!isNew && (
            <p className="mt-2 rounded-[var(--radius-sm)] bg-danger-tint/60 px-2 py-1.5 text-[0.8rem] leading-relaxed text-muted line-through decoration-danger/40">
              {beforeText}
            </p>
          )}
          <p
            className={cn(
              "mt-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-[0.83rem] leading-relaxed text-ink",
              isNew ? "bg-surface" : "bg-ok-tint/60",
            )}
          >
            {afterText || <span className="italic text-faint">(empty)</span>}
          </p>

          {locked && (
            <p className="mt-2 text-xs text-muted">
              You marked this field verified, so the administrator value is kept.
              Untick it in the Technical tab to allow changes.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function AiAssistant({
  product,
  onProductUpdated,
}: {
  product: Product;
  onProductUpdated: (product: Product) => void;
}) {
  const toast = useToast();
  const [job, setJob] = useState<AIJob | null>(null);
  const [running, setRunning] = useState<Operation | null>(null);
  const [stage, setStage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<ApiError | null>(null);
  const [conflicts, setConflicts] = useState<
    { field: string; admin_value: unknown; ai_value: unknown }[]
  >([]);

  const verified = new Set(product.verified_fields ?? []);

  async function run(operation: Operation) {
    setRunning(operation);
    setError(null);
    setJob(null);
    setConflicts([]);
    setStage(0);

    // Advance the stage labels so a long call does not look frozen. Purely
    // presentational — the request itself is a single round trip.
    const ticker = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES[operation].length - 1)),
      1400,
    );

    try {
      const body: Record<string, unknown> = { product: product.id };
      if (operation === "image_analyze") {
        if (!product.primary_image) {
          throw new ApiError(400, {
            code: "no_image",
            message: "Add a product image before running image analysis.",
          });
        }
        // The backend needs a reachable URL; it is stored on the asset.
        const asset = await api.get<{ secure_url: string }>(
          `/media/${product.primary_image}/`,
        );
        body.image_url = asset.secure_url;
      }

      const result = await api.post<AIJob>(ENDPOINTS[operation], body);
      setJob(result);

      // Pre-tick everything applicable that is not locked, so the common case
      // is one review pass and one click — without ever auto-applying.
      const applicable = Object.keys(result.result ?? {}).filter(
        (key) =>
          APPLICABLE.has(key) &&
          !verified.has(key) &&
          display((result.result as Record<string, unknown>)[key]) !== "",
      );
      setSelected(new Set(applicable));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError(0, { code: "unknown", message: "Generation failed." }),
      );
    } finally {
      clearInterval(ticker);
      setRunning(null);
    }
  }

  async function applySelected() {
    if (!job || selected.size === 0) return;
    try {
      const response = await api.post<{
        outcome: {
          applied: Record<string, unknown>;
          conflicts: { field: string; admin_value: unknown; ai_value: unknown }[];
          skipped: string[];
        };
        product: Product;
      }>(`/ai/jobs/${job.id}/accept/`, { fields: [...selected] });

      onProductUpdated(response.product);
      setConflicts(response.outcome.conflicts);
      setJob(null);
      setSelected(new Set());

      const appliedCount = Object.keys(response.outcome.applied).length;
      if (response.outcome.conflicts.length > 0) {
        toast.notify(
          "info",
          `Applied ${appliedCount} field(s).`,
          `${response.outcome.conflicts.length} conflicted with verified values and were not changed.`,
        );
      } else {
        toast.success(`Applied ${appliedCount} field(s) to the product.`);
      }
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : "Could not apply the changes.";
      toast.error("Nothing was applied.", message);
    }
  }

  async function rejectJob() {
    if (!job) return;
    try {
      await api.post(`/ai/jobs/${job.id}/reject/`);
    } finally {
      setJob(null);
      setSelected(new Set());
      toast.notify("info", "AI suggestions discarded.");
    }
  }

  const result = (job?.result ?? {}) as Record<string, unknown>;
  const confidence = (result.confidence ?? {}) as Record<string, string>;
  const warnings = (result.warnings as string[]) ?? [];
  const needsVerification =
    (result.needs_verification as string[]) ?? (result.unknown_fields as string[]) ?? [];

  const applicableKeys = Object.keys(result).filter(
    (key) => APPLICABLE.has(key) && display(result[key]) !== "",
  );
  const advisoryKeys = Object.keys(result).filter(
    (key) =>
      ADVISORY_KEYS.has(key) &&
      !["warnings", "confidence", "needs_verification", "unknown_fields"].includes(key) &&
      display(result[key]) !== "",
  );

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="u-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="u-label">AI product assistant</p>
            <p className="mt-2 max-w-lg text-sm text-muted">
              Suggestions are written to a review record first. Nothing reaches
              the product — or the public site — until you accept it here.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="ai"
            size="sm"
            disabled={running !== null}
            onClick={() => void run("product_generate")}
          >
            Generate content
          </Button>
          <Button
            variant="ai"
            size="sm"
            disabled={running !== null}
            onClick={() => void run("seo_generate")}
          >
            Generate SEO
          </Button>
          <Button
            size="sm"
            disabled={running !== null || !product.primary_image}
            title={
              product.primary_image
                ? "Read the product label"
                : "Add a product image first"
            }
            onClick={() => void run("image_analyze")}
          >
            Analyse image
          </Button>
          <Button
            size="sm"
            disabled={running !== null}
            onClick={() => void run("content_review")}
          >
            Review quality
          </Button>
        </div>

        {running && (
          <div className="mt-5 rounded-[var(--radius)] border border-blue/25 bg-blue-tint px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-ink">
              <span
                aria-hidden
                className="h-2 w-2 animate-pulse rounded-full bg-blue"
              />
              {STAGES[running][stage]}…
            </p>
            <p className="mt-1 text-xs text-muted">
              You can keep editing other fields; nothing will be overwritten.
            </p>
          </div>
        )}
      </div>

      {/* Errors — explain what happened and what to do next. */}
      {error && (
        <div className="u-card border-danger/30 bg-danger-tint p-5">
          <p className="text-sm font-medium text-ink">
            {error.code === "ai_not_configured"
              ? "AI service is not configured."
              : "The AI request did not complete."}
          </p>
          <p className="mt-1.5 text-sm text-muted">{error.message}</p>
          {error.code === "ai_not_configured" && (
            <p className="mt-2 text-xs text-muted">
              An administrator must set OPENAI_API_KEY on the server. Product
              editing is unaffected — you can still enter everything manually.
            </p>
          )}
          {error.code !== "ai_not_configured" && (
            <div className="mt-4">
              <Button size="sm" onClick={() => void run("product_generate")}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Conflicts from the last apply — the admin's value always won. */}
      {conflicts.length > 0 && (
        <div className="u-card border-warn/30 bg-warn-tint p-5">
          <p className="text-sm font-medium text-ink">
            {conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} — administrator
            values retained
          </p>
          <ul className="mt-3 space-y-2">
            {conflicts.map((conflict) => (
              <li key={conflict.field} className="text-sm">
                <span className="font-medium text-ink">
                  {FIELD_LABELS[conflict.field] ?? conflict.field}
                </span>
                <span className="ml-2 text-muted">
                  kept <span className="font-mono">{display(conflict.admin_value)}</span>{" "}
                  · AI proposed{" "}
                  <span className="font-mono">{display(conflict.ai_value)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review */}
      {job && (
        <div className="u-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-sm font-medium text-ink">Review AI suggestions</p>
              <p className="mt-0.5 font-mono text-[0.68rem] text-muted">
                {job.model_name} · {job.prompt_version} · {job.total_tokens} tokens
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => void rejectJob()}>
                Discard
              </Button>
              <Button
                size="sm"
                variant="primary"
                disabled={selected.size === 0}
                onClick={() => void applySelected()}
              >
                Apply {selected.size} selected
              </Button>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="mt-4 rounded-[var(--radius)] border border-warn/30 bg-warn-tint px-4 py-3">
              <p className="u-label mb-2">Warnings</p>
              <ul className="space-y-1.5">
                {warnings.map((warning) => (
                  <li key={warning} className="text-sm leading-relaxed text-ink">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {needsVerification.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              The model could not determine:{" "}
              <span className="font-mono">{needsVerification.join(", ")}</span>. Supply
              these yourself if you have confirmed values.
            </p>
          )}

          {applicableKeys.length === 0 ? (
            <p className="mt-5 text-sm text-muted">
              Nothing in this result maps to an editable field. See the notes below.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {applicableKeys.map((key) => (
                <DiffRow
                  key={key}
                  field={key}
                  before={(product as unknown as Record<string, unknown>)[key]}
                  after={result[key]}
                  checked={selected.has(key)}
                  locked={verified.has(key)}
                  confidence={confidence[key]}
                  onToggle={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                />
              ))}
            </ul>
          )}

          {advisoryKeys.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="u-label mb-3">Notes and suggestions (not applied)</p>
              <dl className="space-y-2.5">
                {advisoryKeys.map((key) => (
                  <div key={key}>
                    <dt className="text-xs font-medium text-muted">
                      {FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
                    </dt>
                    <dd className="mt-0.5 text-sm leading-relaxed text-ink">
                      {display(result[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
