/**
 * Base price + GST → total charged via Razorpay for company registration.
 */
function computeCompanyRegistrationPayment(settings) {
    const basePriceINR = Number(settings?.companyRegistrationRazorpayAmountINR) || 1;
    const gstPercent = Math.max(0, Math.min(100, Number(settings?.companyRegistrationGstPercent) || 0));
    const gstAmountINR = Math.round((basePriceINR * gstPercent) / 100);
    const totalPayableINR = basePriceINR + gstAmountINR;
    return { basePriceINR, gstPercent, gstAmountINR, totalPayableINR };
}

module.exports = { computeCompanyRegistrationPayment };
