"use client";

// Ported from Pizza Planet design — procedural pizza renderer.
// Reads sauce + visualToppingIds from the menu item and stamps shape-specific
// topping sprites on a cheese disc, seeded deterministically off the slug so
// re-renders never reshuffle.

import { useMemo, type CSSProperties } from "react";
import type { MenuItemPublic } from "@/lib/menu/types";

type ToppingShape =
  | "disc"
  | "blob"
  | "strip"
  | "square"
  | "ring"
  | "ring-thin"
  | "leaf"
  | "mushroom"
  | "wrinkly"
  | "mozz"
  | "crumble"
  | "flake"
  | "speck";

type ToppingStyle = {
  size: number;
  shape: ToppingShape;
  bg: string;
  border: string;
  speckle?: string[];
  rim?: boolean;
  vein?: string;
  ringColor?: string;
  veins?: string;
};

const TOPPING_STYLES: Record<string, ToppingStyle> = {
  pepperoni: {
    size: 14,
    shape: "disc",
    bg: "radial-gradient(circle at 35% 30%, #d85a3a, #a82820 80%)",
    border: "#3a0a0a",
    speckle: ["#6a1a1a", "#8a2020"],
    rim: true,
  },
  soppressata: {
    size: 13,
    shape: "disc",
    bg: "radial-gradient(circle at 35% 30%, #c83040, #8a1820 80%)",
    border: "#2a0612",
    speckle: ["#f5e8d4", "#d8b890"],
    rim: true,
  },
  sausage: {
    size: 9,
    shape: "blob",
    bg: "radial-gradient(circle at 35% 30%, #8a5a3a, #4a2818 90%)",
    border: "#2a1408",
  },
  brisket: {
    size: 10,
    shape: "blob",
    bg: "radial-gradient(circle at 30% 30%, #6a3018, #3a1808 90%)",
    border: "#1a0804",
  },
  bacon: {
    size: 13,
    shape: "strip",
    bg: "linear-gradient(90deg, #a83020 0%, #f0d4a0 30%, #8a2010 55%, #f0d4a0 75%, #a83020 100%)",
    border: "#3a0a05",
  },
  ham: {
    size: 11,
    shape: "square",
    bg: "radial-gradient(circle at 40% 35%, #f0a8a0, #c45a55 90%)",
    border: "#6a1a18",
  },
  "pepper-green": {
    size: 14,
    shape: "strip",
    bg: "linear-gradient(180deg, #4a9038 0%, #5aa840 40%, #38782a 100%)",
    border: "#1f4818",
  },
  "pepper-red": {
    size: 14,
    shape: "strip",
    bg: "linear-gradient(180deg, #d04020 0%, #e85838 40%, #a82810 100%)",
    border: "#601808",
  },
  onion: {
    size: 13,
    shape: "ring-thin",
    bg: "transparent",
    ringColor: "#e8d8b8",
    border: "#7a6a4a",
  },
  mushroom: {
    size: 12,
    shape: "mushroom",
    bg: "radial-gradient(ellipse at 50% 30%, #d8c4a0, #8a6a48 90%)",
    border: "#3a2818",
  },
  "olive-black": {
    size: 7,
    shape: "ring",
    bg: "#1a0a1a",
    ringColor: "#3a2030",
    border: "#000",
  },
  basil: {
    size: 11,
    shape: "leaf",
    bg: "radial-gradient(ellipse at 50% 30%, #4a9038, #2a6a20 70%)",
    border: "#1a3a14",
    vein: "#1a3a14",
  },
  spinach: {
    size: 10,
    shape: "leaf",
    bg: "radial-gradient(ellipse at 50% 30%, #3a7a28, #1a4a14 80%)",
    border: "#0a2a08",
  },
  "sun-dried": {
    size: 8,
    shape: "wrinkly",
    bg: "radial-gradient(circle at 35% 30%, #802820, #4a0a0a 90%)",
    border: "#1a0404",
  },
  "mozz-ball": {
    size: 12,
    shape: "mozz",
    bg: "radial-gradient(circle at 35% 30%, #fffaf0, #e8dcc4 90%)",
    border: "#b8a888",
  },
  cheddar: {
    size: 9,
    shape: "blob",
    bg: "radial-gradient(circle at 35% 30%, #f0a040, #c87018 90%)",
    border: "#6a3a08",
  },
  gorgonzola: {
    size: 11,
    shape: "crumble",
    bg: "#e8e0d4",
    border: "#a89878",
    veins: "#3a6840",
  },
  parmesan: {
    size: 6,
    shape: "flake",
    bg: "#f0e4c8",
    border: "#a8946a",
  },
  "chili-flake": {
    size: 3,
    shape: "speck",
    bg: "#d83018",
    border: "#7a1808",
  },
};

