const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const {
    isSmtpConfigured,
    generateOtpCode,
    storeEmailOtp,
    canResend,
    verifyOtpForEmail,
    createVerificationSession,
    consumeVerificationSession,
    sendOtpEmail,
    RESEND_COOLDOWN_MS,
    OTP_LENGTH,
} = require('../services/emailOtp');

const router = express.Router();
const SALT_ROUNDS = 10;

function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function normalizeEmail(email) {
    return String(email).toLowerCase().trim();
}

/** UI labels this as Gmail; enforce Gmail (or googlemail) domains for email/password auth. */
function isGmailAddress(email) {
    const n = normalizeEmail(email);
    // Must be actual email domain: ...@gmail.com or ...@googlemail.com
    return /@(gmail|googlemail)\.com$/i.test(n);
}

function normalizeMobileDigits(mobile) {
    const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
    return digits.length === 10 ? digits : null;
}

function getJwtSecret(res) {
    const jwtSecret = config.jwt && config.jwt.secret;
    if (!jwtSecret) {
        console.error('[auth] JWT_SECRET is not set');
        res.status(500).json({ ok: false, error: 'Server configuration error.' });
        return null;
    }
    return jwtSecret;
}

function signAppToken(user) {
    const jwtSecret = config.jwt && config.jwt.secret;
    return jwt.sign(
        { userId: user._id, email: user.email || '', name: user.name || '' },
        jwtSecret,
        { expiresIn: config.jwt.expiresIn || '7d' },
    );
}

function userJson(user) {
    return {
        id: user._id,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        isVerified: user.isVerified,
    };
}

async function verifyPassword(user, plain) {
    if (!user.password || !plain) return false;
    if (user.password.startsWith('$2')) {
        return bcrypt.compare(plain, user.password);
    }
    if (user.password === plain) {
        user.password = await bcrypt.hash(plain, SALT_ROUNDS);
        await user.save();
        return true;
    }
    return false;
}

/**
 * POST /api/auth/signup
 * Register with name, mobile, Gmail, password (after Firebase user is created on the client).
 * Body: { name, mobile, email, password, firebaseUid? }
 */
router.post('/signup', async (req, res) => {
    try {
        const { name, mobile, email, password, firebaseUid } = req.body || {};

        if (!name || !String(name).trim()) {
            return res.status(400).json({ ok: false, error: 'Name is required.' });
        }
        if (!email || !password) {
            return res.status(400).json({ ok: false, error: 'Email and password are required.' });
        }
        const mobileDigits = normalizeMobileDigits(mobile);
        if (!mobileDigits) {
            return res.status(400).json({ ok: false, error: 'Enter a valid 10-digit mobile number.' });
        }
        if (!isGmailAddress(email)) {
            return res.status(400).json({
                ok: false,
                error: 'Use a Gmail address (@gmail.com) for email sign-up.',
            });
        }
        const normEmail = normalizeEmail(email);
        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                error: 'Password must be at least 6 characters.',
            });
        }

        const existing = await User.findOne({ email: normEmail });
        if (existing) {
            return res.status(409).json({ ok: false, error: 'This email is already registered.' });
        }

        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await User.create({
            name: String(name).trim(),
            mobile: mobileDigits,
            email: normEmail,
            password: hash,
            firebaseUid: firebaseUid && String(firebaseUid).trim() ? String(firebaseUid).trim() : undefined,
            isVerified: true,
            lastLoginAt: new Date(),
        });

        const jwtSecret = getJwtSecret(res);
        if (!jwtSecret) return;

        const token = signAppToken(user);
        return res.status(201).json({
            ok: true,
            token,
            user: userJson(user),
        });
    } catch (err) {
        console.error('[auth/signup] error:', err);
        if (err.code === 11000) {
            return res.status(409).json({
                ok: false,
                error: 'Email or mobile is already registered.',
            });
        }
        return res.status(500).json({
            ok: false,
            error: 'Sign-up failed. Please try again.',
        });
    }
});

/**
 * POST /api/auth/email
 * Login only (existing accounts). Does not create users.
 * Body: { email, password }
 */
