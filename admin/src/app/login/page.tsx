"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { Button, Field } from "@/components/ui/primitives";
import { appConfig } from "@/config/app";

export default function LoginPage() {
  const { user, loading, signIn } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(
          caught.status === 429
            ? "Too many attempts. Wait a minute and try again."
            : caught.message,
        );
      } else {
        setError("Sign-in failed. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-deep px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-lime">
            {appConfig.brandName}
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-white">
            {appConfig.appName.replace(appConfig.brandName, "").trim()}
          </h1>
          <p className="mt-2 text-sm text-muted-on-dark">
            Catalogue, content and SEO management.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[var(--radius-lg)] border border-navy-line bg-paper p-6"
        >
          <div className="space-y-4">
            <Field label="Email address" htmlFor="email">
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                autoFocus
                className="u-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="u-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius)] border border-danger/30 bg-danger-tint px-3 py-2 text-sm text-ink"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="mt-6 w-full"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-on-dark">
          Internal system. Access is logged.
        </p>
      </div>
    </main>
  );
}
