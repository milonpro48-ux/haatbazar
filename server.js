import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import catalog from './server/catalog.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProd = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
if (isProd) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters in production');
  if (!process.env.PUBLIC_BASE_URL || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('PUBLIC_BASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD are required in production');
  if (!process.env.BUSINESS_LEGAL_NAME || !process.env.BUSINESS_ADDRESS || !process.env.BUSINESS_PHONE || !process.env.SUPPORT_EMAIL || !process.env.TRADE_LICENSE_NO) throw new Error('BUSINESS_LEGAL_NAME, BUSINESS_ADDRESS, BUSINESS_PHONE, SUPPORT_EMAIL and TRADE_LICENSE_NO must be set before production launch');
}
const dataDir = path.resolve(process.env.DATA_DIR || './data');
const uploadDir = path.join(dataDir, 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'haatbazar.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
 phone TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'seller' CHECK(role IN ('buyer','seller','admin')),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS listings (
 id TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
 title TEXT NOT NULL, category TEXT NOT NULL, subcategory TEXT NOT NULL, district TEXT NOT NULL,
 upazila TEXT, price REAL NOT NULL CHECK(price >= 0), unit TEXT NOT NULL, quantity REAL NOT NULL CHECK(quantity >= 0),
 negotiable INTEGER NOT NULL DEFAULT 0, sellerName TEXT NOT NULL, businessName TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL, images TEXT NOT NULL DEFAULT '[]', phone TEXT NOT NULL,
 saleType TEXT NOT NULL DEFAULT 'both' CHECK(saleType IN ('retail','wholesale','both')),
 minOrderQuantity REAL NOT NULL DEFAULT 1, deliveryAvailable INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','sold','removed')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_listings_status_category ON listings(status, category);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings(district);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id), buyer_id INTEGER REFERENCES users(id),
 quantity REAL NOT NULL, buyer_name TEXT NOT NULL, buyer_phone TEXT NOT NULL, address TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS analytics_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, listing_id TEXT, category TEXT,
 visitor_id TEXT, user_id INTEGER, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
CREATE TABLE IF NOT EXISTS uploaded_images (
 name TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, claimed INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_owner ON uploaded_images(user_id, claimed);
CREATE TABLE IF NOT EXISTS marketing_settings (id INTEGER PRIMARY KEY CHECK(id=1), spend_bdt REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS otp_challenges (
 id TEXT PRIMARY KEY, phone TEXT NOT NULL, purpose TEXT NOT NULL CHECK(purpose IN ('verify_phone','password_reset')),
 code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, consumed INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose ON otp_challenges(phone,purpose,created_at);
CREATE TABLE IF NOT EXISTS seller_verifications (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 business_name TEXT NOT NULL, nid_last4 TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewer_note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS payment_transactions (
 id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), provider TEXT NOT NULL, requested_method TEXT NOT NULL,
 gateway_transaction_id TEXT NOT NULL UNIQUE, gateway_val_id TEXT, amount_bdt REAL NOT NULL,
 status TEXT NOT NULL DEFAULT 'initiated' CHECK(status IN ('initiated','pending','paid','failed','cancelled')),
 gateway_payload TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS courier_shipments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id), provider TEXT NOT NULL,
 consignment_id TEXT, tracking_code TEXT, status TEXT NOT NULL DEFAULT 'requested', response_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO marketing_settings(id,spend_bdt) VALUES(1,0);
`);

function ensureColumn(table, column, definition) {
 const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name);
 if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
ensureColumn('users','phone_verified','INTEGER NOT NULL DEFAULT 0');
ensureColumn('orders','amount_bdt','REAL NOT NULL DEFAULT 0');
ensureColumn('orders','buyer_email',"TEXT NOT NULL DEFAULT ''");
ensureColumn('orders','payment_status',"TEXT NOT NULL DEFAULT 'unpaid'");
ensureColumn('orders','shipping_status',"TEXT NOT NULL DEFAULT 'not_requested'");
ensureColumn('orders','updated_at',"TEXT NOT NULL DEFAULT ''");
db.prepare("UPDATE orders SET updated_at=datetime('now') WHERE updated_at=''").run();
const insertUser = db.prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)');
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && !db.prepare('SELECT id FROM users WHERE email=?').get(process.env.ADMIN_EMAIL.toLowerCase())) {
  if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  insertUser.run(process.env.ADMIN_NAME || 'HaatBazar Admin', process.env.ADMIN_EMAIL.toLowerCase(), '', bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12), 'admin');
}
const SQLiteStore = SQLiteStoreFactory(session);
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir, concurrentDB: true }),
  name: 'hb.sid', secret: process.env.SESSION_SECRET || 'local-dev-only-change-this-secret',
  resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

const fail = (res, status, error) => res.status(status).json({ error });
const signedIn = (req, res, next) => req.session.user ? next() : fail(res, 401, 'login_required');
const adminOnly = (req, res, next) => req.session.user?.role === 'admin' ? next() : fail(res, 403, 'admin_required');
const validPhone = p => /^(?:\+?88)?01[3-9]\d{8}$/.test(String(p || '').replace(/[\s-]/g, ''));
const validListing = b => {
 const c = catalog.categories.find(x => x.key === b.category);
 const validUnits = ['kg','maund','ton','piece','dozen','liter','bag','hali','box','set','hour','day','month'];
 return c && c.subcategories.includes(b.subcategory) && catalog.districts.includes(b.district) &&
  String(b.title || '').trim().length >= 3 && String(b.title).length <= 120 && String(b.description || '').trim().length >= 10 &&
  Number.isFinite(Number(b.price)) && Number(b.price) >= 0 && Number(b.price) <= 100000000000 && Number.isFinite(Number(b.quantity)) && Number(b.quantity) >= 0 && Number(b.quantity) <= 100000000 && validUnits.includes(b.unit) &&
  ['retail','wholesale','both'].includes(b.saleType) && Number(b.minOrderQuantity) >= 1 && validPhone(b.phone) &&
  Array.isArray(b.images) && b.images.length <= 5 && b.images.every(x => typeof x === 'string' && /^\/api\/storage\/public-objects\/[a-f0-9-]+\.(jpg|png|webp)$/.test(x));
};
const publicListing = row => { const { phone, user_id, ...safe } = row; const verification = user_id ? db.prepare("SELECT status FROM seller_verifications WHERE user_id=?").get(user_id) : null; return { ...safe, sellerVerified: verification?.status === 'approved', images: JSON.parse(row.images || '[]'), negotiable: !!row.negotiable, deliveryAvailable: !!row.deliveryAvailable, price: Number(row.price), quantity: Number(row.quantity), minOrderQuantity: Number(row.minOrderQuantity) }; };
const getListing = db.prepare("SELECT * FROM listings WHERE id=? AND status='active'");
const logEvent = db.prepare('INSERT INTO analytics_events(event_type,listing_id,category,visitor_id,user_id,metadata) VALUES(?,?,?,?,?,?)');
function event(req, type, listingId, category, metadata = {}) {
  const visitorId = String(req.headers['x-visitor-id'] || req.sessionID || '').slice(0, 100);
  logEvent.run(type, listingId || null, category || null, visitorId, req.session.user?.id || null, JSON.stringify(metadata));
}

app.get('/api/healthz', (_req,res) => res.json({ status:'ok', service:'haatbazar', time:new Date().toISOString() }));
app.get('/api/catalog', (_req,res) => res.json(catalog));
app.get('/api/me', (req,res) => res.json({ user: req.session.user || null }));
app.get('/api/login', (req,res) => {
 const ret = String(req.query.returnTo || '/').replace(/[<>"']/g,'');
 res.type('html').send(authPage('লগইন করুন', `<form method="post" action="/api/login"><input type="hidden" name="returnTo" value="${ret}"><label>ইমেইল<input name="email" type="email" required autocomplete="email"></label><label>পাসওয়ার্ড<input name="password" type="password" required autocomplete="current-password"></label><button>লগইন</button></form><p>নতুন? <a href="/api/register">বিক্রেতা/ক্রেতা অ্যাকাউন্ট খুলুন</a></p>`));
});
app.get('/api/register', (_req,res) => res.type('html').send(authPage('নতুন অ্যাকাউন্ট', `<form id="register-form" method="post" action="/api/register"><label>আপনার নাম<input name="name" required minlength="2" maxlength="100"></label><label>ইমেইল<input name="email" type="email" required maxlength="200"></label><label>মোবাইল<input id="register-phone" name="phone" required placeholder="01712345678"></label><div class="row"><button type="button" id="send-otp">SMS OTP পাঠান</button></div><label>SMS OTP<input id="register-otp" inputmode="numeric" maxlength="6" placeholder="৬ সংখ্যার কোড"></label><button type="button" id="verify-otp">OTP যাচাই করুন</button><p id="otp-status" aria-live="polite"></p><label>পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)<input name="password" type="password" required minlength="12" autocomplete="new-password"></label><label>অ্যাকাউন্টের ধরন<select name="role"><option value="buyer">ক্রেতা</option><option value="seller">বিক্রেতা</option></select></label><button>অ্যাকাউন্ট তৈরি করুন</button></form><p>আগে অ্যাকাউন্ট আছে? <a href="/api/login">লগইন</a> · <a href="/api/password-reset">পাসওয়ার্ড ভুলে গেছেন?</a></p><script>
const statusEl=document.getElementById('otp-status');document.getElementById('send-otp').onclick=async()=>{const phone=document.getElementById('register-phone').value;const r=await fetch('/api/otp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,purpose:'verify_phone'})});const d=await r.json();statusEl.textContent=r.ok?'OTP পাঠানো হয়েছে। SMS দেখে কোড দিন।':(d.error||'OTP পাঠানো যায়নি। SMS সেটআপ পরীক্ষা করুন।')};document.getElementById('verify-otp').onclick=async()=>{const phone=document.getElementById('register-phone').value,code=document.getElementById('register-otp').value;const r=await fetch('/api/otp/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,code,purpose:'verify_phone'})});const d=await r.json();statusEl.textContent=r.ok?'মোবাইল নম্বর যাচাই হয়েছে।':'OTP সঠিক নয় বা মেয়াদ শেষ।';};
</script>`)));
function authPage(title, body) { return `<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | হাটবাজার</title><style>body{font-family:system-ui,sans-serif;background:#f4f8f4;margin:0;color:#153c2a}.wrap{max-width:420px;margin:8vh auto;padding:28px;background:white;border:1px solid #dbe8de;border-radius:18px;box-shadow:0 8px 35px #1232}h1{font-size:26px}label{display:block;margin:14px 0;font-size:14px}input,select{display:block;box-sizing:border-box;width:100%;margin-top:6px;padding:12px;border:1px solid #cbd5cf;border-radius:8px;font:inherit}button{width:100%;padding:13px;background:#087443;color:white;border:0;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer}a{color:#087443}</style><main class="wrap"><a href="/">← হাটবাজার</a><h1>${title}</h1>${body}</main></html>`; }
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const orderRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.post('/api/register', authRateLimit, async (req,res) => {
 const name=String(req.body.name||'').trim(), email=String(req.body.email||'').trim().toLowerCase(), phone=String(req.body.phone||'').replace(/[\s-]/g,''), password=String(req.body.password||''), role=['buyer','seller'].includes(req.body.role)?req.body.role:'buyer';
 if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>200||!validPhone(phone)||password.length<12||password.length>200) return res.status(400).type('html').send(authPage('তথ্য ঠিক করুন','<p>নাম, ইমেইল, বাংলাদেশি মোবাইল নম্বর এবং কমপক্ষে ১২ অক্ষরের পাসওয়ার্ড দিন।</p><a href="/api/register">আবার চেষ্টা করুন</a>'));
 if(process.env.SMS_API_URL && !req.session.verifiedPhones?.includes(phone.replace(/[\s-]/g,''))) return res.status(400).type('html').send(authPage('মোবাইল যাচাই দরকার','<p>অ্যাকাউন্ট তৈরির আগে SMS OTP দিয়ে মোবাইল যাচাই করুন।</p><a href="/api/register">ফিরে যান</a>'));
 try { const info=insertUser.run(name,email,phone,bcrypt.hashSync(password,12),role); if(process.env.SMS_API_URL) db.prepare('UPDATE users SET phone_verified=1 WHERE id=?').run(Number(info.lastInsertRowid)); const user={id:Number(info.lastInsertRowid),name,email,role}; req.session.regenerate(err=>{if(err)return res.status(500).send('Session error');req.session.user=user;if(role==='seller') event(req,'seller_signup',null,null);req.session.save(()=>res.redirect('/'));}); }
 catch { res.status(409).type('html').send(authPage('অ্যাকাউন্ট তৈরি হয়নি','<p>এই ইমেইল দিয়ে অ্যাকাউন্ট থাকতে পারে।</p><a href="/api/login">লগইন করুন</a>')); }
});
app.post('/api/login', authRateLimit, async (req,res) => {
 const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!u || !bcrypt.compareSync(password,u.password_hash)) return res.status(401).type('html').send(authPage('লগইন ব্যর্থ','<p>ইমেইল বা পাসওয়ার্ড সঠিক নয়।</p><a href="/api/login">আবার চেষ্টা করুন</a>'));
 req.session.regenerate(err=>{if(err)return res.status(500).send('Session error');req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};req.session.save(()=>res.redirect((String(req.body.returnTo||'/').startsWith('/')&&!String(req.body.returnTo||'/').startsWith('//'))?String(req.body.returnTo||'/'):'/'));});
});
app.post('/api/logout', signedIn, (req,res)=>req.session.destroy(()=>res.clearCookie('hb.sid').json({ok:true})));

