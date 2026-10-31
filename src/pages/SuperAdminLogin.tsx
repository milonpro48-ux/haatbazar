import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, LockKeyhole, Eye, EyeOff, Fingerprint, Smartphone, Activity, Server, Database, Network, CheckCircle2, AlertTriangle } from "lucide-react";

const SESSION_KEY = "haatbazar_super_admin_demo_session_v1";
const DEMO_EMAIL = "admin@haatbazar.com";
const DEMO_PASSWORD = "HaatBazarDemo!2026";
const DEMO_OTP = "123456";

export default function SuperAdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<"credentials" | "otp">("credentials");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submitCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setNotice("");
    if (email.trim().toLowerCase() !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
      setError("ডেমো Admin ID বা Password মিলছে না। নিচে দেখানো ডেমো তথ্য ব্যবহার করুন।"); return;
    }
    setOtp("");
    setStage("otp");
    setNotice("Admin ID ও Password যাচাই হয়েছে। এখন ৬ সংখ্যার ডেমো OTP দিন।");
  }
  function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (otp !== DEMO_OTP) { setError("OTP মেলেনি। ডেমো পরীক্ষার জন্য 123456 লিখুন।"); return; }
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: DEMO_EMAIL, verifiedAt: new Date().toISOString(), demoOnly: true }));
    setLocation("/admin");
  }
  return <main className="min-h-screen overflow-hidden bg-[#050a10] text-slate-100">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_15%_5%,rgba(6,182,212,0.12),transparent_40%),radial-gradient(ellipse_at_85%_90%,rgba(20,184,166,0.10),transparent_42%)]"/>
    <header className="relative border-b border-cyan-300/15 bg-[#08141e]/90 px-4 py-3 sm:px-7">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.15)]"><ShieldCheck size={27}/></div><div><div className="text-xl font-black text-emerald-300">HaatBazar <span className="text-cyan-300">হাটবাজার</span></div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-slate-400">Secure Admin Portal</div></div></div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]"><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-emerald-300"><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/>DEMO SYSTEM ONLINE</span><span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-cyan-100">TLS / BROWSER DEMO</span></div>
      </div>
    </header>
    <div className="relative mx-auto grid max-w-[1500px] gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(380px,1fr)_minmax(0,1.4fr)] lg:p-8">
      <section className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#0b1822]/95 shadow-[0_20px_80px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between border-b border-cyan-200/15 bg-[#102431] px-5 py-3"><h1 className="text-xs font-extrabold uppercase tracking-wide">Secure Admin Login & 2FA Panel</h1><span className="text-xs text-cyan-300">•••</span></div>
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-cyan-200/20 bg-gradient-to-r from-cyan-300/10 to-teal-300/5 p-4"><LockKeyhole size={32} className="shrink-0 text-cyan-200"/><div><h2 className="font-bold leading-tight">{stage === "credentials" ? "ADMIN LOGIN" : "TWO-FACTOR AUTHENTICATION"}</h2><p className="mt-1 text-xs text-slate-400">{stage === "credentials" ? "Admin identity verification" : "Enter the 6-digit demo verification code"}</p></div></div>
          {stage === "credentials" ? <form onSubmit={submitCredentials} className="space-y-4">
            <label className="block text-sm text-slate-300">Admin ID / Email<input autoComplete="username" type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-600 bg-[#0c202c] px-3 py-3 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/15" /></label>
            <label className="block text-sm text-slate-300">Password<span className="relative mt-1.5 block"><input autoComplete="current-password" required minLength={8} type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-[#0c202c] px-3 py-3 pr-12 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/15"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"পাসওয়ার্ড লুকান":"পাসওয়ার্ড দেখান"} className="absolute right-3 top-3 text-slate-400">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>
            <button className="w-full rounded-lg bg-gradient-to-r from-teal-400 to-cyan-400 px-4 py-3 font-extrabold text-[#05202a] shadow-[0_0_28px_rgba(45,212,191,.16)] transition hover:brightness-110">VERIFY ADMIN ID <span className="float-right">→</span></button>
          </form> : <form onSubmit={verifyOtp} className="space-y-4">
            <div className="rounded-xl border border-teal-300/30 bg-teal-300/5 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-bold text-teal-200"><Smartphone size={18}/> Demo Two-Factor Authentication</div><p className="text-xs text-slate-300">পরীক্ষার OTP লিখুন। এই কোড কোনো SMS বা ফোনে পাঠানো হয় না।</p><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required aria-label="৬ সংখ্যার ডেমো OTP" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="— — — — — —" className="mt-4 w-full rounded-lg border border-teal-300/50 bg-[#071820] px-4 py-4 text-center font-mono text-2xl tracking-[.45em] text-teal-200 outline-none focus:ring-2 focus:ring-teal-300/20" /></div>
            <button className="w-full rounded-lg bg-gradient-to-r from-teal-400 to-cyan-400 px-4 py-3 font-extrabold text-[#05202a] transition hover:brightness-110">VERIFY & ACCESS <span className="float-right">✓</span></button>
            <button type="button" onClick={()=>{setStage("credentials");setOtp("");setError("");setNotice("");}} className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">← Back to Admin Login</button>
          </form>}
          {error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-lg border border-teal-300/25 bg-teal-300/5 p-3 text-xs text-teal-100">{notice}</p>}
          <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4"><p className="flex items-center gap-2 text-xs font-bold text-amber-200"><AlertTriangle size={16}/> Demo credentials — not production security</p><div className="mt-2 grid gap-1 text-xs text-slate-300"><p>Admin ID: <code className="text-cyan-100">{DEMO_EMAIL}</code></p><p>Password: <code className="text-cyan-100">{DEMO_PASSWORD}</code></p><p>Demo OTP: <code className="text-cyan-100">{DEMO_OTP}</code></p></div><p className="mt-3 text-[11px] leading-5 text-slate-400">এগুলো কেবল GitHub Pages ডেমোর স্থির নমুনা তথ্য। প্রকৃত OTP, সার্ভার-সাইড যাচাই বা বাস্তব অ্যাডমিন নিরাপত্তা নয়।</p></div>
        </div>
      </section>
      <section className="grid content-start gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-cyan-300/20 bg-[#0b1822]/90 p-5 sm:col-span-2"><div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-extrabold uppercase tracking-wide">Server-Side Permission Status</h2><span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] text-amber-200">SIMULATED</span></div><div className="grid gap-3 sm:grid-cols-2"><div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3"><CheckCircle2 className="text-teal-300"/><div><b className="text-sm">UI Access Controls</b><p className="text-xs text-slate-400">Demo interface only</p></div></div><div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3"><Server className="text-cyan-300"/><div><b className="text-sm">Server Status</b><p className="text-xs text-slate-400">Not verified by static site</p></div></div><div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3"><Database className="text-cyan-300"/><div><b className="text-sm">Database</b><p className="text-xs text-slate-400">No shared DB on Pages</p></div></div><div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3"><Network className="text-teal-300"/><div><b className="text-sm">Encryption / Session</b><p className="text-xs text-slate-400">Demo indicator only</p></div></div></div></article>
        <article className="rounded-2xl border border-cyan-300/20 bg-[#0b1822]/90 p-5"><h2 className="mb-4 text-xs font-extrabold uppercase tracking-wide">Vendor Approval Requests</h2>{["Dhaka Traders","Sarker Fashion","Bhai Bhai Enterprise"].map((name,i)=><div key={name} className="mb-2 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 p-3"><div><p className="text-sm font-bold">{name}</p><p className="text-xs text-slate-400">Sample vendor · demo</p></div><span className="rounded-md border border-cyan-300/20 px-2 py-1 text-[10px] text-cyan-200">REVIEW</span></div>)}</article>
        <article className="rounded-2xl border border-cyan-300/20 bg-[#0b1822]/90 p-5"><h2 className="mb-4 text-xs font-extrabold uppercase tracking-wide">Activity & Analytics</h2><div className="space-y-3 text-sm"><div className="flex items-center gap-3"><Activity className="text-teal-300"/><span>Demo session events</span></div><div className="h-2 rounded-full bg-slate-800"><div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400"/></div><div className="flex items-center gap-3"><Fingerprint className="text-cyan-300"/><span>Verification flow preview</span></div><p className="text-xs leading-5 text-slate-400">Metrics and security indicators shown here are illustrative, not live platform telemetry.</p></div></article>
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/50 p-4 text-xs leading-5 text-slate-400 sm:col-span-2">Security note: this is a visual and interaction demo. Never reuse these sample credentials on a production system.</div>
      </section>
    </div>
  </main>;
}
