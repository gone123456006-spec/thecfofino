const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const router = express.Router();

// ─── Razorpay Initialization ──────────────────────────────────────────────────
let razorpay = null;

function getRazorpay() {
    if (razorpay) return razorpay;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.warn('⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in .env — payments disabled.');
        return null;
    }

    try {
        razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        console.log('✅ Razorpay initialized — Key ID:', keyId.slice(0, 12) + '...');
    } catch (err) {
        console.error('❌ Razorpay initialization failed:', err.message);
        return null;
    }

    return razorpay;
}

// Initialize on startup
getRazorpay();

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validates that amount is a positive finite number.
 * @param {*} amount
 * @returns {boolean}
 */
function isValidAmount(amount) {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
}

/**
 * Validates currency is a 3-letter ISO code.
 * @param {string} currency
 * @returns {boolean}
 */
function isValidCurrency(currency) {
    return typeof currency === 'string' && /^[A-Z]{3}$/.test(currency);
}

// ─── POST /api/payments/create-order ─────────────────────────────────────────
/**
 * Create a Razorpay order.
 * Body: { amount: number (INR), currency?: string, receipt?: string }
 * Returns: { ok, orderId, amount, currency, keyId }
 *
 * Note: amount should be in INR (e.g. 7498 for ₹7,498).
 *       Do NOT send paise — this route handles the conversion.
 */
router.post('/create-order', async (req, res) => {
    try {
        const instance = getRazorpay();
        if (!instance) {
            return res.status(503).json({
                ok: false,
                error: 'Payment gateway is not configured. Please contact support.',
            });
        }

        const {
            amount = 7498,          // default ₹7,498 in INR
            currency = 'INR',
            receipt = 'receipt_' + Date.now(),
        } = req.body;

        // Validate amount
        if (!isValidAmount(amount)) {
            return res.status(400).json({ ok: false, error: 'Invalid amount. Must be a positive number.' });
        }

        // Validate currency
        if (!isValidCurrency(currency)) {
            return res.status(400).json({ ok: false, error: 'Invalid currency code. Use 3-letter ISO format (e.g. INR).' });
        }

        // Razorpay expects amount in paise (1 INR = 100 paise)
        const amountInPaise = Math.round(Number(amount) * 100);

        // Minimum order: 100 paise (₹1)
        if (amountInPaise < 100) {
            return res.status(400).json({ ok: false, error: 'Amount must be at least ₹1.' });
        }

        console.log(`[create-order] Creating order — amount: ₹${amount} (${amountInPaise} paise), currency: ${currency}, receipt: ${receipt}`);

        const order = await instance.orders.create({
            amount: amountInPaise,
            currency,
            receipt: String(receipt).slice(0, 40), // Razorpay receipt max length is 40
            payment_capture: 1,
        });

        console.log(`[create-order] Order created — id: ${order.id}`);

        return res.status(201).json({
            ok: true,
            orderId: order.id,
            amount: order.amount,           // in paise
            amountINR: order.amount / 100,  // in INR (for frontend display)
            currency: order.currency,
            receipt: order.receipt,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error('[create-order] Error:', err);

        // Razorpay API errors come with a structured error object
        if (err.error && err.error.description) {
            return res.status(502).json({
                ok: false,
                error: 'Payment gateway error: ' + err.error.description,
            });
        }

        return res.status(500).json({ ok: false, error: 'Failed to create order. Please try again.' });
    }
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────
/**
 * Verify Razorpay payment signature.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Returns: { ok, paymentId, orderId }
 *
 * This MUST be called after the Razorpay checkout succeeds on the frontend.
 * Never trust the frontend alone — always verify the signature server-side.
 */
router.post('/verify', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Validate all fields are present and are strings
        if (
            !razorpay_order_id || typeof razorpay_order_id !== 'string' ||
            !razorpay_payment_id || typeof razorpay_payment_id !== 'string' ||
            !razorpay_signature || typeof razorpay_signature !== 'string'
        ) {
            return res.status(400).json({ ok: false, error: 'Missing or invalid payment fields.' });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
            console.error('[verify] RAZORPAY_KEY_SECRET is not set');
            return res.status(503).json({ ok: false, error: 'Payment gateway not configured.' });
        }

        // Razorpay signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expected = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        // Use timingSafeEqual to prevent timing attacks
        const expectedBuffer = Buffer.from(expected, 'hex');
        const receivedBuffer = Buffer.from(razorpay_signature, 'hex');

        let isValid = false;
        try {
            isValid = (
                expectedBuffer.length === receivedBuffer.length &&
                crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
            );
        } catch {
            isValid = false;
        }

        if (!isValid) {
            console.warn('[verify] Signature mismatch for order:', razorpay_order_id);
            return res.status(400).json({ ok: false, error: 'Payment verification failed. Invalid signature.' });
        }

        console.log(`[verify] Payment verified — orderId: ${razorpay_order_id}, paymentId: ${razorpay_payment_id}`);

        return res.status(200).json({
            ok: true,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
        });
    } catch (err) {
        console.error('[verify] Error:', err);
        return res.status(500).json({ ok: false, error: 'Verification failed. Please contact support.' });
    }
});

// ─── GET /api/payments/status/:orderId ───────────────────────────────────────
/**
 * Fetch the current status of a Razorpay order.
 * Useful for checking if payment was completed (e.g. after a page refresh).
 * Returns: { ok, status, amount, currency, payments[] }
 */
router.get('/status/:orderId', async (req, res) => {
    try {
        const instance = getRazorpay();
        if (!instance) {
            return res.status(503).json({ ok: false, error: 'Payment gateway is not configured.' });
        }

        const { orderId } = req.params;

        if (!orderId || typeof orderId !== 'string') {
            return res.status(400).json({ ok: false, error: 'Order ID is required.' });
        }

        const order = await instance.orders.fetch(orderId);
        const payments = await instance.orders.fetchPayments(orderId);

        console.log(`[status] Order ${orderId} — status: ${order.status}`);

        return res.status(200).json({
            ok: true,
            orderId: order.id,
            status: order.status,           // created | attempted | paid
            amount: order.amount,           // in paise
            amountINR: order.amount / 100,
            currency: order.currency,
            receipt: order.receipt,
            payments: (payments.items || []).map(p => ({
                paymentId: p.id,
                status: p.status,
                method: p.method,
                amount: p.amount,
                amountINR: p.amount / 100,
                createdAt: new Date(p.created_at * 1000).toISOString(),
            })),
        });
    } catch (err) {
        console.error('[status] Error:', err);

        if (err.statusCode === 404) {
            return res.status(404).json({ ok: false, error: 'Order not found.' });
        }

        return res.status(500).json({ ok: false, error: 'Failed to fetch order status.' });
    }
});

module.exports = router;