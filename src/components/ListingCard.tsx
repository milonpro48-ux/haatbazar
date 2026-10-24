import { emojiOf, money } from "@/lib/data";
import type { Listing } from "@/lib/api";
import { Link } from "wouter";

export function ListingCard({ item }: { item: Listing; onOrder: (l: Listing) => void }) {
  return (
    <div className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={`/product/${item.id}`}
        aria-label={`পণ্যের বিস্তারিত দেখুন: ${item.title}`}
        className="block"
      >
        <div className="aspect-square w-full overflow-hidden bg-emerald-50 dark:bg-emerald-950">
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
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{item.title}</h3>
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            {money(item.price)}
          </p>
        </div>
      </Link>
    </div>
  );
}
