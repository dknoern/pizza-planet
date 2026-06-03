## Context

The `pizza-planet` repo is empty save for OpenSpec scaffolding. We are bootstrapping a customer-facing pizza ordering platform in a single full-stack Next.js application. The stack is constrained by the proposal: Next.js (App Router) for both UI and API, MongoDB for persistence, Prisma as the ORM, server components as the default rendering model, and a shared domain library reused between server components and the public REST API. There is no legacy code to migrate, but every architectural decision we make here will set the convention for every later change in this repo.

Two opinionated constraints shape the rest of the design:

1. **One copy of every business rule.** Pricing, auth, and order placement must live in `lib/` and be called from both server components and `/api/v1/*` route handlers. The API must never be a thin re-implementation of the UI logic.
2. **Server components by default.** Read paths (menu, order history, profile) render on the server with no client-side data fetching. Only interactive surfaces (cart, checkout form, login form) become client components.

## Goals / Non-Goals

**Goals:**
- Working sign-up, login, logout, menu browsing, ordering (authenticated + guest), order history, and simulated checkout — all reachable in the browser AND callable from `/api/v1/*`.
- A single `lib/` package that both the UI and the public API depend on, so behavior cannot drift.
- A swappable `PaymentProcessor` interface with a deterministic simulator implementation, so a real gateway can be wired in later by changing one binding.
- Passwords stored only as bcrypt/argon2 hashes; raw card data never persisted or logged.
- Clear conventions (folder layout, validation at boundary, error envelope) that all future features inherit.

**Non-Goals:**
- Real payment integration (Stripe, etc.) — explicitly out of scope; the simulator stands in.
- Admin/back-office UI (menu CRUD, order fulfillment dashboard). Menu is seeded; orders are append-only for v1.
- Real-time order tracking, push notifications, SMS, email.
- Multi-tenant or multi-store support — single store only for v1.
- Production deployment automation (Docker images, CI/CD pipelines, infrastructure-as-code) — local dev + a `README` deploy guide is enough for v1.
- Internationalization, accessibility audit beyond semantic HTML defaults.

## Decisions

### 1. Next.js App Router (TypeScript) as the single deployable
We use the App Router (`app/`) rather than the Pages Router. Server Components are the default; route handlers under `app/api/v1/*/route.ts` serve the public API. A single Next.js app is deployable as one process and one container, which matches v1's complexity.

**Alternative considered:** Splitting UI and API into two services (e.g. Next.js + a standalone Express/Nest API). Rejected because the proposal explicitly calls for shared code between the two, and a monorepo split adds build, deploy, and type-sync overhead with no v1 benefit.

### 2. MongoDB + Prisma, accepting Prisma's Mongo limitations
The proposal pins MongoDB and Prisma. Prisma's MongoDB connector does not support cross-collection transactions or relational referential integrity at the DB level. We mitigate by:
- Modeling `Order` with an **embedded** `lines: OrderLine[]` array and an **embedded** `payment` document — so an order writes atomically as one document.
- Using string ObjectId references (`customerId`) rather than enforced foreign keys, validated in `lib/` instead.
- Treating Orders as **append-only**; status transitions are an `events: OrderEvent[]` array appended to the same document.

**Alternative considered:** PostgreSQL + Prisma. Better relational story, real transactions, cheaper hosted tiers. Rejected because the proposal pins MongoDB.

**Alternative considered:** Mongoose. Rejected because Prisma is pinned and gives us typed clients consumable from both server components and API routes with no extra plumbing.

### 3. Folder layout
```
app/                       # Next.js App Router (UI + API routes)
  (storefront)/            # Server-component pages: menu, cart, checkout, account
  api/v1/                  # Route handlers — thin adapters over lib/
prisma/
  schema.prisma            # Mongo data model
lib/                       # SHARED domain code — UI and API both import from here
  auth/                    # signup, login, session, password hashing
  menu/                    # catalog reads, pricing helpers
  ordering/                # cart pricing, placeOrder(), order queries
  payments/                # PaymentProcessor interface + SimulatedPaymentProcessor
  http/                    # error envelope, zod schemas, request helpers
  db.ts                    # PrismaClient singleton
tests/
```

**Rule:** Anything inside `app/api/v1/*/route.ts` is a thin adapter — parse input with a `lib/http` zod schema, call into `lib/<domain>`, format the result with the shared error envelope. No business logic in route handlers. The same rule applies to server-component pages.

### 4. Auth: cookie sessions for the UI, bearer tokens for integrators
- UI sessions: signed, HTTP-only, SameSite=Lax cookies via `iron-session` (or `jose`-signed JWT in a cookie). 30-day rolling expiry.
- API integrators: opaque bearer tokens (`pp_live_<random>`) issued per customer account, stored as a hash in an `ApiKey` collection, presented as `Authorization: Bearer <token>`. v1 ships only a manual creation path; a self-service UI is out of scope.
- Both resolve to the same `requireCustomer(req)` helper that returns the authenticated `Customer` or throws `UNAUTHENTICATED`.

