// Hand-written OpenAPI 3.1 document for the Pizza Planet v1 API.
//
// Kept in sync with the zod schemas in:
//   - lib/auth/signup.ts, lib/auth/login.ts
//   - lib/ordering/cart.ts, lib/ordering/placeOrder.ts
//   - lib/menu/queries.ts (response shape)
//
// If you add or change an endpoint or schema, update this file too. The
// docs page at /docs renders it via Swagger UI; the raw JSON is served at
// /api/openapi.json.

export type OpenApiDoc = Record<string, unknown>;

const ERROR_ENVELOPE = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: {
          type: "string",
          description: "Machine-readable error code (UPPER_SNAKE_CASE).",
          example: "VALIDATION_FAILED",
        },
        message: { type: "string", description: "Human-readable message." },
        details: {
          type: "object",
          additionalProperties: true,
          description: "Endpoint-specific extra context (e.g. field errors).",
        },
      },
    },
  },
} as const;

const CUSTOMER = {
  type: "object",
  required: ["id", "email", "name"],
  properties: {
    id: { type: "string", example: "6a1fc3fdd85d0f46cd3186cd" },
    email: { type: "string", format: "email", example: "alice@example.com" },
    name: { type: "string", example: "Alice" },
  },
} as const;

const SIZE_OPTION = {
  type: "object",
  required: ["id", "name", "priceDeltaCents"],
  properties: {
    id: { type: "string", example: "M" },
    name: { type: "string", example: "Medium (12\")" },
    priceDeltaCents: { type: "integer", example: 0 },
  },
} as const;

const TOPPING_OPTION = {
  type: "object",
  required: ["id", "name", "priceDeltaCents"],
  properties: {
    id: { type: "string", example: "pepperoni" },
    name: { type: "string", example: "Pepperoni" },
    priceDeltaCents: { type: "integer", example: 0 },
  },
} as const;

const MENU_ITEM = {
  type: "object",
  required: [
    "id",
    "slug",
    "name",
    "description",
    "category",
    "basePriceCents",
    "sizes",
    "toppings",
    "imageUrl",
    "sauce",
    "tag",
    "visualToppingIds",
  ],
  properties: {
    id: { type: "string" },
    slug: { type: "string", example: "asteroid-pepperoni" },
    name: { type: "string", example: "Asteroid Pepperoni" },
    description: { type: "string" },
    category: { type: "string", enum: ["PIZZA", "SIDE", "DRINK"] },
    basePriceCents: { type: "integer", example: 1500 },
    sizes: { type: "array", items: { $ref: "#/components/schemas/SizeOption" } },
    toppings: { type: "array", items: { $ref: "#/components/schemas/ToppingOption" } },
    imageUrl: { type: "string", nullable: true },
    sauce: {
      type: "string",
      nullable: true,
      enum: ["red", "pesto", "bbq", "white", null],
    },
    tag: {
      type: "string",
      nullable: true,
      enum: ["classic", "hot", "veg", null],
    },
    visualToppingIds: {
      type: "array",
      items: { type: "string" },
      description:
        "Raw topping sprite list (with repetition) for the procedural pizza renderer.",
    },
  },
} as const;

const CART_LINE_INPUT = {
  type: "object",
  additionalProperties: false,
  required: ["menuItemId", "sizeId", "quantity"],
  properties: {
    menuItemId: { type: "string" },
    sizeId: { type: "string", description: "Empty for items without sizes (sides, drinks)." },
    toppingIds: { type: "array", items: { type: "string" }, default: [] },
    quantity: { type: "integer", minimum: 1, maximum: 50 },
  },
} as const;

const CART_INPUT = {
  type: "object",
  additionalProperties: false,
  required: ["lines"],
  properties: {
    lines: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/CartLineInput" } },
  },
} as const;

const PRICED_CART_LINE = {
  type: "object",
  required: [
    "menuItemId",
    "sizeId",
    "toppingIds",
    "quantity",
    "menuItemName",
    "sizeName",
    "toppingNames",
    "unitPriceCents",
    "lineTotalCents",
  ],
  properties: {
    menuItemId: { type: "string" },
    sizeId: { type: "string" },
    toppingIds: { type: "array", items: { type: "string" } },
    quantity: { type: "integer", minimum: 1 },
    menuItemName: { type: "string" },
    sizeName: { type: "string" },
    toppingNames: { type: "array", items: { type: "string" } },
    unitPriceCents: { type: "integer" },
    lineTotalCents: { type: "integer" },
  },
} as const;

