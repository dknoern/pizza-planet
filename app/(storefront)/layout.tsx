import Image from "next/image";
import type { ReactNode } from "react";
import { resolveCustomer } from "@/lib/auth/requireCustomer";
import { CartProvider } from "./components/CartProvider";
import { Nav } from "./components/Nav";

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const auth = await resolveCustomer();
  return (
    <CartProvider>
      <div className="app">
        <Nav signedIn={!!auth} customerName={auth?.customer.name ?? null} />
        <main>{children}</main>
        <footer className="footer">
          <div>
            © 2387 Pizza Planet · Sector 9 · All rights reserved
            <span style={{ marginLeft: 12 }}>
              <a href="#">Privacy</a>
            </span>
            <span style={{ marginLeft: 12 }}>
              <a href="/docs">API docs</a>
            </span>
          </div>
          <div className="powered">
            <span>Powered by</span>
            <Image
              src="/slalom-logo.webp"
              alt="Slalom"
              width={64}
              height={18}
              style={{ height: 18, width: "auto" }}
            />
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
