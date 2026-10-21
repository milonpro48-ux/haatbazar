# হাটবাজার — Full-stack Marketplace (Bangladesh)

এই ZIP-এ React/TypeScript storefront-এর সঙ্গে Node.js/Express API, SQLite database, session authentication, seller account, listing/order persistence, image upload, admin moderation, shared analytics এবং SEO route metadata যুক্ত করা হয়েছে। এটি **production deployment-এর জন্য প্রস্তুত করা full-stack MVP bundle**—কিন্তু ZIP-টি নিজে থেকে ইন্টারনেটে live হয় না। আপনার ডোমেইন, hosting, secrets এবং live smoke-test শেষ করেই public করতে হবে।

## কী আছে

- বাংলাদেশের ১২টি প্রধান ক্যাটাগরি, সাবক্যাটাগরি এবং ৬৪ জেলার server-side allowlist validation (`server/catalog.json`)।
- খুচরা/পাইকারি/দুই ধরনের বিক্রি, MOQ, স্টক, দোকানের নাম, ডেলিভারি সুবিধা ও সর্বোচ্চ ৫টি পণ্যের ছবি।
- ক্রেতা ও বিক্রেতার অ্যাকাউন্ট রেজিস্ট্রেশন/লগইন; পাসওয়ার্ড bcrypt hash-এ থাকে; SQLite session store ও HTTP-only SameSite cookie।
- API-তে বিজ্ঞাপন ও অর্ডার স্থায়ীভাবে SQLite database-এ সেভ হয়। অর্ডার সার্ভারে সেভ না হলে UI-তে সফল বলে দেখায় না।
- বিক্রেতার `/api/account` পেজে নিজের বিজ্ঞাপন/অর্ডার দেখা ও বিজ্ঞাপন সক্রিয়/স্থগিত/বিক্রি হয়েছে চিহ্নিত করা।
- অ্যাডমিন `/api/admin/dashboard` পেজে পরিসংখ্যান ও বিজ্ঞাপন moderation; `/api/admin/analytics` এবং `/api/admin/orders` admin-only API।
- নিরাপত্তা হেডার, login/register/order rate limit, image type/size validation, role checks, server-side category/district validation।
- `/sitemap.xml`, `/robots.txt`, category/district/product URL-এর server-side title/description/canonical, Open Graph metadata, Product/CollectionPage JSON-LD এবং category/district/product page-এর প্রাথমিক server-rendered text/internal links। যেসব ক্যাটাগরি/জেলায় কোনো active listing নেই সেগুলো sitemap-এ যায় না এবং noindex হয়।

## লোকাল রান (Node.js 20+)

1. ZIP extract করে এই ফোল্ডারে terminal খুলুন।
2. `.env.example` কপি করে `.env` তৈরি করুন। `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PUBLIC_BASE_URL` অবশ্যই নিজের তথ্য দিয়ে বদলান। অ্যাডমিন পাসওয়ার্ড কমপক্ষে ১২ অক্ষরের এবং অনন্য হতে হবে।
3. চালান:

```bash
npm install
npm run check:server
npm run validate:catalog
npm run build
npm start
```

4. `http://localhost:3000` খুলুন। Health check: `http://localhost:3000/api/healthz`।
5. বিক্রেতা অ্যাকাউন্ট: `http://localhost:3000/api/register`। অ্যাডমিন ড্যাশবোর্ড: `http://localhost:3000/api/admin/dashboard`।

ডেভেলপমেন্টে Vite hot reload-এর জন্য আলাদা terminal-এ `npm run dev` চালাতে পারেন; API তখন একই origin-এ চালানো backend-এ proxy না করা থাকলে API request কাজ করবে না। সরল smoke test-এর জন্য production-style `npm start` ব্যবহার করুন।

## Docker deployment (সহজ বিকল্প)

1. `.env.example` কপি করে `.env` বানান এবং সব placeholder বদলান।
2. `PUBLIC_BASE_URL`-এ আপনার প্রকৃত HTTPS domain দিন।
3. চালান:

```bash
docker compose up --build -d
docker compose logs -f haatbazar
```

`haatbazar-data` volume-এ SQLite database, sessions এবং upload করা ছবি থাকে। অ্যাডমিন ড্যাশবোর্ডের সম্মিলিত analytics এবং marketing spend-ও একই সার্ভার ডেটাবেসে থাকে। Hosting provider-এ persistent disk/volume লাগানো আবশ্যক; ephemeral filesystem-এ deploy করলে data হারাতে পারেন। Domain/HTTPS reverse proxy বা hosting provider-এ সেট করুন। `TRUST_PROXY=1` শুধু trusted reverse proxy-এর পেছনে থাকলে রাখুন।

