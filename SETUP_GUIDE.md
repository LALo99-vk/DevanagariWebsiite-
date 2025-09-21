# 🚀 Devanagari Web - Complete Setup Guide

## 📋 **What This Guide Covers**

This single guide will take you from cloning the repository to having a fully functional e-commerce platform running on your own infrastructure.

**What you'll get:**

- ✅ Complete e-commerce platform
- ✅ Google OAuth authentication
- ✅ Razorpay payment processing
- ✅ Admin panel for management
- ✅ Product catalog management
- ✅ Order management system

---

## 📥 **Step 1: Clone & Install**

```bash
# Clone the repository
git clone <repository-url>
cd DevanagariWeb

# Install dependencies
npm install
cd server && npm install && cd ..
```

---

## 🗄️ **Step 2: Database Setup (Supabase)**

### **2.1 Create Supabase Project**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project" → Enter details → Create
3. Wait for project to be ready (2-3 minutes)

### **2.2 Get Credentials**

1. Go to **Settings** → **API**
2. Copy: **Project URL**, **anon public key**, **service_role key**

### **2.3 Set Up Database**

1. Go to **SQL Editor** in Supabase
2. Copy **entire contents** of `database-schema.sql`
3. Paste and click **"Run"**
4. Wait for completion (30-60 seconds)

### **2.4 Set Up Admin User**

```sql
-- Replace with your actual email
UPDATE public.users
SET is_admin = true, role = 'super_admin'
WHERE email = 'your-email@example.com';
```

---

## 🔐 **Step 3: Google OAuth Setup**

### **3.1 Create Google Cloud Project**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Devanagari Web Auth"

### **3.2 Enable Google+ API**

1. **APIs & Services** → **Library** → Search "Google+ API" → Enable

### **3.3 Configure OAuth Consent Screen**

1. **APIs & Services** → **OAuth consent screen**
2. Choose **"External"** → Fill form:
   - App name: Devanagari Web
   - User support email: your-email@example.com
3. Add scopes: `../auth/userinfo.email`, `../auth/userinfo.profile`, `openid`
4. Add test users (your email)

### **3.4 Create OAuth Credentials**

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
2. Choose **"Web application"**
3. Add redirect URIs:
   ```
   http://localhost:5173/auth/callback
   https://yourdomain.com/auth/callback
   ```
4. Copy **Client ID** and **Client Secret**

### **3.5 Configure Supabase OAuth**

1. Supabase → **Authentication** → **Providers** → **Google** → Toggle ON
2. Enter Client ID and Client Secret → Save

---

## 💳 **Step 4: Razorpay Payment Setup**

### **4.1 Create Razorpay Account**

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up → Complete KYC verification

### **4.2 Get API Keys**

1. Go to **API Keys** section
2. Generate **Test Keys** (development) and **Live Keys** (production)
3. Copy **Key ID** and **Key Secret**

### **4.3 Set Up Webhooks (Production)**

1. **Webhooks** → **Add Webhook**
2. URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`

---

## ⚙️ **Step 5: Environment Configuration**

### **5.1 Create Environment Files**

```bash
cp env.example .env
cp server/env.example server/.env
```

### **5.2 Frontend (.env)**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_API_BASE_URL=http://localhost:3001/api
NODE_ENV=development
```

### **5.3 Backend (server/.env)**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
PORT=3001
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```

---

## 🚀 **Step 6: Start Development**

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
npm run server
```

**Access:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

---

## ✅ **Step 7: Verify Setup**

1. **Test Authentication**: Sign in with Google at http://localhost:5173
2. **Test Admin Panel**: Go to http://localhost:5173/admin
3. **Test Payment**: Use test card `4111 1111 1111 1111`

---

## 🌐 **Step 8: Production Deployment**

### **8.1 Update Environment Variables for Production**

Before deploying, update your existing `.env` files with production values:

#### **Frontend (.env) - Update these values:**

```env
# Change these to production values:
VITE_SUPABASE_URL=https://your-project-id.supabase.co  # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key  # From your Supabase project
VITE_RAZORPAY_KEY_ID=your_live_razorpay_key_id  # From your Razorpay account
VITE_API_BASE_URL=https://your-backend.railway.app/api  # Your backend URL after deployment
NODE_ENV=production
```

#### **Backend (server/.env) - Update these values:**

