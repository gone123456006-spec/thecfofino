const http = require('http');
const https = require('https');

const DEFAULT_PING_PATH = '/api/health';
const DEFAULT_INTERVAL_MS = 60 * 1000;
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Resolve the URL to ping. Priority:
 * 1. PING_URL or KEEP_ALIVE_URL (full URL)
 * 2. RENDER_EXTERNAL_URL + path
 * 3. PING_HOST + PING_PORT (Render private network)
 * 4. localhost + PORT (local dev)
 */
function resolvePingUrl() {
    const explicit = process.env.PING_URL || process.env.KEEP_ALIVE_URL;
    if (explicit) return explicit.trim();

    const path = (process.env.PING_PATH || DEFAULT_PING_PATH).replace(/^\/?/, '/');

    const external = process.env.RENDER_EXTERNAL_URL;
    if (external) return `${external.replace(/\/$/, '')}${path}`;

    const host = process.env.PING_HOST;
    const port = process.env.PING_PORT;
    if (host && port) return `http://${host}:${port}${path}`;

    const localPort = process.env.PORT || '4000';
    return `http://127.0.0.1:${localPort}${path}`;
}

function getPingConfig() {
    const url = resolvePingUrl();
    const intervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS || process.env.PING_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
    const timeoutMs = Number(process.env.PING_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
    return { url, intervalMs, timeoutMs };
}

function ping(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const parsed = new URL(url);
        const transport = parsed.protocol === 'https:' ? https : http;

        const req = transport.request(
            url,
            { method: 'GET', timeout: timeoutMs, headers: { 'User-Agent': 'Finovert-Uptime/1.0' } },
            (res) => {
                res.resume();
                resolve({
                    statusCode: res.statusCode || 0,
                    durationMs: Date.now() - startedAt,
                });
            }
        );

        req.on('timeout', () => {
            req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
        });

        req.on('error', reject);
        req.end();
    });
}

function isSuccessStatus(statusCode) {
    return statusCode >= 200 && statusCode < 400;
}

module.exports = {
    DEFAULT_INTERVAL_MS,
    DEFAULT_PING_PATH,
    resolvePingUrl,
    getPingConfig,
    ping,
    isSuccessStatus,
};
