const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

// POST /api/bookings — from mobile app (public)
router.post('/', async (req, res) => {
    try {
        const { name, mobile, purpose, details } = req.body;
        if (!name || !mobile) {
            return res.status(400).json({ ok: false, error: 'name and mobile are required' });
        }
        const booking = new Booking({ name, mobile, purpose: purpose || 'General enquiry', details });
        await booking.save();
        res.status(201).json({ ok: true, id: booking._id });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/bookings — list all (admin only)
router.get('/', auth, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } },
                { purpose: { $regex: search, $options: 'i' } },
            ];
        }
        const total = await Booking.countDocuments(filter);
        const bookings = await Booking.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));
        res.json({ ok: true, total, bookings });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/bookings/:id — single booking (admin only)
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ ok: false, error: 'Not found' });
        res.json({ ok: true, booking });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PATCH /api/bookings/:id/status — update booking status (admin only)
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { status, adminNotes, scheduledAt } = req.body;
        const update = {};
        if (status) update.status = status;
        if (adminNotes !== undefined) update.adminNotes = adminNotes;
        if (scheduledAt !== undefined) update.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;

        const booking = await Booking.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
        if (!booking) return res.status(404).json({ ok: false, error: 'Not found' });
        res.json({ ok: true, booking });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

module.exports = router;