```env
# Change these to production values:
SUPABASE_URL=https://your-project-id.supabase.co  # Your Supabase project URL
SUPABASE_ANON_KEY=your_supabase_anon_key  # From your Supabase project
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # From your Supabase project
RAZORPAY_KEY_ID=your_live_razorpay_key_id  # From your Razorpay account
RAZORPAY_KEY_SECRET=your_live_razorpay_key_secret  # From your Razorpay account
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret  # From your Razorpay webhook
FRONTEND_URL=https://your-frontend.vercel.app  # Your frontend URL after deployment
BACKEND_URL=https://your-backend.railway.app  # Your backend URL after deployment
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-frontend.netlify.app
JWT_SECRET=your_strong_jwt_secret_here  # Generate a random string
NODE_ENV=production
```

### **8.2 Update OAuth Redirect URLs**

1. **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add production redirect URIs:
   ```
   https://your-frontend-domain.com/auth/callback
   https://www.your-frontend-domain.com/auth/callback
   ```

### **8.3 Update Razorpay Webhooks**

1. **Razorpay Dashboard** → **Webhooks**
2. Edit existing webhook or create new one
3. Set webhook URL: `https://your-backend-domain.com/api/webhooks/razorpay`
4. Select events: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`

### **8.4 Update Supabase OAuth Settings**

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Update Site URL: `https://your-frontend-domain.com`
3. Add redirect URLs:
   ```
   https://your-frontend-domain.com/auth/callback
   https://www.your-frontend-domain.com/auth/callback
   ```

### **8.5 Deploy to Production**

**You have 3 options for deployment:**

#### **Option 1: Single Domain (Recommended)**

- **Frontend**: Deploy to Vercel/Netlify (free subdomain: `your-app.vercel.app`)
- **Backend**: Deploy to Railway/Render (free subdomain: `your-app.railway.app`)
- **Cost**: FREE (using platform subdomains)

#### **Option 2: Custom Domain (Professional)**

- **Frontend**: `https://yourdomain.com` (Vercel/Netlify)
- **Backend**: `https://api.yourdomain.com` (Railway/Render)
- **Cost**: One domain (~$10-15/year)

#### **Option 3: Same Domain (Advanced)**

- **Frontend**: `https://yourdomain.com`
- **Backend**: `https://yourdomain.com/api`
- **Cost**: One domain (~$10-15/year)

---

#### **Frontend Deployment (Vercel/Netlify)**

**Vercel Deployment:**

1. Connect your GitHub repository to Vercel
2. Go to **Settings** → **Environment Variables**
3. Add all frontend environment variables
4. Deploy (get free subdomain like `your-app.vercel.app`)

**Netlify Deployment:**

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy (get free subdomain like `your-app.netlify.app`)

#### **Backend Deployment (Railway/Render)**

**Railway Deployment:**

1. Connect your GitHub repository to Railway
2. Go to **Variables** tab
3. Add all backend environment variables
4. Deploy (get free subdomain like `your-app.railway.app`)

**Render Deployment:**

1. Create new **Web Service**
2. Connect GitHub repository
3. Set build command: `npm install`
4. Set start command: `node razorpay-server.cjs`
5. Add environment variables
6. Deploy (get free subdomain like `your-app.onrender.com`)

#### **Post-Deployment Verification**

1. **Test Frontend**: Visit your production frontend URL
2. **Test Authentication**: Sign in with Google
3. **Test Admin Panel**: Access admin dashboard
4. **Test Payment**: Complete a test transaction
5. **Test Webhooks**: Verify webhook delivery in Razorpay dashboard

---

## 🚨 **Troubleshooting**

### **Common Issues:**

**"Razorpay configuration missing"**

- Check if server/.env file exists
- Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set

**"OAuth consent screen not configured"**

- Complete OAuth consent screen setup in Google Cloud Console

**"Database connection failed"**

- Verify Supabase URL and keys are correct
- Ensure database schema is properly set up

**"Payment not working"**

- Check browser console for errors
- Verify server is running on port 3001
- Check server logs for Razorpay API errors

### **Quick Diagnostics:**

1. Check browser console (F12) for error messages
2. Verify all environment variables are set
3. Ensure both servers are running
4. Check server logs for specific error messages

---

## 🎉 **You're Done!**

Your e-commerce platform is now ready for business! 🚀

**Features included:**

- ✅ User authentication with Google OAuth
- ✅ Product catalog management
- ✅ Shopping cart functionality
- ✅ Payment processing with Razorpay
- ✅ Admin panel for order management
- ✅ Responsive design for all devices
