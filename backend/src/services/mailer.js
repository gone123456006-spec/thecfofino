const nodemailer = require('nodemailer');
const config = require('../config');

const SEND_TIMEOUT_MS = 25_000;

let transporter = null;

function isRenderEnvironment() {
    return Boolean(
        process.env.RENDER ||
        process.env.RENDER_EXTERNAL_URL ||
        process.env.RENDER_SERVICE_ID,
    );
}

function isSmtpConfigured() {
    const smtp = config.smtp || {};
    return Boolean(smtp.user && smtp.pass);
}

function createSmtpTransport() {
    const smtp = config.smtp;
    const smtpPort = Number(smtp.port);
    const smtpSecure = smtpPort === 465 ? true : Boolean(smtp.secure);
    return nodemailer.createTransport({
        host: smtp.host,
        port: smtpPort,
        secure: smtpSecure,
        requireTLS: smtpPort === 587 && !smtpSecure,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
        auth: {
            user: smtp.user,
            pass: String(smtp.pass || '').replace(/\s+/g, ''),
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
        return 'SMTP auth failed: Gmail rejected the credentials. Use a valid 16-character Google App Password in SMTP_PASS.';
    }
    if (/timed out/i.test(msg) || code === 'ETIMEDOUT' || code === 'ESOCKET') {
        if (isRenderEnvironment()) {
            return (
                'SMTP connection timed out on Render. Reason: Render can block/throttle outbound SMTP ports ' +
                '(25/465/587), especially on restricted plans, to prevent spam abuse. ' +
                'Check your Render plan/network policy, keep SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_SECURE=true, then redeploy.'
            );
        }
        return 'SMTP connection timed out. Check SMTP_HOST/PORT/SECURE and your network/firewall, then try again.';
    }
    if (code === 'ECONNREFUSED' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
        return 'SMTP network error from server side. Check SMTP_HOST/PORT and whether outbound SMTP is allowed by your hosting provider.';
    }
    if (code === 'ECONNECTION' || /invalid/i.test(msg) || /certificate/i.test(msg)) {
        return 'SMTP configuration error. Verify SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, and SMTP_PASS.';
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