const SAUCE_STYLES: Record<string, { bg: string }> = {
  red: { bg: "radial-gradient(circle at 45% 40%, #c8301a 0%, #a82010 60%, #802008 100%)" },
  pesto: { bg: "radial-gradient(circle at 45% 40%, #5a8830 0%, #3a6820 60%, #284a18 100%)" },
  bbq: { bg: "radial-gradient(circle at 45% 40%, #783820 0%, #4a2010 60%, #2a1006 100%)" },
  white: { bg: "radial-gradient(circle at 45% 40%, #f0e0b8 0%, #d8c490 60%, #b8a060 100%)" },
};

type RandFn = () => number;

function makeRand(seedSrc: string, prime = 31): RandFn {
  let seed = 0;
  for (let i = 0; i < seedSrc.length; i++) {
    seed = (seed * prime + seedSrc.charCodeAt(i)) >>> 0;
  }
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 8) / 0xffffff;
  };
}

function CheeseBase({ rand }: { rand: RandFn }) {
  const melts = Array.from({ length: 6 }).map(() => {
    const a = rand() * Math.PI * 2;
    const r = 8 + rand() * 28;
    return {
      x: 50 + Math.cos(a) * r,
      y: 50 + Math.sin(a) * r,
      s: 8 + rand() * 12,
    };
  });
  const chars = Array.from({ length: 4 }).map(() => {
    const a = rand() * Math.PI * 2;
    const r = 15 + rand() * 22;
    return {
      x: 50 + Math.cos(a) * r,
      y: 50 + Math.sin(a) * r,
      s: 4 + rand() * 5,
    };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: "6%",
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 30%, #fff5d8 0%, #f0d894 50%, #d8b860 100%)",
        boxShadow:
          "inset 0 -8px 18px rgba(120, 60, 0, 0.18), inset 0 4px 14px rgba(255,240,200,0.4)",
        overflow: "hidden",
      }}
    >
      {melts.map((m, i) => (
        <div
          key={`m${i}`}
          style={{
            position: "absolute",
            left: m.x + "%",
            top: m.y + "%",
            width: m.s + "%",
            height: m.s + "%",
            background: "transparent",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "inset 0 0 6px rgba(180, 90, 0, 0.25)",
            filter: "blur(1px)",
            opacity: 0.7,
          }}
        />
      ))}
      {chars.map((c, i) => (
        <div
          key={`c${i}`}
          style={{
            position: "absolute",
            left: c.x + "%",
            top: c.y + "%",
            width: c.s + "%",
            height: c.s + "%",
            background: "rgba(60, 30, 0, 0.5)",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            filter: "blur(0.5px)",
          }}
        />
      ))}
    </div>
  );
}

