// ============================================
// NexusFlow - Core Telemetry Ingestion Pipeline
// ============================================

const { writeTelemetryPoint } = require('../config/influxdb');
const { mongoose }             = require('../config/mongodb');
const SensorDevice             = require('../models/SensorDevice');

// In-memory buffer for demo mode (when DBs are offline)
const inMemoryBuffer = [];
let totalIngested    = 0;
let totalFailed      = 0;
let startTime        = Date.now();

/**
 * Validate incoming telemetry payload
 */
const validatePayload = (payload) => {
  const errors = [];

  if (!payload.deviceId)             errors.push('deviceId is required');
  if (!payload.readings)             errors.push('readings object is required');
  if (payload.readings) {
    const r = payload.readings;
    if (r.temperature == null)       errors.push('readings.temperature is required');
    if (r.humidity    == null)       errors.push('readings.humidity is required');
    if (r.pressure    == null)       errors.push('readings.pressure is required');
    if (r.co2         == null)       errors.push('readings.co2 is required');

    // Sanity range checks
    if (r.temperature < -50 || r.temperature > 100)  errors.push('temperature out of range (-50 to 100°C)');
    if (r.humidity    < 0   || r.humidity    > 100)   errors.push('humidity out of range (0–100%)');
    if (r.pressure    < 800 || r.pressure    > 1200)  errors.push('pressure out of range (800–1200 hPa)');
    if (r.co2         < 300 || r.co2         > 5000)  errors.push('CO₂ out of range (300–5000 ppm)');
  }

  return errors;
};

/**
 * Core ingestion function — dual-write to InfluxDB + MongoDB
 * Falls back to in-memory buffer if DBs are unavailable
 */
const ingestTelemetry = async (payload) => {
  const validationErrors = validatePayload(payload);
  if (validationErrors.length > 0) {
    totalFailed++;
    return { success: false, errors: validationErrors };
  }

  const enriched = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    moduleVersion: '1.0.0',
  };

  let influxOk = false;
  let mongoOk  = false;

  // --- Write to InfluxDB ---
  try {
    influxOk = await writeTelemetryPoint(enriched);
  } catch (err) {
    console.error('[Ingestion] InfluxDB write failed:', err.message);
  }

  // --- Write to MongoDB (upsert device + latest reading) ---
  try {
    if (mongoose.connection.readyState === 1) {
      await SensorDevice.findOneAndUpdate(
        { deviceId: enriched.deviceId },
        {
          $set: {
            deviceType:          enriched.deviceType || 'environmental',
            location:            enriched.location   || 'unknown',
            status:              'active',
            'latestReading.readings':  enriched.readings,
            'latestReading.timestamp': new Date(enriched.timestamp),
            lastSeenAt:          new Date(),
          },
          $inc:  { totalReadings: 1 },
          $setOnInsert: { firstSeenAt: new Date() },
        },
        { upsert: true, new: true }
      );
      mongoOk = true;
    }
  } catch (err) {
    console.error('[Ingestion] MongoDB write failed:', err.message);
  }

  // --- Fallback: in-memory buffer ---
  if (!influxOk && !mongoOk) {
    inMemoryBuffer.push(enriched);
    if (inMemoryBuffer.length > 1000) inMemoryBuffer.shift(); // cap at 1000
  }

  totalIngested++;
  return {
    success: true,
    deviceId:   enriched.deviceId,
    timestamp:  enriched.timestamp,
    storage: {
      influxdb: influxOk ? 'written' : 'skipped (demo mode)',
      mongodb:  mongoOk  ? 'written' : 'skipped (demo mode)',
      buffer:   (!influxOk && !mongoOk) ? 'buffered' : 'not needed',
    },
  };
};

/**
 * Batch ingestion — processes array of payloads
 */
const ingestBatch = async (payloads) => {
  if (!Array.isArray(payloads)) {
    return { success: false, error: 'Payload must be an array' };
  }

  const results = await Promise.allSettled(payloads.map(ingestTelemetry));
  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed    = payloads.length - succeeded;

  return {
    success: true,
    total:     payloads.length,
    succeeded,
    failed,
    results:   results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }),
  };
};

/**
 * Get ingestion pipeline metrics
 */
const getIngestionStats = () => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const rate = uptimeSeconds > 0 ? (totalIngested / uptimeSeconds).toFixed(2) : '0';

  return {
    totalIngested,
    totalFailed,
    bufferSize:        inMemoryBuffer.length,
    uptimeSeconds,
    ingestionRatePerSec: parseFloat(rate),
    startedAt:         new Date(startTime).toISOString(),
    latestBuffered:    inMemoryBuffer.slice(-5),
  };
};

/**
 * Get latest readings from in-memory buffer (demo mode)
 */
const getLatestBuffered = (limit = 20) =>
  [...inMemoryBuffer].reverse().slice(0, limit);

module.exports = { ingestTelemetry, ingestBatch, getIngestionStats, getLatestBuffered };
