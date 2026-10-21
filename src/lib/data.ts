export type Category = { key: string; slug: string; label: string; emoji: string; subcategories: string[]; keywords: string[] };

// এই তালিকা UI-র সুবিধার জন্য। একই তালিকা সার্ভারের validation/schema-তেও অবশ্যই mirror করতে হবে।
export const CATEGORIES: Category[] = [
  { key: "electronics", slug: "electronics-gadgets", label: "ইলেকট্রিক ও গেজেট", emoji: "📱", subcategories: ["মোবাইল ফোন", "কম্পিউটার ও ল্যাপটপ", "টিভি ও অডিও", "ফ্রিজ ও এসি", "ইলেকট্রিক সামগ্রী", "সোলার ও ব্যাটারি", "ক্যামেরা", "অ্যাক্সেসরিজ"], keywords: ["মোবাইল কিনুন", "ইলেকট্রনিক্স পাইকারি", "গেজেট দাম বাংলাদেশ"] },
  { key: "fashion", slug: "clothing-shoes-fashion", label: "পোশাক, জুতা ও ফ্যাশন", emoji: "👕", subcategories: ["পুরুষের পোশাক", "নারীদের পোশাক", "শিশুদের পোশাক", "শাড়ি ও থ্রি-পিস", "জুতা ও স্যান্ডেল", "ব্যাগ ও মানিব্যাগ", "ঘড়ি ও গয়না", "ফ্যাশন অ্যাক্সেসরিজ"], keywords: ["পোশাক পাইকারি", "জুতা পাইকারি বাজার", "শাড়ি অনলাইন বাংলাদেশ"] },
  { key: "home-kitchen", slug: "home-kitchen-furniture", label: "ঘর, রান্নাঘর ও আসবাবপত্র", emoji: "🪑", subcategories: ["সোফা ও খাট", "টেবিল ও চেয়ার", "আলমারি ও তাক", "রান্নাঘরের সামগ্রী", "হোম ডেকর", "বিছানাপত্র", "লাইট ও ফ্যান", "গৃহস্থালি যন্ত্রপাতি"], keywords: ["আসবাবপত্র কিনুন", "রান্নাঘরের পণ্য পাইকারি", "ফার্নিচার বাংলাদেশ"] },
  { key: "grocery", slug: "food-grocery-daily-essentials", label: "খাবার, মুদি ও দৈনন্দিন পণ্য", emoji: "🛒", subcategories: ["চাল, ডাল ও শস্য", "তেল ও মসলা", "ময়দা ও আটা", "প্যাকেটজাত খাবার", "ফল ও সবজি", "মাছ ও মাংস", "দুধ ও দুগ্ধজাত", "পরিষ্কার-পরিচ্ছন্নতা", "পানীয়"], keywords: ["মুদি পণ্য পাইকারি", "চাল ডাল পাইকারি", "দৈনন্দিন পণ্য সরবরাহকারী"] },
  { key: "agriculture", slug: "agriculture-crops-grains", label: "কৃষি পণ্য ও শস্য", emoji: "🌾", subcategories: ["ধান ও চাল", "গম ও ভুট্টা", "ডাল ও তেলবীজ", "পাট ও আঁশ", "বীজ", "সার ও কীটনাশক", "কৃষিযন্ত্র", "সেচ সরঞ্জাম", "ফল ও সবজি", "পশুখাদ্য"], keywords: ["ধান পাইকারি", "কৃষি পণ্য বাজার", "শস্য আড়ত বাংলাদেশ"] },
  { key: "livestock-poultry-fish", slug: "livestock-poultry-fish", label: "গবাদিপশু, পোল্ট্রি ও মাছ", emoji: "🐄", subcategories: ["গরু ও মহিষ", "ছাগল ও ভেড়া", "দুধেল গাভী", "মুরগি ও হাঁস", "বাচ্চা ও ডিম", "মাছ ও পোনা", "মাছের খাদ্য", "পশু-পাখির খাদ্য", "খামার সরঞ্জাম"], keywords: ["গরু কিনুন", "পোল্ট্রি পাইকারি", "মাছের পোনা বিক্রি"] },
  { key: "machinery", slug: "machinery-tools", label: "যন্ত্রপাতি ও সরঞ্জাম", emoji: "⚙️", subcategories: ["শিল্প যন্ত্রপাতি", "কৃষিযন্ত্র", "পাওয়ার টুলস", "জেনারেটর ও কম্প্রেসর", "ওয়ার্কশপ সরঞ্জাম", "সেফটি সরঞ্জাম", "খুচরা যন্ত্রাংশ", "ব্যবহৃত যন্ত্রপাতি"], keywords: ["ব্যবহৃত মেশিন বিক্রি", "যন্ত্রপাতি পাইকারি", "ইন্ডাস্ট্রিয়াল মেশিন বাংলাদেশ"] },
  { key: "vehicles", slug: "cars-motorcycles-parts", label: "গাড়ি, মোটরসাইকেল ও যন্ত্রাংশ", emoji: "🏍️", subcategories: ["গাড়ি", "মোটরসাইকেল", "সাইকেল", "অটো/সিএনজি", "গাড়ির যন্ত্রাংশ", "মোটরসাইকেল পার্টস", "টায়ার ও ব্যাটারি", "গাড়ি ভাড়া"], keywords: ["মোটরসাইকেল বিক্রি", "গাড়ির যন্ত্রাংশ", "ব্যবহৃত গাড়ি বাংলাদেশ"] },
  { key: "construction", slug: "construction-materials-hardware", label: "নির্মাণ সামগ্রী ও হার্ডওয়্যার", emoji: "🧱", subcategories: ["রড ও সিমেন্ট", "ইট ও বালু", "টাইলস ও পাথর", "রং ও কেমিক্যাল", "পাইপ ও ফিটিংস", "দরজা-জানালা", "ইলেকট্রিক ফিটিংস", "হার্ডওয়্যার টুলস"], keywords: ["রড সিমেন্ট পাইকারি", "নির্মাণ সামগ্রী সরবরাহকারী", "হার্ডওয়্যার দোকান"] },
  { key: "beauty", slug: "beauty-personal-care", label: "সৌন্দর্য ও ব্যক্তিগত পরিচর্যা", emoji: "🧴", subcategories: ["ত্বকের যত্ন", "চুলের যত্ন", "প্রসাধনী", "পারফিউম", "ব্যক্তিগত পরিচর্যা", "সেলুন সামগ্রী", "বিউটি টুলস", "বেবি কেয়ার"], keywords: ["কসমেটিকস পাইকারি", "বিউটি পণ্য বাংলাদেশ", "পার্সোনাল কেয়ার পণ্য"] },
  { key: "books-office", slug: "books-stationery-office", label: "বই, স্টেশনারি ও অফিস সামগ্রী", emoji: "📚", subcategories: ["পাঠ্যবই", "গল্প ও নন-ফিকশন", "খাতা ও কাগজ", "কলম ও স্টেশনারি", "অফিস সরঞ্জাম", "প্রিন্টার ও টোনার", "স্কুল সামগ্রী", "প্যাকেজিং সামগ্রী"], keywords: ["স্টেশনারি পাইকারি", "অফিস সামগ্রী", "খাতা কলম পাইকারি"] },
  { key: "services-rentals", slug: "services-rentals", label: "সেবা ও ভাড়ার সুবিধা", emoji: "🛠️", subcategories: ["মেরামত সেবা", "পরিবহন ও ডেলিভারি", "ইভেন্ট ও ক্যাটারিং", "শিক্ষা ও প্রশিক্ষণ", "ডিজিটাল সেবা", "বাসা/দোকান ভাড়া", "যন্ত্রপাতি ভাড়া", "গাড়ি ভাড়া", "কৃষি সেবা", "অন্যান্য সেবা"], keywords: ["স্থানীয় সেবা বাংলাদেশ", "যন্ত্রপাতি ভাড়া", "দোকান ভাড়া"] },
];

