import Link from "next/link";
import type { Product } from "@/types/content";

/** Product tile used in category listings, related rails and search. */
export function ProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-line bg-paper p-6 transition-colors hover:border-brand/40 hover:bg-surface"
    >
      {categoryName ? (
        <span className="u-mono-label">{categoryName}</span>
      ) : (
        <span className="u-mono-label">Product</span>
      )}
      <h3 className="mt-3 flex items-center justify-between gap-3 text-lg text-ink">
        {product.name}
        <span
          aria-hidden
          className="text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand-700"
        >
          →
        </span>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted">
        {product.shortDescription}
      </p>
    </Link>
  );
}
