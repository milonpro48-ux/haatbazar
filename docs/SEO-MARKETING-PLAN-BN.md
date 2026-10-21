# হাটবাজার: SEO, গ্রোথ ও আয়ের পরিকল্পনা

## ১) লক্ষ্য ও অবস্থান
হাটবাজারকে বাংলাদেশের সাধারণ মাল্টি-ক্যাটাগরি মার্কেটপ্লেস হিসেবে গড়ুন—একই প্ল্যাটফর্মে খুচরা ক্রেতা, পাইকারি ক্রেতা, দোকানদার, উৎপাদক ও সেবা প্রদানকারী। প্রাথমিক অবস্থানে রাখুন: (১) সঠিক ক্যাটাগরি/সাবক্যাটাগরি, (২) বাস্তব পণ্যের পরিষ্কার ছবি ও নির্ভরযোগ্য বিক্রেতা, (৩) খুচরা/পাইকারি শর্ত স্পষ্ট, (৪) Google-এ crawl/index হওয়ার উপযোগী পেজ।

## ২) প্রস্তাবিত URL কাঠামো
- হোম: `/`
- ক্যাটাগরি: `/category/electronics-gadgets`, `/category/clothing-shoes-fashion`, `/category/home-kitchen-furniture`, `/category/food-grocery-daily-essentials`, `/category/agriculture-crops-grains`, `/category/livestock-poultry-fish`, `/category/machinery-tools`, `/category/cars-motorcycles-parts`, `/category/construction-materials-hardware`, `/category/beauty-personal-care`, `/category/books-stationery-office`, `/category/services-rentals`
- সাবক্যাটাগরি: `/category/{category-slug}/{subcategory-slug}` — route + backend filter যোগ করার পর চালু করুন।
- জেলা: `/district/dhaka`, `/district/bogura`, `/district/chattogram` ইত্যাদি (সব ৬৪ জেলার slug `src/lib/seo.ts`-এ আছে)।
- পণ্য: `/product/{listing-id}`। ID স্থিতিশীল রাখুন; পণ্য মুছে গেলে 404/410 দিন।
- বিক্রেতা: `/seller/{seller-slug}` — ভবিষ্যৎ ধাপ, শুধু যাচাইকৃত/সক্রিয় বিক্রেতাদের জন্য।

## ৩) প্রতিটি পেজের SEO
**ক্যাটাগরি পেজ:** স্বতন্ত্র title/description, একটিমাত্র H1, ২–৩ বাক্যের নিজস্ব বাংলা ভূমিকা, সাবক্যাটাগরি লিংক, পণ্যের তালিকা, জেলা/খুচরা-পাইকারি ফিল্টার, breadcrumbs। `src/lib/seo.ts`-এ ১২টি ক্যাটাগরির title/description/keyword seed আছে।

**পণ্য পেজ:** শিরোনামে আসল পণ্যের নাম, ব্র্যান্ড/মডেল (যদি থাকে), অবস্থা, জেলা; unique description, দাম/ইউনিট, মজুদ, বিক্রির ধরন, বিক্রেতা, বাস্তব ছবি ও alt text। একই বিবরণ কপি করবেন না। Product/Offer structured data শুধু দৃশ্যমান, সঠিক ও হালনাগাদ তথ্যের জন্য যোগ করুন; মিথ্যা rating/review দেবেন না।

**জেলা পেজ:** ঐ জেলার সত্যিকারের সক্রিয় বিজ্ঞাপন দেখান; জেলা নাম, স্থানীয় সরবরাহ, ডেলিভারি ও যোগাযোগের তথ্য দিন। বিজ্ঞাপন না থাকলে পাতলা/ফাঁকা পেজ index করাবেন না—প্রয়োজনে noindex দিন। শুধু কীওয়ার্ড বদলে ৬৪টি একই রকম পেজ প্রকাশ করবেন না।

**গুরুত্বপূর্ণ প্রযুক্তিগত SEO:** বর্তমান UI React SPA; title/meta browser-এ বদলায়, কিন্তু এটি সার্ভার-রেন্ডারড SEO-র সমান নয়। Google-এর নির্ভরযোগ্য crawl-এর জন্য React SSR/prerender, server fallback, canonical, 404 handling, XML sitemap, robots.txt, BreadcrumbList এবং product structured data যোগ করুন। sitemap-এ শুধু 200 status-এর canonical, indexable পেজ রাখুন। Search Console-এ domain verify করে sitemap submit করুন। কোনো SEO কাজই Google ranking বা বিনামূল্যের traffic নিশ্চিত করে না।

