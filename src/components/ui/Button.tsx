import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * `onPhoto` / `onPhotoSolid` are for buttons laid over hero photography —
 * they carry their own contrast rather than relying on the page background.
 */
type Variant =
  | "primary"
  | "outline"
  | "ghost"
  | "accent"
  | "lime"
  | "onPhoto"
  | "onPhotoSolid";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-pill)] " +
  "transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-brand disabled:opacity-60 disabled:pointer-events-none " +
  // Buttons carry their own background, so they must not inherit the
  // text-shadow that `.u-photo-text` applies to copy laid over photography.
  "[text-shadow:none]";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-700",
  accent: "bg-accent text-white hover:bg-accent-ink",
  // The literal logo lime with ink type — 7.35:1. Used where the button sits
  // on a dark navy surface and needs to be the loudest thing on it.
  lime: "bg-brand-bright text-ink hover:bg-brand-bright-hover",
  outline:
    "border border-line-strong text-ink bg-transparent hover:border-brand hover:text-brand-700",
  ghost: "text-brand-700 hover:bg-brand-050",
  onPhotoSolid: "bg-white text-ink hover:bg-white/90",
  onPhoto:
    "border border-white/70 text-white bg-white/5 backdrop-blur-sm hover:bg-white hover:text-ink " +
    "focus-visible:outline-white",
};

const sizes: Record<Size, string> = {
  md: "text-sm px-5 h-11",
  lg: "text-[0.95rem] px-7 h-13",
};

interface StyleProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type LinkProps = StyleProps & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "href" | "className" | "children"
  >;
type NativeProps = StyleProps &
  Omit<ComponentProps<"button">, "className" | "children">;

function classesFor(variant: Variant, size: Size, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button(props: LinkProps | NativeProps) {
  if ("href" in props && props.href) {
    const { variant = "primary", size = "md", className, children, href, ...rest } =
      props;
    return (
      <Link href={href} className={classesFor(variant, size, className)} {...rest}>
        {children}
      </Link>
    );
  }
  const { variant = "primary", size = "md", className, children, ...rest } =
    props as NativeProps;
  return (
    <button className={classesFor(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
