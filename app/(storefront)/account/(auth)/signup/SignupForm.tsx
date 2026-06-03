"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "../../../components/Icon";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        setError(body.error?.message ?? "Sign-up failed.");
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
      <h3>Join the colony</h3>
      <p className="sub">Create an account to save addresses and skip checkout next time.</p>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <span
          className="mono muted"
          style={{ fontSize: 11, letterSpacing: "0.1em", marginTop: 4 }}
        >
          ≥ 8 chars, ≥ 1 letter, ≥ 1 digit
        </span>
      </div>
      {error ? <div className="error-line">⚠ {error}</div> : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? "Creating…" : (
          <>
            Create account <Icon name="arrow" size={14} />
          </>
        )}
      </button>
    </form>
  );
}
