/**
 * Tiny class-name joiner. Deliberately dependency-free (no clsx / tailwind-merge)
 * to keep the runtime footprint minimal — falsey values are dropped.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
