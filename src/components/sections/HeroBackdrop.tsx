/**
 * Decorative animated hero backdrop — original SVG (no photo assets): a soft
 * green/blue gradient wash plus a drifting "molecular lattice" of connected
 * nodes. Purely presentational (aria-hidden); kept at low opacity so hero text
 * stays high-contrast. Animation is gated by prefers-reduced-motion in CSS.
 *
 * NOTE: when real/generated industrial photography is available, it can be
 * layered here (e.g. a next/image fill behind this SVG with a gradient overlay)
 * without changing the Hero component.
 */
export function HeroBackdrop() {
  const nodes = [
    { x: 120, y: 90 },
    { x: 240, y: 160 },
    { x: 330, y: 70 },
    { x: 430, y: 150 },
    { x: 540, y: 90 },
    { x: 210, y: 280 },
    { x: 350, y: 250 },
    { x: 470, y: 300 },
    { x: 590, y: 220 },
    { x: 300, y: 360 },
    { x: 500, y: 400 },
  ];
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 3], [6, 7], [7, 8], [4, 8], [5, 9], [9, 10], [7, 10],
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Soft brand gradient wash, top-right. */}
      <div
        className="pan-slow absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 70% at 82% 18%, rgba(124,193,66,0.16), transparent 60%), radial-gradient(55% 65% at 12% 92%, rgba(20,112,180,0.12), transparent 60%)",
        }}
      />
      <svg
        className="absolute right-0 top-0 h-full w-full opacity-[0.55]"
        viewBox="0 0 700 460"
        fill="none"
        preserveAspectRatio="xMaxYMin slice"
      >
        <g className="drift" stroke="var(--color-accent)" strokeOpacity="0.35" strokeWidth="1">
          {edges.map(([a, b], i) => (
            <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
          ))}
        </g>
        <g className="drift-2">
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={i % 3 === 0 ? 5 : 3}
              fill={i % 2 === 0 ? "var(--color-brand)" : "var(--color-accent)"}
              fillOpacity={i % 2 === 0 ? 0.5 : 0.4}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
