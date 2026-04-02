const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Notification = require('../models/Notification');
const User = require('../models/User');
const CompanyRegistration = require('../models/CompanyRegistration');
const auth = require('../middleware/auth'); // admin auth
const userAuth = require('../middleware/userAuth'); // app user auth
const { getUserMaxRegistrationStepIndex } = require('../utils/registrationSteps');

function parseMinStepIndex(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 4) return null;
  return n;
}

function toNotificationJSON(n) {
  return {
    id: n._id?.toString?.() ?? String(n._id),
    title: n.title || '',
    body: n.body || '',
    time: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
    read: !!n.read,
  };
}

/**
 * POST /api/notifications/admin/send
 * Admin sends notification to a specific app user.
 * Body: { userId, title, body }
 */
router.post('/admin/send', auth, async (req, res) => {
  try {
    const { userId, title, body, minStepIndex: minStepRaw } = req.body || {};

    if (!userId || !title || !body) {
      return res.status(400).json({ ok: false, error: 'userId, title, and body are required.' });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ ok: false, error: 'Invalid userId.' });
    }

    const minStepIndex = parseMinStepIndex(minStepRaw);
    if (minStepRaw !== undefined && minStepRaw !== null && minStepRaw !== '' && minStepIndex === null) {
      return res.status(400).json({ ok: false, error: 'minStepIndex must be an integer from 0 to 4, or omitted.' });
    }

    const user = await User.findById(userId).select('_id');
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found.' });
    }

    const payload = {
      userId,
      title: String(title).trim(),
      body: String(body).trim(),
      read: false,
    };
    if (minStepIndex !== null) payload.minStepIndex = minStepIndex;

    const created = await Notification.create(payload);

    return res.status(201).json({ ok: true, notification: toNotificationJSON(created) });
  } catch (err) {
    console.error('[notifications/admin/send] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to send notification.' });
  }
});

/**
 * GET /api/notifications/my
 * Logged-in app user fetches their notifications.
 */
router.get('/my', userAuth, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    const userMax = await getUserMaxRegistrationStepIndex(req.userId, CompanyRegistration);
    const visible = list.filter((n) => {
      if (n.minStepIndex == null) return true;
      return userMax >= n.minStepIndex;
    });

    return res.json({
      ok: true,
      notifications: visible.slice(0, 50).map(toNotificationJSON),
    });
  } catch (err) {
    console.error('[notifications/my] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to load notifications.' });
  }
});

/**
 * PATCH /api/notifications/my/mark-read
 * Body: { id } (optional). If id is missing, marks all as read.
 */
router.patch('/my/mark-read', userAuth, async (req, res) => {
  try {
    const { id } = req.body || {};
    if (id) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ ok: false, error: 'Invalid notification id.' });
      }
      await Notification.updateOne({ _id: id, userId: req.userId }, { $set: { read: true } });
      return res.json({ ok: true });
    }

    await Notification.updateMany({ userId: req.userId }, { $set: { read: true } });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[notifications/mark-read] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to update notifications.' });
  }
});

/**
 * POST /api/notifications/me
 * Optional helper for in-app notifications (kept for future).
 * Body: { title, body }
 */
router.post('/me', userAuth, async (req, res) => {
  try {
    const { title, body } = req.body || {};
    if (!title || !body) return res.status(400).json({ ok: false, error: 'title and body are required.' });

    const created = await Notification.create({
      userId: req.userId,
      title: String(title).trim(),
      body: String(body).trim(),
      read: false,
    });

    return res.status(201).json({ ok: true, notification: toNotificationJSON(created) });
  } catch (err) {
    console.error('[notifications/me] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to create notification.' });
  }
});

module.exports = router;

