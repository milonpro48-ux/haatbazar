import { ArrowLeft, ClipboardList, ShoppingBag, Store, UserRound, LogOut, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type DemoUser = { name: string; email: string };

export default function UserDashboard({
  user,
  onBack,
  onLogout,
}: {
  user: DemoUser;
  onBack: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} aria-label="হোমপেজে ফিরে যান" className="rounded-lg border p-2 hover:bg-muted"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-xl font-extrabold">আমার ড্যাশবোর্ড</h1>
              <p className="text-sm text-muted-foreground">HaatBazar অ্যাকাউন্ট</p>
            </div>
          </div>
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted"><LogOut size={16} /> লগআউট</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <section className="rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-emerald-100">স্বাগতম</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{user.name}</h2>
          <p className="mt-2 break-all text-sm text-emerald-100">{user.email}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><UserRound size={14} /> ডেমো ব্যবহারকারী</div>
        </section>

        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-bold"><ShieldCheck size={17} className="mr-2 inline" /> ডেমো অ্যাকাউন্ট</p>
          <p className="mt-1">এই GitHub Pages সংস্করণে অ্যাকাউন্টের তথ্য এই ব্রাউজারে সংরক্ষিত থাকে। এটি এখনো সার্ভার-ভিত্তিক আসল অ্যাকাউন্ট নয়।</p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">দ্রুত কাজ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/" className="group rounded-2xl border bg-card p-5 transition hover:border-emerald-600 hover:shadow-sm">
              <ShoppingBag className="mb-3 text-emerald-700" size={28} />
              <h3 className="font-bold">পণ্য দেখুন</h3>
              <p className="mt-1 text-sm text-muted-foreground">হোমপেজে ফিরে পণ্য ও ক্যাটাগরি দেখুন।</p>
              <span className="mt-4 inline-block text-sm font-semibold text-emerald-700">পণ্য ব্রাউজ করুন →</span>
            </Link>
            <Link href="/my-orders" className="group rounded-2xl border bg-card p-5 transition hover:border-emerald-600 hover:shadow-sm">
              <ClipboardList className="mb-3 text-emerald-700" size={28} />
              <h3 className="font-bold">আমার অর্ডার</h3>
              <p className="mt-1 text-sm text-muted-foreground">অর্ডারের অবস্থা দেখার পেজ খুলুন।</p>
              <span className="mt-4 inline-block text-sm font-semibold text-emerald-700">অর্ডার দেখুন →</span>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <Store className="mt-1 text-emerald-700" size={22} />
            <div className="min-w-0">
              <h2 className="font-bold">প্রোফাইল তথ্য</h2>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">নাম</dt><dd className="mt-1 break-words font-semibold">{user.name}</dd></div>
                <div><dt className="text-muted-foreground">ইমেইল</dt><dd className="mt-1 break-all font-semibold">{user.email}</dd></div>
              </dl>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
