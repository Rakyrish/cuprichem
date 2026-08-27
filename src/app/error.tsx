"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Phase 14: forward to an error reporter. For now, console only.
    console.error(error);
  }, [error]);

  return (
    <section className="u-container flex min-h-[60vh] flex-col justify-center py-24">
      <p className="u-mono-label">Error · 500</p>
      <h1 className="mt-4 max-w-2xl text-4xl md:text-5xl">
        Something went wrong on our side.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        This is a temporary error, not a problem with your request. You can try
        again, or return to the homepage.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button href="/" variant="outline">
          Back to home
        </Button>
      </div>
    </section>
  );
}
