## ADDED Requirements

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
