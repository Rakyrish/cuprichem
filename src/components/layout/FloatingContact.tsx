import { siteConfig } from "@/config/site";

/**
 * Floating contact dock — WhatsApp, phone and email, fixed to the bottom-right
 * on every page.
 *
 * Each button emits an expanding "pulse" ring (a `::before` pseudo-element, so
 * the tap target itself never moves) on a staggered delay, which reads as one
 * rhythm rather than three competing blinks. The whole effect is gated behind
 * `prefers-reduced-motion` in globals.css.
 *
 * Colours: WhatsApp keeps its own brand green — recognition IS the point of
 * that icon — while phone and email take the two sampled logo colours.
 */

const items = [
  {
    key: "whatsapp",
    label: "Chat with us on WhatsApp",
    short: "WhatsApp",
    href: siteConfig.contact.whatsappHref,
    external: true,
    // WhatsApp's own brand green. White on it is 2.4:1, so the glyph is drawn
    // large and solid rather than as fine text.
    className: "bg-whatsapp text-white",
    delay: "0ms",
    icon: (
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07s.89 2.4 1.02 2.56c.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    ),
  },
  {
    key: "phone",
    label: `Call us on ${siteConfig.contact.phoneDisplay}`,
    short: "Call",
    href: siteConfig.contact.phoneHref,
    external: false,
    className: "bg-accent text-white",
    delay: "600ms",
    icon: (
      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    ),
  },
  {
    key: "email",
    label: "Email our sales team",
    short: "Email",
    href: siteConfig.contact.salesEmailHref,
    external: false,
    className: "bg-brand text-white",
    delay: "1200ms",
    icon: (
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.24-7.47 4.67a1 1 0 0 1-1.06 0L4 8.24V6.4l8 5 8-5v1.84Z" />
    ),
  },
];

export function FloatingContact() {
  return (
    <div
      className="fixed bottom-5 right-4 z-40 flex flex-col gap-3 md:bottom-8 md:right-6"
      // Presentational grouping only — each child is an independent link.
      role="group"
      aria-label="Quick contact"
    >
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          aria-label={item.label}
          {...(item.external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          style={{ "--pulse-delay": item.delay } as React.CSSProperties}
          className={`pulse-ring group relative inline-flex h-12 w-12 items-center justify-center
            rounded-full shadow-lg shadow-ink-strong/25 transition-transform duration-200
            hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-white md:h-13 md:w-13 ${item.className}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
            className="h-6 w-6"
          >
            {item.icon}
          </svg>

          {/* Hover label — desktop only; the aria-label covers everyone else. */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-[var(--radius)]
              bg-ink-strong px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity
              duration-200 group-hover:opacity-100 lg:block"
          >
            {item.short}
          </span>
        </a>
      ))}
    </div>
  );
}
