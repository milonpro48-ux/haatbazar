# হাটবাজার — পেমেন্ট, OTP, কুরিয়ার, KYC ও SEO Go-live নির্দেশিকা

এই প্যাকেজে integration adapters এবং workflows আছে; provider account, approved merchant credentials, sender ID/template approval, courier merchant account এবং production DNS/HTTPS ছাড়া কোনো তৃতীয়-পক্ষ সেবা স্বয়ংক্রিয়ভাবে সক্রিয় হয় না। Live credentials ZIP-এ লিখবেন না।

## 1. bKash, Nagad, Rocket পেমেন্ট

এখানে SSLCommerz hosted checkout adapter ব্যবহার করা হয়েছে। এটি একটি merchant account-এ সক্রিয় থাকা payment channels দেখায়; bKash/Nagad/Rocket-এর প্রতিটি channel আলাদাভাবে merchant approval ও activation সাপেক্ষ। এটি সরাসরি bKash/Nagad/Rocket-এর নিজস্ব API credentials নয়।

1. SSLCommerz-এর সাথে ব্যবসায়িক merchant account খুলে KYC/ব্যবসার কাগজপত্র জমা দিন।
2. Sandbox Store ID/Password নিন এবং `.env`-এ `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` সেট করুন। `SSLCOMMERZ_LIVE=false` রাখুন।
3. `PUBLIC_BASE_URL`-এ প্রকৃত HTTPS ডোমেইন দিন। Gateway callback URLs সার্ভার থেকে তৈরি হবে।
4. Test transaction দিয়ে success/fail/cancel, repeated callback, amount mismatch, currency mismatch, gateway timeout ও IPN যাচাই করুন।
5. Merchant dashboard-এ bKash/Nagad/Rocket channel enable হয়েছে নিশ্চিত করুন; তারপরই `SSLCOMMERZ_LIVE=true` করুন এবং live credentials বসান।
6. Live-এ ছোট অঙ্কের test/refund ও daily reconciliation করুন। Browser redirect-কে payment success ধরে নেওয়া হয় না; server gateway validation API দিয়ে status, transaction ID, currency ও amount যাচাই করে। Fail/cancel browser callback ডেটাবেসে paid/unpaid status বদলায় না।

Order amount এখন listing price × quantity। Shipping, tax, discounts বা gateway fees থাকলে payment-এর আগে server-side order total হিসাব করার business rules যোগ করতে হবে। Payment successful হলে order `confirmed` এবং payment `paid` হয়। এই MVP-তে refund/dispute automation নেই।

## 2. SMS OTP ও পাসওয়ার্ড রিসেট

`SMS_API_URL` এবং `SMS_API_KEY` সেট করুন। এই generic adapter `POST` করে `Authorization: Bearer <key>` এবং JSON `{ "to": "017...", "message": "..." }` পাঠায়। বাংলাদেশের সব SMS provider একই payload ব্যবহার করে না; আপনার provider-এর API contract অনুযায়ী `sendSms()`-এ endpoint, authentication, sender ID ও request body মানিয়ে নিন।

- Provider-এর sender ID/OTP template অনুমোদন নিন, delivery report এবং balance monitoring চালু করুন।
- OTP ৬ অঙ্ক, ৫ মিনিটে মেয়াদ শেষ, সর্বোচ্চ ৫টি ভুল চেষ্টা; OTP hash করে রাখা হয় এবং response-এ OTP ফেরত দেওয়া হয় না।
- `SMS_API_URL` configured হলে signup-এর আগে phone OTP verification বাধ্যতামূলক হয়। Password reset-এ একই ফোনে OTP পাঠানো হয়।
- SMS provider live করার আগে rate limit, cost limit, duplicate send, invalid phone, delayed SMS এবং abuse test করুন। API key কখনও browser code-এ রাখবেন না।

## 3. কুরিয়ার সংযোগ

