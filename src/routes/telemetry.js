// ============================================
// NexusFlow - Telemetry API Routes
// ============================================

const express  = require('express');
const router   = express.Router();
const { ingestTelemetry, ingestBatch, getLatestBuffered } = require('../ingestion/telemetryIngestion');
const { mongoose } = require('../config/mongodb');
const SensorDevice = require('../models/SensorDevice');

// POST /api/telemetry/ingest — single reading
router.post('/ingest', async (req, res) => {
  try {
    const result = await ingestTelemetry(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, errors: result.errors });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/telemetry/batch — multiple readings
router.post('/batch', async (req, res) => {
  try {
    const { payloads } = req.body;
    const result = await ingestBatch(payloads || req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/telemetry/latest — latest reading per device
router.get('/latest', async (req, res) => {
  try {
    let devices = [];
    if (mongoose.connection.readyState === 1) {
      devices = await SensorDevice.find({ status: 'active' })
        .sort({ lastSeenAt: -1 })
        .limit(50)
        .lean();
    } else {
      // Fall back to in-memory buffer
      const buffered = getLatestBuffered(20);
      const seen = new Map();
      for (const item of buffered) {
        if (!seen.has(item.deviceId)) seen.set(item.deviceId, item);
      }
      devices = Array.from(seen.values()).map(d => ({
        deviceId:      d.deviceId,
        location:      d.location,
        latestReading: { readings: d.readings, timestamp: d.timestamp },
        status:        'active (demo)',
      }));
    }
    res.json({ success: true, count: devices.length, devices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/telemetry/history/:deviceId
router.get('/history/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = mongoose.connection.readyState === 1
      ? await SensorDevice.findOne({ deviceId }).lean()
      : null;

    if (!device) {
      // return buffered data for this device
      const buffered = getLatestBuffered(100).filter(d => d.deviceId === deviceId);
      return res.json({ success: true, deviceId, source: 'buffer', count: buffered.length, data: buffered });
    }

    res.json({ success: true, deviceId, source: 'mongodb', device });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
