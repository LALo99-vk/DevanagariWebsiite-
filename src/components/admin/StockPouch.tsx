import { useId } from "react";

/** Below this many packs a product counts as low on stock. */
export const LOW_STOCK = 10;
/** A full pouch on the gauge. Stock above this still reads as full. */
const FULL_STOCK = 100;

/**
 * Stock left, drawn as a stand-up pouch filled to its level. Forest ink when
 * healthy, brick when low. Fills up once on mount (skipped for reduced motion).
 */
const StockPouch = ({
  stock,
  size = "lg",
  className = "",
}: {
  stock: number;
  size?: "lg" | "sm";
  className?: string;
}) => {
  const clipId = `pouch-${useId().replace(/:/g, "")}`;
  const level = Math.max(0, Math.min(1, stock / FULL_STOCK));
  const low = stock < LOW_STOCK;
  const fill = low ? "#B4412F" : "#14402E";
  // Body spans y 14..96 inside the 64 x 100 box.
  const top = 14 + 82 * (1 - level);
  const body = "M9 14 H55 L58 84 Q58 96 46 96 H18 Q6 96 6 84 Z";
  const dims = size === "lg" ? "h-[150px] w-[96px]" : "h-9 w-6";

  return (
    <svg
      viewBox="0 0 64 100"
      className={`${dims} shrink-0 overflow-visible ${className}`}
      role="img"
      aria-label={low ? `${stock} left, low on stock` : `${stock} left`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={body} fill="#F1E9D8" />
      <g clipPath={`url(#${clipId})`}>
        <rect
          className="pouch-fill"
          x="0"
          y={top}
          width="64"
          height={100 - top}
          fill={fill}
        />
      </g>
      <path d={body} fill="none" stroke="#14402E" strokeWidth={size === "lg" ? 1.6 : 3} />
      {/* the pouch's sealed top */}
      <rect x="8" y="4" width="48" height="8" rx="2" fill="none" stroke="#14402E" strokeWidth={size === "lg" ? 1.6 : 3} />
      {size === "lg" && (
        <line x1="12" y1="8" x2="52" y2="8" stroke="#14402E" strokeWidth="1" strokeDasharray="2 2.5" opacity="0.6" />
      )}
    </svg>
  );
};

export default StockPouch;