`COURIER_API_URL`, `COURIER_API_KEY`, `COURIER_API_SECRET` এবং `COURIER_PROVIDER` সেট করুন। Steadfast-এর জন্য URL সাধারণত `https://portal.packzy.com/api/v1/create_order` (আপনার merchant portal-এর বর্তমান docs দিয়ে নিশ্চিত করুন)। বর্তমান request shape Steadfast-style (`Api-Key`, `Secret-Key` headers; invoice, recipient, address, COD amount) হিসেবে তৈরি। Courier account থেকে সঠিক create-order endpoint ও credentials নিতে হবে। Pathao/RedX/অন্যান্য provider-এর endpoint, auth, payload ও response আলাদা হলে আলাদা adapter লিখুন; শুধু URL বদলালেই সব provider কাজ করবে না।

- `/api/admin/orders/:id/ship` admin-only endpoint parcel create করে tracking/consignment ID সংরক্ষণ করে।
- Sandbox/test merchant order দিয়ে address, phone, COD amount, duplicate shipment, cancel এবং webhook/status reconciliation পরীক্ষা করুন।
- বর্তমান adapter-এর COD amount হলো unpaid order total; paid order হলে COD 0। বাস্তবে courier charge, return charge ও collection reconciliation যোগ করতে হবে।
- Provider response format ভিন্ন হলে response mapping `server.js`-এর courier adapter-এ আপডেট করুন।

## 4. বিক্রেতার পরিচয় যাচাই (KYC)

বিক্রেতা `/api/account`-এ ব্যবসার নাম ও NID-এর শেষ ৪ সংখ্যা দিয়ে আবেদন করতে পারেন। অ্যাডমিন `/api/admin/seller-verifications` দেখে `/api/admin/seller-verifications/:id`-এ `approved`, `rejected` বা `pending` দিতে পারেন। অনুমোদিত বিক্রেতার বিজ্ঞাপনে “যাচাইকৃত” ব্যাজ দেখা যায়।

এটি **ম্যানুয়াল review workflow**, সরকারি NID database যাচাই নয়। Full NID image/number এই MVP-তে সংগ্রহ করবেন না। নথি দরকার হলে নিরাপদ private object storage, সীমিত staff access, retention/deletion policy, consent, audit log এবং বাংলাদেশের প্রযোজ্য আইন/গোপনীয়তা নীতি review করে তারপর যোগ করুন।

## 5. Google Search থেকে বিনামূল্যের ভিজিট

Google থেকে ট্রাফিক বা ranking নিশ্চিত করা যায় না। এই প্যাকেজ technical SEO প্রস্তুতি দেয়; crawl/index/rank এবং ক্রেতা আসা Google-এর সিদ্ধান্ত, প্রতিযোগিতা, পণ্যের চাহিদা ও পেজের উপযোগিতার উপর নির্ভর করে।

### প্রথম দিন
1. আসল domain DNS ও HTTPS চালু করুন এবং `PUBLIC_BASE_URL=https://আপনার-ডোমেইন` সেট করুন।
2. Google Search Console-এ Domain property DNS TXT record দিয়ে verify করুন। HTML meta verification বেছে নিলে `GOOGLE_SITE_VERIFICATION`-এ token দিন।
3. `https://আপনার-ডোমেইন/robots.txt` এবং `/sitemap.xml` খুলে পরীক্ষা করুন; sitemap Search Console-এ submit করুন।
4. URL Inspection-এ homepage, একটি active product, একটি populated category এবং একটি populated district page পরীক্ষা করুন। 404, redirect chain, canonical ও mobile usability দেখুন।
5. Real product images, exact current price, availability, shipping/MOQ, seller/location details এবং unique descriptions রাখুন। Fake stock, copied manufacturer text, fake reviews, keyword stuffing বা doorway district pages তৈরি করবেন না।

