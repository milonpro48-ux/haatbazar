import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import catalog from '../server/catalog.json' with { type: 'json' };

const dataDir = await mkdtemp(path.join(os.tmpdir(), 'haatbazar-api-test-'));
const server = net.createServer();
await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', err => err ? reject(err) : resolve()));
const { port } = server.address();
await new Promise(resolve => server.close(resolve));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'test', SESSION_SECRET: 'test-session-secret-at-least-32-characters' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });
async function waitForServer() {
  const until = Date.now() + 15000;
  while (Date.now() < until) {
    if (child.exitCode !== null) throw new Error(`server exited early: ${logs}`);
    try { const r = await fetch(`${base}/api/healthz`); if (r.ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`server did not become healthy: ${logs}`);
}
try {
  await waitForServer();
  const health = await fetch(`${base}/api/healthz`).then(r => r.json());
  assert.equal(health.status, 'ok');

  const db = new Database(path.join(dataDir, 'haatbazar.sqlite'));
  const category = catalog.categories.find(c => c.subcategories?.length);
  const district = catalog.districts[0];
  const listingId = 'automated-order-test-listing';
  db.prepare(`INSERT INTO listings(id,title,category,subcategory,district,price,unit,quantity,negotiable,sellerName,businessName,description,images,phone,saleType,minOrderQuantity,deliveryAvailable,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active')`).run(
    listingId, 'Automated test product', category.key, category.subcategories[0], district,
    25, 'piece', 8, 0, 'Test seller', 'Test shop', 'Automated test listing for order validation.',
    '[]', '01712345678', 'both', 1, 1
  );
  db.close();

  const listingResponse = await fetch(`${base}/api/listings/${listingId}`);
  assert.equal(listingResponse.status, 200, 'seeded listing should be visible');
  const listing = await listingResponse.json();
  assert.equal(listing.id, listingId);

  const orderPayload = { listingId, quantity: 2, buyerName: 'Test Buyer', buyerPhone: '01712345678', buyerEmail: 'buyer@example.com', address: 'Test address, Dhaka' };
  const orderResponse = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) });
  assert.equal(orderResponse.status, 201, 'valid order should be created');
  const order = await orderResponse.json();
  assert.ok(order.id, 'created order must return an id');

  const tooMany = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...orderPayload, quantity: 99 }) });
  assert.equal(tooMany.status, 400, 'orders exceeding available stock must be rejected');

  const invalid = await fetch(`${base}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...orderPayload, buyerEmail: 'not-an-email' }) });
  assert.equal(invalid.status, 400, 'invalid buyer details must be rejected');

  const payment = await fetch(`${base}/api/payments/sslcommerz/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.id, method: 'bkash' }) });
  assert.equal(payment.status, 503, 'payment must fail closed when gateway credentials are absent');

  const otp = await fetch(`${base}/api/otp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '01712345678', purpose: 'verify_phone' }) });
  assert.equal(otp.status, 503, 'SMS must fail closed when provider credentials are absent');

  console.log('PASS health endpoint');
  console.log('PASS listing retrieval');
  console.log('PASS valid order creation');
  console.log('PASS stock-limit rejection');
  console.log('PASS invalid-order rejection');
  console.log('PASS payment configuration guard');
  console.log('PASS SMS configuration guard');
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
  await rm(dataDir, { recursive: true, force: true });
}
