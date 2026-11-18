import { useEffect, useRef, useState } from "react";

/**
 * Gold line rangoli, drawn as exact geometry (viewBox 400×400, centre 200,200).
 * Every stroke uses pathLength=1 so CSS can "draw" it like chalk being laid.
 */

const C = 200;

// A pointed lotus petal pointing straight up, from radius r1 to r2
const petal = (r1: number, r2: number, w: number) => {
  const len = r2 - r1;
  return [
    `M ${C} ${C - r1}`,
    `C ${C + w} ${C - r1 - len * 0.25}, ${C + w * 0.85} ${C - r1 - len * 0.7}, ${C} ${C - r2}`,
    `C ${C - w * 0.85} ${C - r1 - len * 0.7}, ${C - w} ${C - r1 - len * 0.25}, ${C} ${C - r1}`,
    "Z",
  ].join(" ");
};

// A rounded scallop between two petals (gives the lace edge of the reference)
const scallop = (r: number, w: number, h: number) =>
  `M ${C - w} ${C - r} Q ${C} ${C - r - h} ${C + w} ${C - r}`;

// A short straight line along the petal's axis
const vein = (r1: number, r2: number) => `M ${C} ${C - r1} L ${C} ${C - r2}`;

// A small spiral tendril leaving a petal tip to one side (dir = 1 or -1)
const curl = (r: number, dir: number) =>
  `M ${C + dir * 3} ${C - r} C ${C + dir * 9} ${C - r - 3}, ${C + dir * 13} ${C - r + 3}, ${C + dir * 10} ${C - r + 7} C ${C + dir * 8} ${C - r + 9}, ${C + dir * 5} ${C - r + 6}, ${C + dir * 7} ${C - r + 4}`;

// An eight-point star made of two squares
const star = (r: number) => {
  const pts = (offset: number) =>
    Array.from({ length: 4 }, (_, i) => {
      const a = ((i * 90 + offset) * Math.PI) / 180;
      return `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`;
    }).join(" ");
  return [pts(0), pts(45)];
};

type Ring = {
  count: number;
  d: string;
  delay: number;
  offset?: number;
  width?: number;
};

const rings: Ring[] = [
  // inner rosette
  { count: 8, d: petal(14, 52, 13), delay: 0 },
  { count: 8, d: petal(30, 62, 9), delay: 0.15, offset: 22.5 },
  // middle lotus
  { count: 12, d: petal(78, 128, 20), delay: 0.45 },
  { count: 12, d: petal(92, 120, 9), delay: 0.6 },
  { count: 12, d: scallop(132, 17, 9), delay: 0.75, offset: 15 },
  // lace edge just outside the inner medallion
  { count: 32, d: scallop(140, 10, 6), delay: 0.9, offset: 5.625 },
  // outer lotus
  { count: 16, d: petal(144, 188, 18), delay: 0.95 },
  { count: 16, d: petal(152, 180, 7), delay: 1.1 },
  { count: 16, d: petal(150, 182, 12), delay: 1.2, offset: 11.25, width: 0.7 },
  { count: 16, d: petal(180, 199, 4), delay: 1.35, offset: 11.25 },
  // doubled contour on the big petals
  { count: 16, d: petal(141, 193, 22), delay: 1.05, width: 0.5 },
  // third inner outline + central vein on the big petals
  { count: 16, d: petal(160, 176, 4), delay: 1.3, width: 0.6 },
  { count: 16, d: vein(176, 186), delay: 1.4, width: 0.6 },
  // inner outline on the small in-between petals
  { count: 16, d: petal(158, 176, 6), delay: 1.3, offset: 11.25, width: 0.5 },
  // curled tendrils either side of each big petal tip
  { count: 16, d: curl(186, 1), delay: 1.45, width: 0.6 },
  { count: 16, d: curl(186, -1), delay: 1.45, width: 0.6 },
  // second lace row, interleaved with the first
  { count: 32, d: scallop(136, 6, 3.5), delay: 0.95, width: 0.5 },
];

const circles = [
  { r: 8, delay: 0 },
  { r: 68, delay: 0.3 },
  { r: 74, delay: 0.35 },
  { r: 128, delay: 0.8 },
];

