# InfinityFree PHP/MySQL migration

## Status
The PHP API now implements initial authentication, public listing search/detail, listing create/update, order creation/history, seller order views, and admin listing/order status routes. Frontend-compatible `/api/listings` and `/api/listings/:id` aliases and CSRF response field compatibility are included. Order creation reserves stock transactionally; cancellation restores stock once and invalid transitions are rejected.

The live backend remains Node.js/SQLite. This branch is **not yet a complete drop-in replacement** and must not be deployed as the live API yet. CI tests run against isolated test databases only; InfinityFree staging has not been verified.

## Phases
1. Inventory and schema: map all SQLite entities and existing `/api/...` routes to PHP/PDO/MySQL.
2. Read-only endpoints: health, catalog, session user, public listing search/detail; compare JSON shapes with the frontend.
3. Identity/security: login/register/logout, PHP sessions, password_hash/password_verify and CSRF protection are implemented. Rate limiting, phone/email verification, OTP expiry/attempt limits and password reset remain incomplete.
4. Marketplace writes: initial listing create/update and field validation are implemented. Secure upload lifecycle, analytics endpoints and seller verification workflow remain incomplete.
5. Orders/admin: initial order creation, buyer-owned order history, seller order views, admin listing/order status operations and status audit history are implemented. Stock reservation/restoration is transactional; full admin user management and complete status/payment/shipping parity remain incomplete.
6. Integrations: payment callback signature verification/idempotency; courier duplicate-booking lock; fail closed when credentials are absent.
7. Parity tests and deployment: PHP lint, MySQL schema import, endpoint contract tests, staging, backup and rollback plan.

## Security requirements
- Use PDO prepared statements for every value; never concatenate user input into SQL.
- Rotate session ID on login; HttpOnly, SameSite=Lax and Secure cookies on HTTPS.
- Require CSRF tokens for session-authenticated writes.
- Hash passwords; never log or return OTPs or secrets.
- Enforce admin role on every admin endpoint and ownership on customer order/image endpoints.
- Payment/courier integrations stay disabled and return safe errors until configured and tested.
- Do not commit real credentials. Enter the assigned MySQL host/database/user/password privately in hosting configuration; never guess these values.

## Data mapping
SQLite `users`, `listings`, `orders`, `analytics_events`, `uploaded_images`, `marketing_settings`, `otp_challenges`, `seller_verifications`, `payment_transactions`, `courier_shipments` map to MySQL tables of the same names. `order_status_history` preserves order status changes and actor identity.

## Acceptance gates before cutover
- PHP lint passes; schema imports into a clean MySQL database.
- Public API responses match current frontend expectations, including `/api/listings`, `/api/listings/:id`, and the frontend CSRF field name.
- Auth rate limiting, password reset/OTP, phone reveal, image upload ownership/lifecycle, seller verification, payment callbacks and courier booking have dedicated implementations and tests before cutover.
- Unauthenticated admin writes fail; a buyer cannot read another buyer's orders.
- SQL injection, CSRF, upload ownership, invalid listing data and session fixation tests pass.
- Order status changes create audit rows; courier duplicate booking is blocked.
- Missing payment/SMS/courier configuration fails closed.
- Keep the Node/SQLite version as rollback until staging verification is complete.

GitHub Pages remains a static demo and cannot run this backend. Confirm the hosting PHP version and PDO MySQL support before deployment.