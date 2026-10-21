-- HaatBazar multi-category marketplace migration proposal (PostgreSQL)
-- Review existing schema/table names and take a backup before applying.
CREATE TABLE IF NOT EXISTS marketplace_categories (
  key VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  label_bn VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS marketplace_subcategories (
  id BIGSERIAL PRIMARY KEY,
  category_key VARCHAR(50) NOT NULL REFERENCES marketplace_categories(key),
  label_bn VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(category_key, label_bn)
);
CREATE TABLE IF NOT EXISTS bangladesh_districts (
  slug VARCHAR(50) PRIMARY KEY,
  name_bn VARCHAR(80) NOT NULL UNIQUE,
  division_bn VARCHAR(80)
);

INSERT INTO marketplace_categories(key, slug, label_bn, sort_order) VALUES
('electronics','electronics-gadgets','ইলেকট্রিক ও গেজেট',1),
('fashion','clothing-shoes-fashion','পোশাক, জুতা ও ফ্যাশন',2),
('home-kitchen','home-kitchen-furniture','ঘর, রান্নাঘর ও আসবাবপত্র',3),
('grocery','food-grocery-daily-essentials','খাবার, মুদি ও দৈনন্দিন পণ্য',4),
('agriculture','agriculture-crops-grains','কৃষি পণ্য ও শস্য',5),
('livestock-poultry-fish','livestock-poultry-fish','গবাদিপশু, পোল্ট্রি ও মাছ',6),
('machinery','machinery-tools','যন্ত্রপাতি ও সরঞ্জাম',7),
('vehicles','cars-motorcycles-parts','গাড়ি, মোটরসাইকেল ও যন্ত্রাংশ',8),
('construction','construction-materials-hardware','নির্মাণ সামগ্রী ও হার্ডওয়্যার',9),
('beauty','beauty-personal-care','সৌন্দর্য ও ব্যক্তিগত পরিচর্যা',10),
('books-office','books-stationery-office','বই, স্টেশনারি ও অফিস সামগ্রী',11),
('services-rentals','services-rentals','সেবা ও ভাড়ার সুবিধা',12)
ON CONFLICT (key) DO UPDATE SET slug=EXCLUDED.slug, label_bn=EXCLUDED.label_bn, sort_order=EXCLUDED.sort_order;

-- Add these columns to the existing listing table after verifying its real table name.
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS subcategory VARCHAR(120);
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS sale_type VARCHAR(12) NOT NULL DEFAULT 'both' CHECK (sale_type IN ('retail','wholesale','both'));
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_order_quantity >= 1);
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS business_name VARCHAR(120);
-- ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN NOT NULL DEFAULT FALSE;
-- CREATE INDEX IF NOT EXISTS listings_category_subcategory_idx ON listings(category, subcategory);
-- CREATE INDEX IF NOT EXISTS listings_district_category_idx ON listings(district, category);
-- CREATE INDEX IF NOT EXISTS listings_sale_type_idx ON listings(sale_type);

-- SECURITY/VALIDATION: API must validate category AND subcategory pair against the lookup table.
-- Do not trust the browser list; reject unknown keys, mismatched subcategory, invalid district,
-- negative price, quantity < 1, invalid phone, or unsupported sale_type with HTTP 400.

