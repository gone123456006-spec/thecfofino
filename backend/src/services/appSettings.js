const AppSettings = require('../models/AppSettings');

const GLOBAL_KEY = 'global';

/**
 * @returns {Promise<import('mongoose').Document & { companyRegistrationRazorpayAmountINR: number }>}
 */
async function getAppSettings() {
    let doc = await AppSettings.findOne({ key: GLOBAL_KEY });
    if (!doc) {
        doc = await AppSettings.create({ key: GLOBAL_KEY });
    }
    return doc;
}

module.exports = { getAppSettings, GLOBAL_KEY };
