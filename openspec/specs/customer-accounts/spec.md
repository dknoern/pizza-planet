# customer-accounts Specification

## Purpose
Customer identity for Pizza Planet: email/password sign-up and login, secure session management via HTTP-only cookies, and salted password hashing (bcrypt cost 12). All password handling and session resolution lives in `lib/auth/` and is consumed by both the storefront and the public REST API.

## Requirements

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

### Requirement: Customer sign-in with Login with Amazon (federated)
The system SHALL allow a visitor to authenticate using Login with Amazon as an alternative to email/password. The integration SHALL use the OAuth 2.0 Authorization Code grant with PKCE (S256) against Login with Amazon, exchange the authorization code server-side for an access token, fetch the Amazon customer profile, and establish a Pizza Planet session. Email/password sign-in SHALL continue to work unchanged.

#### Scenario: New visitor signs in with Amazon
- **WHEN** a visitor with no existing Pizza Planet account clicks "Sign in with Amazon", completes consent on Amazon, and is redirected back with a valid authorization code, AND the returned Amazon email does not match any existing customer
- **THEN** the system creates a new `Customer` with `email`, `name`, and `amazonUserId` populated from the Amazon profile, stores an unguessable random placeholder in `passwordHash`, establishes a session, and redirects to the post-login destination

#### Scenario: Existing email/password customer signs in with Amazon (auto-link)
- **WHEN** a visitor completes Amazon consent and the returned Amazon email matches the `email` of an existing `Customer` that has a `null` `amazonUserId`
- **THEN** the system sets `amazonUserId` on that existing customer to the Amazon `user_id`, leaves the existing `passwordHash` untouched, establishes a session, and redirects the visitor as the existing customer

#### Scenario: Returning Amazon customer signs in
- **WHEN** a visitor completes Amazon consent and the returned Amazon `user_id` matches the `amazonUserId` of an existing `Customer`
- **THEN** the system establishes a session for that customer without modifying any stored fields

#### Scenario: Amazon user_id and email both already in use by different customers
- **WHEN** the returned Amazon `user_id` matches one customer record AND the returned Amazon email matches a different customer record
- **THEN** the system trusts the `user_id` match, signs in the customer identified by `amazonUserId`, and does NOT modify the other record

### Requirement: Authorization request includes CSRF state and PKCE challenge
The system SHALL generate a cryptographically random `state` value (≥128 bits) and a PKCE `code_verifier` (43–128 chars per RFC 7636) for every authorization request, store both in a short-lived HTTP-only signed cookie scoped to the callback path, and send `state` and `code_challenge` (S256 hash of the verifier) on the redirect to Amazon's authorization endpoint.

#### Scenario: State and verifier persist across the redirect
- **WHEN** the system initiates the Amazon authorization redirect
- **THEN** the response sets a short-lived (≤10 minutes) HTTP-only, Secure, SameSite=Lax cookie containing the `state` and `code_verifier`, and the redirect URL includes `state`, `code_challenge`, `code_challenge_method=S256`, `response_type=code`, the registered `client_id`, the registered `redirect_uri`, and `scope=profile`

#### Scenario: Callback rejects mismatched state
- **WHEN** the callback request's `state` query parameter does not match the value in the signed cookie, OR the cookie is missing or expired
- **THEN** the system rejects the request with HTTP 400 and an error code of `INVALID_STATE`, does not exchange the code, and does not establish a session

### Requirement: Token exchange and profile fetch happen server-side over HTTPS
The system SHALL exchange the authorization code for an access token by POSTing to the Login with Amazon token endpoint (`https://api.amazon.com/auth/o2/token`) with `client_id`, `client_secret`, `code`, `redirect_uri`, `code_verifier`, and `grant_type=authorization_code`, then fetch the customer profile from `https://api.amazon.com/user/profile` using the returned `access_token` as a Bearer token. The `client_secret` SHALL NEVER be sent to the browser.

#### Scenario: Successful code exchange and profile retrieval
- **WHEN** the callback presents a valid code matching the registered `redirect_uri` and a verifier matching the stored challenge
- **THEN** the system obtains an `access_token`, fetches the profile (containing `user_id`, `email`, `name`), discards the `access_token` and `refresh_token` (if present) without persisting them, and proceeds to session establishment

#### Scenario: Code exchange fails
- **WHEN** the token endpoint returns a non-2xx response (e.g., invalid_grant, expired code, redirect_uri mismatch)
- **THEN** the system rejects the sign-in with HTTP 400 and an error code of `LWA_EXCHANGE_FAILED`, logs the upstream error (without the `client_secret`), and does NOT establish a session

#### Scenario: Profile fetch fails or returns missing fields
- **WHEN** the profile endpoint returns a non-2xx response, OR the response is missing `user_id` or `email`
- **THEN** the system rejects the sign-in with HTTP 502 and an error code of `LWA_PROFILE_UNAVAILABLE`, and does NOT establish a session or create a customer record

### Requirement: Customer record carries an optional Amazon user identifier
The system SHALL store the Amazon `user_id` (a string of the form `amzn1.account.…`) on the `Customer` record in a field named `amazonUserId`. The field SHALL be optional (nullable). At most one Pizza Planet customer SHALL be linked to a given Amazon `user_id`; this invariant is enforced at the application layer (the callback handler looks up by `amazonUserId` and by email before deciding to create or link). The field is indexed but NOT marked unique at the database, because MongoDB's default unique index treats multiple nulls as a collision and Prisma's MongoDB connector cannot express a partial/sparse unique index.

#### Scenario: Duplicate amazonUserId rejected by the application
- **WHEN** the system attempts to link an Amazon `user_id` that is already attached to a different `Customer`, AND the incoming email does not match that customer
- **THEN** the system returns HTTP 409 with an error code of `AMAZON_ACCOUNT_ALREADY_LINKED`, and no session is established and no new record is created

### Requirement: Federated session uses the same iron-session cookie
The system SHALL persist authentication after a successful LWA sign-in using the same iron-session cookie mechanism used by email/password login (`lib/auth/session.ts`). The session payload SHALL contain only the Pizza Planet `customerId`; it SHALL NOT contain the Amazon `access_token`, `refresh_token`, or any LWA-issued credential.

#### Scenario: LWA-authenticated request resolves via session cookie
- **WHEN** a request from a previously LWA-authenticated browser presents the Pizza Planet session cookie
- **THEN** `resolveCustomer` returns the linked `Customer` with `authSource = "session"`, indistinguishable from an email/password-authenticated session
