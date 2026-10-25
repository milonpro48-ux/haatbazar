import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, Leaf, Truck, BadgeCheck, Store, ChevronDown, MapPin, ArrowLeft } from "lucide-react";
import { fetchListings, fetchListingById, getSampleListings, type Listing } from "@/lib/api";
import { CATEGORIES, DISTRICTS, bn, money, labelOf, unitLabel } from "@/lib/data";
import { DISTRICT_SLUGS, productSeo } from "@/lib/seo";
import { ListingCard } from "@/components/ListingCard";
import { AdminAnalytics } from "@/pages/AdminAnalytics";
import AdminPanel from "@/pages/AdminPanel";
import MyOrders from "@/pages/MyOrders";
import { initializeAnalytics, trackEvent } from "@/lib/analytics";
import { PostAdDialog } from "@/components/PostAdDialog";
import { OrderDialog } from "@/components/OrderDialog";
import { AuthDialog, readDemoSession } from "@/components/AuthDialog";
import UserDashboard from "@/pages/UserDashboard";

const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");

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
  const [demoUser, setDemoUser] = useState<{ name: string; email: string } | null>(() => readDemoSession());
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);

  useEffect(() => { initializeAnalytics(); }, []);
  useEffect(() => {
    if (!productId) { setProduct(null); return; }
    let active = true;
    fetchListingById(productId).then(item => {
      const found = item || getSampleListings().find(sample => String(sample.id) === String(productId)) || null;
      if (active) { setProduct(found); if (found) trackEvent("listing_view", { listingId: found.id, category: found.category }); }
    }).catch(() => {
      const sample = getSampleListings().find(entry => String(entry.id) === String(productId)) || null;
      if (active) setProduct(sample);
    });
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

  const useSampleListings = !loading && items.length === 0 && !search.trim() && !district && !routeDistrict;
  const displayItems = items.length ? items : useSampleListings
    ? getSampleListings().filter(i =>
        (!routeCategory?.key && !category || i.category === (routeCategory?.key || category)) &&
        (!subcategory || i.subcategory === subcategory) &&
        (!saleType || i.saleType === saleType || i.saleType === "both"))
    : [];

  if (path === "/dashboard") return demoUser
    ? <UserDashboard user={demoUser} onBack={() => setLocation("/")} onLogout={() => { localStorage.removeItem("haatbazar_demo_session_v1"); setDemoUser(null); setLocation("/"); }} />
    : <div className="min-h-screen grid place-items-center p-6"><div className="max-w-md rounded-2xl border bg-card p-6 text-center"><h1 className="text-xl font-bold">ড্যাশবোর্ড দেখতে লগইন করুন</h1><p className="mt-2 text-sm text-muted-foreground">আপনার ডেমো অ্যাকাউন্টে প্রবেশ করলে ড্যাশবোর্ড খুলবে।</p><button onClick={() => setAuthMode("login")} className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">লগইন করুন</button><button onClick={() => setLocation("/")} className="ml-2 mt-4 rounded-lg border px-4 py-2 font-semibold">হোমপেজ</button>{authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSuccess={(user) => { setDemoUser(user); setAuthMode(null); setLocation("/dashboard"); }} />}</div></div>;
  if (path === "/my-orders") return <MyOrders onBack={() => setLocation("/")} />;
  if (path === "/admin") return <AdminPanel onBack={() => setLocation("/")} />;
  if (path === "/admin/analytics") return <AdminAnalytics onBack={() => setLocation("/admin")} />;
  if (showAnalytics) return <AdminAnalytics onBack={() => setShowAnalytics(false)} />;
  if (productId) return <div className="min-h-screen bg-background text-foreground"><header className="border-b bg-card/95 p-4 shadow-sm"><div className="mx-auto flex max-w-6xl items-center gap-3"><Link href="/" aria-label="ফিরে যান" title="ফিরে যান" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-100"><ArrowLeft size={22} strokeWidth={2.5} /></Link><Link href="/" aria-label="Haat Bazar homepage" className="inline-flex items-center gap-3 text-2xl font-extrabold tracking-tight text-emerald-800 dark:text-emerald-300"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white shadow-sm"><Store size={24} strokeWidth={2.4} /></span><span className="leading-tight">Haat <span className="text-orange-600">Bazar</span><small className="mt-0.5 block text-[10px] font-semibold tracking-wide text-muted-foreground">বাংলার অনলাইন বাজার</small></span></Link></div></header><main className="mx-auto max-w-4xl p-4">{!product ? <p className="py-12 text-center">পণ্য লোড হচ্ছে অথবা পণ্যটি আর উপলভ্য নেই।</p> : <article className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-2"><div className="grid min-h-64 place-items-center rounded-xl bg-emerald-50 text-7xl">{product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="h-full max-h-96 w-full rounded-xl object-cover" /> : "🧺"}</div><div><p className="text-sm text-muted-foreground">{labelOf(product.category)}{product.subcategory ? ` · ${product.subcategory}` : ""} · {product.district}</p><h1 className="my-2 text-2xl font-bold">{product.title}</h1><p className="text-2xl font-bold text-emerald-700">{money(product.price)}</p><p className="my-3 whitespace-pre-wrap">{product.description}</p><p>বিক্রেতা: {product.businessName || product.sellerName} {product.sellerVerified && <span className="font-semibold text-emerald-700">· ✓ যাচাইকৃত</span>}</p><p>মজুদ: {bn(product.quantity)} {unitLabel(product.unit)}</p><p>বিক্রির ধরন: {product.saleType === "wholesale" ? "পাইকারি" : product.saleType === "retail" ? "খুচরা" : "খুচরা ও পাইকারি"}</p><p>সর্বনিম্ন অর্ডার: {bn(product.minOrderQuantity || 1)} {unitLabel(product.unit)}</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={() => setOrdering(product)} className="rounded-lg bg-amber-400 py-3 font-bold text-emerald-950">অর্ডার করুন</button>{whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`হ্যালো, আমি ${product.title} পণ্যটি সম্পর্কে জানতে চাই।`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-3 font-bold text-white"><span aria-hidden="true">☏</span> WhatsApp-এ যোগাযোগ</a>}</div></div></article>}</main><footer className="mt-10 border-t border-slate-200 bg-slate-100 text-slate-800"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4"><section><h2 className="mb-3 font-semibold text-emerald-800">ক্রেতা সহায়তা</h2><nav className="flex flex-col items-start gap-2 text-sm"><a href="/contact">সহায়তা কেন্দ্র</a><a href="/about">কীভাবে কিনবেন</a><a href="/refund-policy">রিফান্ড ও ফেরত নীতি</a><a href="/delivery-policy">ডেলিভারি তথ্য</a><a href="/terms">শর্তাবলি</a></nav></section><section><h2 className="mb-3 font-semibold text-emerald-800">হাটবাজার</h2><nav className="flex flex-col items-start gap-2 text-sm"><a href="/about">আমাদের সম্পর্কে</a><a href="/contact">যোগাযোগ করুন</a><a href="/privacy">গোপনীয়তা নীতি</a><a href="/terms">ব্যবহারের শর্ত</a><a href="/#popular">জনপ্রিয় ক্যাটাগরি</a></nav></section><section><h2 className="mb-3 font-semibold text-emerald-800">বিক্রেতা কর্নার</h2><nav className="flex flex-col items-start gap-2 text-sm"><a href="/#products">পণ্য দেখুন</a><a href="/contact">বিক্রেতার সহায়তা</a></nav><p className="mt-4 text-sm">সারা বাংলাদেশের ক্রেতা ও বিক্রেতাদের অনলাইন বাজার।</p></section><section><h2 className="mb-3 font-semibold text-emerald-800">যোগাযোগ ও তথ্য</h2><p className="text-sm">প্রশ্ন বা সহায়তার জন্য আমাদের সঙ্গে যোগাযোগ করুন।</p><a href="/contact" className="mt-3 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">যোগাযোগ করুন</a></section></div><div className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© ২০২৬ হাটবাজার · বাংলাদেশের অনলাইন কেনাবেচার বাজার</span><nav className="flex flex-wrap gap-4"><a href="/terms">শর্তাবলি</a><a href="/privacy">গোপনীয়তা</a><a href="/refund-policy">রিফান্ড নীতি</a><a href="/delivery-policy">ডেলিভারি নীতি</a></nav></div></div></footer>{ordering && <OrderDialog item={ordering} onClose={() => setOrdering(null)} onDone={m => { setToast(m); setTimeout(() => setToast(""), 3500); }} />}{toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-background">{toast}</div>}</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b-4 border-orange-500 bg-card/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" aria-label="Haat Bazar homepage" className="flex shrink-0 items-center gap-3 text-xl font-extrabold tracking-tight text-emerald-800 transition hover:opacity-90 sm:text-2xl dark:text-emerald-300"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white shadow-sm ring-2 ring-orange-100"><Store size={24} strokeWidth={2.4} /></span><span className="leading-tight">Haat <span className="text-orange-600">Bazar</span><small className="mt-0.5 block text-[10px] font-semibold tracking-wide text-muted-foreground">বাংলার অনলাইন বাজার</small></span></Link>
          <div className="flex items-center gap-2">
            {demoUser ? (
              <>
                <span className="hidden max-w-32 truncate text-sm font-semibold sm:inline">স্বাগতম, {demoUser.name}</span>
                <Link href="/dashboard" className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">ড্যাশবোর্ড</Link>
                <button type="button" onClick={() => { localStorage.removeItem("haatbazar_demo_session_v1"); setDemoUser(null); setToast("ডেমো অ্যাকাউন্ট থেকে লগআউট হয়েছে।"); }} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">লগআউট</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setAuthMode("login")} className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">লগইন</button>
                <button type="button" onClick={() => setAuthMode("register")} className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600">সাইন আপ</button>
              </>
            )}
            <a href="/my-orders" className="hidden rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex">আমার অর্ডার</a>
            <button onClick={() => setPosting(true)} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700">
              <Plus size={18} /> বিজ্ঞাপন দিন
            </button>
          </div>
        </div>
      </header>

      <div className="bg-orange-500 px-4 py-1.5 text-center text-xs font-semibold text-white">🇧🇩 সারা বাংলাদেশে কেনাবেচা · Help & Support · Become a Seller</div>
      <div className="px-4 py-1 text-center text-xs font-semibold">MSA</div>
      <nav className="bg-emerald-900 text-white"><div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 py-3 text-sm font-semibold"><Link href="/" className="shrink-0">☰ সব ক্যাটাগরি</Link><a href="#products" className="shrink-0">আজকের পণ্য</a><a href="#popular" className="shrink-0">জনপ্রিয় ক্যাটাগরি</a><a href="#why" className="shrink-0">কেন হাটবাজার</a></div></nav>
      <div className="px-4 py-1 text-center text-xs font-semibold">MSA</div>
      <section className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 py-10 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
          <h1 className="max-w-5xl text-3xl font-extrabold leading-tight md:text-4xl">{routeCategory ? `${routeCategory.label} — খুচরা ও পাইকারি বাজার` : routeDistrict ? `${routeDistrict} জেলার অনলাইন হাটবাজার` : "বাংলাদেশের কেনাবেচা, এখন হাটবাজারে"}</h1>
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
          <div className="relative mx-auto mt-8 grid aspect-square w-full max-w-[400px] place-items-center lg:mt-0" aria-label="আপনার এলাকার হাট, কেনা-বেচা সহজ, সারা বাংলাদেশ">
            <div className="absolute inset-[4%] rounded-full border border-amber-300/30" />
            <div className="absolute inset-[11%] rounded-full border border-amber-300/20" />
            <div className="absolute inset-[18%] rounded-full border border-amber-300/20" />
            <div className="absolute inset-[24%] rounded-full bg-emerald-700/50" />
            <div className="relative grid h-[48%] w-[48%] place-items-center rounded-full bg-amber-400/90 text-emerald-950 shadow-[0_0_0_12px_rgba(234,179,8,0.08)]">
              <Store size={66} strokeWidth={1.5} />
            </div>
            <span className="absolute left-1/2 top-[5%] -translate-x-1/2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-emerald-950 shadow-md">আপনার এলাকার হাট</span>
            <span className="absolute bottom-[12%] right-0 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-emerald-950 shadow-md">কেনা-বেচা সহজ</span>
            <span className="absolute bottom-[12%] left-0 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-emerald-950 shadow-md">সারা বাংলাদেশ</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="flex gap-2 overflow-x-auto border-b pb-3">
          {[{ key: "", label: "সব", emoji: "🧺" }, ...CATEGORIES].map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setSubcategory(""); setLocation(c.key ? `/category/${CATEGORIES.find(x => x.key === c.key)?.slug}` : "/"); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${(category === c.key || routeCategory?.key === c.key) ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "bg-card hover:border-orange-400"}` }>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {routeCategory && <div className="mb-3 flex flex-wrap gap-2">{routeCategory.subcategories.map(sub => <button key={sub} onClick={() => setSubcategory(subcategory === sub ? "" : sub)} className={`rounded-full border px-3 py-1 text-sm ${subcategory === sub ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>{sub}</button>)}</div>}
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">বিক্রির ধরন:</span>{[{v:"",l:"সব"},{v:"retail",l:"খুচরা"},{v:"wholesale",l:"পাইকারি"},{v:"both",l:"দুই ধরনের"}].map(o => <button key={o.v} onClick={() => setSaleType(o.v)} className={`rounded-full border px-3 py-1 text-sm ${saleType === o.v ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>{o.l}</button>)}</div>
        <div id="products" className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">HaatBazar Marketplace</p><h2 className="my-1 text-xl font-extrabold md:text-2xl">{routeCategory?.label || (category ? CATEGORIES.find((c) => c.key === category)?.label : "সব পণ্য ও বিজ্ঞাপন")} <span className="text-emerald-700">({bn(displayItems.length)})</span></h2></div><span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 sm:inline-flex">খুচরা ও পাইকারি</span></div>
        {(demo || useSampleListings) && <p className="mb-3 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">🧪 ডেমো প্রিভিউ: নিচের পণ্যগুলো শুধু ডিজাইন দেখানোর নমুনা, বাস্তব বিক্রেতার বিজ্ঞাপন নয়। ডাটাবেসে পণ্য যোগ হলে লাইভ পণ্য দেখাবে।</p>}
        {loading ? <p className="py-10 text-center text-muted-foreground">লোড হচ্ছে…</p>
          : displayItems.length === 0 ? <p className="py-10 text-center text-muted-foreground">কোনো পণ্য পাওয়া যায়নি। অন্য ক্যাটাগরি বা সার্চ দিয়ে দেখুন।</p>
          : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{displayItems.filter(i => (!subcategory || i.subcategory === subcategory) && (!saleType || (i.saleType || "both") === saleType || i.saleType === "both")).map((i) => <ListingCard key={i.id} item={i} onOrder={setOrdering} />)}</div>}

        <h2 id="popular" className="mb-3 mt-10 border-l-4 border-orange-500 pl-3 text-xl font-extrabold">জনপ্রিয় ক্যাটাগরি</h2>
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
        <h2 id="why" className="mb-3 mt-10 border-l-4 border-orange-500 pl-3 text-xl font-extrabold">কেন হাটবাজার?</h2>
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

      <footer className="mt-10 border-t border-slate-200 bg-slate-100 text-slate-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">ক্রেতা সহায়তা</h3>
            <nav className="flex flex-col items-start gap-2 text-sm">
              <a href="/contact" className="hover:text-orange-600">সহায়তা কেন্দ্র</a>
              <a href="/about" className="hover:text-orange-600">কীভাবে কিনবেন</a>
              <a href="/refund-policy" className="hover:text-orange-600">রিফান্ড ও ফেরত নীতি</a>
              <a href="/delivery-policy" className="hover:text-orange-600">ডেলিভারি তথ্য</a>
              <a href="/terms" className="hover:text-orange-600">শর্তাবলি</a>
            </nav>
          </section>
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">হাটবাজার</h3>
            <nav className="flex flex-col items-start gap-2 text-sm">
              <a href="/about" className="hover:text-orange-600">আমাদের সম্পর্কে</a>
              <a href="/contact" className="hover:text-orange-600">যোগাযোগ করুন</a>
              <a href="/privacy" className="hover:text-orange-600">গোপনীয়তা নীতি</a>
              <a href="/terms" className="hover:text-orange-600">ব্যবহারের শর্ত</a>
              <a href="/#popular" className="hover:text-orange-600">জনপ্রিয় ক্যাটাগরি</a>
            </nav>
          </section>
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">বিক্রেতা কর্নার</h3>
            <nav className="flex flex-col items-start gap-2 text-sm">
              <a href="/#products" className="hover:text-orange-600">পণ্য দেখুন</a>
              <button type="button" onClick={() => setPosting(true)} className="hover:text-orange-600">পণ্য বিক্রির বিজ্ঞাপন দিন</button>
              <a href="/contact" className="hover:text-orange-600">বিক্রেতার সহায়তা</a>
            </nav>
            <div className="mt-5 rounded-xl border border-emerald-100 bg-white p-3">
              <p className="font-semibold text-emerald-800">হাটবাজারে কেনাকাটা করুন</p>
              <p className="mt-1 text-xs text-slate-500">সারা বাংলাদেশের ক্রেতা ও বিক্রেতাদের জন্য অনলাইন বাজার</p>
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">যোগাযোগ ও তথ্য</h3>
            <p className="text-sm">প্রশ্ন বা সহায়তার জন্য যোগাযোগ পেজে যান।</p>
            <a href="/contact" className="mt-3 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">যোগাযোগ করুন</a>
          </section>
        </div>
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">পেমেন্ট ও অর্ডার</p>
              <p className="mt-1 text-sm text-slate-500">অর্ডার দেওয়ার আগে বিক্রেতার সঙ্গে পণ্যের দাম ও ডেলিভারি নিশ্চিত করুন।</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded border bg-slate-50 px-3 py-2">সরাসরি বিক্রেতার সঙ্গে যোগাযোগ</span>
              <span className="rounded border bg-slate-50 px-3 py-2">খুচরা ও পাইকারি</span>
              <span className="rounded border bg-slate-50 px-3 py-2">বাংলাদেশজুড়ে</span>
            </div>
          </div>
          <div className="border-t border-slate-200">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>© ২০২৬ হাটবাজার · বাংলাদেশের অনলাইন কেনাবেচার বাজার</span>
              <nav className="flex flex-wrap gap-x-4 gap-y-2"><a href="/terms" className="hover:text-emerald-700">শর্তাবলি</a><a href="/privacy" className="hover:text-emerald-700">গোপনীয়তা</a><a href="/refund-policy" className="hover:text-emerald-700">রিফান্ড নীতি</a></nav>
            </div>
          </div>
        </div>
      </footer>
      {ordering && (
        <OrderDialog item={ordering} onClose={() => setOrdering(null)}
          onDone={(m) => { setToast(m); setTimeout(() => setToast(""), 3500); }} />
      )}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-background">{toast}</div>}
      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onSuccess={(user) => { setDemoUser(user); setAuthMode(null); setLocation("/dashboard"); setToast("ডেমো " + (authMode === "register" ? "রেজিস্ট্রেশন" : "লগইন") + " সফল হয়েছে।"); setTimeout(() => setToast(""), 3500); }} />}
      {posting && <PostAdDialog onClose={() => setPosting(false)} onDone={() => setTick((t) => t + 1)} />}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("হ্যালো HaatBazar, আমি সহায়তা চাই।")}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp-এ HaatBazar support-এর সঙ্গে যোগাযোগ করুন"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 font-semibold text-white shadow-lg transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2"
        >
          <span aria-hidden="true" className="text-xl">☏</span>
          <span>WhatsApp সহায়তা</span>
        </a>
      )}
    </div>
  );
}
