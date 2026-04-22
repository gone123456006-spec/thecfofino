const https = require('https');

const DEFAULT_APP_URL = 'https://thecfofino-3.onrender.com/dashboard/';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

function getConfig() {
    const url = process.env.KEEP_ALIVE_URL || DEFAULT_APP_URL;
    const intervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
    return { url, intervalMs };
}

function ping(url) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const req = https.get(url, (res) => {
            res.resume();
            const durationMs = Date.now() - startedAt;
            resolve({ statusCode: res.statusCode || 0, durationMs });
        });

        req.setTimeout(15000, () => {
            req.destroy(new Error('Request timed out after 15000ms'));
        });

        req.on('error', (error) => {
            reject(error);
        });
    });
}

function startKeepAlive() {
    const { url, intervalMs } = getConfig();
    console.log(`[keep-alive] Started. Target: ${url}`);
    console.log(`[keep-alive] Ping interval: ${intervalMs}ms`);

    const run = async () => {
        try {
            const { statusCode, durationMs } = await ping(url);
            if (statusCode >= 200 && statusCode < 400) {
                console.log(`[keep-alive] SUCCESS ${new Date().toISOString()} status=${statusCode} duration=${durationMs}ms`);
            } else {
                console.error(`[keep-alive] FAIL ${new Date().toISOString()} status=${statusCode} duration=${durationMs}ms`);
            }
        } catch (error) {
            console.error(`[keep-alive] ERROR ${new Date().toISOString()} message="${error.message}"`);
        } finally {
            setTimeout(run, intervalMs);
        }
    };

    run();
}

process.on('uncaughtException', (error) => {
    console.error(`[keep-alive] UNCAUGHT_EXCEPTION ${new Date().toISOString()} message="${error.message}"`);
});

process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    console.error(`[keep-alive] UNHANDLED_REJECTION ${new Date().toISOString()} message="${message}"`);
});

startKeepAlive();
