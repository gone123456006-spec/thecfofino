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
    const port = Number(smtp.port);
    const secure = port === 465 ? true : smtp.secure === true;

    return nodemailer.createTransport({
        host: smtp.host,
        port,
        secure,
        requireTLS: port === 587 && !secure,
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
    const host = config.smtp?.host || '';

    if (code === 'EAUTH' || /invalid login|authentication failed/i.test(msg)) {
        return (
            'SMTP login failed. Check SMTP_USER and SMTP_PASS in server settings ' +
            '(Brevo: use smtp-brevo login + SMTP key; Gmail: use App Password).'
        );
    }
    if (/timed out/i.test(msg) || code === 'ETIMEDOUT' || code === 'ESOCKET') {
        if (isRenderEnvironment()) {
            return (
                'SMTP timed out on Render. Reason: some Render plans block outbound SMTP ports ' +
                '(25/465/587) to stop spam. Fix: use a paid Render instance, or use Brevo on port 587 ' +
                '(smtp-relay.brevo.com) with SMTP_SECURE=false, then redeploy.'
            );
        }
        return 'SMTP timed out. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE, and try again.';
    }
    if (code === 'ECONNREFUSED' || code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
        return `Cannot reach mail server (${host}). Check SMTP_HOST and SMTP_PORT.`;
    }
    if (/certificate/i.test(msg)) {
        return 'SMTP TLS error. For port 587 use SMTP_SECURE=false; for port 465 use SMTP_SECURE=true.';
    }
    return msg || 'Failed to send email via SMTP.';
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
async function sendMail(opts) {
    if (!isSmtpConfigured()) {
        throw new Error('SMTP is not configured (set SMTP_USER and SMTP_PASS in .env).');
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
            'SMTP',
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
        await withTimeout(transport.verify(), 15_000, 'SMTP verify');
        transporter = transport;
        return { ok: true, mode: 'smtp', host: config.smtp.host };
    } catch (err) {
        resetTransporter();
        return { ok: false, error: smtpErrorMessage(err) };
    }
}

module.exports = {
    isSmtpConfigured,
    getTransporter,
    resetTransporter,
    verifySmtpConnection,
    sendMail,
};
