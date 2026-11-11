# HaatBazar panels-v3 integration audit (বাংলা)

তারিখ: 2026-10-25
Repository: `milonpro48-ux/haatbazar`
মূল শাখা: `main` (এই রিপোর্ট তৈরির সময় HEAD: `28773cd67c0056fa7d9d649f8aa47f9c57e453b0`)
পরিধি: বর্তমান repository, tracked `haatbazar-payments-otp-courier-seo-v2.zip`, এবং আপলোড করা `haatbajaar-panels-v3.zip`-এর source-level তুলনা।

## সিদ্ধান্ত সংক্ষেপ

**নতুন ZIP-টি সরাসরি main-এ কপি/মার্জ করা যাবে না।** এটি আলাদা PHP + MySQL mini-store, যার ডেটাবেস টেবিল `hb_users`, `hb_products`, `hb_orders`। বর্তমান React + Node app-এর schema `users`, `listings`, `orders`; আর repository-র InfinityFree PHP API-তে একই নামের কিন্তু আলাদা কাঠামোর MySQL schema আছে। সরাসরি দুটো যোগ করলে আলাদা account, product ও order store তৈরি হবে এবং অ্যাডমিনের পরিবর্তন মূল সাইটে প্রতিফলিত হবে না।

প্রস্তাবিত পদ্ধতি: React UI ও বর্তমান catalog/SEO ধারণা রাখা; নতুন ZIP থেকে দরকারি admin workflow ও Bangla UI ধারণা নেওয়া; তারপর **একটি canonical backend/schema**-তে feature port করা। যদি hosting target InfinityFree হয়, PHP/MySQL API-কে production backend হিসেবে পূর্ণ করা এবং React frontend-কে সেই API-তে wire করা লাগবে। Node/SQLite backend-কে একই production database হিসেবে পাশাপাশি চালানো হবে না।

## ১. নতুন ZIP-এর ফাইল-ভিত্তিক ফলাফল

| ZIP path | ফলাফল | পরবর্তী পদক্ষেপ |
|---|---|---|
| `hbpanel/admin/index.php` | **PHP parse error**: line 22-এ `elseif` এসেছে, কিন্তু তার আগের `if/while/switch` কাঠামো নেই। ফাইলের শুরুতে `order_query()` নিজের ভেতরেই নিজেকে call করছে এবং `$db`, `$p`, `$ret`, `$cats`, `$catopts` ব্যবহার হচ্ছে অথচ এখানে সেটআপ/সংজ্ঞা নেই। | সরাসরি ব্যবহার নয়; অ্যাডমিন রাউটিং ও POST action handler নতুন করে ঠিক করতে হবে। |
| `hbpanel/lib.php` | PDO prepared statements, output escaping, session login, CSRF helper ও upload validation-এর ভালো ভিত্তি আছে। কিন্তু এটি `config.php` এবং `hb_*` schema-এর ওপর নির্ভরশীল। | দরকারি নিরাপত্তা ধারণা port করতে হবে; schema আলাদা রাখব না। |
| `hbpanel/install.php` | প্রথম অ্যাডমিন তৈরির installer; পুরোনো `hb_*` টেবিল বানায়। | বর্তমান canonical migration/installer-এর সঙ্গে একীভূত না করে চালানো যাবে না। |
| `hbpanel/login.php`, `register.php`, `account/index.php` | ফোন + password ভিত্তিক আলাদা account flow। | বিদ্যমান account/role model-এর সঙ্গে মিলিয়ে feature port করতে হবে; দুই login system রাখা যাবে না। |
| `hbpanel/shop.php` | পণ্য দেখা, stock check, server-side price, COD/bKash/Nagad নির্বাচন ও order তৈরির flow। | checkout/stock/price ধারণা গ্রহণ; কিন্তু provider payment আসলে wired না হওয়া পর্যন্ত bKash/Nagad paid হিসেবে দেখানো যাবে না। |
| `hbpanel/invoice.php` | ইনভয়েস পেজ আছে। | canonical order ID এবং payment state-এর সঙ্গে যুক্ত করতে হবে। |
| `hbpanel/api-products.php`, `api-notice.php` | ছোট আলাদা API endpoint। | বিদ্যমান API contract-এর সঙ্গে মিলিয়ে নেওয়ার আগে সরাসরি publish নয়। |
| `hbpanel/config.sample.php`, `.htaccess`, `uploads/.htaccess` | config template ও upload-directory protection-এর ধারণা আছে। | secrets GitHub-এ নয়; upload access ও execution rules যাচাই করতে হবে। |

### PHP syntax পরীক্ষা

ZIP-এর সব PHP ফাইলে `php -l` চালানো হয়েছে। `admin/index.php`-এ parse error পাওয়া গেছে; `account/index.php`, `shop.php`, `config.sample.php`, `invoice.php`, `register.php`, `logout.php`, `lib.php`, `login.php`, `api-notice.php`, `install.php` syntax check পাস করেছে। Syntax pass মানেই security বা runtime behavior verified নয়।

