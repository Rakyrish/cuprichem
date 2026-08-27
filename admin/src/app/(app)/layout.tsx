"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/primitives";

/**
 * Authenticated shell.
 *
 * The redirect here is a convenience, not a security boundary — the API denies
 * unauthenticated requests regardless of what the client renders.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useSession();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="u-label">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Fixed sidebar on desktop; off-canvas below lg. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] lg:block">
        <Sidebar />
      </aside>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-navy-darkest/60 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[var(--sidebar-w)] lg:hidden">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </>
      )}

      <div className="lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-30 flex h-[var(--topbar-h)] items-center justify-between gap-4 border-b border-line bg-paper px-4 md:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="rounded-[var(--radius)] border border-line-strong px-2.5 py-1.5 text-ink lg:hidden"
          >
            <span aria-hidden>☰</span>
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-[0.82rem] font-medium leading-tight text-ink">
                {user.full_name || user.email}
              </p>
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
