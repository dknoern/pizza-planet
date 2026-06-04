## Context

Pizza Planet currently authenticates customers via email/password using bcrypt (cost 12), with sessions persisted in iron-session HTTP-only cookies. Auth code lives in `lib/auth/` and the `Customer` model in `prisma/schema.prisma` uses MongoDB. The app deploys to AWS Amplify Hosting in SSR mode (Next.js 15 App Router).

This change adds Login with Amazon (LWA) as an additional sign-in option without disturbing the existing email/password flow. LWA is the user-facing branding for an OAuth 2.0 identity provider operated by Amazon; we will use the **Authorization Code grant with PKCE** as recommended for confidential server-side clients ([LWA web docs](https://developer.amazon.com/docs/login-with-amazon/web-docs.html)).

Decisions previously made with the user:
- LWA coexists with email/password (additional option, not a replacement).
- Auto-link by verified email when an LWA login matches an existing customer.
- Register both prod (Amplify) and a local-dev HTTPS tunnel as Allowed Return URLs.

## Goals / Non-Goals

**Goals:**
- One-click sign-in for visitors with an Amazon account, with no new password to remember.
- Preserve all existing email/password behavior (no spec regression in `customer-accounts`).
- Auto-link returning customers by email so users don't end up with duplicate accounts.
- Hold the `client_secret` server-side only. Do not load the LWA JavaScript SDK in the browser.
- Make the OAuth state CSRF-safe and protect against authorization-code interception (PKCE).
- Keep the same session mechanism (`lib/auth/session.ts` / iron-session) so downstream code (`requireCustomer`, API key paths) needs zero changes.

**Non-Goals:**
- Other federated identity providers (Google, Facebook, Apple). Each is a separate change.
- Long-lived LWA access. We don't store the `access_token` or `refresh_token`; this is "sign-in only," not "ongoing API access on the user's behalf."
- "Manage linked accounts" UI (unlink, re-link a different Amazon account). Out of scope; can be added later.
- Automatic migration of email/password customers to LWA. Users self-migrate by signing in with Amazon using the same verified email.
- Mobile/native apps (Pizza Planet is web-only today).

## Decisions

### D1. OAuth flow: Authorization Code with PKCE (S256), server-side exchange
LWA supports Authorization Code, Implicit (deprecated), and Device flows. We use Authorization Code with PKCE because:
- The Next.js server is a confidential client and can safely hold the `client_secret`.
- PKCE protects against authorization-code interception even though the code travels through the browser via redirect.
- The browser never sees the `access_token` or `client_secret`, so XSS in our app can't exfiltrate LWA credentials.

**Alternative considered**: LWA JavaScript SDK + Implicit grant. Rejected — Implicit is deprecated by LWA, requires the browser to handle tokens, and pulls in a third-party script.

### D2. Schema change: `Customer.amazonUserId String? @unique`
Add a single nullable, unique field. We use the LWA `user_id` (form `amzn1.account.…`) as the stable foreign key per the LWA profile docs.

- **Why not a separate `Identity` table?** Premature for one provider. If/when we add Google etc., we lift this into a `LinkedIdentity` collection. Single-field design now is reversible.
- **Why nullable?** All existing customers have no Amazon link, and most will never add one.
- **Why unique?** Prevents the same Amazon account from being attached to two different Pizza Planet customers.

### D3. Auto-link by verified email
When the LWA callback returns an email matching an existing `Customer.email` whose `amazonUserId` is null, attach `amazonUserId` and sign in. Rationale:
- LWA emails are verified by Amazon; we trust them enough to skip a separate verification step.
- Avoids creating a duplicate account for the most common case (existing customer now choosing LWA).

**Risk**: Amazon could in principle return an email a user previously claimed at Amazon but never proved. Mitigation: rely on Amazon's documented email-verification semantics; if this proves insufficient in production, fall back to "require manual linking" (a follow-up change).

### D4. Session strategy: reuse iron-session with `customerId` only
After successful LWA sign-in, call the existing session helper to set `customerId` in the iron-session cookie. We do **not** store the Amazon `access_token` or `refresh_token`. Consequences:
- `resolveCustomer` and `requireCustomer` need zero changes.
- The public API's Bearer-token path (`/api/auth/apiKey.ts`) is untouched.
- If a customer later wants to revoke LWA, we just clear `amazonUserId`; no token revocation is needed because we never held one.

### D5. Routes
- `GET /api/auth/amazon/start` — generates `state` + `code_verifier`, writes them to a short-lived signed cookie (`pp_lwa`), 302s to `https://www.amazon.com/ap/oa` with `client_id`, `scope=profile`, `response_type=code`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`. Accepts an optional `?next=<path>` (allowlisted to internal paths only) to remember where to send the customer after sign-in.
- `GET /api/auth/amazon/callback` — verifies `state` against the cookie, exchanges `code` + `code_verifier` at `https://api.amazon.com/auth/o2/token`, calls `https://api.amazon.com/user/profile`, runs the link-or-create logic, sets the session, clears `pp_lwa`, redirects to `next` (default `/`).

### D6. PKCE / state storage: signed cookie, not server-side store
We store `{ state, codeVerifier, next }` in a short-lived (10 min) HTTP-only, Secure, SameSite=Lax cookie named `pp_lwa`, signed with iron-session's existing secret (reuse `IRON_SESSION_PASSWORD`-equivalent — we'll use a sibling iron-session instance with a distinct cookie name).

- **Why not Redis / Mongo?** No new infra. Cookie-based round-trip is exactly the SSO scratchpad pattern.
- **Why a separate cookie from the main session?** Different lifetime (10 min vs. session), and we want it cleared on callback regardless of session success/failure.

### D7. Redirect URI strategy: two registered values
LWA requires exact match of the registered Allowed Return URL. We register:
- `https://<prod-amplify-domain>/api/auth/amazon/callback` — production
- `https://<dev-tunnel>.ngrok-free.app/api/auth/amazon/callback` — local dev via ngrok

The active value is read from `LWA_REDIRECT_URI` env at runtime, so each environment picks its own.

**Alternative considered**: localhost with a self-signed cert. Rejected — Amazon's docs don't guarantee a localhost exemption, and ngrok is simpler than managing a local CA.

### D8. New-user password handling
LWA-only customers never authenticate via password, but the existing `Customer` model has a required `passwordHash`. Rather than make `passwordHash` optional (which forces conditional logic everywhere), we store a 32-byte random hex hashed with bcrypt as a placeholder. It's a valid bcrypt hash; the customer just doesn't know any password that would match.

If the customer later sets a password (out-of-scope feature), the flow overwrites it normally.

### D9. UI changes (minimal)
- Add a "Sign in with Amazon" button on `/login`, `/signup`, and the cart/checkout page (only when the visitor is not yet authenticated). On `/login` and `/signup` it sits above the email/password form, separated by a horizontal divider with "or". On checkout it appears at the top of the "log in to continue" panel.
- The button is a plain `<a href="/api/auth/amazon/start?next=<currentPath>">` — no JS state, no SDK. The `next` value is rendered server-side from the request URL and validated by `isSafeNextPath`.
- No styling beyond Amazon's brand guidelines (button color, logo). We'll inline the Amazon "Login with Amazon" SVG mark.

## Risks / Trade-offs

- **Email-trust risk** → If Amazon's email verification ever weakens, auto-linking could allow an attacker who controls an Amazon account with someone else's email to take over their Pizza Planet account. Mitigation: rely on Amazon's verified-email semantics; if needed, switch to manual linking (a small spec/code change).
- **Phishing-callback risk** → Strict `state` + PKCE verification, plus exact-match `redirect_uri` registration, prevents most callback-injection variants. Mitigation: enforce HTTPS, reject mismatched/missing state with HTTP 400, never log `state` or `code` (only opaque error codes).
- **LWA outage** → If Amazon's endpoints are down, LWA sign-in fails but email/password keeps working. UI shows the error code (`LWA_EXCHANGE_FAILED`) with a "try again or use email/password" message. No retries beyond the user clicking again.
- **Account-takeover via session fixation** → We rotate iron-session on sign-in (existing behavior). LWA path uses the same session helper, so this is preserved.
- **Local dev friction** → Devs need ngrok (or similar) to test LWA end-to-end. Mitigation: document in the README; email/password is fully testable without it.
- **`client_secret` rotation** → Compromise of the secret requires rotating in the Amazon console and updating Amplify env vars. No code change needed.

## Migration Plan

1. Add the schema field (`amazonUserId`) with a unique index. Since it's nullable and brand-new, this is a non-breaking online migration. Apply via `prisma db push` (this project's current MongoDB migration mechanism per `pnpm db:push`).
2. Deploy the new code with LWA env vars **unset** in production. The new routes will return 503 (intentional guard) — UI does not yet show the button.
3. Register the LWA Security Profile, set the three env vars in Amplify, register both Allowed Return URLs.
4. Enable the UI (remove the env-gated guard or set a `NEXT_PUBLIC_LWA_ENABLED=1` flag) and redeploy.
5. **Rollback**: unset `LWA_CLIENT_ID` (forces the start route to 503 and hides the UI button). The schema change stays — non-breaking.

## Resolved Questions

- **R1.** No feature flag. Visibility is gated solely on `LWA_CLIENT_ID` being set in the runtime env: the `/api/auth/amazon/*` routes return 503 `LWA_NOT_CONFIGURED` when unset, and the UI hides the button.
- **R2.** "Sign in with Amazon" is shown on `/login`, `/signup`, **and** the cart/checkout page when the visitor is not authenticated. Rationale: cart abandonment is the highest-value moment to offer one-click sign-in. On the checkout page, the button replaces the "log in to continue" prompt; the email/password form remains visible below it.
- **R3.** Open-redirect protection for the `next=` parameter: `isSafeNextPath` returns true only when the value starts with `/`, does NOT start with `//` or `/\`, and contains no scheme (no `:` before the first `/`). All other inputs are dropped and the post-login redirect falls back to `/`.
