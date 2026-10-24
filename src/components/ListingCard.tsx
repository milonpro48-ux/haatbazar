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
    <div className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={`/product/${item.id}`}
        aria-label={`পণ্যের ছবি দেখুন এবং বিস্তারিত খুলুন: ${item.title}`}
        className="block aspect-square w-full overflow-hidden bg-emerald-50 dark:bg-emerald-950"
      >
        {item.images?.[0] ? (
          <img
            src={item.images[0]}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-6xl">{emojiOf(item.category)}</div>
        )}
      </Link>
    </div>
  );
}
