const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const router = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── POST /api/payments/create-order ──────────────────────────────────────────
// Body: { amount: number (INR), currency?: string, receipt?: string }
// Returns: { orderId, amount, currency, keyId }
router.post('/create-order', async (req, res) => {
    try {
        const { amount = 749800, currency = 'INR', receipt = 'company_reg' } = req.body;

        // Razorpay amount is in paise (1 INR = 100 paise)
        const amountInPaise = Math.round(Number(amount) * 100);

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency,
            receipt,
            payment_capture: 1,
        });

        res.json({
            ok: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error('Razorpay create-order error:', err);
        res.status(500).json({ ok: false, error: err.message || 'Failed to create order' });
    }
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Returns: { ok: true } or 400 on invalid signature
router.post('/verify', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ ok: false, error: 'Missing payment fields' });
        }

        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expected = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expected !== razorpay_signature) {
            return res.status(400).json({ ok: false, error: 'Invalid payment signature' });
        }

        res.json({ ok: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
    } catch (err) {
        console.error('Razorpay verify error:', err);
        res.status(500).json({ ok: false, error: err.message || 'Verification failed' });
    }
});

module.exports = router;
