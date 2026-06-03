# Pizza Planet

A full-stack pizza ordering app: Next.js (App Router + React Server Components) on the front, MongoDB + Prisma on the back, with a shared domain library in `lib/` that powers both the storefront and a public REST API.


![image](pizza-planet-splash.png)

## Architecture in one paragraph

Every business rule (auth, pricing, ordering, payment authorization) lives in `lib/` and is called from **both** the server-rendered storefront pages (`app/(storefront)/**`) and the public REST API (`app/api/v1/**`). The API uses cookie-based sessions for the UI and bearer tokens for integrators, both resolving to the same `requireCustomer()` helper. Orders are written as single embedded MongoDB documents (cart lines, payment metadata, and event log all live inside the order) so we never need cross-collection transactions.

## Prerequisites

- **Node.js 20+** (the repo was bootstrapped on Node 23 but 20.x LTS works).
- **pnpm 9+** — `npm i -g pnpm`.
- **MongoDB** — Prisma's Mongo connector requires a replica set (it uses
  transactions internally even for `deleteMany`). A standalone `mongod` will
  fail with `P2031`. For local dev, run a single-node replica set in Docker:

  ```bash
  docker run -d --name pizza-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all
  # Wait a couple seconds, then initiate:
  docker exec pizza-mongo mongosh --quiet --eval \
    "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
  ```

  Then set `DATABASE_URL` to the directConnection form:

  ```
  mongodb://localhost:27017/pizza-planet?directConnection=true&replicaSet=rs0
  ```

  For hosted use, any Mongo Atlas cluster works (replica set by default).
- (E2E only) The Playwright browsers will be downloaded on first run: `pnpm exec playwright install chromium`.

## First-time setup

```bash
pnpm install
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, SESSION_SECRET, and GUEST_TOKEN_SECRET.
# Generate secrets with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

pnpm prisma:generate     # generate the Prisma client
pnpm db:push             # apply the schema to your Mongo instance
pnpm db:seed             # insert the cosmic menu (8 pizzas — Nebula Veggie, Asteroid Pepperoni, etc.)
```

## Running

```bash
pnpm dev                 # http://localhost:3000 — storefront + API both live here
```

The home page redirects to `/menu`. Sign up at `/account/signup`, log in at `/account/login`, view order history at `/account/orders`, or check out as a guest at `/checkout`.

## Tests

```bash
pnpm test                # unit + integration (boots an in-memory MongoDB)
pnpm test:unit           # vitest unit only — no DB
pnpm test:integration    # vitest + mongodb-memory-server
pnpm test:e2e            # Playwright smoke test (boots `pnpm dev`)
pnpm lint
pnpm typecheck
```

Note: integration tests use `mongodb-memory-server`, which downloads a MongoDB binary into `~/.cache/mongodb-binaries` on first run (~200 MB).

## Public REST API quick reference

Three reference surfaces, all auto-generated from the same source:

