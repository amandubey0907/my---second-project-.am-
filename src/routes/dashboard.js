// ============================================
// NexusFlow - Dashboard Stats API Routes
// ============================================

const express  = require('express');
const router   = express.Router();
const { getMongoStats } = require('../config/mongodb');
const { getInfluxStatus } = require('../config/influxdb');
const { getIngestionStats } = require('../ingestion/telemetryIngestion');

// GET /api/stats — combined dashboard stats
router.get('/', async (req, res) => {
  try {
    const [mongoStats, influxStatus, ingestionStats] = await Promise.all([
      getMongoStats(),
      Promise.resolve(getInfluxStatus()),
      Promise.resolve(getIngestionStats()),
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      module: 'NexusFlow — Database & Telemetry Ingestion',
      version: '1.0.0',
      databases: {
        mongodb: mongoStats,
        influxdb: influxStatus,
      },
      ingestion: ingestionStats,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
