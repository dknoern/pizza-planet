# public-api Specification

## Purpose
A versioned public REST surface at `/api/v1/*` covering auth, menu, cart, and orders. Every route is a thin adapter over the shared `lib/` modules — no business logic lives in route handlers. Requests authenticate via either the session cookie used by the UI or an `Authorization: Bearer pp_live_<token>` API key. Input is validated at the boundary with strict zod schemas (unknown fields rejected) and errors share a single envelope: `{ error: { code, message, details? } }`. An OpenAPI 3.1 document is served at `/api/openapi.json` and rendered as Swagger UI at `/docs`.

## Requirements

### Requirement: Versioned REST API surface
The system SHALL expose a public REST API rooted at `/api/v1/` covering auth, menu, cart/checkout, and orders. All responses SHALL be JSON with `Content-Type: application/json; charset=utf-8`, and all error responses SHALL share a single envelope: `{ "error": { "code": "<UPPER_SNAKE>", "message": "<human readable>", "details"?: <object> } }`.

#### Scenario: Successful response shape
- **WHEN** a client calls any `/api/v1/...` endpoint and the operation succeeds
- **THEN** the response is `200`/`201`/`204` with a JSON body (or empty for `204`) and `Content-Type: application/json; charset=utf-8`

#### Scenario: Error envelope shape
- **WHEN** any `/api/v1/...` endpoint fails
- **THEN** the response body matches `{ error: { code, message, details? } }` with the appropriate HTTP status

### Requirement: API authentication via session cookie or bearer token
The system SHALL accept authentication either via the same session cookie used by the UI or via an `Authorization: Bearer <token>` API key issued to a customer account. Endpoints that require authentication SHALL return HTTP 401 when neither is present or valid.

#### Scenario: Cookie-authenticated request from the UI
- **WHEN** the UI calls an authenticated endpoint with a valid session cookie
- **THEN** the request is treated as the cookie's customer

#### Scenario: Bearer token from an integrator
- **WHEN** an external client calls an authenticated endpoint with `Authorization: Bearer <valid-key>`
- **THEN** the request is treated as the key's owning customer

#### Scenario: No credentials
- **WHEN** an authenticated endpoint is called with neither a session cookie nor a bearer token
- **THEN** the response is HTTP 401 with error code `UNAUTHENTICATED`

### Requirement: Documented endpoint set
The system SHALL provide at least the following endpoints under `/api/v1`:

- `POST /auth/signup` — create account (public)
- `POST /auth/login` — start session (public)
- `POST /auth/logout` — end session (authenticated)
- `GET  /menu` — list menu items (public)
- `GET  /menu/{id}` — get menu item detail (public)
- `POST /orders` — place an order (authenticated OR guest with inline contact info)
- `GET  /orders` — list current customer's orders (authenticated)
- `GET  /orders/{id}` — get one order (authenticated owner, OR guest with valid lookup token)

#### Scenario: Each endpoint exists and uses the documented method
- **WHEN** a client sends a request to any endpoint listed above with the documented HTTP method
- **THEN** the request reaches a handler — i.e. the response is NOT `404 Not Found` or `405 Method Not Allowed`

#### Scenario: Method mismatch returns 405
- **WHEN** a client sends a request to a documented path with an HTTP method that the path does not support
- **THEN** the response is HTTP 405 with the `Allow` header listing supported methods

### Requirement: Input validated at the boundary
The system SHALL validate every request body and query string against a schema (zod or equivalent) at the API boundary, and SHALL reject invalid input with HTTP 400 and error code `VALIDATION_FAILED`, including a `details` object describing which fields failed.

#### Scenario: Missing required field
- **WHEN** a client sends a `POST /api/v1/auth/signup` request missing the `email` field
- **THEN** the system returns HTTP 400 with `error.code = "VALIDATION_FAILED"` and `error.details.email` describing the failure

#### Scenario: Extra unknown fields ignored or rejected consistently
- **WHEN** a client sends a request with fields not defined in the schema
- **THEN** the system applies a single project-wide policy (strip-unknown OR reject-unknown) consistently across all endpoints, documented in design.md