- **`/docs`** — interactive Swagger UI ([http://localhost:3000/docs](http://localhost:3000/docs) in dev). "Try it out" runs requests against your local server.
- **`/api/openapi.json`** — raw OpenAPI 3.1 document. Point Postman, Insomnia, or codegen at this.
- **`docs/api.md`** — hand-written endpoint reference in Markdown.

Two curl examples to get going:

```bash
# Sign up (sets a session cookie):
curl -i -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Pizza1234","name":"Alice"}'

# Place a guest order:
curl -i -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "cart":{"lines":[{"menuItemId":"<id from /api/v1/menu>","sizeId":"M","toppingIds":[],"quantity":1}]},
    "deliveryAddress":{"line1":"1 Pie Ln","city":"Slice","state":"NY","postalCode":"10001"},
    "guestContact":{"name":"Guest","email":"g@x.com","phone":"555-0100"},
    "payment":{"number":"4111111111111111","expMonth":12,"expYear":2030,"cvv":"123"}
  }'
```

## Authenticating API requests

Every write endpoint (and `/orders` reads) requires either a **session cookie** or a **bearer token**, both resolving to the same `requireCustomer()` helper.

### Option A — Session cookie (UI / same-browser flows)

`POST /api/v1/auth/signup` and `POST /api/v1/auth/login` set an HTTP-only, signed `pp_session` cookie. Any same-origin call (including Swagger UI's "Try it out" at `/docs`) will send it automatically. Nothing extra to configure.

```bash
# Log in and stash the cookie for subsequent calls:
curl -i -c /tmp/pp.cookies -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"Pizza1234"}'

# Use the cookie on an authenticated call:
curl -i -b /tmp/pp.cookies http://localhost:3000/api/v1/orders
```

### Option B — Bearer token (Postman, curl scripts, third-party integrators)

API keys are issued out-of-band per customer via a CLI script. The plaintext token is returned **once**; only its SHA-256 hash is stored in Mongo.

```bash
pnpm issue-api-key <email> [label]
```

Example:

```bash
$ pnpm issue-api-key alice@example.com swagger-ui

API key issued.
---------------------------------------------------------------
  customer:  alice@example.com  (id 6a1f...)
  label:     swagger-ui
  key id:    6a1f...

  TOKEN (copy now — will not be shown again):

     pp_live_5a1ced5e4ceb3e5c9c5b37b25e65b37286bd9398fced06cd

Use it as:  Authorization: Bearer pp_live_5a1ced5e4ceb3e5c9c5b37b25e65b37286bd9398fced06cd
---------------------------------------------------------------
```

Using it:

```bash
curl -i -H "Authorization: Bearer pp_live_…" http://localhost:3000/api/v1/orders
```

In **Swagger UI** at `/docs`: click **Authorize**, paste the token (just the `pp_live_…` part — Swagger adds `Bearer `), apply. Every "Try it out" call thereafter sends the header.

**Token hygiene:**

- The plaintext is shown once. If you lose it, issue a new one — there is no recovery path.
- To revoke a key, set `ApiKey.revokedAt` on its row. Quick one-liner:

  ```bash
  npx tsx -e "import { prisma } from './lib/db'; (async () => { \
    await prisma.apiKey.update({ where: { id: '<keyId>' }, data: { revokedAt: new Date() } }); \
    console.log('revoked'); await prisma.\$disconnect(); })()"
  ```

- The token's customer (not the request itself) is recorded as `authSource: \"apiKey\"` by `requireCustomer()` for audit purposes.

## Payment simulator

`PAYMENT_SIM_MODE=simulator` (the default) uses the in-process `SimulatedPaymentProcessor`. No real money moves.

| Card | Outcome |
|---|---|
| `4111 1111 1111 1111` | APPROVED |
| `4000 0000 0000 0002` | DECLINED (`INSUFFICIENT_FUNDS`) |
| Any other Luhn-valid card | APPROVED |
| Anything that fails Luhn / expiry / CVV | DECLINED (`INVALID_CARD`) |

Only `last4`, `brand`, `authorizationId`, and `amountCents` are persisted with orders. The full PAN, CVV, expiry, and cardholder name are dropped after the authorization call and never written to the database or logged.

## Folder layout

```
app/                        # Next.js App Router
  (storefront)/             # Server-component pages
  api/v1/                   # Public REST API route handlers — thin adapters over lib/
prisma/
  schema.prisma             # MongoDB data model (composite types for embedded docs)
  seed.ts                   # Starter menu seed
lib/                        # Shared domain — UI and API both import from here
  auth/                     # signup, login, sessions, password hashing, API keys
  http/                     # error envelope, zod helpers, withApi wrapper
  menu/                     # catalog queries, pricing helper
  ordering/                 # cart pricing, placeOrder, queries, guest token
  payments/                 # PaymentProcessor interface + SimulatedPaymentProcessor
  openapi.ts                # OpenAPI 3.1 document served at /api/openapi.json
  db.ts                     # PrismaClient singleton
scripts/
  issue-api-key.ts          # pnpm issue-api-key <email> [label]
tests/
  unit/                     # vitest — no DB
  integration/              # vitest + mongodb-memory-server
  e2e/                      # Playwright
docs/api.md                 # REST endpoint reference (markdown)
```
