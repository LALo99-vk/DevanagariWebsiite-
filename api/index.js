// Vercel serverless entry point. Every /api/*, /health and /sitemap.xml request
// is rewritten here (see vercel.json) and handled by the same Express app that
// runs as a normal server locally.
import app from '../server/razorpay-server.js';

export default app;