## ৪) কীওয়ার্ড ক্লাস্টার
প্রতিটি পেজে ১টি মূল intent এবং ৩–৬টি স্বাভাবিক related phrase ব্যবহার করুন। একই শব্দ বারবার গুঁজবেন না।
- Electronics: “মোবাইল ফোন দাম বাংলাদেশ”, “ল্যাপটপ কিনুন”, “ইলেকট্রনিক্স পাইকারি”, “ঢাকায় মোবাইল বিক্রি”।
- Fashion: “পোশাক পাইকারি”, “শাড়ি অনলাইন”, “জুতা পাইকারি বাজার”, “বুটিকের পোশাক সরবরাহকারী”।
- Home/kitchen: “ফার্নিচার দাম”, “রান্নাঘরের পণ্য”, “আসবাবপত্র পাইকারি”।
- Grocery: “মুদি পণ্য পাইকারি”, “চাল ডাল সরবরাহকারী”, “দৈনন্দিন পণ্য wholesale”।
- Agriculture: “ধান পাইকারি”, “গম ভুট্টা বিক্রি”, “কৃষি পণ্য বাজার”, “সার বীজ কৃষিযন্ত্র”।
- Livestock/fish: “গরু বিক্রি”, “পোল্ট্রি পাইকারি”, “মাছের পোনা”, “খামারের খাদ্য”।
- Machinery: “ব্যবহৃত মেশিন বিক্রি”, “শিল্প যন্ত্রপাতি”, “পাওয়ার টুলস”।
- Vehicles: “ব্যবহৃত মোটরসাইকেল”, “গাড়ির যন্ত্রাংশ”, “টায়ার ব্যাটারি”।
- Construction: “রড সিমেন্ট পাইকারি”, “নির্মাণ সামগ্রী সরবরাহকারী”, “হার্ডওয়্যার”।
- Beauty: “কসমেটিকস পাইকারি”, “সেলুন সামগ্রী”, “ব্যক্তিগত পরিচর্যা পণ্য”।
- Books/office: “স্টেশনারি পাইকারি”, “খাতা কলম”, “অফিস সামগ্রী”।
- Services/rentals: “যন্ত্রপাতি ভাড়া”, “স্থানীয় মেরামত সেবা”, “দোকান ভাড়া”।

**জেলা keyword template:** `{পণ্য} {জেলা}`, `{জেলা} {পণ্য} পাইকারি`, `{জেলা} সরবরাহকারী`, `{জেলা} অনলাইন বাজার`। `src/lib/seo.ts`-এ ৬৪ জেলার slug/keyword seeds আছে। স্থানীয় বাস্তব বিজ্ঞাপন/সরবরাহকারী না থাকলে সেই জেলা পেজে অতিরঞ্জিত দাবি করবেন না।

## ৫) খুচরা ও পাইকারি UX
- Listing-এ `saleType=retail|wholesale|both`, `minOrderQuantity`, unit, quantity, delivery, negotiable এবং ব্যবসার নাম দেখান।
- পাইকারি বিজ্ঞাপনে MOQ, কার্টন/বস্তা/মণ/টন, bulk price tiers, ডেলিভারি খরচ, VAT/চালান সুবিধা (যদি সত্যি থাকে) এবং ব্যবসার যাচাইয়ের অবস্থা দেখানোর পরবর্তী ধাপ।
- খুচরা ক্রেতাকে প্রতি ইউনিট দাম, স্টক, ডেলিভারি/পিকআপ ও ফেরত/বিরোধ নীতি দেখান।
- “যাচাইকৃত বিক্রেতা” badge শুধু ফোন/পরিচয়/ব্যবসা যাচাই বাস্তবে সম্পন্ন হলে দিন। ছবির জন্য বিক্রেতাকে নিজের পণ্যের অন্তত ৩টি বাস্তব ছবি দিতে উৎসাহ দিন।

## ৬) বিনামূল্যের মার্কেটিং
1. Google Search Console ও Analytics/সম্মতিসহ first-party event measurement সেটআপ করুন; Search Console-এর index coverage ও search query সাপ্তাহিক দেখুন।
2. Facebook Page/গ্রুপে ক্যাটাগরি অনুযায়ী পণ্য পোস্ট, স্থানীয় ব্যবসায়ী গ্রুপে নিয়ম মেনে অংশগ্রহণ; একই পোস্ট spam করবেন না।
3. ২০–৩০ জন প্রাথমিক বিক্রেতাকে onboarding দিন; তাদের দোকানের QR/শেয়ার লিংক দিন।
4. প্রতিটি listing-এর share card, WhatsApp/Facebook share link, স্পষ্ট দাম/MOQ/জেলা এবং পণ্যের নিজস্ব URL দিন।
5. ক্রেতা প্রশ্নোত্তর/গাইড প্রকাশ করুন: “পাইকারি কেনার আগে ৭টি বিষয়”, “মণ/কেজি দামের হিসাব”, “বিক্রেতা যাচাই করার নিয়ম”। তথ্যবহুল, আসল কনটেন্ট; কপি নয়।
6. স্থানীয় চেম্বার, বাজার সমিতি, কৃষক/খামার সমবায় ও দোকানদারদের সঙ্গে অনুমতি নিয়ে onboarding partnership করুন।
7. ইমেইল/এসএমএস/WhatsApp campaign শুধু সম্মতি পাওয়া contact-এ; unsubscribe/stop ব্যবস্থা দিন।

