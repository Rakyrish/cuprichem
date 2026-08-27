"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/layout/PageHero";
import { photos } from "@/config/images";

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
    <PageHero
      photo={photos.drumsStacked}
      kicker="Error · 500"
      title="Something went wrong on our side."
      intro="This is a temporary error, not a problem with your request. You can try again, or return to the homepage."
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset} size="lg" variant="onPhotoSolid">
          Try again
        </Button>
        <Button href="/" size="lg" variant="onPhoto">
          Back to home
        </Button>
      </div>
    </PageHero>
  );
}
