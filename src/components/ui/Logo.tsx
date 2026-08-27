import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

/**
 * Brand mark. Uses the real client logo artwork (never redrawn). `priority` is
 * set in the header so it is not lazy-loaded above the fold.
 */
export function Logo({
  className,
  priority = false,
  height = 34,
}: {
  className?: string;
  priority?: boolean;
  height?: number;
}) {
  const ratio = siteConfig.brand.logoWidth / siteConfig.brand.logoHeight;
  const width = Math.round(height * ratio);
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.legalName} — home`}
      className={cn("inline-flex items-center", className)}
    >
      <Image
        src={siteConfig.brand.logo}
        alt={`${siteConfig.legalName} logo`}
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto"
        style={{ height, width }}
      />
    </Link>
  );
}
