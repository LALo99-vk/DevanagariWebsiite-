/**
 * End-to-end tests: real Supabase (local Docker: Postgres + Auth + PostgREST, same
 * as production), the real API server code, and a fake Razorpay.
 *
 * Flow:
 *   1. Load the ORIGINAL production schema and seed "existing" customers, an admin,
 *      addresses, carts and a past order (like the live site today).
 *   2. Prove the old holes are real (a customer can make themselves admin, fake an order).
 *   3. Apply database-security-fixes.sql (twice, to prove it is re-runnable).
 *   4. Test: no user/data lost, existing users still work, holes closed, admin panel
 *      works, full purchase flow, cancellations/refunds, webhooks, abuse cases.
 *
 * Run with: server/tests/run-e2e.sh   (never points at production; see guard below)
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { FakeRazorpay } = require('./fake-razorpay');

const SUPABASE_URL = process.env.E2E_SUPABASE_URL;
const ANON_KEY = process.env.E2E_ANON_KEY;
const SERVICE_KEY = process.env.E2E_SERVICE_KEY;
const DB_URL = process.env.E2E_DB_URL;

// Hard guard: these tests reset data and must never run against a real project.
for (const url of [SUPABASE_URL, DB_URL]) {
  if (!url || !/^(https?|postgres(ql)?):\/\/([^@]+@)?(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error(`Refusing to run: E2E target must be localhost, got "${url}"`);
  }
}

process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = 'rzp_test_e2e';
process.env.RAZORPAY_KEY_SECRET = 'e2e_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'e2e_webhook_secret';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';

const { createApp } = require('../app');

const ROOT = path.join(__dirname, '..', '..');
const MIGRATION = path.join(ROOT, 'database-security-fixes.sql');
const PASSWORD = 'E2e-test-Password-123!';

const service = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const fake = new FakeRazorpay(process.env.RAZORPAY_KEY_SECRET);

const sql = (q) => execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-Atqc', q]).toString().trim();
const psqlFile = (f) => execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-q', '-f', f], { stdio: 'pipe' }).toString();
const one = async (p) => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data;
};

let server;
let baseUrl;
const S = {}; // shared state: users, products, addresses, …

async function makeUser(email, fullName) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user;
}

async function signIn(email) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return { client, token: data.session.access_token, user: data.user };
}

async function api(method, urlPath, { token, body, headers = {}, raw } = {}) {
  const res = await fetch(baseUrl + urlPath, {
    method,
    headers: {
      ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, body: json, headers: res.headers };
}

function signWebhook(rawBody) {
  return crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
}

async function sendWebhook(event, payload) {
  const raw = JSON.stringify({ entity: 'event', event, payload, created_at: Math.floor(Date.now() / 1000) });
  return api('POST', '/api/webhooks/razorpay', { raw, headers: { 'X-Razorpay-Signature': signWebhook(raw) } });
}

const stockOf = (id) => Number(sql(`select stock from public.products where id='${id}'`));
const ordersForPayment = (pid) => Number(sql(`select count(*) from public.orders where payment_id='${pid}'`));

/** Full purchase as the browser does it: create-order → Razorpay checkout → verify. */
async function buy(who, items, addressId, promo, payOpts) {
  const created = await api('POST', '/api/razorpay/create-order', {
    token: who.token,
    body: { items, address_id: addressId, promo_code: promo || null },
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const paid = fake.pay(created.body.id, payOpts);
  const verified = await api('POST', '/api/razorpay/verify-payment', {
    token: who.token,
    body: {
      razorpay_order_id: paid.razorpay_order_id,
      razorpay_payment_id: paid.razorpay_payment_id,
      razorpay_signature: paid.razorpay_signature,
    },
  });
  return { created, paid, verified };
}

function snapshot() {
  return {
    auth_users: sql('select count(*) from auth.users'),
    users: sql('select count(*) from public.users'),
    admins: sql("select string_agg(email, ',' order by email) from public.users where is_admin"),
    addresses: sql('select count(*) from public.user_addresses'),
    cart_items: sql('select count(*) from public.cart_items'),
    orders: sql('select count(*) from public.orders'),
    order_items: sql('select count(*) from public.order_items'),
    products: sql('select count(*) from public.products'),
    promo_codes: sql('select count(*) from public.promo_codes'),
    legacy_order: sql("select total || '|' || status || '|' || payment_status from public.orders where payment_id = 'pay_legacy_1'"),
  };
}

// ---------------------------------------------------------------------------
// Setup: production-like data on the ORIGINAL schema, then migrate
// ---------------------------------------------------------------------------
before(async () => {
  // Products (mirrors live catalogue) + edge cases
  const products = await one(
    service
      .from('products')
      .insert([
        { name: 'Devanagari Health Mix 900g', price: 800, stock: 100, weight: 900 },
        { name: 'Devanagari Health Mix 450g', price: 400, stock: 100, weight: 450 },
        { name: 'Devanagari Health Mix 200g', price: 200, stock: 100, weight: 200 },
        { name: 'Discontinued Mix', price: 300, stock: 50, weight: 300, is_active: false },
        { name: 'Limited Edition Mix', price: 500, stock: 1, weight: 500 },
      ], { defaultToNull: false })
      .select()
  );
  const byName = Object.fromEntries(products.map((p) => [p.name, p.id]));
  S.p900 = byName['Devanagari Health Mix 900g'];
  S.p450 = byName['Devanagari Health Mix 450g'];
  S.p200 = byName['Devanagari Health Mix 200g'];
  S.pInactive = byName['Discontinued Mix'];
  S.pLimited = byName['Limited Edition Mix'];

  await one(
    service.from('promo_codes').insert([
      { code: 'SAVE10', description: '10% off', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, max_discount_amount: 100, usage_limit: 1000 },
      { code: 'BIG20', description: '20% off', discount_type: 'percentage', discount_value: 20, min_order_amount: 500, max_discount_amount: 200, usage_limit: 500, is_active: false },
      { code: 'FLAT50', description: '₹50 off', discount_type: 'fixed', discount_value: 50, min_order_amount: 300 },
      { code: 'USEDUP', description: 'gone', discount_type: 'percentage', discount_value: 5, usage_limit: 1, used_count: 1 },
    ], { defaultToNull: false })
  );

  // Existing users (the auth trigger creates their public.users rows)
  const custAuth = await makeUser('existing.customer@example.com', 'Existing Customer');
  const otherAuth = await makeUser('other.customer@example.com', 'Other Customer');
  const adminAuth = await makeUser('shop.admin@example.com', 'Shop Admin');
  sql(`update public.users set is_admin = true, role = 'super_admin' where id = '${adminAuth.id}'`);

  const addr = (user_id, postal_code, extra = {}) => ({
    user_id,
    name: 'Ravi Kumar',
    phone: '9876543210',
    address_line_1: '12 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postal_code,
    ...extra,
  });
  const addrs = await one(
    service
      .from('user_addresses')
      .insert([
        addr(custAuth.id, '560001', { is_default: true }),
        addr(custAuth.id, '577001', { city: 'Davangere' }),
        addr(custAuth.id, '5600', { city: 'Typo Town' }),
        addr(otherAuth.id, '400001', { city: 'Mumbai' }),
      ], { defaultToNull: false })
      .select()
  );
  S.addrPaid = addrs[0].id;
  S.addrFree = addrs[1].id;
  S.addrBadPin = addrs[2].id;
  S.addrOther = addrs[3].id;

  await one(
    service.from('cart_items').insert([
      { user_id: custAuth.id, product_id: S.p900, quantity: 1 },
      { user_id: custAuth.id, product_id: S.p450, quantity: 2 },
    ])
  );

  // A past delivered order, created the old way
  const legacy = await one(
    service
      .from('orders')
      .insert({
        user_id: custAuth.id, subtotal: 400, total: 499, shipping_amount: 99, status: 'delivered',
        payment_status: 'paid', payment_id: 'pay_legacy_1', payment_order_id: 'order_legacy_1',
      })
      .select()
      .single()
  );
  await one(
    service.from('order_items').insert({
      order_id: legacy.id, product_id: S.p450, product_name: 'Devanagari Health Mix 450g', product_price: 400, quantity: 1, total_price: 400,
    })
  );
  S.legacyOrderId = legacy.id;
  // The old trigger dropped shipping/discount quirks; pin the stored totals.
  sql(`update public.orders set subtotal = 400, total = 499 where id = '${legacy.id}'`);

  S.cust = await signIn('existing.customer@example.com');
  S.other = await signIn('other.customer@example.com');
  S.admin = await signIn('shop.admin@example.com');

  // ---- Prove the holes exist BEFORE the migration ----
  const escalate = await S.cust.client.from('users').update({ is_admin: true, role: 'super_admin' }).eq('id', S.cust.user.id).select();
  S.preMigrationEscalation = !escalate.error && escalate.data?.[0]?.is_admin === true;
  sql(`update public.users set is_admin = false, role = 'user' where id = '${S.cust.user.id}'`);

  const fakeOrder = await S.cust.client
    .from('orders')
    .insert({ user_id: S.cust.user.id, subtotal: 1, total: 1, status: 'processing', payment_status: 'paid' })
    .select();
  S.preMigrationFakeOrder = !fakeOrder.error && fakeOrder.data?.length === 1;
  if (fakeOrder.data?.[0]) sql(`delete from public.orders where id = '${fakeOrder.data[0].id}'`);

  S.before = snapshot();

  // ---- Apply the migration twice (must be re-runnable) ----
  psqlFile(MIGRATION);
  psqlFile(MIGRATION);

  S.after = snapshot();

  // Lift rate limits for the main suite (one test below checks the limiter itself).
  const high = { max: 10000 };
  const app = createApp({
    razorpay: fake,
    supabaseAdmin: service,
    rateLimits: { createOrder: high, verify: high, cancel: high, promo: high },
  });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
});

// ---------------------------------------------------------------------------
describe('0. The old holes were real (before migration)', () => {
  test('a customer could make themselves super admin', () => {
    assert.equal(S.preMigrationEscalation, true);
  });
  test('a customer could insert a fake "paid" order', () => {
    assert.equal(S.preMigrationFakeOrder, true);
  });
});

describe('1. No user or data lost by the migration', () => {
  test('every count is identical before and after', () => {
    assert.deepEqual(S.after, S.before);
  });
  test('the admin is still the only admin', () => {
    assert.equal(S.after.admins, 'shop.admin@example.com');
  });
  test('all auth users still have a profile row', () => {
    assert.equal(sql('select count(*) from auth.users a left join public.users u on u.id = a.id where u.id is null'), '0');
  });
});

describe('2. Existing customers keep working (same calls the website makes)', () => {
  test('signs in and reads own profile', async () => {
    const me = await one(S.cust.client.from('users').select('*').eq('id', S.cust.user.id).single());
    assert.equal(me.email, 'existing.customer@example.com');
    assert.equal(me.is_admin, false);
  });
  test('profile save (createOrUpdateUser upsert) and last-login update work', async () => {
    await one(
      S.cust.client.from('users').upsert({
        id: S.cust.user.id, email: 'existing.customer@example.com', full_name: 'Existing Customer Renamed',
        avatar_url: null, last_login: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
    );
    await one(S.cust.client.from('users').update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', S.cust.user.id));
    assert.equal(sql(`select full_name from public.users where id='${S.cust.user.id}'`), 'Existing Customer Renamed');
  });
  test('sees own addresses, cart and order history with items', async () => {
    const addresses = await one(S.cust.client.from('user_addresses').select('*'));
    assert.equal(addresses.length, 3);
    const cart = await one(S.cust.client.from('cart_items').select('*, product:products(*)'));
    assert.equal(cart.length, 2);
    const orders = await one(S.cust.client.from('orders').select('*, order_items(*)'));
    assert.equal(orders.length, 1);
    assert.equal(orders[0].order_items.length, 1);
    assert.equal(Number(orders[0].total), 499);
  });
  test('can add, edit, set default and delete addresses (Settings page)', async () => {
    const a = await one(
      S.cust.client.from('user_addresses').insert({
        user_id: S.cust.user.id, name: 'Ravi', phone: '9876543210', address_line_1: 'New St', city: 'Mysuru', state: 'Karnataka', postal_code: '570001',
      }).select().single()
    );
    await one(S.cust.client.from('user_addresses').update({ city: 'Mysore' }).eq('id', a.id));
    await one(S.cust.client.from('user_addresses').update({ is_default: true }).eq('id', a.id));
    await one(S.cust.client.from('user_addresses').update({ is_default: true }).eq('id', S.addrPaid));
    await one(S.cust.client.from('user_addresses').delete().eq('id', a.id));
  });
  test('can add, change and remove cart items', async () => {
    const item = await one(S.cust.client.from('cart_items').insert({ user_id: S.cust.user.id, product_id: S.p200, quantity: 1 }).select().single());
    await one(S.cust.client.from('cart_items').update({ quantity: 3 }).eq('id', item.id));
    await one(S.cust.client.from('cart_items').delete().eq('id', item.id));
  });
  test('cannot see another customer’s data', async () => {
    assert.equal((await one(S.cust.client.from('users').select('id').eq('id', S.other.user.id))).length, 0);
    assert.equal((await one(S.cust.client.from('user_addresses').select('id').eq('user_id', S.other.user.id))).length, 0);
    assert.equal((await one(S.other.client.from('orders').select('id'))).length, 0);
  });
  test('shop page: anyone can browse active products and offers', async () => {
    const ids = (await one(anon.from('products').select('id'))).map((p) => p.id);
    assert.ok(ids.includes(S.p900) && ids.includes(S.p450) && ids.includes(S.p200));
    assert.ok(!ids.includes(S.pInactive), 'discontinued product must be hidden');
    assert.equal(ids.length, Number(sql('select count(*) from public.products where is_active')));
    const offers = await one(anon.from('promo_codes').select('code').eq('is_active', true));
    assert.ok(offers.length >= 1);
  });
});

describe('3. New sign-ups still work', () => {
  test('new user gets a normal (non-admin) profile automatically', async () => {
    const u = await makeUser('brand.new@example.com', 'Brand New');
    assert.equal(sql(`select is_admin || '|' || role from public.users where id='${u.id}'`), 'false|user');
    S.newbie = await signIn('brand.new@example.com');
  });
  test('if the profile row is missing, the website can create it, but never as admin', async () => {
    sql(`delete from public.users where id='${S.newbie.user.id}'`);
    await one(
      S.newbie.client.from('users').insert({ id: S.newbie.user.id, email: 'brand.new@example.com', full_name: 'Brand New', is_admin: true, role: 'super_admin' })
    );
    assert.equal(sql(`select is_admin || '|' || role from public.users where id='${S.newbie.user.id}'`), 'false|user');
  });
});

describe('4. Privilege escalation and tampering are blocked', () => {
  test('customer cannot set is_admin on themselves', async () => {
    const r = await S.cust.client.from('users').update({ is_admin: true }).eq('id', S.cust.user.id);
    assert.ok(r.error, 'expected an error');
    assert.equal(sql(`select is_admin from public.users where id='${S.cust.user.id}'`), 'f');
  });
  test('customer cannot change their role or re-activate themselves', async () => {
    assert.ok((await S.cust.client.from('users').update({ role: 'super_admin' }).eq('id', S.cust.user.id)).error);
    assert.ok((await S.cust.client.from('users').update({ is_active: false }).eq('id', S.cust.user.id)).error);
  });
  test('customer cannot escalate through upsert either (silently forced back to non-admin)', async () => {
    await S.cust.client.from('users').upsert({ id: S.cust.user.id, email: 'existing.customer@example.com', is_admin: true, role: 'super_admin' });
    assert.equal(sql(`select is_admin || '|' || role from public.users where id='${S.cust.user.id}'`), 'false|user');
  });
  test('customer cannot edit another customer’s profile', async () => {
    await S.cust.client.from('users').update({ full_name: 'hacked' }).eq('id', S.other.user.id);
    assert.equal(sql(`select full_name from public.users where id='${S.other.user.id}'`), 'Other Customer');
  });
  test('customer cannot create, edit or delete orders directly', async () => {
    const ins = await S.cust.client.from('orders').insert({ user_id: S.cust.user.id, subtotal: 1, total: 1, payment_status: 'paid' });
    assert.ok(ins.error);
    await S.cust.client.from('orders').update({ status: 'cancelled', payment_status: 'refunded' }).eq('id', S.legacyOrderId);
    await S.cust.client.from('orders').delete().eq('id', S.legacyOrderId);
    assert.equal(sql(`select status || '|' || payment_status from public.orders where id='${S.legacyOrderId}'`), 'delivered|paid');
    const item = await S.cust.client.from('order_items').insert({
      order_id: S.legacyOrderId, product_id: S.p900, product_name: 'x', product_price: 1, quantity: 1, total_price: 1,
    });
    assert.ok(item.error);
  });
  test('customer cannot change prices, stock or promo codes', async () => {
    await S.cust.client.from('products').update({ price: 1, stock: 99999 }).eq('id', S.p900);
    assert.equal(sql(`select price::int || '|' || stock from public.products where id='${S.p900}'`), '800|100');
    await S.cust.client.from('promo_codes').update({ discount_value: 100 }).eq('code', 'SAVE10');
    assert.equal(sql("select discount_value::int from public.promo_codes where code='SAVE10'"), '10');
  });
  test('customer cannot call server-only functions or read checkout sessions', async () => {
    assert.ok((await S.cust.client.rpc('increment_promo_usage', { p_code: 'SAVE10' })).error);
    assert.ok((await S.cust.client.rpc('adjust_product_stock', { p_items: [], p_direction: 1 })).error);
    const sessions = await S.cust.client.from('checkout_sessions').select('*');
    assert.ok(sessions.error || sessions.data.length === 0);
  });
  test('logged-out visitors cannot read users or orders', async () => {
    assert.equal((await anon.from('users').select('id')).data?.length ?? 0, 0);
    assert.equal((await anon.from('orders').select('id')).data?.length ?? 0, 0);
  });
});

describe('5. Admin panel still works', () => {
  test('admin sees all users and orders', async () => {
    assert.ok((await one(S.admin.client.from('users').select('id'))).length >= 4);
    assert.ok((await one(S.admin.client.from('orders').select('id'))).length >= 1);
  });
  test('admin can change a user’s role and active status, and revert', async () => {
    await one(S.admin.client.from('users').update({ role: 'admin' }).eq('id', S.other.user.id));
    await one(S.admin.client.from('users').update({ is_active: false }).eq('id', S.other.user.id));
    assert.equal(sql(`select role || '|' || is_active from public.users where id='${S.other.user.id}'`), 'admin|false');
    await one(S.admin.client.from('users').update({ role: 'user', is_active: true }).eq('id', S.other.user.id));
  });
  test('admin can update order status', async () => {
    await one(S.admin.client.from('orders').update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('id', S.legacyOrderId));
  });
  test('admin can create, edit and delete products and promo codes', async () => {
    const p = await one(S.admin.client.from('products').insert([{ name: 'Admin Test', price: 10, stock: 1, weight: 10 }]).select().single());
    await one(S.admin.client.from('products').update({ price: 11 }).eq('id', p.id));
    await one(S.admin.client.from('products').delete().eq('id', p.id));
    await one(S.admin.client.from('promo_codes').insert([{ code: 'ADMINTEST', description: 'x', discount_type: 'fixed', discount_value: 1 }]));
    await one(S.admin.client.from('promo_codes').update({ discount_value: 2 }).eq('code', 'ADMINTEST'));
    await one(S.admin.client.from('promo_codes').delete({ count: 'exact' }).eq('code', 'ADMINTEST'));
  });
  test('admin-only payment endpoints: 401 logged out, 403 customer, 200 admin', async () => {
    const paid = fake.pay((await fake.orders.create({ amount: 1000, currency: 'INR' })).id);
    const url = `/api/razorpay/payment/${paid.razorpay_payment_id}`;
    assert.equal((await api('GET', url)).status, 401);
    assert.equal((await api('GET', url, { token: S.cust.token })).status, 403);
    assert.equal((await api('GET', url, { token: S.admin.token })).status, 200);
    assert.equal((await api('POST', `${url}/refund`, { token: S.cust.token, body: {} })).status, 403);
    assert.equal((await api('POST', `${url}/capture`, { token: S.cust.token, body: {} })).status, 403);
  });
  test('forged or garbage tokens are rejected', async () => {
    const forged = S.cust.token.split('.').slice(0, 2).join('.') + '.forgedsignature';
    assert.equal((await api('POST', '/api/razorpay/create-order', { token: forged, body: {} })).status, 401);
    assert.equal((await api('POST', '/api/razorpay/create-order', { token: 'nonsense', body: {} })).status, 401);
  });
});

describe('6. Buying products (full checkout)', () => {
  test('happy path: server prices the cart, payment verified, order saved', async () => {
    const before900 = stockOf(S.p900);
    const before450 = stockOf(S.p450);
    const usedBefore = Number(sql("select used_count from public.promo_codes where code='SAVE10'"));

    // Extra client fields (price, amount) must be ignored.
    const created = await api('POST', '/api/razorpay/create-order', {
      token: S.cust.token,
      body: {
        items: [
          { product_id: S.p900, quantity: 1, price: 1 },
          { product_id: S.p450, quantity: 2, price: 1 },
        ],
        address_id: S.addrPaid,
        promo_code: 'save10',
        amount: 100,
      },
    });
    assert.equal(created.status, 200, JSON.stringify(created.body));
    // 800 + 2×400 = 1600; 10% = 160 capped at 100; shipping 99 → 1599
    assert.equal(created.body.amount, 159900);
    assert.deepEqual(created.body.quote, { subtotal: 1600, shipping_amount: 99, discount_amount: 100, total: 1599, promo_code: 'SAVE10' });

    const paid = fake.pay(created.body.id);
    const verified = await api('POST', '/api/razorpay/verify-payment', {
      token: S.cust.token,
      body: { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature },
    });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    const order = verified.body.order;
    assert.equal(order.status, 'processing');
    assert.equal(order.payment_status, 'paid');
    assert.equal(order.user_id, S.cust.user.id);
    assert.equal(Number(order.subtotal), 1600);
    assert.equal(Number(order.discount_amount), 100);
    assert.equal(Number(order.shipping_amount), 99);
    assert.equal(Number(order.total), 1599, 'total must keep the discount (old trigger dropped it)');
    assert.equal(order.promo_code, 'SAVE10');
    assert.ok(order.order_number, 'order number assigned');
    assert.equal(order.shipping_address.id, S.addrPaid);
    assert.equal(order.order_items.length, 2);
    const line = order.order_items.find((i) => i.product_id === S.p450);
    assert.equal(Number(line.product_price), 400);
    assert.equal(line.quantity, 2);
    assert.equal(Number(line.total_price), 800);

    assert.equal(stockOf(S.p900), before900 - 1);
    assert.equal(stockOf(S.p450), before450 - 2);
    assert.equal(Number(sql("select used_count from public.promo_codes where code='SAVE10'")), usedBefore + 1);
    assert.equal(sql(`select status from public.checkout_sessions where razorpay_order_id='${created.body.id}'`), 'completed');

    // Customer sees it in order history
    const mine = await one(S.cust.client.from('orders').select('id').eq('id', order.id));
    assert.equal(mine.length, 1);
    S.paidOrder = { id: order.id, paymentId: paid.razorpay_payment_id, rzpOrderId: created.body.id, sig: paid.razorpay_signature };
  });

  test('Davangere pincode gets free delivery', async () => {
    const { created, verified } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrFree);
    assert.equal(created.body.quote.shipping_amount, 0);
    assert.equal(created.body.amount, 20000);
    assert.equal(verified.status, 200);
  });

  test('fixed-amount promo with minimum order', async () => {
    const { created } = await buy(S.cust, [{ product_id: S.p450, quantity: 1 }], S.addrPaid, 'FLAT50');
    assert.equal(created.body.quote.discount_amount, 50);
    assert.equal(created.body.amount, (400 + 99 - 50) * 100);
  });

  test('duplicate products in the cart are merged', async () => {
    const r = await api('POST', '/api/razorpay/create-order', {
      token: S.cust.token,
      body: { items: [{ product_id: S.p200, quantity: 1 }, { product_id: S.p200, quantity: 2 }], address_id: S.addrPaid },
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.quote.subtotal, 600);
  });

  test('verifying the same payment twice does not create a second order', async () => {
    const again = await api('POST', '/api/razorpay/verify-payment', {
      token: S.cust.token,
      body: { razorpay_order_id: S.paidOrder.rzpOrderId, razorpay_payment_id: S.paidOrder.paymentId, razorpay_signature: S.paidOrder.sig },
    });
    assert.equal(again.status, 200);
    assert.equal(again.body.order.id, S.paidOrder.id);
    assert.equal(ordersForPayment(S.paidOrder.paymentId), 1);
  });

  test('webhook for an already-saved payment does not duplicate it', async () => {
    const payment = await fake.payments.fetch(S.paidOrder.paymentId);
    const r = await sendWebhook('payment.captured', { payment: { entity: payment } });
    assert.equal(r.status, 200);
    assert.equal(ordersForPayment(S.paidOrder.paymentId), 1);
  });

  test('customer closes the tab after paying: the webhook still saves the order', async () => {
    const created = await api('POST', '/api/razorpay/create-order', {
      token: S.cust.token, body: { items: [{ product_id: S.p200, quantity: 2 }], address_id: S.addrPaid },
    });
    const paid = fake.pay(created.body.id);
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 0);
    const r = await sendWebhook('payment.captured', { payment: { entity: paid.payment } });
    assert.equal(r.status, 200);
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 1);
    assert.equal(sql(`select status || '|' || payment_status || '|' || total::int from public.orders where payment_id='${paid.razorpay_payment_id}'`), 'processing|paid|499');
  });

  test('browser verify and webhook arriving at the same time create exactly one order', async () => {
    const created = await api('POST', '/api/razorpay/create-order', {
      token: S.cust.token, body: { items: [{ product_id: S.p200, quantity: 1 }], address_id: S.addrPaid },
    });
    const paid = fake.pay(created.body.id);
    const body = { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature };
    const results = await Promise.all([
      api('POST', '/api/razorpay/verify-payment', { token: S.cust.token, body }),
      api('POST', '/api/razorpay/verify-payment', { token: S.cust.token, body }),
      sendWebhook('payment.captured', { payment: { entity: paid.payment } }),
    ]);
    assert.ok(results.some((r) => r.status === 200 && r.body?.order));
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 1);
  });

  test('authorized-but-not-captured payment is captured, then saved', async () => {
    const { paid, verified } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrPaid, null, { status: 'authorized' });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    assert.equal((await fake.payments.fetch(paid.razorpay_payment_id)).status, 'captured');
  });

  test('a checkout stuck mid-save (server restart) recovers on retry', async () => {
    const created = await api('POST', '/api/razorpay/create-order', {
      token: S.cust.token, body: { items: [{ product_id: S.p200, quantity: 1 }], address_id: S.addrPaid },
    });
    const paid = fake.pay(created.body.id);
    sql(`update public.checkout_sessions set status='processing', updated_at = now() - interval '10 minutes' where razorpay_order_id='${created.body.id}'`);
    const r = await api('POST', '/api/razorpay/verify-payment', {
      token: S.cust.token,
      body: { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 1);
  });
});

describe('7. Checkout abuse and bad input is rejected', () => {
  const create = (body, token = S.cust.token) => api('POST', '/api/razorpay/create-order', { token, body });
  const ok = () => [{ product_id: S.p200, quantity: 1 }];

  test('not signed in → 401', async () => {
    assert.equal((await create({ items: ok(), address_id: S.addrPaid }, null)).status, 401);
    assert.equal((await api('POST', '/api/razorpay/verify-payment', { body: {} })).status, 401);
    assert.equal((await api('POST', `/api/orders/${S.legacyOrderId}/cancel`)).status, 401);
  });
  test('empty cart, bad product ids and bad quantities → 400', async () => {
    assert.equal((await create({ items: [], address_id: S.addrPaid })).status, 400);
    assert.equal((await create({ items: [{ product_id: 'not-a-uuid', quantity: 1 }], address_id: S.addrPaid })).status, 400);
    assert.equal((await create({ items: [{ product_id: crypto.randomUUID(), quantity: 1 }], address_id: S.addrPaid })).status, 400);
    for (const quantity of [0, -1, 1.5, 101, '2', null]) {
      assert.equal((await create({ items: [{ product_id: S.p200, quantity }], address_id: S.addrPaid })).status, 400, `quantity ${quantity}`);
    }
  });
  test('discontinued product → 400', async () => {
    assert.equal((await create({ items: [{ product_id: S.pInactive, quantity: 1 }], address_id: S.addrPaid })).status, 400);
  });
  test('more than in stock → 409 with a clear message', async () => {
    const r = await create({ items: [{ product_id: S.pLimited, quantity: 2 }], address_id: S.addrPaid });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /Only 1 left/);
  });
  test('last unit sells, then it is out of stock', async () => {
    const { verified } = await buy(S.cust, [{ product_id: S.pLimited, quantity: 1 }], S.addrPaid);
    assert.equal(verified.status, 200);
    assert.equal(stockOf(S.pLimited), 0);
    const r = await create({ items: [{ product_id: S.pLimited, quantity: 1 }], address_id: S.addrPaid });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /out of stock/);
  });
  test('someone else’s address, a missing address or a bad pincode → 400', async () => {
    assert.equal((await create({ items: ok(), address_id: S.addrOther })).status, 400);
    assert.equal((await create({ items: ok() })).status, 400);
    const bad = await create({ items: ok(), address_id: S.addrBadPin });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /pincode/);
  });
  test('invalid, inactive, used-up or below-minimum promo codes → 400', async () => {
    for (const promo_code of ['NOPE', 'BIG20', 'USEDUP']) {
      assert.equal((await create({ items: ok(), address_id: S.addrPaid, promo_code })).status, 400, promo_code);
    }
    const r = await create({ items: ok(), address_id: S.addrPaid, promo_code: 'FLAT50' }); // ₹200 < ₹300 minimum
    assert.equal(r.status, 400);
  });
  test('forged payment signature → 400, no order', async () => {
    const created = await create({ items: ok(), address_id: S.addrPaid });
    const paid = fake.pay(created.body.id);
    const r = await api('POST', '/api/razorpay/verify-payment', {
      token: S.cust.token,
      body: { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: 'a'.repeat(64) },
    });
    assert.equal(r.status, 400);
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 0);
  });
  test('paying less than the order total → rejected, no order', async () => {
    const created = await create({ items: [{ product_id: S.p900, quantity: 1 }], address_id: S.addrPaid });
    const paid = fake.pay(created.body.id, { amount: 100 });
    const r = await api('POST', '/api/razorpay/verify-payment', {
      token: S.cust.token,
      body: { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature },
    });
    assert.equal(r.status, 400);
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 0);
  });
  test('reusing a cheap payment for an expensive order → rejected', async () => {
    const cheap = await create({ items: [{ product_id: S.p200, quantity: 1 }], address_id: S.addrPaid });
    const cheapPaid = fake.pay(cheap.body.id);
    const pricey = await create({ items: [{ product_id: S.p900, quantity: 1 }], address_id: S.addrPaid });
    const r = await api('POST', '/api/razorpay/verify-payment', {
      token: S.cust.token,
      body: { razorpay_order_id: pricey.body.id, razorpay_payment_id: cheapPaid.razorpay_payment_id, razorpay_signature: fake.sign(pricey.body.id, cheapPaid.razorpay_payment_id) },
    });
    assert.equal(r.status, 400);
    assert.equal(ordersForPayment(cheapPaid.razorpay_payment_id), 0);
  });
  test('another customer cannot claim my payment', async () => {
    const created = await create({ items: ok(), address_id: S.addrPaid });
    const paid = fake.pay(created.body.id);
    const r = await api('POST', '/api/razorpay/verify-payment', {
      token: S.other.token,
      body: { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature },
    });
    assert.equal(r.status, 403);
    assert.equal(ordersForPayment(paid.razorpay_payment_id), 0);
  });
});