## গুরুত্বপূর্ণ API

- `GET /api/healthz`, `GET /api/catalog`, `GET /api/me`
- `GET /api/listings`, `GET /api/listings/:id`, `POST /api/listings` (seller/admin)
- `GET /api/my/listings`, `PATCH /api/my/listings/:id/status`
- `POST /api/orders` (guest checkout supported; production-এ SMS verification বিবেচনা করুন)
- `GET /api/seller/orders`, `GET /api/admin/orders`
- `GET /api/admin/analytics` এবং `PATCH /api/admin/listings/:id/status` (admin only)
- `GET /sitemap.xml`, `GET /robots.txt`

## Production-এ প্রকাশের আগে আবশ্যক checklist

- [ ] `.env`-এ সব secret বদলানো; `.env` কখনও Git/ZIP-এ public করবেন না।
- [ ] HTTPS, domain DNS, persistent volume, database/upload backup schedule।
- [ ] Hosting-এর environment variables এবং health check পরীক্ষা।
- [ ] Admin account দিয়ে `/api/admin/dashboard` লগইন পরীক্ষা; seller account দিয়ে বিজ্ঞাপন/ছবি/অর্ডার পরীক্ষা; buyer account দিয়ে order পরীক্ষা।
- [ ] অন্য seller-এর listing update করা যায় না—এটি পরীক্ষা; admin endpoints guest-এ 401 ও non-admin-এ 403 দেয় কি না পরীক্ষা।
- [ ] নিজের real domain বসিয়ে `sitemap.xml`, `robots.txt`, canonical URL, category/district/product URL refresh পরীক্ষা। Search Console-এ sitemap submit করুন।
- [ ] সপ্তাহে অন্তত একবার `npm run backup` চালিয়ে তৈরি হওয়া backup অন্য storage/provider-এ কপি করুন; একই server-এ থাকা backup একাই যথেষ্ট নয়।
- [ ] `npm run validate:catalog` চালিয়ে ১২ ক্যাটাগরি, ৬৪ জেলা ও সাবক্যাটাগরির তালিকা যাচাই করুন।
- [ ] বাংলাদেশের privacy policy, terms, prohibited-items policy, seller verification এবং order/refund/support process প্রকাশ করুন।
- [ ] `npm run check:integrations` চালিয়ে কোন payment/SMS/courier credentials অনুপস্থিত দেখুন; credential থাকলেই live API সফল হবে এমন নয়।
- [ ] Sandbox payment callback, SMS OTP, password reset, seller verification approval ও courier shipment test করুন।
- [ ] `npm run seo:audit` চালান; Search Console-এ indexing ও real search performance আলাদাভাবে যাচাই করুন।

## এই আপডেটে বিশেষভাবে ঠিক করা হয়েছে

- বিজ্ঞাপনের ছবি শুধু সাইন-ইন করা ব্যবহারকারী আপলোড করতে পারবেন; সর্বোচ্চ ৫ MB, JPEG/PNG/WebP MIME-এর পাশাপাশি ফাইল signature যাচাই হয়। বিজ্ঞাপন তৈরির সময় ছবিগুলো একই বিক্রেতার আপলোড করা এবং আগে ব্যবহার না করা কিনা সার্ভার যাচাই করে।
- ক্যাটাগরি/সাবক্যাটাগরি/জেলা allowlist সার্ভারে যাচাই হয়; বিজ্ঞাপন ও অর্ডার SQLite-এ স্থায়ীভাবে সংরক্ষিত হয়।
- অ্যাডমিন অ্যানালিটিক্স এখন localStorage নয়, সার্ভারের সম্মিলিত event data পড়ে। মার্কেটিং খরচ সার্ভারে সংরক্ষিত হয়; dashboard কেবল admin permission-এ পাওয়া যায়।
- পণ্য ভিউ এখন product detail page খোলার সময় গণনা হয়; বিজ্ঞাপন কার্ডের প্রতিটি render-কে আলাদা view ধরে গণনা করা হয় না। order/listing-created event সার্ভার থেকে গণনা হয় যাতে duplicate count কমে।
- Category/district page-এ সার্ভার-রেন্ডার করা crawlable text ও product link যোগ হয়েছে। শূন্য listing থাকা পেজ sitemap-এ না দিয়ে `noindex,follow` দেওয়া হয়, যাতে পাতলা পেজ index না হয়।
- `npm run backup` দিয়ে SQLite-এর consistent backup এবং upload ছবির কপি তৈরি করা যায়; ১৪টি সর্বশেষ local backup রাখা হয়। Backup-টি আলাদা cloud/storage-এ কপি করা আবশ্যক।

