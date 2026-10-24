# HaatBazar — InfinityFree Deployment Plan

## Target
Deploy the HaatBazar marketplace to InfinityFree, with a downloadable deployment ZIP and a live website.

## Important compatibility finding
The current application is a Vite/React frontend with a Node.js/Express backend. The backend uses Node.js, `better-sqlite3`, SQLite-backed sessions, and a local uploads directory. InfinityFree's shared hosting supports PHP and MySQL, but it does not run a persistent Node.js/Express server or the native SQLite dependency. Uploading the current repository or its Vite build directly will therefore not deliver a working full-stack store.

## Deployment strategy for the requested host
1. Keep the current React/Vite UI and build a production static frontend.
2. Replace the Express/SQLite API with PHP 8.x endpoints and MySQL/MariaDB tables suitable for InfinityFree.
3. Port and test the core flows: product listings, registration/login, session handling, cart/checkout, order creation, admin authorization, and order management.
4. Use server-side validation, password hashing, CSRF protection where appropriate, rate limits/abuse controls, and prepared SQL statements. Never put database credentials or gateway secrets in frontend code or the public repository.
5. Integrate payment only through a provider's official hosted checkout/API and verify payment status server-side before marking an order paid. Do not store card data. The provider and merchant credentials must be supplied/configured by the site owner.
6. Build a clean deployment package with only required public files, PHP API files, SQL schema/seed files, and setup instructions. Exclude development dependencies, local databases, secrets, and private uploads.
7. Test on a staging subdomain before replacing the existing live website; keep a backup of the current website and database.

## InfinityFree setup required from the owner
- Hosting account and domain/subdomain already created in InfinityFree.
- MySQL database created in the control panel. Keep the database host, database name, username, and password private; enter them only in the server-side config file after downloading the package.
- Confirm the final public domain/URL.
- Choose the payment provider (for Bangladesh, for example SSLCOMMERZ or a supported bKash/Nagad merchant integration) and complete that provider's merchant onboarding.
- Supply genuine business details required for production: legal/business name, address, contact phone, support email, and any required registration/licence information. Do not publish credentials in GitHub issues or chat.

## Release acceptance checklist
- [ ] Product list and product details load from MySQL.
- [ ] Registration/login/logout work; passwords are hashed and sessions are secure.
- [ ] Cart totals and stock/quantity checks are recalculated on the server.
- [ ] Checkout creates an order safely and shows an order reference.
- [ ] Admin routes require server-verified admin permissions.
- [ ] Order statuses can be viewed and updated by authorized staff.
- [ ] Payment success/cancel/failure callbacks are verified server-side and duplicate callbacks are idempotent.
- [ ] Mobile layout works at narrow widths.
- [ ] No credentials, secrets, debug output, or private data are shipped in the ZIP.
- [ ] Deployment tested on the real InfinityFree account and domain.

## Preview versus production
GitHub Pages can host a static preview, but it cannot run the PHP/MySQL backend either. Treat the GitHub Pages site as a UI preview only; the complete store must run on the PHP/MySQL host.
