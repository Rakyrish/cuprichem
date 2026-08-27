import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "accent";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius)] " +
  "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-brand disabled:opacity-60 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-700",
  accent: "bg-accent text-white hover:bg-accent-ink",
  outline:
    "border border-line-strong text-ink bg-transparent hover:border-brand hover:text-brand-700",
  ghost: "text-brand-700 hover:bg-brand-050",
};

const sizes: Record<Size, string> = {
  md: "text-sm px-4 h-10",
  lg: "text-base px-6 h-12",
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