## Live করার আগে বাকি ব্যবসায়িক কাজ

- Payment/SMS/courier/KYC-এর code workflow যোগ করা হয়েছে; merchant approval, real credentials, provider-specific payload confirmation ও end-to-end tests এখনও আবশ্যক। বর্তমান SMS adapter generic; provider-এর API আলাদা হলে `sendSms()` মানিয়ে নিতে হবে।
- Seller KYC হলো manual review, সরকারি identity database verification নয়। Report/appeal workflow, automated fraud moderation এবং customer support workflow আরও উন্নত করা দরকার।
- Production scale-এর জন্য SQLite-এর বদলে managed PostgreSQL, object storage/CDN, external session store, centralized monitoring/logging এবং automated backups বিবেচনা করুন।
- SEO structured data/sitemap হলো technical groundwork; Google indexing/ranking বা free traffic নিশ্চিত নয়। Search Console, unique product copy, real photos, seller inventory ও নিয়মিত content লাগবে।

## নতুন integration adapters (পেমেন্ট, OTP, কুরিয়ার, seller verification)

এই সংস্করণে নিম্নলিখিত integration workflow যোগ হয়েছে; live provider credentials ও merchant approval না থাকলে এগুলো **চালু হবে না**:

- **bKash/Nagad/Rocket:** SSLCommerz hosted checkout adapter. `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_LIVE=false` দিয়ে sandbox পরীক্ষা করুন। Merchant account-এ প্রতিটি channel সক্রিয় থাকা দরকার। Payment success browser redirect দেখে নয়, server validation API দিয়ে amount/currency/transaction ID মিলিয়ে নিশ্চিত হয়।
- **SMS OTP + password reset:** `SMS_API_URL` ও `SMS_API_KEY` সেট করতে হবে। Adapter JSON `{to,message}` ও Bearer token পাঠায়; আপনার SMS provider-এর API আলাদা হলে `sendSms()`-এ মানিয়ে নিন। OTP ৫ মিনিটে মেয়াদোত্তীর্ণ, সর্বোচ্চ ৫টি ভুল চেষ্টা।
- **Courier:** `/api/admin/orders/:id/ship` admin-only connector; `COURIER_API_URL`, `COURIER_API_KEY`, `COURIER_API_SECRET` দরকার। Default payload/header Steadfast-style; Pathao/RedX বা অন্য provider-এর জন্য নিজস্ব adapter ও response mapping দরকার।
- **Seller verification:** seller `/api/account` থেকে আবেদন করে; admin `/api/admin/seller-verifications` দেখে approve/reject করে। এটি manual review, সরকারি NID verification নয়। এখানে শুধু NID-এর শেষ ৪ সংখ্যা রাখা হয়; পূর্ণ NID বা raw document upload করবেন না।
- **SEO audit:** Deploy হওয়ার পরে `PUBLIC_BASE_URL=https://your-real-domain.com npm run seo:audit` চালান। Google Search Console-এ domain verify করে sitemap submit করুন। Google organic traffic বা ranking নিশ্চিত করা যায় না।

বিস্তারিত credential setup, provider-specific notes, testing ও ৯০ দিনের SEO/content routine: `docs/INTEGRATIONS-GO-LIVE-BN.md`।

## SEO ও marketing

- Production-এ `PUBLIC_BASE_URL`-এ আসল HTTPS domain না দিলে sitemap তৈরি হবে না; placeholder domain ব্যবহার করবেন না।
- Google Search Console-এ domain verify করে `/sitemap.xml` submit করুন, URL Inspection দিয়ে কয়েকটি product/category page পরীক্ষা করুন এবং 404/soft-404 রিপোর্ট দেখুন।
- Google-এর বিনামূল্যের ভিজিটের জন্য unique product title/description, আসল ছবি, পর্যাপ্ত stock, seller details এবং category-তে যথেষ্ট live listing জরুরি। শুধু URL বা structured data যোগ করলে ranking নিশ্চিত হয় না।

`docs/SEO-MARKETING-PLAN-BN.md`-এ ১২টি ক্যাটাগরি, জেলা-ভিত্তিক keyword ideas, free SEO, wholesale lead generation, ৯০ দিনের roadmap, revenue model এবং weekly metrics আছে। SEO-এর জন্য ভুয়া listing বা keyword stuffing করবেন না।
