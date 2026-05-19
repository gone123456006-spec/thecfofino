/** Indian PAN: 5 letters + 4 digits + 1 letter */
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const AADHAAR_RE = /^\d{12}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;

function normalizePan(v) {
    return String(v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function normalizeAadhaar(v) {
    return String(v || '').replace(/\D/g, '');
}

function normalizeMobile(v) {
    return String(v || '').replace(/\D/g, '').slice(-10);
}

/**
 * @returns {string|null} error message or null if valid
 */
function validateRegistrationPayload(data) {
    if (!data.businessType || !data.proposedName1?.trim()) {
        return 'businessType and proposedName1 are required';
    }

    const mobile = normalizeMobile(data.companyMobile);
    if (data.companyMobile != null && String(data.companyMobile).trim() !== '') {
        if (!MOBILE_RE.test(mobile)) {
            return 'Company mobile must be 10 digits starting with 6–9';
        }
    }

    if (Array.isArray(data.directors)) {
        for (let i = 0; i < data.directors.length; i++) {
            const d = data.directors[i] || {};
            const pan = normalizePan(d.pan);
            if (d.pan != null && String(d.pan).trim() !== '' && !PAN_RE.test(pan)) {
                return `Director ${i + 1}: invalid PAN (use format ABCDE1234F)`;
            }
            const aadhaar = normalizeAadhaar(d.aadhaar);
            if (d.aadhaar != null && String(d.aadhaar).trim() !== '' && !AADHAAR_RE.test(aadhaar)) {
                return `Director ${i + 1}: Aadhaar must be exactly 12 digits`;
            }
        }
    }

    return null;
}

module.exports = {
    PAN_RE,
    AADHAAR_RE,
    MOBILE_RE,
    normalizePan,
    normalizeAadhaar,
    normalizeMobile,
    validateRegistrationPayload,
};
