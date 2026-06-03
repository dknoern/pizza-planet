# Pizza Planet REST API (v1)

Base URL: `http(s)://<host>/api/v1`

All responses are JSON (`Content-Type: application/json; charset=utf-8`). All errors share the envelope:

```json
{ "error": { "code": "UPPER_SNAKE_CODE", "message": "Human readable.", "details": { } } }
```

`details` is present only when relevant (e.g. `VALIDATION_FAILED`).

## Authentication

Endpoints marked **(auth)** accept either:

- A session cookie (`pp_session`) — issued by `POST /auth/login` or `POST /auth/signup`.
- An `Authorization: Bearer pp_live_<token>` API key — issued out-of-band per customer (no self-service endpoint in v1).

Endpoints with neither return `401 UNAUTHENTICATED`.

---

## `POST /auth/signup` (public)

Create a new customer and start a session.

**Request**
```json
{ "email": "alice@example.com", "password": "Pizza1234", "name": "Alice" }
```

**201 Created**
```json
{ "customer": { "id": "...", "email": "alice@example.com", "name": "Alice" } }
```

**Errors**
- `409 EMAIL_TAKEN`
- `400 WEAK_PASSWORD` — password must be ≥ 8 chars with at least one letter and one digit
- `400 VALIDATION_FAILED`

---

## `POST /auth/login` (public)

Authenticate and start a session.

**Request**
```json
{ "email": "alice@example.com", "password": "Pizza1234" }
```

**200 OK**
```json
{ "customer": { "id": "...", "email": "...", "name": "..." } }
```

**Errors**
- `401 INVALID_CREDENTIALS` — generic; does NOT disclose whether the email exists
- `429 RATE_LIMITED` — after 10 failed attempts on the same email in 15 min
- `400 VALIDATION_FAILED`

---

## `POST /auth/logout` (auth)

Destroy the current session.

**204 No Content**

---

## `GET /menu` (public)

List available menu items.

**200 OK**
```json
{
  "items": [
    {
      "id": "...",
      "slug": "margherita",
      "name": "Margherita",
      "description": "Tomato, fresh mozzarella, basil.",
      "category": "PIZZA",
      "basePriceCents": 1199,
      "sizes":    [{ "id": "s", "name": "Small (10\")", "priceDeltaCents": 0 }],
      "toppings": [{ "id": "pepperoni", "name": "Pepperoni", "priceDeltaCents": 150 }],
      "imageUrl": null
    }
  ]
}
```

Unavailable items are excluded.

---

## `GET /menu/{id}` (public)

Get one menu item.

**200 OK** — `{ "item": { ... } }` with the same shape as a list element.

**Errors**
- `404 MENU_ITEM_NOT_FOUND`

---

## `POST /orders` (auth OR public-with-guest-contact)

Place an order. Authenticated customers omit `guestContact`; guests must include it.

**Request (authenticated)**
```json
{
  "cart": {
    "lines": [
      { "menuItemId": "...", "sizeId": "m", "toppingIds": ["pepperoni"], "quantity": 1 }
    ]
  },
  "deliveryAddress": {
    "line1": "1 Pie Ln", "line2": null, "city": "Slice", "state": "NY", "postalCode": "10001"
  },
  "payment": {
    "number": "4111111111111111", "expMonth": 12, "expYear": 2030, "cvv": "123",
    "holderName": "Alice"
  }
}
```

**Request (guest)** — same plus:
```json
"guestContact": { "name": "Guest", "email": "g@x.com", "phone": "555-0100" }
```

**201 Created**
```json
{
  "order": {
    "id": "...", "orderNumber": "PP-260602-A1B2",
    "customerId": null,
    "guestContact": { "name": "Guest", "email": "g@x.com", "phone": "555-0100" },
    "deliveryAddress": { "...": "..." },
    "lines": [ { "menuItemName": "Margherita", "quantity": 1, "lineTotalCents": 1499 } ],
    "subtotalCents": 1499, "taxCents": 120, "deliveryFeeCents": 399, "totalCents": 2018,
    "payment": { "last4": "1111", "brand": "VISA", "authorizationId": "sim_…", "amountCents": 2018 },
    "status": "PLACED", "events": [{ "at": "...", "kind": "PLACED" }],
    "createdAt": "..."
  },
  "guestToken": "<jwt>"
}
```

`guestToken` is included only for guest orders. It's a signed JWT (7-day expiry) used as a `?token=…` query parameter on `GET /orders/{id}` to retrieve the order without an account.

**Errors**
- `400 VALIDATION_FAILED`
- `409 ITEM_UNAVAILABLE` — one or more cart items have become unavailable; `details.menuItemId` names the offender
- `402 PAYMENT_DECLINED` — `details.reason` is `INSUFFICIENT_FUNDS` or `INVALID_CARD`
- `401 UNAUTHENTICATED` — neither a session nor a guest-contact block was provided

The persisted `payment` document only ever contains `last4`, `brand`, `authorizationId`, and `amountCents`. The PAN, CVV, expiry, and holder name are dropped after the authorization call.

---

## `GET /orders` (auth)

List the authenticated customer's own orders, most recent first.

**Query** — `?page=1&pageSize=20` (defaults: 1 / 20; max pageSize 50).

**200 OK**
```json
{ "orders": [ { "...": "..." } ], "page": 1, "pageSize": 20, "total": 7 }
```

---

## `GET /orders/{id}` (auth owner OR guest with `?token=`)

Retrieve one order. Returns `404 ORDER_NOT_FOUND` (not 403) when the requester is authenticated but the order belongs to a different customer, so order existence is not leaked.

For guest orders, append `?token=<guestToken>` from the `POST /orders` response.

**200 OK** — `{ "order": { ... } }`

**Errors**
- `404 ORDER_NOT_FOUND`
- `401 UNAUTHENTICATED`

---

## `POST /cart` (auth)

Sync the cart for the logged-in customer. Server re-prices.

**Request**
```json
{ "lines": [ { "menuItemId": "...", "sizeId": "m", "toppingIds": [], "quantity": 2 } ] }
```

**200 OK** — `{ "cart": { "lines": [...], "subtotalCents": ..., "totalCents": ... } }`

---

## Method handling

Any documented path called with an unsupported HTTP method returns `405 METHOD_NOT_ALLOWED` with an `Allow` header and `details.allow` listing the supported methods.

## Unknown fields

Every endpoint validates its body and query string with strict zod schemas. Extra fields are rejected with `400 VALIDATION_FAILED`. Be explicit about what you send.