describe('8. Cancellations and refunds', () => {
  test('customer cancels a paid order: full refund, stock returned', async () => {
    const { verified, paid } = await buy(S.cust, [{ product_id: S.p450, quantity: 3 }], S.addrPaid);
    const orderId = verified.body.order.id;
    const stockBefore = stockOf(S.p450);

    const r = await api('POST', `/api/orders/${orderId}/cancel`, { token: S.cust.token });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.refund.amount, (1200 + 99) * 100);
    const row = sql(`select status || '|' || payment_status || '|' || refund_amount::int || '|' || refund_status from public.orders where id='${orderId}'`);
    assert.equal(row, 'cancelled|refunded|1299|processed');
    assert.equal(stockOf(S.p450), stockBefore + 3);
    assert.equal((await fake.payments.fetch(paid.razorpay_payment_id)).amount_refunded, 129900);
    S.cancelledOrderId = orderId;
  });
  test('cancelling twice does not refund twice', async () => {
    const r = await api('POST', `/api/orders/${S.cancelledOrderId}/cancel`, { token: S.cust.token });
    assert.equal(r.status, 400);
    assert.equal(fake.refundsList.filter((x) => x.notes.order_id === S.cancelledOrderId).length, 1);
  });
  test('double-click cancel (parallel) refunds once', async () => {
    const { verified } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrPaid);
    const id = verified.body.order.id;
    const results = await Promise.all([1, 2, 3].map(() => api('POST', `/api/orders/${id}/cancel`, { token: S.cust.token })));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(fake.refundsList.filter((x) => x.notes.order_id === id).length, 1);
  });
  test('another customer cannot cancel my order (looks like it does not exist)', async () => {
    assert.equal((await api('POST', `/api/orders/${S.paidOrder.id}/cancel`, { token: S.other.token })).status, 404);
  });
  test('shipped or delivered orders cannot be cancelled', async () => {
    await one(S.admin.client.from('orders').update({ status: 'shipped' }).eq('id', S.paidOrder.id));
    assert.equal((await api('POST', `/api/orders/${S.paidOrder.id}/cancel`, { token: S.cust.token })).status, 400);
    assert.equal((await api('POST', `/api/orders/${S.legacyOrderId}/cancel`, { token: S.cust.token })).status, 400);
    await one(S.admin.client.from('orders').update({ status: 'processing' }).eq('id', S.paidOrder.id));
  });
  test('if the bank refund fails, the order is left as it was', async () => {
    const { verified } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrPaid);
    const id = verified.body.order.id;
    const stock = stockOf(S.p200);
    fake.failNextRefund = true;
    const r = await api('POST', `/api/orders/${id}/cancel`, { token: S.cust.token });
    assert.equal(r.status, 502);
    assert.equal(sql(`select status || '|' || payment_status from public.orders where id='${id}'`), 'processing|paid');
    assert.equal(stockOf(S.p200), stock);
    // Retrying later works
    assert.equal((await api('POST', `/api/orders/${id}/cancel`, { token: S.cust.token })).status, 200);
  });
  test('customers can only cancel within 24 hours; admins can still cancel later', async () => {
    const { verified } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrPaid);
    const id = verified.body.order.id;
    sql(`update public.orders set created_at = now() - interval '25 hours' where id='${id}'`);
    const late = await api('POST', `/api/orders/${id}/cancel`, { token: S.cust.token });
    assert.equal(late.status, 400);
    assert.match(late.body.error, /24 hours/);
    assert.equal((await api('POST', `/api/orders/${id}/cancel`, { token: S.admin.token })).status, 200);
  });
  test('admin can cancel a customer’s order', async () => {
    const { verified } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrPaid);
    assert.equal((await api('POST', `/api/orders/${verified.body.order.id}/cancel`, { token: S.admin.token })).status, 200);
  });
  test('Razorpay refund.processed webhook updates the order', async () => {
    const { verified, paid } = await buy(S.cust, [{ product_id: S.p200, quantity: 1 }], S.addrPaid);
    sql(`update public.orders set refund_status='pending' where id='${verified.body.order.id}'`);
    const r = await sendWebhook('refund.processed', {
      refund: { entity: { id: 'rfnd_webhook', payment_id: paid.razorpay_payment_id, amount: 29900, created_at: Math.floor(Date.now() / 1000) } },
    });
    assert.equal(r.status, 200);
    assert.equal(sql(`select refund_status || '|' || refund_id from public.orders where id='${verified.body.order.id}'`), 'processed|rfnd_webhook');
  });
});

