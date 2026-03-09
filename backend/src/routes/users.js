const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * PATCH /api/users/profile — update own profile (user must be logged in)
 * Headers: Authorization: Bearer <user_jwt_token>
 * Body: { name, email }
 */
router.patch('/profile', async (req, res) => {
    // Verify user token (not admin token)
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated.' });

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        const { name, email } = req.body;
        const update = {};
        if (name !== undefined) update.name = name;
        if (email !== undefined) update.email = email;

        const user = await User.findByIdAndUpdate(decoded.userId, { $set: update }, { new: true });
        if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

        return res.json({
            ok: true,
            user: { id: user._id, name: user.name, mobile: user.mobile, email: user.email },
        });
    } catch (err) {
        return res.status(401).json({ ok: false, error: 'Invalid token.' });
    }
});

/**
 * GET /api/users — list all app users (admin only)
 */
router.get('/', auth, async (req, res) => {
    try {
        const { search, page = 1, limit = 100 } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        const total = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({ ok: true, total, users });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

/**
 * DELETE /api/users/:id — remove a user (admin only)
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ ok: true, message: 'User deleted.' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
