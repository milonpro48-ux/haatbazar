import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, Leaf, Truck, BadgeCheck, Store, ChevronDown, MapPin } from "lucide-react";
import { fetchListings, fetchListingById, type Listing } from "@/lib/api";
import { CATEGORIES, DISTRICTS, bn, money, labelOf, unitLabel } from "@/lib/data";
import { DISTRICT_SLUGS, productSeo } from "@/lib/seo";
import { ListingCard } from "@/components/ListingCard";
import { AdminAnalytics } from "@/pages/AdminAnalytics";
import { initializeAnalytics, trackEvent } from "@/lib/analytics";
import { PostAdDialog } from "@/components/PostAdDialog";
import { OrderDialog } from "@/components/OrderDialog";

const why = [
  { icon: Store, title: "চেনা মুখ, চেনা স্বাদ", body: "বিক্রেতার নাম, এলাকা ও ফোন নম্বর সব খোলা।" },
  { icon: Leaf, title: "টাটকা মানে সত্যিই টাটকা", body: "সরাসরি কৃষকের কাছ থেকে, স্টকে বসে থাকা মাল নয়।" },
  { icon: BadgeCheck, title: "দামে লুকোচুরি নেই", body: "যা দেখছেন সেটাই দাম, দরদাম সরাসরি বিক্রেতার সাথে।" },
  { icon: Truck, title: "কাছের বিক্রেতা", body: "জেলা ধরে খুঁজে নিজের এলাকার বিক্রেতা পান।" },
];

function slugifyBn(value: string) { return DISTRICT_SLUGS[value] || value.toLowerCase().replace(/\s+/g, "-"); }

