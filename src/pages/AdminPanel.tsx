import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Package, ShoppingCart, Save, Trash2, Truck, ShieldAlert, Plus } from "lucide-react";
import { CATEGORIES, DISTRICTS, UNITS } from "@/lib/data";

type Product = { id:string; title:string; category:string; subcategory:string; district:string; price:number|string; quantity:number|string; status:string; sellerName:string; created_at:string };
type Order = { id:string; listing_id:string; listingTitle:string; buyer_name:string; buyer_phone:string; buyer_email:string; address:string; quantity:number|string; amount_bdt:number|string; status:string; payment_status:string; shipping_status:string; created_at:string; tracking_code?:string; consignment_id?:string };
type Props = { onBack:()=>void };
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
async function csrfHeaders() {
  const h:Record<string,string> = {"Content-Type":"application/json"};
  const r=await fetch("/api/csrf",{credentials:"include",cache:"no-store"});
  if(r.ok){const d=await r.json(); if(typeof d.csrf==="string") h["X-CSRF-Token"]=d.csrf;}
  return h;
}
async function request<T>(url:string,init?:RequestInit):Promise<T>{
  const r=await fetch(url,{credentials:"include",cache:"no-store",...init});
  const d=await r.json().catch(()=>({error:"Invalid server response"}));
  if(!r.ok) throw new Error(d.error || "Request failed");
  return d as T;
}
const money=(v:number|string)=>"৳ "+Number(v||0).toLocaleString("en-BD",{maximumFractionDigits:2});
export default function AdminPanel({onBack}:Props){
 const [tab,setTab]=useState<"products"|"orders">("products");
 const [products,setProducts]=useState<Product[]>([]);
 const [orders,setOrders]=useState<Order[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 const [showCreate,setShowCreate]=useState(false);
 const [newCategory,setNewCategory]=useState(CATEGORIES[0].key);
 const [newSubcategory,setNewSubcategory]=useState(CATEGORIES[0].subcategories[0]);
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");setNotice("");
  try{
   const [p,o]=await Promise.all([
    request<{items:Product[]}>("/api/admin/products?limit=100"),
    request<{items:Order[]}>("/api/admin/orders?limit=100")
   ]);
   setProducts(p.items||[]);setOrders(o.items||[]);
  }catch(e){setError(e instanceof Error?e.message:"Could not load admin data");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void refresh();},[refresh]);
 async function editProduct(p:Product,fieldName:"title"|"price"|"quantity"|"status",value:string){
  const updated={...p,[fieldName]:value};
  setProducts(old=>old.map(x=>x.id===p.id?updated:x));
 }
 async function createProduct(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);setBusy("create");setError("");setNotice("");
  try{await request("/api/admin/product-create",{method:"POST",headers:await csrfHeaders(),body:JSON.stringify({title:String(f.get("title")||""),category:newCategory,subcategory:newSubcategory,district:String(f.get("district")||""),price:Number(f.get("price")),unit:String(f.get("unit")||"piece"),quantity:Number(f.get("quantity")),description:String(f.get("description")||""),phone:String(f.get("phone")||""),sellerName:String(f.get("sellerName")||"HaatBazar Admin"),businessName:String(f.get("businessName")||""),saleType:String(f.get("saleType")||"both"),deliveryAvailable:f.get("deliveryAvailable")==="on"})});setShowCreate(false);e.currentTarget.reset();setNotice("নতুন পণ্য ডেটাবেসে যোগ হয়েছে।");await refresh();}
  catch(err){setError(err instanceof Error?err.message:"Product create failed");}
  finally{setBusy("");}
 }
 async function saveProduct(p:Product){
  setBusy(p.id);setError("");setNotice("");
  try{await request("/api/admin/product-update",{method:"POST",headers:await csrfHeaders(),body:JSON.stringify({id:p.id,title:p.title,price:Number(p.price),quantity:Number(p.quantity),status:p.status})});setNotice("পণ্যের পরিবর্তন ডেটাবেসে সংরক্ষিত হয়েছে।");await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Save failed");}
  finally{setBusy("");}
 }
 async function removeProduct(p:Product){
  if(!window.confirm("এই পণ্যটি সাইট থেকে সরিয়ে দেবেন?"))return;
  setBusy(p.id);setError("");setNotice("");
  try{await request("/api/admin/product-delete",{method:"POST",headers:await csrfHeaders(),body:JSON.stringify({id:p.id})});setNotice("পণ্যটি সরানো হয়েছে।");await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Delete failed");}
  finally{setBusy("");}
 }
 async function updateOrder(o:Order,status:string){
  setBusy(o.id);setError("");setNotice("");
  try{await request("/api/admin/order-status",{method:"POST",headers:await csrfHeaders(),body:JSON.stringify({order_id:o.id,status})});setNotice("অর্ডারের স্ট্যাটাস সংরক্ষিত হয়েছে।");await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Update failed");}
  finally{setBusy("");}
 }
 async function bookCourier(o:Order){
  setBusy(o.id);setError("");setNotice("");
  try{const d=await request<{ok:boolean;consignment_id?:string;tracking_code?:string}>("/api/admin/ship-order",{method:"POST",headers:await csrfHeaders(),body:JSON.stringify({order_id:o.id})});setNotice("Steadfast-এ পার্সেল বুকিং সফল হয়েছে। "+(d.tracking_code||d.consignment_id||""));await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Courier booking failed");}
  finally{setBusy("");}
 }
 return <div className="min-h-screen bg-background text-foreground">
  <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3"><div className="flex items-center gap-3"><button onClick={onBack} className="rounded-lg border p-2" aria-label="ফিরে যান"><ArrowLeft size={18}/></button><div><h1 className="text-xl font-bold">হাটবাজার · অ্যাডমিন প্যানেল</h1><p className="text-xs text-muted-foreground">পণ্য, অর্ডার ও কুরিয়ার পরিচালনা</p></div></div><button onClick={()=>void refresh()} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw size={15}/> রিফ্রেশ</button></div></header>
  <main className="mx-auto max-w-7xl space-y-4 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2"><button onClick={()=>setTab("products") className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${tab==="products"?"bg-emerald-700 text-white":""}`}><Package size={16}/> পণ্য পরিচালনা ({products.length})</button><button onClick={()=>setTab("orders")} className={`flex items-center gap-2 rounded-lg border px-4 py-2 ${tab==="orders"?"bg-emerald-700 text-white":""}`}><ShoppingCart size={16}/> অর্ডার পরিচালনা ({orders.length})</button></div>{tab==="products"&&<button onClick={()=>setShowCreate(v=>!v)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"><Plus size={16}/>{showCreate?"ফর্ম বন্ধ":"নতুন পণ্য যোগ করুন"}</button>}</div>
   {showCreate&&tab==="products"&&<form onSubmit={e=>void createProduct(e)} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2"><h2 className="font-bold sm:col-span-2">নতুন পণ্য যোগ করুন</h2><input name="title" required minLength={3} maxLength={120} placeholder="পণ্যের নাম" className={field}/><input name="phone" required pattern="^(?:\\+?88)?01[3-9][0-9]{8}$" placeholder="বিক্রেতার মোবাইল নম্বর" className={field}/><select className={field} value={newCategory} onChange={e=>{const v=e.target.value;setNewCategory(v);setNewSubcategory(CATEGORIES.find(c=>c.key===v)?.subcategories[0]||"");}}>{CATEGORIES.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}</select><select className={field} value={newSubcategory} onChange={e=>setNewSubcategory(e.target.value)}>{(CATEGORIES.find(c=>c.key===newCategory)?.subcategories||[]).map(x=><option key={x} value={x}>{x}</option>)}</select><select name="district" required className={field}>{DISTRICTS.map(d=><option key={d} value={d}>{d}</option>)}</select><select name="unit" className={field}>{Object.entries(UNITS).map(([k,v])=><option key={k} value={k}>প্রতি {v}</option>)}</select><input name="price" type="number" min="0" required placeholder="দাম (৳)" className={field}/><input name="quantity" type="number" min="0" required placeholder="মজুদ পরিমাণ" defaultValue={1} className={field}/><input name="sellerName" placeholder="বিক্রেতার নাম" className={field}/><input name="businessName" placeholder="দোকান/প্রতিষ্ঠানের নাম (ঐচ্ছিক)" className={field}/><select name="saleType" className={field}><option value="both">খুচরা ও পাইকারি</option><option value="retail">শুধু খুচরা</option><option value="wholesale">শুধু পাইকারি</option></select><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="deliveryAvailable"/> ডেলিভারি দেওয়া যাবে</label><textarea name="description" required minLength={10} maxLength={2000} placeholder="পণ্যের বিবরণ (কমপক্ষে ১০ অক্ষর)" className={field+" sm:col-span-2"}/><button disabled={!!busy} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy==="create"?"সংরক্ষণ হচ্ছে…":"পণ্য যোগ করুন"}</button></form>}
   {error&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800"><ShieldAlert className="mr-2 inline" size={16}/>{error}{/admin_required|Please log in|login/i.test(error)&&<a className="ml-2 underline" href="/api/login?returnTo=%2Fadmin">অ্যাডমিন লগইন</a>}</div>}
   {notice&&<p role="status" className="rounded-xl border p-3 text-sm">{notice}</p>}
   {loading?<p className="py-12 text-center">সার্ভার থেকে ডেটা আনা হচ্ছে…</p>:tab==="products"?<div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted"><tr><th className="p-3 text-left">পণ্য</th><th className="p-3 text-left">দাম (৳)</th><th className="p-3 text-left">স্টক</th><th className="p-3 text-left">অবস্থা</th><th className="p-3 text-left">কাজ</th></tr></thead><tbody>{products.map(p=><tr key={p.id} className="border-t align-top"><td className="max-w-xs p-3"><p className="font-semibold">{p.title}</p><p className="mt-1 text-xs text-muted-foreground">{p.category} · {p.district} · {p.sellerName}</p><p className="mt-1 break-all text-[11px] text-muted-foreground">ID: {p.id}</p><input className={`${field} mt-2`} aria-label="পণ্যের নাম" value={p.title} onChange={e=>void editProduct(p,"title",e.target.value)}/></td><td className="p-3"><input className={field} type="number" min="0" value={p.price} onChange={e=>void editProduct(p,"price",e.target.value)}/></td><td className="p-3"><input className={field} type="number" min="0" value={p.quantity} onChange={e=>void editProduct(p,"quantity",e.target.value)}/></td><td className="p-3"><select className={field} value={p.status} onChange={e=>void editProduct(p,"status",e.target.value)}><option value="active">সক্রিয়</option><option value="paused">বন্ধ</option><option value="sold">বিক্রি শেষ</option><option value="removed">সরানো</option></select></td><td className="p-3"><div className="flex gap-2"><button disabled={!!busy} onClick={()=>void saveProduct(p)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-white disabled:opacity-50"><Save size={14}/> সেভ</button><button disabled={!!busy} onClick={()=>void removeProduct(p)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 disabled:opacity-50"><Trash2 size={14}/> সরান</button></div></td></tr>)}</tbody></table>{!products.length&&<p className="p-6 text-center text-sm text-muted-foreground">কোনো পণ্য পাওয়া যায়নি।</p>}</div>:<div className="space-y-3">{orders.map(o=><article key={o.id} className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{o.listingTitle||o.listing_id}</h2><p className="mt-1 text-xs text-muted-foreground">Order: {o.id} · {new Date(o.created_at).toLocaleString("bn-BD")}</p><p className="mt-2 text-sm">{o.buyer_name} · {o.buyer_phone}</p><p className="text-sm text-muted-foreground">{o.address}</p></div><div className="text-right"><p className="text-lg font-bold">{money(o.amount_bdt)}</p><p className="text-xs">Qty: {o.quantity} · {o.payment_status}</p></div></div><div className="mt-4 flex flex-wrap items-center gap-2"><label className="text-sm">স্ট্যাটাস <select className={field+" mt-1"} value={o.status} disabled={!!busy} onChange={e=>void updateOrder(o,e.target.value)}>{["pending","confirmed","processing","shipped","delivered","cancelled"].map(s=><option key={s} value={s}>{s}</option>)}</select></label><button disabled={!!busy||!!(o.tracking_code||o.consignment_id)||o.status==="cancelled"} onClick={()=>void bookCourier(o)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-white disabled:opacity-50"><Truck size={15}/> {o.tracking_code||o.consignment_id?"কুরিয়ার বুক হয়েছে":"Steadfast বুক করুন"}</button></div>{(o.tracking_code||o.consignment_id)&&<p className="mt-2 text-sm">Tracking: {o.tracking_code||"—"} · Consignment: {o.consignment_id||"—"}</p>}</article>)}{!orders.length&&<p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">কোনো অর্ডার পাওয়া যায়নি।</p>}</div>}
  </main>
 </div>;
}
