const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('✉️ Nodemailer not installed. Email sending will be disabled until installed.');
}

/**
 * Builds the Express app. Clients are injected so the test suite can swap in a
 * fake Razorpay and a local Supabase.
 */
function createApp({ razorpay, supabaseAdmin, rateLimits = {} }) {
const app = express();

if (!supabaseAdmin) {
  console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: checkout, cancellation and admin endpoints will fail.');
}

// -----------------------------------------------------------------------------
// Pricing rules (the server is the only source of truth for what a customer pays)
// -----------------------------------------------------------------------------
const FREE_DELIVERY_PINCODES = new Set(['577001', '577002', '577003', '577004', '577005', '577006', '577008']);
const SHIPPING_CHARGE_PAISE = 99 * 100;
const MAX_LINE_ITEMS = 50;
const MAX_QUANTITY_PER_ITEM = 100;
const CANCELLABLE_STATUSES = ['pending', 'processing'];
// Matches the policy shown on the order page: "Orders can be cancelled within 24 hours".
const CUSTOMER_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PINCODE_RE = /^\d{6}$/;
// A checkout stuck in 'processing' this long (e.g. server restarted mid-save) can be retried.
const STALE_PROCESSING_MS = 2 * 60 * 1000;

const toPaise = (inr) => Math.round(Number(inr) * 100);
const toInr = (paise) => Math.round(paise) / 100;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

const corsOptions = {
  origin: process.env.ALLOW_ALL_ORIGINS === 'true' ? (origin, callback) => callback(null, true) : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.disable('x-powered-by');
// Render/Railway sit behind one proxy; needed so req.ip is the customer's IP.
// If a CDN (e.g. Cloudflare) is added in front, set TRUST_PROXY=2.
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use(cors(corsOptions));
app.options(/^\/.*/, cors(corsOptions));
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}
// Keep the exact raw bytes so the Razorpay webhook signature can be verified.
app.use(
  express.json({
    limit: '100kb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

const validateRazorpayConfig = (req, res, next) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({ error: 'Payment provider is not configured' });
  }
  if (process.env.NODE_ENV === 'production' && process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
    console.warn('⚠️ WARNING: Using TEST Razorpay key in PRODUCTION!');
    return res.status(500).json({ error: 'Invalid payment provider configuration' });
  }
  next();
};

const requireSupabase = (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  next();
};

// Verifies the caller's Supabase access token (sent as "Authorization: Bearer <token>").
async function requireUser(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Please sign in' });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    req.user = data.user;
    next();
  } catch (err) {
    console.error('❌ Auth check failed:', err.message);
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

async function isAdminUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('is_admin, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('❌ Admin lookup failed:', error.message);
    return false;
  }
  return Boolean(data?.is_admin) && data?.is_active !== false;
}

function requireAdmin(req, res, next) {
  requireUser(req, res, async () => {
    if (!(await isAdminUser(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// Small in-memory rate limiter (per server instance) to slow down abuse such as
// promo-code guessing or hammering the payment endpoints.
function rateLimit(name, { windowMs, max }, keyFn) {
  const hits = new Map();
  const limits = { windowMs, max, ...(rateLimits[name] || {}) };
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }, 60 * 1000).unref();
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + limits.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limits.max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    next();
  };
}
const byUser = (req) => req.user?.id || req.ip;
const byIp = (req) => req.ip;
const TEN_MIN = 10 * 60 * 1000;
const limitCreateOrder = rateLimit('createOrder', { windowMs: TEN_MIN, max: 20 }, byUser);
const limitVerify = rateLimit('verify', { windowMs: TEN_MIN, max: 30 }, byUser);
const limitCancel = rateLimit('cancel', { windowMs: TEN_MIN, max: 10 }, byUser);
const limitPromo = rateLimit('promo', { windowMs: TEN_MIN, max: 60 }, byIp);

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function sendError(res, error, fallbackMessage) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  // Razorpay SDK errors carry statusCode + error.description
  if (error?.statusCode && error?.error?.description) {
    console.error(`❌ ${fallbackMessage}:`, error.error.description);
    return res.status(502).json({ error: error.error.description });
  }
  console.error(`❌ ${fallbackMessage}:`, error);
  res.status(500).json({ error: fallbackMessage });
}

// -----------------------------------------------------------------------------
// Promo codes
// -----------------------------------------------------------------------------
async function evaluatePromo(code, subtotalPaise) {
  const { data: promo, error } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', String(code).trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new HttpError(500, 'Failed to validate promo code');
  if (!promo) throw new HttpError(400, 'Invalid promo code');

  const now = new Date();
  const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
  const validUntil = promo.valid_until ? new Date(promo.valid_until) : null;
  if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
    throw new HttpError(400, 'Promo code is not valid at this time');
  }
  if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
    throw new HttpError(400, 'Promo code has reached its usage limit');
  }
  const minOrderPaise = toPaise(promo.min_order_amount || 0);
  if (subtotalPaise < minOrderPaise) {
    throw new HttpError(400, `Minimum order amount of ₹${promo.min_order_amount} required for this promo code`);
  }

  let discountPaise = 0;
  if (promo.discount_type === 'percentage') {
    discountPaise = Math.round((subtotalPaise * Number(promo.discount_value)) / 100);
    if (promo.max_discount_amount) {
      discountPaise = Math.min(discountPaise, toPaise(promo.max_discount_amount));
    }
  } else if (promo.discount_type === 'fixed') {
    discountPaise = toPaise(promo.discount_value);
  }
  // A discount can never exceed the item subtotal.
  discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));

  return { promo, discountPaise };
}

