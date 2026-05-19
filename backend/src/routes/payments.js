const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');

const auth = require('../middleware/auth');
const userAuth = require('../middleware/userAuth');
const CompanyRegistration = require('../models/CompanyRegistration');
const { getAppSettings } = require('../services/appSettings');
const { computeCompanyRegistrationPayment } = require('../utils/company-registration-payment');
const { getRazorpayCredentials, isValidRazorpayKeyId } = require('../utils/razorpay-env');
const { queueRegistrationEmails } = require('../services/registrationEmailService');

const router = express.Router();

// ─── Razorpay Initialization ──────────────────────────────────────────────────
let razorpay = null;
let razorpayKeyId = '';

function getRazorpay() {
    if (razorpay) return razorpay;

    const { keyId, keySecret, fixedTypo } = getRazorpayCredentials();

    if (!keyId || !keySecret) {
        console.warn('⚠️  RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in .env — payments disabled.');
        return null;
    }

    if (!isValidRazorpayKeyId(keyId)) {
        console.error(
            '❌ Invalid RAZORPAY_KEY_ID — must start with rzp_test_ or rzp_live_ (check backend/.env).',
        );
        return null;
    }

    if (fixedTypo) {
        console.warn('⚠️  RAZORPAY_KEY_ID was missing leading "r" (zp_* → rzp_*). Update .env to rzp_live_... or rzp_test_...');
    }

    try {
        razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        razorpayKeyId = keyId;
        console.log('✅ Razorpay initialized — Key ID:', keyId.slice(0, 16) + '...');
    } catch (err) {
        console.error('❌ Razorpay initialization failed:', err.message);
        return null;
    }

    return razorpay;
}

function razorpayAuthErrorMessage() {
    const { keyId } = getRazorpayCredentials();
    if (!isValidRazorpayKeyId(keyId)) {
        return 'Payment gateway misconfigured: RAZORPAY_KEY_ID must start with rzp_test_ or rzp_live_.';
    }
    return 'Payment gateway authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env (test keys must be a matching pair from Razorpay Dashboard).';
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

function verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) return { ok: false, error: 'Payment gateway not configured.' };
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(razorpay_signature, 'hex');
    try {
        if (
            expectedBuffer.length === receivedBuffer.length &&
            crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
        ) {
            return { ok: true };
        }
    } catch {
        /* length mismatch */
    }
    return { ok: false, error: 'Invalid signature.' };
}

// ─── GET /api/payments/public-config (mobile app — no auth) ─────────────────
router.get('/public-config', async (req, res) => {
    try {
        const settings = await getAppSettings();
        const pricing = computeCompanyRegistrationPayment(settings);
        const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https')
            .split(',')[0]
            .trim();
        const host = req.get('host') || '';
        const checkoutLogoUrl = host ? `${proto}://${host}/api/branding/finovert-logo.png` : '';
        return res.json({
            ok: true,
            companyRegistrationBasePriceINR: pricing.basePriceINR,
            companyRegistrationGstPercent: pricing.gstPercent,
            companyRegistrationGstAmountINR: pricing.gstAmountINR,
            companyRegistrationTotalPayableINR: pricing.totalPayableINR,
            /** @deprecated use companyRegistrationTotalPayableINR */
            companyRegistrationAmountINR: pricing.totalPayableINR,
            productTitle: settings.companyRegistrationProductTitle,
            productDescription: settings.companyRegistrationProductDescription,
            currency: 'INR',
            razorpayConfigured: (() => {
                const { keyId, keySecret } = getRazorpayCredentials();
                return Boolean(keyId && keySecret && isValidRazorpayKeyId(keyId));
            })(),
            checkoutLogoUrl,
        });
    } catch (err) {
        console.error('[public-config]', err);
        return res.status(500).json({ ok: false, error: 'Failed to load payment settings.' });
    }
});

// ─── PATCH /api/payments/admin-settings (dashboard — admin JWT) ────────────
router.patch('/admin-settings', auth, async (req, res) => {
    try {
        const {
            companyRegistrationRazorpayAmountINR,
            companyRegistrationGstPercent,
            companyRegistrationProductTitle,
            companyRegistrationProductDescription,
        } = req.body || {};

        const settings = await getAppSettings();

        if (companyRegistrationRazorpayAmountINR !== undefined && companyRegistrationRazorpayAmountINR !== null) {
            const n = Number(companyRegistrationRazorpayAmountINR);
            if (!Number.isFinite(n) || n < 1) {
                return res.status(400).json({ ok: false, error: 'Amount must be at least ₹1.' });
            }
            settings.companyRegistrationRazorpayAmountINR = n;
        }
        if (companyRegistrationGstPercent !== undefined && companyRegistrationGstPercent !== null) {
            const g = Number(companyRegistrationGstPercent);
            if (!Number.isFinite(g) || g < 0 || g > 100) {
                return res.status(400).json({ ok: false, error: 'GST % must be between 0 and 100.' });
            }
            settings.companyRegistrationGstPercent = g;
        }
        if (typeof companyRegistrationProductTitle === 'string' && companyRegistrationProductTitle.trim()) {
            settings.companyRegistrationProductTitle = companyRegistrationProductTitle.trim().slice(0, 120);
        }
        if (typeof companyRegistrationProductDescription === 'string' && companyRegistrationProductDescription.trim()) {
            settings.companyRegistrationProductDescription = companyRegistrationProductDescription.trim().slice(0, 500);
        }
        await settings.save();
        const pricing = computeCompanyRegistrationPayment(settings);
        return res.json({
            ok: true,
            companyRegistrationRazorpayAmountINR: settings.companyRegistrationRazorpayAmountINR,
            companyRegistrationGstPercent: settings.companyRegistrationGstPercent,
            companyRegistrationGstAmountINR: pricing.gstAmountINR,
            companyRegistrationTotalPayableINR: pricing.totalPayableINR,
            companyRegistrationProductTitle: settings.companyRegistrationProductTitle,
            companyRegistrationProductDescription: settings.companyRegistrationProductDescription,
        });
    } catch (err) {
        console.error('[admin-settings]', err);
        return res.status(500).json({ ok: false, error: 'Failed to update settings.' });
    }
});