function Topping({
  type,
  x,
  y,
  rotate,
  rand,
}: {
  type: string;
  x: number;
  y: number;
  rotate: number;
  rand: RandFn;
}) {
  const s = TOPPING_STYLES[type];
  if (!s) return null;
  const common: CSSProperties = {
    position: "absolute",
    left: x + "%",
    top: y + "%",
    width: s.size + "%",
    height: s.size + "%",
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))",
  };

  switch (s.shape) {
    case "disc":
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: s.rim ? `1.5px solid ${s.border}` : "none",
            borderRadius: "50%",
            boxShadow:
              "inset -2px -3px 4px rgba(0,0,0,0.35), inset 2px 2px 3px rgba(255,255,255,0.18)",
          }}
        >
          {s.speckle &&
            Array.from({ length: 3 + Math.floor(rand() * 2) }).map((_, i) => {
              const a = rand() * Math.PI * 2;
              const r = rand() * 28;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 50 + Math.cos(a) * r + "%",
                    top: 50 + Math.sin(a) * r + "%",
                    width: 18 + rand() * 14 + "%",
                    height: 18 + rand() * 14 + "%",
                    background:
                      s.speckle![Math.floor(rand() * s.speckle!.length)],
                    borderRadius: "50%",
                    transform: "translate(-50%, -50%)",
                    opacity: 0.85,
                  }}
                />
              );
            })}
        </div>
      );
    case "blob": {
      const br = `${50 + (rand() * 20 - 10)}% ${50 + (rand() * 20 - 10)}% ${50 + (rand() * 20 - 10)}% ${50 + (rand() * 20 - 10)}% / ${50 + (rand() * 20 - 10)}% ${50 + (rand() * 20 - 10)}% ${50 + (rand() * 20 - 10)}% ${50 + (rand() * 20 - 10)}%`;
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: br,
            boxShadow:
              "inset -2px -2px 3px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.15)",
          }}
        />
      );
    }
    case "strip":
      return (
        <div
          style={{
            ...common,
            height: s.size * 0.35 + "%",
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "60% / 200%",
            boxShadow:
              "inset -1px -1px 2px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.18)",
          }}
        />
      );
    case "square":
      return (
        <div
          style={{
            ...common,
            height: s.size * 0.85 + "%",
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "18%",
            boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.25)",
          }}
        />
      );
    case "ring":
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "50%",
            boxShadow: "inset -1px -1px 2px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "32%",
              background: "#f0d894",
              borderRadius: "50%",
              boxShadow: "inset 0 1px 1px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      );
    case "ring-thin":
      return (
        <div
          style={{
            ...common,
            background: "transparent",
            border: `2px solid ${s.ringColor}`,
            borderRadius: "50%",
            boxShadow: `inset 0 0 0 1px ${s.border}, 0 0 0 1px ${s.border}`,
            height: s.size * 0.6 + "%",
          }}
        />
      );
    case "leaf":
      return (
        <div
          style={{
            ...common,
            width: s.size * 0.6 + "%",
            height: s.size + "%",
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "50% 50% 50% 50% / 70% 70% 30% 30%",
            boxShadow:
              "inset -1px -2px 3px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.2)",
          }}
        >
          {s.vein && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "15%",
                bottom: "15%",
                width: "1px",
                background: s.vein,
                transform: "translateX(-50%)",
                opacity: 0.5,
              }}
            />
          )}
        </div>
      );
    case "mushroom":
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: "60% 60% 30% 30% / 80% 80% 30% 30%",
            boxShadow:
              "inset -1px -2px 3px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.2)",
          }}
        />
      );
    case "wrinkly": {
      const br = `${40 + rand() * 30}% ${40 + rand() * 30}% ${40 + rand() * 30}% ${40 + rand() * 30}%`;
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: br,
            boxShadow:
              "inset -1px -1px 3px rgba(0,0,0,0.5), inset 2px 2px 2px rgba(0,0,0,0.3)",
          }}
        />
      );
    }
    case "mozz": {
      const br = `${48 + rand() * 12}% ${48 + rand() * 12}% ${48 + rand() * 12}% ${48 + rand() * 12}%`;
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: br,
            boxShadow:
              "inset -2px -3px 4px rgba(140,110,60,0.3), inset 3px 3px 6px rgba(255,255,255,0.6)",
          }}
        />
      );
    }
    case "crumble": {
      const br = `${40 + rand() * 30}% ${40 + rand() * 30}% ${40 + rand() * 30}% ${40 + rand() * 30}%`;
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: br,
            boxShadow: "inset -1px -1px 2px rgba(100,80,40,0.4)",
            overflow: "hidden",
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: rand() * 80 + "%",
                top: rand() * 80 + "%",
                width: 20 + rand() * 25 + "%",
                height: 2 + rand() * 3 + "%",
                background: s.veins,
                borderRadius: "50%",
                transform: `rotate(${rand() * 180}deg)`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      );
    }
    case "flake":
      return (
        <div
          style={{
            ...common,
            height: s.size * 0.6 + "%",
            background: s.bg,
            border: `0.5px solid ${s.border}`,
            borderRadius: "30%",
            boxShadow: "inset -1px -1px 1px rgba(140,110,60,0.4)",
          }}
        />
      );
    case "speck":
      return (
        <div
          style={{
            ...common,
            background: s.bg,
            border: `0.5px solid ${s.border}`,
            borderRadius: "20%",
          }}
        />
      );
    default:
      return null;
  }
}

