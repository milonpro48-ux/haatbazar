import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { access, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'infinityfree', 'config.php');
const dsn = process.env.HAATBAZAR_TEST_DB_DSN;
const dbUser = process.env.HAATBAZAR_TEST_DB_USER;
const dbPassword = process.env.HAATBAZAR_TEST_DB_PASSWORD;
if (!dsn || !dbUser || dbPassword === undefined) throw new Error('Set HAATBAZAR_TEST_DB_DSN, HAATBAZAR_TEST_DB_USER, and HAATBAZAR_TEST_DB_PASSWORD');

try { await access(configPath); throw new Error('Refusing to overwrite infinityfree/config.php; remove the local secret config before running this test'); }
catch (error) { if (error?.code !== 'ENOENT') throw error; }

const config = `<?php
return [
  'db_dsn' => ${JSON.stringify(dsn)},
  'db_user' => ${JSON.stringify(dbUser)},
  'db_password' => ${JSON.stringify(dbPassword)},
  'public_base_url' => 'http://127.0.0.1',
  'sslcommerz_sandbox' => true,
  'sslcommerz_store_id' => 'TEST_STORE',
  'sslcommerz_store_password' => 'TEST_PASSWORD'
];
`;
await writeFile(configPath, config, { mode: 0o600 });

const probe = net.createServer();
await new Promise((resolve, reject) => probe.listen(0, '127.0.0.1', error => error ? reject(error) : resolve()));
const { port } = probe.address();
await new Promise(resolve => probe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const php = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', path.join(root, 'infinityfree')], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
php.stdout.on('data', chunk => { logs += chunk; });
php.stderr.on('data', chunk => { logs += chunk; });

async function startServer() {
  const until = Date.now() + 12000;
  while (Date.now() < until) {
    if (php.exitCode !== null) throw new Error(`PHP server exited: ${logs}`);
    try {
      const response = await fetch(`${base}/api/index.php?action=csrf`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`PHP server did not start: ${logs}`);
}

function sessionClient() {
  let cookie = '';
  let csrf = '';
  async function call(action, { method = 'GET', query = {}, body, expect = 200 } = {}) {
    const url = new URL('/api/index.php', base);
    url.searchParams.set('action', action);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value));
    const headers = { Accept: 'application/json' };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = csrf;
    }
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';', 1)[0];
    const data = await response.json();
    assert.equal(response.status, expect, `${method} ${action} expected ${expect}, got ${response.status}: ${JSON.stringify(data)}`);
    if (typeof data.csrf === 'string') csrf = data.csrf;
    return data;
  }
  return { call, get csrf() { return csrf; } };
}

async function main() {
  await startServer();
  const suffix = Date.now().toString();
  const seller = sessionClient();
  let initial = await seller.call('csrf');
  seller.csrf = initial.csrf;
  const sellerAccount = await seller.call('register', {
    method: 'POST', expect: 201,
    body: { name: 'Test Seller', email: `seller-${suffix}@example.test`, phone: '01712345678', password: 'TestSellerPassword123!', role: 'seller' }
  });
  assert.equal(sellerAccount.user.role, 'seller');

  const listing = await seller.call('create_listing', {
    method: 'POST', expect: 201,
    body: {
      title: 'Integration test TV', category: 'electronics', subcategory: 'টিভি ও অডিও',
      district: 'ঢাকা', upazila: 'ধানমন্ডি', price: 2500, unit: 'piece', quantity: 8,
      negotiable: false, sellerName: 'Test Seller', businessName: 'Test Shop',
      description: 'Product created by the MySQL integration test.', images: [], phone: '01712345678',
      saleType: 'both', minOrderQuantity: 1, deliveryAvailable: true
    }
  });
  assert.ok(listing.id);

  const publicProducts = await seller.call('products', { query: { limit: 50 } });
  assert.ok(publicProducts.items.some(item => item.id === listing.id), 'seller listing must appear in public homepage feed');
  const detail = await seller.call('listing', { query: { id: listing.id } });
  assert.equal(detail.id, listing.id);

  const buyer = sessionClient();
  const buyerCsrf = await buyer.call('csrf');
  buyer.csrf = buyerCsrf.csrf;
  const buyerAccount = await buyer.call('register', {
    method: 'POST', expect: 201,
    body: { name: 'Test Buyer', email: `buyer-${suffix}@example.test`, phone: '01812345678', password: 'TestBuyerPassword123!', role: 'buyer' }
  });
  assert.equal(buyerAccount.user.role, 'buyer');
  const order = await buyer.call('orders', {
    method: 'POST', expect: 201,
    body: { listingId: listing.id, quantity: 2, buyerName: 'Test Buyer', buyerPhone: '01812345678', buyerEmail: `buyer-${suffix}@example.test`, address: 'Test address, Dhaka' }
  });
  assert.ok(order.id);

  const sellerOrders = await seller.call('seller_orders');
  assert.ok(sellerOrders.items.some(item => item.id === order.id), 'seller must see orders for their own listing');

  const seedAdmin = spawnSync('php', ['-r', `
    $c = require ${JSON.stringify(configPath)};
    $p = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $s = $p->prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?,?)');
    $s->execute(['Test Admin', 'admin-${suffix}@example.test', '', password_hash('TestAdminPassword123!', PASSWORD_DEFAULT), 'admin']);
  `], { cwd: root, encoding: 'utf8' });
  assert.equal(seedAdmin.status, 0, `admin seed failed: ${seedAdmin.stderr}`);

  const admin = sessionClient();
  const adminCsrf = await admin.call('csrf');
  admin.csrf = adminCsrf.csrf;
  const adminLogin = await admin.call('login', {
    method: 'POST',
    body: { email: `admin-${suffix}@example.test`, password: 'TestAdminPassword123!' }
  });
  assert.equal(adminLogin.user.role, 'admin');
  const adminOrders = await admin.call('admin_orders');
  assert.ok(adminOrders.items.some(item => item.id === order.id), 'admin must see the buyer order');

  console.log('PASS seller-created product appears in public listing feed');
  console.log('PASS listing detail reads from the same MySQL database');
  console.log('PASS buyer order is created against the seller listing');
  console.log('PASS seller can see orders for their listing');
  console.log('PASS admin can see buyer order');
}

try {
  await main();
} finally {
  php.kill('SIGTERM');
  await Promise.race([once(php, 'exit'), new Promise(resolve => setTimeout(resolve, 2500))]);
  await rm(configPath, { force: true });
}
