const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

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
 * Exchange Firebase ID token for app JWT. User must already exist (sign up via /signup or other flows).
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
        const user = await User.findOne({ email: normEmail });

        if (!user) {
            return res.status(403).json({
                ok: false,
                error:
                    'No Finovert account for this email yet. Sign up with your Gmail, name, and mobile first.',
            });
        }

        user.lastLoginAt = new Date();
        if (firebaseSub && !user.firebaseUid) {
            user.firebaseUid = firebaseSub;
        }
        await user.save();

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

module.exports = router;