### প্রতি সপ্তাহের সম্পাদকীয় রুটিন
- **সোমবার:** top search queries, clicks, impressions, CTR, average position ও indexing errors review করুন।
- **মঙ্গলবার:** সবচেয়ে বেশি চাহিদার ১০টি পণ্যের title, price, stock, unique description, image alt ও category যাচাই করুন।
- **বুধবার:** একটি buyer-help guide প্রকাশ করুন (যেমন পাইকারি চাল কেনার আগে কী যাচাই করবেন); বাস্তব তথ্য ও লেখকের পরিচয় দিন।
- **বৃহস্পতিবার:** ১০ জন বিক্রেতার বিজ্ঞাপন quality review; duplicate, fake price, stock-out ও low-quality image সংশোধন করুন।
- **শুক্রবার:** category page-এ helpful intro, active listings, filter links, FAQs (শুধু সত্যিকারের প্রশ্ন) এবং internal links উন্নত করুন।
- **শনিবার:** Core Web Vitals/mobile speed, broken links, image sizes, 404/soft-404, sitemap ও canonical পরীক্ষা করুন।
- **রবিবার:** গত সপ্তাহের পরিবর্তন নথিভুক্ত করুন; কাজের প্রভাব না মাপা পর্যন্ত একইসাথে অনেক SEO পরিবর্তন করবেন না।

### ৯০ দিনের পরিকল্পনা
- **দিন ১–১৪:** domain, Search Console, sitemap, analytics consent/privacy notice, technical audit; ৫০–১০০টি বাস্তব ও সম্পূর্ণ listing সংগ্রহ।
- **দিন ১৫–৩০:** সবচেয়ে ভালো inventory থাকা ৩–৪ category ও ৫–১০ district page-এ কাজ; seller onboarding, original images ও unique listing copy। Empty/thin pages noindex রাখুন।
- **দিন ৩১–৬০:** সপ্তাহে ১–২টি সত্যিকার buyer guide, internal linking, wholesale landing content, merchant outreach ও local seller partnerships।
- **দিন ৬১–৯০:** Search Console query অনুযায়ী title/description test, winning category/district-এ inventory বাড়ানো, conversion/contact rate মাপা, broken/expired product URLs clean up।

## 6. SEO technical audit

Deploy হওয়ার পরে চালান:

```bash
PUBLIC_BASE_URL=https://your-real-domain.com npm run seo:audit
```

এটি robots, sitemap এবং sitemap-এর প্রথম ৩০টি URL-এর HTTP status/title/description/canonical পরীক্ষা করে। এটি Google ranking, actual indexation বা structured data eligibility নিশ্চিত করে না। Search Console URL Inspection ও Rich Results Test আলাদাভাবে ব্যবহার করুন।

## 7. Go-live security checklist

- `.env`-এ live secrets, unique 32+ character `SESSION_SECRET`, strong admin password; secrets Git/ZIP-এ commit করবেন না।
- HTTPS, trusted reverse proxy, secure cookies, persistent disk, encrypted offsite backups এবং restore drill।
- Payment callback spoofing, amount tampering, replay, duplicate order/shipment, OTP brute-force, reset account enumeration ও role bypass পরীক্ষা।
- Provider credentials least-privilege রাখুন; production logs-এ OTP, NID, payment secrets বা full phone/address অপ্রয়োজনীয়ভাবে লগ করবেন না।
- Terms, privacy policy, return/refund, delivery, seller verification, prohibited products এবং customer support প্রকাশ করুন।

## Official provider references

- SSLCommerz integration docs: https://developer.sslcommerz.com/doc/v4/index.html
- SSLCommerz live merchant signup: https://signup.sslcommerz.com/register
- SSLCommerz pricing and supported channels: https://sslcommerz.com/pricing/
- Steadfast merchant registration: https://www.steadfast.com.bd/register
- Google Search Console: https://search.google.com/search-console/about
- Google Search Central SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide

Check the provider's current merchant documentation before going live; endpoint, payload, channel availability, pricing and required business documents can change.
