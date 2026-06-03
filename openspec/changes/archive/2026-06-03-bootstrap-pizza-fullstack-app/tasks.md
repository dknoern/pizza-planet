## 1. Project bootstrap

- [x] 1.1 Initialize a Next.js (App Router, TypeScript) project at the repo root with `pnpm create next-app`, preserving the existing `openspec/` directory.
- [x] 1.2 Add dependencies: `prisma`, `@prisma/client`, `bcrypt`, `@types/bcrypt`, `zod`, `iron-session`, `jose`, `vitest`, `@vitest/coverage-v8`, `mongodb-memory-server`, `@playwright/test`.
- [x] 1.3 Configure ESLint + Prettier (Next.js defaults) and a `tsconfig.json` with `"strict": true` and `paths` aliasing `@/lib/*`, `@/app/*`.
- [x] 1.4 Create `.env.example` with `DATABASE_URL`, `SESSION_SECRET`, `PAYMENT_SIM_MODE=simulator`, `GUEST_TOKEN_SECRET`; document each in `README.md`.
- [x] 1.5 Add npm scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `db:push`, `db:seed`.

## 2. Data layer (Prisma + MongoDB)

- [x] 2.1 Create `prisma/schema.prisma` with `provider = "mongodb"` and models: `Customer`, `ApiKey`, `MenuItem`, `Size`, `Topping`, `Cart`, `Order` (with embedded `OrderLine[]`, embedded `Payment`, embedded `OrderEvent[]`).
- [x] 2.2 On `Customer`: fields `id`, `email` (unique index), `passwordHash`, `name`, `createdAt`. No plaintext password field exists in the schema.
- [x] 2.3 On `Order`: `id`, `orderNumber` (unique), `customerId` (nullable), `guestContact` (nullable embedded), `lines` (embedded), `subtotalCents`, `taxCents`, `deliveryFeeCents`, `totalCents`, `payment` (embedded: `last4`, `brand`, `authorizationId`, `amountCents`), `status`, `events`, `createdAt`. No PAN/CVV fields.
- [x] 2.4 Add `lib/db.ts` exporting a singleton `PrismaClient` (guarded against hot-reload duplication in dev).
- [x] 2.5 Write a seed script (`prisma/seed.ts`) that inserts a starter menu (≥ 6 pizzas, 3 sides, 3 drinks, sizes S/M/L, ~10 toppings) and wire it into `pnpm db:seed`.
- [x] 2.6 Document `pnpm db:push && pnpm db:seed` in `README.md`.

## 3. Shared HTTP + validation primitives (`lib/http`)

- [x] 3.1 Implement `lib/http/errors.ts` exporting `ApiError(code, message, status, details?)` and a `toResponse(err)` helper that returns `{ error: { code, message, details? } }` JSON with the right status.
- [x] 3.2 Implement `lib/http/validate.ts` wrapping zod: `parseBody(req, schema)` and `parseQuery(req, schema)` that throw `ApiError("VALIDATION_FAILED", …, 400, details)` on failure. Schemas use `.strict()` so unknown fields are rejected.
- [x] 3.3 Implement `lib/http/handler.ts` `withApi(handler)` wrapper that catches `ApiError` and unknown errors, mapping unknown errors to `{ code: "INTERNAL", status: 500 }` while logging the stack.

## 4. Auth (`lib/auth`)

- [x] 4.1 `lib/auth/password.ts`: `hashPassword(plain): Promise<string>` (bcrypt cost 12) and `verifyPassword(plain, hash): Promise<boolean>` (constant-time).
- [x] 4.2 `lib/auth/session.ts`: cookie-based session using `iron-session` — `getSession(req)`, `setSession(res, { customerId })`, `destroySession(res)`. Cookie: HTTP-only, Secure (prod), SameSite=Lax, 30-day rolling expiry.
- [x] 4.3 `lib/auth/apiKey.ts`: `issueApiKey(customerId)` returns plaintext `pp_live_<random>` once; stores only the hash. `resolveApiKey(token)` returns `customerId | null`.
- [x] 4.4 `lib/auth/requireCustomer.ts`: `requireCustomer(req)` returns `{ customer, authSource: "session" | "apiKey" }` or throws `ApiError("UNAUTHENTICATED", 401)`. Checks session cookie first, then bearer token.
- [x] 4.5 `lib/auth/signup.ts`: validates email/password rules from the `customer-accounts` spec (8+ chars, ≥1 letter, ≥1 digit), enforces email uniqueness with `EMAIL_TAKEN` on conflict.
- [x] 4.6 `lib/auth/login.ts`: in-memory rate-limit map (per email) — ≥ 10 failures in 15 min returns HTTP 429. Generic `INVALID_CREDENTIALS` for both unknown email and wrong password.
- [x] 4.7 Wire route handlers: `app/api/v1/auth/signup/route.ts`, `.../login/route.ts`, `.../logout/route.ts` — each a thin adapter over `lib/auth`.
- [x] 4.8 Sign-up / login / logout UI pages under `app/(storefront)/account/(auth)/` using client components for the forms, calling the same `/api/v1/auth/*` endpoints.

## 5. Menu catalog (`lib/menu`)

- [x] 5.1 `lib/menu/queries.ts`: `listAvailableMenu()`, `getMenuItem(id)` — both filter `available: true` and shape items with `sizes[]` and `toppings[]` including `priceDeltaCents`.
- [x] 5.2 `lib/menu/pricing.ts`: `priceLine({ menuItem, sizeId, toppingIds, quantity }) → lineTotalCents`. Pure function, unit-tested.
- [x] 5.3 API: `app/api/v1/menu/route.ts` (GET list) and `app/api/v1/menu/[id]/route.ts` (GET detail) — both thin adapters over `lib/menu`.
- [x] 5.4 Storefront pages: `app/(storefront)/menu/page.tsx` (server component listing items) and `app/(storefront)/menu/[id]/page.tsx` (server component detail with an "Add to cart" client subcomponent).