// -----------------------------------------------------------------------------
// Checkout: quote → Razorpay order → verify → create DB order
// -----------------------------------------------------------------------------
async function buildQuote(userId, body) {
  const rawItems = Array.isArray(body?.items) ? body.items : [];
  if (rawItems.length === 0) throw new HttpError(400, 'Your cart is empty');
  if (rawItems.length > MAX_LINE_ITEMS) throw new HttpError(400, 'Too many items in cart');

  // Merge duplicate products and validate quantities.
  const quantities = new Map();
  for (const item of rawItems) {
    const productId = String(item?.product_id || '');
    const quantity = item?.quantity;
    if (!UUID_RE.test(productId)) throw new HttpError(400, 'Invalid product in cart');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
      throw new HttpError(400, 'Invalid quantity in cart');
    }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  const productIds = [...quantities.keys()];
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price, stock, is_active')
    .in('id', productIds);
  if (productsError) throw new HttpError(500, 'Failed to load products');

  const byId = new Map((products || []).map((p) => [p.id, p]));
  const items = productIds.map((id) => {
    const product = byId.get(id);
    if (!product || product.is_active === false) {
      throw new HttpError(400, 'A product in your cart is no longer available. Please refresh your cart.');
    }
    const quantity = quantities.get(id);
    const stock = Number(product.stock ?? 0);
    if (stock < quantity) {
      throw new HttpError(
        409,
        stock > 0
          ? `Only ${stock} left of ${product.name}. Please reduce the quantity.`
          : `${product.name} is out of stock.`
      );
    }
    const pricePaise = toPaise(product.price);
    return {
      product_id: id,
      product_name: product.name,
      product_price: toInr(pricePaise),
      quantity,
      total_price: toInr(pricePaise * quantity),
      _linePaise: pricePaise * quantity,
    };
  });

  // Shipping address must be one of the caller's saved addresses.
  const addressId = String(body?.address_id || '');
  if (!UUID_RE.test(addressId)) throw new HttpError(400, 'Please select a shipping address');
  const { data: address, error: addressError } = await supabaseAdmin
    .from('user_addresses')
    .select('*')
    .eq('id', addressId)
    .eq('user_id', userId)
    .maybeSingle();
  if (addressError) throw new HttpError(500, 'Failed to load address');
  if (!address) throw new HttpError(400, 'Please select a valid shipping address');
  if (!PINCODE_RE.test(String(address.postal_code || '').trim())) {
    throw new HttpError(400, 'Please enter a valid 6-digit pincode for this address');
  }

  const subtotalPaise = items.reduce((sum, i) => sum + i._linePaise, 0);
  const shippingPaise = FREE_DELIVERY_PINCODES.has(String(address.postal_code).trim()) ? 0 : SHIPPING_CHARGE_PAISE;

  let discountPaise = 0;
  let promoCode = null;
  if (body?.promo_code && String(body.promo_code).trim()) {
    const result = await evaluatePromo(body.promo_code, subtotalPaise);
    discountPaise = result.discountPaise;
    promoCode = result.promo.code;
  }

  const totalPaise = subtotalPaise + shippingPaise - discountPaise;
  if (totalPaise < 100) throw new HttpError(400, 'Order total must be at least ₹1');

  return {
    amount_paise: totalPaise,
    quote: {
      items: items.map(({ _linePaise, ...rest }) => rest),
      subtotal: toInr(subtotalPaise),
      shipping_amount: toInr(shippingPaise),
      discount_amount: toInr(discountPaise),
      total: toInr(totalPaise),
      promo_code: promoCode,
      shipping_address: address,
    },
  };
}

