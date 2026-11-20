// ============================================
// NexusFlow - InfluxDB Connection Config
// ============================================

const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const INFLUXDB_URL    = process.env.INFLUXDB_URL    || 'http://localhost:8086';
const INFLUXDB_TOKEN  = process.env.INFLUXDB_TOKEN  || 'demo-token';
const INFLUXDB_ORG    = process.env.INFLUXDB_ORG    || 'nexusflow-org';
const INFLUXDB_BUCKET = process.env.INFLUXDB_BUCKET || 'telemetry';

let influxClient = null;
let writeApi     = null;
let influxReady  = false;

const initInfluxDB = () => {
  try {
    influxClient = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });
    writeApi = influxClient.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, 'ms');
    writeApi.useDefaultTags({ module: 'nexusflow-telemetry', version: '1.0.0' });
    influxReady = true;
    console.log('[InfluxDB] ✅ Client initialized — URL:', INFLUXDB_URL);
  } catch (err) {
    console.warn('[InfluxDB] ⚠️  Init failed (running in demo mode):', err.message);
  }
};

/**
 * Write a telemetry point to InfluxDB
 * @param {Object} data - { deviceId, location, readings: { temperature, humidity, pressure, co2 } }
 */
const writeTelemetryPoint = async (data) => {
  if (!influxReady || !writeApi) return false;

  try {
    const point = new Point('sensor_reading')
      .tag('deviceId',   data.deviceId)
      .tag('deviceType', data.deviceType || 'environmental')
      .tag('location',   data.location   || 'unknown')
      .floatField('temperature', data.readings.temperature)
      .floatField('humidity',    data.readings.humidity)
      .floatField('pressure',    data.readings.pressure)
      .floatField('co2',         data.readings.co2)
      .timestamp(data.timestamp ? new Date(data.timestamp) : new Date());

    writeApi.writePoint(point);
    await writeApi.flush();
    return true;
  } catch (err) {
    console.error('[InfluxDB] Write error:', err.message);
    return false;
  }
};

const getInfluxStatus = () => ({
  status:  influxReady ? 'connected' : 'disconnected',
  url:     INFLUXDB_URL,
  org:     INFLUXDB_ORG,
  bucket:  INFLUXDB_BUCKET,
});

module.exports = { initInfluxDB, writeTelemetryPoint, getInfluxStatus, Point };
