// Ported from the Pizza Planet design — server component, no interactivity.

import Link from "next/link";
import { Icon } from "./Icon";

export function Hero() {
  return (
    <div className="hero">
      <div>
        <div className="hero-eyebrow">Hot &amp; ready / Sector 9 hub</div>
        <h1>
          Pizza from <span className="glow">every</span> corner of the galaxy.
        </h1>
        <p>
          Hand-tossed dough, locally-sourced toppings from 17 nearby star systems,
          delivered by reentry-shielded courier in under 30 minutes.
        </p>
        <div className="hero-cta">
          <Link href="#menu" className="btn btn-primary">
            Order now <Icon name="arrow" size={14} />
          </Link>
          <Link href="/account/orders" className="btn btn-ghost">
            <Icon name="rocket" size={14} /> Track an order
          </Link>
        </div>
        <div className="hero-meta">
          <div className="hero-meta-item">
            <span className="hero-meta-value">
              28
              <small style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
                MIN
              </small>
            </span>
            <span className="hero-meta-label">Avg. ETA</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-value">
              4.9
              <small style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
                /5
              </small>
            </span>
            <span className="hero-meta-label">14k Reviews</span>
          </div>
          <div className="hero-meta-item">
            <span className="hero-meta-value">24/7</span>
            <span className="hero-meta-label">Open Now</span>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="planet">
          <div className="planet-ring" />
          <div className="planet-ring r2" />
          <div className="planet-orbit" />
        </div>
      </div>
    </div>
  );
}