async function loadOrderWithItems(orderId) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single();
  if (error) throw new HttpError(500, 'Failed to load order');
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Turns a paid Razorpay order into a database order. Idempotent: safe to call from
 * both the browser's verify step and the Razorpay webhook for the same payment.
 */
async function finalizeCheckout(razorpayOrderId, paymentId, { expectedUserId, signature } = {}) {
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle();
  if (sessionError) throw new HttpError(500, 'Failed to load checkout');
  if (!session) throw new HttpError(404, 'Checkout not found');
  if (expectedUserId && session.user_id !== expectedUserId) throw new HttpError(403, 'This payment belongs to another account');
  if (session.status === 'completed' && session.order_id) return loadOrderWithItems(session.order_id);

  // Confirm with Razorpay that this exact amount was actually paid for this order.
  let payment = await razorpay.payments.fetch(paymentId);
  if (payment.order_id !== razorpayOrderId) throw new HttpError(400, 'Payment does not match this order');
  if (Number(payment.amount) !== Number(session.amount_paise) || payment.currency !== 'INR') {
    throw new HttpError(400, 'Payment amount does not match the order total');
  }
  if (payment.status === 'authorized') {
    payment = await razorpay.payments.capture(paymentId, payment.amount, 'INR');
  }
  if (payment.status !== 'captured') throw new HttpError(402, 'Payment has not been completed');

  // Claim the session so two concurrent calls can't both create an order.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('checkout_sessions')
    .update({ status: 'processing', payment_id: paymentId, updated_at: new Date().toISOString() })
    .eq('razorpay_order_id', razorpayOrderId)
    .in('status', ['created', 'failed'])
    .select()
    .maybeSingle();
  if (claimError) throw new HttpError(500, 'Failed to process checkout');

  let claimedSession = claimed;
  if (!claimedSession) {
    // Take over a checkout that got stuck mid-save (e.g. the server restarted).
    const { data: reclaimed } = await supabaseAdmin
      .from('checkout_sessions')
      .update({ status: 'processing', payment_id: paymentId, updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('status', 'processing')
      .lt('updated_at', new Date(Date.now() - STALE_PROCESSING_MS).toISOString())
      .select()
      .maybeSingle();
    claimedSession = reclaimed;
  }

  if (!claimedSession) {
    // Another request is finishing this order; wait briefly for it.
    for (let i = 0; i < 10; i++) {
      await sleep(500);
      const { data: s } = await supabaseAdmin
        .from('checkout_sessions')
        .select('status, order_id')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle();
      if (s?.status === 'completed' && s.order_id) return loadOrderWithItems(s.order_id);
      if (s?.status === 'failed') break;
    }
    throw new HttpError(409, 'Your order is still being processed. Please check your orders in a minute.');
  }

  const quote = session.quote;
  let orderId = null;
  try {
    // orders.user_id references public.users; make sure the profile row exists.
    await supabaseAdmin
      .from('users')
      .upsert({ id: session.user_id, email: session.email || '' }, { onConflict: 'id', ignoreDuplicates: true });

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: session.user_id,
        subtotal: quote.subtotal,
        shipping_amount: quote.shipping_amount,
        discount_amount: quote.discount_amount,
        total: quote.total,
        status: 'processing',
        payment_status: 'paid',
        payment_method: 'razorpay',
        payment_id: paymentId,
        payment_order_id: razorpayOrderId,
        payment_signature: signature || null,
        currency: 'INR',
        shipping_address: quote.shipping_address,
        promo_code: quote.promo_code,
      })
      .select('id')
      .single();
    if (orderError) throw orderError;
    orderId = order.id;

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(quote.items.map((item) => ({ ...item, order_id: orderId })));
    if (itemsError) throw itemsError;

    const { error: stockError } = await supabaseAdmin.rpc('adjust_product_stock', {
      p_items: quote.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      p_direction: -1,
    });
    if (stockError) console.warn('⚠️ Failed to update stock:', stockError.message);

    if (quote.promo_code) {
      const { error: promoError } = await supabaseAdmin.rpc('increment_promo_usage', { p_code: quote.promo_code });
      if (promoError) console.warn('⚠️ Failed to count promo usage:', promoError.message);
    }

    await supabaseAdmin
      .from('checkout_sessions')
      .update({ status: 'completed', order_id: orderId, updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', razorpayOrderId);
  } catch (err) {
    console.error('❌ Failed to save paid order:', err.message || err);
    if (orderId) await supabaseAdmin.from('orders').delete().eq('id', orderId);
    await supabaseAdmin
      .from('checkout_sessions')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', razorpayOrderId);
    throw new HttpError(500, 'Payment received, but saving your order failed. Please contact support with your payment ID: ' + paymentId);
  }

  const savedOrder = await loadOrderWithItems(orderId);
  sendOrderConfirmationEmail(session.email, savedOrder).catch((e) =>
    console.error('❌ Failed to send confirmation email:', e.message)
  );
  return savedOrder;
}

// Create a Razorpay order for the caller's cart. The client sends WHAT to buy;
// the server decides the price.
app.post('/api/razorpay/create-order', validateRazorpayConfig, requireUser, limitCreateOrder, async (req, res) => {
  try {
    const { amount_paise, quote } = await buildQuote(req.user.id, req.body);

    const order = await razorpay.orders.create({
      amount: amount_paise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { user_id: req.user.id, source: 'devanagari_web' },
    });

    const { error } = await supabaseAdmin.from('checkout_sessions').insert({
      razorpay_order_id: order.id,
      user_id: req.user.id,
      email: req.user.email || null,
      amount_paise,
      quote,
    });
    if (error) throw new HttpError(500, 'Failed to start checkout');

    res.json({
      id: order.id,
      entity: order.entity,
      amount: order.amount,
      amount_paid: order.amount_paid,
      amount_due: order.amount_due,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      attempts: order.attempts,
      notes: order.notes,
      created_at: order.created_at,
      quote: {
        subtotal: quote.subtotal,
        shipping_amount: quote.shipping_amount,
        discount_amount: quote.discount_amount,
        total: quote.total,
        promo_code: quote.promo_code,
      },
    });
  } catch (error) {
    sendError(res, error, 'Failed to create order');
  }
});

// Verify the payment signature, then create the order in the database.
app.post('/api/razorpay/verify-payment', validateRazorpayConfig, requireUser, limitVerify, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ isValid: false, error: 'Missing required payment details' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (!safeEqualHex(expectedSignature, String(razorpay_signature))) {
      console.warn('❌ Invalid payment signature for order', razorpay_order_id);
      return res.status(400).json({ isValid: false, error: 'Invalid payment signature' });
    }

    const order = await finalizeCheckout(razorpay_order_id, razorpay_payment_id, {
      expectedUserId: req.user.id,
      signature: razorpay_signature,
    });

    res.json({
      isValid: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      order,
    });
  } catch (error) {
    sendError(res, error, 'Failed to verify payment');
  }
});

