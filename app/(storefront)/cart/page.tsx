"use client";

import Link from "next/link";
import { useCart } from "../components/CartProvider";
import { QtyStepper } from "../components/QtyStepper";
import { Icon } from "../components/Icon";
import { PizzaVisual } from "../components/PizzaVisual";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const DELIVERY_FEE_CENTS = 399;
const TAX_RATE = 0.0875;

export default function CartPage() {
  const { state, remove, setQuantity, displaySubtotalCents } = useCart();

  if (state.lines.length === 0) {
    return (
      <div className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">03 / Cart</div>
            <h2>Your Cargo Hold</h2>
          </div>
        </div>
        <div className="cart-empty" style={{ minHeight: 320 }}>
          <div className="cart-empty-icon">
            <Icon name="cart" size={28} />
          </div>
          <div style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            Your cargo hold is empty.
          </div>
          <div style={{ fontSize: 13 }}>Browse the menu and add something delicious.</div>
          <Link href="/menu" className="btn btn-ghost" style={{ marginTop: 12 }}>
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = displaySubtotalCents;
  const delivery = DELIVERY_FEE_CENTS;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + delivery + tax;

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">03 / Cart</div>
          <h2>Your Cargo Hold</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.2em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {state.lines.length} item{state.lines.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="cart-items" style={{ padding: 0, overflow: "visible" }}>
        {state.lines.map((line, i) => (
          <div key={i} className="cart-item">
            {line.displaySlug ? (
              <PizzaVisual
                pizza={{
                  slug: line.displaySlug,
                  sauce: line.displaySauce ?? null,
                  visualToppingIds: line.displayVisualToppingIds ?? [],
                }}
              />
            ) : (
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 25%, oklch(0.92 0.05 70), oklch(0.78 0.15 60) 35%, oklch(0.48 0.16 30) 70%, oklch(0.25 0.1 25) 100%)",
                }}
              />
            )}
            <div>
              <h4 className="cart-item-name">{line.displayName ?? line.menuItemId}</h4>
              <div className="cart-item-meta">
                Size {line.sizeId || "—"}
              </div>
              <div className="cart-item-actions">
                <QtyStepper value={line.quantity} onChange={(v) => setQuantity(i, v)} />
                <button type="button" className="cart-remove" onClick={() => remove(i)}>
                  Remove
                </button>
              </div>
            </div>
            <div className="cart-item-price">
              {formatCents((line.displayUnitPriceCents ?? 0) * line.quantity)}
            </div>
          </div>
        ))}
      </div>

      <div
        className="cart-summary"
        style={{ marginTop: 24, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-soft)" }}
      >
        <div className="summary-line">
          <span>Subtotal</span>
          <span>{formatCents(subtotal)}</span>
        </div>
        <div className="summary-line">
          <span>Hyperspace Delivery</span>
          <span>{formatCents(delivery)}</span>
        </div>
        <div className="summary-line">
          <span>Galactic Tax (8.75%)</span>
          <span>{formatCents(tax)}</span>
        </div>
        <div className="summary-line total">
          <span>Estimated Total</span>
          <span>{formatCents(total)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 14 }}>
          Proceed to launch <Icon name="rocket" size={14} />
        </Link>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginTop: 10,
            textAlign: "center",
          }}
        >
          Final total computed server-side at checkout.
        </div>
      </div>
    </div>
  );
}
