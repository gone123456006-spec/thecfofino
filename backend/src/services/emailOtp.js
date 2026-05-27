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

/** Cryptographically random 6-digit code (100000–999999). New code on every send. */
function generateOtpCode() {
    const num = crypto.randomInt(100_000, 1_000_000);
    return String(num);
}

function pruneExpiredOtps() {
    const now = Date.now();
    for (const [email, entry] of emailOtpStore) {
        if (now > entry.expiresAt) {
            emailOtpStore.delete(email);
        }
    }
}

/**
 * Issue a fresh OTP for one Gmail. Overwrites any previous code for that address.
 * Other users keep their own entries in the store.
 */
function createOtpForEmail(email) {
    pruneExpiredOtps();
    const code = generateOtpCode();
    storeEmailOtp(email, code);
    return code;
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
        issuedAt: Date.now(),
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
    const sentAt = new Date().toISOString();
    await sendMail({
        to: toEmail,
        subject: `${code} is your Finovert sign-in code`,
        text:
            `Your Finovert verification code is: ${code}\n\n` +
            `This 6-digit code is valid for 10 minutes and works only for ${toEmail}.\n` +
            `Each sign-in request sends a new code. Do not share this code.\n` +
            `Requested at: ${sentAt}\n` +
            `If you did not request this, ignore this email.`,
        html: `
          <p>Your Finovert verification code for <strong>${toEmail}</strong>:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:20px 0;color:#0a4d6e">${code}</p>
          <p>Valid for <strong>10 minutes</strong>. This code works only once for this Gmail. A new code is sent every time you tap Send OTP.</p>
          <p style="color:#666;font-size:13px">Requested at ${sentAt}. If you did not request this, ignore this email.</p>
        `,
    });
}

module.exports = {
    OTP_LENGTH,
    RESEND_COOLDOWN_MS,
    isEmailConfigured,
    generateOtpCode,
    createOtpForEmail,
    storeEmailOtp,
    canResend,
    verifyOtpForEmail,
    normalizeOtpInput,
    createVerificationSession,
    consumeVerificationSession,
    sendOtpEmail,
};
