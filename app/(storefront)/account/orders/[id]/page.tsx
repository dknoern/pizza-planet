import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { getOrderForCustomer } from "@/lib/ordering/queries";
import { ApiError } from "@/lib/http/errors";
import { maskedFromLast4 } from "@/lib/payments/redact";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await resolveCustomer();
  if (!auth) redirect("/account/login");
  const { id } = await params;

  let order;
  try {
    order = await getOrderForCustomer(id, auth.customer.id);
  } catch (err) {
    if (err instanceof ApiError && err.code === "ORDER_NOT_FOUND") notFound();
    throw err;
  }

  return (
    <div className="section">
      <p style={{ marginBottom: 16 }}>
        <Link href="/account/orders" className="nav-link" style={{ color: "var(--text-secondary)" }}>
          ← Travel log
        </Link>
      </p>
      <div className="section-head">
        <div>
          <div className="eyebrow">Order · {order.orderNumber}</div>
          <h2>Manifest</h2>
          <div
            className="mono muted"
            style={{ fontSize: 11, letterSpacing: "0.2em", marginTop: 4 }}
          >
            PLACED · {new Date(order.createdAt).toLocaleString()} · STATUS {order.status}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Cargo</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {order.lines.map((l, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid var(--border-soft)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {l.menuItemName}
                  {l.sizeName ? ` · ${l.sizeName}` : ""}
                </div>
                {l.toppingNames.length > 0 ? (
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Toppings: {l.toppingNames.join(", ")}
                  </div>
                ) : null}
                <div
                  className="mono muted"
                  style={{ fontSize: 11, letterSpacing: "0.15em", marginTop: 4 }}
                >
                  ×{l.quantity}
                </div>
              </div>
              <div className="mono" style={{ fontWeight: 700, alignSelf: "center" }}>
                {formatCents(l.lineTotalCents)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: 6, marginTop: 16 }}>
          <div className="summary-line">
            <span>Subtotal</span>
            <span>{formatCents(order.subtotalCents)}</span>
          </div>
          <div className="summary-line">
            <span>Hyperspace Delivery</span>
            <span>{formatCents(order.deliveryFeeCents)}</span>
          </div>
          <div className="summary-line">
            <span>Galactic Tax</span>
            <span>{formatCents(order.taxCents)}</span>
          </div>
          <div className="summary-line total">
            <span>Total</span>
            <span>{formatCents(order.totalCents)}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Delivery coordinates</h3>
        <p style={{ color: "var(--text-secondary)" }}>
          {order.deliveryAddress.line1}
          {order.deliveryAddress.line2 ? `, ${order.deliveryAddress.line2}` : ""}
          <br />
          {order.deliveryAddress.city}, {order.deliveryAddress.state}{" "}
          {order.deliveryAddress.postalCode}
        </p>
        <h3 style={{ marginTop: 16 }}>Payment</h3>
        <p className="mono" style={{ color: "var(--text-secondary)" }}>
          {maskedFromLast4(order.payment.last4)} ({order.payment.brand}) ·{" "}
          {formatCents(order.payment.amountCents)} · auth {order.payment.authorizationId}
        </p>
      </div>
    </div>
  );
}
