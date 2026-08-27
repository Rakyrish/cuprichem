/**
 * A clearly-labelled notice used wherever a record is an unverified placeholder.
 * Keeps the honesty rule visible to users: the page is real, the data is not yet
 * confirmed. (These pages are also rendered noindex + kept out of the sitemap.)
 */
export function PendingNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-accent-ink/30 bg-accent-050 p-4">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.12em] text-accent-ink">
        Pending confirmation
      </p>
      <p className="mt-2 text-sm text-ink/80">
        {children ??
          "This entry is being confirmed with verified product data. Request a quote for current availability and specifications."}
      </p>
    </div>
  );
}
