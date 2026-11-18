import { useEffect, useId, useRef } from "react";

/**
 * The brand swoosh under the wordmark, drawn as a smile. A drop of milk hangs
 * from the lip, stretches and falls; the tongue reaches out, catches it on its
 * tip, curls up to lick, and slides back. A fresh drop forms for the next round.
 */
const LIP = "M28 24 Q587 134 1147 24"; // centre line of the smile band
const CYCLE = "5.2s";
const EASE = "0.45 0 0.2 1";
const splines = (n: number) => Array(n).fill(EASE).join(";");

// Tongue poses, all built from the same four curves so they morph smoothly.
// Anchor (0,0) sits on the lip; +y hangs down; the tip curls up-left to lick.
const TONGUE = {
  // hanging straight down from the lip
  straight:
    "M-26 -6 C-28 20 -22 44 -10 56 C-4 62 4 62 10 56 C22 44 28 20 26 -6 C10 -10 -10 -10 -26 -6 Z",
  // reaching down-left to catch the falling drop
  reach:
    "M-26 -6 C-28 24 -36 52 -50 70 C-58 80 -48 92 -36 86 C-14 74 26 30 26 -6 C10 -10 -10 -10 -26 -6 Z",
  // swinging left, tip pointing down-left
  bend:
    "M-26 -6 C-30 14 -36 30 -46 40 C-54 48 -46 60 -32 56 C-12 50 26 26 26 -6 C10 -10 -10 -10 -26 -6 Z",
  // J-shape: the belly hangs, the tip curls up onto the lip
  curl:
    "M-26 -6 C-34 10 -48 14 -58 4 C-64 -2 -76 12 -66 26 C-50 52 24 52 26 -6 C10 -10 -10 -10 -26 -6 Z",
  // the tip reaches further along the lip
  flick:
    "M-26 -6 C-36 8 -54 10 -66 -2 C-74 -6 -84 10 -74 24 C-58 54 24 54 26 -6 C10 -10 -10 -10 -26 -6 Z",
};
const GROOVE = {
  straight: "M0 8 C0 22 0 34 0 46",
  reach: "M-4 8 C-10 30 -24 56 -40 76",
  bend: "M-4 8 C-8 24 -20 36 -34 44",
  curl: "M-4 10 C-8 30 -30 36 -50 24",
  flick: "M-4 10 C-8 32 -38 38 -60 20",
};
type Pose = keyof typeof TONGUE;

// Gold sparkles after the lick: position, size and moment in the cycle
const SPARKLES = [
  { x: 762, y: 112, size: 3.4, at: 0.47 },
  { x: 818, y: 102, size: 2.2, at: 0.5 },
  { x: 720, y: 98, size: 1.8, at: 0.52 },
  { x: 1134, y: -4, size: 3.2, at: 0.55 },
  { x: 1106, y: 20, size: 1.3, at: 0.58 },
  { x: 1158, y: -26, size: 1.1, at: 0.6 },
];
// the corner sparkle also sends out a ring
const BURST = { x: 1134, y: -4, at: 0.55 };
// out · reach under the drop · catch · curl up and lick · tuck in where it ends
const TONGUE_SEQ: Pose[] = ["straight", "straight", "reach", "curl", "flick", "curl", "curl", "straight", "straight"];
const TONGUE_KEYS = "0;0.1;0.23;0.29;0.33;0.38;0.45;0.6;1";

// Where the drop hangs, and the tongue tip in its reach pose (local units)
const DROP = { x: 758, y: 78, h: 29 };
const REACH_TIP = { x: -46, y: 84 };
const HOME = 0.788; // tongue's resting spot along the lip
const SWEEP = "0.42 0 0.58 1"; // symmetric ease for the lick sweep
const lipY = (x: number) => {
  const t = (x - 28) / 1119;
  return (1 - t) ** 2 * 24 + 2 * t * (1 - t) * 134 + t * t * 24;
};
// underside of the smile band, where drops hang from
const lipBottom = (x: number) => {
  const t = (x - 28) / 1119;
  return (1 - t) ** 2 * 18 + 2 * t * (1 - t) * 156 + t * t * 18;
};
const DROP_PATH = "M0 0 C-4 8 -9 14 -9 20 A9 9 0 0 0 9 20 C9 14 4 8 0 0 Z";
// tiny droplets thrown up by a splash
const SPRAY = [
  [-16, -12],
  [-6, -19],
  [6, -18],
  [16, -10],
];