## ৭) পাইকারি ক্রেতা আনার প্রচার
- “পাইকারি সরবরাহকারী খুঁজুন” landing section; ক্যাটাগরি, জেলা, MOQ, unit ও delivery filter।
- প্রথম ৩০ দিন যোগ্য পাইকারি ক্রেতার জন্য seller response SLA এবং verified supplier onboarding; কোনো মিথ্যা ছাড়/গ্যারান্টি নয়।
- দোকানদারদের জন্য সাপ্তাহিক bulk-deal digest (opt-in), নতুন স্টক alert, reorder list এবং supplier compare sheet।
- wholesale lead form: পণ্য, আনুমানিক পরিমাণ, জেলা, দরকারি তারিখ; সম্মতি নিয়ে সংশ্লিষ্ট বিক্রেতাকে পাঠান।
- সফল order/lead-এর পর buyer feedback এবং seller response time পরিমাপ করুন।

## ৮) ৯০ দিনের roadmap
| সময় | অগ্রাধিকার | কাজ ও গ্রহণযোগ্য ফল |
|---|---|---|
| দিন ১–১৪ | ডেটা ও বিশ্বাস | ১২ ক্যাটাগরি/সাবক্যাটাগরি server validation; ৬৪ জেলা seed; retail/wholesale/MOQ; seller reporting/moderation; বাস্তব ছবি নির্দেশনা। |
| দিন ১৫–৩০ | SEO foundation | category/product/district routes; SSR/prerender; unique metadata; canonical; 404; sitemap/robots; Search Console verify। |
| দিন ৩১–৪৫ | সরবরাহ | ৩০–৫০ সক্রিয় মানসম্মত বিক্রেতা; প্রতিটি অগ্রাধিকার ক্যাটাগরিতে অন্তত ১০টি আসল বিজ্ঞাপন লক্ষ্য; duplicate/fake listing review। |
| দিন ৪৬–৬০ | পাইকারি | wholesale filter, MOQ, lead form, supplier onboarding, response-time tracking, opt-in buyer list। |
| দিন ৬১–৭৫ | স্থানীয় কনটেন্ট | শীর্ষ ১০টি জেলা/ক্যাটাগরির নিজস্ব helpful guide; seller interviews; internal links; ছবি/alt quality audit। |
| দিন ৭৬–৯০ | উন্নতি ও আয় | Search Console queries, contact/order conversion, seller retention; featured listings/verified business subscription-এর সীমিত pilot ও স্পষ্ট মূল্যনীতি। |

## ৯) আয়ের উৎস (পর্যায়ক্রমে)
1. **Featured listing:** স্বচ্ছ নির্দিষ্ট সময়ের paid promotion; sponsored বলে চিহ্নিত।
2. **Seller subscription:** দোকান প্রোফাইল, একাধিক বিজ্ঞাপন, lead/order analytics, verified business workflow—শুধু বাস্তব সুবিধা চালু হলে।
3. **Qualified wholesale leads:** seller opt-in এবং স্পষ্ট pricing/consent সহ; spam lead বিক্রি নয়।
4. **Order commission:** secure order/payment, refund, dispute ও ledger ব্যবস্থা তৈরি হওয়ার পরই।
5. **Delivery/logistics partner referral:** বাস্তব partner agreement এবং প্রকাশিত fee/terms থাকলে।
6. **Sponsored category placements/ads:** প্রাসঙ্গিকতা, disclosure ও privacy সম্মতি বজায় রেখে।

শুরুতে listing-এর মৌলিক পোস্ট বিনামূল্যে রাখলে supply তৈরি সহজ হতে পারে। কোনো আয়ই নিশ্চিত নয়; আগে marketplace liquidity, trust ও repeat usage তৈরি করুন।

## ১০) প্রতি সপ্তাহের ৭টি মেট্রিক
1. Active listings — ক্যাটাগরি/জেলা অনুযায়ী।
2. নতুন যাচাইকৃত বিক্রেতা — শুধু listing count নয়, unique seller ID দিয়ে।
3. Organic impressions/clicks/CTR — Search Console থেকে।
4. Listing views — server-side event এবং unique listing/session।
5. Contact rate — unique contact intent ÷ unique listing views।
6. Order conversion — confirmed orders ÷ qualified contacts (status/attribution নির্ধারণ করে)।
7. Repeat buyers ও CAC — identity/consent-ভিত্তিক repeat buyer; CAC = attributable acquisition cost ÷ new paying/qualified buyers, channel অনুযায়ী।

বর্তমান localStorage analytics-কে production metric হিসেবে ব্যবহার করবেন না। সব device/user-এর event server-এ জমা, admin-only reporting, bot filtering, event deduplication, consent/privacy policy ও role-based access লাগবে।
