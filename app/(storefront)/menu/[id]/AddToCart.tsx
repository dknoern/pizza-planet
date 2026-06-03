"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../components/CartProvider";
import { QtyStepper } from "../../components/QtyStepper";
import { Icon } from "../../components/Icon";
import type { MenuItemPublic } from "@/lib/menu/types";

const SIZE_DIM: Record<string, string> = {
  S: '10"',
  M: '12"',
  L: '14"',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AddToCart({ item }: { item: MenuItemPublic }) {
  const router = useRouter();
  const { add } = useCart();
  const hasSizes = item.sizes.length > 0;
  const [sizeId, setSizeId] = useState<string>(
    hasSizes ? item.sizes.find((s) => s.id === "M")?.id ?? item.sizes[0].id : "",
  );
  const [qty, setQty] = useState(1);

  const unitPriceCents = useMemo(() => {
    const sizeDelta = hasSizes
      ? item.sizes.find((s) => s.id === sizeId)?.priceDeltaCents ?? 0
      : 0;
    return item.basePriceCents + sizeDelta;
  }, [item, sizeId, hasSizes]);

  function onAdd() {
    add({
      menuItemId: item.id,
      sizeId,
      toppingIds: [],
      quantity: qty,
      displayName: item.name,
      displayUnitPriceCents: unitPriceCents,
      displaySlug: item.slug,
      displaySauce: item.sauce,
      displayVisualToppingIds: item.visualToppingIds,
    });
    router.push("/cart");
  }

  return (
    <div>
      {hasSizes && (
        <>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Choose your size
          </div>
          <div className="size-selector">
            {item.sizes.map((s) => {
              const priceCents = item.basePriceCents + s.priceDeltaCents;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={"size-option" + (sizeId === s.id ? " active" : "")}
                  onClick={() => setSizeId(s.id)}
                >
                  <div className="size-label">{s.id}</div>
                  <div className="size-dim">{SIZE_DIM[s.id] ?? s.name}</div>
                  <div className="size-price">{formatCents(priceCents)}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="qty-row">
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Quantity
          </div>
          <QtyStepper value={qty} onChange={setQty} />
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Subtotal
          </div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
            {formatCents(unitPriceCents * qty)}
          </div>
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-block" onClick={onAdd}>
        <Icon name="plus" size={14} /> Add to orbit · {formatCents(unitPriceCents * qty)}
      </button>
    </div>
  );
}
