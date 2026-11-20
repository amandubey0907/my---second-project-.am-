// ============================================
// NexusFlow - Sensor Device Model (MongoDB)
// ============================================

const { mongoose } = require('../config/mongodb');

const SensorReadingSchema = new mongoose.Schema({
  temperature: { type: Number, required: true },
  humidity:    { type: Number, required: true },
  pressure:    { type: Number, required: true },
  co2:         { type: Number, required: true },
});

const SensorDeviceSchema = new mongoose.Schema(
  {
    deviceId:   { type: String, required: true, unique: true, index: true },
    deviceType: { type: String, default: 'environmental' },
    location:   { type: String, default: 'unknown' },
    status:     { type: String, enum: ['active', 'inactive', 'error'], default: 'active' },

    // Latest reading snapshot stored in MongoDB for fast lookup
    latestReading: {
      readings:  SensorReadingSchema,
      timestamp: { type: Date, default: Date.now },
    },

    // Ingestion statistics
    totalReadings:   { type: Number, default: 0 },
    firstSeenAt:     { type: Date, default: Date.now },
    lastSeenAt:      { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'sensor_devices',
  }
);

// Update lastSeen and increment counter on upsert
SensorDeviceSchema.methods.recordReading = function (readings) {
  this.latestReading = { readings, timestamp: new Date() };
  this.lastSeenAt = new Date();
  this.totalReadings += 1;
  this.status = 'active';
  return this.save();
};

const SensorDevice = mongoose.model('SensorDevice', SensorDeviceSchema);

module.exports = SensorDevice;