export const Rangoli = ({
  className = "",
  drawn = true,
  spin = false,
}: {
  className?: string;
  /** when false the lines stay undrawn; flip to true to play the draw */
  drawn?: boolean;
  spin?: boolean;
}) => {
  const [a, b] = star(60);
  return (
    <svg
      viewBox="0 0 400 400"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`rangoli ${drawn ? "is-drawn" : ""} ${className}`}
    >
      <g className={spin ? "rangoli-spin" : undefined}>
        {circles.map(({ r, delay }) => (
          <circle
            key={r}
            cx={C}
            cy={C}
            r={r}
            pathLength={1}
            strokeWidth={0.8}
            className="r-line"
            style={{ ["--d" as string]: `${delay}s` }}
          />
        ))}

        <polygon points={a} pathLength={1} strokeWidth={0.8} className="r-line" style={{ ["--d" as string]: "0.2s" }} />
        <polygon points={b} pathLength={1} strokeWidth={0.8} className="r-line" style={{ ["--d" as string]: "0.25s" }} />

        {rings.map((ring, ri) =>
          Array.from({ length: ring.count }, (_, i) => (
            <path
              key={`${ri}-${i}`}
              d={ring.d}
              pathLength={1}
              strokeWidth={ring.width ?? 0.9}
              transform={`rotate(${(360 / ring.count) * i + (ring.offset ?? 0)} ${C} ${C})`}
              className="r-line"
              style={{ ["--d" as string]: `${ring.delay + i * 0.02}s` }}
            />
          ))
        )}

        {/* kolam dots */}
        {Array.from({ length: 32 }, (_, i) => {
          // alternate: a dot past each petal tip, a dot inside each petal
          const ang = ((360 / 16) * Math.floor(i / 2) * Math.PI) / 180 - Math.PI / 2;
          const r = i % 2 === 0 ? 195 : 160;
          return (
            <circle
              key={`dot-${i}`}
              cx={C + r * Math.cos(ang)}
              cy={C + r * Math.sin(ang)}
              r={i % 2 === 0 ? 1.8 : 1.3}
              fill="currentColor"
              stroke="none"
              className="r-dot"
              style={{ ["--d" as string]: `${1.5 + i * 0.015}s` }}
            />
          );
        })}
        {Array.from({ length: 64 }, (_, i) => {
          const ang = ((360 / 64) * i * Math.PI) / 180;
          return (
            <circle
              key={`bead-${i}`}
              cx={C + 132 * Math.cos(ang)}
              cy={C + 132 * Math.sin(ang)}
              r={0.9}
              fill="currentColor"
              stroke="none"
              className="r-dot"
              style={{ ["--d" as string]: `${0.85 + i * 0.006}s` }}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const ang = (((360 / 12) * i + 15) * Math.PI) / 180;
          return (
            <circle
              key={`dot-in-${i}`}
              cx={C + 104 * Math.cos(ang)}
              cy={C + 104 * Math.sin(ang)}
              r={1.4}
              fill="currentColor"
              stroke="none"
              className="r-dot"
              style={{ ["--d" as string]: `${0.9 + i * 0.02}s` }}
            />
          );
        })}
      </g>
    </svg>
  );
};

/** Flips to true once the element scrolls into view (stays true). */
export function useInView<T extends Element>(margin = "0px 0px -15% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView, margin]);
  return [ref, inView] as const;
}

/** Corner rangoli that draws itself when its section scrolls into view. */
export const SectionRangoli = ({ className = "" }: { className?: string }) => {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`pointer-events-none absolute ${className}`}>
      <Rangoli drawn={inView} className="h-full w-full text-gold-400/30" />
    </div>
  );
};

/** Eight-point star from the rangoli centre, used as a small mark. */
export const StarMark = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
    <path d="M8 0.5 L9.6 5 L14 3 L11.9 7.4 L15.5 8 L11.9 8.6 L14 13 L9.6 11 L8 15.5 L6.4 11 L2 13 L4.1 8.6 L0.5 8 L4.1 7.4 L2 3 L6.4 5 Z" />
  </svg>
);

