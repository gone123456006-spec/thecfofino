const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware: Verify JWT token from Authorization header.
 * Usage: Add `auth` as a middleware to any protected route.
 *
 * Request must include:
 *   Authorization: Bearer <token>
 */
module.exports = function authMiddleware(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.admin = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
};
