export type PaymentOption = "later" | "bkash" | "nagad" | "rocket";
export type OrderFieldKey = "name" | "phone" | "email" | "address";
export type SiteSettings = {
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
