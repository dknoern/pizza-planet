"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartLineInput } from "../components/CartProvider";
import { Icon } from "../components/Icon";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const DELIVERY_FEE_CENTS = 399;
const TAX_RATE = 0.0875;

const STEPS = [
  { id: "coords", label: "Coordinates" },
  { id: "schedule", label: "Schedule" },
  { id: "payment", label: "Payment" },
] as const;

export function CheckoutForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { state, clear, displaySubtotalCents } = useCart();
  const [stepIdx, setStepIdx] = useState(0);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Nova Terra");
  const [stateCode, setStateCode] = useState("NT");
  const [postalCode, setPostalCode] = useState("90042");
  const [notes, setNotes] = useState("");

  const [timing, setTiming] = useState<"asap" | "scheduled">("asap");
  const [scheduledAt, setScheduledAt] = useState(
    new Date(Date.now() + 90 * 60 * 1000).toISOString().slice(0, 16),
  );

  const [cardNumber, setCardNumber] = useState("4111 1111 1111 1111");
  const [expMonth, setExpMonth] = useState("12");
  const [expYear, setExpYear] = useState("2030");
  const [cvv, setCvv] = useState("123");
  const [holderName, setHolderName] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = displaySubtotalCents;
  const delivery = DELIVERY_FEE_CENTS;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + delivery + tax;

  const itemsByLine = useMemo(() => state.lines, [state.lines]);

  function validateStep(): string | null {
    if (stepIdx === 0) {
      if (!signedIn && (!guestName || !guestEmail || !guestPhone)) {
        return "Fill in name, email, and phone to deliver.";
      }
      if (!line1 || !city || !stateCode || !postalCode) {
        return "Drop your delivery coordinates before launch.";
      }
      return null;
    }
    if (stepIdx === 1) {
      if (timing === "scheduled" && new Date(scheduledAt).getTime() < Date.now() + 30 * 60 * 1000) {
        return "Scheduled time must be at least 30 minutes out.";
      }
      return null;
    }
    return null;
  }

  async function onSubmit() {
    const stepErr = validateStep();
    if (stepErr) {
      setError(stepErr);
      return;
    }
    if (state.lines.length === 0) {
      setError("Your cargo hold is empty.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        cart: {
          lines: state.lines.map((l: CartLineInput) => ({
            menuItemId: l.menuItemId,
            sizeId: l.sizeId,
            toppingIds: l.toppingIds,
            quantity: l.quantity,
          })),
        },
        deliveryAddress: {
          line1,
          ...(line2 ? { line2 } : {}),
          city,
          state: stateCode,
          postalCode,
        },
        ...(signedIn
          ? {}
          : {
              guestContact: { name: guestName, email: guestEmail, phone: guestPhone },
            }),
        payment: {
          number: cardNumber,
          expMonth: Number(expMonth),
          expYear: Number(expYear),
          cvv,
          ...(holderName ? { holderName } : {}),
        },
      };

      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { order: { id: string; orderNumber: string }; guestToken?: string }
        | { error: { code: string; message: string } };

      if (!res.ok || "error" in json) {
        const msg = "error" in json ? json.error.message : "Order failed.";
        setError(msg);
        return;
      }

      clear();
      const order = json.order;
      if (json.guestToken) {
        router.push(
          `/checkout/guest/${order.id}?token=${encodeURIComponent(json.guestToken)}&number=${encodeURIComponent(order.orderNumber)}`,
        );
      } else {
        router.push(`/account/orders/${order.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function advance() {
    const stepErr = validateStep();
    if (stepErr) {
      setError(stepErr);
      return;
    }
    setError(null);
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  }

  return (
    <div className="checkout">
      <div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={"step" + (i === stepIdx ? " active" : i < stepIdx ? " complete" : "")}
            >
              <span className="step-num">{i < stepIdx ? "✓" : i + 1}</span>
              {s.label}
            </div>
          ))}
        </div>

        {stepIdx === 0 && (
          <>
            {!signedIn && (
              <div className="panel">
                <h3>Contact info</h3>
                <p className="sub">For order confirmation and courier ETA pings.</p>
                <div className="field">
                  <label>Name</label>
                  <input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Commander Reyes"
                  />
                </div>
                <div className="field-row">
                  <div className="field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@sector9.io"
                    />
                  </div>
                  <div className="field">
                    <label>Phone</label>
                    <input
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="(555) 010-2387"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="panel">
              <h3>Delivery coordinates</h3>
              <p className="sub">Reentry-shielded couriers from Pizza Planet · Sector 9.</p>
              <div className="field">
                <label>Street address</label>
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="2387 Nebula Way"
                />
              </div>
              <div className="field">
                <label>Apt / suite (optional)</label>
                <input value={line2} onChange={(e) => setLine2(e.target.value)} />
              </div>
              <div className="field-row-3">
                <div className="field">
                  <label>City</label>
                  <input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="field">
                  <label>State</label>
                  <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} />
                </div>
                <div className="field">
                  <label>Postal</label>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Delivery notes (optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Buzz 4B, dog on board, etc."
                />
              </div>
            </div>
          </>
        )}

        {stepIdx === 1 && (
          <div className="panel">
            <h3>When should we launch?</h3>
            <p className="sub">ASAP or schedule a future drop-off.</p>
            <div className="time-options">
              <button
                type="button"
                className={"time-option" + (timing === "asap" ? " active" : "")}
                onClick={() => setTiming("asap")}
              >
                <strong>ASAP</strong>
                <span>Avg. 28 min ETA</span>
              </button>
              <button
                type="button"
                className={"time-option" + (timing === "scheduled" ? " active" : "")}
                onClick={() => setTiming("scheduled")}
              >
                <strong>Schedule</strong>
                <span>Pick a future time</span>
              </button>
            </div>
            {timing === "scheduled" && (
              <div className="field" style={{ marginTop: 16 }}>
                <label>Scheduled arrival</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {stepIdx === 2 && (
          <div className="panel">
            <h3>Payment</h3>
            <p className="sub">
              Simulated processor. <span className="mono">4111 1111 1111 1111</span> approves;{" "}
              <span className="mono">4000 0000 0000 0002</span> declines. No real money moves.
            </p>
            <div className="payment-method-tabs">
              <button type="button" className="pm-tab active">
                <Icon name="card" size={12} /> Card
              </button>
              <button type="button" className="pm-tab" disabled>
                Cosmocoin
              </button>
              <button type="button" className="pm-tab" disabled>
                Cash on Drop
              </button>
            </div>
            <div className="field">
              <label>Card number</label>
              <input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4111 1111 1111 1111"
              />
            </div>
            <div className="field-row-3">
              <div className="field">
                <label>Exp month</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Exp year</label>
                <input
                  type="number"
                  min={2024}
                  max={2099}
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                />
              </div>
              <div className="field">
                <label>CVV</label>
                <input value={cvv} onChange={(e) => setCvv(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Name on card (optional)</label>
              <input value={holderName} onChange={(e) => setHolderName(e.target.value)} />
            </div>
          </div>
        )}

        {error ? <div className="error-line">⚠ {error}</div> : null}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {stepIdx > 0 ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
          ) : null}
          {stepIdx < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={advance}>
              Continue <Icon name="arrow" size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Launching…" : "Launch order"} <Icon name="rocket" size={14} />
            </button>
          )}
        </div>
      </div>

      <aside className="order-summary">
        <h4>Order summary</h4>
        {itemsByLine.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Your cart is empty.
          </p>
        ) : (
          <>
            {itemsByLine.map((line, i) => (
              <div key={i} className="os-item">
                <span className="name">
                  {line.displayName ?? line.menuItemId}
                  <small>· {line.sizeId || "—"} · ×{line.quantity}</small>
                </span>
                <span className="price">
                  {formatCents((line.displayUnitPriceCents ?? 0) * line.quantity)}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
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
              {timing === "scheduled" && (
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginTop: 12,
                  }}
                >
                  Scheduled for {new Date(scheduledAt).toLocaleString()}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