const PRICED_CART = {
  type: "object",
  required: ["lines", "subtotalCents", "taxCents", "deliveryFeeCents", "totalCents"],
  properties: {
    lines: { type: "array", items: { $ref: "#/components/schemas/PricedCartLine" } },
    subtotalCents: { type: "integer" },
    taxCents: { type: "integer" },
    deliveryFeeCents: { type: "integer" },
    totalCents: { type: "integer" },
  },
} as const;

const DELIVERY_ADDRESS = {
  type: "object",
  additionalProperties: false,
  required: ["line1", "city", "state", "postalCode"],
  properties: {
    line1: { type: "string", maxLength: 200 },
    line2: { type: "string", maxLength: 200 },
    city: { type: "string", maxLength: 120 },
    state: { type: "string", maxLength: 80 },
    postalCode: { type: "string", minLength: 2, maxLength: 20 },
  },
} as const;

const GUEST_CONTACT = {
  type: "object",
  additionalProperties: false,
  required: ["name", "email", "phone"],
  properties: {
    name: { type: "string", maxLength: 120 },
    email: { type: "string", format: "email" },
    phone: { type: "string", minLength: 5, maxLength: 40 },
  },
} as const;

const PAYMENT_INPUT = {
  type: "object",
  additionalProperties: false,
  required: ["number", "expMonth", "expYear", "cvv"],
  properties: {
    number: { type: "string", example: "4111111111111111" },
    expMonth: { type: "integer", minimum: 1, maximum: 12 },
    expYear: { type: "integer", minimum: 2024, maximum: 2099 },
    cvv: { type: "string", minLength: 3, maxLength: 4 },
    holderName: { type: "string", maxLength: 120 },
  },
} as const;

const ORDER_LINE = {
  type: "object",
  required: [
    "menuItemId",
    "menuItemName",
    "sizeId",
    "sizeName",
    "toppingIds",
    "toppingNames",
    "unitPriceCents",
    "quantity",
    "lineTotalCents",
  ],
  properties: {
    menuItemId: { type: "string" },
    menuItemName: { type: "string" },
    sizeId: { type: "string" },
    sizeName: { type: "string" },
    toppingIds: { type: "array", items: { type: "string" } },
    toppingNames: { type: "array", items: { type: "string" } },
    unitPriceCents: { type: "integer" },
    quantity: { type: "integer", minimum: 1 },
    lineTotalCents: { type: "integer" },
  },
} as const;

const PAYMENT = {
  type: "object",
  required: ["last4", "brand", "authorizationId", "amountCents"],
  description:
    "Persisted payment metadata. ONLY these fields ever reach the database; the full PAN, CVV, expiry, and cardholder name are dropped after authorization.",
  properties: {
    last4: { type: "string", minLength: 4, maxLength: 4, example: "1111" },
    brand: { type: "string", example: "VISA" },
    authorizationId: { type: "string", example: "sim_2c9af1b5" },
    amountCents: { type: "integer" },
  },
} as const;

const ORDER_EVENT = {
  type: "object",
  required: ["at", "kind"],
  properties: {
    at: { type: "string", format: "date-time" },
    kind: { type: "string", example: "PLACED" },
    message: { type: "string", nullable: true },
  },
} as const;

const ORDER = {
  type: "object",
  required: [
    "id",
    "orderNumber",
    "customerId",
    "deliveryAddress",
    "lines",
    "subtotalCents",
    "taxCents",
    "deliveryFeeCents",
    "totalCents",
    "payment",
    "status",
    "events",
    "createdAt",
  ],
  properties: {
    id: { type: "string" },
    orderNumber: { type: "string", example: "PP-260602-A1B2" },
    customerId: { type: "string", nullable: true },
    guestContact: { allOf: [{ $ref: "#/components/schemas/GuestContact" }], nullable: true },
    deliveryAddress: { $ref: "#/components/schemas/DeliveryAddress" },
    lines: { type: "array", items: { $ref: "#/components/schemas/OrderLine" } },
    subtotalCents: { type: "integer" },
    taxCents: { type: "integer" },
    deliveryFeeCents: { type: "integer" },
    totalCents: { type: "integer" },
    payment: { $ref: "#/components/schemas/Payment" },
    status: {
      type: "string",
      enum: ["PLACED", "IN_KITCHEN", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"],
    },
    events: { type: "array", items: { $ref: "#/components/schemas/OrderEvent" } },
    createdAt: { type: "string", format: "date-time" },
  },
} as const;

function errorResponse(status: string, summary: string, code: string) {
  return {
    description: `${status} — ${summary}`,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorEnvelope" },
        example: { error: { code, message: summary } },
      },
    },
  };
}

