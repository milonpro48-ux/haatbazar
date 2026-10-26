export type PaymentOption = "later" | "bkash" | "nagad" | "rocket";
export type OrderFieldKey = "name" | "phone" | "email" | "address";
export type WhyItem = { id: string; icon: string; title: string; body: string; enabled: boolean };
export type FooterLink = { id: string; label: string; href: string; enabled: boolean };
export type FooterLinkGroup = { id: string; links: FooterLink[] };
export type EditableCategory = { id: string; label: string; emoji: string; slug: string; enabled: boolean; subcategories: string[] };
export type SiteSettings = {
  headerPromo: string;
  headerNavToday: string;
  headerNavPopular: string;
  headerNavWhy: string;
  heroTitle: string;
  heroDescription: string;
  footerSupportTitle: string;
  footerMarketplaceTitle: string;
  footerSellerTitle: string;
  footerContactTitle: string;
  footerDescription: string;
  footerCopyright: string;
  whyTitle: string;
  whyItems: WhyItem[];
  footerShopTitle: string;
  footerContactText: string;
  footerContactButton: string;
  footerOrderTitle: string;
  footerOrderNotice: string;
  footerBadges: string[];
  footerLinks: FooterLinkGroup[];
  categories: EditableCategory[];
  siteName: string;
  tagline: string;
  retailCommission: number;
  wholesaleCommission: number;
  deliveryFee: number;
  orderButtonText: string;
  paymentMethods: Record<PaymentOption, boolean>;
  paymentLabels: Record<PaymentOption, string>;
  fieldLabels: Record<OrderFieldKey, string>;
  fieldPlaceholders: Record<OrderFieldKey, string>;
};
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  headerPromo: "🇧🇩 সারা বাংলাদেশে কেনাবেচা · Help & Support · Become a Seller",
  headerNavToday: "আজকের পণ্য", headerNavPopular: "জনপ্রিয় ক্যাটাগরি", headerNavWhy: "কেন হাটবাজার",
  heroTitle: "বাংলাদেশের কেনাবেচা, এখন হাটবাজারে",
  heroDescription: "খুচরা ও পাইকারি পণ্য খুঁজুন, বিক্রি করুন এবং সরাসরি বিক্রেতার সঙ্গে যোগাযোগ করুন।",
  footerSupportTitle: "ক্রেতা সহায়তা", footerMarketplaceTitle: "হাটবাজার", footerSellerTitle: "বিক্রেতা কর্নার", footerContactTitle: "যোগাযোগ ও তথ্য",
  footerDescription: "সারা বাংলাদেশের ক্রেতা ও বিক্রেতাদের জন্য অনলাইন বাজার",
  footerCopyright: "© ২০২৬ হাটবাজার · বাংলাদেশের অনলাইন কেনাবেচার বাজার",
  whyTitle: "কেন হাটবাজার?",
  whyItems: [
    {id:"known-seller",icon:"store",title:"চেনা মুখ, চেনা স্বাদ",body:"বিক্রেতার নাম, এলাকা ও ফোন নম্বর সব খোলা।",enabled:true},
    {id:"fresh",icon:"leaf",title:"টাটকা মানে সত্যিই টাটকা",body:"সরাসরি কৃষকের কাছ থেকে, স্টকে বসে থাকা মাল নয়।",enabled:true},
    {id:"fair-price",icon:"badge-check",title:"দামে লুকোচুরি নেই",body:"যা দেখছেন সেটাই দাম, দরদাম সরাসরি বিক্রেতার সাথে।",enabled:true},
    {id:"nearby",icon:"truck",title:"কাছের বিক্রেতা",body:"জেলা ধরে খুঁজে নিজের এলাকার বিক্রেতা পান।",enabled:true}
  ],
  footerShopTitle: "হাটবাজারে কেনাকাটা করুন",
  footerContactText: "প্রশ্ন বা সহায়তার জন্য যোগাযোগ পেজে যান।",
  footerContactButton: "যোগাযোগ করুন",
  footerOrderTitle: "পেমেন্ট ও অর্ডার",
  footerOrderNotice: "অর্ডার দেওয়ার আগে বিক্রেতার সঙ্গে পণ্যের দাম ও ডেলিভারি নিশ্চিত করুন।",
  footerBadges: ["সরাসরি বিক্রেতার সঙ্গে যোগাযোগ","খুচরা ও পাইকারি","বাংলাদেশজুড়ে"],
  footerLinks: [
    {id:"support",links:[
      {id:"help",label:"সহায়তা কেন্দ্র",href:"/contact",enabled:true},
      {id:"buying",label:"কীভাবে কিনবেন",href:"/about",enabled:true},
      {id:"refund",label:"রিফান্ড ও ফেরত নীতি",href:"/refund-policy",enabled:true},
      {id:"delivery",label:"ডেলিভারি তথ্য",href:"/delivery-policy",enabled:true},
      {id:"terms",label:"শর্তাবলি",href:"/terms",enabled:true}
    ]},
    {id:"marketplace",links:[
      {id:"about",label:"আমাদের সম্পর্কে",href:"/about",enabled:true},
      {id:"contact",label:"যোগাযোগ করুন",href:"/contact",enabled:true},
      {id:"privacy",label:"গোপনীয়তা নীতি",href:"/privacy",enabled:true},
      {id:"terms-use",label:"ব্যবহারের শর্ত",href:"/terms",enabled:true},
      {id:"popular",label:"জনপ্রিয় ক্যাটাগরি",href:"/#popular",enabled:true}
    ]},
    {id:"seller",links:[
      {id:"products",label:"পণ্য দেখুন",href:"/#products",enabled:true},
      {id:"post-ad",label:"পণ্য বিক্রির বিজ্ঞাপন দিন",href:"action:post-ad",enabled:true},
      {id:"seller-help",label:"বিক্রেতার সহায়তা",href:"/contact",enabled:true}
    ]}
  ],
  categories: [
    {id:"electronics",label:"ইলেকট্রিক ও গেজেট",emoji:"📱",slug:"electronics-gadgets",enabled:true,subcategories:["মোবাইল ফোন","কম্পিউটার ও ল্যাপটপ","টিভি ও অডিও","ক্যামেরা","চার্জার ও কেবল","অন্যান্য গ্যাজেট"]},
    {id:"fashion",label:"পোশাক, জুতা ও ফ্যাশন",emoji:"👕",slug:"clothing-shoes-fashion",enabled:true,subcategories:["পুরুষদের পোশাক","নারীদের পোশাক","শিশুদের পোশাক","জুতা ও স্যান্ডেল","ব্যাগ ও ঘড়ি","কাপড় ও থ্রি-পিস"]},
    {id:"home-kitchen",label:"ঘর, রান্নাঘর ও আসবাবপত্র",emoji:"🪑",slug:"home-kitchen-furniture",enabled:true,subcategories:["আসবাবপত্র","রান্নাঘরের সরঞ্জাম","বিছানা ও বালিশ","ঘর সাজানোর সামগ্রী","লাইট ও ফ্যান","অন্যান্য"]},
    {id:"grocery",label:"খাবার, মুদি ও দৈনন্দিন পণ্য",emoji:"🛒",slug:"food-grocery-daily-essentials",enabled:true,subcategories:["চাল ও ডাল","তেল ও মসলা","ফল ও সবজি","মাছ ও মাংস","দুধ ও দুগ্ধজাত","বগুড়ার দই-মিষ্টি"]},
    {id:"agriculture",label:"কৃষি পণ্য ও শস্য",emoji:"🌾",slug:"agriculture-crops-grains",enabled:true,subcategories:["ধান ও চাল","বীজ","সার","কীটনাশক","কৃষি যন্ত্রপাতি","ফসল ও শস্য"]},
    {id:"livestock-poultry-fish",label:"গবাদিপশু, পোল্ট্রি ও মাছ",emoji:"🐄",slug:"livestock-poultry-fish",enabled:true,subcategories:["গরু ও মহিষ","ছাগল ও ভেড়া","মুরগি ও হাঁস","মাছ ও পোনা","পশুখাদ্য","পশুপালন সরঞ্জাম"]},
    {id:"machinery",label:"যন্ত্রপাতি ও সরঞ্জাম",emoji:"⚙️",slug:"machinery-tools",enabled:true,subcategories:["কৃষি যন্ত্রপাতি","শিল্প যন্ত্রপাতি","হাতের সরঞ্জাম","পাম্প ও মোটর","জেনারেটর","খুচরা যন্ত্রাংশ"]},
    {id:"vehicles",label:"গাড়ি, মোটরসাইকেল ও যন্ত্রাংশ",emoji:"🏍️",slug:"cars-motorcycles-parts",enabled:true,subcategories:["মোটরসাইকেল","প্রাইভেট কার","সাইকেল","গাড়ির যন্ত্রাংশ","টায়ার ও ব্যাটারি","বাণিজ্যিক যানবাহন"]},
    {id:"construction",label:"নির্মাণ সামগ্রী ও হার্ডওয়্যার",emoji:"🧱",slug:"construction-materials-hardware",enabled:true,subcategories:["সিমেন্ট ও রড","ইট ও বালু","রং ও রাসায়নিক","পাইপ ও ফিটিংস","ইলেকট্রিক সামগ্রী","হার্ডওয়্যার"]},
    {id:"beauty",label:"সৌন্দর্য ও ব্যক্তিগত পরিচর্যা",emoji:"🧴",slug:"beauty-personal-care",enabled:true,subcategories:["ত্বকের যত্ন","চুলের যত্ন","মেকআপ","পারফিউম","ব্যক্তিগত পরিচর্যা","সেলুন সামগ্রী"]},
    {id:"books-office",label:"বই, স্টেশনারি ও অফিস সামগ্রী",emoji:"📚",slug:"books-stationery-office",enabled:true,subcategories:["স্কুলের বই","উপন্যাস ও গল্প","খাতা ও কলম","অফিস সরঞ্জাম","প্রিন্টার ও কালি","শিক্ষা উপকরণ"]},
    {id:"services-rentals",label:"সেবা ও ভাড়ার সুবিধা",emoji:"🛠️",slug:"services-rentals",enabled:true,subcategories:["বাসা ও দোকান ভাড়া","যন্ত্রপাতি ভাড়া","পরিবহন সেবা","মেরামত সেবা","ডিজিটাল সেবা","অন্যান্য সেবা"]},
    {id:"bogra-doi-mishti",label:"বগুড়ার দই-মিষ্টি",emoji:"🍮",slug:"bogra-doi-mishti",enabled:true,subcategories:["বগুড়ার দই","মিষ্টি","রসমালাই","ঘি","দই-মিষ্টির পাইকারি","উপহার প্যাক"]}
  ],
  siteName: "HaatBazar",
  tagline: "আপনার এলাকার হাটকেনা-বেচা সহজসারা বাংলাদেশ",
  retailCommission: 5,
  wholesaleCommission: 3,
  deliveryFee: 0,
  orderButtonText: "অর্ডার নিশ্চিত করুন",
  paymentMethods: { later: true, bkash: true, nagad: true, rocket: true },
  paymentLabels: { later: "অর্ডার দিন, পরে পেমেন্ট / COD", bkash: "bKash", nagad: "Nagad", rocket: "Rocket" },
  fieldLabels: { name: "আপনার নাম", phone: "ফোন নম্বর", email: "ইমেইল", address: "ডেলিভারির ঠিকানা" },
  fieldPlaceholders: { name: "আপনার নাম লিখুন", phone: "ফোন নম্বর (01XXXXXXXXX)", email: "ইমেইল (পেমেন্ট রসিদের জন্য)", address: "ডেলিভারির ঠিকানা লিখুন" },
};
const STORAGE_KEY = "haatbazar-demo-site-settings-v1";
export function getSiteSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SITE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const saved = JSON.parse(raw) as Partial<SiteSettings>;
    return {
      ...DEFAULT_SITE_SETTINGS, ...saved,
      categories: Array.isArray(saved.categories) ? saved.categories.map((category) => ({ ...category, subcategories: Array.isArray(category.subcategories) ? category.subcategories : (DEFAULT_SITE_SETTINGS.categories.find((item) => item.id === category.id)?.subcategories ?? []) })) : DEFAULT_SITE_SETTINGS.categories,
      whyItems: Array.isArray(saved.whyItems) ? saved.whyItems : DEFAULT_SITE_SETTINGS.whyItems,
      footerBadges: Array.isArray(saved.footerBadges) ? saved.footerBadges : DEFAULT_SITE_SETTINGS.footerBadges,
      footerLinks: Array.isArray(saved.footerLinks) ? saved.footerLinks : DEFAULT_SITE_SETTINGS.footerLinks,
      paymentMethods: { ...DEFAULT_SITE_SETTINGS.paymentMethods, ...(saved.paymentMethods || {}) },
      paymentLabels: { ...DEFAULT_SITE_SETTINGS.paymentLabels, ...(saved.paymentLabels || {}) },
      fieldLabels: { ...DEFAULT_SITE_SETTINGS.fieldLabels, ...(saved.fieldLabels || {}) },
      fieldPlaceholders: { ...DEFAULT_SITE_SETTINGS.fieldPlaceholders, ...(saved.fieldPlaceholders || {}) },
    };
  } catch { return DEFAULT_SITE_SETTINGS; }
}
export function saveSiteSettings(settings: SiteSettings): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
