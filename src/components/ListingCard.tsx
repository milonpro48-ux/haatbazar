import { useState } from "react";
import { Phone, MapPin, ShoppingCart } from "lucide-react";
import { revealPhone, type Listing } from "@/lib/api";
import { Link } from "wouter";
import { emojiOf, labelOf, money, bn, unitLabel } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

export function ListingCard({ item, onOrder }: { item: Listing; onOrder: (l: Listing) => void }) {
  const [phone, setPhone] = useState(item.phone ?? "");
  const [err, setErr] = useState("");


  async function show() {
    const r = await revealPhone(item);
    if (r.phone) { setPhone(r.phone); trackEvent("contact", { listingId: item.id, category: item.category }); }
    else setErr(r.error === "limit" ? "অনেকবার চেষ্টা হয়েছে, একটু পরে আবার দেখুন" : "নম্বর আনা যায়নি");
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-md">
      <div className="grid h-32 place-items-center bg-emerald-50 text-6xl dark:bg-emerald-950">
        {item.images?.[0] ? <img src={item.images[0]} alt={item.title} className="h-full w-full object-cover" /> : emojiOf(item.category)}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="font-semibold leading-snug"><Link href={`/product/${item.id}`} className="hover:text-emerald-700 hover:underline">{item.title}</Link></h3>
        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
          {money(item.price)} <span className="text-sm font-normal text-muted-foreground">/ {unitLabel(item.unit)}</span>
          {item.negotiable && <span className="ml-2 text-xs font-normal text-amber-600">দরদাম চলবে</span>}
        </p>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={14} />{item.upazila ? `${item.upazila}, ` : ""}{item.district} · {labelOf(item.category)}
        </p>
        <p className="text-sm">বিক্রেতা: {item.businessName || item.sellerName} · মজুদ {bn(item.quantity)} {unitLabel(item.unit)} {item.sellerVerified && <span className="font-semibold text-emerald-700">· ✓ যাচাইকৃত</span>}</p>
        {item.saleType && <p className="text-xs font-semibold text-emerald-700">{item.saleType === "wholesale" ? "পাইকারি" : item.saleType === "retail" ? "খুচরা" : "খুচরা ও পাইকারি"} · সর্বনিম্ন অর্ডার {bn(item.minOrderQuantity || 1)} {unitLabel(item.unit)}</p>}
        {phone ? (
          <a href={`tel:${phone}`} className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Phone size={15} /> {bn(phone)}
          </a>
        ) : (
          <button onClick={show} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            <Phone size={15} /> ফোন নম্বর দেখুন
          </button>
        )}
        {err && <p className="text-xs text-red-600">{err}</p>}
        <button onClick={() => onOrder(item)} className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-500">
          <ShoppingCart size={15} /> অর্ডার করুন
        </button>
      </div>
    </div>
  );
}