async function restockOrder(orderId) {
  const { data: items } = await supabaseAdmin.from('order_items').select('product_id, quantity').eq('order_id', orderId);
  if (!items?.length) return;
  const { error } = await supabaseAdmin.rpc('adjust_product_stock', { p_items: items, p_direction: 1 });
  if (error) console.warn('⚠️ Failed to restock cancelled order:', error.message);
}

// Customer (or admin) cancels an order; paid orders are refunded in full.
app.post('/api/orders/:orderId/cancel', validateRazorpayConfig, requireUser, limitCancel, async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!UUID_RE.test(orderId)) throw new HttpError(400, 'Invalid order');

    const { data: order, error } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (error) throw new HttpError(500, 'Failed to load order');
    if (!order) throw new HttpError(404, 'Order not found');
    const callerIsAdmin = await isAdminUser(req.user.id);
    if (order.user_id !== req.user.id && !callerIsAdmin) {
      throw new HttpError(404, 'Order not found');
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new HttpError(400, `Orders that are ${order.status} can't be cancelled`);
    }
    if (!callerIsAdmin && Date.now() - new Date(order.created_at).getTime() > CUSTOMER_CANCEL_WINDOW_MS) {
      throw new HttpError(400, 'Orders can only be cancelled within 24 hours of purchase. Please contact support.');
    }

    // Atomically claim the cancellation so a double-click can't refund twice.
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .in('status', CANCELLABLE_STATUSES)
      .select('id')
      .maybeSingle();
    if (claimError) throw new HttpError(500, 'Failed to cancel order');
    if (!claimed) throw new HttpError(409, 'This order was already updated. Please refresh.');

    const reason = 'Order cancelled by customer';
    if (order.payment_status !== 'paid' || !order.payment_id) {
      await restockOrder(orderId);
      return res.json({ cancelled: true, refund: null, order: await loadOrderWithItems(orderId) });
    }

    let refund;
    try {
      const payment = await razorpay.payments.fetch(order.payment_id);
      const refundable = Number(payment.amount) - Number(payment.amount_refunded || 0);
      const amount = Math.min(toPaise(order.total), refundable);
      if (amount < 100) throw new HttpError(400, 'Nothing left to refund on this payment');
      refund = await razorpay.payments.refund(order.payment_id, {
        amount,
        speed: 'normal',
        notes: { order_id: orderId, refund_reason: reason },
      });
    } catch (refundError) {
      // Put the order back so the customer can retry or contact support.
      await supabaseAdmin
        .from('orders')
        .update({ status: order.status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      throw refundError;
    }

    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'refunded',
        refund_id: refund.id,
        refund_amount: toInr(refund.amount),
        refund_reason: reason,
        refund_status: refund.status === 'processed' ? 'processed' : 'pending',
        refunded_at: new Date(refund.created_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
    await restockOrder(orderId);

    res.json({
      cancelled: true,
      refund: { id: refund.id, amount: refund.amount, status: refund.status, created_at: refund.created_at },
      order: await loadOrderWithItems(orderId),
    });
  } catch (error) {
    sendError(res, error, 'Failed to cancel order');
  }
});