const LickingSmile = ({
  active,
  repeat,
  playRef,
  k = 1,
}: {
  active: boolean;
  repeat: boolean;
  playRef?: React.MutableRefObject<(() => void) | null>;
  /** size of tongue, milk and sparkles relative to the letters */
  k?: number;
}) => {
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const url = (name: string) => `url(#${id(name)})`;
  const REPEAT = repeat ? "indefinite" : "1";

  // Park the tongue so its tip sits right under the drop, and drop it that far
  const tipX = REACH_TIP.x * 1.22 * k;
  const tipY = REACH_TIP.y * 1.22 * k;
  const anchorX = DROP.x - tipX;
  const catchAt = (anchorX - 28) / 1119;
  // a symmetric ease reaches halfway at the midpoint (t = 0.23), so aim the
  // far end of the sweep twice as far out: the tongue passes the catch point
  // at exactly the moment the drop lands, without stopping
  const farLeft = (HOME - 2 * (HOME - catchAt)).toFixed(3);
  const fall = ((lipY(anchorX) + tipY - (DROP.y + DROP.h * k)) / k).toFixed(1);
  const catchY = DROP.y + (DROP.h + Number(fall)) * k;

  // second drop: hangs where the curled tip sweeps up onto the lip (t ≈ 0.3,
  // when the sweep is ~88% of the way out)
  const anchorB = 28 + (HOME - 0.88 * (HOME - Number(farLeft))) * 1119;
  const dropBx = anchorB - 72 * 1.22 * k;
  const dropBy = lipBottom(dropBx) - 2;
  // third drop: drips off the right of the smile and splashes
  const dropCx = 1040;
  const dropCy = lipBottom(dropCx) - 2;
  const fallC = 70;
  const splashCy = dropCy + (DROP.h + fallC) * 0.8 * k;

  const anim = (props: Record<string, string>) => ({
    begin: "indefinite",
    dur: CYCLE,
    repeatCount: REPEAT,
    ...props,
  });

  const Splash = ({ x, y, at }: { x: number; y: number; at: number }) => (
    <g transform={`translate(${x} ${y})`}>
      {SPRAY.map(([dx, dy], i) => (
        <circle key={i} r={2.4 * k} fill={url("milk")} opacity="0">
          <animateTransform
            attributeName="transform"
            type="translate"
            {...anim({
              values: `0 0;0 0;${dx * k} ${dy * k};${dx * k * 1.3} ${(dy + 10) * k};0 0`,
              keyTimes: `0;${at};${at + 0.035};${at + 0.07};1`,
            })}
          />
          <animate
            attributeName="opacity"
            {...anim({
              values: "0;0;1;0;0",
              keyTimes: `0;${at};${at + 0.01};${at + 0.07};1`,
            })}
          />
        </circle>
      ))}
    </g>
  );

  useEffect(() => {
    const svg = ref.current;
    if (!active || !svg) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // start every animation on the same tick so they stay in sync
    const play = () =>
      svg
        .querySelectorAll<SVGAnimationElement>("animate, animateMotion, animateTransform")
        .forEach((el) => el.beginElement());
    if (playRef) playRef.current = play;
    const first = window.setTimeout(play, 1000);
    // one-shot mode: lick again every so often, and whenever the tab comes back
    const again = repeat ? 0 : window.setInterval(play, 8000);
    const onVisible = () => document.visibilityState === "visible" && play();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      if (again) window.clearInterval(again);
      document.removeEventListener("visibilitychange", onVisible);
      if (playRef) playRef.current = null;
    };
  }, [active, repeat, playRef]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 1175 160"
      preserveAspectRatio="xMidYMid meet"
      className={`licking-smile ${active ? "is-on" : ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id("smile-gold")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D9B26A" />
          <stop offset="0.4" stopColor="#F3E6C6" />
          <stop offset="0.7" stopColor="#C9A45C" />
          <stop offset="1" stopColor="#A37C38" />
        </linearGradient>
        <radialGradient id={id("sparkle-halo")}>
          <stop offset="0" stopColor="#FFF8E6" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#F3E6C6" stopOpacity="0.28" />
          <stop offset="1" stopColor="#F3E6C6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("glint")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={id("smile-clip")}>
          <path d="M28 18 Q587 156 1147 18 Q1158 14 1150 30 Q587 112 26 30 Q18 22 28 18 Z" />
        </clipPath>
        <radialGradient id={id("milk")} cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#FBF6EA" />
          <stop offset="1" stopColor="#E9DFC9" />
        </radialGradient>
      </defs>

      {/* tongue: rides the lip's curve, bends and curls its tip up to lick */}
      <g>
        <animateMotion
          path={LIP}
          rotate="auto"
          begin="indefinite"
          dur={CYCLE}
          repeatCount={REPEAT}
          keyPoints={`${HOME};${HOME};${farLeft};${farLeft};${HOME};${HOME}`}
          keyTimes="0;0.1;0.36;0.6;0.601;1"
          calcMode="spline"
          keySplines={`0 0 1 1;${SWEEP};0 0 1 1;0 0 1 1;0 0 1 1`}
        />
        <g transform={`scale(${1.22 * k})`}>
        <g transform="scale(1 0)">
          <animateTransform
            attributeName="transform"
            type="scale"
            begin="indefinite"
            dur={CYCLE}
            repeatCount={REPEAT}
            values="1 0;1 0;1 1;1 1;1 0;1 0"
            keyTimes="0;0.04;0.1;0.38;0.45;1"
            calcMode="spline"
            keySplines={splines(5)}
          />
          <path d={TONGUE.straight} fill="#C0695A">
            <animate
              attributeName="d"
              begin="indefinite"
              dur={CYCLE}
              repeatCount={REPEAT}
              values={TONGUE_SEQ.map((k) => TONGUE[k]).join(";")}
              keyTimes={TONGUE_KEYS}
              calcMode="spline"
              keySplines={splines(TONGUE_SEQ.length - 1)}
            />
          </path>
          <path d={GROOVE.straight} stroke="#8E4436" strokeWidth="3.5" strokeLinecap="round" fill="none">
            <animate
              attributeName="d"
              begin="indefinite"
              dur={CYCLE}
              repeatCount={REPEAT}
              values={TONGUE_SEQ.map((k) => GROOVE[k]).join(";")}
              keyTimes={TONGUE_KEYS}
              calcMode="spline"
              keySplines={splines(TONGUE_SEQ.length - 1)}
            />
          </path>
        </g>
        </g>
      </g>

      {/* a drop of milk: hangs, stretches, falls onto the tongue tip, re-forms */}
      <g transform={`translate(${DROP.x} ${DROP.y}) scale(${k})`}>
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            begin="indefinite"
            dur={CYCLE}
            repeatCount={REPEAT}
            values={`0 0;0 0;0 ${fall};0 ${fall};0 0;0 0`}
            keyTimes="0;0.115;0.235;0.6;0.601;1"
            calcMode="spline"
            keySplines="0 0 1 1;0.55 0 1 0.6;0 0 1 1;0 0 1 1;0 0 1 1"
          />
          <g>
            <animateTransform
              attributeName="transform"
              type="scale"
              begin="indefinite"
              dur={CYCLE}
              repeatCount={REPEAT}
              values="1 1;1 1.28;0.92 1.12;0.92 1.12;0 0;0 0;1 1;1 1"
              keyTimes="0;0.105;0.13;0.23;0.245;0.7;0.88;1"
              calcMode="spline"
              keySplines={splines(7)}
            />
            <path d={DROP_PATH} fill={url("milk")} />
            <ellipse cx="-3" cy="18" rx="2" ry="3" fill="#FFFFFF" opacity="0.8" />
          </g>
        </g>
      </g>
      <Splash x={DROP.x} y={catchY} at={0.235} />

      {/* second drop: wobbles on the lip, scooped up by the curling tip */}
      <g transform={`translate(${dropBx} ${dropBy}) scale(${0.7 * k})`}>
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            {...anim({
              values: "1 1;1 1.2;1 0.95;1 1.1;0 0;0 0;1 1;1 1",
              keyTimes: "0;0.14;0.21;0.27;0.305;0.72;0.9;1",
              calcMode: "spline",
              keySplines: splines(7),
            })}
          />
          <path d={DROP_PATH} fill={url("milk")} />
        </g>
      </g>

      {/* third drop: drips off the right of the smile and splashes */}
      <g transform={`translate(${dropCx} ${dropCy}) scale(${0.8 * k})`}>
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            {...anim({
              values: `0 0;0 0;0 ${fallC};0 ${fallC};0 0;0 0`,
              keyTimes: "0;0.3;0.4;0.6;0.601;1",
              calcMode: "spline",
              keySplines: "0 0 1 1;0.55 0 1 0.6;0 0 1 1;0 0 1 1;0 0 1 1",
            })}
          />
          <g>
            <animateTransform
              attributeName="transform"
              type="scale"
              {...anim({
                values: "1 1;1 1;1 1.3;0.9 1.15;0 0;0 0;1 1;1 1",
                keyTimes: "0;0.22;0.3;0.395;0.405;0.74;0.92;1",
                calcMode: "spline",
                keySplines: splines(7),
              })}
            />
            <path d={DROP_PATH} fill={url("milk")} />
          </g>
        </g>
      </g>
      <Splash x={dropCx} y={splashCy} at={0.4} />

      {/* smile: a crescent, thick in the middle and tapering at the corners.
          After the lick it gives a quick, satisfied grin. */}
      <g transform="translate(587 70)">
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            begin="indefinite"
            dur={CYCLE}
            repeatCount={REPEAT}
            values="1 1;1 1;1.03 1.65;1.03 1.65;0.99 0.88;1.01 1.12;1 1;1 1"
            keyTimes="0;0.45;0.5;0.56;0.61;0.65;0.7;1"
            calcMode="spline"
            keySplines={splines(7)}
          />
          <g transform="translate(-587 -70)">
            <path
              className="ls-smile"
              d="M28 18 Q587 156 1147 18 Q1158 14 1150 30 Q587 112 26 30 Q18 22 28 18 Z"
              fill={url("smile-gold")}
            />
          </g>
        </g>
      </g>

      {/* a gold glint runs along the smile, from the milk to the corner */}
      <g clipPath={url("smile-clip")}>
        <rect x="-140" y="0" width="140" height="160" fill={url("glint")} opacity="0">
          <animate
            attributeName="x"
            begin="indefinite"
            dur={CYCLE}
            repeatCount={REPEAT}
            values="660;660;1180;1180"
            keyTimes="0;0.46;0.56;1"
            calcMode="spline"
            keySplines={splines(3)}
          />
          <animate
            attributeName="opacity"
            begin="indefinite"
            dur={CYCLE}
            repeatCount={REPEAT}
            values="0;0;1;1;0;0"
            keyTimes="0;0.46;0.48;0.53;0.56;1"
          />
        </rect>
      </g>

      {/* ring burst from the corner sparkle */}
      <circle cx={BURST.x} cy={BURST.y} r="4" fill="none" stroke="#F3E6C6" strokeWidth={2 * k} opacity="0">
        <animate
          attributeName="r"
          begin="indefinite"
          dur={CYCLE}
          repeatCount={REPEAT}
          values={`4;4;${46 * k};${46 * k}`}
          keyTimes={`0;${BURST.at};${BURST.at + 0.09};1`}
          calcMode="spline"
          keySplines="0 0 1 1;0.2 0.8 0.3 1;0 0 1 1"
        />
        <animate
          attributeName="opacity"
          begin="indefinite"
          dur={CYCLE}
          repeatCount={REPEAT}
          values="0;0;0.9;0;0"
          keyTimes={`0;${BURST.at};${BURST.at + 0.01};${BURST.at + 0.09};1`}
        />
      </circle>

      {/* sparkles where the milk was, and at the corner of the mouth */}
      {SPARKLES.map((sp, i) => (
        <g key={i} transform={`translate(${sp.x} ${sp.y})`}>
          <g transform="scale(0)">
            <animateTransform
              attributeName="transform"
              type="scale"
              begin="indefinite"
              dur={CYCLE}
              repeatCount={REPEAT}
              values={`0;0;${sp.size * k};${sp.size * k * 0.75};0;0`}
              keyTimes={`0;${sp.at};${sp.at + 0.035};${sp.at + 0.08};${sp.at + 0.13};1`}
              calcMode="spline"
              keySplines={splines(5)}
            />
            <circle r="13" fill={url("sparkle-halo")} />
            <path
              d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z"
              fill="#FFF8E6"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                begin="indefinite"
                dur={CYCLE}
                repeatCount={REPEAT}
                values="0;0;45;45"
                keyTimes={`0;${sp.at};${sp.at + 0.13};1`}
              />
            </path>
          </g>
        </g>
      ))}
    </svg>
  );
};


/**
 * "Devanagari" in gold with the smile that licks milk off its lip.
 * `repeat` loops continuously; otherwise it plays on mount, on hover and every 12s.
 */
export const LickingWordmark = ({
  className = "",
  active = true,
  repeat = false,
  k = 1,
}: {
  className?: string;
  active?: boolean;
  repeat?: boolean;
  /** enlarge the tongue, milk and sparkles; useful at small sizes */
  k?: number;
}) => {
  const playRef = useRef<(() => void) | null>(null);
  return (
    <span
      className={`relative inline-block font-display font-light italic leading-[0.95] tracking-[-0.03em] ${className}`}
      onMouseEnter={() => playRef.current?.()}
    >
      <span className="text-foil px-[0.12em]">Devanagari</span>
      <LickingSmile active={active} repeat={repeat} playRef={playRef} k={k} />
    </span>
  );
};
