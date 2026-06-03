## ADDED Requirements

### Requirement: Customer sign-up with email and password
The system SHALL allow a visitor to create a customer account by providing a unique email address, a password, and a display name. The system SHALL store only a salted hash of the password (using bcrypt or argon2) and SHALL never persist the plaintext password.

#### Scenario: Successful sign-up
- **WHEN** a visitor submits a valid email, a password of at least 8 characters with at least one letter and one digit, and a non-empty name
- **THEN** the system creates a customer record, stores a salted hash of the password, establishes a session, and returns the authenticated customer profile

#### Scenario: Email already registered
- **WHEN** a visitor submits a sign-up request with an email that already exists in the customers collection
- **THEN** the system rejects the request with HTTP 409 and an error code of `EMAIL_TAKEN`, and does not create a duplicate record

#### Scenario: Weak password rejected
- **WHEN** a visitor submits a password shorter than 8 characters or missing letters/digits
- **THEN** the system rejects the request with HTTP 400 and an error code of `WEAK_PASSWORD`, and does not create an account

### Requirement: Customer login with email and password
The system SHALL authenticate returning customers by comparing the submitted password against the stored hash using a constant-time verification function, and SHALL issue a session credential on success.

#### Scenario: Successful login
- **WHEN** a customer submits the email and password matching an existing account
- **THEN** the system issues a secure HTTP-only session cookie and returns the customer profile

#### Scenario: Wrong password or unknown email
- **WHEN** a visitor submits credentials that do not match any account, OR submits the right email but the wrong password
- **THEN** the system returns HTTP 401 with a generic `INVALID_CREDENTIALS` error and does NOT disclose whether the email exists

#### Scenario: Login attempts are rate-limited per email
- **WHEN** more than 10 failed login attempts target the same email within 15 minutes
- **THEN** the system rejects further attempts for that email with HTTP 429 until the window expires

### Requirement: Authenticated session management
The system SHALL maintain authenticated customer sessions via secure HTTP-only, SameSite=Lax cookies signed with a server-side secret, and SHALL provide a logout endpoint that invalidates the session.

#### Scenario: Session cookie used on subsequent requests
- **WHEN** a logged-in customer makes a request with a valid session cookie
- **THEN** the system resolves the customer identity from the session and treats the request as authenticated

#### Scenario: Logout clears the session
- **WHEN** a customer invokes the logout endpoint
- **THEN** the system invalidates the session and instructs the browser to clear the session cookie

#### Scenario: Expired or tampered session rejected
- **WHEN** a request presents a session cookie that has expired, has an invalid signature, or references a non-existent session
- **THEN** the system treats the request as unauthenticated and (for protected routes) returns HTTP 401

### Requirement: Password storage uses salted hashing
The system SHALL hash all customer passwords with a cryptographic password-hashing function (bcrypt with cost ≥ 12, or argon2id with sensible parameters) before persisting. The system SHALL NOT log, return, or otherwise expose password hashes outside of the authentication module.

#### Scenario: Password hash never leaves the auth module
- **WHEN** any API response or server-rendered page is produced for a customer
- **THEN** the response payload contains no `passwordHash`, `password`, or equivalent field
