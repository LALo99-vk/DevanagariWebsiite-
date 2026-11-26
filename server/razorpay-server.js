require('dotenv').config();
const Razorpay = require('razorpay');
const { createClient } = require('@supabase/supabase-js');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Service-role client: bypasses RLS. Never expose this key to the browser.
const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const app = createApp({ razorpay, supabaseAdmin });

// Long-running server (local dev, Render). On Vercel this file is imported by
// api/index.js instead, and the exported app is used as the request handler.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });

  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
}

module.exports = app;
