import { useState } from "react";

type Mode = "login" | "register";
export type DemoRole = "buyer" | "seller" | "wholesaler" | "business";
export type DemoUser = { name: string; email: string; role: DemoRole };
type StoredAccount = DemoUser & { passwordHash: string };

const ACCOUNTS_KEY = "haatbazar_demo_accounts_v1";
const SESSION_KEY = "haatbazar_demo_session_v1";

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readAccounts(): StoredAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readDemoSession(): DemoUser | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return value && typeof value.name === "string" && typeof value.email === "string"
      ? { name: value.name, email: value.email, role: value.role === "seller" || value.role === "wholesaler" || value.role === "business" ? value.role : "buyer" }
      : null;
  } catch {
    return null;
  }
}

type Props = {
  mode: Mode;
  onClose: () => void;
  onModeChange: (mode: Mode) => void;
  onSuccess: (user: DemoUser) => void;
};

export function AuthDialog({ mode, onClose, onModeChange, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<DemoRole>("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("ইমেইল ও পাসওয়ার্ড দিন।");
      return;
    }
    if (password.length < 8) {
      setError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("আপনার নাম লিখুন।");
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError("দুটি পাসওয়ার্ড মিলছে না।");
      return;
    }

    setBusy(true);
    try {
      const accounts = readAccounts();
      const existing = accounts.find((account) => account.email === cleanEmail);
      if (mode === "register") {
        if (existing) {
          setError("এই ইমেইল দিয়ে আগে ডেমো অ্যাকাউন্ট তৈরি হয়েছে। লগইন করুন।");
          return;
        }
        const user: DemoUser = { name: name.trim(), email: cleanEmail, role };
        const account: StoredAccount = { ...user, passwordHash: await hashPassword(password) };
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, account]));
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        onSuccess(user);
        return;
      }
      if (!existing || existing.passwordHash !== await hashPassword(password)) {
        setError("ইমেইল বা পাসওয়ার্ড সঠিক নয়।");
        return;
      }
      const user: DemoUser = { name: existing.name, email: existing.email, role: existing.role === "seller" || existing.role === "wholesaler" || existing.role === "business" ? existing.role : "buyer" };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      onSuccess(user);
    } catch {
      setError("এই ব্রাউজারে ডেমো অ্যাকাউন্ট সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="hb-auth-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="hb-auth-title" className="text-2xl font-bold">{mode === "login" ? "হাটবাজারে লগইন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === "login" ? "আপনার ডেমো অ্যাকাউন্টে প্রবেশ করুন।" : "ডেমো ব্যবহার করে রেজিস্ট্রেশন পরীক্ষা করুন।"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="rounded-lg px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100">×</button>
        </div>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          ডেমো মোড: অ্যাকাউন্টের তথ্য শুধু এই ব্রাউজারে রাখা হয়। এটি আসল সার্ভার-ভিত্তিক অ্যাকাউন্ট নয়; বাস্তব ব্যবহারকারীর পাসওয়ার্ড এখানে ব্যবহার করবেন না।
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && <><label className="block text-sm font-semibold">আপনার নাম<input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label><label className="block text-sm font-semibold">আপনি কীভাবে HaatBazar ব্যবহার করবেন?<select value={role} onChange={(e) => setRole(e.target.value as DemoRole)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"><option value="buyer">সাধারণ ক্রেতা</option><option value="seller">খুচরা বিক্রেতা</option><option value="wholesaler">পাইকারি বিক্রেতা</option><option value="business">দোকান / ব্যবসায়িক ক্রেতা</option></select></label><p className="text-xs text-slate-500">অ্যাডমিন অ্যাকাউন্ট সাধারণ রেজিস্ট্রেশনে তৈরি করা যায় না।</p></>}
          <label className="block text-sm font-semibold">ইমেইল<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block text-sm font-semibold">পাসওয়ার্ড<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>
          {mode === "register" && <label className="block text-sm font-semibold">পাসওয়ার্ড আবার লিখুন<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-bold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{busy ? "অপেক্ষা করুন…" : mode === "login" ? "লগইন করুন" : "রেজিস্ট্রেশন করুন"}</button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          {mode === "login" ? "অ্যাকাউন্ট নেই?" : "আগে থেকেই অ্যাকাউন্ট আছে?"}{" "}
          <button type="button" onClick={() => { setError(""); onModeChange(mode === "login" ? "register" : "login"); }} className="font-bold text-emerald-700 underline">{mode === "login" ? "সাইন আপ করুন" : "লগইন করুন"}</button>
        </p>
      </section>
    </div>
  );
}
