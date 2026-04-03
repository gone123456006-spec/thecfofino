const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const auth = require('../middleware/auth');
const CompanyRegistration = require('../models/CompanyRegistration');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns: { ok: true, token, username }
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (username !== config.admin.username || password !== config.admin.password) {
        return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Generate JWT token — expires in 7 days (from config)
    const token = jwt.sign(
        { username, role: 'admin' },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );

    return res.json({ ok: true, token, username });
});

/**
 * GET /api/admin/verify
 * Headers: Authorization: Bearer <token>
 * Returns: { ok: true, admin: { username, role, iat, exp } }
 */
router.get('/verify', (req, res) => {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        return res.json({ ok: true, admin: decoded });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
});

/**
 * POST /api/admin/wipe-all-data
 * Admin JWT only. Deletes all app-user data: registrations, bookings, users,
 * notifications, chat messages. Does not remove AppSettings (Razorpay fee / copy).
 */
router.post('/wipe-all-data', auth, async (req, res) => {
    if (req.admin.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden.' });
    }
    try {
        const [registrations, bookings, users, notifications, messages] = await Promise.all([
            CompanyRegistration.deleteMany({}),
            Booking.deleteMany({}),
            User.deleteMany({}),
            Notification.deleteMany({}),
            ChatMessage.deleteMany({}),
        ]);
        return res.json({
            ok: true,
            deleted: {
                registrations: registrations.deletedCount,
                bookings: bookings.deletedCount,
                users: users.deletedCount,
                notifications: notifications.deletedCount,
                messages: messages.deletedCount,
            },
        });
    } catch (err) {
        console.error('[admin/wipe-all-data]', err);
        return res.status(500).json({ ok: false, error: err.message || 'Wipe failed.' });
    }
});

module.exports = router;
