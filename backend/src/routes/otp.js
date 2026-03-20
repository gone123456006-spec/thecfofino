const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const config = require('../config');

// ─── OTP.dev Credentials ──────────────────────────────────────────────────────
// These match your working curl command exactly.
// Values are read from .env — hardcoded strings are fallbacks for safety.
const OTP_API_KEY = process.env.OTP_DEV_API_KEY || '008919902f2b55af442833ceef6ffeef';
const OTP_SENDER = process.env.OTP_DEV_SENDER_ID || 'f92fa8dc-cb3e-44c4-b3fd-538c7046558d';
const OTP_TEMPLATE = process.env.OTP_DEV_TEMPLATE_ID || 'd6cb8744-8bc1-46e8-a91c-d68c8370bcdc';
const OTP_API_URL = 'https://api.otp.dev/v1/verifications';
const OTP_TIMEOUT = 30000; // Increased to 30s for slow provider responses

// ─── DEMO MODE ────────────────────────────────────────────────────────────────
// For testing without real SMS delivery, set DEMO_OTP_ENABLED=1 in .env
const DEMO_OTP_ENABLED = process.env.DEMO_OTP_ENABLED === '1' || false;
const DEMO_OTP_CODE = process.env.DEMO_OTP_CODE || '123456';

// In-memory OTP storage for demo/testing (cleared on restart)
const demoOtpStore = new Map();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize mobile to api.otp.dev format:
 * digits only, country code prepended, NO "+" prefix.
 *
 * "9876543210"    → "919876543210"
 * "+919876543210" → "919876543210"
 * "919876543210"  → "919876543210"
 */
function normalizePhone(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '');

    // Allowed Indian formats:
    // 9876543210
    // 09876543210
    // +919876543210
    // 919876543210
    if (/^\d{10}$/.test(digits)) {
        return '91' + digits;
    }
    if (/^0\d{10}$/.test(digits)) {
        return '91' + digits.slice(1);
    }
    if (/^91\d{10}$/.test(digits)) {
        return digits;
    }
    if (/^\+91\d{10}$/.test(raw)) {
        return digits.slice(-12); // handles +91 prefix
    }
    return '';
}

/**
 * Extract last 10 digits for DB storage (no country code).
 */
function extractMobile(raw) {
    const digits = String(raw).replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

// ─── POST /api/otp/login ──────────────────────────────────────────────────────
/**
 * Passwordless login — name + mobile, no OTP required.
 * Body: { name: "John", mobile: "9876543210" }
 */
router.post('/login', async (req, res) => {
    try {
        const { name, mobile: rawMobile } = req.body;
        const mobile = extractMobile(rawMobile);

        if (!mobile || mobile.length !== 10) {
            return res.status(400).json({ ok: false, error: 'Please provide a valid 10-digit mobile number.' });
        }

        const jwtSecret = config.jwt && config.jwt.secret;
        if (!jwtSecret) {
            console.error('[login] JWT_SECRET is not set');
            return res.status(500).json({ ok: false, error: 'Server configuration error.' });
        }

        let user = await User.findOne({ mobile });
        if (!user) {
            user = await User.create({
                mobile,
                name: name ? String(name).trim() : 'User',
                isVerified: true,
                lastLoginAt: new Date(),
            });
        } else {
            if (name) user.name = String(name).trim();
            user.lastLoginAt = new Date();
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id, mobile: user.mobile, name: user.name || '' },
            jwtSecret,
            { expiresIn: config.jwt.expiresIn || '7d' }
        );

        return res.status(200).json({
            ok: true,
            token,
            user: {
                id: user._id,
                name: user.name || '',
                mobile: user.mobile || '',
                email: user.email || '',
                isVerified: user.isVerified,
            },
        });
    } catch (err) {
        console.error('[login] error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ ok: false, error: err.message || 'Invalid data.' });
        }
        if (err.code === 11000) {
            return res.status(409).json({ ok: false, error: 'This mobile number is already registered.' });
        }
        if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
            return res.status(503).json({ ok: false, error: 'Database unavailable. Please try again.' });
        }
        return res.status(500).json({ ok: false, error: 'Login failed. Please try again.' });
    }
});

// ─── POST /api/otp/send-otp-dev ───────────────────────────────────────────────
/**
 * Send a 4-digit OTP via api.otp.dev SMS.
 * Body: { mobile: "9876543210" }
 *
 * Mirrors this exact curl:
 *   curl --request POST https://api.otp.dev/v1/verifications \
 *     -H 'X-OTP-Key: <key>' \
 *     -H 'content-type: application/json' \
 *     --data '{ "data": { "channel":"sms", "sender":"<uuid>",
 *                "phone":"919876543210", "template":"<uuid>", "code_length":4 } }'
 */