export const DISTRICTS = [
  "ঢাকা","ফরিদপুর","গাজীপুর","গোপালগঞ্জ","কিশোরগঞ্জ","মাদারীপুর","মানিকগঞ্জ","মুন্সিগঞ্জ","নারায়ণগঞ্জ","নরসিংদী","রাজবাড়ী","শরীয়তপুর","টাঙ্গাইল",
  "ব্রাহ্মণবাড়িয়া","চাঁদপুর","চট্টগ্রাম","কুমিল্লা","কক্সবাজার","ফেনী","খাগড়াছড়ি","লক্ষ্মীপুর","নোয়াখালী","রাঙামাটি","বান্দরবান",
  "বগুড়া","জয়পুরহাট","নওগাঁ","নাটোর","চাঁপাইনবাবগঞ্জ","পাবনা","রাজশাহী","সিরাজগঞ্জ",
  "হবিগঞ্জ","মৌলভীবাজার","সুনামগঞ্জ","সিলেট",
  "দিনাজপুর","গাইবান্ধা","কুড়িগ্রাম","লালমনিরহাট","নীলফামারী","পঞ্চগড়","রংপুর","ঠাকুরগাঁও",
  "জামালপুর","ময়মনসিংহ","নেত্রকোনা","শেরপুর",
  "বাগেরহাট","চুয়াডাঙ্গা","যশোর","ঝিনাইদহ","খুলনা","কুষ্টিয়া","মাগুরা","মেহেরপুর","নড়াইল","সাতক্ষীরা",
  "বরগুনা","বরিশাল","ভোলা","ঝালকাঠি","পটুয়াখালী","পিরোজপুর"
];

export const CATEGORY_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c])) as Record<string, Category>;
export const CATEGORY_BY_SLUG = Object.fromEntries(CATEGORIES.map(c => [c.slug, c])) as Record<string, Category>;
export const emojiOf = (c: string) => CATEGORY_BY_KEY[c]?.emoji ?? "🧺";
export const labelOf = (c: string) => CATEGORY_BY_KEY[c]?.label ?? c;
export const bn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
export const money = (n: number) => "৳ " + bn(n.toLocaleString("en-IN"));
export const UNITS: Record<string, string> = { kg: "কেজি", maund: "মণ", ton: "টন", piece: "টি", dozen: "ডজন", liter: "লিটার", bag: "বস্তা", hali: "হালি", box: "কার্টন", set: "সেট", hour: "ঘণ্টা", day: "দিন", month: "মাস" };
export const unitLabel = (u: string) => UNITS[u] ?? u;
export const isValidDistrict = (district: string) => DISTRICTS.includes(district);
export const isValidCategory = (key: string, subcategory?: string) => {
  const c = CATEGORY_BY_KEY[key];
  return !!c && (!subcategory || c.subcategories.includes(subcategory));
};
