const crypto = require('crypto');
const config = require('../config');
const { sendMail, isEmailConfigured } = require('./mailer');

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFICATION_SESSION_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { hash: string, expiresAt: number, attempts: number, sentAt: number }>} */
const emailOtpStore = new Map();

/** @type {Map<string, { email: string, expiresAt: number }>} */
const verificationSessionStore = new Map();

/** Cryptographically random 6-digit code (000000–999999). New code on every send. */
function generateOtpCode() {
    const num = crypto.randomInt(0, 1_000_000);
    return String(num).padStart(OTP_LENGTH, '0');
}

function hashOtp(code) {
    return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}

function normalizeOtpInput(code) {
    const digits = String(code || '').replace(/\D/g, '');
    if (digits.length !== OTP_LENGTH) return null;
    return digits;
}

function storeEmailOtp(email, code) {
    emailOtpStore.set(email, {
        hash: hashOtp(code),
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
        sentAt: Date.now(),
    });
}

function canResend(email) {
    const entry = emailOtpStore.get(email);
    if (!entry) return true;
    return Date.now() - entry.sentAt >= RESEND_COOLDOWN_MS;
}

/**
 * Verify OTP for this Gmail only. Consumes OTP on success (one-time use).
 */
function verifyOtpForEmail(email, code) {
    const normalized = normalizeOtpInput(code);
    if (!normalized) {
        return { ok: false, error: 'Enter the 6-digit code from your email.' };
    }

    const entry = emailOtpStore.get(email);
    if (!entry) {
        return { ok: false, error: 'No OTP found for this Gmail. Tap Send OTP again.' };
    }
    if (Date.now() > entry.expiresAt) {
        emailOtpStore.delete(email);
        return { ok: false, error: 'OTP expired. Request a new code.' };
    }
    if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
        emailOtpStore.delete(email);
        return { ok: false, error: 'Too many attempts. Request a new code.' };
    }

    entry.attempts += 1;

    if (entry.hash !== hashOtp(normalized)) {
        return { ok: false, error: 'Invalid OTP for this Gmail. Check the code and try again.' };
    }

    emailOtpStore.delete(email);
    return { ok: true };
}

function createVerificationSession(email) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    verificationSessionStore.set(verificationToken, {
        email,
        expiresAt: Date.now() + VERIFICATION_SESSION_TTL_MS,
    });
    return verificationToken;
}

function consumeVerificationSession(verificationToken, email) {
    if (!verificationToken || !email) {
        return { ok: false, error: 'Verification session is invalid.' };
    }
    const entry = verificationSessionStore.get(verificationToken);
    if (!entry) {
        return { ok: false, error: 'Verification expired. Verify your OTP again.' };
    }
    if (entry.email !== email) {
        return { ok: false, error: 'This verification does not match the Gmail address.' };
    }
    if (Date.now() > entry.expiresAt) {
        verificationSessionStore.delete(verificationToken);
        return { ok: false, error: 'Verification expired. Verify your OTP again.' };
    }
    verificationSessionStore.delete(verificationToken);
    return { ok: true };
}

async function sendOtpEmail(toEmail, code) {
    await sendMail({
        to: toEmail,
        subject: `${code} is your Finovert sign-in code`,
        text:
            `Your Finovert verification code is: ${code}\n\n` +
            `This 6-digit code is valid for 10 minutes and works only for ${toEmail}.\n` +
            `If you did not request this, ignore this email.`,
        html: `
          <p>Your Finovert verification code for <strong>${toEmail}</strong>:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:20px 0;color:#0a4d6e">${code}</p>
          <p>Valid for <strong>10 minutes</strong>. This code can only be used once with this Gmail address.</p>
          <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
        `,
    });
}

module.exports = {
    OTP_LENGTH,
    RESEND_COOLDOWN_MS,
    isEmailConfigured,
    generateOtpCode,
    storeEmailOtp,
    canResend,
    verifyOtpForEmail,
    normalizeOtpInput,
    createVerificationSession,
    consumeVerificationSession,
    sendOtpEmail,
};
