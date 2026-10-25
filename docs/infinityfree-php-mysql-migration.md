# InfinityFree PHP/MySQL migration

## Status
Phase 1 scaffolding only. The live backend remains Node.js/SQLite. This branch is not a drop-in replacement and must not be deployed as the live API yet.

## Phases
1. Inventory and schema: map all SQLite entities and existing `/api/...` routes to PHP/PDO/MySQL.
2. Read-only endpoints: health, catalog, session user, public listing search/detail; compare JSON shapes with the frontend.
3. Identity/security: login/register/logout, PHP sessions, password_hash/password_verify, CSRF protection, rate limits, OTP expiry/attempt limits.
4. Marketplace writes: listing validation/CRUD, secure uploads, analytics and seller verification.
5. Orders/admin: order creation, buyer-owned order history, admin-only CRUD/status/audit log; transactions and foreign keys.
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
- Public API responses match current frontend expectations.
- Unauthenticated admin writes fail; a buyer cannot read another buyer's orders.
- SQL injection, CSRF, upload ownership, invalid listing data and session fixation tests pass.
- Order status changes create audit rows; courier duplicate booking is blocked.
- Missing payment/SMS/courier configuration fails closed.
- Keep the Node/SQLite version as rollback until staging verification is complete.

GitHub Pages remains a static demo and cannot run this backend. Confirm the hosting PHP version and PDO MySQL support before deployment.