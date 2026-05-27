const config = require('../config');

const SEND_TIMEOUT_MS = 25_000;

let apiInstance = null;

function isConfigured() {
    return Boolean(config.brevo && config.brevo.apiKey);
}

function getTransactionalApi() {
    if (!isConfigured()) {
        throw new Error('BREVO_API_KEY is not set.');
    }
    if (!apiInstance) {
        const SibApiV3Sdk = require('sib-api-v3-sdk');
        const client = SibApiV3Sdk.ApiClient.instance;
        const apiKey = client.authentications['api-key'];
        apiKey.apiKey = config.brevo.apiKey;
        apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    }
    return apiInstance;
}

function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
        }),
    ]);
}

function brevoErrorMessage(err) {
    const body = err?.response?.body || err?.body;
    if (body && typeof body === 'object') {
        const msg = body.message || body.error;
        if (msg) return String(msg);
    }
    const msg = (err && err.message) || '';
    if (/unauthorized|invalid api key/i.test(msg)) {
        return 'Brevo API key is invalid. Check BREVO_API_KEY on the server.';
    }
    if (/sender/i.test(msg)) {
        return 'Brevo sender not verified. Use a verified address in BREVO_SENDER_EMAIL / SMTP_FROM.';
    }
    return msg || 'Failed to send email via Brevo API.';
}

/**
 * @param {{ to: string, subject: string, text?: string, html?: string }} opts
 */
async function sendTransactionalEmail(opts) {
    const { senderEmail, senderName } = config.brevo;
    if (!senderEmail) {
        throw new Error('Brevo sender email is not set (BREVO_SENDER_EMAIL or SMTP_FROM).');
    }

    const SibApiV3Sdk = require('sib-api-v3-sdk');
    const email = new SibApiV3Sdk.SendSmtpEmail();
    email.sender = { email: senderEmail, name: senderName || 'Finovert' };
    email.to = [{ email: opts.to }];
    email.subject = opts.subject;
    email.htmlContent = opts.html || opts.text || '';
    if (opts.text) {
        email.textContent = opts.text;
    }

    try {
        await withTimeout(
            getTransactionalApi().sendTransacEmail(email),
            SEND_TIMEOUT_MS,
            'Brevo',
        );
    } catch (err) {
        const wrapped = new Error(brevoErrorMessage(err));
        wrapped.cause = err;
        throw wrapped;
    }
}

module.exports = {
    isConfigured,
    sendTransactionalEmail,
};
