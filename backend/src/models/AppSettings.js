const mongoose = require('mongoose');

/**
 * Singleton-style app settings (payment copy & amounts managed from admin dashboard).
 */
const AppSettingsSchema = new mongoose.Schema({
    key: { type: String, default: 'global', unique: true, index: true },
    companyRegistrationRazorpayAmountINR: { type: Number, default: 1, min: 1 },
    companyRegistrationProductTitle: { type: String, default: 'Company Registration — Filing Fee' },
    companyRegistrationProductDescription: {
        type: String,
        default: 'Secure payment via Razorpay. Unlocks document upload and MCA filing workflow.',
    },
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', AppSettingsSchema);
