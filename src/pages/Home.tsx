import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Plus, Leaf, Truck, BadgeCheck, Store, ChevronDown, MapPin, ArrowLeft } from "lucide-react";
import { fetchListings, fetchListingById, getSampleListings, type Listing } from "@/lib/api";
import { CATEGORIES, DISTRICTS, bn, money, labelOf, unitLabel } from "@/lib/data";
import { DISTRICT_SLUGS, productSeo } from "@/lib/seo";
import { ListingCard } from "@/components/ListingCard";
import { AdminAnalytics } from "@/pages/AdminAnalytics";
import AdminPanel from "@/pages/AdminPanel";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import SuperAdminProfile from "@/pages/SuperAdminProfile";
import SuperAdminLogin from "@/pages/SuperAdminLogin";
import MyOrders from "@/pages/MyOrders";
import CustomerProfile from "@/pages/CustomerProfile";
import { initializeAnalytics, trackEvent } from "@/lib/analytics";
import { PostAdDialog } from "@/components/PostAdDialog";
import { OrderDialog } from "@/components/OrderDialog";
import { AuthDialog, readDemoSession, type DemoUser } from "@/components/AuthDialog";
import { getSiteSettings, type SiteSettings } from "@/lib/siteSettings";

const whatsappNumber = (import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D/g, "");

const whyIcons = { store: Store, leaf: Leaf, "badge-check": BadgeCheck, truck: Truck } as const;
function footerHref(href: string) {
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://") ? href : "/contact";
}

function slugifyBn(value: string) { return DISTRICT_SLUGS[value] || value.toLowerCase().replace(/\s+/g, "-"); }


