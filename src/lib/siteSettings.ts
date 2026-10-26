export type PaymentOption = "later" | "bkash" | "nagad" | "rocket";
export type OrderFieldKey = "name" | "phone" | "email" | "address";
export type EditableCategory = { id: string; label: string; emoji: string; slug: string; enabled: boolean };
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
  categories: [
    {id:"electronics",label:"ইলেকট্রিক ও গেজেট",emoji:"📱",slug:"electronics-gadgets",enabled:true},
    {id:"fashion",label:"পোশাক, জুতা ও ফ্যাশন",emoji:"👕",slug:"clothing-shoes-fashion",enabled:true},
    {id:"home-kitchen",label:"ঘর, রান্নাঘর ও আসবাবপত্র",emoji:"🪑",slug:"home-kitchen-furniture",enabled:true},
    {id:"grocery",label:"খাবার, মুদি ও দৈনন্দিন পণ্য",emoji:"🛒",slug:"food-grocery-daily-essentials",enabled:true},
    {id:"agriculture",label:"কৃষি পণ্য ও শস্য",emoji:"🌾",slug:"agriculture-crops-grains",enabled:true},
    {id:"livestock",label:"গবাদিপশু, পোল্ট্রি ও মাছ",emoji:"🐄",slug:"livestock-poultry-fish",enabled:true},
    {id:"bogura-sweets",label:"বগুড়ার দই-মিষ্টি",emoji:"🍮",slug:"bogura-doi-mishti",enabled:true}
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
      categories: Array.isArray(saved.categories) ? saved.categories : DEFAULT_SITE_SETTINGS.categories,
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