router.post('/email', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                error: 'Email and password are required.',
            });
        }
        if (!isGmailAddress(email)) {
            return res.status(400).json({
                ok: false,
                error: 'Use a Gmail address (@gmail.com) to sign in.',
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                error: 'Password must be at least 6 characters.',
            });
        }

        const normEmail = normalizeEmail(email);
        const user = await User.findOne({ email: normEmail });

        if (!user) {
            return res.status(401).json({
                ok: false,
                error: 'No account for this email. Sign up first.',
            });
        }

        const ok = await verifyPassword(user, password);
        if (!ok) {
            return res.status(401).json({
                ok: false,
                error: 'Invalid email or password.',
            });
        }

        const jwtSecret = getJwtSecret(res);
        if (!jwtSecret) return;

        user.lastLoginAt = new Date();
        await user.save();

        const token = signAppToken(user);

        return res.status(200).json({
            ok: true,
            token,
            user: userJson(user),
        });
    } catch (err) {
        console.error('[auth/email] error:', err);
        return res.status(500).json({
            ok: false,
            error: 'Email sign-in failed. Please try again.',
        });
    }
});

/**
 * POST /api/auth/google
 * Exchange Firebase/Google ID token for app JWT. Creates account on first sign-in.
 * Body: { idToken }
 */
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body || {};

        if (!idToken) {
            return res.status(400).json({
                ok: false,
                error: 'ID token is required.',
            });
        }

        let decoded;
        try {
            decoded = decodeJwtPayload(idToken);
        } catch (e) {
            console.warn('[auth/google] Could not decode token locally:', e.message);
            return res.status(400).json({
                ok: false,
                error: 'Invalid ID token.',
            });
        }

        if (!decoded) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid ID token.',
            });
        }

        const googleEmail = decoded.email;
        if (!googleEmail) {
            return res.status(400).json({
                ok: false,
                error: 'Could not extract email from ID token.',
            });
        }

        const firebaseSub = decoded.sub || decoded.user_id || null;
        const normEmail = normalizeEmail(googleEmail);
        let user = await User.findOne({ email: normEmail });

        if (!user) {
            const displayName =
                (decoded.name && String(decoded.name).trim()) ||
                (decoded.given_name && String(decoded.given_name).trim()) ||
                normEmail.split('@')[0];
            user = await User.create({
                email: normEmail,
                name: displayName,
                firebaseUid: firebaseSub ? String(firebaseSub) : undefined,
                isVerified: true,
                lastLoginAt: new Date(),
            });
        } else {
            user.lastLoginAt = new Date();
            if (firebaseSub && !user.firebaseUid) {
                user.firebaseUid = firebaseSub;
            }
            const tokenName = decoded.name && String(decoded.name).trim();
            if (tokenName && (!user.name || user.name === 'User')) {
                user.name = tokenName;
            }
            await user.save();
        }

        const jwtSecret = getJwtSecret(res);
        if (!jwtSecret) return;

        const token = signAppToken(user);

        return res.status(200).json({
            ok: true,
            token,
            user: userJson(user),
        });
    } catch (err) {
        console.error('[auth/google] error:', err);
        return res.status(500).json({
            ok: false,
            error: 'Google sign-in failed. Please try again.',
        });
    }
});

/**
 * POST /api/auth/email-otp/send
 * Send a 6-digit OTP to a Gmail address via SMTP.
 * Body: { email }
 */
router.post('/email-otp/send', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ ok: false, error: 'Gmail address is required.' });
        }
        if (!isGmailAddress(email)) {
            return res.status(400).json({
                ok: false,
                error: 'Use a Gmail address (@gmail.com or @googlemail.com).',
            });
        }

        const normEmail = normalizeEmail(email);

        if (!canResend(normEmail)) {
            return res.status(429).json({
                ok: false,
                error: `Please wait ${Math.ceil(RESEND_COOLDOWN_MS / 1000)} seconds before requesting another code.`,
            });
        }

        if (!isSmtpConfigured()) {
            const demoEnabled = config.emailOtp && config.emailOtp.demoEnabled;
            if (!demoEnabled) {
                return res.status(500).json({
                    ok: false,
                    error:
                        'Email OTP is not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password) in backend .env.',
                });
            }
        }

        const demoEnabled = config.emailOtp && config.emailOtp.demoEnabled;
        const code = demoEnabled ? String(config.emailOtp.demoCode || '123456').padStart(OTP_LENGTH, '0').slice(-OTP_LENGTH) : generateOtpCode();
        storeEmailOtp(normEmail, code);

        if (demoEnabled && !isSmtpConfigured()) {
            console.log(`[email-otp/send] DEMO ONLY (no SMTP): OTP ${code} for ${normEmail}`);
            return res.status(200).json({
                ok: true,
                demo: true,
                message: 'Demo mode: SMTP not configured. Use the demo OTP from server logs.',
            });
        }

        await sendOtpEmail(normEmail, code);
        console.log(`[email-otp/send] OTP emailed to ${normEmail}`);
        return res.status(200).json({
            ok: true,
            message: `A ${OTP_LENGTH}-digit code was sent to your Gmail.`,
        });
    } catch (err) {
        console.error('[email-otp/send] error:', err);
        return res.status(500).json({
            ok: false,
            error: 'Failed to send OTP. Check SMTP settings and try again.',
        });
    }
});

