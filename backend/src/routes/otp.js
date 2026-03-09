const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const config = require('../config');

/**
 * POST /api/otp/login
 * Body: { name: "John", mobile: "9876543210" }
 * Login or sign up with name + mobile. Finds or creates user, returns JWT.
 */
router.post('/login', async (req, res) => {
    try {
        const { name, mobile: rawMobile } = req.body;
        const mobile = typeof rawMobile === 'string' ? rawMobile.replace(/\D/g, '').slice(-10) : '';

        if (!mobile) {
            return res.status(400).json({ ok: false, error: 'Mobile number is required.' });
        }

        if (mobile.length !== 10) {
            return res.status(400).json({ ok: false, error: 'Please provide a valid 10-digit mobile number.' });
        }

        const jwtSecret = config.jwt && config.jwt.secret;
        if (!jwtSecret) {
            console.error('Login error: JWT_SECRET is not set');
            return res.status(500).json({ ok: false, error: 'Server configuration error. Please try again later.' });
        }

        let user = await User.findOne({ mobile });
        if (!user) {
            user = await User.create({
                mobile,
                name: name || 'User',
                isVerified: true,
                lastLoginAt: new Date(),
            });
        } else {
            if (name) user.name = name;
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
        console.error('Login error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ ok: false, error: err.message || 'Invalid data' });
        }
        if (err.code === 11000) {
            return res.status(409).json({ ok: false, error: 'This mobile number is already registered.' });
        }
        if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
            return res.status(503).json({ ok: false, error: 'Database unavailable. Please try again.' });
        }
        return res.status(500).json({
            ok: false,
            error: err.message || 'Login failed. Please try again.',
        });
    }
});

/**
 * POST /api/otp/send-otp-dev
 * Sends an OTP using the api.otp.dev service.
 * Body: { mobile: "919999999999" }
 */
router.post('/send-otp-dev', async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ ok: false, error: 'Mobile number is required.' });
        }

        const apiKey = process.env.OTP_DEV_API_KEY;
        const templateId = process.env.OTP_DEV_TEMPLATE_ID;
        const senderId = process.env.OTP_DEV_SENDER_ID;

        if (!apiKey || !templateId || !senderId) {
            console.error('OTP.dev credentials missing in backend/.env');
            return res.status(500).json({ ok: false, error: 'Server OTP configuration error.' });
        }

        const otpRes = await fetch('https://api.otp.dev/v1/verifications', {
            method: 'POST',
            headers: {
                'X-OTP-Key': apiKey,
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                data: {
                    channel: 'sms',
                    sender: senderId,
                    phone: mobile,
                    template: templateId,
                    code_length: 4
                }
            })
        });

        const otpJson = await otpRes.json();

        if (otpRes.ok && otpJson.data && otpJson.data.message_id) {
            return res.status(200).json({ ok: true, message_id: otpJson.data.message_id });
        } else {
            console.error('OTP.dev send error response:', otpJson);
            return res.status(400).json({ ok: false, error: 'Failed to send OTP via provider.', details: otpJson });
        }
    } catch (err) {
        console.error('send-otp-dev error:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error while sending OTP.' });
    }
});

/**
 * POST /api/otp/verify-otp-dev
 * Verifies an OTP using the api.otp.dev service.
 * Body: { name?: "User", mobile: "919999999999", code: "1234" }
 */
router.post('/verify-otp-dev', async (req, res) => {
    try {
        const { name, mobile, code } = req.body;
        if (!mobile || !code) {
            return res.status(400).json({ ok: false, error: 'Mobile number and code are required.' });
        }

        const apiKey = process.env.OTP_DEV_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ ok: false, error: 'Server OTP configuration error.' });
        }

        // OTP.dev Verification: GET /v1/verifications?code=XXXX&phone=YYYY
        const verifyRes = await fetch(`https://api.otp.dev/v1/verifications?code=${code}&phone=${mobile}`, {
            method: 'GET',
            headers: {
                'X-OTP-Key': apiKey,
                'accept': 'application/json'
            }
        });

        const verifyJson = await verifyRes.json();

        // Success condition: the data array is populated with at least one matching verification block
        if (verifyRes.ok && verifyJson.data && verifyJson.data.length > 0) {
            const cleanedMobile = mobile.replace(/\D/g, '').slice(-10);
            let user = await User.findOne({ mobile: cleanedMobile });
            if (!user) {
                user = await User.create({
                    mobile: cleanedMobile,
                    name: name ? name.trim() : 'User',
                    isVerified: true,
                    lastLoginAt: new Date(),
                });
            } else {
                if (name && name.trim()) user.name = name.trim();
                user.lastLoginAt = new Date();
                await user.save();
            }

            const jwtSecret = config.jwt && config.jwt.secret;
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
        } else {
            return res.status(400).json({ ok: false, error: 'Invalid OTP code.' });
        }
    } catch (err) {
        console.error('verify-otp-dev error:', err);
        return res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' });
    }
});


/** GET /api/otp/users — list all app users (admin only) */
const auth = require('../middleware/auth');
router.get('/users', auth, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 }).limit(200);
        res.json({ ok: true, total: users.length, users });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
