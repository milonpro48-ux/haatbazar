import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { createOrder, startPayment, LOGIN_URL, type Listing } from "@/lib/api";
import { money, bn, unitLabel } from "@/lib/data";

const field = "w-full rounded-lg border bg-background px-3 py-2";

export function OrderDialog({ item, onClose, onDone }: { item: Listing; onClose: () => void; onDone: (msg: string) => void }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"later"|"bkash"|"nagad"|"rocket">("later");
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState("");
  const maxQty = Math.max(1, item.quantity);
  const q = Math.min(Math.max(1, Number.isFinite(qty) ? qty : 1), maxQty);
  const total = Math.round(item.price * q * 100) / 100;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const r = await createOrder({
      listingId: item.id, quantity: q,
      buyerName: String(f.get("name")), buyerPhone: String(f.get("phone")), buyerEmail: String(f.get("email")), address: String(f.get("address")),
    });
    setBusy(false);
    if (r.status !== "ok") {
      if (r.status === "login") {
        setNeedLogin(true);
      } else {
        setError("অর্ডার পাঠানো যায়নি। ইন্টারনেট সংযোগ ও সার্ভার পরীক্ষা করে আবার চেষ্টা করুন।");
      }
      return;
    }
    if (paymentMethod !== "later") {
      setPendingPaymentOrderId(r.id);
      setBusy(true);
      const redirect = await startPayment(r.id, paymentMethod);
      setBusy(false);
      if (redirect) { window.location.assign(redirect); return; }
      setError(`অর্ডার তৈরি হয়েছে (ID: ${r.id}), কিন্তু পেমেন্ট শুরু হয়নি। Gateway credentials, channel activation এবং ১০–৫০০,০০০ টাকার সীমা পরীক্ষা করুন।`);
      return;
    }
    onDone("অর্ডার পাঠানো হয়েছে ✓ বিক্রেতা শিগগিরই যোগাযোগ করবেন");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md space-y-3 rounded-2xl bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">🛒 অর্ডার করুন</h2>
          <button type="button" onClick={onClose} aria-label="বন্ধ"><X /></button>
        </div>
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950">
          <p className="font-semibold">{item.title}</p>
          <p className="text-sm text-muted-foreground">{money(item.price)} · {item.sellerName}</p>
        </div>
        <div className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">পরিমাণ (সর্বোচ্চ {bn(item.quantity)} {unitLabel(item.unit)})</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="পরিমাণ এক কমান" disabled={q <= 1} onClick={() => setQty(Math.max(1, q - 1))} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40"><Minus size={16}/></button>
              <input aria-label="পণ্যের পরিমাণ" type="number" min={1} max={maxQty} step="any" value={qty} onChange={(e) => setQty(e.target.value === "" ? 1 : Number(e.target.value))} onBlur={() => setQty(q)} className="w-20 rounded-lg border bg-background px-2 py-2 text-center font-semibold" />
              <button type="button" aria-label="পরিমাণ এক বাড়ান" disabled={q >= maxQty} onClick={() => setQty(Math.min(maxQty, q + 1))} className="grid h-9 w-9 place-items-center rounded-lg border disabled:opacity-40"><Plus size={16}/></button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div>
              <p className="text-sm text-muted-foreground">হিসাব: {money(item.price)} × {bn(q)}</p>
              <p className="text-sm text-muted-foreground">প্রতি পণ্যের দাম</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">মোট দাম (পরিমাণ অনুযায়ী)</p>
              <p aria-live="polite" className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">{money(total)}</p>
            </div>
          </div>
        </div>
        <input name="name" required placeholder="আপনার নাম" className={field} />
        <input name="phone" required inputMode="tel" pattern="^(?:\+?88)?01[3-9][0-9]{8}$" title="১১ সংখ্যার মোবাইল নম্বর" placeholder="ফোন নম্বর (01XXXXXXXXX)" className={field} />
        <input name="email" type="email" required placeholder="ইমেইল (পেমেন্ট রসিদের জন্য)" className={field} />
        <textarea name="address" required rows={2} placeholder="ডেলিভারির ঠিকানা" className={field} />
        <label className="block text-sm text-muted-foreground">পেমেন্ট পদ্ধতি
          <select disabled={!!pendingPaymentOrderId} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)} className={field}>
            <option value="later">অর্ডার দিন, পরে পেমেন্ট</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">অনলাইন পেমেন্টের জন্য ব্যবসায়িক SSLCommerz অ্যাকাউন্ট ও সংশ্লিষ্ট চ্যানেল সক্রিয় থাকতে হবে।</p>
        {needLogin && <p className="text-sm text-amber-600">অর্ডার দিতে আগে <a className="underline" href={LOGIN_URL}>লগইন করুন</a>।</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {pendingPaymentOrderId && paymentMethod !== "later" && <button type="button" disabled={busy} onClick={async()=>{setBusy(true);const url=await startPayment(pendingPaymentOrderId,paymentMethod);setBusy(false);if(url)window.location.assign(url);else setError("পেমেন্ট এখনও শুরু হয়নি। Gateway configuration পরীক্ষা করুন অথবা অর্ডার ID দিয়ে সহায়তা নিন।");}} className="w-full rounded-lg border py-2.5 font-semibold">পেমেন্ট আবার চেষ্টা করুন</button>}
        <button disabled={busy || !!pendingPaymentOrderId} className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white disabled:opacity-60">
          {busy ? "পাঠানো হচ্ছে…" : `অর্ডার নিশ্চিত করুন (${bn(q)} ${unitLabel(item.unit)})`}
        </button>
      </form>
    </div>
  );
}
