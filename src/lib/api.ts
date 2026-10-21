// আপনার openapi.yaml অনুযায়ী লেখা। API-র সাথে কথা হয় শুধু এই ফাইলে।
export interface Listing {
  id: string; title: string; category: string; subcategory?: string; district: string; upazila?: string | null;
  price: number; unit: string; quantity: number; negotiable: boolean;
  sellerName: string; description: string; images: string[]; phone?: string; sellerVerified?: boolean;
  saleType?: "retail" | "wholesale" | "both"; minOrderQuantity?: number; businessName?: string; deliveryAvailable?: boolean;
}
export interface Filters { search?: string; category?: string; subcategory?: string; district?: string; saleType?: string }
export type ListingInput = Omit<Listing, "id" | "images" | "upazila"> & { phone: string; images: string[]; subcategory: string; saleType: "retail" | "wholesale" | "both"; minOrderQuantity: number; deliveryAvailable: boolean };

import { isValidCategory, isValidDistrict } from "./data";

const BASE = "/api";
export const LOGIN_URL = `${BASE}/login?returnTo=/`;

const mk = (id: number, title: string, category: string, district: string, price: number, unit: string, sellerName: string, phone: string): Listing =>
  ({ id: String(id), title, category, district, price, unit, quantity: 10, negotiable: true, sellerName, description: "নমুনা বিজ্ঞাপন", images: [], phone });

const SAMPLE: Listing[] = [
  mk(1, "আমন ধান (ব্রি-ধান ৪৯)", "agriculture", "বগুড়া", 1250, "maund", "করিম মিয়া", "01711000001"),
  mk(2, "পদ্মার তাজা ইলিশ", "grocery", "চাঁদপুর", 1400, "kg", "মা মাছ ঘাট", "01711000003"),
  mk(3, "দুধেল গাভী", "livestock-poultry-fish", "খুলনা", 85000, "piece", "মোস্তফা ডেইরি", "01711000011"),
  mk(4, "ইউরিয়া সার (৫০ কেজি)", "agriculture", "রাজশাহী", 2200, "bag", "কৃষি সেবা কেন্দ্র", "01711000006"),
  mk(5, "তাজা পটল ও বেগুন", "grocery", "ঢাকা", 55, "kg", "কাওরান বাজার আড়ত", "01711000013"),
  mk(6, "পাটের আঁশ (উন্নত মান)", "agriculture", "যশোর", 3200, "maund", "কৃষক সমবায়", "01711000015"),
  mk(7, "সোলার সেচ পাম্প", "electronics", "রংপুর", 95000, "piece", "সবুজ এনার্জি", "01711000017"),
  mk(8, "ইলেকট্রিক ধান মাড়াই মেশিন", "machinery", "ময়মনসিংহ", 42000, "piece", "আধুনিক কৃষি যন্ত্র", "01711000018"),
];

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


export async function uploadListingImages(files: File[]): Promise<string[] | null> {
  if (files.length > 5 || files.some(f => f.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(f.type))) return null;
  const urls: string[] = [];
  try {
    for (const file of files) {
      const request = await fetch(`${BASE}/storage/uploads/request-url`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!request.ok) return null;
      const signed = await request.json();
      const uploaded = await fetch(signed.uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploaded.ok) return null;
      const path = String(signed.objectPath || "").split("/").map((part: string) => encodeURIComponent(part)).join("/");
      urls.push(`${BASE}/storage/public-objects/${path}`);
    }
    return urls;
  } catch { return null; }
}

export async function createListing(body: ListingInput): Promise<"ok" | "login" | "seller" | "invalid" | "error"> {
  if (!isValidCategory(body.category, body.subcategory) || !isValidDistrict(body.district) || !["retail", "wholesale", "both"].includes(body.saleType) || body.minOrderQuantity < 1) return "invalid";
  try {
    const res = await fetch(`${BASE}/listings`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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
export async function createOrder(body: OrderInput): Promise<{status:"ok"; id:string} | {status:"login"|"error"}> {
  try {
    const res = await fetch(`${BASE}/orders`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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
