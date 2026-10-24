import { emojiOf, money } from "@/lib/data";
import type { Listing } from "@/lib/api";
import { Link } from "wouter";

export function ListingCard({ item }: { item: Listing; onOrder: (l: Listing) => void }) {
  const discountPercent = item.discountPercent;

  return (
    <div className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={`/product/${item.id}`}
        aria-label={`পণ্যের বিস্তারিত দেখুন: ${item.title}`}
        className="block"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-emerald-50 dark:bg-emerald-950">
          {discountPercent && discountPercent > 0 ? (
            <span className="absolute left-2 top-2 z-10 rounded-md bg-amber-400 px-2 py-1 text-xs font-extrabold text-rose-950 shadow">
              {discountPercent}% OFF
            </span>
          ) : null}
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
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">{item.title}</h3>
          <p className="text-base font-extrabold text-blue-700 dark:text-sky-400">
            {money(item.price)}
          </p>
        </div>
      </Link>
    </div>
  );
}
