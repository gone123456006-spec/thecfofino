require('dotenv').config();

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
};

if (!config.mongoUri) {
    console.warn('⚠️  MONGODB_URI is not set in .env — database connection will fail.');
}

module.exports = config;
