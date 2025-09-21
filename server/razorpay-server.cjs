const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get allowed origins from environment variables
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    razorpay_configured: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  });
});

// Middleware to validate Razorpay configuration
const validateRazorpayConfig = (req, res, next) => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(500).json({
      error: 'Razorpay configuration missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.'
    });
  }
  next();
};

// Helper function to update order refund status in database
async function updateOrderRefundStatus(paymentId, refundData) {
  try {
    // This would typically connect to your database
    // For now, we'll just log the update
    console.log('📝 Updating order refund status:', {
      paymentId,
      refundData
    });

    // TODO: Implement actual database update
    // Example:
    // await supabase
    //   .from('orders')
    //   .update(refundData)
    //   .eq('payment_id', paymentId);

    console.log('✅ Order refund status updated successfully');
  } catch (error) {
    console.error('❌ Error updating order refund status:', error);
  }
}

// Create Razorpay Order
app.post('/api/razorpay/create-order', validateRazorpayConfig, async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes = {} } = req.body;

    // Validate input
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount. Amount must be at least 1 paise (₹0.01)' });
    }

    // Create order options
    const options = {
      amount: Math.round(amount), // Amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: {
        ...notes,
        created_at: new Date().toISOString(),
        source: 'devanagari_web'
      }
    };

    // Create order with Razorpay
    const order = await razorpay.orders.create(options);

    console.log('📦 Created Razorpay order:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });

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
      created_at: order.created_at
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);

    // Handle specific Razorpay errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.error?.description || 'Razorpay API error',
        code: error.error?.code,
        field: error.error?.field
      });
    }

    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify Razorpay Payment
app.post('/api/razorpay/verify-payment', validateRazorpayConfig, async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    // Validate input
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'Missing required payment details',
        required: ['razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature']
      });
    }

    // Create expected signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      // Fetch payment details from Razorpay
      try {
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        const order = await razorpay.orders.fetch(razorpay_order_id);

        console.log('✅ Payment verified successfully:', {
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: payment.amount,
          status: payment.status
        });

        res.json({
          isValid: true,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          payment_details: {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            captured: payment.captured,
            created_at: payment.created_at
          },
          order_details: {
            id: order.id,
            amount: order.amount,
            status: order.status,
            receipt: order.receipt
          }
        });
      } catch (fetchError) {
        console.error('⚠️ Payment verified but failed to fetch details:', fetchError);
        res.json({
          isValid: true,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          warning: 'Payment verified but details unavailable'
        });
      }
    } else {
      console.log('❌ Payment verification failed:', {
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        expected_signature: expectedSignature.substring(0, 10) + '...',
        received_signature: razorpay_signature.substring(0, 10) + '...'
      });

      res.status(400).json({
        isValid: false,
        error: 'Invalid payment signature'
      });
    }
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get Payment Details
app.get('/api/razorpay/payment/:paymentId', validateRazorpayConfig, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    console.log('💳 Payment details fetched:', {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method
    });

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
      created_at: payment.created_at
    });
  } catch (error) {
    console.error('❌ Error fetching payment:', error);

    if (error.statusCode === 400) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// Get Order Status
app.get('/api/razorpay/order/:orderId', validateRazorpayConfig, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await razorpay.orders.fetch(orderId);

    console.log('📋 Order details fetched:', {
      id: order.id,
      amount: order.amount,
      status: order.status,
      attempts: order.attempts
    });

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
      created_at: order.created_at
    });
  } catch (error) {
    console.error('❌ Error fetching order:', error);

    if (error.statusCode === 400) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Get Order Payments
app.get('/api/razorpay/order/:orderId/payments', validateRazorpayConfig, async (req, res) => {
  try {
    const { orderId } = req.params;

    const payments = await razorpay.orders.fetchPayments(orderId);

    console.log('💰 Order payments fetched:', {
      order_id: orderId,
      payment_count: payments.items.length
    });

    res.json({
      entity: payments.entity,
      count: payments.count,
      items: payments.items.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        captured: payment.captured,
        created_at: payment.created_at
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching order payments:', error);

    if (error.statusCode === 400) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(500).json({ error: 'Failed to fetch order payments' });
  }
});

// Capture Payment (for authorized payments)
app.post('/api/razorpay/payment/:paymentId/capture', validateRazorpayConfig, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, currency = 'INR' } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required for capture' });
    }

    const payment = await razorpay.payments.capture(paymentId, amount, currency);

    console.log('💰 Payment captured:', {
      id: payment.id,
      amount: payment.amount,
      status: payment.status
    });

    res.json({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      captured: payment.captured
    });
  } catch (error) {
    console.error('❌ Error capturing payment:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.error?.description || 'Failed to capture payment',
        code: error.error?.code
      });
    }

    res.status(500).json({ error: 'Failed to capture payment' });
  }
});

