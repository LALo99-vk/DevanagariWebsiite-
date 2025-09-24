# 🥗 Devanagari Health Mix - E-commerce Platform

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green.svg)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-orange.svg)](https://razorpay.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)

A modern, full-stack e-commerce platform for **Devanagari Health Mix** - a premium blend of 21 natural grains, millets, and pulses. Built with cutting-edge technologies to deliver a seamless shopping experience for health-conscious consumers.

## 🌟 Overview

Devanagari Health Mix is a nutritious blend featuring:

- **21 Natural Ingredients**: Carefully selected grains, millets, and pulses
- **Zero Sugar & Cholesterol**: Pure ingredients with no artificial additives
- **Protein-Packed**: Iron-strong, calcium-rich formula
- **Gluten-Free**: Balanced nutrition for everyone

This e-commerce platform provides a complete solution for selling and managing Devanagari Health Mix products online.

## ✨ Key Features

### 🔧 **Recent Fixes & Improvements**

- **✅ Shipping Amount Fix**: Order totals now correctly include shipping charges (₹99)
- **✅ Currency Consistency**: All amounts display in INR with proper formatting
- **✅ Database Optimization**: Fixed triggers to prevent order total calculation issues
- **✅ Admin Panel**: Enhanced order management with accurate total calculations

### 🛍️ **Customer Features**

- **Modern UI/UX**: Responsive design with smooth animations using Framer Motion
- **Google OAuth Authentication**: Secure login with Google accounts
- **Product Catalog**: Browse and search health mix products
- **Shopping Cart**: Add/remove items with real-time updates
- **Secure Checkout**: Razorpay payment integration with multiple payment methods
- **Order Management**: Track orders and view order history
- **Address Management**: Save and manage multiple shipping addresses
- **Promotional Codes**: Apply discount codes during checkout

### 👨‍💼 **Admin Features**

- **Admin Dashboard**: Comprehensive analytics and overview
- **Product Management**: Add, edit, and manage product inventory
- **Order Management**: Process orders, update statuses, and handle refunds
- **User Management**: View and manage customer accounts
- **Promo Code System**: Create and manage discount codes
- **Analytics**: Sales reports and performance metrics
- **Settings**: Configure platform settings and preferences

### 🔧 **Technical Features**

- **Real-time Database**: Supabase with Row Level Security (RLS)
- **Payment Processing**: Razorpay integration with webhooks
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Performance Optimized**: Code splitting and lazy loading

## 🏗️ Tech Stack

### Frontend

- **React 18.3.1** - UI library with hooks and context
- **TypeScript 5.5.3** - Type-safe JavaScript
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **Framer Motion 12.23.12** - Animation library
- **React Router DOM 7.8.2** - Client-side routing
- **Lucide React 0.344.0** - Icon library

### Backend

- **Node.js** - Runtime environment
- **Express.js 5.1.0** - Web framework
- **Razorpay 2.9.6** - Payment gateway
- **Supabase 2.57.4** - Backend-as-a-Service

### Database

- **PostgreSQL** - Primary database (via Supabase)
- **Row Level Security** - Data access control
- **Real-time subscriptions** - Live data updates

### Development Tools

- **Vite 5.4.2** - Build tool and dev server
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Concurrently** - Run multiple commands

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase account** ([Sign up here](https://supabase.com/))
- **Razorpay account** ([Sign up here](https://razorpay.com/))
- **Google Cloud account** (for OAuth)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/DevanagariWeb.git
   cd DevanagariWeb
   ```

2. **Install dependencies**

   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server && npm install && cd ..
   ```

3. **Environment Setup**

   ```bash
   # Copy environment files
   cp env.example .env
   cp server/env.example server/.env
   ```

4. **Follow the complete setup guide**
   📖 **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup from clone to production

## 📁 Project Structure

```
DevanagariWeb/
├── src/                          # Frontend source code
│   ├── components/               # Reusable React components
│   │   ├── AdminLayout.tsx      # Admin panel layout
│   │   ├── Navbar.tsx           # Navigation component
│   │   ├── Footer.tsx           # Footer component
│   │   ├── RazorpayPayment.tsx  # Payment component
│   │   └── ...                  # Other components
│   ├── context/                 # React context providers
│   │   ├── AuthContext.tsx      # Authentication state
│   │   ├── CartContext.tsx      # Shopping cart state
│   │   ├── AdminContext.tsx     # Admin panel state
│   │   └── NotificationContext.tsx # Notifications
│   ├── pages/                   # Page components
│   │   ├── Home.tsx            # Landing page
│   │   ├── Shop.tsx            # Product catalog
│   │   ├── Cart.tsx            # Shopping cart
│   │   ├── Checkout.tsx        # Checkout process
│   │   ├── Profile.tsx         # User profile
│   │   └── admin/              # Admin panel pages
│   │       ├── Dashboard.tsx   # Admin dashboard
│   │       ├── Products.tsx    # Product management
│   │       ├── Orders.tsx      # Order management
│   │       └── ...             # Other admin pages
│   ├── services/               # API services
│   │   ├── supabase.ts        # Supabase client
│   │   └── razorpay.ts        # Razorpay integration
│   ├── utils/                 # Utility functions
│   └── assets/                # Static assets
├── server/                    # Backend server
│   ├── razorpay-server.cjs   # Express server with Razorpay
│   └── package.json          # Server dependencies
├── database-schema.sql       # Database schema
├── SETUP_GUIDE.md           # Detailed setup instructions
└── README.md               # This file
```

## 🛠️ Available Scripts

| Command                  | Description                            |
| ------------------------ | -------------------------------------- |
| `npm run dev`            | Start development server (frontend)    |
| `npm run build`          | Build for production                   |
| `npm run preview`        | Preview production build               |
| `npm run server`         | Start Razorpay payment server          |
| `npm run dev:full`       | Start both frontend and payment server |
| `npm run lint`           | Run ESLint                             |
| `npm run setup:razorpay` | Install Razorpay dependencies          |

## 🌐 Deployment

### Development

```bash
# Terminal 1: Start frontend
npm run dev

# Terminal 2: Start backend
npm run server
```

**Access:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

### Production

The platform supports deployment to various hosting providers:

#### **Frontend Deployment**

- **Vercel** (Recommended): Connect GitHub repo, add environment variables, deploy
- **Netlify**: Connect GitHub repo, set build settings, deploy
- **AWS S3 + CloudFront**: Static hosting with CDN

#### **Backend Deployment**

- **Railway** (Recommended): Connect GitHub repo, add environment variables
- **Render**: Create web service, connect repo, configure
- **Heroku**: Connect GitHub repo, add environment variables

#### **Database**

- **Supabase**: Managed PostgreSQL with real-time features
- **AWS RDS**: Self-managed PostgreSQL option

For detailed deployment instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md#production-deployment).

## 🔐 Environment Variables

### Frontend (.env)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_API_BASE_URL=http://localhost:3001/api
NODE_ENV=development
```

### Backend (server/.env)

```env
SUPABASE_URL=your_supabase_project_url
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

## 🗄️ Database Schema

The platform uses a comprehensive PostgreSQL schema with the following main tables:

- **users** - User profiles and authentication
- **products** - Product catalog and inventory
- **cart_items** - Shopping cart management
- **orders** - Order management and tracking
- **order_items** - Individual order line items
- **user_addresses** - Customer shipping addresses
- **admin_actions** - Admin activity logging

### 🔧 **Important Database Fixes Included**

The database schema includes important fixes for order total calculations:

- **✅ Shipping Amount Fix**: The `update_order_totals()` trigger now properly includes shipping amounts in order totals
- **✅ Currency Consistency**: All monetary fields default to INR
- **✅ Optimized Triggers**: Database triggers are optimized for accurate calculations

For the complete schema, see [database-schema.sql](./database-schema.sql).

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Google OAuth** - Secure authentication
- **JWT Tokens** - Secure session management
- **CORS Protection** - Cross-origin request security
- **Input Validation** - Server-side data validation
- **Webhook Verification** - Razorpay webhook security

## 📱 Responsive Design

The platform is fully responsive and optimized for:

- **Desktop** (1024px+)
- **Tablet** (768px - 1023px)
- **Mobile** (320px - 767px)

## 🧪 Testing

### Test Payment

Use Razorpay test cards for development:

- **Success**: `4111 1111 1111 1111`
- **Failure**: `4000 0000 0000 0002`
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## 🚨 Troubleshooting

### Common Issues

**"Razorpay configuration missing"**

- Check if `server/.env` file exists
- Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set

**"OAuth consent screen not configured"**

- Complete OAuth consent screen setup in Google Cloud Console

**"Database connection failed"**

- Verify Supabase URL and keys are correct
- Ensure database schema is properly set up

**"Payment not working"**

- Check browser console for errors
- Verify server is running on port 3001
- Check server logs for Razorpay API errors

### Quick Diagnostics

1. Check browser console (F12) for error messages
2. Verify all environment variables are set
3. Ensure both servers are running
4. Check server logs for specific error messages

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup guide (start here!)
- **[database-schema.sql](./database-schema.sql)** - Database schema
- **API Documentation** - Available at `/api/health` endpoint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for Devanagari Health Mix. All rights reserved.

## 📞 Support

For support and questions:

- Check the [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions
- Review browser console logs for error messages
- Ensure all environment variables are properly set
- Verify both servers are running (`npm run dev` and `npm run server`)

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Inventory management system
- [ ] Multi-vendor support
- [ ] International shipping
- [ ] Subscription model
- [ ] Loyalty program
- [ ] Advanced search and filtering

---

**Built with ❤️ for health-conscious consumers**

_Devanagari Health Mix - Nourishing your wellness journey, one sip at a time._
