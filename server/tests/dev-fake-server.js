// Local-only API server for clicking through the real website without real payments:
// the production app code + a fake Razorpay, plus a /__fake/pay helper that the
// browser-side Razorpay stub calls to "complete" a payment.
// Usage: E2E_SUPABASE_URL=… E2E_SERVICE_KEY=… node server/tests/dev-fake-server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { FakeRazorpay } = require('./fake-razorpay');

const url = process.env.E2E_SUPABASE_URL || '';
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(url)) throw new Error('dev-fake-server only runs against local Supabase');

process.env.RAZORPAY_KEY_ID = 'rzp_test_e2e';
process.env.RAZORPAY_KEY_SECRET = 'e2e_key_secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'e2e_webhook_secret';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';

const { createApp } = require('../app');
const fake = new FakeRazorpay(process.env.RAZORPAY_KEY_SECRET);
const supabaseAdmin = createClient(url, process.env.E2E_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const outer = express();
outer.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS.split(',')[0]);
  next();
});
outer.post('/__fake/pay/:orderId', (req, res) => {
  const { payment, ...result } = fake.pay(req.params.orderId);
  res.json(result);
});
outer.get('/__fake/refunds', (req, res) => res.json(fake.refundsList));
outer.use(createApp({ razorpay: fake, supabaseAdmin }));

const port = Number(process.env.PORT || 3999);
outer.listen(port, '127.0.0.1', () => console.log(`fake API on http://127.0.0.1:${port}`));