describe('9. Webhook, promo preview, headers, removed endpoints, rate limits', () => {
  test('webhook with a bad or missing signature → 401', async () => {
    const raw = JSON.stringify({ event: 'payment.captured', payload: {} });
    assert.equal((await api('POST', '/api/webhooks/razorpay', { raw, headers: { 'X-Razorpay-Signature': 'bad' } })).status, 401);
    assert.equal((await api('POST', '/api/webhooks/razorpay', { raw })).status, 401);
  });
  test('webhook for a payment not made on the website is ignored', async () => {
    const r = await sendWebhook('payment.captured', { payment: { entity: { id: 'pay_x', order_id: 'order_not_ours', amount: 100 } } });
    assert.equal(r.status, 200);
  });
  test('promo preview returns the server-calculated discount', async () => {
    const r = await api('POST', '/api/promo/validate', { body: { code: 'save10', orderAmount: 1600 } });
    assert.equal(r.status, 200);
    assert.equal(r.body.discountAmount, 100);
    assert.equal((await api('POST', '/api/promo/validate', { body: { code: 'NOPE', orderAmount: 100 } })).status, 400);
  });
  test('security headers are set and the debug/email endpoints are gone', async () => {
    const r = await api('GET', '/health');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(r.headers.get('x-powered-by'), null);
    assert.equal((await api('GET', '/api/debug/env')).status, 404);
    assert.equal((await api('POST', '/api/notify/order-confirmation', { body: { to: 'victim@example.com' } })).status, 404);
  });
  test('public config exposes only the publishable key id', async () => {
    const r = await api('GET', '/api/razorpay/config');
    assert.deepEqual(Object.keys(r.body).sort(), ['currency', 'environment', 'key_id']);
    assert.ok(!JSON.stringify(r.body).includes(process.env.RAZORPAY_KEY_SECRET));
  });
  test('rate limiting kicks in on promo guessing', async () => {
    const limited = createApp({ razorpay: fake, supabaseAdmin: service, rateLimits: { promo: { max: 3 } } });
    const srv = await new Promise((resolve) => {
      const s = limited.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const url = `http://127.0.0.1:${srv.address().port}/api/promo/validate`;
      const codes = [];
      for (let i = 0; i < 5; i++) {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: `GUESS${i}` }) });
        codes.push(res.status);
      }
      assert.deepEqual(codes, [400, 400, 400, 429, 429]);
    } finally {
      await new Promise((resolve) => srv.close(resolve));
    }
  });
});

describe('10. Final data integrity', () => {
  test('every paid order has items and totals that add up', () => {
    const bad = sql(`
      select count(*) from public.orders o
      where o.payment_status in ('paid','refunded')
        and (not exists (select 1 from public.order_items i where i.order_id = o.id)
             or o.total <> o.subtotal + coalesce(o.shipping_amount,0) + coalesce(o.tax_amount,0) - coalesce(o.discount_amount,0)
             or o.subtotal <> (select sum(total_price) from public.order_items i where i.order_id = o.id))`);
    assert.equal(bad, '0');
  });
  test('no payment is attached to more than one order', () => {
    assert.equal(sql('select count(*) from (select payment_id from public.orders where payment_id is not null group by 1 having count(*) > 1) d'), '0');
  });
  test('stock never went negative', () => {
    assert.equal(sql('select count(*) from public.products where stock < 0'), '0');
  });
  test('still exactly one admin, and every user still exists', () => {
    assert.equal(sql('select count(*) from public.users where is_admin'), '1');
    assert.equal(sql('select count(*) from auth.users a left join public.users u on u.id = a.id where u.id is null'), '0');
  });
});