/**
 * POST /api/auth/email-otp/verify
 * Step 2: Verify 6-digit OTP for the given Gmail only (one-time, per-email).
 * Body: { email, code }
 * Returns: { verificationToken } to complete profile in step 3.
 */
router.post('/email-otp/verify', async (req, res) => {
    try {
        const { email, code } = req.body || {};

        if (!email || code === undefined || code === null || code === '') {
            return res.status(400).json({ ok: false, error: 'Gmail and 6-digit OTP are required.' });
        }
        if (!isGmailAddress(email)) {
            return res.status(400).json({
                ok: false,
                error: 'Use a Gmail address (@gmail.com or @googlemail.com).',
            });
        }

        const normEmail = normalizeEmail(email);
        const demoEnabled = config.emailOtp && config.emailOtp.demoEnabled;

        if (demoEnabled && !isSmtpConfigured()) {
            const demoCode = String(config.emailOtp.demoCode || '123456').padStart(OTP_LENGTH, '0').slice(-OTP_LENGTH);
            const entered = String(code).replace(/\D/g, '');
            if (entered !== demoCode) {
                return res.status(400).json({
                    ok: false,
                    error: `Invalid OTP. Demo code is ${demoCode}.`,
                });
            }
        } else {
            const check = verifyOtpForEmail(normEmail, code);
            if (!check.ok) {
                return res.status(400).json({ ok: false, error: check.error });
            }
        }

        const verificationToken = createVerificationSession(normEmail);
        return res.status(200).json({
            ok: true,
            email: normEmail,
            verificationToken,
            message: 'Gmail verified. Add your name and mobile to finish.',
        });
    } catch (err) {
        console.error('[email-otp/verify] error:', err);
        return res.status(500).json({
            ok: false,
            error: 'OTP verification failed. Please try again.',
        });
    }
});

/**
 * POST /api/auth/email-otp/complete
 * Step 3: After OTP verified — set name & mobile, sign in.
 * Body: { email, verificationToken, name, mobile }
 */
router.post('/email-otp/complete', async (req, res) => {
    try {
        const { email, verificationToken, name, mobile } = req.body || {};

        if (!email || !verificationToken) {
            return res.status(400).json({ ok: false, error: 'Complete Gmail verification first.' });
        }
        if (!name || !String(name).trim()) {
            return res.status(400).json({ ok: false, error: 'Name is required.' });
        }
        const mobileDigits = normalizeMobileDigits(mobile);
        if (!mobileDigits) {
            return res.status(400).json({ ok: false, error: 'Enter a valid 10-digit mobile number.' });
        }
        if (!isGmailAddress(email)) {
            return res.status(400).json({
                ok: false,
                error: 'Use a Gmail address (@gmail.com or @googlemail.com).',
            });
        }

        const normEmail = normalizeEmail(email);
        const sessionCheck = consumeVerificationSession(verificationToken, normEmail);
        if (!sessionCheck.ok) {
            return res.status(401).json({ ok: false, error: sessionCheck.error });
        }

        let user = await User.findOne({ email: normEmail });

        if (!user) {
            user = await User.create({
                email: normEmail,
                name: String(name).trim(),
                mobile: mobileDigits,
                isVerified: true,
                lastLoginAt: new Date(),
            });
        } else {
            user.name = String(name).trim();
            user.mobile = mobileDigits;
            user.isVerified = true;
            user.lastLoginAt = new Date();
            await user.save();
        }

        const jwtSecret = getJwtSecret(res);
        if (!jwtSecret) return;

        const token = signAppToken(user);
        return res.status(200).json({
            ok: true,
            token,
            user: userJson(user),
        });
    } catch (err) {
        console.error('[email-otp/complete] error:', err);
        if (err.code === 11000) {
            return res.status(409).json({
                ok: false,
                error: 'This email or mobile is already registered.',
            });
        }
        return res.status(500).json({
            ok: false,
            error: 'Sign-in failed. Please try again.',
        });
    }
});

module.exports = router;
