## ADDED Requirements

### Requirement: Cart construction and pricing
The system SHALL allow a customer (authenticated or guest) to assemble a cart of one or more menu items with configured size and toppings, and SHALL compute the cart total server-side using the shared pricing module.

#### Scenario: Add item to cart with options
- **WHEN** a customer adds a menu item with a chosen size and zero or more toppings
- **THEN** the cart line is recorded with `menuItemId`, `sizeId`, `toppingIds[]`, `quantity`, and a server-computed `lineTotalCents`

#### Scenario: Cart total recomputed server-side
- **WHEN** the cart is read or submitted for checkout
- **THEN** the system recomputes the subtotal, taxes, delivery fee, and grand total on the server and does NOT trust any totals supplied by the client

#### Scenario: Rejecting unavailable items at checkout
- **WHEN** a cart line references a menu item, size, or topping that has become unavailable
- **THEN** checkout is rejected with HTTP 409, error code `ITEM_UNAVAILABLE`, and the id(s) of the offending line(s)

### Requirement: Authenticated customer order placement
The system SHALL allow an authenticated customer to place an order from their cart, persisting the order with their `customerId`, a snapshot of the priced lines, the delivery address, and the payment outcome.

#### Scenario: Successful order placement
- **WHEN** an authenticated customer submits checkout with a valid cart, delivery address, and a payment authorization
- **THEN** the system persists an `Order` record with status `PLACED`, a unique order number, the priced line snapshot, and the linked `customerId`, then returns the order

#### Scenario: Order is immutable after placement
- **WHEN** any client attempts to mutate an order's lines or pricing after creation
- **THEN** the system rejects the request — orders are append-only with status transitions only

### Requirement: Guest order placement
The system SHALL allow a visitor without an account to place an order by providing their name, email, phone, and delivery address inline. The order SHALL be persisted with `customerId = null` and the supplied guest contact info.

#### Scenario: Successful guest checkout
- **WHEN** an unauthenticated visitor submits checkout with a valid cart, guest contact info, delivery address, and payment authorization
- **THEN** the system persists an `Order` record with `customerId: null`, `guestContact` populated, and returns the order with a retrievable order number

#### Scenario: Guest order lookup token
- **WHEN** a guest order is created
- **THEN** the system returns a short-lived signed lookup token that allows the guest to fetch the order status without an account

### Requirement: Order history for authenticated customers
The system SHALL allow an authenticated customer to retrieve a paginated list of their own past orders, most recent first, and SHALL prevent any customer from reading another customer's orders.

#### Scenario: Customer views their order history
- **WHEN** an authenticated customer requests `GET /api/v1/orders` (or loads the order-history page)
- **THEN** the system returns only orders where `customerId` matches the session's customer, sorted by `createdAt` descending

#### Scenario: Cross-customer access denied
- **WHEN** customer A requests `GET /api/v1/orders/{id}` for an order belonging to customer B
- **THEN** the system returns HTTP 404 (not 403) so order existence is not leaked

#### Scenario: Guest cannot list orders without a token
- **WHEN** an unauthenticated client requests `GET /api/v1/orders` with no guest lookup token
- **THEN** the system returns HTTP 401

### Requirement: Shared ordering domain module
The system SHALL place cart pricing, checkout, and order-creation logic in a shared module (e.g. `lib/ordering`) consumed by both server components and API route handlers, so the storefront and API enforce identical business rules.

#### Scenario: Single place-order function
- **WHEN** an order is placed via the storefront OR via the public API
- **THEN** both paths call the same `lib/ordering.placeOrder(...)` function so validation, pricing, and persistence behave identically
