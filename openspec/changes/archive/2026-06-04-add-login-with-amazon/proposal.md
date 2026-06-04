## Why

Customers signing up today must invent and remember another password — a friction point that drops conversions at the cart and clutters our credential store. Adding "Sign in with Amazon" lets returning Amazon shoppers (our exact target audience for a pizza ordering app) authenticate in one click using an identity they already trust, while existing email/password customers continue without disruption.

## What Changes

- Add a "Sign in with Amazon" button to the login and signup pages alongside the existing email/password forms.
- Add server-side OAuth 2.0 Authorization Code flow with PKCE against Login with Amazon (LWA), using new route handlers under `/api/auth/amazon/`.
- Extend the `Customer` model with an optional `amazonUserId` field (stable LWA `user_id`, e.g. `amzn1.account.…`) and a unique index so each Amazon account links to at most one customer.
- On callback, auto-link by verified email: if Amazon returns an email matching an existing `Customer.email`, attach `amazonUserId` to that record and sign in. Otherwise create a new customer with a random unguessable password hash placeholder (since LWA users never log in with a password).
- Persist authentication in the existing iron-session cookie — LWA tokens are read once to fetch the profile, then discarded (no refresh token storage).
- Configure two registered Allowed Return URLs on the LWA security profile: the production Amplify URL and a local-dev HTTPS tunnel.

## Capabilities

### New Capabilities
<!-- None. LWA fits within the existing customer-accounts capability since it is an additional sign-in path for the same identity. -->

### Modified Capabilities
- `customer-accounts`: Adds federated sign-in via Login with Amazon as an alternative to email/password. Existing email/password requirements are unchanged. New requirements cover the Amazon OAuth flow, the `amazonUserId` linkage, the auto-link-by-email rule, and security properties (CSRF state, PKCE, HTTPS-only redirect).

## Impact

- **Schema**: `Customer` gains an optional unique `amazonUserId: String?`. Existing rows backfill to `null` — non-breaking.
- **Code**:
  - New: `lib/auth/amazon.ts` (build authorize URL, exchange code, fetch profile), `app/api/auth/amazon/start/route.ts`, `app/api/auth/amazon/callback/route.ts`.
  - Modified: `lib/auth/session.ts` (no schema change, but session establishment shared), login/signup UI pages get a new button + divider.
- **External dependencies**: Requires an Amazon Developer account and a registered LWA Security Profile. No new npm packages needed (uses native `fetch`, `crypto`).
- **New environment variables**: `LWA_CLIENT_ID`, `LWA_CLIENT_SECRET`, `LWA_REDIRECT_URI` — set in the Amplify console (and `.env.local` for dev).
- **Local dev**: developers running LWA end-to-end need an HTTPS tunnel (e.g., ngrok) since LWA mandates HTTPS for redirect URIs. Email/password still works without it.
- **Non-goals**: No "Login with Google/Facebook" in this change. No use of LWA refresh tokens or further LWA API calls beyond the initial profile fetch. No automatic migration of existing email/password customers to LWA — they can self-link by signing in with Amazon using the same verified email.
