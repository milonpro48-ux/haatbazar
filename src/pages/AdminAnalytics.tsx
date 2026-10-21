import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Users, Eye, Phone, ShoppingCart, Repeat2, Wallet, Store, RefreshCw, ShieldAlert } from "lucide-react";
import { labelOf, bn } from "@/lib/data";

type MetricKey = "active" | "sellers" | "views" | "contacts" | "orders" | "returning" | "cac";
type Analytics = {
  periodDays: number; activeListings: number; newSellers7d: number; orders7d: number;
  views7d: number; contacts7d: number; uniqueContactVisitors7d: number; contactRate: number;
  orderRate: number; returningVisitors30d: number; events7d: number; marketingSpendBdt: number;
  estimatedCostPerContact: number | null; topCategories: { category: string; views: number }[];
  topListings: { listingId: string; title: string | null; views: number }[];
};
const menu: { key: MetricKey; label: string; icon: typeof Store; description: string }[] = [
  { key: "active", label: "সক্রিয় বিজ্ঞাপন", icon: Store, description: "সার্ভারে প্রকাশিত সক্রিয় বিজ্ঞাপনের সংখ্যা" },
  { key: "sellers", label: "নতুন বিক্রেতা", icon: Users, description: "গত সাত দিনে তৈরি হওয়া বিক্রেতা অ্যাকাউন্ট" },
  { key: "views", label: "পণ্যের ভিউ", icon: Eye, description: "পণ্যের বিস্তারিত পেজের ভিউ ও জনপ্রিয় ক্যাটাগরি" },
  { key: "contacts", label: "যোগাযোগের হার", icon: Phone, description: "পণ্য ভিউ থেকে যোগাযোগের ইভেন্টের অনুপাত" },
  { key: "orders", label: "অর্ডারের হার", icon: ShoppingCart, description: "সার্ভারে সংরক্ষিত অর্ডার অনুরোধ" },
  { key: "returning", label: "পুনরায় আসা ভিজিটর", icon: Repeat2, description: "একই ব্রাউজার আইডির পুনরাবৃত্ত ভিজিটের সংকেত" },
  { key: "cac", label: "কাস্টমার অর্জনের খরচ", icon: Wallet, description: "মার্কেটিং খরচ ÷ অনন্য যোগাযোগকারী ব্রাউজার" },
];
const money = (n: number) => "৳ " + Math.round(n).toLocaleString("en-IN");

