const nodemailer = require('nodemailer');
const config = require('../config');

const SEND_TIMEOUT_MS = 22_000;

let transporter = null;

function isSmtpConfigured() {
    const smtp = config.smtp || {};
    return Boolean(smtp.user && smtp.pass);
}

function isResendConfigured() {
    return Boolean(config.resend && config.resend.apiKey);
}

function createSmtpTransport() {
    const smtp = config.smtp;
    return nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        requireTLS: smtp.port === 587 && !smtp.secure,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });
}

function getTransporter() {
    if (!transporter) {
        transporter = createSmtpTransport();
    }
    return transporter;
}

function resetTransporter() {
    transporter = null;
}

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
        }),
    ]);
}

function smtpErrorMessage(err) {
    const code = err && err.code;
    const msg = (err && err.message) || '';
    if (code === 'EAUTH' || /invalid login|authentication failed/i.test(msg)) {
        return 'Gmail rejected the app password. Use a 16-character Google App Password in SMTP_PASS.';
    }
    if (/timed out/i.test(msg) || code === 'ETIMEDOUT' || code === 'ESOCKET') {
        return 'Email server timed out. On Render, Gmail SMTP often fails — set RESEND_API_KEY or use Brevo SMTP.';
    }
    return msg || 'Failed to send email.';
}

async function sendViaResend(opts) {
    const apiKey = config.resend.apiKey;
    const from = config.resend.from || config.smtp.from || 'Finovert <onboarding@resend.dev>';
    const res = await withTimeout(
        fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [opts.to],
                subject: opts.subject,
                html: opts.html || opts.text || '',
                text: opts.text || '',
            }),
        }),
        SEND_TIMEOUT_MS,
        'Resend',
    );
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Resend error ${res.status}: ${body.slice(0, 200)}`);
    }
}

async function sendViaSmtp(opts) {
    const smtp = config.smtp;
    const from = smtp.from || smtp.user;
    await withTimeout(
        getTransporter().sendMail({
            from: `"Finovert" <${from}>`,
            to: opts.to,
            subject: opts.subject,
            text: opts.text || '',
            html: opts.html || opts.text || '',
        }),
        SEND_TIMEOUT_MS,
        'SMTP',
    );
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
async function sendMail(opts) {
    try {
        if (isResendConfigured()) {
            await sendViaResend(opts);
            return;
        }
        if (!isSmtpConfigured()) {
            throw new Error('SMTP is not configured (set SMTP_USER and SMTP_PASS, or RESEND_API_KEY).');
        }
        await sendViaSmtp(opts);
    } catch (err) {
        resetTransporter();
        const wrapped = new Error(smtpErrorMessage(err));
        wrapped.cause = err;
        throw wrapped;
    }
}

async function verifySmtpConnection() {
    if (isResendConfigured()) {
        return { ok: true, mode: 'resend' };
    }
    if (!isSmtpConfigured()) {
        return { ok: false, error: 'SMTP_USER and SMTP_PASS not set' };
    }
    const transport = createSmtpTransport();
    try {
        await withTimeout(transport.verify(), 15_000, 'SMTP verify');
        transporter = transport;
        return { ok: true, mode: 'smtp' };
    } catch (err) {
        resetTransporter();
        return { ok: false, error: err.message || String(err) };
    }
}

module.exports = {
    isSmtpConfigured,
    isResendConfigured,
    getTransporter,
    resetTransporter,
    verifySmtpConnection,
    sendMail,
};