// -----------------------------------------------------------------------------
// Admin-only Razorpay endpoints
// -----------------------------------------------------------------------------
app.get('/api/razorpay/payment/:paymentId', validateRazorpayConfig, requireAdmin, async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.json({
      id: payment.id,
      entity: payment.entity,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      order_id: payment.order_id,
      method: payment.method,
      captured: payment.captured,
      description: payment.description,
      card_id: payment.card_id,
      bank: payment.bank,
      wallet: payment.wallet,
      vpa: payment.vpa,
      email: payment.email,
      contact: payment.contact,
      created_at: payment.created_at,
    });
  } catch (error) {
    sendError(res, error, 'Failed to fetch payment details');
  }
});

app.get('/api/razorpay/order/:orderId', validateRazorpayConfig, requireAdmin, async (req, res) => {
  try {
    const order = await razorpay.orders.fetch(req.params.orderId);
    res.json({
      id: order.id,
      entity: order.entity,
      amount: order.amount,
      amount_paid: order.amount_paid,
      amount_due: order.amount_due,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      attempts: order.attempts,
      notes: order.notes,
      created_at: order.created_at,
    });
  } catch (error) {
    sendError(res, error, 'Failed to fetch order details');
  }
});

app.get('/api/razorpay/order/:orderId/payments', validateRazorpayConfig, requireAdmin, async (req, res) => {
  try {
    const payments = await razorpay.orders.fetchPayments(req.params.orderId);
    res.json({
      entity: payments.entity,
      count: payments.count,
      items: payments.items.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        captured: payment.captured,
        created_at: payment.created_at,
      })),
    });
  } catch (error) {
    sendError(res, error, 'Failed to fetch order payments');
  }
});

