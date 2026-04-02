const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');
const auth = require('../middleware/auth'); // admin
const userAuth = require('../middleware/userAuth'); // app user

function parseMinStepIndex(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 4) return null;
  return n;
}

function toChatMessageJSON(m) {
  return {
    id: m._id?.toString?.() ?? String(m._id),
    fromRole: m.fromRole,
    text: m.text ?? '',
    time: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
  };
}

function escapeHTML(str) {
  // For safety if dashboard ever renders text using innerHTML.
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * POST /api/messages/admin/send
 * Admin sends a message to a user.
 * Body: { userId, text }
 */
router.post('/admin/send', auth, async (req, res) => {
  try {
    const { userId, text, minStepIndex: minStepRaw } = req.body || {};
    if (!userId || !text) {
      return res.status(400).json({ ok: false, error: 'userId and text are required.' });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ ok: false, error: 'Invalid userId.' });
    }

    const minStepIndex = parseMinStepIndex(minStepRaw);
    if (minStepRaw !== undefined && minStepRaw !== null && minStepRaw !== '' && minStepIndex === null) {
      return res.status(400).json({ ok: false, error: 'minStepIndex must be an integer from 0 to 4, or omitted.' });
    }

    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

    const created = await ChatMessage.create({
      userId,
      fromRole: 'admin',
      text: escapeHTML(String(text).trim()),
    });

    const notifPayload = {
      userId,
      title: 'New message',
      body: String(text).trim(),
      read: false,
    };
    if (minStepIndex !== null) notifPayload.minStepIndex = minStepIndex;
    await Notification.create(notifPayload);

    return res.status(201).json({ ok: true, message: toChatMessageJSON(created) });
  } catch (err) {
    console.error('[messages/admin/send] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to send message.' });
  }
});

/**
 * POST /api/messages/user/send
 * User sends a message to admin.
 * Body: { text }
 */
router.post('/user/send', userAuth, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: 'text is required.' });

    const created = await ChatMessage.create({
      userId: req.userId,
      fromRole: 'user',
      text: escapeHTML(String(text).trim()),
    });

    return res.status(201).json({ ok: true, message: toChatMessageJSON(created) });
  } catch (err) {
    console.error('[messages/user/send] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to send message.' });
  }
});

/**
 * GET /api/messages/my
 * User fetches their conversation with admin.
 */
router.get('/my', userAuth, async (req, res) => {
  try {
    const list = await ChatMessage.find({ userId: req.userId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();
    return res.json({ ok: true, messages: list.map(toChatMessageJSON) });
  } catch (err) {
    console.error('[messages/my] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to load messages.' });
  }
});

/**
 * GET /api/messages/admin/user/:userId
 * Admin fetches conversation with specific user.
 */
router.get('/admin/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ ok: false, error: 'Invalid userId.' });
    }
    const list = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();
    return res.json({ ok: true, messages: list.map(toChatMessageJSON) });
  } catch (err) {
    console.error('[messages/admin/user/:userId] error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Failed to load messages.' });
  }
});

module.exports = router;

