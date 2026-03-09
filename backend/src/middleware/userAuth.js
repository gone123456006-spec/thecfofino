const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware: Verify app user JWT (from OTP/Google login). Sets req.userId.
 * Use for routes that need the logged-in app user (e.g. GET /api/registrations/my).
 */
module.exports = function userAuthMiddleware(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ ok: false, error: 'Not authenticated.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        if (!decoded.userId) {
            return res.status(401).json({ ok: false, error: 'Invalid token.' });
        }
        req.userId = decoded.userId;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ ok: false, error: 'Token expired. Please log in again.' });
        }
        return res.status(401).json({ ok: false, error: 'Invalid token.' });
    }
};