app.post('/api/razorpay/payment/:paymentId/capture', validateRazorpayConfig, requireAdmin, async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    const captured = await razorpay.payments.capture(payment.id, payment.amount, payment.currency);
    res.json({
      id: captured.id,
      amount: captured.amount,
      currency: captured.currency,
      status: captured.status,
      captured: captured.captured,
    });
  } catch (error) {
    sendError(res, error, 'Failed to capture payment');
  }
});

app.post('/api/razorpay/payment/:paymentId/refund', validateRazorpayConfig, requireAdmin, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, speed = 'normal', notes = {} } = req.body || {};
    const payment = await razorpay.payments.fetch(paymentId);
    const refundable = Number(payment.amount) - Number(payment.amount_refunded || 0);
    const requested = amount ? Math.round(Number(amount)) : refundable;
    if (!Number.isFinite(requested) || requested < 100 || requested > refundable) {
      throw new HttpError(400, 'Invalid refund amount');
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: requested,
      speed: speed === 'optimum' ? 'optimum' : 'normal',
      notes: {
        refund_reason: String(notes.refund_reason || 'Refund by admin').slice(0, 200),
        refunded_by: req.user.id,
      },
    });

    res.json({
      id: refund.id,
      entity: refund.entity,
      amount: refund.amount,
      currency: refund.currency,
      payment_id: refund.payment_id,
      status: refund.status,
      speed_processed: refund.speed_processed,
      speed_requested: refund.speed_requested,
      receipt: refund.receipt,
      notes: refund.notes,
      created_at: refund.created_at,
    });
  } catch (error) {
    sendError(res, error, 'Failed to process refund');
  }
});

// -----------------------------------------------------------------------------
// Razorpay webhook (configure in Razorpay Dashboard → Webhooks)
// Events used: payment.captured, order.paid, refund.created, refund.processed, refund.failed
// -----------------------------------------------------------------------------
async function updateOrderRefundStatus(paymentId, refundData) {
  if (!supabaseAdmin) return;
  const { error } = await supabaseAdmin.from('orders').update(refundData).eq('payment_id', paymentId);
  if (error) console.error('❌ Error updating order refund status:', error.message);
}

