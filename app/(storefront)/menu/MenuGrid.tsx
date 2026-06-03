"use client";

import { useState } from "react";
import Link from "next/link";
import type { MenuItemPublic } from "@/lib/menu/types";
import { PizzaVisual } from "../components/PizzaVisual";
import { Icon } from "../components/Icon";

const CATEGORIES = [
  { id: "all", label: "All Planets" },
  { id: "classic", label: "Classic Orbit" },
  { id: "hot", label: "Solar Flares" },
  { id: "veg", label: "Verdant Worlds" },
] as const;

type Cat = (typeof CATEGORIES)[number]["id"];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function tagLabel(tag: string | null): { label: string; cls: string } | null {
  switch (tag) {
    case "hot":
      return { label: "★ Stellar Hot", cls: "hot" };
    case "veg":
      return { label: "◐ Plant-Based", cls: "veg" };
    case "classic":
      return { label: "◆ Classic", cls: "" };
    default:
      return null;
  }
}

function smallestPriceCents(item: MenuItemPublic): number {
  const sizeDeltas = item.sizes.length > 0 ? item.sizes.map((s) => s.priceDeltaCents) : [0];
  return item.basePriceCents + Math.min(...sizeDeltas);
}

export function MenuGrid({ items }: { items: MenuItemPublic[] }) {
  const [cat, setCat] = useState<Cat>("all");
  const filtered = items.filter((p) => cat === "all" || p.tag === cat);
  return (
    <div className="section" id="menu">
      <div className="section-head">
        <div>
          <div className="eyebrow">02 / Menu</div>
          <h2>Choose your trajectory</h2>
        </div>
        <div className="filter-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={"chip" + (cat === c.id ? " active" : "")}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pizza-grid">
        {filtered.map((item, idx) => {
          const tag = tagLabel(item.tag);
          return (
            <Link
              key={item.id}
              href={`/menu/${item.id}`}
              className={"pizza-card" + (idx === 0 && cat === "all" ? " featured" : "")}
            >
              {tag ? <span className={"pizza-tag " + tag.cls}>{tag.label}</span> : null}
              <PizzaVisual pizza={item} />
              <div>
                <h3>{item.name}</h3>
                <p className="pizza-desc">{item.description}</p>
              </div>
              <div className="pizza-foot">
                <div className="pizza-price">
                  <small>FROM</small>
                  {formatCents(smallestPriceCents(item))}
                </div>
                <span className="btn btn-ghost btn-sm">
                  Customize <Icon name="arrow" size={14} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
