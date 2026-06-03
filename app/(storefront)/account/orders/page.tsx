import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { listOrdersForCustomer } from "@/lib/ordering/queries";
import { Icon } from "../../components/Icon";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function OrdersPage() {
  const auth = await resolveCustomer();
  if (!auth) redirect("/account/login");

  const { orders } = await listOrdersForCustomer(auth.customer.id, { pageSize: 50 });
  const initial = (auth.customer.name?.trim().charAt(0) ?? "C").toUpperCase();

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <div className="eyebrow">05 / Account</div>
          <h2>Travel log</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar">{initial}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{auth.customer.name}</div>
            <div className="mono muted" style={{ fontSize: 11, letterSpacing: "0.15em" }}>
              {auth.customer.email}
            </div>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            No orders yet. <Link href="/menu">Launch your first pizza</Link>.
          </p>
        </div>
      ) : (
        <div>
          {orders.map((o) => {
            const firstLine = o.lines[0];
            const totalQty = o.lines.reduce((acc, l) => acc + l.quantity, 0);
            return (
              <Link key={o.id} href={`/account/orders/${o.id}`} className="order-row">
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 30% 25%, oklch(0.92 0.05 70), oklch(0.78 0.15 60) 35%, oklch(0.48 0.16 30) 70%, oklch(0.25 0.1 25) 100%)",
                    boxShadow: "inset -6px -8px 14px rgba(0,0,0,0.5)",
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {firstLine?.menuItemName ?? "—"}
                    {totalQty > 1 ? ` +${totalQty - 1}` : ""}
                  </div>
                  <div
                    className="mono muted"
                    style={{ fontSize: 11, letterSpacing: "0.15em", marginTop: 4 }}
                  >
                    {o.orderNumber} · {new Date(o.createdAt).toLocaleString()}
                  </div>
                </div>
                <span
                  className={
                    "order-status" +
                    (o.status === "PLACED" || o.status === "IN_KITCHEN" || o.status === "OUT_FOR_DELIVERY"
                      ? " transit"
                      : "")
                  }
                >
                  {o.status}
                </span>
                <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>
                  {formatCents(o.totalCents)}
                  <Icon name="arrow" size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