-- Seed valid subcategories from the frontend category catalogue.
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','মোবাইল ফোন') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','কম্পিউটার ও ল্যাপটপ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','টিভি ও অডিও') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','ফ্রিজ ও এসি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','ইলেকট্রিক সামগ্রী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','সোলার ও ব্যাটারি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','ক্যামেরা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('electronics','অ্যাক্সেসরিজ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','পুরুষের পোশাক') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','নারীদের পোশাক') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','শিশুদের পোশাক') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','শাড়ি ও থ্রি-পিস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','জুতা ও স্যান্ডেল') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','ব্যাগ ও মানিব্যাগ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','ঘড়ি ও গয়না') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('fashion','ফ্যাশন অ্যাক্সেসরিজ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','সোফা ও খাট') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','টেবিল ও চেয়ার') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','আলমারি ও তাক') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','রান্নাঘরের সামগ্রী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','হোম ডেকর') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','বিছানাপত্র') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','লাইট ও ফ্যান') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('home-kitchen','গৃহস্থালি যন্ত্রপাতি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','চাল, ডাল ও শস্য') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','তেল ও মসলা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','ময়দা ও আটা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','প্যাকেটজাত খাবার') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','ফল ও সবজি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','মাছ ও মাংস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','দুধ ও দুগ্ধজাত') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','পরিষ্কার-পরিচ্ছন্নতা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('grocery','পানীয়') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','ধান ও চাল') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','গম ও ভুট্টা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','ডাল ও তেলবীজ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','পাট ও আঁশ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','বীজ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','সার ও কীটনাশক') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','কৃষিযন্ত্র') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','সেচ সরঞ্জাম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','ফল ও সবজি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('agriculture','পশুখাদ্য') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','গরু ও মহিষ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','ছাগল ও ভেড়া') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','দুধেল গাভী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','মুরগি ও হাঁস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','বাচ্চা ও ডিম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','মাছ ও পোনা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','মাছের খাদ্য') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','পশু-পাখির খাদ্য') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('livestock-poultry-fish','খামার সরঞ্জাম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','শিল্প যন্ত্রপাতি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','কৃষিযন্ত্র') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','পাওয়ার টুলস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','জেনারেটর ও কম্প্রেসর') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','ওয়ার্কশপ সরঞ্জাম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','সেফটি সরঞ্জাম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','খুচরা যন্ত্রাংশ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('machinery','ব্যবহৃত যন্ত্রপাতি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','গাড়ি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','মোটরসাইকেল') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','সাইকেল') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','অটো/সিএনজি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','গাড়ির যন্ত্রাংশ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','মোটরসাইকেল পার্টস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','টায়ার ও ব্যাটারি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('vehicles','গাড়ি ভাড়া') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','রড ও সিমেন্ট') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','ইট ও বালু') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','টাইলস ও পাথর') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','রং ও কেমিক্যাল') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','পাইপ ও ফিটিংস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','দরজা-জানালা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','ইলেকট্রিক ফিটিংস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('construction','হার্ডওয়্যার টুলস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','ত্বকের যত্ন') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','চুলের যত্ন') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','প্রসাধনী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','পারফিউম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','ব্যক্তিগত পরিচর্যা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','সেলুন সামগ্রী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','বিউটি টুলস') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('beauty','বেবি কেয়ার') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','পাঠ্যবই') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','গল্প ও নন-ফিকশন') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','খাতা ও কাগজ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','কলম ও স্টেশনারি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','অফিস সরঞ্জাম') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','প্রিন্টার ও টোনার') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','স্কুল সামগ্রী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('books-office','প্যাকেজিং সামগ্রী') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','মেরামত সেবা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','পরিবহন ও ডেলিভারি') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','ইভেন্ট ও ক্যাটারিং') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','শিক্ষা ও প্রশিক্ষণ') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','ডিজিটাল সেবা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','বাসা/দোকান ভাড়া') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','যন্ত্রপাতি ভাড়া') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','গাড়ি ভাড়া') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','কৃষি সেবা') ON CONFLICT DO NOTHING;
INSERT INTO marketplace_subcategories(category_key,label_bn) VALUES ('services-rentals','অন্যান্য সেবা') ON CONFLICT DO NOTHING;

-- Seed the 64 Bangladesh districts; division metadata can be filled from official source data.
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('dhaka','ঢাকা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('faridpur','ফরিদপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('gazipur','গাজীপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('gopalganj','গোপালগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('kishoreganj','কিশোরগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('madaripur','মাদারীপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('manikganj','মানিকগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('munshiganj','মুন্সিগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('narayanganj','নারায়ণগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('narsingdi','নরসিংদী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('rajbari','রাজবাড়ী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('shariatpur','শরীয়তপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('tangail','টাঙ্গাইল') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('brahmanbaria','ব্রাহ্মণবাড়িয়া') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('chandpur','চাঁদপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('chattogram','চট্টগ্রাম') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('cumilla','কুমিল্লা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('coxsbazar','কক্সবাজার') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('feni','ফেনী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('khagrachhari','খাগড়াছড়ি') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('lakshmipur','লক্ষ্মীপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('noakhali','নোয়াখালী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('rangamati','রাঙামাটি') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('bandarban','বান্দরবান') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('bogura','বগুড়া') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('joypurhat','জয়পুরহাট') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('naogaon','নওগাঁ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('natore','নাটোর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('chapainawabganj','চাঁপাইনবাবগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('pabna','পাবনা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('rajshahi','রাজশাহী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('sirajganj','সিরাজগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('habiganj','হবিগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('moulvibazar','মৌলভীবাজার') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('sunamganj','সুনামগঞ্জ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('sylhet','সিলেট') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('dinajpur','দিনাজপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('gaibandha','গাইবান্ধা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('kurigram','কুড়িগ্রাম') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('lalmonirhat','লালমনিরহাট') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('nilphamari','নীলফামারী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('panchagarh','পঞ্চগড়') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('rangpur','রংপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('thakurgaon','ঠাকুরগাঁও') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('jamalpur','জামালপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('mymensingh','ময়মনসিংহ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('netrokona','নেত্রকোনা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('sherpur','শেরপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('bagerhat','বাগেরহাট') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('chuadanga','চুয়াডাঙ্গা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('jashore','যশোর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('jhenaidah','ঝিনাইদহ') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('khulna','খুলনা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('kushtia','কুষ্টিয়া') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('magura','মাগুরা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('meherpur','মেহেরপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('narail','নড়াইল') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('satkhira','সাতক্ষীরা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('barguna','বরগুনা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('barishal','বরিশাল') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('bhola','ভোলা') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('jhalokati','ঝালকাঠি') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('patuakhali','পটুয়াখালী') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
INSERT INTO bangladesh_districts(slug,name_bn) VALUES ('pirojpur','পিরোজপুর') ON CONFLICT (slug) DO UPDATE SET name_bn=EXCLUDED.name_bn;