app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('⚠️ Webhook secret not configured');
      return res.status(400).json({ error: 'Webhook not configured' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody || Buffer.alloc(0))
      .digest('hex');

    if (!safeEqualHex(expectedSignature, String(req.headers['x-razorpay-signature'] || ''))) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    console.log('🔗 Razorpay webhook:', event);

    switch (event) {
      case 'payment.captured':
      case 'order.paid': {
        // Backup path: creates the order even if the customer closed the tab
        // before the browser could call verify-payment.
        const payment = payload?.payment?.entity;
        if (payment?.order_id && payment?.id && supabaseAdmin) {
          try {
            await finalizeCheckout(payment.order_id, payment.id);
          } catch (err) {
            if (err instanceof HttpError && err.status === 404) break; // not a website checkout
            if (err instanceof HttpError && err.status === 409) break; // verify-payment is handling it
            throw err;
          }
        }
        break;
      }

      case 'refund.created':
      case 'refund.processed':
      case 'refund.failed': {
        const refund = payload?.refund?.entity;
        if (refund?.payment_id) {
          const status = event === 'refund.processed' ? 'processed' : event === 'refund.failed' ? 'failed' : 'pending';
          await updateOrderRefundStatus(refund.payment_id, {
            refund_id: refund.id,
            refund_amount: toInr(refund.amount),
            refund_status: status,
            refunded_at: new Date(refund.created_at * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        break;
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error.message || error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// -----------------------------------------------------------------------------
// Public endpoints
// -----------------------------------------------------------------------------
app.get('/api/razorpay/config', (req, res) => {
  // The key_id is public by design (Razorpay checkout needs it). Never send the secret.
  res.json({
    key_id: process.env.RAZORPAY_KEY_ID,
    currency: 'INR',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Preview a promo code's discount. Checkout recalculates it on the server anyway.
app.post('/api/promo/validate', limitPromo, requireSupabase, async (req, res) => {
  try {
    const { code, orderAmount = 0 } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Promo code is required', valid: false });

    const subtotalPaise = Math.max(0, toPaise(orderAmount) || 0);
    const { promo, discountPaise } = await evaluatePromo(code, subtotalPaise);

    res.json({
      valid: true,
      code: promo.code,
      discount: promo.discount_value,
      type: promo.discount_type,
      description: promo.description,
      discountAmount: toInr(discountPaise),
      minOrderAmount: promo.min_order_amount,
      maxDiscountAmount: promo.max_discount_amount,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message, valid: false });
    }
    console.error('❌ Error validating promo code:', error);
    res.status(500).json({ error: 'Failed to validate promo code', valid: false });
  }
});

// -----------------------------------------------------------------------------
// Email
// -----------------------------------------------------------------------------
async function sendOrderConfirmationEmail(to, order) {
  if (!to) return;
  if (!nodemailer || !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('✉️ Email not sent (SMTP not configured) for order', order.id);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const from = process.env.SMTP_FROM || 'no-reply@sreeshivanifoods.com';
  const orderRef = String(order.order_number || order.id).replace(/[^A-Za-z0-9-]/g, '');
  const total = `INR ${Number(order.total).toFixed(2)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111;">
      <h2 style="color:#4A5C3D;">Your order is confirmed 🎉</h2>
      <p>Thank you for shopping with <strong>Devanagari (Sree Shivani Foods)</strong>.</p>
      <p><strong>Order:</strong> ${orderRef}</p>
      <p><strong>Total Paid:</strong> ${total}</p>
      <p>Your order will be delivered in 3-4 working days.</p>
      <hr />
      <p style="font-size:12px;color:#666;">This is an automated message. Please do not reply.</p>
    </div>
  `;

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Congratulations! Your order has been placed',
    html,
  });
  console.log('✉️ Order confirmation email sent:', info.messageId);
}

// -----------------------------------------------------------------------------
// Frontend (production build) + sitemap
// -----------------------------------------------------------------------------
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.warn('⚠️ Dist directory does not exist:', distPath);
}

app.use(express.static(distPath));

const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sreeshivanifoods.in/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sreeshivanifoods.in/shop</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://sreeshivanifoods.in/cart</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://sreeshivanifoods.in/checkout</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://sreeshivanifoods.in/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://sreeshivanifoods.in/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://sreeshivanifoods.in/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
</urlset>`;

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(SITEMAP_XML);
});

// SPA fallback for non-API routes
app.get(/^\/(?!api|health|assets).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 404 for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler (must be last)
app.use((error, req, res, next) => {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

return app;
}

module.exports = { createApp };
