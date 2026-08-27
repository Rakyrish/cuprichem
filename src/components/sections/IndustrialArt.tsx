/**
 * Original industrial line-illustration (no photo assets): a stylised row of
 * chemical storage tanks and pipework, drawn in the brand green/blue. Purely
 * decorative (aria-hidden). Sits inside a dark band to give the page a premium
 * "plant" visual without stock photography or any implied real facility.
 */
export function IndustrialArt({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 300"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="tankG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-brand-bright)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-brand-bright)" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="tankB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-accent-bright)" stopOpacity="0.30" />
          <stop offset="1" stopColor="var(--color-accent-bright)" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* ground line */}
      <line x1="0" y1="262" x2="640" y2="262" stroke="var(--color-accent-bright)" strokeOpacity="0.25" />

      {/* horizontal pipe run */}
      <path d="M40 120 H600" stroke="var(--color-brand-bright)" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M120 120 v60 M300 120 v40 M470 120 v70" stroke="var(--color-brand-bright)" strokeOpacity="0.3" strokeWidth="2" />

      {/* tank 1 (tall, blue) */}
      <g stroke="var(--color-accent-bright)" strokeOpacity="0.55" strokeWidth="2">
        <rect x="80" y="150" width="90" height="112" rx="6" fill="url(#tankB)" />
        <ellipse cx="125" cy="150" rx="45" ry="12" fill="url(#tankB)" />
        <line x1="80" y1="200" x2="170" y2="200" strokeOpacity="0.3" />
      </g>

      {/* tank 2 (medium, green) */}
      <g stroke="var(--color-brand-bright)" strokeOpacity="0.6" strokeWidth="2">
        <rect x="255" y="176" width="82" height="86" rx="6" fill="url(#tankG)" />
        <ellipse cx="296" cy="176" rx="41" ry="11" fill="url(#tankG)" />
      </g>

      {/* tank 3 (tall, green) */}
      <g stroke="var(--color-brand-bright)" strokeOpacity="0.55" strokeWidth="2">
        <rect x="425" y="140" width="96" height="122" rx="6" fill="url(#tankG)" />
        <ellipse cx="473" cy="140" rx="48" ry="13" fill="url(#tankG)" />
        <line x1="425" y1="196" x2="521" y2="196" strokeOpacity="0.3" />
      </g>

      {/* valve nodes */}
      <g fill="var(--color-accent-bright)" fillOpacity="0.6">
        <circle cx="120" cy="120" r="4" />
        <circle cx="300" cy="120" r="4" />
        <circle cx="470" cy="120" r="4" />
      </g>
    </svg>
  );
}