## 6. Cart and ordering (`lib/ordering`)

- [x] 6.1 `lib/ordering/cart.ts`: cart shape `{ lines: { menuItemId, sizeId, toppingIds, quantity }[] }`; `priceCart(cart) → { lines: [...with lineTotalCents], subtotalCents, taxCents, deliveryFeeCents, totalCents }`. Recomputes everything server-side.
- [x] 6.2 `lib/ordering/placeOrder.ts`: `placeOrder({ cart, deliveryAddress, customer | guestContact, paymentInput })` — validates cart items are still available (`ITEM_UNAVAILABLE` on conflict), prices the cart, calls the injected `PaymentProcessor.authorize(...)`, persists the `Order` document (single atomic write), returns the order.
- [x] 6.3 `lib/ordering/queries.ts`: `listOrdersForCustomer(customerId, { page, pageSize })` sorted by `createdAt` desc; `getOrderForCustomer(orderId, customerId)` returning 404 (not 403) when the order belongs to someone else.
- [x] 6.4 `lib/ordering/guestToken.ts`: `issueGuestOrderToken(orderId)` (signed JWT, 7-day expiry, scope = orderId); `resolveGuestOrderToken(token) → orderId | null`.
- [x] 6.5 API: `POST /api/v1/orders` (auth OR inline guest contact), `GET /api/v1/orders` (auth, paginated), `GET /api/v1/orders/[id]` (auth owner OR `?token=<guestOrderToken>`).
- [x] 6.6 Storefront cart: client-component cart drawer with `useReducer`, persisted to `localStorage` for guests; a `POST /api/v1/cart` server action syncs the cart for logged-in customers.
- [x] 6.7 Storefront checkout: `app/(storefront)/checkout/page.tsx` (server-rendered summary) with a client-component form that collects delivery address, payment fields, and optional guest contact, then POSTs to `/api/v1/orders`.
- [x] 6.8 Storefront order history: `app/(storefront)/account/orders/page.tsx` (server component listing the session customer's orders) and `app/(storefront)/account/orders/[id]/page.tsx` (server component detail).
- [x] 6.9 Guest confirmation page: renders the order, prints the `guestOrderToken` lookup link, and logs a stub "email sent" line server-side.

## 7. Payment simulation (`lib/payments`)

- [x] 7.1 `lib/payments/processor.ts`: `interface PaymentProcessor { authorize(amountCents, card, metadata): Promise<{ status: "APPROVED", authorizationId, last4, brand } | { status: "DECLINED", reason }> }`.
- [x] 7.2 `lib/payments/luhn.ts`: standalone Luhn validator with unit tests.
- [x] 7.3 `lib/payments/simulator.ts`: `SimulatedPaymentProcessor` honoring the deterministic test cards (`4111…` approve, `4000…0002` decline), rejecting invalid cards with `INVALID_CARD`, approving any other Luhn-valid card.
- [x] 7.4 `lib/payments/factory.ts`: `getPaymentProcessor()` selects based on `PAYMENT_SIM_MODE`. On boot in `NODE_ENV=production` with `simulator`, log a loud warning.
- [x] 7.5 Enforce in `lib/ordering/placeOrder.ts` that the persisted payment block contains only `last4`, `brand`, `authorizationId`, `amountCents` — never PAN/CVV. Add a unit test asserting this.
- [x] 7.6 Add a redaction helper in `lib/payments/redact.ts` (returns `**** **** **** 1111`-style mask) and use it in any log statement that mentions a card.

## 8. Tests

- [x] 8.1 Unit tests (`vitest`): `lib/menu/pricing`, `lib/auth/password`, `lib/auth/login` rate-limit, `lib/payments/luhn`, `lib/payments/simulator` (each spec scenario), `lib/ordering/cart.priceCart`.
- [x] 8.2 Integration tests (`vitest` + `mongodb-memory-server`): signup→login→/orders POST round-trip; cross-customer order access returns 404; guest order placement and lookup-token retrieval; checkout rejects unavailable items with `ITEM_UNAVAILABLE`.
- [x] 8.3 Boundary tests: every `/api/v1/*` route returns the documented error envelope; `.strict()` schemas reject unknown fields with `VALIDATION_FAILED`; unsupported method returns 405 with `Allow` header.
- [x] 8.4 Playwright smoke test: guest visits `/menu`, adds an item, fills checkout with the approve test card, sees the confirmation with order number.

## 9. Polish, docs, and handoff

- [x] 9.1 Update `README.md` with prerequisites (Node, pnpm, Mongo), setup steps (`pnpm install`, `.env`, `pnpm db:push`, `pnpm db:seed`), running (`pnpm dev`), and a curl example for `POST /api/v1/auth/signup` and `POST /api/v1/orders`.
- [x] 9.2 Add a one-page `docs/api.md` listing every `/api/v1/*` endpoint with request/response shape and example errors.
- [x] 9.3 Run `pnpm lint && pnpm typecheck && pnpm test` and ensure all pass.
- [x] 9.4 Manually verify in the browser: sign-up → login → place authenticated order → log out → place guest order → look up the guest order with the returned token.
- [x] 9.5 Tick this change off and run `/opsx:archive` to move it into `openspec/changes/archive/` and sync the deltas into `openspec/specs/`.