**Alternative considered:** OAuth2 / NextAuth. Rejected as overkill for v1's single email/password identity model; we can layer NextAuth in later without breaking the cookie contract because everything goes through `requireCustomer`.

### 5. Password hashing: bcrypt with cost 12
bcrypt has wide library support, runs in Node natively, and cost 12 is the current OWASP recommendation for interactive logins. We allow swapping to argon2 later by routing all hash/verify calls through `lib/auth/password.ts`.

### 6. Payment simulation
A single `PaymentProcessor` interface in `lib/payments/processor.ts`, implemented by `SimulatedPaymentProcessor`. The processor is selected by `PAYMENT_SIM_MODE` env var (default `simulator`) and injected via a `getPaymentProcessor()` factory. Test cards: `4111 1111 1111 1111` → APPROVED, `4000 0000 0000 0002` → DECLINED, all other Luhn-valid cards → APPROVED. The full PAN is accepted by the form, used once for Luhn + simulation, then dropped — only `last4`, `brand`, and `authorizationId` ever reach Prisma.

### 7. Guest orders
Guest orders are persisted with `customerId: null` and a `guestContact { name, email, phone }` document. Upon creation, the system returns a signed `guestOrderToken` (JWT, 7-day expiry, scoped to the order id) that the guest can use to look up the order. The token is shown on the confirmation page and emailed (email sending is **stubbed** in v1 — we log it).

### 8. Validation, error envelope, and "unknown fields" policy
- All boundary input passes through a `zod` schema in `lib/http/schemas/`.
- Schemas are `.strict()` — **unknown fields are rejected** with `VALIDATION_FAILED`. This is the project-wide policy referenced by the `public-api` spec.
- All errors are returned via `lib/http/errors.ts` as `{ error: { code, message, details? } }`.

### 9. Server Components vs Client Components
- Server-rendered (RSC): `/menu`, `/menu/[id]`, `/account`, `/account/orders`, `/account/orders/[id]`.
- Client-rendered: cart drawer (`useReducer` over cart state), checkout form (controlled inputs + simulated payment), login/signup forms. Cart is persisted in `localStorage` for guests, and in a server-side `Cart` document for logged-in customers, kept in sync via a `POST /api/v1/cart` server action.

### 10. Testing strategy
- `vitest` for unit tests of `lib/*` (pricing, password, payment simulator, order placement).
- `vitest` + `mongodb-memory-server` for integration tests of route handlers against a real ephemeral Mongo.
- One Playwright smoke test that drives the guest checkout flow end-to-end. No broad e2e coverage in v1.

## Risks / Trade-offs

- **Prisma + Mongo has no multi-document transactions** → Mitigation: model `Order` (with lines + payment + events) as a single document so the write is atomic. Customer creation is a single-document write. We never need a true cross-document transaction in v1.
- **One Next.js process serves both UI and public API** → Mitigation: this is fine for v1 traffic. If integrators ever swamp the API, we can deploy the same app twice with a routing split (UI host vs API host) without code changes because `lib/` is the only source of truth.
- **Cookie sessions and bearer tokens both resolve to the same customer principal** → Risk: confusion about which surface a request came from. Mitigation: `requireCustomer(req)` returns the principal AND the `authSource` (`"session" | "apiKey"`), and audit logs include it.
- **Simulated payments could be mistaken for real ones in a future deploy** → Mitigation: `PAYMENT_SIM_MODE` is checked at boot; if it equals `simulator` in `NODE_ENV=production`, the app logs a loud warning on startup. (A real gateway swap will set it to `none` or `stripe` explicitly.)
- **bcrypt cost 12 vs Node event loop** → Mitigation: hashing is a few hundred ms; acceptable for sign-up/login throughput in v1. Revisit if login QPS climbs.
- **Server actions vs API routes for the UI** → We use API routes for `/api/v1/*` (because integrators consume them) and server components / server actions for the UI's mutating flows that don't need a public contract. Both call into the same `lib/` functions.

## Migration Plan

This is a greenfield bootstrap; there is nothing to migrate. Roll-out is:

1. Land the bootstrapped app on `main`.
2. Run `npx prisma db push` against a fresh Mongo instance (local dev or Atlas).
3. Run the menu seed script (`pnpm seed`) to load v1 menu items.
4. Smoke-test sign-up → login → place authenticated order → guest order.

Rollback is "revert the merge" — there is no prior state to restore.

## Open Questions

- **MongoDB hosting for deployed environments**: Atlas free tier vs self-hosted in Docker? Deferred to the deployment task; either works with the same `DATABASE_URL`.
- **Email delivery for guest order tokens and receipts**: stubbed to log in v1. Real provider (Resend/Postmark/SES) to be chosen in a follow-up change.
- **API key issuance UX**: v1 creates keys via a CLI/seed script. Self-service issuance UI is a follow-up.
- **Cart persistence for logged-in customers across devices**: v1 stores a single `Cart` document per customer; conflict semantics (last write wins vs merge) are TBD if the same customer edits the cart in two tabs. Default to last-write-wins for v1.
