# menu-catalog Specification

## Purpose
Public, unauthenticated catalog of pizzas, sides, and drinks with their sizes, toppings, and pricing. A single `lib/menu` module is the only reader of menu data, so the storefront server components and the `GET /api/v1/menu*` endpoints can never return divergent menus.

## Requirements

### Requirement: Public menu listing
The system SHALL provide a public, unauthenticated listing of available pizzas, sides, and drinks, including name, description, base price, and available size or topping options. The same data source SHALL back both the server-rendered storefront and the public REST API.

#### Scenario: Storefront renders the menu
- **WHEN** any visitor (signed in or not) loads the menu page
- **THEN** the page server-renders all menu items marked `available: true`, including price and size/topping options

#### Scenario: API returns the menu
- **WHEN** a client sends `GET /api/v1/menu`
- **THEN** the system returns HTTP 200 with a JSON array of available menu items, each containing `id`, `name`, `description`, `basePriceCents`, `sizes[]`, `toppings[]`, and `category`

#### Scenario: Unavailable items hidden from public surfaces
- **WHEN** a menu item has `available: false`
- **THEN** it does not appear in either the storefront or the `/api/v1/menu` response

### Requirement: Menu item detail
The system SHALL allow visitors to retrieve the full detail of a single menu item, including all configurable options and the rules for computing the final price.

#### Scenario: Fetch item by id
- **WHEN** a client sends `GET /api/v1/menu/{id}` for an existing, available item
- **THEN** the system returns HTTP 200 with the item, its size options (each with a `priceDeltaCents`), and its topping options (each with a `priceDeltaCents`)

#### Scenario: Unknown item id
- **WHEN** a client requests a menu item id that does not exist or is unavailable
- **THEN** the system returns HTTP 404 with error code `MENU_ITEM_NOT_FOUND`

### Requirement: Menu data sourced from the database via shared domain code
The system SHALL read menu data through a single shared module (e.g. `lib/menu`) that is consumed by both server components and the API route handlers, so storefront and API responses can never diverge.

#### Scenario: Shared module is the only menu reader
- **WHEN** the storefront or any API route needs menu data
- **THEN** it calls the shared `lib/menu` module rather than querying Prisma directly
