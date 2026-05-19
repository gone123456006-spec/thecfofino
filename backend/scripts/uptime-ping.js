#!/usr/bin/env node
/**
 * Single-shot uptime ping for Render cron jobs (runs every minute via render.yaml).
 * Exits 0 on success, 1 on failure — required for cron billing and monitoring.
 */
const { getPingConfig, ping, isSuccessStatus } = require('../src/utils/uptimePing');

async function main() {
    const { url, timeoutMs } = getPingConfig();
    const startedAt = new Date().toISOString();

    try {
        const { statusCode, durationMs } = await ping(url, timeoutMs);
        if (isSuccessStatus(statusCode)) {
            console.log(`[uptime-ping] OK ${startedAt} url=${url} status=${statusCode} duration=${durationMs}ms`);
            process.exit(0);
        }
        console.error(`[uptime-ping] FAIL ${startedAt} url=${url} status=${statusCode} duration=${durationMs}ms`);
        process.exit(1);
    } catch (error) {
        console.error(`[uptime-ping] ERROR ${startedAt} url=${url} message="${error.message}"`);
        process.exit(1);
    }
}

main();
