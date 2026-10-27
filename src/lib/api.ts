// আপনার openapi.yaml অনুযায়ী লেখা। API-র সাথে কথা হয় শুধু এই ফাইলে।
export interface Listing {
  id: string; title: string; category: string; subcategory?: string; district: string; upazila?: string | null;
  price: number; unit: string; quantity: number; negotiable: boolean; discountPercent?: number;
  sellerName: string; description: string; images: string[]; phone?: string; sellerVerified?: boolean;
  saleType?: "retail" | "wholesale" | "both"; minOrderQuantity?: number; businessName?: string; deliveryAvailable?: boolean;
}
export interface Filters { search?: string; category?: string; subcategory?: string; district?: string; saleType?: string }
export type ListingInput = Omit<Listing, "id" | "images" | "upazila"> & { phone: string; images: string[]; subcategory: string; saleType: "retail" | "wholesale" | "both"; minOrderQuantity: number; deliveryAvailable: boolean };

import { CATEGORIES, DISTRICTS, isValidCategory, isValidDistrict } from "./data";

const BASE = "/api";
export const LOGIN_URL = `${BASE}/login?returnTo=/`;

const mk = (id: number, title: string, category: string, district: string, price: number, unit: string, sellerName: string, phone: string): Listing =>
  ({ id: String(id), title, category, district, price, unit, quantity: 10, negotiable: true, sellerName, description: "নমুনা বিজ্ঞাপন", images: [], phone });

// Use a demo image only when it clearly matches the exact subcategory.
// Unmapped subcategories intentionally keep the no-image placeholder.
const SAMPLE_IMAGE_BY_SUBCATEGORY: Record<string, string> = {
  "টিভি ও অডিও": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
  "জুতা ও স্যান্ডেল": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  "টেবিল ও চেয়ার": "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=900&q=80",
  "প্যাকেটজাত খাবার": "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=900&q=80",
  "ধান ও চাল": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
  "গম ও ভুট্টা": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
  "মুরগি ও হাঁস": "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=900&q=80",
  "শিল্প যন্ত্রপাতি": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
  "গাড়ি": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=900&q=80",
  "রড ও সিমেন্ট": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
  "ত্বকের যত্ন": "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
  "গল্প ও নন-ফিকশন": "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=900&q=80",
  "মেরামত সেবা": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80",
  "বগুড়ার দই": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
  "দই-মিষ্টি": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
  "বগুড়ার মিষ্টি": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
  "দই ও মিষ্টির প্যাকেজ": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80",
};
const SAMPLE: Listing[] = CATEGORIES.flatMap((category, categoryIndex) =>
  category.subcategories.slice(0, 5).map((subcategory, productIndex) => {
    const saleTypes: NonNullable<Listing["saleType"]>[] = ["retail", "wholesale", "both", "retail", "wholesale"];
    return {
      id: "demo-" + category.key + "-" + (productIndex + 1),
      title: subcategory + " — নমুনা পণ্য " + (productIndex + 1),
      category: category.key, subcategory, district: DISTRICTS[(categoryIndex * 5 + productIndex) % DISTRICTS.length],
      price: (categoryIndex + 1) * 125 + (productIndex + 1) * 75,
      unit: category.key === "grocery" || category.key === "agriculture" ? "kg" : "piece",
      quantity: 20 + productIndex * 5, negotiable: productIndex % 2 === 0,
      sellerName: "হাটবাজার নমুনা বিক্রেতা " + (categoryIndex + 1),
      businessName: category.label + " নমুনা দোকান",
      description: subcategory + " বিভাগের প্রদর্শনী নমুনা পণ্য। অর্ডারের আগে পণ্যের মান, মজুদ, প্রতি এককের দাম ও ডেলিভারির শর্ত বিক্রেতার সঙ্গে নিশ্চিত করুন।",
      images: SAMPLE_IMAGE_BY_SUBCATEGORY[subcategory] ? [SAMPLE_IMAGE_BY_SUBCATEGORY[subcategory]] : [],
      saleType: saleTypes[productIndex], minOrderQuantity: 1,
      deliveryAvailable: true,
    };
  })
);

export async function fetchListingById(id: string): Promise<Listing | null> {
  try { const res = await fetch(`${BASE}/listings/${encodeURIComponent(id)}`, { credentials: "include" }); if (res.ok) return await res.json(); } catch {}
  if (import.meta.env.VITE_DEMO_MODE === "true") { const r = await fetchListings({}); return r.items.find(x => x.id === id) ?? null; }
  return null;
}

