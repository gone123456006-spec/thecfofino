const config = require('./config'); // loads dotenv internally
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const userAuthRoutes = require('./routes/user-auth');
const registrationRoutes = require('./routes/registrations');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const statusRoutes = require('./routes/status');
const otpRoutes = require('./routes/otp');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const messagesRoutes = require('./routes/messages');
const User = require('./models/User');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────
const cors = require('cors');
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Root ─────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({
        ok: true,
        name: 'Finovert API',
        message: 'API is running. Use /api/* for endpoints.',
        links: {
            health: '/api/health',
            dashboard: '/dashboard',
        },
    });
});

// ─── Static Dashboard ──────────────────────────────────────────────
app.use('/dashboard', express.static(__dirname + '/../dashboard'));

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).type('text/plain').send('OK');
});

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, server: 'Finovert Admin API', time: new Date().toISOString() });
});

// ─── Public branding (Razorpay checkout `image` must be an HTTPS/HTTP URL) ─
app.get('/api/branding/finovert-logo.png', (_req, res) => {
    const logoPath = path.join(__dirname, '../../frontend/assets/images/logo-fino.png');
    res.type('image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(logoPath, (err) => {
        if (err) {
            console.warn('[branding] finovert logo:', err.message);
            if (!res.headersSent) {
                res.status(404).type('json').json({ ok: false, error: 'Logo asset not found on server.' });
            }
        }
    });
});

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/admin', authRoutes);
app.use('/api/auth', userAuthRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messages', messagesRoutes);

// ─── Start Server ─────────────────────────────────────────────────
let httpServer = null;

function shutdown() {
    if (httpServer) {
        httpServer.close(() => {
            mongoose.connection.close(false).then(() => process.exit(0));
        });
        setTimeout(() => process.exit(1), 5000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

mongoose
    .connect(config.mongoUri)
    .then(async () => {
        console.log('✅ Connected to MongoDB Atlas');
        // Fix E11000 on email and mobile: drop old non-sparse unique indexes so sparse indexes can be used
        try {
            await User.collection.dropIndex('email_1');
            console.log('✅ Dropped old email_1 index');
        } catch (e) {
            if (e.code !== 27 && e.codeName !== 'IndexNotFound') {
                console.warn('Index email_1 drop (optional):', e.message);
            }
        }
        try {
            await User.collection.dropIndex('mobile_1');
            console.log('✅ Dropped old mobile_1 index');
        } catch (e) {
            if (e.code !== 27 && e.codeName !== 'IndexNotFound') {
                console.warn('Index mobile_1 drop (optional):', e.message);
            }
        }
        await User.syncIndexes();
        httpServer = app.listen(config.port, () => {
            console.log(`🚀 Finovert API running at http://localhost:${config.port}`);
            console.log(`📊 Admin Dashboard:   http://localhost:${config.port}/dashboard`);
        });
        httpServer.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${config.port} is already in use. Stop the other process or run: taskkill /F /PID <pid> (find pid with: netstat -ano | findstr :${config.port})`);
            } else {
                console.error('❌ Server error:', err.message);
            }
            process.exit(1);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection failed:', err.message);
        process.exit(1);
    });

module.exports = app;
