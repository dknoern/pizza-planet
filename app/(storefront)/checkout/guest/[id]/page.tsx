import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/ordering/queries";
import { resolveGuestOrderToken } from "@/lib/ordering/guestToken";
import { ApiError } from "@/lib/http/errors";
import { maskedFromLast4 } from "@/lib/payments/redact";
import { Icon } from "../../../components/Icon";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function GuestConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; number?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const token = sp.token ?? "";

  const orderIdFromToken = await resolveGuestOrderToken(token);
  if (orderIdFromToken !== id) notFound();

  let order;
  try {
    order = await getOrderById(id);
  } catch (err) {
    if (err instanceof ApiError && err.code === "ORDER_NOT_FOUND") notFound();
    throw err;
  }

  console.log(
    `[email:stub] Guest order receipt would be emailed to ${order.guestContact?.email ?? "?"} for order ${order.orderNumber}`,
  );

  const totalPizzas = order.lines.reduce((acc, l) => acc + l.quantity, 0);
  const lookupHref = `/checkout/guest/${order.id}?token=${encodeURIComponent(token)}`;

  return (
    <div className="confirmation">
      <div className="confirmation-mark" aria-hidden="true">
        🍕
      </div>
      <h1>You&apos;re cleared for delivery.</h1>
      <p>
        We&apos;ve received your order. Reentry-shielded couriers are preparing for atmospheric descent.
      </p>
      <div className="order-id-card">
        <span className="label">Order ID</span>
        <span className="id">{order.orderNumber}</span>
      </div>
      <div className="eta-card">
        <div className="eta-stat">
          <span className="v">28–35 min</span>
          <span className="l">ETA</span>
        </div>
        <div className="eta-stat">
          <span className="v">{formatCents(order.totalCents)}</span>
          <span className="l">Total Charged</span>
        </div>
        <div className="eta-stat">
          <span className="v">{totalPizzas}</span>
          <span className="l">Pizzas en route</span>
        </div>
      </div>
      <div
        style={{
          background: "var(--bg-glass)",
          border: "1px solid var(--border-soft)",
          borderRadius: "var(--radius-md)",
          padding: 20,
          marginBottom: 32,
          maxWidth: 480,
          marginInline: "auto",
          textAlign: "left",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Bookmark this lookup link
        </div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
          The only way to retrieve this guest order. Token expires in 7 days. A receipt would be
          emailed to <span className="mono">{order.guestContact?.email}</span> (email send is stubbed
          in v1).
        </div>
        <code
          style={{
            display: "block",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-soft)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
            wordBreak: "break-all",
          }}
        >
          {lookupHref}
        </code>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            marginTop: 12,
          }}
        >
          Card on file: {maskedFromLast4(order.payment.last4)} ({order.payment.brand})
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/menu" className="btn btn-primary">
          Back to menu <Icon name="arrow" size={14} />
        </Link>
        <button className="btn btn-ghost" type="button" disabled>
          <Icon name="map" size={14} /> Track delivery
        </button>
      </div>
    </div>
  );
}