export async function fetchListings(f: Filters): Promise<{ items: Listing[]; demo: boolean }> {
  try {
    const qs = new URLSearchParams({ limit: "50" });
    if (f.search) qs.set("search", f.search);
    if (f.category) qs.set("category", f.category);
    if (f.subcategory) qs.set("subcategory", f.subcategory);
    if (f.district) qs.set("district", f.district);
    if (f.saleType) qs.set("saleType", f.saleType);
    const res = await fetch(`${BASE}/listings?${qs}`, { credentials: "include" });
    if (!res.ok) throw new Error(String(res.status));
    const d = await res.json(); // { items, total, page, limit }
    return { items: d.items ?? [], demo: false };
  } catch {
    if (import.meta.env.VITE_DEMO_MODE === "true") {
      const s = (f.search ?? "").toLowerCase();
      const items = SAMPLE.filter((i) =>
        (!f.category || i.category === f.category) && (!f.subcategory || i.subcategory === f.subcategory) && (!f.district || i.district === f.district) && (!f.saleType || (i.saleType || "both") === f.saleType || i.saleType === "both") &&
        (!s || (i.title + i.sellerName).toLowerCase().includes(s)));
      return { items, demo: true };
    }
    return { items: [], demo: false };
  }
}

// ফোন নম্বর আলাদা API-তে (রেট-লিমিটেড)
export async function revealPhone(l: Listing): Promise<{ phone?: string; error?: "limit" | "error" }> {
  if (l.phone) return { phone: l.phone };
  try {
    const res = await fetch(`${BASE}/listings/${l.id}/phone`, { credentials: "include" });
    if (res.status === 429) return { error: "limit" };
    if (!res.ok) return { error: "error" };
    return { phone: (await res.json()).phone };
  } catch { return { error: "error" }; }
}


async function mutationHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const res = await fetch(`${BASE}/csrf`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data.csrf === "string" && data.csrf) headers["X-CSRF-Token"] = data.csrf;
    }
  } catch {}
  return headers;
}

export async function uploadListingImages(files: File[]): Promise<string[] | null> {
  if (files.length > 5 || files.some(f => f.size < 1 || f.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(f.type))) return null;
  const urls: string[] = [];
  try {
    for (const file of files) {
      const form = new FormData();
      form.append("image", file);
      const headers = await mutationHeaders();
      delete headers["Content-Type"];
      const uploaded = await fetch(`${BASE}/?action=upload_product_image`, {
        method: "POST", credentials: "include", headers, body: form,
      });
      if (!uploaded.ok) return null;
      const result = await uploaded.json();
      if (typeof result.url !== "string" || !/^\/uploads\/products\/[a-f0-9]{40}\.(jpg|png|webp)$/.test(result.url)) return null;
      urls.push(result.url);
    }
    return urls;
  } catch { return null; }
}

export async function createListing(body: ListingInput): Promise<"ok" | "login" | "seller" | "invalid" | "error"> {
  if (!isValidCategory(body.category, body.subcategory) || !isValidDistrict(body.district) || !["retail", "wholesale", "both"].includes(body.saleType) || body.minOrderQuantity < 1) return "invalid";
  try {
    const res = await fetch(`${BASE}/listings`, {
      method: "POST", credentials: "include",
      headers: await mutationHeaders(), body: JSON.stringify(body),
    });
    if (res.status === 401) return "login";
    if (res.status === 403) return "seller";
    if (res.status === 400) return "invalid";
    return res.ok ? "ok" : "error";
  } catch { return "error"; }
}

export interface OrderInput {
  listingId: string; quantity: number; buyerName: string; buyerPhone: string; buyerEmail: string; address: string;
}

// POST /api/orders (নতুন API)। সার্ভারে না থাকলে ব্রাউজারে সেভ হয়।
export async function createOrder(body: OrderInput): Promise<{status:"ok"; id:string} | {status:"login"} | {status:"error"}> {
  try {
    const res = await fetch(`${BASE}/orders`, {
      method: "POST", credentials: "include",
      headers: await mutationHeaders(), body: JSON.stringify(body),
    });
    if (res.status === 401) return {status:"login"};
    if (res.ok) { const data = await res.json(); return {status:"ok", id:String(data.id)}; }
    throw new Error(String(res.status));
  } catch {
    return {status:"error"};
  }
}

export async function startPayment(orderId: string, method: "bkash" | "nagad" | "rocket"): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/payments/sslcommerz/init`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({orderId,method}) });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.redirectUrl === "string" ? data.redirectUrl : null;
  } catch { return null; }
}


// Clearly labelled demo listings for previewing the marketplace while the live database is empty.
export function getSampleListings(): Listing[] { return SAMPLE; }