// --- SMS OTP and password reset. Configure an SMS HTTP gateway; no OTP is logged or returned in production. ---
const otpRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
async function sendSms(phone, message) {
 if (!process.env.SMS_API_URL || !process.env.SMS_API_KEY) throw new Error('sms_not_configured');
 const response = await fetch(process.env.SMS_API_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.SMS_API_KEY}`}, body:JSON.stringify({to:phone,message}) , signal:AbortSignal.timeout(10000)});
 if (!response.ok) throw new Error('sms_gateway_failed');
 return true;
}
app.post('/api/otp/send', otpRateLimit, async (req,res)=>{
 const phone=String(req.body?.phone||'').replace(/[\s-]/g,''); const purpose=String(req.body?.purpose||'verify_phone');
 if(!validPhone(phone)||!['verify_phone','password_reset'].includes(purpose)) return fail(res,400,'invalid_phone_or_purpose');
 if(!process.env.SMS_API_URL||!process.env.SMS_API_KEY) return fail(res,503,'sms_not_configured');
 if(purpose==='password_reset'&&!db.prepare('SELECT id FROM users WHERE phone=?').get(phone)) return res.status(202).json({ok:true,message:'যদি নম্বরটি নিবন্ধিত হয়, OTP পাঠানো হবে।'});
 const code=String(crypto.randomInt(0,1000000)).padStart(6,'0'); const id=crypto.randomUUID();
 db.prepare('INSERT INTO otp_challenges(id,phone,purpose,code_hash,expires_at) VALUES(?,?,?,?,?)').run(id,phone,purpose,crypto.createHash('sha256').update(`${id}:${code}`).digest('hex'),Date.now()+5*60*1000);
 try { await sendSms(phone,`HaatBazar verification code: ${code}. Valid for 5 minutes. Do not share it.`); res.json({ok:true,message:'OTP পাঠানো হয়েছে।'}); }
 catch(e){db.prepare('DELETE FROM otp_challenges WHERE id=?').run(id);return fail(res,502,'sms_delivery_failed');}
});
app.post('/api/otp/verify', otpRateLimit, (req,res)=>{
 const phone=String(req.body?.phone||'').replace(/[\s-]/g,''); const code=String(req.body?.code||''); const purpose=String(req.body?.purpose||'verify_phone');
 const challenge=db.prepare('SELECT * FROM otp_challenges WHERE phone=? AND purpose=? AND consumed=0 ORDER BY created_at DESC LIMIT 1').get(phone,purpose);
 if(!challenge||challenge.expires_at<Date.now()||challenge.attempts>=5){return fail(res,400,'otp_expired_or_invalid');}
 const digest=crypto.createHash('sha256').update(`${challenge.id}:${code}`).digest('hex');
 if(!/^[0-9]{6}$/.test(code)||digest!==challenge.code_hash){db.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=?').run(challenge.id);return fail(res,400,'otp_expired_or_invalid');}
 db.prepare('UPDATE otp_challenges SET consumed=1 WHERE id=?').run(challenge.id);
 if(purpose==='verify_phone'){req.session.verifiedPhones=[...(req.session.verifiedPhones||[]).filter(p=>p!==phone),phone];return req.session.save(err=>err?fail(res,500,'session_save_failed'):res.json({ok:true,verified:true}));}
 req.session.resetVerifiedPhone=phone;req.session.resetVerifiedAt=Date.now();req.session.save(err=>err?fail(res,500,'session_save_failed'):res.json({ok:true,verified:true}));
});
app.get('/api/password-reset', (_req,res)=>res.type('html').send(authPage('পাসওয়ার্ড রিসেট', `<form id="reset-form"><label>নিবন্ধিত মোবাইল<input id="reset-phone" required placeholder="01712345678"></label><button type="button" id="reset-send">OTP পাঠান</button><label>SMS OTP<input id="reset-code" required inputmode="numeric" maxlength="6"></label><button type="button" id="reset-verify">OTP যাচাই</button><label>নতুন পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)<input id="reset-password" type="password" required minlength="12"></label><button type="submit">পাসওয়ার্ড বদলান</button><p id="reset-status" aria-live="polite"></p></form><script>const rs=document.getElementById('reset-status');document.getElementById('reset-send').onclick=async()=>{const r=await fetch('/api/otp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('reset-phone').value,purpose:'password_reset'})});const d=await r.json();rs.textContent=r.ok?'নম্বরটি নিবন্ধিত থাকলে OTP পাঠানো হবে।':(d.error||'অনুরোধ ব্যর্থ')};document.getElementById('reset-verify').onclick=async()=>{const r=await fetch('/api/otp/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:document.getElementById('reset-phone').value,code:document.getElementById('reset-code').value,purpose:'password_reset'})});rs.textContent=r.ok?'যাচাই হয়েছে; এখন নতুন পাসওয়ার্ড দিন।':'OTP সঠিক নয় বা মেয়াদ শেষ'};document.getElementById('reset-form').onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/password-reset/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('reset-password').value})});rs.textContent=r.ok?'পাসওয়ার্ড বদলেছে। এখন লগইন করুন।':'প্রথমে OTP যাচাই করুন অথবা পাসওয়ার্ড নীতিমালা দেখুন'};</script>`)));
app.post('/api/password-reset/confirm', otpRateLimit, (req,res)=>{
 const phone=req.session.resetVerifiedPhone; if(!phone||Date.now()-Number(req.session.resetVerifiedAt||0)>10*60*1000)return fail(res,401,'otp_verification_required');
 const password=String(req.body?.password||'');if(password.length<12||password.length>200)return fail(res,400,'password_must_be_12_to_200_chars');
 db.prepare('UPDATE users SET password_hash=? WHERE phone=?').run(bcrypt.hashSync(password,12),phone);delete req.session.resetVerifiedPhone;delete req.session.resetVerifiedAt;
 req.session.destroy(()=>res.json({ok:true}));
});

// Seller verification: manual review workflow; never upload/store raw NID images in this MVP.
app.post('/api/seller/verification', signedIn, (req,res)=>{
 if(!['seller','admin'].includes(req.session.user.role))return fail(res,403,'seller_account_required');
 const businessName=String(req.body?.businessName||'').trim(), nidLast4=String(req.body?.nidLast4||'').trim();
 if(businessName.length<2||businessName.length>120||!/^\d{4}$/.test(nidLast4))return fail(res,400,'business_name_and_nid_last4_required');
 db.prepare(`INSERT INTO seller_verifications(user_id,business_name,nid_last4,status,reviewer_note,reviewed_at) VALUES(?,?,?,'pending','',NULL) ON CONFLICT(user_id) DO UPDATE SET business_name=excluded.business_name,nid_last4=excluded.nid_last4,status='pending',reviewer_note='',reviewed_at=NULL`).run(req.session.user.id,businessName,nidLast4);
 res.status(202).json({ok:true,status:'pending',message:'পরিচয় যাচাইয়ের অনুরোধ জমা হয়েছে; অ্যাডমিন ম্যানুয়ালি যাচাই করবেন।'});
});
app.get('/api/admin/seller-verifications', signedIn, adminOnly, (_req,res)=>res.json({items:db.prepare(`SELECT v.id,v.user_id,u.name,u.email,u.phone,v.business_name,v.nid_last4,v.status,v.reviewer_note,v.created_at FROM seller_verifications v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 200`).all()}));
app.get('/api/admin/seller-verifications/page', signedIn, adminOnly, (_req,res)=>{const rows=db.prepare(`SELECT v.id,v.user_id,u.name,u.email,u.phone,v.business_name,v.nid_last4,v.status,v.reviewer_note,v.created_at FROM seller_verifications v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 200`).all();res.type('html').send(authPage('বিক্রেতা যাচাইয়ের আবেদন',`<p><a href="/api/admin/dashboard">অ্যাডমিন ড্যাশবোর্ডে ফিরুন</a></p>${rows.length?rows.map(v=>`<section style="border:1px solid #dbe8de;border-radius:12px;padding:14px;margin:12px 0"><h2>${escapeXml(v.business_name)}</h2><p>${escapeXml(v.name)} · ${escapeXml(v.email)} · ${escapeXml(v.phone||'')}<br>NID শেষ ৪ সংখ্যা: ${escapeXml(v.nid_last4)}<br>অবস্থা: <strong>${escapeXml(v.status)}</strong></p><form method="post" action="/api/admin/seller-verifications/review"><input type="hidden" name="id" value="${v.id}"><label>অবস্থা<select name="status"><option value="pending" ${v.status==='pending'?'selected':''}>অপেক্ষমাণ</option><option value="approved" ${v.status==='approved'?'selected':''}>অনুমোদন</option><option value="rejected" ${v.status==='rejected'?'selected':''}>প্রত্যাখ্যান</option></select></label><label>নোট<input name="note" maxlength="500" value="${escapeXml(v.reviewer_note||'')}"></label><button>সেভ করুন</button></form></section>`).join(''):'<p>এখনও কোনো আবেদন নেই।'}`));});
app.post('/api/admin/seller-verifications/review', signedIn, adminOnly, (req,res)=>{const id=Number(req.body?.id),status=String(req.body?.status||'');if(!Number.isInteger(id)||!['pending','approved','rejected'].includes(status))return res.status(400).type('html').send(authPage('তথ্য ঠিক করুন','<p>সঠিক আবেদন ও অবস্থা নির্বাচন করুন।</p>'));db.prepare(`UPDATE seller_verifications SET status=?,reviewer_note=?,reviewed_at=datetime('now') WHERE id=?`).run(status,String(req.body?.note||'').slice(0,500),id);res.redirect('/api/admin/seller-verifications/page');});
app.patch('/api/admin/seller-verifications/:id', signedIn, adminOnly, (req,res)=>{
 const status=String(req.body?.status||'');if(!['approved','rejected','pending'].includes(status))return fail(res,400,'invalid_status');
 const note=String(req.body?.note||'').slice(0,500);const result=db.prepare(`UPDATE seller_verifications SET status=?,reviewer_note=?,reviewed_at=datetime('now') WHERE id=?`).run(status,note,Number(req.params.id));if(!result.changes)return fail(res,404,'not_found');res.json({ok:true,status});
});
app.post('/api/seller/verification/form', signedIn, (req,res)=>{const businessName=String(req.body?.businessName||'').trim(),nidLast4=String(req.body?.nidLast4||'').trim();if(!['seller','admin'].includes(req.session.user.role)||businessName.length<2||!/^\d{4}$/.test(nidLast4))return res.status(400).type('html').send(authPage('তথ্য ঠিক করুন','<p>বিক্রেতা অ্যাকাউন্ট, ব্যবসার নাম এবং NID-এর শেষ চার সংখ্যা দিন।</p>'));db.prepare(`INSERT INTO seller_verifications(user_id,business_name,nid_last4,status) VALUES(?,?,?,'pending') ON CONFLICT(user_id) DO UPDATE SET business_name=excluded.business_name,nid_last4=excluded.nid_last4,status='pending',reviewer_note='',reviewed_at=NULL`).run(req.session.user.id,businessName,nidLast4);res.redirect('/api/account');});
app.get('/api/seller/verification/status',signedIn,(req,res)=>{const v=db.prepare('SELECT business_name,status,reviewer_note,created_at,reviewed_at FROM seller_verifications WHERE user_id=?').get(req.session.user.id);res.type('html').send(authPage('বিক্রেতা যাচাই',v?`<p>ব্যবসা: ${escapeXml(v.business_name)}</p><p>অবস্থা: ${escapeXml(v.status)}</p><p>${escapeXml(v.reviewer_note)}</p>`:'<p>এখনও কোনো আবেদন জমা হয়নি।</p>'));});

// SSLCommerz hosted checkout: bKash/Nagad/Rocket channels appear only if enabled on the merchant account.
const paymentEnabled=()=>Boolean(process.env.SSLCOMMERZ_STORE_ID&&process.env.SSLCOMMERZ_STORE_PASSWORD);
const sslBase=()=>process.env.SSLCOMMERZ_LIVE==='true'?'https://securepay.sslcommerz.com':'https://sandbox.sslcommerz.com';
app.post('/api/payments/sslcommerz/init', orderRateLimit, async (req,res)=>{
 if(!paymentEnabled())return fail(res,503,'payment_gateway_not_configured');
 const orderId=String(req.body?.orderId||''), method=String(req.body?.method||'any').toLowerCase();
 if(!['any','bkash','nagad','rocket'].includes(method))return fail(res,400,'invalid_payment_method');
 const order=db.prepare(`SELECT o.*,l.title,l.price,l.unit,l.district,l.user_id seller_id FROM orders o JOIN listings l ON l.id=o.listing_id WHERE o.id=?`).get(orderId);
 if(!order)return fail(res,404,'order_not_found');
 if(req.session.user&&order.buyer_id&&Number(order.buyer_id)!==Number(req.session.user.id))return fail(res,403,'order_not_owned');
 if(order.payment_status==='paid')return fail(res,409,'order_already_paid');
 const recentPending=db.prepare("SELECT id FROM payment_transactions WHERE order_id=? AND status='pending' AND created_at>=datetime('now','-10 minutes') LIMIT 1").get(orderId);if(recentPending)return fail(res,409,'payment_already_in_progress_try_again_later');
 if(!Number.isFinite(Number(order.amount_bdt))||Number(order.amount_bdt)<10||Number(order.amount_bdt)>500000)return fail(res,400,'payment_amount_must_be_10_to_500000_bdt');
 const transactionId=`HB${Date.now()}${crypto.randomBytes(5).toString('hex')}`;const base=String(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');if(!base.startsWith('https://'))return fail(res,503,'https_public_base_url_required');
 const params=new URLSearchParams({store_id:process.env.SSLCOMMERZ_STORE_ID,store_passwd:process.env.SSLCOMMERZ_STORE_PASSWORD,total_amount:Number(order.amount_bdt).toFixed(2),currency:'BDT',tran_id:transactionId,success_url:`${base}/api/payments/sslcommerz/success`,fail_url:`${base}/api/payments/sslcommerz/fail`,cancel_url:`${base}/api/payments/sslcommerz/cancel`,ipn_url:`${base}/api/payments/sslcommerz/ipn`,shipping_method:'NO',product_name:String(order.title).slice(0,50),product_category:'Marketplace',product_profile:'general',cus_name:String(order.buyer_name).slice(0,50),cus_email:order.buyer_email,cus_add1:String(order.address).slice(0,50),cus_city:String(order.district||'Bangladesh').slice(0,50),cus_postcode:'0000',cus_country:'Bangladesh',cus_phone:String(order.buyer_phone)});
 if(method!=='any')params.set('multi_card_name',({bkash:'bkash',nagad:'nagad',rocket:'dbblmobilebanking'})[method]);
 try{const r=await fetch(`${sslBase()}/gwprocess/v4/api.php`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params,signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok||data.status!=='SUCCESS'||!data.GatewayPageURL)return fail(res,502,'payment_initialization_failed');
 db.prepare(`INSERT INTO payment_transactions(id,order_id,provider,requested_method,gateway_transaction_id,amount_bdt,status,gateway_payload) VALUES(?,?,'sslcommerz',?,?,?,'pending',?)`).run(crypto.randomUUID(),orderId,method,transactionId,Number(order.amount_bdt),JSON.stringify({status:data.status}));db.prepare("UPDATE orders SET payment_status='pending',updated_at=datetime('now') WHERE id=?").run(orderId);res.json({ok:true,redirectUrl:data.GatewayPageURL,transactionId});
 }catch{return fail(res,502,'payment_gateway_unavailable');}
});
async function handleSslCallback(req,res,forcedStatus=null,isIpn=false){
 const data={...(req.body||{}),...(req.query||{})};const tran=String(data.tran_id||'');const payment=db.prepare('SELECT * FROM payment_transactions WHERE gateway_transaction_id=?').get(tran);
 if(!payment)return res.status(404).type('text').send('Payment not found');
 if(forcedStatus){
 // Browser fail/cancel redirects are not trusted payment evidence; leave the transaction pending for reconciliation.
 return isIpn ? res.status(202).type('text').send('Callback received; pending reconciliation') : res.redirect(`/api/payment-result?status=${forcedStatus}`);
 }
 if(!data.val_id||!paymentEnabled())return res.status(400).type('text').send('Missing payment validation data');
 try{const url=new URL(`${sslBase()}/validator/api/validationserverAPI.php`);url.searchParams.set('val_id',String(data.val_id));url.searchParams.set('store_id',process.env.SSLCOMMERZ_STORE_ID);url.searchParams.set('store_passwd',process.env.SSLCOMMERZ_STORE_PASSWORD);url.searchParams.set('format','json');const r=await fetch(url,{signal:AbortSignal.timeout(15000)});const v=await r.json();const amount=Number(v.amount);const valid=r.ok&&['VALID','VALIDATED'].includes(String(v.status||'').toUpperCase())&&String(v.tran_id)===tran&&String(v.currency||'').toUpperCase()==='BDT'&&Math.abs(amount-Number(payment.amount_bdt))<0.01;
 if(!valid)return res.status(400).type('text').send('Payment validation failed');db.prepare("UPDATE payment_transactions SET status='paid',gateway_val_id=?,gateway_payload=?,updated_at=datetime('now') WHERE gateway_transaction_id=?").run(String(data.val_id),JSON.stringify({status:v.status,bank_tran_id:v.bank_tran_id||null}),tran);db.prepare("UPDATE orders SET payment_status='paid',status='confirmed',updated_at=datetime('now') WHERE id=?").run(payment.order_id);return isIpn ? res.status(200).type('text').send('VALIDATED') : res.redirect('/api/payment-result?status=paid');
 }catch{return res.status(502).type('text').send('Could not validate payment; contact support');}
}
app.all('/api/payments/sslcommerz/success',async(req,res)=>handleSslCallback(req,res));
app.all('/api/payments/sslcommerz/ipn',async(req,res)=>handleSslCallback(req,res,null,true));
app.all('/api/payments/sslcommerz/fail',async(req,res)=>handleSslCallback(req,res,'failed'));
app.all('/api/payments/sslcommerz/cancel',async(req,res)=>handleSslCallback(req,res,'cancelled'));
app.get('/api/payment-result',(req,res)=>res.type('html').send(authPage('পেমেন্টের অবস্থা',`<p>পেমেন্টের অবস্থা: <strong>${escapeXml(String(req.query.status||'pending'))}</strong></p><p>অর্ডার নিশ্চিতকরণ ও রসিদের জন্য আপনার অ্যাকাউন্ট/বিক্রেতার সাথে যোগাযোগ করুন।</p><a href="/">হাটবাজারে ফিরুন</a>`)));

// Steadfast-style courier adapter: set exact endpoint and API keys supplied by your courier account.
app.post('/api/admin/orders/:id/ship', signedIn, adminOnly, async(req,res)=>{
 if(!process.env.COURIER_API_URL||!process.env.COURIER_API_KEY)return fail(res,503,'courier_not_configured');
 const order=db.prepare(`SELECT o.*,l.title,l.price,l.unit,l.district,l.upazila,l.phone seller_phone FROM orders o JOIN listings l ON l.id=o.listing_id WHERE o.id=?`).get(String(req.params.id));if(!order)return fail(res,404,'order_not_found');
 const payload={invoice:order.id,recipient_name:order.buyer_name,recipient_phone:String(order.buyer_phone).replace(/^\+?88/,''),recipient_address:order.address,delivery_type:Number(process.env.COURIER_DELIVERY_TYPE||0),item_description:order.title,cod_amount:order.payment_status==='paid'?0:Number(order.amount_bdt||order.price*order.quantity),total_lot:1,note:`HaatBazar order ${order.id}`};
 const existingShipment=db.prepare('SELECT consignment_id,tracking_code,status FROM courier_shipments WHERE order_id=?').get(order.id);if(existingShipment?.consignment_id)return res.status(409).json({error:'shipment_already_created',trackingCode:existingShipment.tracking_code,status:existingShipment.status});
 try{const r=await fetch(process.env.COURIER_API_URL,{method:'POST',headers:{'Content-Type':'application/json','Api-Key':process.env.COURIER_API_KEY,'Secret-Key':process.env.COURIER_API_SECRET||''},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});const data=await r.json().catch(()=>({}));if(!r.ok||data.status==='error'||data.success===false)return res.status(502).json({error:'courier_request_failed',providerStatus:r.status});const consignment=String(data.consignment?.consignment_id||data.consignment_id||data.tracking_code||'');const tracking=String(data.consignment?.tracking_code||data.tracking_code||'');db.prepare(`INSERT INTO courier_shipments(order_id,provider,consignment_id,tracking_code,status,response_json) VALUES(?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET provider=excluded.provider,consignment_id=excluded.consignment_id,tracking_code=excluded.tracking_code,status=excluded.status,response_json=excluded.response_json,updated_at=datetime('now')`).run(order.id,process.env.COURIER_PROVIDER||'custom-courier',consignment,tracking,'requested',JSON.stringify({status:r.status,success:!!data.status||!!data.consignment}));db.prepare("UPDATE orders SET shipping_status='requested',updated_at=datetime('now') WHERE id=?").run(order.id);res.json({ok:true,consignmentId:consignment,trackingCode:tracking,status:'requested'});
 }catch{return fail(res,502,'courier_unavailable');}
});
app.post('/api/admin/orders/:id/shipping/refresh', signedIn, adminOnly, async(req,res)=>{
 if(!process.env.COURIER_API_URL||!process.env.COURIER_API_KEY)return fail(res,503,'courier_not_configured');
 const shipment=db.prepare('SELECT * FROM courier_shipments WHERE order_id=?').get(String(req.params.id));if(!shipment)return fail(res,404,'shipment_not_found');
 try{const u=new URL(process.env.COURIER_API_URL);u.pathname=u.pathname.replace(/\/$/,'').replace(/\/create_order$/,'')+`/status_by_invoice/${encodeURIComponent(String(req.params.id))}`;const r=await fetch(u,{headers:{'Api-Key':process.env.COURIER_API_KEY,'Secret-Key':process.env.COURIER_API_SECRET||''},signal:AbortSignal.timeout(12000)});const data=await r.json().catch(()=>({}));if(!r.ok)return fail(res,502,'courier_status_failed');const status=String(data.delivery_status||data.status||data.consignment?.status||shipment.status).slice(0,80);db.prepare("UPDATE courier_shipments SET status=?,response_json=?,updated_at=datetime('now') WHERE order_id=?").run(status,JSON.stringify({status:data.status||null,delivery_status:data.delivery_status||null}),String(req.params.id));db.prepare("UPDATE orders SET shipping_status=?,updated_at=datetime('now') WHERE id=?").run(status,String(req.params.id));res.json({ok:true,status,trackingCode:shipment.tracking_code});}catch{return fail(res,502,'courier_unavailable');}
});
app.get('/api/orders/:id/shipping', signedIn, (req,res)=>{const row=db.prepare(`SELECT s.* FROM courier_shipments s JOIN orders o ON o.id=s.order_id JOIN listings l ON l.id=o.listing_id WHERE s.order_id=? AND (o.buyer_id=? OR l.user_id=? OR ?='admin')`).get(String(req.params.id),req.session.user.id,req.session.user.id,req.session.user.role);if(!row)return fail(res,404,'not_found');res.json({shipment:row});});

app.get('/api/listings/summary', (_req,res) => {
 const total=db.prepare("SELECT COUNT(*) n FROM listings WHERE status='active'").get().n;
 const recentListings=db.prepare("SELECT * FROM listings WHERE status='active' ORDER BY created_at DESC LIMIT 8").all().map(publicListing);
 res.json({totalListings:total,recentListings});
});
app.get('/api/listings', (req,res) => {
 const {search='',category='',subcategory='',district='',saleType='',sort='newest'}=req.query;
 const page=Math.max(1,Math.min(10000,Number(req.query.page)||1)), limit=Math.max(1,Math.min(50,Number(req.query.limit)||20));
 const where=["status='active'"]; const args=[];
 for(const [field,val] of [['category',category],['subcategory',subcategory],['district',district]]) if(val){where.push(`${field}=?`);args.push(String(val).slice(0,120));}
 if(saleType && ['retail','wholesale','both'].includes(saleType)){where.push('(saleType=? OR saleType=?)');args.push(String(saleType), 'both');}
 if(search){where.push('(title LIKE ? OR description LIKE ? OR businessName LIKE ? OR sellerName LIKE ?)');const q=`%${String(search).slice(0,120)}%`;args.push(q,q,q,q);}
 const order=sort==='price_asc'?'price ASC':sort==='price_desc'?'price DESC':'created_at DESC';
 const total=db.prepare(`SELECT COUNT(*) n FROM listings WHERE ${where.join(' AND ')}`).get(...args).n;
 const rows=db.prepare(`SELECT * FROM listings WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args,limit,(page-1)*limit);
 res.json({items:rows.map(publicListing),total,page,limit});
});
app.get('/api/listings/:id', (req,res)=>{const row=getListing.get(req.params.id);if(!row)return fail(res,404,'not_found');res.json(publicListing(row));});
app.post('/api/listings', signedIn, (req,res)=>{
 if(!req.is('application/json'))return fail(res,415,'json_required');
 if(!['seller','admin'].includes(req.session.user.role))return fail(res,403,'seller_account_required');
 const b=req.body||{};if(!validListing(b))return fail(res,400,'invalid_listing');
 const imageNames = b.images.map(url => path.basename(new URL(url, 'http://localhost').pathname));
 const ownedImages = imageNames.length ? db.prepare(`SELECT name FROM uploaded_images WHERE user_id=? AND claimed=0 AND name IN (${imageNames.map(()=>'?').join(',')})`).all(req.session.user.id, ...imageNames).map(x=>x.name) : [];
 if (ownedImages.length !== imageNames.length || new Set(imageNames).size !== imageNames.length) return fail(res,400,'image_not_owned_or_already_used');
 const id=crypto.randomUUID();
 const createListingTx = db.transaction(() => {
 db.prepare(`INSERT INTO listings(id,user_id,title,category,subcategory,district,upazila,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,req.session.user.id,String(b.title).trim(),b.category,b.subcategory,b.district,String(b.upazila||'').slice(0,100),Number(b.price),String(b.unit).slice(0,20),Number(b.quantity),b.negotiable?1:0,String(b.sellerName||req.session.user.name).slice(0,100),String(b.businessName||'').slice(0,120),String(b.description).trim(),JSON.stringify(b.images),String(b.phone).replace(/[\s-]/g,''),b.saleType,Number(b.minOrderQuantity),b.deliveryAvailable?1:0);
 db.prepare(`UPDATE uploaded_images SET claimed=1 WHERE user_id=? AND name IN (${imageNames.map(()=>'?').join(',') || "''"})`).run(req.session.user.id, ...imageNames);
 });
 createListingTx();
 event(req,'listing_created',id,b.category);res.status(201).json(publicListing(getListing.get(id)));
});
app.post('/api/listings/:id/contact', (req,res)=>{if(!req.is('application/json'))return fail(res,415,'json_required');const l=getListing.get(req.params.id);if(!l)return fail(res,404,'not_found');event(req,'contact',l.id,l.category,{channel:String(req.body?.channel||'phone').slice(0,20)});res.json({ok:true});});
app.get('/api/my/listings', signedIn, (req,res)=>{const rows=db.prepare('SELECT * FROM listings WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.session.user.id);res.json({items:rows.map(publicListing)});});
app.patch('/api/my/listings/:id/status', signedIn, (req,res)=>{const status=String(req.body?.status||'');if(!['active','paused','sold'].includes(status))return fail(res,400,'invalid_status');const row=db.prepare("SELECT id FROM listings WHERE id=? AND user_id=? AND status!='removed'").get(req.params.id,req.session.user.id);if(!row)return fail(res,404,'not_found');db.prepare(`UPDATE listings SET status=?,updated_at=datetime('now') WHERE id=?`).run(status,row.id);res.json({ok:true});});
app.patch('/api/admin/listings/:id/status', signedIn, adminOnly, (req,res)=>{const status=String(req.body?.status||'');if(!['active','paused','sold','removed'].includes(status))return fail(res,400,'invalid_status');const result=db.prepare(`UPDATE listings SET status=?,updated_at=datetime('now') WHERE id=?`).run(status,req.params.id);if(!result.changes)return fail(res,404,'not_found');res.json({ok:true});});
app.get('/api/admin/orders', signedIn, adminOnly, (_req,res)=>{res.json({items:db.prepare('SELECT o.*,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id ORDER BY o.created_at DESC LIMIT 200').all()});});
app.get('/api/seller/orders', signedIn, (req,res)=>{res.json({items:db.prepare('SELECT o.*,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id WHERE l.user_id=? ORDER BY o.created_at DESC LIMIT 200').all(req.session.user.id)});});
app.post('/api/analytics/events', (req,res)=>{if(!req.is('application/json'))return fail(res,415,'json_required');const b=req.body||{};const allowed=['listing_view','contact','order','seller_signup','listing_created','visit'];if(!allowed.includes(b.type))return fail(res,400,'invalid_event');let listing=null;if(b.listingId){listing=getListing.get(String(b.listingId));if(!listing)return fail(res,404,'listing_unavailable');}const category=listing?.category||String(b.category||'').slice(0,80)||null;event(req,b.type,listing?.id||null,category,{channel:String(b.channel||'').slice(0,30)});res.status(202).json({ok:true});});
const contactRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
app.get('/api/listings/:id/phone', contactRateLimit, (req,res)=>{const l=getListing.get(req.params.id);if(!l)return fail(res,404,'not_found');res.json({phone:l.phone});});

app.post('/api/orders', orderRateLimit, (req,res)=>{
 if(!req.is('application/json'))return fail(res,415,'json_required');
 const b=req.body||{}; const phone=String(b.buyerPhone||'').replace(/[\s-]/g,''); const buyerEmail=String(b.buyerEmail||'').trim().toLowerCase();
 if(!b.listingId||!Number.isFinite(Number(b.quantity))||Number(b.quantity)<1||String(b.buyerName||'').trim().length<2||!validPhone(phone)||String(b.address||'').trim().length<5||!/^\S+@\S+\.\S+$/.test(buyerEmail)||buyerEmail.length>200)return fail(res,400,'invalid_order');
 const listing=getListing.get(String(b.listingId));if(!listing)return fail(res,404,'listing_unavailable');if(Number(b.quantity)<Number(listing.minOrderQuantity))return fail(res,400,'below_minimum_order');if(Number(b.quantity)>Number(listing.quantity))return fail(res,400,'quantity_unavailable');
 const id=crypto.randomUUID();const amount=Number(listing.price)*Number(b.quantity);db.prepare('INSERT INTO orders(id,listing_id,buyer_id,quantity,buyer_name,buyer_phone,buyer_email,address,amount_bdt) VALUES(?,?,?,?,?,?,?,?,?)').run(id,listing.id,req.session.user?.id||null,Number(b.quantity),String(b.buyerName).trim().slice(0,100),phone,buyerEmail,String(b.address).trim().slice(0,500),amount);
 event(req,'order',listing.id,listing.category,{quantity:Number(b.quantity)});res.status(201).json({id,status:'pending'});
});

app.post('/api/storage/uploads/request-url', signedIn, (req,res)=>{
 if(!req.is('application/json'))return fail(res,415,'json_required');
 const {name,size,contentType}=req.body||{};const bytes=Number(size);
 if(!name||!Number.isInteger(bytes)||bytes<1||bytes>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(contentType))return fail(res,400,'invalid_upload');
 const pending=Object.values(req.session.uploadTokens||{}).filter(x=>x.expires>Date.now()).length;
 if(pending>=5)return fail(res,429,'too_many_pending_uploads');
 const token=crypto.randomUUID();req.session.uploadTokens ||= {};req.session.uploadTokens[token]={name:String(name).slice(0,200),size:bytes,contentType,expires:Date.now()+5*60*1000};
 const ext=contentType==='image/png'?'.png':contentType==='image/webp'?'.webp':'.jpg';res.json({uploadURL:`/api/storage/uploads/${token}`,objectPath:token+ext});
});
app.put('/api/storage/uploads/:token', signedIn, express.raw({type:['image/jpeg','image/png','image/webp'],limit:'5mb'}), (req,res)=>{
 const rec=req.session.uploadTokens?.[req.params.token];if(!rec||rec.expires<Date.now()||!Buffer.isBuffer(req.body))return fail(res,400,'upload_expired');
 if(req.body.length!==rec.size||req.body.length>5*1024*1024)return fail(res,400,'upload_size_mismatch');
 const b=req.body;const isJpeg=b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;const isPng=b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const isWebp=b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
 if(!((rec.contentType==='image/jpeg'&&isJpeg)||(rec.contentType==='image/png'&&isPng)||(rec.contentType==='image/webp'&&isWebp)))return fail(res,400,'invalid_image_content');
 const ext=rec.contentType==='image/png'?'.png':rec.contentType==='image/webp'?'.webp':'.jpg';const name=req.params.token+ext;
 try { fs.writeFileSync(path.join(uploadDir,name),req.body,{flag:'wx'});db.prepare('INSERT INTO uploaded_images(name,user_id,content_type,size_bytes) VALUES(?,?,?,?)').run(name,req.session.user.id,rec.contentType,req.body.length); }
 catch { try { fs.unlinkSync(path.join(uploadDir,name)); } catch {} return fail(res,500,'upload_save_failed'); }
 delete req.session.uploadTokens[req.params.token];req.session.save(err=>{if(err)return fail(res,500,'session_save_failed');res.json({ok:true,objectPath:name});});
});
app.get('/api/storage/public-objects/:name', (req,res)=>{const name=path.basename(req.params.name);if(!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(name))return res.sendStatus(404);const file=path.join(uploadDir,name);if(!fs.existsSync(file))return res.sendStatus(404);res.setHeader('Cache-Control','public,max-age=86400');res.sendFile(file);});

app.get('/api/admin/analytics', signedIn, adminOnly, (_req,res)=>{
 const count=(sql,...args)=>db.prepare(sql).get(...args).n;
 const since7="datetime('now','-7 days')";
 const views=count(`SELECT COUNT(*) n FROM analytics_events WHERE event_type='listing_view' AND created_at >= ${since7}`);
 const contacts=count(`SELECT COUNT(*) n FROM analytics_events WHERE event_type='contact' AND created_at >= ${since7}`);
 const contactVisitors=count(`SELECT COUNT(DISTINCT visitor_id) n FROM analytics_events WHERE event_type='contact' AND created_at >= ${since7}`);
 const topCategories=db.prepare(`SELECT category,COUNT(*) views FROM analytics_events WHERE event_type='listing_view' AND created_at >= ${since7} AND category IS NOT NULL GROUP BY category ORDER BY views DESC LIMIT 12`).all();
 const topListings=db.prepare(`SELECT e.listing_id listingId,l.title,COUNT(*) views FROM analytics_events e LEFT JOIN listings l ON l.id=e.listing_id WHERE e.event_type='listing_view' AND e.created_at >= ${since7} AND e.listing_id IS NOT NULL GROUP BY e.listing_id ORDER BY views DESC LIMIT 10`).all();
 const returningVisitors=count(`SELECT COUNT(*) n FROM (SELECT visitor_id FROM analytics_events WHERE event_type='visit' AND created_at >= datetime('now','-30 days') AND visitor_id IS NOT NULL GROUP BY visitor_id HAVING COUNT(*)>1)`);
 const marketingSpend=db.prepare('SELECT spend_bdt FROM marketing_settings WHERE id=1').get().spend_bdt;
 const activeListings=count("SELECT COUNT(*) n FROM listings WHERE status='active'");
 const newSellers7d=count(`SELECT COUNT(*) n FROM users WHERE role='seller' AND created_at >= ${since7}`);
 const orders7d=count(`SELECT COUNT(*) n FROM orders WHERE created_at >= ${since7}`);
 const events7d=count(`SELECT COUNT(*) n FROM analytics_events WHERE created_at >= ${since7}`);
 res.json({periodDays:7,activeListings,newSellers7d,orders7d,views7d:views,contacts7d:contacts,uniqueContactVisitors7d:contactVisitors,contactRate:views?contacts/views:0,orderRate:views?orders7d/views:0,returningVisitors30d:returningVisitors,events7d,marketingSpendBdt:marketingSpend,estimatedCostPerContact:contactVisitors?marketingSpend/contactVisitors:null,topCategories,topListings});
});
app.put('/api/admin/marketing-spend', signedIn, adminOnly, (req,res)=>{
 if(!req.is('application/json'))return fail(res,415,'json_required');
 const amount=Number(req.body?.amount);
 if(!Number.isFinite(amount)||amount<0||amount>1000000000000)return fail(res,400,'invalid_amount');
 db.prepare("UPDATE marketing_settings SET spend_bdt=?,updated_at=datetime('now') WHERE id=1").run(amount);
 res.json({ok:true,spendBdt:amount});
});
app.get('/api/account', signedIn, (req,res)=>{const listings=db.prepare('SELECT id,title,price,quantity,status,created_at FROM listings WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(req.session.user.id);const orders=db.prepare('SELECT o.id,o.quantity,o.status,o.created_at,o.buyer_name,o.buyer_phone,o.address,l.title listingTitle FROM orders o JOIN listings l ON l.id=o.listing_id WHERE l.user_id=? ORDER BY o.created_at DESC LIMIT 100').all(req.session.user.id);res.type('html').send(authPage('আমার হাটবাজার',`<p>স্বাগতম, ${escapeXml(req.session.user.name)}। <a href="/">মার্কেটপ্লেসে ফিরুন</a></p><h2>বিক্রেতার পরিচয় যাচাই</h2><form method="post" action="/api/seller/verification/form"><label>ব্যবসার নাম<input name="businessName" required minlength="2"></label><label>জাতীয় পরিচয়পত্রের শেষ ৪ সংখ্যা<input name="nidLast4" inputmode="numeric" pattern="[0-9]{4}" required></label><button>যাচাইয়ের আবেদন</button></form><p><a href="/api/seller/verification/status">আমার যাচাইয়ের অবস্থা</a></p><h2>আমার বিজ্ঞাপন</h2>${listings.length?`<table>${listings.map(x=>`<tr><td>${escapeXml(x.title)}<br>৳${x.price} · স্টক ${x.quantity} · ${escapeXml(x.status)}</td><td><form method="post" action="/api/account/listing-status"><input type="hidden" name="id" value="${escapeXml(x.id)}"><select name="status"><option value="active">সক্রিয়</option><option value="paused">স্থগিত</option><option value="sold">বিক্রি হয়েছে</option></select><button>আপডেট</button></form></td></tr>`).join('')}</table>`:'<p>এখনও বিজ্ঞাপন নেই।'}<h2>নতুন অর্ডার</h2>${orders.length?`<ul>${orders.map(o=>`<li>${escapeXml(o.listingTitle)} · ${o.quantity} · ${escapeXml(o.status)}<br>ক্রেতা: ${escapeXml(o.buyer_name)} · ${escapeXml(o.buyer_phone)}<br>ঠিকানা: ${escapeXml(o.address)} · ${escapeXml(o.created_at)}</li>`).join('')}</ul>`:'<p>এখনও অর্ডার নেই।'}<form method="post" action="/api/logout"><button>লগআউট</button></form>`));});
app.post('/api/account/listing-status', signedIn, (req,res)=>{const status=String(req.body.status||'');if(!['active','paused','sold'].includes(status))return fail(res,400,'invalid_status');const row=db.prepare('SELECT id FROM listings WHERE id=? AND user_id=?').get(String(req.body.id||''),req.session.user.id);if(!row)return fail(res,404,'not_found');db.prepare(`UPDATE listings SET status=?,updated_at=datetime('now') WHERE id=?`).run(status,row.id);res.redirect('/api/account');});
app.get('/api/admin/dashboard', signedIn, adminOnly, (_req,res)=>{const stats={active:db.prepare("SELECT COUNT(*) n FROM listings WHERE status='active'").get().n,users:db.prepare('SELECT COUNT(*) n FROM users').get().n,orders:db.prepare('SELECT COUNT(*) n FROM orders').get().n,views:db.prepare("SELECT COUNT(*) n FROM analytics_events WHERE event_type='listing_view' AND created_at>=datetime('now','-7 days')").get().n,contacts:db.prepare("SELECT COUNT(*) n FROM analytics_events WHERE event_type='contact' AND created_at>=datetime('now','-7 days')").get().n};res.type('html').send(authPage('অ্যাডমিন ড্যাশবোর্ড',`<p><a href="/">মার্কেটপ্লেস</a> · <a href="/api/admin/orders">অর্ডার API</a> · <a href="/api/admin/seller-verifications/page">বিক্রেতা যাচাই</a> · <a href="/api/admin/analytics">বিশ্লেষণ API (JSON)</a></p><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${Object.entries(stats).map(([k,v])=>`<div style="padding:16px;background:#eaf5ed;border-radius:12px"><small>${k}</small><h2>${v}</h2></div>`).join('')}</div><h2>সাম্প্রতিক বিজ্ঞাপন</h2><table>${db.prepare('SELECT id,title,district,status,created_at FROM listings ORDER BY created_at DESC LIMIT 50').all().map(l=>`<tr><td>${escapeXml(l.title)}<br><small>${escapeXml(l.district)} · ${escapeXml(l.status)}</small></td><td><form method="post" action="/api/admin/listing-status"><input type="hidden" name="id" value="${escapeXml(l.id)}"><select name="status"><option value="active">সক্রিয়</option><option value="paused">স্থগিত</option><option value="sold">বিক্রি হয়েছে</option><option value="removed">সরান</option></select><button>আপডেট</button></form></td></tr>`).join('')}</table><form method="post" action="/api/logout"><button>লগআউট</button></form>`));});
app.post('/api/admin/listing-status', signedIn, adminOnly, (req,res)=>{const status=String(req.body.status||'');if(!['active','paused','sold','removed'].includes(status))return fail(res,400,'invalid_status');const result=db.prepare(`UPDATE listings SET status=?,updated_at=datetime('now') WHERE id=?`).run(status,String(req.body.id||''));if(!result.changes)return fail(res,404,'not_found');res.redirect('/api/admin/dashboard');});
app.get('/sitemap.xml', (_req,res)=>{
 const base=(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
 if(!/^https:\/\//i.test(base))return res.status(503).type('text/plain').send('Set PUBLIC_BASE_URL to your real HTTPS domain before submitting the sitemap.');
 const products=db.prepare("SELECT id,updated_at FROM listings WHERE status='active' ORDER BY updated_at DESC LIMIT 50000").all();
 const liveCategories=db.prepare("SELECT DISTINCT category FROM listings WHERE status='active'").all().map(x=>x.category);
 const liveDistricts=db.prepare("SELECT DISTINCT district FROM listings WHERE status='active'").all().map(x=>x.district);
 const entries=[{url:`${base}/`},...catalog.categories.filter(c=>liveCategories.includes(c.key)).map(c=>({url:`${base}/category/${c.slug}`})),...catalog.districts.filter(d=>liveDistricts.includes(d)).map(d=>({url:`${base}/district/${districtSlug(d)}`})),...products.map(p=>({url:`${base}/product/${p.id}`,updated:p.updated_at})),...Object.keys(legalPages).map(p=>({url:`${base}${p}`}))];
 res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(e=>`<url><loc>${escapeXml(e.url)}</loc>${e.updated?`<lastmod>${new Date(e.updated.replace(' ','T')+'Z').toISOString()}</lastmod>`:''}</url>`).join('')}</urlset>`);
});
function districtSlug(s){return {"ঢাকা":"dhaka","ফরিদপুর":"faridpur","গাজীপুর":"gazipur","গোপালগঞ্জ":"gopalganj","কিশোরগঞ্জ":"kishoreganj","মাদারীপুর":"madaripur","মানিকগঞ্জ":"manikganj","মুন্সিগঞ্জ":"munshiganj","নারায়ণগঞ্জ":"narayanganj","নরসিংদী":"narsingdi","রাজবাড়ী":"rajbari","শরীয়তপুর":"shariatpur","টাঙ্গাইল":"tangail","ব্রাহ্মণবাড়িয়া":"brahmanbaria","চাঁদপুর":"chandpur","চট্টগ্রাম":"chattogram","কুমিল্লা":"cumilla","কক্সবাজার":"coxsbazar","ফেনী":"feni","খাগড়াছড়ি":"khagrachhari","লক্ষ্মীপুর":"lakshmipur","নোয়াখালী":"noakhali","রাঙামাটি":"rangamati","বান্দরবান":"bandarban","বগুড়া":"bogura","জয়পুরহাট":"joypurhat","নওগাঁ":"naogaon","নাটোর":"natore","চাঁপাইনবাবগঞ্জ":"chapainawabganj","পাবনা":"pabna","রাজশাহী":"rajshahi","সিরাজগঞ্জ":"sirajganj","হবিগঞ্জ":"habiganj","মৌলভীবাজার":"moulvibazar","সুনামগঞ্জ":"sunamganj","সিলেট":"sylhet","দিনাজপুর":"dinajpur","গাইবান্ধা":"gaibandha","কুড়িগ্রাম":"kurigram","লালমনিরহাট":"lalmonirhat","নীলফামারী":"nilphamari","পঞ্চগড়":"panchagarh","রংপুর":"rangpur","ঠাকুরগাঁও":"thakurgaon","জামালপুর":"jamalpur","ময়মনসিংহ":"mymensingh","নেত্রকোনা":"netrokona","শেরপুর":"sherpur","বাগেরহাট":"bagerhat","চুয়াডাঙ্গা":"chuadanga","যশোর":"jashore","ঝিনাইদহ":"jhenaidah","খুলনা":"khulna","কুষ্টিয়া":"kushtia","মাগুরা":"magura","মেহেরপুর":"meherpur","নড়াইল":"narail","সাতক্ষীরা":"satkhira","বরগুনা":"barguna","বরিশাল":"barishal","ভোলা":"bhola","ঝালকাঠি":"jhalokati","পটুয়াখালী":"patuakhali","পিরোজপুর":"pirojpur"}[s]||s.toLowerCase().replace(/\s+/g,'-');}
function escapeXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
app.get('/robots.txt', (_req,res)=>{const base=(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /api/account\nDisallow: /api/admin/\n${base.startsWith('https://')?`Sitemap: ${base}/sitemap.xml\n`:''}`);});

const legalPages={
 '/terms':{title:'শর্তাবলি',body:`<p>হাটবাজারে বিজ্ঞাপন দেওয়া বা অর্ডার করার মাধ্যমে ব্যবহারকারী সঠিক তথ্য দেওয়া, প্রযোজ্য আইন মানা এবং নিষিদ্ধ পণ্য তালিকাভুক্ত না করার বিষয়ে সম্মত হন। বিক্রেতা মূল্য, মজুদ, পণ্যের অবস্থা, ডেলিভারি সময় ও পাইকারি সর্বনিম্ন অর্ডারের তথ্য হালনাগাদ রাখবেন।</p><p>অর্ডার অনুরোধ চূড়ান্ত বিক্রয় বা পেমেন্টের নিশ্চয়তা নয়; পেমেন্ট স্ট্যাটাস সার্ভার যাচাইয়ের পরই নিশ্চিত হয়। প্রতারণা, ভুল তথ্য বা নীতিমালা ভঙ্গ হলে হাটবাজার বিজ্ঞাপন স্থগিত করতে পারে।</p>`},
 '/privacy':{title:'গোপনীয়তা নীতি',body:`<p>অ্যাকাউন্ট, যোগাযোগ, অর্ডার, বিজ্ঞাপন এবং নিরাপত্তা/অ্যানালিটিক্সের জন্য প্রয়োজনীয় তথ্য সংরক্ষিত হয়। পেমেন্ট কার্ড/ওয়ালেটের গোপন তথ্য হাটবাজারের সার্ভারে নেওয়া হয় না; পেমেন্ট অনুমোদিত gateway-তে সম্পন্ন হয়।</p><p>SMS OTP ও transactional message-এর জন্য ফোন নম্বর নির্বাচিত SMS provider-কে পাঠানো হতে পারে; অর্ডার ডেলিভারির জন্য প্রয়োজনীয় তথ্য courier provider-এর সঙ্গে ভাগ হতে পারে। শুধু প্রয়োজনীয় কর্মী/অ্যাডমিন ডেটা দেখতে পারবেন। তথ্য সংশোধন/মুছে ফেলার অনুরোধের জন্য নিচের যোগাযোগে যোগাযোগ করুন।</p>`},
 '/refund-policy':{title:'রিফান্ড ও ফেরত নীতি',body:`<p>পেমেন্ট কেটে গেলেও অর্ডার নিশ্চিত না হলে transaction ID, অর্ডার ID ও প্রমাণসহ সহায়তা চাইতে হবে। যাচাইয়ের পর প্রযোজ্য refund অনুমোদন হলে সাধারণত ৭–১০ কর্মদিবস সময় ধরুন; ব্যাংক/ওয়ালেটের প্রক্রিয়াকরণে সময় ভিন্ন হতে পারে।</p><p>পণ্য ফেরত, ভুল পণ্য, ক্ষতি বা বিক্রেতার সঙ্গে বিরোধের ক্ষেত্রে ছবি ও অর্ডার তথ্যসহ দ্রুত অভিযোগ করুন। প্রকাশের আগে হাটবাজারের প্রকৃত ব্যবসায়িক নীতি ও প্রযোজ্য আইন অনুযায়ী এই নীতিমালা নিশ্চিত করুন।</p>`},
 '/delivery-policy':{title:'ডেলিভারি নীতি',body:`<p>ডেলিভারির সময় বিক্রেতা, পণ্য, এলাকা ও courier coverage অনুযায়ী বদলাতে পারে। প্রাথমিক পরিকল্পিত সময়: ঢাকার ভেতরে ৫ দিন, ঢাকার বাইরে ১০ দিন; এটি প্রতিশ্রুত ডেলিভারি সময় নয়, চালুর আগে বাস্তব courier service level অনুযায়ী সংশোধন করুন।</p><p>চালানের tracking code পাওয়া গেলে অর্ডার পেজ/সহায়তার মাধ্যমে জানানো হবে। COD amount, delivery fee, return charge এবং প্যাকেজ গ্রহণের নিয়ম checkout-এর আগে স্পষ্ট করতে হবে।</p>`},
 '/about':{title:'হাটবাজার সম্পর্কে',body:`<p>হাটবাজার বাংলাদেশের খুচরা ও পাইকারি ক্রেতা-বিক্রেতাদের জন্য বহু-ক্যাটাগরির অনলাইন মার্কেটপ্লেস। পণ্য, মূল্য, বিক্রেতা ও অবস্থানের তথ্য যাচাই করে সিদ্ধান্ত নিন।</p><p><strong>আইনি ব্যবসার নাম:</strong> ${process.env.BUSINESS_LEGAL_NAME?escapeXml(process.env.BUSINESS_LEGAL_NAME):'প্রকাশের আগে পূরণ করুন'}<br><strong>ঠিকানা:</strong> ${process.env.BUSINESS_ADDRESS?escapeXml(process.env.BUSINESS_ADDRESS):'প্রকাশের আগে পূরণ করুন'}<br><strong>ট্রেড লাইসেন্স:</strong> ${process.env.TRADE_LICENSE_NO?escapeXml(process.env.TRADE_LICENSE_NO):'প্রকাশের আগে পূরণ করুন'}</p>`},
 '/contact':{title:'যোগাযোগ',body:`<p>ক্রেতা-বিক্রেতা সহায়তা ও অভিযোগের জন্য: ${process.env.BUSINESS_PHONE?escapeXml(process.env.BUSINESS_PHONE):'প্রকাশের আগে ব্যবসায়িক ফোন নম্বর যোগ করুন'} · ${process.env.SUPPORT_EMAIL?escapeXml(process.env.SUPPORT_EMAIL):'প্রকাশের আগে সহায়তা ইমেইল যোগ করুন'}.</p><p>পেমেন্ট বা ডেলিভারি অভিযোগে অর্ডার ID, transaction ID/consignment ID এবং প্রাসঙ্গিক প্রমাণ দিন। OTP, পাসওয়ার্ড বা payment PIN কখনো পাঠাবেন না।</p>`}
};
app.get(Object.keys(legalPages), (req,res)=>{const page=legalPages[req.path];if(!page)return res.sendStatus(404);const base=String(process.env.PUBLIC_BASE_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');res.type('html').send(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeXml(page.title)} | হাটবাজার</title><meta name="description" content="হাটবাজারের ${escapeXml(page.title)} ও গ্রাহক-সহায়তার তথ্য।"><link rel="canonical" href="${escapeXml(base+req.path)}"></head><body style="font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#153c2a"><a href="/">← হাটবাজার</a><h1>${escapeXml(page.title)}</h1>${page.body}<hr><nav><a href="/terms">শর্তাবলি</a> · <a href="/privacy">গোপনীয়তা</a> · <a href="/refund-policy">রিফান্ড</a> · <a href="/delivery-policy">ডেলিভারি</a> · <a href="/about">আমাদের সম্পর্কে</a> · <a href="/contact">যোগাযোগ</a></nav></body></html>`);});

const dist=path.join(__dirname,'dist');
function seoNotFound(res){return res.status(404).type('html').send('<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="robots" content="noindex,follow"><title>পেজ পাওয়া যায়নি | হাটবাজার</title><main><h1>পেজ পাওয়া যায়নি</h1><p>এই পেজটি আর উপলভ্য নয় অথবা ঠিকানা ভুল।</p><a href="/">হাটবাজারের হোমপেজে ফিরুন</a></main></html>');}
function seoIndex(req,res,next){
 if(!fs.existsSync(path.join(dist,'index.html')))return next();
 const url=new URL(req.originalUrl,'http://localhost');const p=url.pathname;
 if(p!=='/'&&!p.startsWith('/category/')&&!p.startsWith('/district/')&&!p.startsWith('/product/'))return seoNotFound(res);
 const base=(process.env.PUBLIC_BASE_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');
 let title='হাটবাজার | বাংলাদেশের খুচরা ও পাইকারি মার্কেটপ্লেস';
 let description='বাংলাদেশের খুচরা ও পাইকারি অনলাইন মার্কেটপ্লেস। পণ্য, দোকান ও সরবরাহকারী খুঁজুন হাটবাজারে।';
 let schema='';let serverContent='';let noindex=false;
 const safe=(v)=>escapeXml(String(v??''));
 if(p.startsWith('/category/')){
  const slug=p.split('/')[2];const c=catalog.categories.find(x=>x.slug===slug);
  if(!c)return seoNotFound(res);
  const listings=db.prepare("SELECT id,title,price,unit,district,images,description,sellerName,businessName FROM listings WHERE status='active' AND category=? ORDER BY created_at DESC LIMIT 24").all(c.key);
  title=`${c.label} কিনুন ও বিক্রি করুন | হাটবাজার`;
  description=`বাংলাদেশে ${c.label} খুচরা ও পাইকারি দামে খুঁজুন। বিক্রেতা, দাম ও সরাসরি যোগাযোগ—হাটবাজারে।`;
  noindex=listings.length===0;
  serverContent=`<main><h1>${safe(c.label)} — খুচরা ও পাইকারি বাজার</h1><p>বাংলাদেশজুড়ে ${safe(c.label)} খুঁজুন। পণ্যের দাম, এলাকা ও বিক্রেতার তথ্য তুলনা করে সরাসরি যোগাযোগ করুন।</p><nav aria-label="সাবক্যাটাগরি">${c.subcategories.map(x=>`<span>${safe(x)}</span>`).join(' · ')}</nav><h2>সাম্প্রতিক বিজ্ঞাপন</h2>${listings.length?`<ul>${listings.map(l=>`<li><a href="/product/${encodeURIComponent(l.id)}">${safe(l.title)}</a> — ৳${safe(l.price)} / ${safe(l.unit)} · ${safe(l.district)} · ${safe(l.businessName||l.sellerName)}</li>`).join('')}</ul>`:'<p>এই ক্যাটাগরিতে এখনো বিজ্ঞাপন নেই। পরে আবার দেখুন বা বিক্রেতা হিসেবে বিজ্ঞাপন দিন।'}<h2>আরও ক্যাটাগরি</h2><ul>${catalog.categories.filter(x=>x.key!==c.key).map(x=>`<li><a href="/category/${encodeURIComponent(x.slug)}">${safe(x.label)}</a></li>`).join('')}</ul></main>`;
  schema=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url:`${base}${p}`,mainEntity:{'@type':'ItemList',numberOfItems:listings.length,itemListElement:listings.map((l,i)=>({'@type':'ListItem',position:i+1,url:`${base}/product/${l.id}`,name:l.title}))}}).replace(/</g,'\\u003c')}</script>`;
 } else if(p.startsWith('/district/')){
  const slug=p.split('/')[2];const d=catalog.districts.find(x=>districtSlug(x)===slug);
  if(!d)return seoNotFound(res);
  const listings=db.prepare("SELECT id,title,price,unit,category,district,subcategory,sellerName,businessName FROM listings WHERE status='active' AND district=? ORDER BY created_at DESC LIMIT 24").all(d);
  title=`${d} জেলার পণ্য কেনাবেচা | হাটবাজার`;description=`${d} জেলার পণ্য, দোকান ও পাইকারি সরবরাহকারী খুঁজুন হাটবাজারে।`;
  noindex=listings.length===0;
  serverContent=`<main><h1>${safe(d)} জেলার অনলাইন হাটবাজার</h1><p>${safe(d)} জেলার ক্রেতা ও বিক্রেতাদের জন্য পণ্য খোঁজা, খুচরা কেনাকাটা এবং পাইকারি সরবরাহকারীর সঙ্গে যোগাযোগের জায়গা।</p><h2>সাম্প্রতিক স্থানীয় বিজ্ঞাপন</h2>${listings.length?`<ul>${listings.map(l=>`<li><a href="/product/${encodeURIComponent(l.id)}">${safe(l.title)}</a> — ৳${safe(l.price)} / ${safe(l.unit)} · ${safe(l.subcategory)} · ${safe(l.businessName||l.sellerName)}</li>`).join('')}</ul>`:'<p>এই জেলায় এখনো বিজ্ঞাপন নেই।'}<h2>অন্যান্য জেলা</h2><ul>${catalog.districts.filter(x=>x!==d).map(x=>`<li><a href="/district/${districtSlug(x)}">${safe(x)} জেলার পণ্য</a></li>`).join('')}</ul></main>`;
 } else if(p.startsWith('/product/')){
  const id=p.split('/')[2];const row=getListing.get(id);
  if(!row)return seoNotFound(res);
  const l=publicListing(row);title=`${l.title} — ${l.district} | হাটবাজার`;description=String(l.description).replace(/\s+/g,' ').slice(0,155);
  const images=l.images.map(img=>/^https?:\/\//i.test(img)?img:`${base}${img}`);
  schema=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'Product',name:l.title,description:l.description,category:l.category,image:images,sku:l.id,offers:{'@type':'Offer',priceCurrency:'BDT',price:l.price,availability:l.quantity>0?'https://schema.org/InStock':'https://schema.org/OutOfStock',url:`${base}${p}`,itemCondition:'https://schema.org/NewCondition',seller:{'@type':'Organization',name:l.businessName||l.sellerName}}}).replace(/</g,'\\u003c')}</script>`;
  serverContent=`<main><nav><a href="/">হাটবাজার</a> / <a href="/category/${safe(catalog.categories.find(c=>c.key===l.category)?.slug||'')}">${safe(catalog.categories.find(c=>c.key===l.category)?.label||l.category)}</a> / ${safe(l.district)}</nav><article><h1>${safe(l.title)}</h1><p><strong>৳${safe(l.price)} / ${safe(l.unit)}</strong> · ${safe(l.district)}</p>${images.map(src=>`<img src="${safe(src)}" alt="${safe(l.title)}" width="320" loading="lazy">`).join('')}<p>${safe(l.description)}</p><p>বিক্রেতা: ${safe(l.businessName||l.sellerName)}${l.sellerVerified?' · ✓ যাচাইকৃত বিক্রেতা':''}</p><p>বিক্রির ধরন: ${safe(l.saleType)} · মজুদ: ${safe(l.quantity)} · সর্বনিম্ন অর্ডার: ${safe(l.minOrderQuantity)}</p><a href="/api/login?returnTo=${encodeURIComponent(p)}">অ্যাকাউন্টে লগইন করুন</a></article></main>`;
 }
 let html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
 html=html.replace(/<title>[^<]*<\/title>/,`<title>${safe(title)}</title>`);
 html=html.replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/,`<meta name="description" content="${safe(description)}" />`);
 html=html.replace('</head>',`${process.env.GOOGLE_SITE_VERIFICATION?`<meta name="google-site-verification" content="${safe(process.env.GOOGLE_SITE_VERIFICATION)}">`:''}<link rel="canonical" href="${safe(base+p)}"><meta property="og:title" content="${safe(title)}"><meta property="og:description" content="${safe(description)}"><meta property="og:url" content="${safe(base+p)}"><meta property="og:type" content="${p.startsWith('/product/')?'product':'website'}"><meta name="twitter:card" content="summary_large_image">${noindex?'<meta name="robots" content="noindex,follow">':''}${schema}</head>`);
 if(serverContent)html=html.replace(/<div id="root"><\/div>/,`<div id="root">${serverContent}</div>`);
 res.status(200).type('html').send(html);
}
if(fs.existsSync(dist)){app.use(express.static(dist,{maxAge:isProd?'1h':0,index:false}));app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();return seoIndex(req,res,next);});}
app.use((err,_req,res,_next)=>{console.error(err?.message||err);if(res.headersSent)return;res.status(500).json({error:'internal_server_error'});});
app.listen(port,'0.0.0.0',()=>console.log(`HaatBazar server listening on ${port}`));
