const express = require('express');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/app/version
 * Public — mobile app compares installed version to latest on Play Store.
 * Update APP_LATEST_VERSION (and version code) on the server when you publish.
 */
router.get('/version', (_req, res) => {
    const { latest, min, androidLatestVersionCode } = config.appVersion;
    res.json({
        ok: true,
        latestVersion: latest,
        minVersion: min,
        androidLatestVersionCode,
        playStoreUrl: `https://play.google.com/store/apps/details?id=com.brandovert.finovert`,
    });
});

module.exports = router;