// Refund Payment
app.post('/api/razorpay/payment/:paymentId/refund', validateRazorpayConfig, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, speed = 'normal', notes = {}, receipt } = req.body;

    console.log('💸 Processing refund request:', {
      paymentId,
      amount,
      speed,
      notes,
      receipt
    });

    const refundData = {
      payment_id: paymentId,
      notes: {
        ...notes,
        refund_reason: notes.refund_reason || 'Customer request',
        created_at: new Date().toISOString()
      }
    };

    if (amount) refundData.amount = amount;
    if (speed) refundData.speed = speed;
    if (receipt) refundData.receipt = receipt;

    console.log('💸 Refund data prepared:', refundData);

    const refund = await razorpay.payments.refund(paymentId, refundData);

    console.log('💸 Refund processed successfully:', {
      id: refund.id,
      payment_id: refund.payment_id,
      amount: refund.amount,
      status: refund.status
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
      created_at: refund.created_at
    });
  } catch (error) {
    console.error('❌ Error processing refund:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      paymentId: req.params.paymentId,
      requestBody: req.body
    });

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.error?.description || 'Failed to process refund',
        code: error.error?.code,
        details: error.error
      });
    }

    res.status(500).json({
      error: 'Failed to process refund',
      details: error.message
    });
  }
});

// Razorpay Webhook Handler
app.post('/api/webhooks/razorpay', async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('⚠️ Webhook secret not configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('🔗 Razorpay webhook received:', {
      event,
      account_id: req.body.account_id,
      created_at: req.body.created_at
    });

    // Process webhook events
    switch (event) {
      case 'payment.captured':
        const capturedPayment = payload.payment.entity;
        console.log('✅ Payment captured:', {
          id: capturedPayment.id,
          order_id: capturedPayment.order_id,
          amount: capturedPayment.amount,
          method: capturedPayment.method
        });
        // TODO: Update order status in your database
        break;

      case 'payment.failed':
        const failedPayment = payload.payment.entity;
        console.log('❌ Payment failed:', {
          id: failedPayment.id,
          order_id: failedPayment.order_id,
          error_code: failedPayment.error_code,
          error_description: failedPayment.error_description
        });
        // TODO: Update order status in your database
        break;

      case 'order.paid':
        const paidOrder = payload.order.entity;
        console.log('💰 Order paid:', {
          id: paidOrder.id,
          amount: paidOrder.amount,
          amount_paid: paidOrder.amount_paid
        });
        // TODO: Update order status in your database
        break;

      case 'refund.created':
        const refund = payload.refund.entity;
        console.log('💸 Refund created:', {
          id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          status: refund.status
        });
        await updateOrderRefundStatus(refund.payment_id, {
          refund_id: refund.id,
          refund_amount: refund.amount / 100, // Convert from paise to INR
          refund_status: 'pending',
          refunded_at: new Date(refund.created_at * 1000).toISOString()
        });
        break;

      case 'refund.processed':
        const processedRefund = payload.refund.entity;
        console.log('✅ Refund processed:', {
          id: processedRefund.id,
          payment_id: processedRefund.payment_id,
          amount: processedRefund.amount
        });
        await updateOrderRefundStatus(processedRefund.payment_id, {
          refund_id: processedRefund.id,
          refund_amount: processedRefund.amount / 100, // Convert from paise to INR
          refund_status: 'processed',
          refunded_at: new Date(processedRefund.created_at * 1000).toISOString()
        });
        break;

      default:
        console.log('ℹ️ Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get Razorpay Configuration (for frontend)
app.get('/api/razorpay/config', (req, res) => {
  res.json({
    key_id: process.env.RAZORPAY_KEY_ID,
    currency: 'INR',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  const isConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

  res.json({
    status: 'ok',
    message: 'Razorpay API server is running',
    configured: isConfigured,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Validate Promo Code
app.post('/api/promo/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Promo code is required' });
    }

    // Valid promo codes (in a real app, this would be in a database)
    const validCodes = {
      'WELCOME10': { discount: 10, type: 'percentage', description: '10% off on your first order' },
      'SAVE10': { discount: 10, type: 'percentage', description: '10% off on all orders' },
      'DISCOUNT10': { discount: 10, type: 'percentage', description: '10% off on orders above ₹500' }
    };

    const promoCode = validCodes[code.toUpperCase()];

    if (!promoCode) {
      return res.status(400).json({
        error: 'Invalid promo code',
        valid: false
      });
    }

    res.json({
      valid: true,
      code: code.toUpperCase(),
      discount: promoCode.discount,
      type: promoCode.type,
      description: promoCode.description
    });

  } catch (error) {
    console.error('❌ Error validating promo code:', error);
    res.status(500).json({
      error: 'Failed to validate promo code',
      valid: false
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Razorpay API server running on http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Razorpay configured: ${!!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health                                    - Health check`);
  console.log(`   GET  /api/razorpay/config                       - Get Razorpay config`);
  console.log(`   POST /api/razorpay/create-order                 - Create order`);
  console.log(`   POST /api/razorpay/verify-payment               - Verify payment`);
  console.log(`   GET  /api/razorpay/payment/:paymentId           - Get payment details`);
  console.log(`   GET  /api/razorpay/order/:orderId               - Get order details`);
  console.log(`   GET  /api/razorpay/order/:orderId/payments      - Get order payments`);
  console.log(`   POST /api/razorpay/payment/:paymentId/capture   - Capture payment`);
  console.log(`   POST /api/razorpay/payment/:paymentId/refund    - Refund payment`);
  console.log(`   POST /api/webhooks/razorpay                     - Webhook handler`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});
