# HaatBazar — InfinityFree PHP/MySQL deployment adapter

This folder contains the PHP/MySQL adapter intended to run on the same domain as the built React frontend. The frontend calls relative `/api` URLs; `.htaccess` maps supported routes to `api/index.php` and falls back to `index.html` for client-side React routes.

## Create a deployment ZIP

The GitHub Actions workflow **Package HaatBazar for InfinityFree** builds the frontend with demo mode disabled, runs the TypeScript/Vite build and PHP syntax checks, and uploads an artifact named `haatbazar-infinityfree`. Download the ZIP from the successful workflow run's Artifacts section. This validates packaging and syntax only; it does not connect to your live hosting account or database.

## Install on InfinityFree

1. In the InfinityFree control panel, add/confirm `haatbazar1.kesug.com` and enable HTTPS.
2. Create a MySQL database. Copy the exact database hostname, database name, username, and password shown by InfinityFree; the hostname is not normally `localhost`.
3. Open phpMyAdmin for that database and import `database/schema.sql` from the ZIP.
4. Copy `config.example.php` to `config.php` in the ZIP's root. Fill in the real DB details and set `public_base_url` to `https://haatbazar1.kesug.com`. Keep the real `config.php` private and never commit it to GitHub.
5. Upload the *contents* of the ZIP's `haatbazar-infinityfree` folder into the domain's `htdocs` directory. Do not upload the parent folder as a nested directory. Keep `.htaccess` enabled.
6. Create the first admin user with a PHP `password_hash()` result stored in `users.password_hash`; never store a plaintext password.
7. Start with test listings and cash-on-delivery. Verify login/logout, session/CSRF, listing create/read, buyer order, seller/admin permissions, and deep links.
8. Configure SSLCommerz sandbox credentials privately and verify success/failure/cancel/IPN callbacks before considering live payment. Do not treat a browser redirect alone as proof of payment.

## Current limitations / launch blockers

- The package does not include your hosting account's database credentials, seeded admin user, real payment credentials, or any provider secrets.
- Live MySQL/InfinityFree end-to-end testing is still required after upload.
- Product image upload/editing, password reset, throttling, account verification, courier/SMS integrations, and a complete admin UI are not yet production-complete.
- The schema supports one product line per order record; online checkout currently requires one line at a time.
- Do not enable real payments or advertise the marketplace as fully operational until the test checklist passes.

SSLCOMMERZ requires server-side transaction validation before an order is treated as paid: https://developer.sslcommerz.com/doc/v4/index.html
