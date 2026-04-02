/**
 * Maps company registration state → max completed tracker step index (0–4),
 * aligned with the app’s company registration tracker.
 * -1 = before the first step (no paid registration yet).
 */
function maxStepIndexFromRegistration(reg) {
  if (!reg) return -1;
  const st = String(reg.status || '').toLowerCase();
  const paid = reg.paymentStatus === 'paid';

  if (st === 'approved' || st === 'completed') return 4;
  if (st === 'filed') return 3;
  if (st === 'initiated') return 2;
  if (st === 'submitted') return 1;
  if (st === 'rejected') return 0;
  if (paid) return 0;
  return -1;
}

/**
 * @param {import('mongoose').Types.ObjectId|string} userId
 */
async function getUserMaxRegistrationStepIndex(userId, CompanyRegistration) {
  const reg = await CompanyRegistration.findOne({ userId })
    .sort({ updatedAt: -1 })
    .select('status paymentStatus')
    .lean();
  return maxStepIndexFromRegistration(reg);
}

module.exports = {
  maxStepIndexFromRegistration,
  getUserMaxRegistrationStepIndex,
};
