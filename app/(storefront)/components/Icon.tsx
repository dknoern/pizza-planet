// Ported verbatim from Pizza Planet design (claude.ai/design).
// SVG icon set used across the cosmic UI.

type IconName =
  | "cart"
  | "user"
  | "arrow"
  | "check"
  | "map"
  | "clock"
  | "card"
  | "plus"
  | "sparkle"
  | "receipt"
  | "rocket";

const PATHS: Record<IconName, React.ReactNode> = {
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.5 11h11l2-8H6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12l5 5L20 7" />,
  map: (
    <>
      <path d="M9 3l-6 3v15l6-3 6 3 6-3V3l-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  card: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 11h20" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  sparkle: <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5z" />,
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  rocket: (
    <>
      <path d="M5 19c0-3 1-6 4-9s6-4 9-4c0 3-1 6-4 9s-6 4-9 4z" />
      <path d="M11 13l-3 3M16 8l-1.5 1.5" />
    </>
  ),
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