// ─── POST /api/payments/complete-company-registration (app user JWT) ──────
router.post('/complete-company-registration', userAuth, async (req, res) => {
    try {
        const { registrationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

        if (!registrationId || !mongoose.Types.ObjectId.isValid(String(registrationId))) {
            return res.status(400).json({ ok: false, error: 'Invalid registration id.' });
        }
        if (
            !razorpay_order_id || typeof razorpay_order_id !== 'string' ||
            !razorpay_payment_id || typeof razorpay_payment_id !== 'string' ||
            !razorpay_signature || typeof razorpay_signature !== 'string'
        ) {
            return res.status(400).json({ ok: false, error: 'Missing payment verification fields.' });
        }

        const check = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!check.ok) {
            return res.status(400).json({ ok: false, error: check.error || 'Verification failed.' });
        }

        const reg = await CompanyRegistration.findById(registrationId);
        if (!reg) {
            return res.status(404).json({ ok: false, error: 'Registration not found.' });
        }
        const uid = reg.userId ? String(reg.userId) : null;
        if (!uid || uid !== String(req.userId)) {
            return res.status(403).json({ ok: false, error: 'Not allowed for this registration.' });
        }

        const appSettings = await getAppSettings();
        const pricing = computeCompanyRegistrationPayment(appSettings);
        reg.paymentStatus = 'paid';
        reg.paymentAmount = pricing.totalPayableINR;
        reg.paymentMethod = 'razorpay';
        reg.paymentReference = razorpay_payment_id;
        reg.paidAt = new Date();
        await reg.save();

        queueRegistrationEmails(reg._id);

        return res.json({
            ok: true,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            paymentAmount: reg.paymentAmount,
        });
    } catch (err) {
        console.error('[complete-company-registration]', err);
        return res.status(500).json({ ok: false, error: 'Failed to record payment.' });
    }
});

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

        const body = req.body || {};
        const purpose = typeof body.purpose === 'string' ? body.purpose : '';
        const currency = typeof body.currency === 'string' ? body.currency : 'INR';
        let receipt = body.receipt != null ? String(body.receipt) : 'receipt_' + Date.now();

        let amount;
        if (purpose === 'company_registration') {
            const settings = await getAppSettings();
            const pricing = computeCompanyRegistrationPayment(settings);
            amount = pricing.totalPayableINR;
            // Legacy dashboard value → normalize to ₹1 (current product default)
            if (amount === 7498) {
                amount = 1;
                settings.companyRegistrationRazorpayAmountINR = 1;
                settings.companyRegistrationGstPercent = 0;
                await settings.save();
            }
            const envOverride = process.env.COMPANY_REGISTRATION_RAZORPAY_INR;
            if (envOverride != null && String(envOverride).trim() !== '') {
                const n = Number(envOverride);
                if (Number.isFinite(n) && n >= 1) amount = n;
            }
            receipt = receipt.slice(0, 40);
        } else {
            amount = body.amount != null ? Number(body.amount) : 1;
        }

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
            receipt: String(receipt).slice(0, 40),
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
            keyId: razorpayKeyId || getRazorpayCredentials().keyId,
        });
    } catch (err) {
        console.error('[create-order] Error:', err);

        const statusCode = err.statusCode || err.status;
        if (statusCode === 401) {
            return res.status(502).json({
                ok: false,
                error: razorpayAuthErrorMessage(),
            });
        }

        // Razorpay API errors come with a structured error object
        if (err.error && err.error.description) {
            const desc = err.error.description;
            if (/authentication failed/i.test(desc)) {
                return res.status(502).json({
                    ok: false,
                    error: razorpayAuthErrorMessage(),
                });
            }
            return res.status(502).json({
                ok: false,
                error: 'Payment gateway error: ' + desc,
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

        const check = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!check.ok) {
            if (check.error === 'Payment gateway not configured.') {
                return res.status(503).json({ ok: false, error: check.error });
            }
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