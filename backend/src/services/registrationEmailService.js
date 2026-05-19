const CompanyRegistration = require('../models/CompanyRegistration');
const User = require('../models/User');
const { sendMail, isSmtpConfigured } = require('./mailer');
const {
    TRACKER_STEPS,
    effectiveRegistrationStatus,
    resolveStepsDone,
    getNextPendingStepLabel,
} = require('../utils/registration-tracker-steps');

/** Resend pending reminders at most once per 24 hours. */
const PENDING_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const PAYMENT_RECEIVED_KEY = 'payment_received';
const PENDING_PAYMENT_KEY = 'pending_payment';
const PENDING_PROCESS_KEY = 'pending_process';

/** Fields only — never load director file blobs for email jobs. */
const EMAIL_SELECT =
    'userId caseId proposedName1 proposedName2 businessType businessActivity registeredAddress capitalStructure companyMobile companyEmail status paymentStatus paymentAmount paymentReference paymentMethod paidAt emailsSent directors.name directors.pan directors.shareholding';

function formatINR(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
}

function filingTitle(reg) {
    const name = reg.proposedName1?.trim() || 'Company registration';
    return reg.caseId ? `${name} (${reg.caseId})` : name;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function emailShell(title, bodyHtml) {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:Arial,Helvetica,sans-serif;color:#202124">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:24px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border:1px solid #e8eaed;border-radius:8px;overflow:hidden">
        <tr><td style="background:#0a4d6e;padding:20px 24px">
          <span style="color:#fff;font-size:20px;font-weight:700">Finovert</span>
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#202124">${escapeHtml(title)}</h1>
          ${bodyHtml}
          <p style="margin:24px 0 0;font-size:12px;color:#80868b;line-height:18px">
            This message was sent to the Gmail you used to sign in to Finovert. Open the app for live tracking.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailTable(rows) {
    const trs = rows
        .filter(([, v]) => v != null && v !== '' && v !== '—')
        .map(
            ([label, value]) =>
                `<tr><td style="padding:8px 0;color:#5f6368;font-size:14px;width:42%">${escapeHtml(label)}</td>` +
                `<td style="padding:8px 0;color:#202124;font-size:14px;font-weight:500">${escapeHtml(value)}</td></tr>`,
        )
        .join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e8eaed;margin-top:12px">${trs}</table>`;
}

function getEmailsSentMap(reg) {
    if (!reg.emailsSent) return {};
    if (reg.emailsSent instanceof Map) return Object.fromEntries(reg.emailsSent);
    return typeof reg.emailsSent === 'object' ? reg.emailsSent : {};
}

function wasEmailSent(reg, key) {
    return Boolean(getEmailsSentMap(reg)[key]);
}

function canSendPendingAgain(reg, key) {
    const sent = getEmailsSentMap(reg)[key];
    if (!sent) return true;
    const t = sent instanceof Date ? sent.getTime() : new Date(sent).getTime();
    if (Number.isNaN(t)) return true;
    return Date.now() - t >= PENDING_COOLDOWN_MS;
}

/** Lightweight DB update — avoids saving huge director file payloads. */
async function markEmailSent(regId, key) {
    const at = new Date();
    await CompanyRegistration.updateOne({ _id: regId }, { $set: { [`emailsSent.${key}`]: at } });
    return at;
}

function isValidEmail(value) {
    const e = String(value || '').trim().toLowerCase();
    return e.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Registration emails always go to the Gmail stored at sign-in (User.email).
 * Company form email is not used — keeps one inbox per account.
 */
async function resolveRecipient(reg) {
    if (!reg.userId) return null;
    const user = await User.findById(reg.userId).select('email name').lean();
    if (!isValidEmail(user?.email)) return null;
    return {
        to: String(user.email).toLowerCase().trim(),
        displayName: user.name || '',
        source: 'sign_in_gmail',
    };
}

function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * After sign-in: link filings to the user and queue emails to their sign-in Gmail.
 */
async function syncRegistrationEmailsForLoginUser(userId, loginEmail) {
    if (!userId || !isValidEmail(loginEmail)) return;
    const norm = String(loginEmail).toLowerCase().trim();

    await CompanyRegistration.updateMany(
        {
            $or: [{ userId: null }, { userId: { $exists: false } }],
            companyEmail: { $regex: new RegExp(`^${escapeRegex(norm)}$`, 'i') },
        },
        { $set: { userId } },
    );

    const regs = await CompanyRegistration.find({ userId }).select('_id').lean();
    for (const r of regs) {
        await processRegistrationEmails(r._id);
    }
}

function queueSyncForLoginUser(userId, loginEmail) {
    void syncRegistrationEmailsForLoginUser(userId, loginEmail).catch((err) => {
        console.error('[registration-email] login sync', err.message || err);
    });
}

function buildPaymentDetailsBody(reg, recipient) {
    const directors = (reg.directors || [])
        .map((d, i) => `${i + 1}. ${d.name || 'Director'} — PAN: ${d.pan || '—'} (${d.shareholding || '—'}%)`)
        .join('<br/>');

    const rows = [
        ['Account', recipient.displayName || '—'],
        ['Case ID', reg.caseId || '—'],
        ['Company name', reg.proposedName1 || '—'],
        ['Business type', reg.businessType || '—'],
        ['Activity', reg.businessActivity || '—'],
        ['Registered address', reg.registeredAddress || '—'],
        ['Capital structure', reg.capitalStructure || '—'],
        ['Company mobile', reg.companyMobile || '—'],
        ['Company email', reg.companyEmail || '—'],
        ['Amount paid', formatINR(reg.paymentAmount)],
        ['Payment status', reg.paymentStatus || '—'],
        ['Payment reference', reg.paymentReference || '—'],
        ['Payment method', reg.paymentMethod || '—'],
        ['Paid at', reg.paidAt ? new Date(reg.paidAt).toLocaleString('en-IN') : '—'],
    ];

    return `
      <p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#5f6368">
        Thank you — we received your payment for <strong>${escapeHtml(filingTitle(reg))}</strong>.
        Below is a summary of your registration details.
      </p>
      ${detailTable(rows)}
      ${directors ? `<p style="margin:16px 0 4px;font-size:13px;font-weight:600;color:#202124">Directors</p><p style="margin:0;font-size:14px;line-height:22px;color:#5f6368">${directors}</p>` : ''}
    `;
}

function buildStepBody(reg, step) {
    return `
      <p style="margin:0 0 8px;font-size:15px;line-height:22px;color:#5f6368">
        <strong>${escapeHtml(step.label)}</strong> — ${escapeHtml(step.sublabel)}
      </p>
      <p style="margin:0;font-size:14px;color:#202124">Filing: ${escapeHtml(filingTitle(reg))}</p>
      ${detailTable([
          ['Case ID', reg.caseId],
          ['Current status', String(reg.status || 'pending')],
          ['Payment', reg.paymentStatus || 'unpaid'],
      ])}
    `;
}

function buildPendingPaymentBody(reg) {
    return `
      <p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#5f6368">
        Your company registration for <strong>${escapeHtml(filingTitle(reg))}</strong> is waiting for payment.
        Complete payment in the Finovert app to continue.
      </p>
      ${detailTable([
          ['Case ID', reg.caseId],
          ['Company name', reg.proposedName1],
          ['Amount due', formatINR(reg.paymentAmount)],
          ['Payment status', reg.paymentStatus || 'unpaid'],
      ])}
    `;
}

function buildPendingProcessBody(reg, nextStepLabel) {
    return `
      <p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#5f6368">
        Your filing <strong>${escapeHtml(filingTitle(reg))}</strong> is in progress.
        The next step is: <strong>${escapeHtml(nextStepLabel)}</strong>.
      </p>
      ${detailTable([
          ['Case ID', reg.caseId],
          ['Current status', String(reg.status || 'pending')],
          ['Payment', reg.paymentStatus || 'unpaid'],
      ])}
      <p style="margin:16px 0 0;font-size:14px;color:#5f6368">Open the app → Status tab to view live tracking.</p>
    `;
}

function buildRegistrationReceivedBody(reg) {
    return `
      <p style="margin:0 0 12px;font-size:15px;line-height:22px;color:#5f6368">
        We received your company registration application for <strong>${escapeHtml(filingTitle(reg))}</strong>.
        Complete payment in the app to move to the next stage.
      </p>
      ${detailTable([
          ['Case ID', reg.caseId],
          ['Company name', reg.proposedName1],
          ['Business type', reg.businessType],
      ])}
    `;
}

const REGISTRATION_RECEIVED_KEY = 'registration_received';

async function loadRegForEmail(registrationOrId) {
    const id =
        typeof registrationOrId === 'object' && registrationOrId !== null
            ? registrationOrId._id
            : registrationOrId;
    if (!id) return null;
    return CompanyRegistration.findById(id).select(EMAIL_SELECT).lean();
}

/**
 * Send payment, tracker-step, and pending reminder emails.
 */
async function processRegistrationEmails(registrationOrId) {
    if (!isSmtpConfigured()) {
        console.warn('[registration-email] SMTP not configured — skip');
        return;
    }

    const reg = await loadRegForEmail(registrationOrId);
    if (!reg) {
        console.warn('[registration-email] Registration not found');
        return;
    }

    const recipient = await resolveRecipient(reg);
    if (!recipient) {
        console.warn(
            '[registration-email] No sign-in Gmail — user must log in with Gmail and filing must be linked (userId)',
            { regId: reg._id, userId: reg.userId },
        );
        return;
    }

    const { to } = recipient;
    const regId = reg._id;
    const eff = effectiveRegistrationStatus(reg);
    const payment = reg.paymentStatus || 'unpaid';
    const stepsDone = resolveStepsDone(eff);
    const ended = eff === 'approved' || eff === 'completed' || eff === 'rejected';

    const sendOne = async (key, subject, title, bodyHtml, text) => {
        await sendMail({ to, subject, text, html: emailShell(title, bodyHtml) });
        const at = await markEmailSent(regId, key);
        if (!reg.emailsSent) reg.emailsSent = {};
        reg.emailsSent[key] = at;
        console.log(`[registration-email] ${key} → ${to}`);
    };

    // Application received (once, after form submit — before payment)
    if (
        !wasEmailSent(reg, REGISTRATION_RECEIVED_KEY) &&
        reg.caseId &&
        payment !== 'paid' &&
        payment !== 'partial'
    ) {
        await sendOne(
            REGISTRATION_RECEIVED_KEY,
            `Application received — ${filingTitle(reg)}`,
            'Application received',
            buildRegistrationReceivedBody(reg),
            `We received your company registration for ${filingTitle(reg)}.`,
        );
    }

    // Payment received (full details)
    if ((payment === 'paid' || payment === 'partial') && !wasEmailSent(reg, PAYMENT_RECEIVED_KEY)) {
        await sendOne(
            PAYMENT_RECEIVED_KEY,
            `Payment received — ${filingTitle(reg)}`,
            'Payment received',
            buildPaymentDetailsBody(reg, recipient),
            `Payment received for ${filingTitle(reg)}. Amount: ${formatINR(reg.paymentAmount)}.`,
        );
    }

    // Tracker step updates
    for (const step of TRACKER_STEPS) {
        if (!stepsDone[step.key] || wasEmailSent(reg, step.key)) continue;
        await sendOne(
            step.key,
            `${step.label} — ${filingTitle(reg)}`,
            step.label,
            buildStepBody(reg, step),
            `${step.label}: ${step.sublabel} (${filingTitle(reg)})`,
        );
    }

    if (ended) return;

    if (payment !== 'paid' && payment !== 'partial' && canSendPendingAgain(reg, PENDING_PAYMENT_KEY)) {
        await sendOne(
            PENDING_PAYMENT_KEY,
            `Payment pending — ${filingTitle(reg)}`,
            'Payment pending',
            buildPendingPaymentBody(reg),
            `Complete payment for ${filingTitle(reg)} in the Finovert app.`,
        );
    }

    if (
        (payment === 'paid' || payment === 'partial') &&
        canSendPendingAgain(reg, PENDING_PROCESS_KEY)
    ) {
        const nextLabel = getNextPendingStepLabel(stepsDone);
        await sendOne(
            PENDING_PROCESS_KEY,
            `Update: ${nextLabel} — ${filingTitle(reg)}`,
            'Registration in progress',
            buildPendingProcessBody(reg, nextLabel),
            `Your filing ${filingTitle(reg)} is in progress. Next: ${nextLabel}.`,
        );
    }
}

function queueRegistrationEmails(registrationOrId) {
    void processRegistrationEmails(registrationOrId).catch((err) => {
        console.error('[registration-email]', err.message || err);
        if (err.stack) console.error(err.stack);
    });
}

module.exports = {
    processRegistrationEmails,
    queueRegistrationEmails,
    syncRegistrationEmailsForLoginUser,
    queueSyncForLoginUser,
};
