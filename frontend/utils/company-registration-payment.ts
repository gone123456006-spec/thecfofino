export type CompanyRegistrationPaymentBreakdown = {
  basePriceINR: number;
  gstPercent: number;
  gstAmountINR: number;
  totalPayableINR: number;
};

export function computeCompanyRegistrationPayment(
  basePriceINR: number,
  gstPercent: number,
): CompanyRegistrationPaymentBreakdown {
  const base = Number.isFinite(basePriceINR) && basePriceINR >= 1 ? basePriceINR : 1;
  const pct = Math.max(0, Math.min(100, Number.isFinite(gstPercent) ? gstPercent : 0));
  const gstAmountINR = Math.round((base * pct) / 100);
  return {
    basePriceINR: base,
    gstPercent: pct,
    gstAmountINR,
    totalPayableINR: base + gstAmountINR,
  };
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