## ২. বর্তমান repository-তে যা আছে

- React + Vite frontend; `src/lib/api.ts` একই-origin `/api` endpoint-এ listing/order/payment/OTP call করে।
- Node + Express + SQLite backend: `server.js`; persistent `DATA_DIR`, session, listing/order/OTP/payment/seller-verification logic-এর ভিত্তি আছে।
- `infinityfree/api/index.php` ও `infinityfree/database/schema.sql`: PHP/MySQL deployment adapter আছে, কিন্তু repository-র নিজস্ব README এটিকে এখনও API foundation বলে—frontend wiring, product CRUD, image upload, full admin UI, throttling ও account verification-এর কাজ বাকি।
- `haatbazar-payments-otp-courier-seo-v2.zip` repository-তে আছে। আগের audit-এ catalog validation পাস হয়েছিল; SSLCommerz/SMS/courier credentials অনুপস্থিত এবং provider sandbox/live transactions verified নয়।
- GitHub Actions-এ static preview workflow সফল হয়েছে; এটি live PHP API, Node server, payment provider বা courier connection সফল হওয়ার প্রমাণ নয়।

## ৩. Feature mapping: কী রাখব, কী port করব

| Feature | Source of truth / implementation direction |
|---|---|
| Homepage, category/district search, product cards, SEO | বর্তমান React frontend বজায় |
| User roles, sellers, listings, orders | একটিমাত্র canonical schema/API; নতুন `hb_*` schema যোগ নয় |
| Admin dashboard, order status, invoice, customer list, sales reports, settings | panels-v3 থেকে workflow ধারণা নিয়ে React admin UI + canonical API-তে বাস্তবায়ন |
| Product create/edit, categories, stock, images | server-side validation, ownership/role checks ও safe upload সহ canonical API |
| SSLCommerz | server-created session, validation/IPN, amount/currency/order matching, duplicate callback guard; sandbox test আগে |
| OTP | নির্দিষ্ট SMS provider-এর API contract, expiry/attempt limit, rate limit ও verified delivery |
| Courier | বেছে নেওয়া provider-এর documented API/sandbox অনুযায়ী adapter; duplicate booking guard |
| SEO | বর্তমান SEO utilities রেখে live domain-এর robots/sitemap/crawlability পরীক্ষা |
| Deployment | InfinityFree-তে Node server চলবে ধরে নেওয়া যাবে না; React static build + PHP/MySQL API অথবা Node-supporting host—একটি deployment path বেছে নিতে হবে |

## ৪. পরবর্তী কাজের ক্রম

1. **Step 1 — audit/architecture:** এই report-এ file-by-file findings নথিভুক্ত; main-এ সরাসরি পরিবর্তন নয়।
2. **Step 2 — admin API/data model:** canonical schema ঠিক করে product/category/customer/order/admin endpoints; server-side roles ও audit-safe order status rules।
3. **Step 3 — admin UI:** dashboard, products, categories, stock, customers/sellers, orders, invoice, reports/settings।
4. **Step 4 — buyer/seller flows:** registration/login, seller listing CRUD, image upload, search/filter, buyer orders, account order history।
5. **Step 5 — payment/OTP/courier:** real credentials private hosting environment-এ; sandbox end-to-end tests।
6. **Step 6 — security/SEO/QA:** API tests, authorization/CSRF/rate-limit checks, upload tests, database backup/restore, sitemap/robots and mobile checks।
7. **Step 7 — demo/deployment:** selected host-এ deploy; health check, real API calls, and rollback plan; সব critical tests pass না করা পর্যন্ত live payment enable নয়।

## ৫. Go/no-go criteria

- [ ] Admin page loads without PHP/JS errors.
- [ ] Admin-only API calls reject buyer/seller accounts.
- [ ] One canonical product/order database is used end-to-end.
- [ ] Price, discount, delivery fee and stock are computed server-side.
- [ ] Invalid quantities, duplicate callbacks, forged payment redirects and unauthorized order access are rejected.
- [ ] Uploads reject oversized/non-image files and cannot execute as scripts.
- [ ] SSLCommerz sandbox success/fail/cancel/IPN and OTP/courier provider tests pass.
- [ ] Backup can be restored and the deployment commit has passing CI.
- [ ] SEO routes and sitemap are verified on the actual public domain.

## সতর্কতা

এই audit source-level; live hosting/database-এ কোনো migration চালানো হয়নি, কোনো payment/SMS/courier transaction করা হয়নি, এবং live site পরিবর্তন করা হয়নি। Production credentials বা বাস্তব ব্যবসায়িক তথ্য repository-তে যোগ করা যাবে না।