export const openApiDocument: OpenApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "Pizza Planet REST API",
    version: "1.0.0",
    description:
      "Public REST surface for the Pizza Planet ordering app. The same domain logic powers the storefront UI and these endpoints — what you see in the browser, you can drive from here.\n\n" +
      "**Authentication.** Most write endpoints require either the session cookie (`pp_session`) issued by `/auth/login` or `/auth/signup`, or an `Authorization: Bearer pp_live_<token>` API key issued per customer.\n\n" +
      "**Errors.** Every error shares the envelope `{ error: { code, message, details? } }`. See `ErrorEnvelope` in the Schemas section.\n\n" +
      "**Payments are simulated.** No real money moves. Use `4111 1111 1111 1111` to approve and `4000 0000 0000 0002` to decline.",
    contact: { name: "Pizza Planet" },
    license: { name: "MIT" },
  },
  servers: [{ url: "/api/v1", description: "Current host, v1 base path" }],
  tags: [
    { name: "Auth", description: "Sign up, log in, log out." },
    { name: "Menu", description: "Public catalog read access." },
    { name: "Orders", description: "Place and retrieve orders (authenticated or guest)." },
    { name: "Cart", description: "Server-priced cart sync for authenticated customers." },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "pp_session",
        description: "HTTP-only session cookie issued by /auth/login or /auth/signup.",
      },
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "pp_live_*",
        description: "Per-customer API key. Issued out-of-band in v1.",
      },
    },
    schemas: {
      ErrorEnvelope: ERROR_ENVELOPE,
      Customer: CUSTOMER,
      SizeOption: SIZE_OPTION,
      ToppingOption: TOPPING_OPTION,
      MenuItem: MENU_ITEM,
      CartLineInput: CART_LINE_INPUT,
      CartInput: CART_INPUT,
      PricedCartLine: PRICED_CART_LINE,
      PricedCart: PRICED_CART,
      DeliveryAddress: DELIVERY_ADDRESS,
      GuestContact: GUEST_CONTACT,
      PaymentInput: PAYMENT_INPUT,
      OrderLine: ORDER_LINE,
      Payment: PAYMENT,
      OrderEvent: ORDER_EVENT,
      Order: ORDER,
    },
  },
  paths: {
    "/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Create a new customer and start a session",
        description:
          "Password must be ≥ 8 characters with at least one letter and one digit. Stored as a bcrypt hash; the plaintext never reaches the database.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string", minLength: 1, maxLength: 120 },
                },
              },
              example: {
                email: "alice@example.com",
                password: "Pizza1234",
                name: "Alice",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Account created. Session cookie set.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["customer"],
                  properties: { customer: { $ref: "#/components/schemas/Customer" } },
                },
              },
            },
          },
          "400": errorResponse("400", "Validation failed or weak password.", "VALIDATION_FAILED"),
          "409": errorResponse("409", "Email already registered.", "EMAIL_TAKEN"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Authenticate and start a session",
        description:
          "Returns a generic `INVALID_CREDENTIALS` for both unknown email and wrong password to avoid leaking account existence.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logged in. Session cookie set.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["customer"],
                  properties: { customer: { $ref: "#/components/schemas/Customer" } },
                },
              },
            },
          },
          "400": errorResponse("400", "Validation failed.", "VALIDATION_FAILED"),
          "401": errorResponse("401", "Email or password is incorrect.", "INVALID_CREDENTIALS"),
          "429": errorResponse(
            "429",
            "Too many failed attempts (≥ 10 in 15 minutes for this email).",
            "RATE_LIMITED",
          ),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Destroy the current session",
        security: [{ sessionCookie: [] }, { bearerAuth: [] }],
        responses: { "204": { description: "Session cleared. No content." } },
      },
    },
    "/menu": {
      get: {
        tags: ["Menu"],
        summary: "List available menu items",
        security: [],
        responses: {
          "200": {
            description: "Menu items currently marked available.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: { type: "array", items: { $ref: "#/components/schemas/MenuItem" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/menu/{id}": {
      get: {
        tags: ["Menu"],
        summary: "Get one menu item",
        security: [],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "MenuItem id.",
          },
        ],
        responses: {
          "200": {
            description: "Menu item detail.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["item"],
                  properties: { item: { $ref: "#/components/schemas/MenuItem" } },
                },
              },
            },
          },
          "404": errorResponse("404", "Menu item not found.", "MENU_ITEM_NOT_FOUND"),
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        summary: "List the authenticated customer's orders",
        security: [{ sessionCookie: [] }, { bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of the caller's orders, most recent first.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["orders", "page", "pageSize", "total"],
                  properties: {
                    orders: { type: "array", items: { $ref: "#/components/schemas/Order" } },
                    page: { type: "integer" },
                    pageSize: { type: "integer" },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": errorResponse("401", "Authentication required.", "UNAUTHENTICATED"),
        },
      },
      post: {
        tags: ["Orders"],
        summary: "Place an order",
        description:
          "Authenticated customers omit `guestContact`. Guests must include it; they receive a signed `guestToken` to retrieve the order later.",
        security: [{ sessionCookie: [] }, { bearerAuth: [] }, {}],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["cart", "deliveryAddress", "payment"],
                properties: {
                  cart: { $ref: "#/components/schemas/CartInput" },
                  deliveryAddress: { $ref: "#/components/schemas/DeliveryAddress" },
                  guestContact: { $ref: "#/components/schemas/GuestContact" },
                  payment: { $ref: "#/components/schemas/PaymentInput" },
                },
              },
              example: {
                cart: {
                  lines: [
                    {
                      menuItemId: "<id from /menu>",
                      sizeId: "M",
                      toppingIds: [],
                      quantity: 1,
                    },
                  ],
                },
                deliveryAddress: {
                  line1: "1 Pie Ln",
                  city: "Slice",
                  state: "NY",
                  postalCode: "10001",
                },
                guestContact: { name: "Guest", email: "g@x.com", phone: "555-0100" },
                payment: {
                  number: "4111111111111111",
                  expMonth: 12,
                  expYear: 2030,
                  cvv: "123",
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description:
              "Order placed. `guestToken` is included only for guest orders (signed JWT, 7-day expiry, scope = orderId).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["order"],
                  properties: {
                    order: { $ref: "#/components/schemas/Order" },
                    guestToken: { type: "string" },
                  },
                },
              },
            },
          },
          "400": errorResponse("400", "Validation failed.", "VALIDATION_FAILED"),
          "401": errorResponse(
            "401",
            "Authentication required (or supply guestContact for guest checkout).",
            "UNAUTHENTICATED",
          ),
          "402": errorResponse(
            "402",
            "Payment declined. `details.reason` is `INSUFFICIENT_FUNDS` or `INVALID_CARD`.",
            "PAYMENT_DECLINED",
          ),
          "409": errorResponse(
            "409",
            "One or more cart items have become unavailable.",
            "ITEM_UNAVAILABLE",
          ),
        },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get one order",
        description:
          "Returns 404 (not 403) when authenticated but the order belongs to a different customer, so order existence is not leaked.",
        security: [{ sessionCookie: [] }, { bearerAuth: [] }, {}],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "token",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Guest lookup token returned by POST /orders. Required if unauthenticated.",
          },
        ],
        responses: {
          "200": {
            description: "Order detail.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["order"],
                  properties: { order: { $ref: "#/components/schemas/Order" } },
                },
              },
            },
          },
          "401": errorResponse(
            "401",
            "Authentication required (or supply ?token=).",
            "UNAUTHENTICATED",
          ),
          "404": errorResponse("404", "Order not found.", "ORDER_NOT_FOUND"),
        },
      },
    },
    "/cart": {
      post: {
        tags: ["Cart"],
        summary: "Sync the authenticated customer's cart and re-price server-side",
        security: [{ sessionCookie: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CartInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Cart accepted and priced.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["cart"],
                  properties: { cart: { $ref: "#/components/schemas/PricedCart" } },
                },
              },
            },
          },
          "400": errorResponse("400", "Validation failed.", "VALIDATION_FAILED"),
          "401": errorResponse("401", "Authentication required.", "UNAUTHENTICATED"),
          "409": errorResponse(
            "409",
            "One or more cart items have become unavailable.",
            "ITEM_UNAVAILABLE",
          ),
        },
      },
    },
  },
};