export default function Home() {
  const [location, setLocation] = useLocation();
  const path = location.split("?")[0];
  const categorySlug = path.startsWith("/category/") ? path.split("/")[2] : "";
  const districtSlug = path.startsWith("/district/") ? path.split("/")[2] : "";
  const routeCategory = CATEGORIES.find(c => c.slug === categorySlug);
  const routeDistrict = DISTRICTS.find(d => districtSlug === slugifyBn(d));
  const productId = path.startsWith("/product/") ? path.split("/")[2] : "";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [saleType, setSaleType] = useState("");
  const [district, setDistrict] = useState("");
  const [items, setItems] = useState<Listing[]>([]);
  const [product, setProduct] = useState<Listing | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [tick, setTick] = useState(0);
  const [ordering, setOrdering] = useState<Listing | null>(null);
  const [toast, setToast] = useState("");
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => { initializeAnalytics(); }, []);
  useEffect(() => {
    if (!productId) { setProduct(null); return; }
    let active = true;
    fetchListingById(productId).then(item => { if (active) { setProduct(item); if (item) trackEvent("listing_view", { listingId: item.id, category: item.category }); } });
    return () => { active = false; };
  }, [productId]);

  useEffect(() => {
    const pseo = product ? productSeo(product.title, labelOf(product.category), product.district, product.price) : null;
    const title = pseo?.title || (routeCategory ? `${routeCategory.label} কিনুন ও বিক্রি করুন | হাটবাজার` : routeDistrict ? `${routeDistrict} জেলার পণ্য কেনাবেচা | হাটবাজার` : "হাটবাজার | বাংলাদেশের খুচরা ও পাইকারি মার্কেটপ্লেস");
    const description = pseo?.description || (routeCategory ? `${routeCategory.label} খুচরা ও পাইকারি দামে খুঁজুন। বাংলাদেশজুড়ে বিক্রেতা, দাম ও সরাসরি যোগাযোগ—হাটবাজারে।` : routeDistrict ? `${routeDistrict} জেলার পণ্য, দোকান ও পাইকারি সরবরাহকারী খুঁজুন হাটবাজারে।` : "বাংলাদেশের খুচরা ও পাইকারি অনলাইন মার্কেটপ্লেস। ইলেকট্রনিক্স, পোশাক, মুদি, কৃষি, যন্ত্রপাতি ও সেবা খুঁজুন।");
    document.title = title;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = description;
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}${path || "/"}`;
    const oldSchema = document.getElementById("hb-product-jsonld");
    if (oldSchema) oldSchema.remove();
    if (product) {
      const schema = {
        "@context": "https://schema.org", "@type": "Product", name: product.title,
        description: product.description, category: labelOf(product.category),
        image: product.images?.filter(Boolean) || [],
        offers: { "@type": "Offer", priceCurrency: "BDT", price: product.price,
          availability: product.quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: canonical.href, seller: { "@type": "Organization", name: product.businessName || product.sellerName } }
      };
      const script = document.createElement("script"); script.id = "hb-product-jsonld"; script.type = "application/ld+json"; script.text = JSON.stringify(schema); document.head.appendChild(script);
    }
  }, [path, routeCategory, routeDistrict, product]);

  useEffect(() => {
    if (showAnalytics) return;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetchListings({ search, category: routeCategory?.key || category, subcategory: subcategory || undefined, district: routeDistrict || district, saleType: saleType || undefined });
        setItems(r.items); setDemo(r.demo);
      } catch {
        setItems([]); setDemo(false);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, category, subcategory, saleType, district, tick, showAnalytics, routeCategory?.key, routeDistrict]);

  if (showAnalytics) return <AdminAnalytics onBack={() => setShowAnalytics(false)} />;
  if (productId) return <div className="min-h-screen bg-background text-foreground"><header className="border-b p-4"><Link href="/" className="text-2xl font-bold text-emerald-700">🌾 হাটবাজার</Link></header><main className="mx-auto max-w-4xl p-4">{!product ? <p className="py-12 text-center">পণ্য লোড হচ্ছে অথবা পণ্যটি আর উপলভ্য নেই।</p> : <article className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-2"><div className="grid min-h-64 place-items-center rounded-xl bg-emerald-50 text-7xl">{product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="h-full max-h-96 w-full rounded-xl object-cover" /> : "🧺"}</div><div><p className="text-sm text-muted-foreground">{labelOf(product.category)}{product.subcategory ? ` · ${product.subcategory}` : ""} · {product.district}</p><h1 className="my-2 text-2xl font-bold">{product.title}</h1><p className="text-2xl font-bold text-emerald-700">{money(product.price)} / {unitLabel(product.unit)}</p><p className="my-3 whitespace-pre-wrap">{product.description}</p><p>বিক্রেতা: {product.businessName || product.sellerName} {product.sellerVerified && <span className="font-semibold text-emerald-700">· ✓ যাচাইকৃত</span>}</p><p>মজুদ: {bn(product.quantity)} {unitLabel(product.unit)}</p><p>বিক্রির ধরন: {product.saleType === "wholesale" ? "পাইকারি" : product.saleType === "retail" ? "খুচরা" : "খুচরা ও পাইকারি"}</p><p>সর্বনিম্ন অর্ডার: {bn(product.minOrderQuantity || 1)} {unitLabel(product.unit)}</p><button onClick={() => setOrdering(product)} className="mt-4 w-full rounded-lg bg-amber-400 py-3 font-bold text-emerald-950">অর্ডার করুন</button></div></article>}</main>{ordering && <OrderDialog item={ordering} onClose={() => setOrdering(null)} onDone={m => { setToast(m); setTimeout(() => setToast(""), 3500); }} />}{toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-background">{toast}</div>}</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">🌾 হাটবাজার</Link>
          <div className="flex items-center gap-2">
            <a href="/api/login" className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">লগইন</a>
            <a href="/api/account" className="hidden rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex">আমার অ্যাকাউন্ট</a>
            <button onClick={() => setPosting(true)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
              <Plus size={18} /> বিজ্ঞাপন দিন
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-emerald-700 to-emerald-950 py-10 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">{routeCategory ? `${routeCategory.label} — খুচরা ও পাইকারি বাজার` : routeDistrict ? `${routeDistrict} জেলার অনলাইন হাটবাজার` : "বাংলাদেশের কেনাবেচা, এখন হাটবাজারে"}</h1>
          <p className="mb-5 mt-2 opacity-90">খুচরা ও পাইকারি পণ্য খুঁজুন, বিক্রি করুন এবং সরাসরি বিক্রেতার সঙ্গে যোগাযোগ করুন।</p>
          <p className="mb-3 max-w-3xl text-sm opacity-90">{routeCategory ? `${routeCategory.label} বিভাগে পণ্য, খুচরা দাম এবং পাইকারি সরবরাহকারী খুঁজুন।` : "সারা বাংলাদেশে পণ্য কিনুন বা বিক্রি করুন—খুচরা ও পাইকারি, দুই ধরনের ক্রেতার জন্যই।"}</p>
          <div className="grid max-w-3xl gap-2 rounded-2xl bg-card p-2 text-foreground md:grid-cols-[1fr_190px]">
            <label className="flex items-center gap-2 px-3">
              <Search size={18} className="text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="কী খুঁজছেন? মোবাইল, পোশাক, ধান…" className="w-full bg-transparent py-2 outline-none" />
            </label>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className="rounded-lg border bg-background px-3 py-2">
              <option value="">সারা বাংলাদেশ</option>
              {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[{ key: "", label: "সব", emoji: "🧺" }, ...CATEGORIES].map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setSubcategory(""); setLocation(c.key ? `/category/${CATEGORIES.find(x => x.key === c.key)?.slug}` : "/"); }}
              className={`shrink-0 rounded-full border px-4 py-1.5 ${(category === c.key || routeCategory?.key === c.key) ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {routeCategory && <div className="mb-3 flex flex-wrap gap-2">{routeCategory.subcategories.map(sub => <button key={sub} onClick={() => setSubcategory(subcategory === sub ? "" : sub)} className={`rounded-full border px-3 py-1 text-sm ${subcategory === sub ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>{sub}</button>)}</div>}
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">বিক্রির ধরন:</span>{[{v:"",l:"সব"},{v:"retail",l:"খুচরা"},{v:"wholesale",l:"পাইকারি"},{v:"both",l:"দুই ধরনের"}].map(o => <button key={o.v} onClick={() => setSaleType(o.v)} className={`rounded-full border px-3 py-1 text-sm ${saleType === o.v ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>{o.l}</button>)}</div>
        <h2 className="my-4 text-xl font-bold">{routeCategory?.label || (category ? CATEGORIES.find((c) => c.key === category)?.label : "সব বিজ্ঞাপন")} ({bn(items.length)})</h2>
        {demo && <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">API থেকে ডেটা আসেনি, তাই নমুনা বিজ্ঞাপন দেখানো হচ্ছে।</p>}
        {loading ? <p className="py-10 text-center text-muted-foreground">লোড হচ্ছে…</p>
          : items.length === 0 ? <p className="py-10 text-center text-muted-foreground">কোনো বিজ্ঞাপন পাওয়া যায়নি।</p>
          : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{items.filter(i => (!subcategory || i.subcategory === subcategory) && (!saleType || (i.saleType || "both") === saleType || i.saleType === "both")).map((i) => <ListingCard key={i.id} item={i} onOrder={setOrdering} />)}</div>}

        <h2 className="mb-3 mt-10 text-xl font-bold">জনপ্রিয় ক্যাটাগরি</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{CATEGORIES.map(c => <Link key={c.key} href={`/category/${c.slug}`} className="rounded-xl border bg-card p-3 hover:border-emerald-600"><div className="text-2xl">{c.emoji}</div><div className="mt-1 font-semibold">{c.label}</div><div className="mt-1 text-xs text-muted-foreground">{c.subcategories.slice(0,3).join(" · ")}</div></Link>)}</div>
        <section className="mt-10 max-w-md rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-xl font-bold">জেলা অনুযায়ী কেনাকাটা</h2>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border bg-background px-4 py-3 font-semibold hover:border-emerald-600">
              <span className="flex items-center gap-2"><MapPin size={18} className="text-emerald-700" /> জেলা নির্বাচন করুন</span>
              <ChevronDown size={18} className="transition group-open:rotate-180" />
            </summary>
            <div className="mt-2 max-h-60 overflow-y-auto overscroll-contain rounded-xl border bg-background p-1" role="listbox" aria-label="জেলা অনুযায়ী কেনাকাটা">
              {DISTRICTS.map(d => <Link key={d} href={`/district/${slugifyBn(d)}`} className="flex min-h-11 items-center border-b px-3 py-2 last:border-0 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950">{d}<span className="ml-auto text-xs text-muted-foreground">পণ্য দেখুন →</span></Link>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">তালিকায় একসঙ্গে প্রায় ৫টি জেলা দেখুন; স্ক্রল করে বাকি জেলা বেছে নিন।</p>
          </details>
        </section>
        <h2 className="mb-3 mt-10 text-xl font-bold">কেন হাটবাজার?</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((w) => (
            <div key={w.title} className="rounded-2xl border bg-card p-4">
              <w.icon className="mb-2 text-emerald-600" />
              <h3 className="font-semibold">{w.title}</h3>
              <p className="text-sm text-muted-foreground">{w.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-10 border-t bg-card py-6 text-center text-sm text-muted-foreground">© ২০২৬ হাটবাজার · বাংলাদেশের অনলাইন কেনাবেচার বাজার<br/><nav className="mt-2 flex flex-wrap justify-center gap-3"><a href="/about" className="underline">আমাদের সম্পর্কে</a><a href="/contact" className="underline">যোগাযোগ</a><a href="/terms" className="underline">শর্তাবলি</a><a href="/privacy" className="underline">গোপনীয়তা</a><a href="/refund-policy" className="underline">রিফান্ড</a><a href="/delivery-policy" className="underline">ডেলিভারি</a></nav></footer>
      {ordering && (
        <OrderDialog item={ordering} onClose={() => setOrdering(null)}
          onDone={(m) => { setToast(m); setTimeout(() => setToast(""), 3500); }} />
      )}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-background">{toast}</div>}
      {posting && <PostAdDialog onClose={() => setPosting(false)} onDone={() => setTick((t) => t + 1)} />}
    </div>
  );
}
