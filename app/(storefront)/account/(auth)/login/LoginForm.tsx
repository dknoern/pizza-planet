"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../../components/Icon";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? "Login failed.");
        return;
      }
      router.push("/account/orders");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel" style={{ maxWidth: 460 }}>
      <h3>Welcome back, traveler</h3>
      <p className="sub">Sign in to save addresses, payment, and travel log.</p>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <div className="error-line">⚠ {error}</div> : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Signing in…" : (
          <>
            Sign in <Icon name="arrow" size={14} />
          </>
        )}
      </button>
    </form>
  );
}
