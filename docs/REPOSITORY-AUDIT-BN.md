# HaatBazar repository audit — 2026-10-23

Scope: `milonpro48-ux/haatbazar` only. This report is based on source inspection and static checks; it does not claim that production payments, SMS, courier booking, or live orders have been exercised.

## Checks already run against the supplied v2 archive

- `node --check server.js`: passed.
- `node --check scripts/seo-audit.mjs`: passed.
- `node --check scripts/check-integrations.mjs`: passed.
- `node scripts/validate-catalog.mjs`: passed (12 categories, 64 districts, 102 subcategories).
- `node scripts/seo-audit.mjs`: requires `PUBLIC_BASE_URL` or `SEO_AUDIT_URL`; the audit has not been fully completed against the live domain.
- `node scripts/check-integrations.mjs`: reports missing `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SMS_API_URL`, `SMS_API_KEY`, `COURIER_API_URL`, and `COURIER_API_KEY`.
- Full Vite/TypeScript build and provider sandbox transactions remain unverified.

## Source-level observations

1. The frontend requests listings from `GET /api/listings` and expects the JSON response to contain `items`. If the server is unavailable or returns another shape, the frontend returns an empty list unless `VITE_DEMO_MODE=true`. Check the deployed endpoint and browser Network tab before enabling demo data on a production site.
2. The order form creates an order first and then starts SSLCommerz only when a payment method other than “pay later” is selected. Verify that the backend stores the buyer email, calculates the authoritative total from the listing and quantity, checks stock, and ties the order to the correct buyer before enabling payments.
3. Payment callbacks must be tested in the gateway sandbox; never treat a browser redirect alone as proof of payment. The current server source attempts SSLCommerz validation on success callbacks, while fail/cancel redirects are not trusted as payment evidence.
4. OTP delivery uses a generic HTTP JSON SMS adapter. The real provider's request schema, sender ID, approval, and delivery behavior must be confirmed with the selected SMS provider.
5. Courier integration is a generic adapter and assumes particular request headers/payload and status endpoint conventions. Confirm these against the chosen courier account's current API documentation and sandbox before live shipment creation.
6. The SEO audit must run against `https://haatbazar1.kesug.com` only after the live host serves `/robots.txt`, `/sitemap.xml`, and crawlable HTML correctly.

## Safe go-live checklist

- [ ] GitHub Actions build and catalog checks pass on the exact deployment commit.
- [ ] Confirm hosting supports the required Node.js version, persistent filesystem for SQLite/session/uploads, and long-running Node processes.
- [ ] Configure environment variables in the hosting control panel (never commit real secrets).
- [ ] Test registration, login, session persistence, listing create/edit, image upload, and listing retrieval.
- [ ] Test order creation with invalid listing IDs, quantities beyond stock, and unauthenticated requests.
- [ ] Test SSLCommerz sandbox: init, success, fail, cancel, IPN, amount/currency/transaction validation, duplicate callbacks, and order ownership.
- [ ] Test OTP expiry, incorrect-code limit, provider errors, and successful SMS delivery.
- [ ] Test courier sandbox create/status refresh and duplicate shipment prevention.
- [ ] Run `PUBLIC_BASE_URL=https://haatbazar1.kesug.com npm run seo:audit` in an environment that can reach the public site (PowerShell syntax differs).
- [ ] Take and verify a database backup before deploying changes.

## Important

Do not commit credentials or fabricated legal/business details. A successful CI build proves the code compiles; it does not prove third-party services or the production host work.
