import { useEffect, useState, type CSSProperties } from "react";
import { ingredients } from "../data/ingredients";
import { useInView } from "./Rangoli";

/**
 * The 21 ingredients as a gold honeycomb, echoing the hexagon grain
 * windows printed on the Devanagari pack.
 */

const split = (name: string) => {
  const i = name.indexOf(" (");
  return i === -1
    ? { main: name, local: "" }
    : { main: name.slice(0, i), local: name.slice(i + 2, -1) };
};

const items = ingredients.map((ing, i) => ({ ...split(ing.name), n: i + 1 }));

// Row lengths per layout; alternating rows sit half a cell apart
const LAYOUTS = [
  { rows: [7, 7, 7], shift: true, cls: "hidden lg:block", w: 150, g: 10 },
  { rows: [4, 3, 4, 3, 4, 3], shift: false, cls: "hidden sm:block lg:hidden", w: 132, g: 8 },
  { rows: [3, 2, 3, 2, 3, 2, 3, 2, 1], shift: false, cls: "sm:hidden", w: 104, g: 6 },
];

const chunk = (rows: number[]) => {
  let k = 0;
  return rows.map((len) => items.slice(k, (k += len)));
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const IngredientHoneycomb = () => {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [active, setActive] = useState(-1);
  const [hovering, setHovering] = useState(false);

  // A gold highlight drifts through the cells until the visitor takes over
  useEffect(() => {
    if (!inView || hovering || prefersReducedMotion()) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % items.length),
      1400
    );
    return () => window.clearInterval(id);
  }, [inView, hovering]);

  return (
    <div ref={ref} onMouseLeave={() => setHovering(false)}>
      {/* Accessible list; the honeycombs below are visual */}
      <ol className="sr-only">
        {items.map((it) => (
          <li key={it.n}>
            {it.main}
            {it.local && ` (${it.local})`}
          </li>
        ))}
      </ol>

      {LAYOUTS.map((layout) => (
        <div
          key={layout.cls}
          aria-hidden="true"
          className={layout.cls}
          style={{ ["--w" as string]: `${layout.w}px`, ["--g" as string]: `${layout.g}px` } as CSSProperties}
        >
          {chunk(layout.rows).map((row, r) => (
            <div
              key={r}
              className="hc-row flex justify-center"
              style={
                layout.shift
                  ? { transform: `translateX(${((r % 2 ? 1 : -1) * (layout.w + layout.g)) / 4}px)` }
                  : undefined
              }
            >
              {row.map((it) => {
                const on = active === it.n - 1;
                return (
                  <div
                    key={it.n}
                    data-reveal={inView}
                    style={{ ["--d" as string]: `${(it.n - 1) * 0.04}s` } as CSSProperties}
                    className="relative flex-none"
                  >
                    <div
                      onMouseEnter={() => {
                        setHovering(true);
                        setActive(it.n - 1);
                      }}
                      className={`hc-cell ${on ? "is-on" : ""}`}
                    >
                      <div className="hc-inner">
                        <span className="hc-num">{String(it.n).padStart(2, "0")}</span>
                        <span className="hc-name">{it.main}</span>
                        {it.local && <span className="hc-local">{it.local}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/** Counts from 0 up to `to` once it scrolls into view. */
export const CountUp = ({ to, className = "" }: { to: number; className?: string }) => {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {n}
    </span>
  );
};
