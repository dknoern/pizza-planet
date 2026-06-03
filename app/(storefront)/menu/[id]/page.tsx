import Link from "next/link";
import { notFound } from "next/navigation";
import { getMenuItem } from "@/lib/menu/queries";
import { ApiError } from "@/lib/http/errors";
import { PizzaVisual } from "../../components/PizzaVisual";
import { AddToCart } from "./AddToCart";

function tagPill(tag: string | null): { label: string; cls: string } | null {
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

export default async function MenuItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let item;
  try {
    item = await getMenuItem(id);
  } catch (err) {
    if (err instanceof ApiError && err.code === "MENU_ITEM_NOT_FOUND") notFound();
    throw err;
  }

  const tag = tagPill(item.tag);

  return (
    <div className="section">
      <p style={{ marginBottom: 16 }}>
        <Link href="/menu" className="nav-link" style={{ color: "var(--text-secondary)" }}>
          ← Back to menu
        </Link>
      </p>
      <div className="detail-grid">
        <div>
          <PizzaVisual pizza={item} />
          {tag ? (
            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
              <span className={"pizza-tag " + tag.cls} style={{ position: "static" }}>
                {tag.label}
              </span>
            </div>
          ) : null}
          {item.toppings.length > 0 ? (
            <div
              className="mono"
              style={{
                marginTop: 20,
                padding: "16px",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Manifest
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                {item.toppings.map((t) => t.name).join(" · ")}
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <h1>{item.name}</h1>
          <p className="desc">{item.description}</p>
          <AddToCart item={item} />
        </div>
      </div>
    </div>
  );
}
