const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const router = express.Router();

/**
 * POST /api/auth/email
 * Sign in or sign up with email and password.
 * Body: { email, password }
 * Returns: { ok: true, token, user: { name, email, mobile, id } }
 */
router.post('/email', async (req, res) => {
    try {
        const { email, password, name, mobile } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                error: 'Email and password are required.',
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                ok: false,
                error: 'Invalid email address.',
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                error: 'Password must be at least 6 characters.',
            });
        }

        console.log('[auth/email] Attempting login:', email);

        // Check if user exists
        let user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            console.log('[auth/email] User not found, creating new account');
            // Create new user (sign up)
            user = await User.create({
                email: email.toLowerCase().trim(),
                password: password, // Note: In production, hash this with bcrypt
                name: name || email.split('@')[0],
                mobile: mobile || '',
                isVerified: true,
                lastLoginAt: new Date(),
            });
            console.log('[auth/email] New user created:', user._id);
        } else {
            console.log('[auth/email] User found, checking password');
            console.log('[auth/email] Stored password:', user.password ? `[${user.password.length} chars]` : 'undefined');
            console.log('[auth/email] Provided password:', password ? `[${password.length} chars]` : 'undefined');
            // For now, do simple password check (in production, use bcrypt)
            if (user.password !== password) {
                console.log('[auth/email] Password mismatch - stored:', JSON.stringify(user.password), 'provided:', JSON.stringify(password));
                return res.status(401).json({
                    ok: false,
                    error: 'Invalid email or password.',
                });
            }
            user.lastLoginAt = new Date();
            await user.save();
        }

        // Generate JWT token
        const jwtSecret = config.jwt && config.jwt.secret;
        if (!jwtSecret) {
            console.error('[auth/email] JWT_SECRET is not set');
            return res.status(500).json({
                ok: false,
                error: 'Server configuration error.',
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name || '' },
            jwtSecret,
            { expiresIn: config.jwt.expiresIn || '7d' }
        );

        console.log('[auth/email] ✅ Login successful for:', email);

        return res.status(200).json({
            ok: true,
            token,
            user: {
                id: user._id,
                name: user.name || '',
                email: user.email || '',
                mobile: user.mobile || '',
                isVerified: user.isVerified,
            },
        });
    } catch (err) {
        console.error('[auth/email] error:', err);
        if (err.code === 11000) {
            return res.status(409).json({
                ok: false,
                error: 'Email already registered.',
            });
        }
        return res.status(500).json({
            ok: false,
            error: 'Email sign-in failed. Please try again.',
        });
    }
});

/**
 * POST /api/auth/google
 * Sign in or sign up with Google.
 * Body: { idToken }
 * Returns: { ok: true, token, user: { name, email, mobile, id } }
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

        console.log('[auth/google] Processing Google login');

        // In production, decode and verify idToken with Firebase
        // For now, we'll assume the frontend verified it
        // In real implementation: admin-sdk decode, extract email/name

        // Mock implementation: extract basic info from JWT (in production, verify with Firebase)
        let googleEmail = null;
        let googleName = null;

        try {
            // This is a simple decode (NOT verification - frontend should verify with Firebase)
            // In production, use Firebase Admin SDK
            const parts = idToken.split('.');
            if (parts.length === 3) {
                const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                googleEmail = decoded.email;
                googleName = decoded.name || decoded.given_name || 'User';
                console.log('[auth/google] Decoded email:', googleEmail);
            }
        } catch (e) {
            console.warn('[auth/google] Could not decode token locally:', e.message);
            // Continue anyway - frontend should have verified it
            return res.status(400).json({
                ok: false,
                error: 'Invalid ID token.',
            });
        }

        if (!googleEmail) {
            return res.status(400).json({
                ok: false,
                error: 'Could not extract email from ID token.',
            });
        }

        // Check if user exists
        let user = await User.findOne({ email: googleEmail.toLowerCase().trim() });

        if (!user) {
            console.log('[auth/google] User not found, creating new account');
            // Create new user from Google info
            user = await User.create({
                email: googleEmail.toLowerCase().trim(),
                name: googleName || googleEmail.split('@')[0],
                isVerified: true,
                lastLoginAt: new Date(),
            });
            console.log('[auth/google] New user created:', user._id);
        } else {
            console.log('[auth/google] User found, updating last login');
            user.lastLoginAt = new Date();
            await user.save();
        }

        // Generate JWT token
        const jwtSecret = config.jwt && config.jwt.secret;
        if (!jwtSecret) {
            console.error('[auth/google] JWT_SECRET is not set');
            return res.status(500).json({
                ok: false,
                error: 'Server configuration error.',
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, name: user.name || '' },
            jwtSecret,
            { expiresIn: config.jwt.expiresIn || '7d' }
        );

        console.log('[auth/google] ✅ Login successful for:', googleEmail);

        return res.status(200).json({
            ok: true,
            token,
            user: {
                id: user._id,
                name: user.name || '',
                email: user.email || '',
                mobile: user.mobile || '',
                isVerified: user.isVerified,
            },
        });
    } catch (err) {
        console.error('[auth/google] error:', err);
        if (err.code === 11000) {
            return res.status(409).json({
                ok: false,
                error: 'Email already registered.',
            });
        }
        return res.status(500).json({
            ok: false,
            error: 'Google sign-in failed. Please try again.',
        });
    }
});

module.exports = router;