export function AdminAnalytics({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<MetricKey>("active");
  const [data, setData] = useState<Analytics | null>(null);
  const [spend, setSpend] = useState(0);
  const [source, setSource] = useState<"loading" | "ok" | "unauthorized" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setSource("loading"); setMessage("");
    try {
      const r = await fetch("/api/admin/analytics", { credentials: "include", cache: "no-store" });
      if (r.status === 401 || r.status === 403) { setSource("unauthorized"); return; }
      if (!r.ok) throw new Error("analytics_unavailable");
      const d: Analytics = await r.json(); setData(d); setSpend(Number(d.marketingSpendBdt || 0)); setSource("ok");
    } catch { setSource("error"); }
  }
  useEffect(() => { void refresh(); }, []);

  async function saveSpend() {
    setSaving(true); setMessage("");
    try {
      const r = await fetch("/api/admin/marketing-spend", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.max(0, Number(spend) || 0) }) });
      if (r.status === 401 || r.status === 403) { setSource("unauthorized"); return; }
      if (!r.ok) throw new Error("save_failed");
      setMessage("মার্কেটিং খরচ সার্ভারে সংরক্ষিত হয়েছে।"); await refresh();
    } catch { setMessage("সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।"); }
    finally { setSaving(false); }
  }

  const view = menu.find(m => m.key === active)!;
  const card = (label: string, value: string, detail: string) => <div className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-3"><button onClick={onBack} className="rounded-lg border p-2" aria-label="হোমে ফিরুন"><ArrowLeft size={18}/></button><div><h1 className="font-bold text-xl">হাটবাজার · অ্যানালিটিক্স</h1><p className="text-xs text-muted-foreground">সার্ভারের সম্মিলিত ডেটা</p></div></div><button onClick={() => void refresh()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw size={15}/> রিফ্রেশ</button></div></header>
    {source === "loading" && <p className="p-10 text-center">সার্ভার থেকে রিপোর্ট আনা হচ্ছে…</p>}
    {source === "unauthorized" && <main className="mx-auto max-w-xl p-6"><div className="rounded-2xl border p-6"><ShieldAlert className="mb-3 text-amber-600" size={32}/><h2 className="text-xl font-bold">অ্যাডমিন অনুমতি প্রয়োজন</h2><p className="my-3 text-sm text-muted-foreground">এই রিপোর্টে সব ব্যবহারকারীর সম্মিলিত ব্যবসায়িক তথ্য রয়েছে। এটি শুধু অ্যাডমিন অ্যাকাউন্ট দিয়ে দেখা যাবে।</p><a className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white" href="/api/login?returnTo=%2F">অ্যাডমিন লগইন</a></div></main>}
    {source === "error" && <main className="mx-auto max-w-xl p-6"><div className="rounded-xl border p-5"><p>সার্ভার রিপোর্ট লোড করা যায়নি। backend চালু আছে কি না দেখুন।</p><button onClick={() => void refresh()} className="mt-3 rounded-lg border px-4 py-2">আবার চেষ্টা করুন</button></div></main>}
    {source === "ok" && data && <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:grid-cols-[240px_1fr]"><aside className="h-fit rounded-xl border bg-card p-2"><p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">রিপোর্ট মেনু</p>{menu.map(m => <button key={m.key} onClick={() => setActive(m.key)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${active===m.key?"bg-emerald-600 font-semibold text-white":"hover:bg-muted"}`}><m.icon size={17}/>{m.label}</button>)}</aside>
      <main className="min-w-0 space-y-4"><div><h2 className="text-2xl font-bold">{view.label}</h2><p className="mt-1 text-sm text-muted-foreground">{view.description}</p></div>
        {active === "active" && <div className="grid gap-3 sm:grid-cols-2">{card("সক্রিয় বিজ্ঞাপন",bn(data.activeListings),"সার্ভারের active status থেকে")}{card("গত ৭ দিনের সব ইভেন্ট",bn(data.events7d),"সব ব্যবহারকারীর server-side analytics")}</div>}
        {active === "sellers" && <div className="grid gap-3 sm:grid-cols-2">{card("নতুন বিক্রেতা",bn(data.newSellers7d),"গত ৭ দিনে তৈরি হওয়া seller অ্যাকাউন্ট")}{card("সক্রিয় বিজ্ঞাপন",bn(data.activeListings),"বর্তমানে প্রকাশিত বিজ্ঞাপন")}</div>}
        {active === "views" && <><div className="grid gap-3 sm:grid-cols-3">{card("গত ৭ দিনের পণ্য ভিউ",bn(data.views7d),"পণ্যের বিস্তারিত পেজ খোলা")}{card("জনপ্রিয় ক্যাটাগরি",bn(data.topCategories.length),"ভিউ পাওয়া ক্যাটাগরির সংখ্যা")}{card("জনপ্রিয় পণ্য",bn(data.topListings.length),"ভিউসহ শীর্ষ বিজ্ঞাপনের সংখ্যা")}</div><section className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">ক্যাটাগরি অনুযায়ী ভিউ</h3>{data.topCategories.length ? data.topCategories.map(x => <div key={x.category} className="mb-3"><div className="mb-1 flex justify-between text-sm"><span>{labelOf(x.category)}</span><span>{bn(x.views)}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-600" style={{width:`${Math.max(4,x.views/Math.max(...data.topCategories.map(v=>v.views))*100)}%`}}/></div></div>) : <p className="text-sm text-muted-foreground">এখনো ভিউ ডেটা নেই।</p>}<h3 className="mb-3 mt-6 font-semibold">সবচেয়ে বেশি দেখা পণ্য</h3>{data.topListings.map(x=><div key={x.listingId} className="flex justify-between gap-3 border-b py-2 text-sm last:border-0"><span>{x.title || `বিজ্ঞাপন #${x.listingId}`}</span><span>{bn(x.views)} ভিউ</span></div>)}</section></>}
        {active === "contacts" && <div className="grid gap-3 sm:grid-cols-3">{card("যোগাযোগ ইভেন্ট",bn(data.contacts7d),"গত ৭ দিনে ফোন নম্বর দেখার/যোগাযোগের সংকেত")}{card("অনন্য যোগাযোগকারী",bn(data.uniqueContactVisitors7d),"visitor ID অনুযায়ী ইউনিক ব্রাউজার")}{card("ভিউ থেকে যোগাযোগ",`${(data.contactRate*100).toFixed(1)}%`,"যোগাযোগ ইভেন্ট ÷ বিস্তারিত পেজ ভিউ")}</div>}
        {active === "orders" && <div className="grid gap-3 sm:grid-cols-3">{card("অর্ডার অনুরোধ",bn(data.orders7d),"গত ৭ দিনে সার্ভারে সংরক্ষিত অর্ডার")}{card("পণ্য ভিউ",bn(data.views7d),"গত ৭ দিনের বিস্তারিত পেজ ভিউ")}{card("ভিউ থেকে অর্ডার",`${(data.orderRate*100).toFixed(1)}%`,"অর্ডার ÷ পণ্য ভিউ; বিক্রি সম্পন্ন হওয়া নয়")}</div>}
        {active === "returning" && <div className="grid gap-3 sm:grid-cols-2">{card("পুনরায় আসা ভিজিটর",bn(data.returningVisitors30d),"গত ৩০ দিনে একই browser ID-তে একাধিক visit event")}{card("গত ৭ দিনের ইভেন্ট",bn(data.events7d),"সব ব্যবহারকারীর server-side event")}</div>}
        {active === "cac" && <><div className="grid gap-3 sm:grid-cols-2">{card("মার্কেটিং খরচ",money(data.marketingSpendBdt),"সার্ভারে সংরক্ষিত মোট খরচ")}{card("আনুমানিক খরচ/যোগাযোগ",data.estimatedCostPerContact===null?"—":money(data.estimatedCostPerContact),"মোট খরচ ÷ গত ৭ দিনের অনন্য যোগাযোগকারী; প্রকৃত CAC নয়")}</div><section className="rounded-xl border bg-card p-4"><label className="mb-2 block text-sm font-semibold" htmlFor="marketing-spend">মার্কেটিংয়ে মোট খরচ (৳)</label><input id="marketing-spend" type="number" min="0" value={spend} onChange={e=>setSpend(Math.max(0,Number(e.target.value)||0))} className="w-full max-w-sm rounded-lg border bg-background px-3 py-2"/><button disabled={saving} onClick={() => void saveSpend()} className="ml-2 mt-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving?"সংরক্ষণ হচ্ছে…":"সার্ভারে সংরক্ষণ"}</button>{message&&<p className="mt-2 text-sm">{message}</p>}<p className="mt-2 text-xs text-muted-foreground">এই খরচ সব অ্যাডমিন ডিভাইস থেকে দেখা যাবে। CAC হিসাব উন্নত করতে পেমেন্ট ও verified customer acquisition tracking লাগবে।</p></section></>}
        <p className="text-xs text-muted-foreground">সময়কাল: মেট্রিক অনুযায়ী গত ৭ বা ৩০ দিন। browser ID কুকি/লোকাল স্টোরেজের উপর নির্ভরশীল; এটি নিশ্চিত ব্যক্তিগত পরিচয় নয়।</p>
      </main></div>}
  </div>;
}