function AdminDemoDashboard({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState("dashboard");
  const [period, setPeriod] = useState("এই মাস");
  const [vendors, setVendors] = useState([
    { id: 1, shop: "আরন্যাক এগ্রো", category: "কৃষি ও খাদ্য", status: "Pending" },
    { id: 2, shop: "ফ্যাশন পয়েন্ট", category: "পোশাক", status: "Pending" },
    { id: 3, shop: "টেক জোন", category: "ইলেকট্রনিক্স", status: "Pending" },
    { id: 4, shop: "গ্রিন ফার্ম", category: "কৃষি ও খাদ্য", status: "Pending" },
  ]);
  const menu = [
    { id: "dashboard", icon: "▦", label: "ড্যাশবোর্ড" },
    { id: "vendors", icon: "♧", label: "ভেন্ডার অনুমোদন", count: vendors.filter(v => v.status === "Pending").length },
    { id: "users", icon: "♙", label: "গ্রাহক ও ব্যবহারকারী" },
    { id: "orders", icon: "🛒", label: "অর্ডার ও লেনদেন" },
    { id: "reports", icon: "⌁", label: "রিপোর্ট ও বিশ্লেষণ" },
    { id: "settings", icon: "⚙", label: "সিস্টেম সেটিংস" },
    { id: "help", icon: "?", label: "সাহায্য" },
  ];
  const orders = [
    { id: "00047234", customer: "রাহিম উদ্দিন", amount: "৳ ২,৯০০", status: "ডেলিভারি সম্পন্ন", color: "bg-emerald-600" },
    { id: "00047145", customer: "ফারহানা সুলতানা", amount: "৳ ১,৮৫০", status: "প্রসেসিং", color: "bg-blue-600" },
    { id: "00047122", customer: "মোঃ আলমগীর", amount: "৳ ৪,২০০", status: "প্যাকিং চলছে", color: "bg-amber-500" },
    { id: "00047098", customer: "সাবিনা ইয়াসমিন", amount: "৳ ১,২০০", status: "অর্ডার নিশ্চিত", color: "bg-violet-600" },
    { id: "00047057", customer: "শফিকুল ইসলাম", amount: "৳ ৩,৭৫০", status: "বাতিল", color: "bg-rose-600" },
  ];
  const sectionTitle = menu.find(m => m.id === active)?.label || "ড্যাশবোর্ড";
  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <div className="flex min-h-screen">
      <aside className="flex w-[245px] shrink-0 flex-col bg-gradient-to-b from-emerald-950 to-slate-950 px-3 py-5 text-white max-md:w-[76px] max-md:px-2">
        <button onClick={onBack} className="mb-8 flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/10" title="মার্কেটপ্লেসে ফিরুন"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500 text-2xl">🛍</span><span className="max-md:hidden"><b className="text-xl">Haat<span className="text-orange-400">Bazar</span></b><small className="block text-xs text-emerald-100">(হাটবাজার)</small></span></button>
        <nav className="grid gap-2">{menu.map(item => <button key={item.id} onClick={() => setActive(item.id)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left transition ${active === item.id ? "bg-emerald-700 font-bold shadow" : "text-emerald-50 hover:bg-white/10"}`}><span className="w-6 text-center text-xl">{item.icon}</span><span className="flex-1 max-md:hidden">{item.label}</span>{item.count ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs max-md:hidden">{item.count}</span> : null}</button>)}</nav>
        <div className="mt-auto border-t border-white/15 pt-4"><div className="flex items-center gap-3 px-2 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-700 text-xl">👤</span><span className="max-md:hidden"><b>Admin</b><small className="block text-emerald-200">ডেমো সুপার অ্যাডমিন</small></span></div><button onClick={onBack} className="mt-2 w-full rounded-lg px-3 py-3 text-left text-sm hover:bg-white/10">⇥ <span className="max-md:hidden">মার্কেটপ্লেসে ফিরুন</span></button></div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 flex-1 items-center gap-3"><span className="text-xl text-slate-400">⌕</span><input aria-label="ডেমো সার্চ" placeholder="পণ্য, ক্যাটাগরি, দোকান বা অর্ডার খুঁজুন..." className="w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-600" /></div>
          <div className="flex items-center gap-3 text-sm"><button className="rounded-lg p-2 hover:bg-slate-100" aria-label="নোটিফিকেশন">♧</button><button className="rounded-lg p-2 hover:bg-slate-100" aria-label="বার্তা">▤</button><span className="hidden text-slate-500 sm:inline">EN / বাংলা</span><span className="rounded-full bg-emerald-100 px-3 py-2 font-bold text-emerald-900">Admin⌄</span></div>
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{active !== "dashboard" ? <button type="button" onClick={() => setActive("dashboard")} aria-label="অ্যাডমিন ড্যাশবোর্ডে ফিরে যান" title="ড্যাশবোর্ডে ফিরে যান" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl text-slate-800 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">←</button> : <button type="button" onClick={onBack} aria-label="মার্কেটপ্লেসে ফিরে যান" title="মার্কেটপ্লেসে ফিরে যান" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl text-slate-800 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">←</button>}<div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">HAATBAZAR / ADMIN WORKSPACE</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{active === "dashboard" ? "স্বাগতম, অ্যাডমিন" : sectionTitle}</h1></div></div><select aria-label="তারিখের পরিসর" value={period} onChange={e => setPeriod(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option>আজ</option><option>এই সপ্তাহ</option><option>এই মাস</option><option>এই বছর</option></select></div>
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span className="text-lg">ⓘ</span><p><b>ডেমো প্রিভিউ:</b> নিচের পরিসংখ্যান ও অর্ডার উদাহরণমাত্র; বাস্তব বিক্রি বা সার্ভার ডেটা নয়। ভেন্ডার অনুমোদন এখানে শুধু এই স্ক্রিনে পরিবর্তিত হয়।</p></div>
          {active === "dashboard" && <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[{label:"মোট বিক্রি",value:"৳ ৩,৪৫,৬০০",change:"+12.4%",icon:"৳",tone:"bg-emerald-100 text-emerald-800"},{label:"নতুন ভেন্ডার আবেদন",value:`${vendors.filter(v=>v.status==="Pending").length} জন`,change:"Pending",icon:"◷",tone:"bg-orange-100 text-orange-800"},{label:"মোট অর্ডার",value:"১,৪৫০",change:"+8.2%",icon:"♧",tone:"bg-blue-100 text-blue-800"},{label:"সক্রিয় পণ্য/ক্যাটাগরি",value:"৮,৯২০",change:"Demo",icon:"◇",tone:"bg-violet-100 text-violet-800"}].map(s=><article key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-600">{s.label}</span><span className={`grid h-10 w-10 place-items-center rounded-xl text-lg font-bold ${s.tone}`}>{s.icon}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-2xl">{s.value}</strong><span className={`rounded-full px-2 py-1 text-xs font-bold ${s.tone}`}>{s.change}</span></div></article>)}
            </section>
            <section className="mt-4 grid gap-4 2xl:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold">রাজস্ব ও বিক্রয়</h2><span className="rounded-lg border px-3 py-1.5 text-xs text-slate-600">{period} ⌄</span></div><div className="h-60 w-full"><svg viewBox="0 0 650 240" role="img" aria-label="ডেমো রাজস্ব চার্ট" className="h-full w-full"><defs><linearGradient id="adminChartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity=".35"/><stop offset="100%" stopColor="#10b981" stopOpacity=".02"/></linearGradient></defs>{[35,80,125,170,215].map(y=><g key={y}><line x1="42" x2="635" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4"/><text x="32" y={y+4} textAnchor="end" fill="#64748b" fontSize="11">{(240-y)*200}</text></g>)}<path d="M45 190 C85 175 100 95 145 120 S210 165 255 135 S310 60 355 75 S405 25 445 65 S500 125 535 100 S590 40 630 28 L630 215 L45 215 Z" fill="url(#adminChartFill)"/><path d="M45 190 C85 175 100 95 145 120 S210 165 255 135 S310 60 355 75 S405 25 445 65 S500 125 535 100 S590 40 630 28" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round"/>{["জানু","ফেব","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগ","সেপ্ট","অক্টো"].map((m,i)=><text key={m} x={45+i*64} y="235" textAnchor="middle" fill="#64748b" fontSize="11">{m}</text>)}</svg></div></div>
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b p-4"><h2 className="font-extrabold">ভেন্ডার অনুমোদন অনুরোধ</h2><button onClick={()=>setActive("vendors")} className="text-sm font-bold text-emerald-700">সব দেখুন →</button></div><div className="divide-y">{vendors.filter(v=>v.status==="Pending").slice(0,4).map(v=><div key={v.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="font-bold">{v.shop}</p><p className="text-xs text-slate-500">{v.category}</p></div><div className="flex gap-2"><button onClick={()=>setVendors(old=>old.map(x=>x.id===v.id?{...x,status:"Approved"}:x))} className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800">অনুমোদন</button><button onClick={()=>setVendors(old=>old.map(x=>x.id===v.id?{...x,status:"Rejected"}:x))} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">বাতিল</button></div></div>)}{vendors.every(v=>v.status!=="Pending")&&<p className="p-6 text-sm text-slate-500">কোনো pending আবেদন নেই।</p>}</div></div>
            </section>
            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b p-4"><h2 className="font-extrabold">সাম্প্রতিক অর্ডার</h2><button onClick={()=>setActive("orders")} className="text-sm font-bold text-emerald-700">সব দেখুন →</button></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["অর্ডার আইডি","গ্রাহক","পরিমাণ","অবস্থা"].map(x=><th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead><tbody className="divide-y">{orders.map(o=><tr key={o.id}><td className="px-4 py-3 font-semibold">#{o.id}</td><td className="px-4 py-3">{o.customer}</td><td className="px-4 py-3">{o.amount}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${o.color}`}>{o.status}</span></td></tr>)}</tbody></table></div></section>
          </>}
          {active === "vendors" && <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-4"><h2 className="font-bold">ভেন্ডার আবেদন ব্যবস্থাপনা</h2><p className="mt-1 text-sm text-slate-500">অনুমোদন/বাতিল শুধু এই ডেমো সেশনে প্রযোজ্য।</p></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50"><tr>{["দোকান","ক্যাটাগরি","স্ট্যাটাস","অ্যাকশন"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">{vendors.map(v=><tr key={v.id}><td className="px-4 py-3 font-semibold">{v.shop}</td><td className="px-4 py-3">{v.category}</td><td className="px-4 py-3">{v.status==="Pending"?"অপেক্ষমাণ":v.status==="Approved"?"অনুমোদিত":"বাতিল"}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={()=>setVendors(old=>old.map(x=>x.id===v.id?{...x,status:"Approved"}:x))} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">অনুমোদন</button><button onClick={()=>setVendors(old=>old.map(x=>x.id===v.id?{...x,status:"Rejected"}:x))} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700">বাতিল</button></div></td></tr>)}</tbody></table></div></section>}
          {active === "users" && <section className="grid gap-4 md:grid-cols-3">{[{label:"মোট গ্রাহক",value:"৬,৮৪০"},{label:"নিবন্ধিত বিক্রেতা",value:"১,২৮০"},{label:"যাচাই অপেক্ষমাণ",value:"১২"}].map(x=><article key={x.label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{x.label}</p><strong className="mt-2 block text-3xl">{x.value}</strong><p className="mt-2 text-xs text-amber-700">ডেমো উদাহরণ</p></article>)}</section>}
          {active === "orders" && <section className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50"><tr>{["অর্ডার আইডি","গ্রাহক","পরিমাণ","অবস্থা"].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody className="divide-y">{orders.map(o=><tr key={o.id}><td className="px-4 py-3">#{o.id}</td><td className="px-4 py-3">{o.customer}</td><td className="px-4 py-3">{o.amount}</td><td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${o.color}`}>{o.status}</span></td></tr>)}</tbody></table><p className="p-4 text-xs text-slate-500">এগুলো নমুনা অর্ডার; বাস্তব অর্ডার ডেটা নয়।</p></section>}
          {active === "reports" && <section className="grid gap-4 md:grid-cols-2">{[{label:"বিক্রির প্রবণতা",desc:"সময় অনুযায়ী মোট বিক্রির নমুনা চার্ট"},{label:"ক্যাটাগরি পারফরম্যান্স",desc:"কোন ক্যাটাগরিতে বেশি ভিউ/অর্ডার হচ্ছে—এই অংশে রিপোর্ট যুক্ত করা যাবে"},{label:"বিক্রেতা ও ক্রেতা",desc:"নতুন অ্যাকাউন্ট ও সক্রিয় ব্যবহারকারীর রিপোর্ট"},{label:"কনভার্সন",desc:"পণ্য ভিউ থেকে যোগাযোগ ও অর্ডারের হার"}].map(x=><article key={x.label} className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">{x.label}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{x.desc}</p><span className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">ডেমো / ডেটা সংযোগ প্রয়োজন</span></article>)}</section>}
          {active === "settings" && <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">সিস্টেম সেটিংস</h2><p className="mt-2 text-sm text-slate-600">ডেমোতে বাস্তব সাইট সেটিংস পরিবর্তন করা হয় না।</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="rounded-xl border p-4 text-sm">সাইটের নাম<input readOnly value="HaatBazar (হাটবাজার)" className="mt-2 w-full rounded-lg bg-slate-50 px-3 py-2"/></label><label className="rounded-xl border p-4 text-sm">পেমেন্ট মোড<input readOnly value="বন্ধ / টেস্ট মোড" className="mt-2 w-full rounded-lg bg-slate-50 px-3 py-2"/></label></div></section>}
          {active === "help" && <section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-bold">অ্যাডমিন সহায়তা</h2><p className="mt-2 text-sm leading-6 text-slate-600">এই প্রিভিউতে মেনু ও নমুনা অ্যাকশন পরীক্ষা করতে পারবেন। বাস্তব ব্যবহারকারী, অর্ডার, পেমেন্ট বা ভেন্ডার অনুমোদনের জন্য নিরাপদ সার্ভার-সাইড অ্যাডমিন অনুমতি এবং ডেটাবেস সংযোগ প্রয়োজন।</p><button onClick={()=>setActive("dashboard")} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">ড্যাশবোর্ডে ফিরুন</button></section>}
          <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><span>🛡 HaatBazar Admin Preview · নমুনা ডেটা</span><span>বাস্তব পেমেন্ট বন্ধ · ডেমো মোড</span></footer>
        </div>
      </main>
    </div>
  </div>;
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const routeQuery = location.includes("?") ? location.slice(location.indexOf("?") + 1) : "";
  const routedPath = new URLSearchParams(routeQuery).get("p");
  const path = (routedPath || location.split("?")[0]).split("?")[0];
  const [brandSettings, setBrandSettings] = useState<SiteSettings>(() => getSiteSettings());
  useEffect(() => { setBrandSettings(getSiteSettings()); }, [path]);
  const displayCategories = brandSettings.categories.filter(c => c.enabled).map(c => { const base = CATEGORIES.find(x => x.key === c.id || x.slug === c.slug); return base ? { ...base, label: c.label, emoji: c.emoji, slug: c.slug } : { key: c.id, slug: c.slug, label: c.label, emoji: c.emoji, subcategories: [] as string[], keywords: [] as string[] }; });
  const categorySlug = path.startsWith("/category/") ? path.split("/")[2] : "";
  const districtSlug = path.startsWith("/district/") ? path.split("/")[2] : "";
  const routeCategory = displayCategories.find(c => c.slug === categorySlug);
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
  const [demoUser, setDemoUser] = useState<DemoUser | null>(() => readDemoSession());
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);

  useEffect(() => { initializeAnalytics(); }, []);
  useEffect(() => { if (path === "/dashboard" && !demoUser) setAuthMode("login"); }, [path, demoUser]);
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
    document.title = `${brandSettings.siteName} | ${title}`;
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

  const customerProfileSummary = (() => { try { return JSON.parse(localStorage.getItem("haatbazar_customer_profile_v1") || "{}") as {name?: string; photo?: string}; } catch { return {}; } })();
  const dashboardDisplayName = customerProfileSummary.name?.trim() || demoUser?.name || "ব্যবহারকারী";
  const dashboardRole = demoUser?.role || "buyer";
  const dashboardDetails = {
    buyer: { title: "Customer Dashboard — গ্রাহক / ক্রেতা", subtitle: "নিজের কেনাকাটা, অর্ডার, পছন্দের পণ্য ও প্রোফাইল পরিচালনা করুন।", icon: "🛍️", actions: [{ href: "/my-orders", icon: "📦", title: "আমার অর্ডার", body: "অর্ডার পেজ খুলুন; বাস্তব ট্র্যাকিং ডেটাবেস সংযোগের পরে চালু হবে।", cta: "অর্ডার দেখুন" }, { href: "/", icon: "🔎", title: "পণ্য খুঁজুন", body: "খুচরা ও পাইকারি পণ্য ব্রাউজ করুন।", cta: "কেনাকাটা করুন" }], modules: [{icon:"🚚",title:"অর্ডার ট্র্যাকিং",detail:"অর্ডারের বর্তমান অবস্থা",status:"ডেটাবেস সংযোগ প্রয়োজন"},{icon:"♡",title:"উইশলিস্ট",detail:"পছন্দের পণ্য সংরক্ষণ",status:"পরবর্তী ধাপ"},{icon:"🧾",title:"পেমেন্ট হিস্ট্রি",detail:"অর্ডারভিত্তিক পেমেন্ট রেকর্ড",status:"পেমেন্ট বন্ধ"},{icon:"👤",title:"প্রোফাইল",detail:"নাম, যোগাযোগ ও ঠিকানা",status:"পরবর্তী ধাপ"}] },
    seller: { title: "Seller Dashboard — খুচরা বিক্রেতা", subtitle: "নিজের পণ্য, বিজ্ঞাপন, স্টক ও বিক্রির কাজ পরিচালনা করুন।", icon: "🏪", actions: [{ href: "/", icon: "➕", title: "পণ্য / বিজ্ঞাপন দিন", body: "হোমপেজ থেকে পণ্য যোগ করার ফর্ম খুলুন।", cta: "পণ্য যোগ করতে যান" }, { href: "/my-orders", icon: "📦", title: "অর্ডার পেজ", body: "ডেমো অর্ডার পেজ খুলুন; বিক্রেতাভিত্তিক অর্ডার ফিল্টার এখনও সংযুক্ত নয়।", cta: "অর্ডার পেজ" }], modules: [{icon:"🛍️",title:"পণ্য ম্যানেজমেন্ট",detail:"পণ্য যোগ, সম্পাদনা ও ছবি",status:"পণ্য ফর্ম উপলভ্য"},{icon:"📊",title:"সেলস রিপোর্ট",detail:"বিক্রি ও অর্ডারের সারাংশ",status:"লাইভ ডেটা প্রয়োজন"},{icon:"📦",title:"স্টক আপডেট",detail:"মজুদ ও পরিমাণ নিয়ন্ত্রণ",status:"পরবর্তী ধাপ"},{icon:"🧮",title:"ইনভেন্টরি",detail:"স্টক ও পণ্যের তালিকা",status:"পরবর্তী ধাপ"}] },
    wholesaler: { title: "Wholesaler Dashboard — পাইকারি বিক্রেতা", subtitle: "পাইকারি পণ্য, ন্যূনতম অর্ডার পরিমাণ ও ব্যবসায়িক ক্রেতাদের অর্ডার পরিচালনার জন্য।", icon: "📦", actions: [{ href: "/", icon: "🏷️", title: "পাইকারি পণ্য", body: "পণ্য যোগের সময় বিক্রির ধরন পাইকারি বা উভয় নির্বাচন করুন।", cta: "পণ্য পরিচালনা" }, { href: "/my-orders", icon: "🧾", title: "অর্ডার পেজ", body: "ডেমো অর্ডার পেজ খুলুন; পাইকারি অর্ডার আলাদা করে সংযুক্ত নয়।", cta: "অর্ডার দেখুন" }], modules: [{icon:"📦",title:"পাইকারি তালিকা",detail:"বাল্ক পণ্য ও ন্যূনতম অর্ডার",status:"পণ্য ফর্ম উপলভ্য"},{icon:"🏷️",title:"পরিমাণভিত্তিক দাম",detail:"পরিমাণ অনুযায়ী পাইকারি মূল্য",status:"পরবর্তী ধাপ"},{icon:"🧮",title:"স্টক ও ইনভেন্টরি",detail:"বড় পরিমাণের মজুদ",status:"পরবর্তী ধাপ"},{icon:"🧾",title:"ব্যবসায়িক অর্ডার",detail:"দোকানদারদের অর্ডার",status:"লাইভ ডেটা প্রয়োজন"}] },
    business: { title: "Business Buyer Dashboard — দোকানদার / ব্যবসায়িক ক্রেতা", subtitle: "দোকানের জন্য পণ্য খুঁজুন, পাইকারি বিকল্প তুলনা করুন এবং নিজের অর্ডার অনুসরণ করুন।", icon: "🏬", actions: [{ href: "/", icon: "📦", title: "পাইকারি পণ্য খুঁজুন", body: "ব্যবসার জন্য উপযুক্ত পণ্য ব্রাউজ করুন।", cta: "পণ্য দেখুন" }, { href: "/my-orders", icon: "🧾", title: "আমার অর্ডার", body: "ডেমো অর্ডার পেজ খুলুন; ব্যবসায়িক ক্রয়-রিপোর্ট এখনও সংযুক্ত নয়।", cta: "অর্ডার দেখুন" }], modules: [{icon:"🔎",title:"সরবরাহকারী খোঁজা",detail:"পণ্য ও বিক্রেতা তুলনা",status:"পণ্য ব্রাউজিং উপলভ্য"},{icon:"📦",title:"বাল্ক অর্ডার",detail:"বেশি পরিমাণে কেনাকাটা",status:"পরবর্তী ধাপ"},{icon:"🧾",title:"ক্রয় ইতিহাস",detail:"আগের অর্ডার ও পরিমাণ",status:"লাইভ ডেটা প্রয়োজন"},{icon:"🏬",title:"দোকানের প্রোফাইল",detail:"দোকানের নাম ও যোগাযোগ",status:"পরবর্তী ধাপ"}] }
  }[dashboardRole];

  if (path === "/dashboard" && demoUser) return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="মার্কেটপ্লেসে ফিরে যান" title="মার্কেটপ্লেসে ফিরে যান" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">←</Link>
            <Link href="/" className="text-xl font-extrabold tracking-tight text-white">{brandSettings.siteName}<span className="ml-2 text-xs font-medium text-emerald-300">হাটবাজার</span></Link>
          </div>
          <Link href="/profile" aria-label="আমার প্রোফাইল" className="group flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 shadow-lg shadow-black/10 transition hover:border-emerald-400/30 hover:bg-slate-900 sm:gap-3">{customerProfileSummary.photo ? <img src={customerProfileSummary.photo} alt="প্রোফাইল ছবি" className="h-10 w-10 shrink-0 rounded-full border-2 border-emerald-400/70 object-cover shadow-sm" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-sm font-bold text-emerald-200">{dashboardDisplayName.trim().slice(0,2)}</span>}<span className="min-w-0 text-left"><span className="block max-w-[145px] truncate text-sm font-bold leading-5 text-white">{dashboardDisplayName}</span><span className="block text-[11px] leading-4 text-slate-400">আমার প্রোফাইল</span></span></Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-2xl border border-white/10 bg-slate-900 p-4 lg:sticky lg:top-24 lg:min-h-[calc(100vh-7rem)]">
          <p className="mb-4 px-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">আপনার workspace</p>
          <div className="rounded-xl bg-emerald-500/10 p-3"><span className="text-2xl">{dashboardDetails.icon}</span><p className="mt-2 font-bold">{dashboardDetails.title}</p><p className="mt-1 text-xs text-slate-400">{demoUser.email}</p></div>
          <nav className="mt-4 grid gap-1 text-sm">
            <Link href="/dashboard" className="rounded-lg bg-emerald-500/15 px-3 py-3 font-semibold text-emerald-200">◈ ওভারভিউ</Link>
            <Link href="/my-orders" className="rounded-lg px-3 py-3 text-slate-300 hover:bg-white/5">▤ আমার অর্ডার</Link>
            <Link href="/profile" className="rounded-lg px-3 py-3 text-slate-300 hover:bg-white/5">👤 আমার প্রোফাইল</Link>
            <Link href="/" className="rounded-lg px-3 py-3 text-slate-300 hover:bg-white/5">⌕ মার্কেটপ্লেস</Link>
          </nav>
          <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100">ডেমো মোড: তথ্য এই ব্রাউজারে সংরক্ষিত। বাস্তব সার্ভার ডেটার সঙ্গে যুক্ত নয়।</p><button type="button" onClick={() => { localStorage.removeItem("haatbazar_demo_session_v1"); setDemoUser(null); setLocation("/"); }} className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/20 lg:mt-6"><span aria-hidden="true">↪</span> লগআউট</button>
        </aside>
        <main className="min-w-0">
          <section className="overflow-hidden rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 p-6 sm:p-8">
            <p className="text-sm font-semibold text-emerald-300">HAATBAZAR / WORKSPACE</p>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">স্বাগতম, {dashboardDisplayName}!</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{dashboardDetails.subtitle}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-200"><span className="h-2 w-2 rounded-full bg-emerald-400"></span> {dashboardDetails.title}</div>
          </section>
          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            {[{ label: "অ্যাকাউন্টের ধরন", value: dashboardRole === "buyer" ? "ক্রেতা" : dashboardRole === "seller" ? "খুচরা বিক্রেতা" : dashboardRole === "wholesaler" ? "পাইকারি বিক্রেতা" : "ব্যবসায়িক ক্রেতা", icon: "👤" }, { label: "অ্যাকাউন্ট স্ট্যাটাস", value: "ডেমো সক্রিয়", icon: "✓" }, { label: "পেমেন্ট", value: "বন্ধ / পরীক্ষা মোড", icon: "🔒" }].map((stat) => <div key={stat.label} className="rounded-2xl border border-white/10 bg-slate-900 p-4"><div className="flex items-center justify-between text-sm text-slate-400"><span>{stat.label}</span><span>{stat.icon}</span></div><p className="mt-3 text-lg font-bold text-white">{stat.value}</p></div>)}
          </section>
          <section className="mt-7">
            <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Quick actions</p><h2 className="mt-1 text-xl font-bold">আপনার কাজ</h2></div><Link href="/" className="text-sm font-semibold text-emerald-300 hover:text-emerald-200">মার্কেটপ্লেস →</Link></div>
            <div className="grid gap-3 md:grid-cols-2">{dashboardDetails.actions.map((action) => <Link key={action.title} href={action.href} className="group rounded-2xl border border-white/10 bg-slate-900 p-5 transition hover:border-emerald-400/50 hover:bg-slate-900/80"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400/10 text-2xl">{action.icon}</span><h3 className="mt-4 font-bold">{action.title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{action.body}</p><span className="mt-4 inline-flex text-sm font-semibold text-emerald-300">{action.cta} →</span></Link>)}</div>
          </section>
          <section className="mt-7"><div className="mb-3"><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Role-specific modules</p><h2 className="mt-1 text-xl font-bold">আপনার ড্যাশবোর্ডের বিভাগ</h2><p className="mt-1 text-sm text-slate-400">যে ফিচারগুলো এখনো বাস্তব ডেটাবেসে যুক্ত নয়, সেগুলো স্পষ্টভাবে চিহ্নিত করা হয়েছে।</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{dashboardDetails.modules.map((module) => <article key={module.title} className="rounded-2xl border border-white/10 bg-slate-900 p-4"><span className="text-2xl">{module.icon}</span><h3 className="mt-3 font-bold">{module.title}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-slate-400">{module.detail}</p><span className="mt-3 inline-block rounded-full border border-amber-300/20 bg-amber-300/5 px-2.5 py-1 text-xs font-semibold text-amber-100">{module.status}</span></article>)}</div></section>
          <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5"><h2 className="font-bold">অ্যাকাউন্টের তথ্য</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-950 p-3"><p className="text-xs text-slate-400">নাম</p><p className="mt-1 font-semibold">{dashboardDisplayName}</p></div><div className="rounded-xl bg-slate-950 p-3"><p className="text-xs text-slate-400">ইমেইল</p><p className="mt-1 break-all font-semibold">{demoUser.email}</p></div></div></section>
          <p className="mt-5 text-xs leading-5 text-slate-500">নিরাপত্তা নোট: সাধারণ রেজিস্ট্রেশন থেকে অ্যাডমিন অ্যাক্সেস দেওয়া হয় না। অ্যাডমিন প্যানেল আলাদা অনুমোদিত অ্যাকাউন্টের জন্য; এই ডেমো রোলগুলো বাস্তব অনুমতি বা সার্ভার-সাইড authorization নয়।</p>
        </main>
      </div>
    </div>
  );

  if (path === "/profile") { const adminSession = (() => { try { const v = JSON.parse(localStorage.getItem("haatbazar_super_admin_demo_session_v1") || "null"); return v?.demoOnly === true && typeof v?.email === "string"; } catch { return false; } })(); return (demoUser || adminSession) ? <CustomerProfile /> : <div className="mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-bold">প্রোফাইল দেখতে লগইন করুন</h1><p className="my-3 text-sm text-muted-foreground">আপনার অ্যাকাউন্টে প্রবেশ করে প্রোফাইল খুলুন।</p><button onClick={() => { setAuthMode("login"); setLocation("/"); }} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">লগইন</button></div>; }
  if (path === "/my-orders") return <MyOrders onBack={() => setLocation("/")} />;
  if (path === "/admin/profile" && import.meta.env.VITE_DEMO_MODE === "true") { const adminSession = (() => { try { const v = JSON.parse(localStorage.getItem("haatbazar_super_admin_demo_session_v1") || "null"); return v?.demoOnly === true && typeof v?.email === "string"; } catch { return false; } })(); if (!adminSession) { setLocation("/admin/login"); return null; } return <SuperAdminProfile />; }
  if (path === "/admin/login" && import.meta.env.VITE_DEMO_MODE === "true") return <SuperAdminLogin />;
  if (path === "/admin" && import.meta.env.VITE_DEMO_MODE === "true") {
    const adminSession = (() => { try { const v = JSON.parse(localStorage.getItem("haatbazar_super_admin_demo_session_v1") || "null"); return v?.demoOnly === true && typeof v?.email === "string"; } catch { return false; } })();
    if (!adminSession) { setLocation("/admin/login"); return null; }
    return <SuperAdminDashboard onBack={() => { localStorage.removeItem("haatbazar_super_admin_demo_session_v1"); setLocation("/"); }} onProfile={() => setLocation("/admin/profile")} />;
  }
  if (path === "/admin") return <AdminPanel onBack={() => setLocation("/")} />;
  if (path === "/admin/analytics") return <AdminAnalytics onBack={() => setLocation("/admin")} />;
  if (showAnalytics) return <AdminAnalytics onBack={() => setShowAnalytics(false)} />;
  if (productId) return <div className="min-h-screen bg-background text-foreground"><header className="border-b bg-card/95 p-4 shadow-sm"><div className="mx-auto flex max-w-6xl items-center gap-3"><Link href="/" aria-label="ফিরে যান" title="ফিরে যান" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-100"><ArrowLeft size={22} strokeWidth={2.5} /></Link><Link href="/" aria-label="Haat Bazar homepage" className="inline-flex items-center gap-3 text-2xl font-extrabold tracking-tight text-emerald-800 dark:text-emerald-300"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white shadow-sm"><Store size={24} strokeWidth={2.4} /></span><span className="leading-tight">{brandSettings.siteName}<small className="mt-0.5 block text-[10px] font-semibold tracking-wide text-muted-foreground">{brandSettings.tagline}</small></span></Link></div></header><main className="mx-auto max-w-4xl p-4">{!product ? <p className="py-12 text-center">পণ্য লোড হচ্ছে অথবা পণ্যটি আর উপলভ্য নেই।</p> : <article className="grid gap-6 rounded-2xl border bg-card p-5 md:grid-cols-2"><div className="grid min-h-64 place-items-center rounded-xl bg-emerald-50 text-7xl">{product.images?.[0] ? <img src={product.images[0]} alt={product.title} className="h-full max-h-96 w-full rounded-xl object-cover" /> : "🧺"}</div><div><p className="text-sm text-muted-foreground">{labelOf(product.category)}{product.subcategory ? ` · ${product.subcategory}` : ""} · {product.district}</p><h1 className="my-2 text-2xl font-bold">{product.title}</h1><p className="text-2xl font-bold text-emerald-700">{money(product.price)}</p><p className="my-3 whitespace-pre-wrap">{product.description}</p><p>বিক্রেতা: {product.businessName || product.sellerName} {product.sellerVerified && <span className="font-semibold text-emerald-700">· ✓ যাচাইকৃত</span>}</p><p>মজুদ: {bn(product.quantity)} {unitLabel(product.unit)}</p><p>বিক্রির ধরন: {product.saleType === "wholesale" ? "পাইকারি" : product.saleType === "retail" ? "খুচরা" : "খুচরা ও পাইকারি"}</p><p>সর্বনিম্ন অর্ডার: {bn(product.minOrderQuantity || 1)} {unitLabel(product.unit)}</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={() => setOrdering(product)} className="rounded-lg bg-amber-400 py-3 font-bold text-emerald-950">অর্ডার করুন</button>{whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`হ্যালো, আমি ${product.title} পণ্যটি সম্পর্কে জানতে চাই।`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 py-3 font-bold text-white"><span aria-hidden="true">☏</span> WhatsApp-এ যোগাযোগ</a>}</div></div></article>}</main><footer className="mt-10 border-t border-slate-200 bg-slate-100 text-slate-800"><div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4"><section><h2 className="mb-3 font-semibold text-emerald-800">ক্রেতা সহায়তা</h2><nav className="flex flex-col items-start gap-2 text-sm"><a href="/contact">সহায়তা কেন্দ্র</a><a href="/about">কীভাবে কিনবেন</a><a href="/refund-policy">রিফান্ড ও ফেরত নীতি</a><a href="/delivery-policy">ডেলিভারি তথ্য</a><a href="/terms">শর্তাবলি</a></nav></section><section><h2 className="mb-3 font-semibold text-emerald-800">হাটবাজার</h2><nav className="flex flex-col items-start gap-2 text-sm"><a href="/about">আমাদের সম্পর্কে</a><a href="/contact">যোগাযোগ করুন</a><a href="/privacy">গোপনীয়তা নীতি</a><a href="/terms">ব্যবহারের শর্ত</a><a href="/#popular">জনপ্রিয় ক্যাটাগরি</a></nav></section><section><h2 className="mb-3 font-semibold text-emerald-800">বিক্রেতা কর্নার</h2><nav className="flex flex-col items-start gap-2 text-sm"><a href="/#products">পণ্য দেখুন</a><a href="/contact">বিক্রেতার সহায়তা</a></nav><p className="mt-4 text-sm">সারা বাংলাদেশের ক্রেতা ও বিক্রেতাদের অনলাইন বাজার।</p></section><section><h2 className="mb-3 font-semibold text-emerald-800">যোগাযোগ ও তথ্য</h2><p className="text-sm">প্রশ্ন বা সহায়তার জন্য আমাদের সঙ্গে যোগাযোগ করুন।</p><a href="/contact" className="mt-3 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">যোগাযোগ করুন</a></section></div><div className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{brandSettings.footerCopyright}</span><nav className="flex flex-wrap gap-4"><a href="/terms">শর্তাবলি</a><a href="/privacy">গোপনীয়তা</a><a href="/refund-policy">রিফান্ড নীতি</a><a href="/delivery-policy">ডেলিভারি নীতি</a></nav></div></div></footer>{ordering && <OrderDialog item={ordering} onClose={() => setOrdering(null)} onDone={m => { setToast(m); setTimeout(() => setToast(""), 3500); }} />}{toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-background">{toast}</div>}</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b-4 border-orange-500 bg-card/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Link href="/" aria-label="Haat Bazar homepage" className="flex shrink-0 items-center gap-3 text-xl font-extrabold tracking-tight text-emerald-800 transition hover:opacity-90 sm:text-2xl dark:text-emerald-300"><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white shadow-sm ring-2 ring-orange-100"><Store size={24} strokeWidth={2.4} /></span><span className="leading-tight">{brandSettings.siteName}<small className="mt-0.5 block text-[10px] font-semibold tracking-wide text-muted-foreground">{brandSettings.tagline}</small></span></Link>
          <div className="flex items-center gap-2">
            {demoUser ? (
              <>
                <span className="hidden max-w-32 truncate text-sm font-semibold sm:inline">স্বাগতম, {dashboardDisplayName}</span>
                <Link href="/dashboard" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">ড্যাশবোর্ড</Link>
                <Link href="/profile" className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">প্রোফাইল</Link>
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

      <div className="bg-orange-500 px-4 py-1.5 text-center text-xs font-semibold text-white">{brandSettings.headerPromo}</div>
      <div className="px-4 py-1 text-center text-xs font-semibold">MSA</div>
      <nav className="bg-emerald-900 text-white"><div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 py-3 text-sm font-semibold"><Link href="/" className="shrink-0">☰ সব ক্যাটাগরি</Link><a href="#products" className="shrink-0">{brandSettings.headerNavToday}</a><a href="#popular" className="shrink-0">{brandSettings.headerNavPopular}</a><a href="#why" className="shrink-0">{brandSettings.headerNavWhy}</a></div></nav>
      <div className="px-4 py-1 text-center text-xs font-semibold">MSA</div>
      <section className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 py-10 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
          <h1 className="max-w-5xl text-3xl font-extrabold leading-tight md:text-4xl">{routeCategory ? `${routeCategory.label} — খুচরা ও পাইকারি বাজার` : routeDistrict ? `${routeDistrict} জেলার অনলাইন হাটবাজার`  : brandSettings.heroTitle}</h1>
          <p className="mb-5 mt-2 opacity-90">{brandSettings.heroDescription}</p>
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
          {[{ key: "", label: "সব", emoji: "🧺", slug: "" }, ...displayCategories].map((c) => (
            <button key={c.key} onClick={() => { setCategory(c.key); setSubcategory(""); setLocation(c.key ? `/category/${displayCategories.find(x => x.key === c.key)?.slug || c.key}` : "/"); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${(category === c.key || routeCategory?.key === c.key) ? "border-orange-500 bg-orange-500 text-white shadow-sm" : "bg-card hover:border-orange-400"}` }>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {routeCategory && <div className="mb-3 flex flex-wrap gap-2">{routeCategory.subcategories.map(sub => <button key={sub} onClick={() => setSubcategory(subcategory === sub ? "" : sub)} className={`rounded-full border px-3 py-1 text-sm ${subcategory === sub ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>{sub}</button>)}</div>}
        <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">বিক্রির ধরন:</span>{[{v:"",l:"সব"},{v:"retail",l:"খুচরা"},{v:"wholesale",l:"পাইকারি"},{v:"both",l:"দুই ধরনের"}].map(o => <button key={o.v} onClick={() => setSaleType(o.v)} className={`rounded-full border px-3 py-1 text-sm ${saleType === o.v ? "border-emerald-600 bg-emerald-600 text-white" : "bg-card"}`}>{o.l}</button>)}</div>
        <div id="products" className="mt-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">HaatBazar Marketplace</p><h2 className="my-1 text-xl font-extrabold md:text-2xl">{routeCategory?.label || (category ? displayCategories.find((c) => c.key === category)?.label : "সব পণ্য ও বিজ্ঞাপন")} <span className="text-emerald-700">({bn(displayItems.length)})</span></h2></div><span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 sm:inline-flex">খুচরা ও পাইকারি</span></div>
        {(demo || useSampleListings) && <p className="mb-3 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">🧪 ডেমো প্রিভিউ: নিচের পণ্যগুলো শুধু ডিজাইন দেখানোর নমুনা, বাস্তব বিক্রেতার বিজ্ঞাপন নয়। ডাটাবেসে পণ্য যোগ হলে লাইভ পণ্য দেখাবে।</p>}
        {loading ? <p className="py-10 text-center text-muted-foreground">লোড হচ্ছে…</p>
          : displayItems.length === 0 ? <p className="py-10 text-center text-muted-foreground">কোনো পণ্য পাওয়া যায়নি। অন্য ক্যাটাগরি বা সার্চ দিয়ে দেখুন।</p>
          : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{displayItems.filter(i => (!subcategory || i.subcategory === subcategory) && (!saleType || (i.saleType || "both") === saleType || i.saleType === "both")).map((i) => <ListingCard key={i.id} item={i} onOrder={setOrdering} />)}</div>}

        <h2 id="popular" className="mb-3 mt-10 border-l-4 border-orange-500 pl-3 text-xl font-extrabold">জনপ্রিয় ক্যাটাগরি</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{displayCategories.map((c, index) => <Link key={c.key} href={`/category/${c.slug}`} className="group relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-white to-emerald-50/70 p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md dark:from-slate-900 dark:to-emerald-950/30"><span className="absolute right-3 top-3 text-[10px] font-bold text-emerald-700/60 dark:text-emerald-300/60">{String(index + 1).padStart(2, "0")}</span><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-emerald-900/5 transition group-hover:scale-105 dark:bg-slate-800">{c.emoji}</div><div className="mt-3 font-bold text-slate-900 dark:text-white">{c.label}</div><div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{c.subcategories.slice(0,3).join(" · ")}</div><div className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">পণ্য দেখুন →</div></Link>)}</div>
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
        <h2 id="why" className="mb-3 mt-10 border-l-4 border-orange-500 pl-3 text-xl font-extrabold">{brandSettings.whyTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brandSettings.whyItems.filter(w => w.enabled).map((w) => { const Icon = whyIcons[w.icon as keyof typeof whyIcons] || Store; return (
            <div key={w.id} className="rounded-2xl border bg-card p-4">
              <Icon className="mb-2 text-emerald-600" aria-hidden="true" />
              <h3 className="font-semibold">{w.title}</h3>
              <p className="text-sm text-muted-foreground">{w.body}</p>
            </div>
          ); })}
        </div>
      </main>

      <footer className="mt-10 border-t border-slate-200 bg-slate-100 text-slate-800">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">{brandSettings.footerSupportTitle}</h3>
            <nav className="flex flex-col items-start gap-2 text-sm">
              {brandSettings.footerLinks.find(g => g.id === "support")?.links.filter(link => link.enabled).map(link => <a key={link.id} href={footerHref(link.href)} className="hover:text-orange-600">{link.label}</a>)}
            </nav>
          </section>
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">{brandSettings.footerMarketplaceTitle}</h3>
            <nav className="flex flex-col items-start gap-2 text-sm">
              {brandSettings.footerLinks.find(g => g.id === "marketplace")?.links.filter(link => link.enabled).map(link => <a key={link.id} href={footerHref(link.href)} className="hover:text-orange-600">{link.label}</a>)}
            </nav>
          </section>
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">{brandSettings.footerSellerTitle}</h3>
            <nav className="flex flex-col items-start gap-2 text-sm">
              {brandSettings.footerLinks.find(g => g.id === "seller")?.links.filter(link => link.enabled).map(link => link.href === "action:post-ad" ? <button key={link.id} type="button" onClick={() => setPosting(true)} className="hover:text-orange-600">{link.label}</button> : <a key={link.id} href={footerHref(link.href)} className="hover:text-orange-600">{link.label}</a>)}
            </nav>
            <div className="mt-5 rounded-xl border border-emerald-100 bg-white p-3">
              <p className="font-semibold text-emerald-800">{brandSettings.footerShopTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{brandSettings.footerDescription}</p>
            </div>
          </section>
          <section>
            <h3 className="mb-3 text-base font-semibold text-emerald-800">{brandSettings.footerContactTitle}</h3>
            <p className="text-sm">{brandSettings.footerContactText}</p>
            <a href="/contact" className="mt-3 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">যোগাযোগ করুন</a>
          </section>
        </div>
        <div className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{brandSettings.footerOrderTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{brandSettings.footerOrderNotice}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded border bg-slate-50 px-3 py-2">সরাসরি বিক্রেতার সঙ্গে যোগাযোগ</span>
              <span className="rounded border bg-slate-50 px-3 py-2">খুচরা ও পাইকারি</span>
              <span className="rounded border bg-slate-50 px-3 py-2">বাংলাদেশজুড়ে</span>
            </div>
          </div>
          <div className="border-t border-slate-200">
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>{brandSettings.footerCopyright}</span>
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
