/**
 * Long-running keep-alive client (local dev or a separate worker process).
 * On Render, prefer the finovert-uptime-ping cron job in render.yaml (external pings).
 */
const { getPingConfig, ping, isSuccessStatus } = require('./src/utils/uptimePing');

function startKeepAlive() {
    const { url, intervalMs, timeoutMs } = getPingConfig();
    console.log(`[keep-alive] Started. Target: ${url}`);
    console.log(`[keep-alive] Ping interval: ${intervalMs}ms (${Math.round(intervalMs / 1000)}s)`);

    const run = async () => {
        try {
            const { statusCode, durationMs } = await ping(url, timeoutMs);
            const ts = new Date().toISOString();
            if (isSuccessStatus(statusCode)) {
                console.log(`[keep-alive] SUCCESS ${ts} status=${statusCode} duration=${durationMs}ms`);
            } else {
                console.error(`[keep-alive] FAIL ${ts} status=${statusCode} duration=${durationMs}ms`);
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
