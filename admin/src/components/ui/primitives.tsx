import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import type {
  ContentOrigin,
  Confidence,
  PublishStatus,
  SeoBand,
} from "@/types";

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

/* --------------------------------- Button --------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  // Lime is reserved for the affirmative action on a screen.
  primary: "bg-lime text-ink hover:bg-lime-dim border border-transparent font-medium",
  secondary:
    "bg-paper text-ink border border-line-strong hover:border-blue hover:text-blue-ink",
  ghost: "bg-transparent text-muted hover:text-ink hover:bg-surface border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
  // AI actions get the blue so they read as a distinct class of operation.
  ai: "bg-blue text-white hover:bg-blue-ink border border-transparent font-medium",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8rem] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
};

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-[var(--radius)] transition-colors " +
  "disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

interface ButtonBase {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonBase & ComponentProps<"button">) {
  return (
    <button
      className={cn(BUTTON_BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  children,
  href,
  ...rest
}: ButtonBase & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "href" | "className" | "children"
  >) {
  return (
    <Link
      href={href}
      className={cn(BUTTON_BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

/* --------------------------------- Badges --------------------------------- */

const STATUS_STYLE: Record<PublishStatus, string> = {
  draft: "bg-surface text-muted border-line-strong",
  ai_generated: "bg-blue-tint text-blue-ink border-blue/30",
  needs_review: "bg-warn-tint text-warn border-warn/30",
  approved: "bg-lime-tint text-lime-deep border-lime/40",
  published: "bg-ok-tint text-ok border-ok/30",
  unpublished: "bg-surface text-muted border-line-strong",
  archived: "bg-surface text-faint border-line",
};

const STATUS_LABEL: Record<PublishStatus, string> = {
  draft: "Draft",
  ai_generated: "AI generated",
  needs_review: "Needs review",
  approved: "Approved",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: PublishStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[0.7rem] font-medium",
        STATUS_STYLE[status] ?? STATUS_STYLE.draft,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

const ORIGIN_LABEL: Record<ContentOrigin, string> = {
  human: "Human authored",
  ai_generated: "AI generated",
  ai_assisted: "AI assisted",
  human_edited: "Human edited",
  human_approved: "Human approved",
};

/**
 * Provenance is always visible: an operator must be able to tell at a glance
 * whether a technical value was written by a person or proposed by a model.
 */
export function OriginBadge({ origin }: { origin: ContentOrigin }) {
  const isAi = origin === "ai_generated" || origin === "ai_assisted";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[0.68rem]",
        isAi
          ? "border-blue/30 bg-blue-tint text-blue-ink"
          : "border-line-strong bg-surface text-muted",
      )}
    >
      {isAi && <span aria-hidden>◆</span>}
      {ORIGIN_LABEL[origin] ?? origin}
    </span>
  );
}

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  high: "bg-ok-tint text-ok border-ok/30",
  medium: "bg-warn-tint text-warn border-warn/30",
  low: "bg-danger-tint text-danger border-danger/30",
  unknown: "bg-surface text-muted border-line-strong",
};

export function ConfidenceBadge({ level }: { level: Confidence }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-sm)] border px-1.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider",
        CONFIDENCE_STYLE[level],
      )}
      title={
        level === "high"
          ? "Confirmed or plainly legible"
          : "Unverified — check against supplier documentation before publishing"
      }
    >
      {level}
    </span>
  );
}

/* -------------------------------- SEO score -------------------------------- */

const BAND_STYLE: Record<SeoBand, { bar: string; text: string; label: string }> = {
  healthy: { bar: "bg-ok", text: "text-ok", label: "Healthy" },
  needs_attention: { bar: "bg-warn", text: "text-warn", label: "Needs attention" },
  critical: { bar: "bg-danger", text: "text-danger", label: "Critical" },
};

/**
 * The score is a deterministic content-quality checklist, NOT a prediction of
 * Google ranking. The label says so wherever the number is shown.
 */
export function SeoScore({
  score,
  band,
  showBar = true,
}: {
  score: number;
  band: SeoBand;
  showBar?: boolean;
}) {
  const style = BAND_STYLE[band] ?? BAND_STYLE.critical;
  return (
    <div className="flex items-center gap-2" title={`Content/SEO quality: ${style.label}`}>
      <span className={cn("font-mono text-sm font-medium tabular", style.text)}>
        {score}
      </span>
      {showBar && (
        <span className="h-1.5 w-14 overflow-hidden rounded-full bg-surface">
          <span
            className={cn("block h-full rounded-full", style.bar)}
            style={{ width: `${Math.max(score, 2)}%` }}
          />
        </span>
      )}
    </div>
  );
}

/* ------------------------------- Empty / load ------------------------------ */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="u-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-base font-medium text-ink">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-line">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-3.5">
              <span
                className="u-skeleton block h-3.5"
                style={{ width: `${45 + ((r + c) % 4) * 15}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ErrorState({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="u-card border-danger/30 bg-danger-tint px-6 py-8 text-center">
      <p className="text-sm font-medium text-ink">{message}</p>
      {detail && <p className="mt-2 text-sm text-muted">{detail}</p>}
      {onRetry && (
        <div className="mt-5">
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Fields --------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  trailing,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="u-label">
          {label}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Character counter for SEO fields. Colour tracks the guidance bands so the
 * editor can see at a glance whether a title will be truncated in results.
 */
export function CharCount({
  value,
  min,
  ideal,
  max,
}: {
  value: string;
  min: number;
  ideal: number;
  max: number;
}) {
  const length = value.length;
  const state =
    length === 0 || length < min || length > max
      ? "text-danger"
      : length > ideal
        ? "text-warn"
        : "text-ok";
  return (
    <span className={cn("font-mono text-[0.68rem] tabular", state)}>
      {length}/{ideal}
    </span>
  );
}
