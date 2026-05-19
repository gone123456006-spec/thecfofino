/**
 * Normalize Razorpay credentials from environment (trim, quotes, common typos).
 */
function trimEnv(value) {
    if (value == null) return '';
    return String(value).trim().replace(/^['"]|['"]$/g, '');
}

/**
 * @returns {{ keyId: string, keySecret: string, fixedTypo: boolean }}
 */
function getRazorpayCredentials() {
    let keyId = trimEnv(process.env.RAZORPAY_KEY_ID);
    const keySecret = trimEnv(process.env.RAZORPAY_KEY_SECRET);
    let fixedTypo = false;

    // Common copy-paste mistake: "zp_live_..." / "zp_test_..." instead of "rzp_live_..." / "rzp_test_..."
    if (/^zp_(test|live)_/i.test(keyId)) {
        keyId = `r${keyId}`;
        fixedTypo = true;
    }

    return { keyId, keySecret, fixedTypo };
}

function isValidRazorpayKeyId(keyId) {
    return /^rzp_(test|live)_[A-Za-z0-9]+$/i.test(keyId);
}

module.exports = { getRazorpayCredentials, isValidRazorpayKeyId, trimEnv };
