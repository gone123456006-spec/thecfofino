const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function isSmtpConfigured() {
    const smtp = config.smtp || {};
    return Boolean(smtp.user && smtp.pass);
}

function getTransporter() {
    if (transporter) return transporter;
    const smtp = config.smtp;
    transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });
    return transporter;
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
    await getTransporter().sendMail({
        from: `"Finovert" <${from}>`,
        to: opts.to,
        subject: opts.subject,
        text: opts.text || '',
        html: opts.html || opts.text || '',
    });
}

module.exports = {
    isSmtpConfigured,
    getTransporter,
    sendMail,
};
