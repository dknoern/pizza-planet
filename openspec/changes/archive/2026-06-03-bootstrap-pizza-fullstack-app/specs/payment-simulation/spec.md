## ADDED Requirements

### Requirement: Simulated payment-processor interface
The system SHALL expose a single `PaymentProcessor` interface with `authorize(amountCents, card, metadata)` returning either `{ status: "APPROVED", authorizationId }` or `{ status: "DECLINED", reason }`. The interface SHALL be the only entry point used by the ordering module so a real gateway can be swapped in by changing the binding.

#### Scenario: Ordering uses the interface, not a concrete impl
- **WHEN** the ordering module needs to capture payment
- **THEN** it invokes the injected `PaymentProcessor.authorize(...)` and never calls the simulator directly

### Requirement: Deterministic simulated authorization outcomes
The system SHALL ship a `SimulatedPaymentProcessor` implementation whose outcome is determined by the card number, so tests and demos can reliably produce approvals and declines without a real gateway.

#### Scenario: Test card 4111... approves
- **WHEN** `authorize` is called with card number `4111 1111 1111 1111` and a non-zero amount
- **THEN** the processor returns `APPROVED` with a generated `authorizationId` and a `last4` of `1111`

#### Scenario: Test card 4000...0002 declines
- **WHEN** `authorize` is called with card number `4000 0000 0000 0002`
- **THEN** the processor returns `DECLINED` with `reason: "INSUFFICIENT_FUNDS"`

#### Scenario: Any other Luhn-valid card approves
- **WHEN** `authorize` is called with any other Luhn-valid 13–19 digit card number
- **THEN** the processor returns `APPROVED`

#### Scenario: Invalid card rejected before authorization
- **WHEN** `authorize` is called with a card number that fails Luhn validation, has the wrong length, has an expired date, or has a malformed CVV
- **THEN** the processor returns `DECLINED` with `reason: "INVALID_CARD"` and no authorization id

### Requirement: No raw card data persisted
The system SHALL NOT persist the card PAN, CVV, or expiry beyond the lifetime of the authorization call. Persisted order records SHALL contain only `last4`, `brand`, and `authorizationId`.

#### Scenario: Database has no PAN field
- **WHEN** an order is stored after a successful authorization
- **THEN** the persisted payment block contains `last4`, `brand`, `authorizationId`, `amountCents` — and no field that holds the full card number or CVV

#### Scenario: PAN never appears in logs or responses
- **WHEN** the system logs a payment event or returns an order to a client
- **THEN** the output contains at most a masked representation (e.g. `**** **** **** 1111`) and never the full PAN
