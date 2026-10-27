import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Package, Heart, Store, Wallet, MapPin, MessageCircle, ShieldCheck, CircleHelp, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";

const sections = [
  { id: "orders", label: "আমার অর্ডার", description: "চলমান, সম্পন্ন, বাতিল ও রিটার্ন অর্ডার এবং ট্র্যাকিং", icon: Package },
  { id: "saved", label: "সেভ করা জিনিস", description: "উইশলিস্ট এবং অনুসরণ করা দোকান", icon: Heart },
  { id: "sales", label: "আমার বিক্রয়", description: "পণ্য তালিকা, নতুন পণ্য, আয়, রিভিউ ও রেটিং", icon: Store },
  { id: "wallet", label: "পেমেন্ট ও ওয়ালেট", description: "পেমেন্ট পদ্ধতি, লেনদেন ও রিফান্ডের অবস্থা", icon: Wallet },
  { id: "addresses", label: "ঠিকানা বই", description: "একাধিক ডেলিভারি ঠিকানা এবং ডিফল্ট ঠিকানা", icon: MapPin },
  { id: "messages", label: "মেসেজ ও নোটিফিকেশন", description: "চ্যাট, অর্ডার আপডেট এবং অফার", icon: MessageCircle },
  { id: "security", label: "সেটিংস ও নিরাপত্তা", description: "পাসওয়ার্ড, বাংলা/ইংরেজি, নোটিফিকেশন এবং অ্যাকাউন্ট ডিলিট", icon: ShieldCheck },
  { id: "support", label: "সাহায্য ও সাপোর্ট", description: "FAQ, অভিযোগ এবং যোগাযোগ", icon: CircleHelp },
];

export default function SuperAdminProfile() {
  const [, setLocation] = useLocation();
  const [active, setActive] = useState("orders");
  const activeSection = sections.find((section) => section.id === active) || sections[0];
  const ActiveIcon = activeSection.icon;
  const logout = () => {
    localStorage.removeItem("haatbazar_super_admin_demo_session_v1");
    setLocation("/");
  };

  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/admin")} className="rounded-lg border border-slate-700 p-2 hover:bg-slate-800" aria-label="Super Admin Dashboard-এ ফিরুন"><ArrowLeft size={18}/></button>
          <div><p className="text-xs font-bold tracking-[0.2em] text-teal-400">HAATBAZAR · SUPER ADMIN</p><h1 className="text-xl font-extrabold">অ্যাকাউন্ট বিভাগসমূহ</h1></div>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 font-semibold text-red-300 hover:bg-red-950/50"><LogOut size={16}/> লগআউট</button>
      </div>
    </header>
    <main className="mx-auto grid max-w-7xl gap-5 p-4 md:p-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-3 rounded-xl border border-teal-900/70 bg-teal-950/40 p-4"><p className="text-sm font-bold text-teal-300">অ্যাকাউন্ট মেনু</p><p className="mt-1 text-xs leading-5 text-slate-400">প্রোফাইল তথ্য নয়—শুধু আপনার নির্ধারিত ৯টি বিভাগ।</p></div>
        <nav className="grid gap-1">
          {sections.map((section) => { const Icon = section.icon; return <button key={section.id} onClick={() => setActive(section.id)} className={"flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold " + (active === section.id ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-700" : "text-slate-300 hover:bg-slate-800")}><Icon size={18}/><span className="flex-1">{section.label}</span><ChevronRight size={15}/></button>; })}
          <button onClick={() => setActive("personal")} className={"flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold " + (active === "personal" ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-700" : "text-slate-300 hover:bg-slate-800")}><LayoutDashboard size={18}/><span className="flex-1">ব্যক্তিগত তথ্য</span><ChevronRight size={15}/></button>
        </nav>
      </aside>
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-7">
        {active === "personal" ? <><p className="text-xs font-bold tracking-[0.2em] text-teal-400">SECTION 1</p><h2 className="mt-2 text-2xl font-extrabold">ব্যক্তিগত তথ্য</h2><p className="mt-3 text-slate-300">প্রোফাইল ছবি, নাম, ইউজারনেম, ভেরিফাইড ফোন ও ইমেইল, ঠিকানা এবং বায়ো।</p></> : <><div className="flex items-center gap-3"><div className="rounded-xl bg-teal-500/10 p-3 text-teal-300"><ActiveIcon size={25}/></div><div><p className="text-xs font-bold tracking-[0.2em] text-teal-400">ACCOUNT SECTION</p><h2 className="mt-1 text-2xl font-extrabold">{activeSection.label}</h2></div></div><p className="mt-5 text-slate-300">{activeSection.description}</p><div className="mt-6 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm leading-6 text-amber-200">এই বিভাগটির ইন্টারফেস আলাদা করে দেখানো হয়েছে। অর্ডার, পেমেন্ট, চ্যাট ও অন্যান্য বাস্তব তথ্য দেখাতে সংশ্লিষ্ট ব্যাকএন্ড/API সংযোগ প্রয়োজন।</div></>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {sections.map((section, index) => { const Icon = section.icon; return <button key={section.id} onClick={() => setActive(section.id)} className="flex items-start gap-3 rounded-xl border border-slate-800 p-4 text-left hover:border-teal-700 hover:bg-slate-800/70"><Icon className="mt-0.5 shrink-0 text-teal-300" size={20}/><span><span className="block font-bold">{index + 2}. {section.label}</span><span className="mt-1 block text-sm leading-5 text-slate-400">{section.description}</span></span></button>; })}
        </div>
        <button onClick={() => setLocation("/admin")} className="mt-6 rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-500">ড্যাশবোর্ডে ফিরে যাও</button>
      </section>
    </main>
  </div>;
}
