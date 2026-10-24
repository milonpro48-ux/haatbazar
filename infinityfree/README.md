# HaatBazar — InfinityFree PHP/MySQL migration starter

This folder is a separate hosting adapter so the existing Node.js app remains untouched while the InfinityFree-compatible backend is built.

## Included
- api/index.php: initial JSON API for product listing, registration/login/logout, COD checkout, admin order listing/status changes, and SSLCOMMERZ session/callback validation.
- config.example.php: private server configuration template.
- database/schema.sql: MySQL schema for users, listings, orders, and payment transactions.

## Install on InfinityFree
1. Create the hosting account and domain/subdomain; enable HTTPS.
2. Create a MySQL database in the InfinityFree control panel.
3. Import database/schema.sql into that database using phpMyAdmin.
4. Upload the contents of infinityfree/ to your website folder. Protect config.php and database files from direct web access using server rules; keep credentials outside public folders when your hosting setup allows it.
5. Copy config.example.php to config.php; set database connection, public base URL, and SSLCOMMERZ sandbox credentials. Never commit the real config.
6. Seed products and create the first admin account by generating a password hash with PHP password_hash('YOUR_LONG_PASSWORD', PASSWORD_DEFAULT) and inserting the hash into users.password_hash. Do not use a plaintext password in SQL.
7. Configure SSLCOMMERZ sandbox IPN URL as https://YOUR_DOMAIN/api/?action=sslcommerz_ipn.
8. Test COD orders, then SSLCOMMERZ sandbox success/failure/cancel flows. Do not enable live mode until merchant approval and end-to-end verification.

## Important current limitations
- This is an API foundation, not yet a complete production deployment. The React frontend still needs to be wired to these API routes.
- The current order schema supports one product line per order record. COD can create one order record per cart line; online checkout currently requires one line at a time.
- Product creation/editing, image upload, password reset, CSRF token retrieval integration in the frontend, throttling, account verification, and a full admin UI still need to be completed and tested.
- Never put SSLCOMMERZ credentials in JavaScript or expose them in GitHub.

SSLCOMMERZ official flow requires a server-created payment session and server-side validation of the transaction/IPN before treating it as paid: https://developer.sslcommerz.com/doc/v4/index.html