router.post('/send-otp-dev', async (req, res) => {
    try {
        const { mobile: rawMobile } = req.body;
        console.log('[send-otp-dev] raw input:', rawMobile);
        console.log('[send-otp-dev] DEMO_OTP_ENABLED:', DEMO_OTP_ENABLED);

        if (!rawMobile) {
            return res.status(400).json({ ok: false, error: 'Mobile number is required.' });
        }

        // digits only, country code, no "+" — e.g. "919876543210"
        const phone = normalizePhone(rawMobile);
        console.log('[send-otp-dev] phone sent to api.otp.dev:', phone);

        if (!phone || phone.length !== 12 || !phone.startsWith('91')) {
            return res.status(400).json({ ok: false, error: 'Invalid mobile number. Provide a valid Indian number (10 digits, with optional +91 or leading 0).' });
        }

        // ─── DEMO MODE: Skip real API, store OTP locally ────────────────
        if (DEMO_OTP_ENABLED) {
            demoOtpStore.set(phone, DEMO_OTP_CODE);
            console.log(`[send-otp-dev] DEMO MODE: OTP ${DEMO_OTP_CODE} stored for ${phone}`);
            return res.status(200).json({
                ok: true,
                message_id: 'demo-' + Date.now(),
                demo: true,
                otp: DEMO_OTP_CODE,
            });
        }

        // ─── PRODUCTION MODE: Call real api.otp.dev ──────────────────────
        if (!OTP_API_KEY || !OTP_SENDER || !OTP_TEMPLATE) {
            console.error('[send-otp-dev] missing OTP provider credentials', { OTP_API_KEY: !!OTP_API_KEY, OTP_SENDER: !!OTP_SENDER, OTP_TEMPLATE: !!OTP_TEMPLATE });
            return res.status(500).json({ ok: false, error: 'OTP provider is not configured. Please set OTP_DEV_API_KEY, OTP_DEV_SENDER_ID, and OTP_DEV_TEMPLATE_ID in .env.' });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OTP_TIMEOUT);

        // Payload matches curl exactly
        const payload = {
            data: {
                channel: 'sms',
                sender: OTP_SENDER,
                phone,
                template: OTP_TEMPLATE,
                code_length: 4,
            },
        };

        console.log('[send-otp-dev] payload:', JSON.stringify(payload));

        const otpRes = await fetch(OTP_API_URL, {
            method: 'POST',
            headers: {
                'X-OTP-Key': OTP_API_KEY,
                'accept': 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const otpJson = await otpRes.json();
        console.log('[send-otp-dev] HTTP status:', otpRes.status);
        console.log('[send-otp-dev] full response body:', JSON.stringify(otpJson, null, 2));
        console.log('[send-otp-dev] response.data:', otpJson.data);
        console.log('[send-otp-dev] response.data?.message_id:', otpJson.data?.message_id);

        if (otpRes.ok && otpJson.data && otpJson.data.message_id) {
            console.log('[send-otp-dev] ✅ OTP sent successfully to:', phone, 'message_id:', otpJson.data.message_id);
            return res.status(200).json({
                ok: true,
                message_id: otpJson.data.message_id,
            });
        }

        // If status is ok but structure doesn't match, log the mismatch
        if (otpRes.ok) {
            console.warn('[send-otp-dev] ⚠️  provider returned 200 but unexpected structure:', otpJson);
            return res.status(200).json({
                ok: true,
                message_id: otpJson.message_id || otpJson.id || 'unknown',
            });
        }

        console.error('[send-otp-dev] ❌ provider error — status:', otpRes.status, 'body:', JSON.stringify(otpJson, null, 2));
        return res.status(400).json({
            ok: false,
            error: 'OTP provider failed: ' + (otpJson.message || otpJson.error || 'Unknown error from api.otp.dev'),
            details: otpJson,
        });

    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('[send-otp-dev] timed out after 30s');
            return res.status(504).json({ ok: false, error: 'OTP request timed out. Please try again.' });
        }
        console.error('[send-otp-dev] unexpected error:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error while sending OTP.' });
    }
});

// ─── POST /api/otp/verify-otp-dev ────────────────────────────────────────────
/**
 * Verify OTP code via api.otp.dev.
 * Body: { name?: "John", mobile: "9876543210", code: "1234" }
 *
 * Mirrors this exact curl:
 *   curl https://api.otp.dev/v1/verifications?code=1234&phone=919876543210 \
 *     -H 'X-OTP-Key: <key>'
 */
router.post('/verify-otp-dev', async (req, res) => {
    try {
        const { name, mobile: rawMobile, code } = req.body;
        console.log('[verify-otp-dev] raw mobile:', rawMobile, '| code:', code);
        console.log('[verify-otp-dev] DEMO_OTP_ENABLED:', DEMO_OTP_ENABLED);

        if (!rawMobile || !code) {
            return res.status(400).json({ ok: false, error: 'Mobile number and OTP code are required.' });
        }

        // Must match the exact phone sent during send-otp-dev
        const phone = normalizePhone(rawMobile);
        if (!phone || phone.length !== 12 || !phone.startsWith('91')) {
            return res.status(400).json({ ok: false, error: 'Invalid mobile number format. Use a valid 10-digit Indian number.' });
        }
        if (!String(code).trim()) {
            return res.status(400).json({ ok: false, error: 'OTP code is required.' });
        }

        // ─── DEMO MODE: Check stored OTP ──────────────────────────────────
        if (DEMO_OTP_ENABLED) {
            const storedCode = demoOtpStore.get(phone);
            console.log(`[verify-otp-dev] DEMO MODE: checking ${code} against stored ${storedCode}`);
            if (storedCode !== String(code).trim()) {
                return res.status(400).json({ ok: false, error: 'Invalid OTP. In demo mode, use: ' + DEMO_OTP_CODE });
            }
            demoOtpStore.delete(phone);
            console.log(`[verify-otp-dev] ✅ DEMO MODE: OTP verified for ${phone}`);
            
            // Continue with user creation
            const mobile = extractMobile(rawMobile);
            let user = await User.findOne({ mobile });
            if (!user) {
                user = await User.create({
                    mobile,
                    name: name ? String(name).trim() : 'User',
                    isVerified: true,
                    lastLoginAt: new Date(),
                });
            } else {
                if (name && String(name).trim()) user.name = String(name).trim();
                user.lastLoginAt = new Date();
                await user.save();
            }

            const jwtSecret = config.jwt && config.jwt.secret;
            if (!jwtSecret) {
                console.error('[verify-otp-dev] JWT_SECRET is not set');
                return res.status(500).json({ ok: false, error: 'Server configuration error.' });
            }

            const appToken = jwt.sign(
                { userId: user._id, mobile: user.mobile, name: user.name || '' },
                jwtSecret,
                { expiresIn: config.jwt.expiresIn || '7d' }
            );

            return res.status(200).json({
                ok: true,
                token: appToken,
                user: {
                    id: user._id,
                    name: user.name || '',
                    mobile: user.mobile || '',
                    email: user.email || '',
                    isVerified: user.isVerified,
                },
                demo: true,
            });
        }

        // ─── PRODUCTION MODE: Call real api.otp.dev ──────────────────────
        console.log('[verify-otp-dev] phone:', phone, '| code:', code);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), OTP_TIMEOUT);

        const verifyUrl = `${OTP_API_URL}?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`;
        console.log('[verify-otp-dev] GET', verifyUrl);

        const verifyRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                'X-OTP-Key': OTP_API_KEY,
                'accept': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const verifyJson = await verifyRes.json();
        console.log('[verify-otp-dev] HTTP status:', verifyRes.status);
        console.log('[verify-otp-dev] response:', JSON.stringify(verifyJson));

        if (verifyRes.ok && Array.isArray(verifyJson.data) && verifyJson.data.length > 0) {
            const mobile = extractMobile(rawMobile);

            let user = await User.findOne({ mobile });
            if (!user) {
                user = await User.create({
                    mobile,
                    name: name ? String(name).trim() : 'User',
                    isVerified: true,
                    lastLoginAt: new Date(),
                });
            } else {
                if (name && String(name).trim()) user.name = String(name).trim();
                user.lastLoginAt = new Date();
                await user.save();
            }

            const jwtSecret = config.jwt && config.jwt.secret;
            if (!jwtSecret) {
                console.error('[verify-otp-dev] JWT_SECRET is not set');
                return res.status(500).json({ ok: false, error: 'Server configuration error.' });
            }

            const appToken = jwt.sign(
                { userId: user._id, mobile: user.mobile, name: user.name || '' },
                jwtSecret,
                { expiresIn: config.jwt.expiresIn || '7d' }
            );

            return res.status(200).json({
                ok: true,
                token: appToken,
                user: {
                    id: user._id,
                    name: user.name || '',
                    mobile: user.mobile || '',
                    email: user.email || '',
                    isVerified: user.isVerified,
                },
            });
        }

        console.warn('[verify-otp-dev] invalid/expired OTP for phone:', phone);
        return res.status(400).json({ ok: false, error: 'Invalid or expired OTP. Please try again.' });

    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('[verify-otp-dev] timed out after 15s');
            return res.status(504).json({ ok: false, error: 'Verification request timed out. Please try again.' });
        }
        console.error('[verify-otp-dev] unexpected error:', err);
        return res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' });
    }
});

// ─── GET /api/otp/users ───────────────────────────────────────────────────────
/** List all users — admin only */
const auth = require('../middleware/auth');
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).limit(200);
        res.json({ ok: true, total: users.length, users });
    } catch (err) {
        console.error('[users] error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
