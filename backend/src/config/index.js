require('dotenv').config();

function envStr(key, fallback = '') {
    const raw = process.env[key];
    if (raw == null || raw === '') return fallback;
    return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

const config = {
    mongoUri: process.env.MONGODB_URI,
    port: parseInt(process.env.PORT || '4000', 10),

    jwt: {
        secret: process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    admin: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
    },

    msg91: {
        authkey: process.env.MSG91_AUTHKEY || '',
        widgetId: process.env.MSG91_WIDGET_ID || '',
    },

    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
    },

    smtp: {
        host: envStr('SMTP_HOST', 'smtp.gmail.com'),
        port: parseInt(envStr('SMTP_PORT', '587'), 10),
        secure: envStr('SMTP_SECURE', 'false') === 'true',
        user: envStr('SMTP_USER'),
        pass: envStr('SMTP_PASS').replace(/\s+/g, ''),
        from: envStr('SMTP_FROM') || envStr('SMTP_USER'),
    },

    /** Brevo transactional API (HTTPS) — preferred on Render when SMTP ports are blocked. */
    brevo: {
        apiKey: envStr('BREVO_API_KEY'),
        senderEmail: envStr('BREVO_SENDER_EMAIL') || envStr('SMTP_FROM') || envStr('SMTP_USER'),
        senderName: envStr('BREVO_SENDER_NAME', 'Finovert'),
    },

    emailOtp: {
        demoEnabled: process.env.DEMO_OTP_ENABLED === '1',
        demoCode: process.env.DEMO_OTP_CODE || '123456',
    },

    /** Play Store update check — set when you publish a new release (no app rebuild needed). */
    appVersion: {
        latest: process.env.APP_LATEST_VERSION || '1.0.6',
        min: process.env.APP_MIN_VERSION || '1.0.0',
        androidLatestVersionCode: parseInt(process.env.APP_LATEST_ANDROID_VERSION_CODE || '7', 10),
    },
};

if (!config.mongoUri) {
    console.warn('⚠️  MONGODB_URI is not set in .env — database connection will fail.');
}

module.exports = config;
