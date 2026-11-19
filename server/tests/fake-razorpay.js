// In-memory stand-in for the Razorpay Node SDK, used by the end-to-end tests so no
// real money moves. Mirrors the SDK methods and error shape the server relies on.
const crypto = require('crypto');

function rzpError(statusCode, description) {
  const err = new Error(description);
  err.statusCode = statusCode;
  err.error = { code: 'BAD_REQUEST_ERROR', description };
  return err;
}

class FakeRazorpay {
  constructor(keySecret) {
    this.keySecret = keySecret;
    this.ordersById = new Map();
    this.paymentsById = new Map();
    this.refundsList = [];
    this.failNextRefund = false;
    this.seq = 0;

    const self = this;
    this.orders = {
      async create(opts) {
        if (!Number.isInteger(opts.amount) || opts.amount < 100) throw rzpError(400, 'Order amount less than minimum amount allowed');
        const order = {
          id: `order_${++self.seq}${crypto.randomBytes(4).toString('hex')}`,
          entity: 'order',
          amount: opts.amount,
          amount_paid: 0,
          amount_due: opts.amount,
          currency: opts.currency,
          receipt: opts.receipt,
          status: 'created',
          attempts: 0,
          notes: opts.notes || {},
          created_at: Math.floor(Date.now() / 1000),
        };
        self.ordersById.set(order.id, order);
        return { ...order };
      },
      async fetch(id) {
        const order = self.ordersById.get(id);
        if (!order) throw rzpError(400, 'The id provided does not exist');
        return { ...order };
      },
      async fetchPayments(id) {
        const items = [...self.paymentsById.values()].filter((p) => p.order_id === id);
        return { entity: 'collection', count: items.length, items };
      },
    };

    this.payments = {
      async fetch(id) {
        const payment = self.paymentsById.get(id);
        if (!payment) throw rzpError(400, 'The id provided does not exist');
        return { ...payment };
      },
      async capture(id, amount, currency) {
        const payment = self.paymentsById.get(id);
        if (!payment) throw rzpError(400, 'The id provided does not exist');
        if (payment.status !== 'authorized') throw rzpError(400, 'This payment has already been captured');
        if (amount !== payment.amount || currency !== payment.currency) throw rzpError(400, 'Capture amount must be equal to the amount authorized');
        payment.status = 'captured';
        payment.captured = true;
        return { ...payment };
      },
      async refund(id, opts = {}) {
        const payment = self.paymentsById.get(id);
        if (!payment) throw rzpError(400, 'The id provided does not exist');
        if (self.failNextRefund) {
          self.failNextRefund = false;
          throw rzpError(400, 'Refund failed at bank (simulated)');
        }
        const amount = opts.amount ?? payment.amount - payment.amount_refunded;
        if (payment.status !== 'captured' && payment.status !== 'refunded') throw rzpError(400, 'Payment not captured');
        if (amount > payment.amount - payment.amount_refunded) throw rzpError(400, 'The refund amount provided is greater than amount captured');
        payment.amount_refunded += amount;
        payment.refund_status = payment.amount_refunded === payment.amount ? 'full' : 'partial';
        if (payment.amount_refunded === payment.amount) payment.status = 'refunded';
        const refund = {
          id: `rfnd_${++self.seq}${crypto.randomBytes(4).toString('hex')}`,
          entity: 'refund',
          amount,
          currency: payment.currency,
          payment_id: id,
          status: 'processed',
          speed_processed: 'normal',
          speed_requested: opts.speed || 'normal',
          notes: opts.notes || {},
          created_at: Math.floor(Date.now() / 1000),
        };
        self.refundsList.push(refund);
        return { ...refund };
      },
    };
  }

  /**
   * Simulates the customer completing Razorpay Checkout. Returns what the
   * Checkout widget hands to the browser (ids + signature).
   */
  pay(orderId, { amount, status = 'captured', forOrderId } = {}) {
    const order = this.ordersById.get(orderId);
    if (!order) throw new Error(`fake: unknown order ${orderId}`);
    const payment = {
      id: `pay_${++this.seq}${crypto.randomBytes(4).toString('hex')}`,
      entity: 'payment',
      amount: amount ?? order.amount,
      currency: 'INR',
      status,
      order_id: forOrderId || orderId,
      method: 'upi',
      captured: status === 'captured',
      amount_refunded: 0,
      email: 'customer@example.com',
      contact: '+919999999999',
      created_at: Math.floor(Date.now() / 1000),
    };
    this.paymentsById.set(payment.id, payment);
    if (status === 'captured') {
      order.status = 'paid';
      order.amount_paid = payment.amount;
      order.amount_due = 0;
    }
    return {
      razorpay_order_id: orderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: this.sign(orderId, payment.id),
      payment,
    };
  }

  sign(orderId, paymentId) {
    return crypto.createHmac('sha256', this.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  }
}

module.exports = { FakeRazorpay };
