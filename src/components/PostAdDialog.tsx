import { useState } from "react";
import { X } from "lucide-react";
import { createListing, uploadListingImages, LOGIN_URL } from "@/lib/api";
import { CATEGORIES, DISTRICTS, UNITS } from "@/lib/data";


const field = "w-full rounded-lg border bg-background px-3 py-2";

export function PostAdDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [subcategory, setSubcategory] = useState(CATEGORIES[0].subcategories[0]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const uploadedImages = imageFiles.length ? await uploadListingImages(imageFiles) : [];
    if (uploadedImages === null) { setBusy(false); setMsg("images"); return; }
    const r = await createListing({
      title: String(f.get("title")), category: String(f.get("category")), subcategory: String(f.get("subcategory")), district: String(f.get("district")),
      price: Math.round(Number(f.get("price"))), unit: String(f.get("unit")), quantity: Math.max(1, Math.round(Number(f.get("quantity")))),
      negotiable: f.get("negotiable") === "on", sellerName: String(f.get("name")), phone: String(f.get("phone")),
      description: String(f.get("description")), images: uploadedImages,
      saleType: String(f.get("saleType") || "both") as "retail" | "wholesale" | "both",
      minOrderQuantity: Math.max(1, Math.round(Number(f.get("minOrderQuantity") || 1))),
      businessName: String(f.get("businessName") || ""), deliveryAvailable: f.get("deliveryAvailable") === "on",
    });
    setBusy(false);
    if (r === "ok") { onDone(); onClose(); } else setMsg(r);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">নতুন বিজ্ঞাপন</h2>
          <button type="button" onClick={onClose} aria-label="বন্ধ"><X /></button>
        </div>
        <input name="title" required minLength={3} maxLength={120} placeholder="শিরোনাম, যেমন: ভালো মানের আমন ধান" className={field} />
        <div className="grid grid-cols-2 gap-2">
          <select name="category" value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(CATEGORIES.find(c => c.key === e.target.value)?.subcategories[0] || ""); }} required className={field}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
          <select name="subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required className={field}>{(CATEGORIES.find(c => c.key === category)?.subcategories || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
          <select name="saleType" defaultValue="both" className={field} aria-label="বিক্রির ধরন"><option value="retail">শুধু খুচরা</option><option value="wholesale">শুধু পাইকারি</option><option value="both">খুচরা ও পাইকারি</option></select>
          <input name="minOrderQuantity" type="number" min={1} defaultValue={1} required placeholder="সর্বনিম্ন অর্ডার" className={field} />
          <input name="businessName" maxLength={120} placeholder="দোকান/প্রতিষ্ঠানের নাম (ঐচ্ছিক)" className={field} />
          <select name="district" className={field}>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</select>
          <input name="price" type="number" min={0} required placeholder="দাম (৳)" className={field} />
          <select name="unit" className={field}>{Object.entries(UNITS).map(([k, v]) => <option key={k} value={k}>প্রতি {v}</option>)}</select>
          <input name="quantity" type="number" min={1} defaultValue={1} required placeholder="মজুদ পরিমাণ" className={field} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="negotiable" /> দরদাম চলবে</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="deliveryAvailable" /> ডেলিভারি দেওয়া যাবে</label>
          <input name="name" required minLength={2} placeholder="আপনার নাম" className={field} />
          <input name="phone" required inputMode="tel" pattern="^(?:\+?88)?01[3-9][0-9]{8}$" title="১১ সংখ্যার মোবাইল নম্বর, যেমন 01712345678" placeholder="01XXXXXXXXX" className={field} />
        </div>
        <label className="block space-y-1 text-sm"><span className="font-semibold">পণ্যের বাস্তব ছবি (সর্বোচ্চ ৫টি, প্রতিটি ২ MB-এর মধ্যে)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setImageFiles(Array.from(e.target.files || []).slice(0,5))} className={field} /><span className="text-xs text-muted-foreground">নিজের তোলা পরিষ্কার ছবি দিন; JPG, PNG বা WebP। ছবি দিলে ক্রেতার আস্থা বাড়ে।</span>{imageFiles.length > 0 && <span className="block text-xs text-emerald-700">{imageFiles.length}টি ছবি নির্বাচিত</span>}</label>
        <textarea name="description" required minLength={10} maxLength={2000} rows={3} placeholder="বিবরণ (কমপক্ষে ১০ অক্ষর)" className={field} />
        {msg === "login" && <p className="text-sm text-amber-600">বিজ্ঞাপন দিতে আগে <a className="underline" href={LOGIN_URL}>লগইন করুন</a>।</p>}
        {msg === "seller" && <p className="text-sm text-amber-700">আপনার অ্যাকাউন্টটি ক্রেতা হিসেবে খোলা। বিজ্ঞাপন দিতে বিক্রেতা অ্যাকাউন্ট তৈরি করুন বা বিক্রেতা অ্যাকাউন্টে লগইন করুন। <a className="underline" href="/api/register">বিক্রেতা অ্যাকাউন্ট খুলুন</a></p>}
        {msg === "invalid" && <p className="text-sm text-red-600">তথ্য ঠিক নেই অথবা সার্ভারের ক্যাটাগরি/সাবক্যাটাগরি তালিকার সঙ্গে মেলেনি। সার্ভারের validation/schema-ও আপডেট করতে হবে।</p>}
        {msg === "images" && <p className="text-sm text-red-600">ছবি আপলোড হয়নি। JPG/PNG/WebP, সর্বোচ্চ ২ MB করে দিন এবং লগইন/স্টোরেজ API সচল আছে কি না দেখুন।</p>}
        {msg === "error" && <p className="text-sm text-red-600">কিছু একটা ভুল হয়েছে, আবার চেষ্টা করুন।</p>}
        <button disabled={busy} className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60">
          {busy ? "পাঠানো হচ্ছে…" : "প্রকাশ করুন"}
        </button>
      </form>
    </div>
  );
}