export function PizzaVisual({
  pizza,
  size = "100%",
}: {
  pizza: Pick<MenuItemPublic, "slug" | "sauce" | "visualToppingIds">;
  size?: string;
}) {
  const { toppings, cheeseRand } = useMemo(() => {
    const rand = makeRand(pizza.slug, 31);
    const placed: { type: string; x: number; y: number; rotate: number }[] = [];
    for (const type of pizza.visualToppingIds) {
      const style = TOPPING_STYLES[type];
      const minDist = style ? style.size * 0.55 : 6;
      let best: { type: string; x: number; y: number; rotate: number } | null = null;
      for (let attempt = 0; attempt < 18; attempt++) {
        const a = rand() * Math.PI * 2;
        const r = rand() * 32;
        const x = 50 + Math.cos(a) * r;
        const y = 50 + Math.sin(a) * r;
        const tooClose = placed.some((p) => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDist;
        });
        if (!tooClose || attempt === 17) {
          best = { type, x, y, rotate: rand() * 360 };
          break;
        }
      }
      if (best) placed.push(best);
    }
    const cheeseRand = makeRand(pizza.slug + ":cheese", 17);
    return { toppings: placed, cheeseRand };
  }, [pizza.slug, pizza.visualToppingIds]);

  const sauce = SAUCE_STYLES[pizza.sauce ?? "red"] ?? SAUCE_STYLES.red;
  const sauceMottling = useMemo(() => {
    const r = makeRand(pizza.slug + ":sauce", 11);
    return Array.from({ length: 5 }).map(() => ({
      x: 50 + (r() - 0.5) * 50,
      y: 50 + (r() - 0.5) * 50,
      s: 6 + r() * 10,
    }));
  }, [pizza.slug]);

  return (
    <div
      className="pizza-img"
      style={{
        width: size,
        background:
          "radial-gradient(circle at 30% 25%, #e8b860 0%, #c87830 40%, #6a3810 80%, #3a1808 100%)",
        boxShadow:
          "inset -10px -14px 26px rgba(40, 15, 0, 0.55), inset 6px 6px 14px rgba(255, 220, 150, 0.25), 0 10px 28px -10px rgba(0,0,0,0.65)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "8%",
          borderRadius: "50%",
          background: sauce.bg,
          boxShadow: "inset 0 0 12px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}
      >
        {sauceMottling.map((m, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: m.x + "%",
              top: m.y + "%",
              width: m.s + "%",
              height: m.s + "%",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              filter: "blur(2px)",
            }}
          />
        ))}
      </div>
      <CheeseBase rand={cheeseRand} />
      {toppings.map((t, i) => (
        <Topping key={i} type={t.type} x={t.x} y={t.y} rotate={t.rotate} rand={cheeseRand} />
      ))}
    </div>
  );
}
