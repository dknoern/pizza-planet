"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "./CartProvider";
import { Icon } from "./Icon";

export type NavProps = {
  signedIn: boolean;
  customerName: string | null;
};

function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true" />
      <div className="brand-name">
        Pizza Planet
        <small>EST. 2387 / SECTOR 9</small>
      </div>
    </div>
  );
}

export function Nav({ signedIn, customerName }: NavProps) {
  const { count, clear } = useCart();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const isMenu = pathname === "/" || pathname.startsWith("/menu");
  const isAccount = pathname.startsWith("/account/orders");
  const initial = (customerName?.trim().charAt(0) ?? "C").toUpperCase();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      // Drop client-side cart since it's tied to this session in spirit.
      clear();
      router.push("/menu");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <nav className="nav">
      <Link href="/menu" style={{ textDecoration: "none" }}>
        <Logo />
      </Link>
      <div className="nav-spacer" />
      <div className="nav-links">
        <Link href="/menu" className={"nav-link" + (isMenu ? " active" : "")}>
          Menu
        </Link>
        <Link href="/cart" className="nav-link">
          Order
        </Link>
        {signedIn ? (
          <Link
            href="/account/orders"
            className={"nav-link" + (isAccount ? " active" : "")}
          >
            Account
          </Link>
        ) : null}
        <span className="nav-link" style={{ opacity: 0.6, cursor: "default" }}>
          Support
        </span>
      </div>
      <div className="nav-actions">
        {signedIn ? (
          <>
            <Link
              href="/account/orders"
              className="btn-icon"
              aria-label="Account"
              title={customerName ?? "Account"}
            >
              <div
                className="avatar"
                style={{ width: 32, height: 32, fontSize: 13 }}
              >
                {initial}
              </div>
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              title="Sign out"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <Link href="/account/login" className="btn btn-ghost btn-sm">
            <Icon name="user" size={14} /> Sign In
          </Link>
        )}
        <Link href="/cart" className="btn-icon" aria-label="cart">
          <Icon name="cart" size={18} />
          {count > 0 ? <span className="cart-badge">{count}</span> : null}
        </Link>
      </div>
    </nav>
  );
}
