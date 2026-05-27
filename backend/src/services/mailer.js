const nodemailer = require('nodemailer');
const config = require('../config');

const SEND_TIMEOUT_MS = 25_000;

let transporter = null;

function isSmtpConfigured() {
    const smtp = config.smtp || {};
    return Boolean(smtp.user && smtp.pass);
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
        return 'Gmail SMTP timed out. Check SMTP_HOST/PORT on Render (try port 465 with SMTP_SECURE=true) and redeploy.';
    }
    return msg || 'Failed to send email via Gmail SMTP.';
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
async function sendMail(opts) {
    if (!isSmtpConfigured()) {
        throw new Error('Gmail SMTP is not configured (set SMTP_USER and SMTP_PASS in .env).');
    }
    const smtp = config.smtp;
    const from = smtp.from || smtp.user;
    try {
        await withTimeout(
            getTransporter().sendMail({
                from: `"Finovert" <${from}>`,
                to: opts.to,
                subject: opts.subject,
                text: opts.text || '',
                html: opts.html || opts.text || '',
            }),
            SEND_TIMEOUT_MS,
            'Gmail SMTP',
        );
    } catch (err) {
        resetTransporter();
        const wrapped = new Error(smtpErrorMessage(err));
        wrapped.cause = err;
        throw wrapped;
    }
}

async function verifySmtpConnection() {
    if (!isSmtpConfigured()) {
        return { ok: false, error: 'SMTP_USER and SMTP_PASS not set' };
    }
    const transport = createSmtpTransport();
    try {
        await withTimeout(transport.verify(), 15_000, 'Gmail SMTP verify');
        transporter = transport;
        return { ok: true, mode: 'gmail-smtp' };
    } catch (err) {
        resetTransporter();
        return { ok: false, error: err.message || String(err) };
    }
}

module.exports = {
    isSmtpConfigured,
    getTransporter,
    resetTransporter,
    verifySmtpConnection,
    sendMail,
};
