## Why

The `pizza-planet` repository currently contains only OpenSpec scaffolding — there is no application code yet. We need to stand up the first end-to-end slice of the Pizza Planet ordering platform so customers (and integration partners) have a working storefront they can sign up for, log into, and order from. Establishing the architecture (Next.js + MongoDB + Prisma, with shared business logic between the UI and the REST API) up front avoids costly rewrites later and gives every subsequent feature a consistent home.

## What Changes

- Bootstrap a Next.js (App Router, TypeScript) full-stack application as the root of the repository.
- Add MongoDB as the primary datastore and Prisma as the ORM, with the schema owned by the app.
- Introduce a `lib/` (or `core/`) package of shared domain logic (auth, catalog, cart, orders, payment simulation) consumed by both server components and the public REST API.
- Build a public REST API under `/api/v1/*` for third-party integration, covering auth, catalog, cart, orders, and checkout.
- Implement customer accounts: email/password sign-up and login, with passwords stored only as salted hashes (bcrypt/argon2). Sessions managed via secure HTTP-only cookies.
- Implement authenticated customer flows: view profile, browse menu, place new orders, and view order history.
- Implement a guest checkout flow that records orders without requiring an account, capturing contact + delivery info on the order.
- Add a simulated credit-card payment processor that validates form input, mocks authorization/decline outcomes, and never stores raw PANs — wired behind a `PaymentProcessor` interface so a real gateway can be swapped in later.
- Use React Server Components by default for catalog/menu/order-history reads; Client Components only where interaction requires it (cart, checkout form).
- **BREAKING**: N/A — this is the initial application; nothing exists to break.

## Capabilities

### New Capabilities
- `customer-accounts`: Customer sign-up, login, logout, session management, and password hashing.
- `menu-catalog`: Public read-only catalog of pizzas and add-ons that powers the storefront and the API.
- `ordering`: Cart construction, order placement (authenticated and guest), order persistence, and order-history retrieval.
- `payment-simulation`: Simulated credit-card authorization with deterministic test outcomes, fronted by a swappable payment-processor interface.
- `public-api`: Versioned REST API under `/api/v1/*` that exposes the same domain logic the UI uses, with token-based auth for integrators.

### Modified Capabilities
<!-- None — no existing specs in this repo. -->

## Impact

- **Code**: Creates the entire initial app skeleton at the repo root (`app/`, `lib/`, `prisma/`, `src/api/`, tests, config). No existing files are modified.
- **APIs**: Introduces the first public REST surface (`/api/v1/auth`, `/menu`, `/orders`, `/checkout`).
- **Dependencies**: Adds `next`, `react`, `@prisma/client`, `prisma`, `bcrypt` (or `argon2`), `zod` for validation, `iron-session` or `jose` for sessions, and `vitest`/`playwright` for testing.
- **Infrastructure**: Requires a MongoDB instance (local Docker for dev, managed Mongo Atlas for deployed environments). `.env` will hold `DATABASE_URL`, `SESSION_SECRET`, and `PAYMENT_SIM_MODE`.
- **Operational**: Establishes conventions (folder layout, shared `lib/`, server-components-first) that all future changes will build on.
