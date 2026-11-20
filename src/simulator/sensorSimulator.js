// ============================================
// NexusFlow - IoT Sensor Data Simulator
// ============================================
// Generates realistic IoT sensor readings and POSTs them
// to the telemetry ingestion endpoint every 2 seconds.
//
// Usage: node src/simulator/sensorSimulator.js
// ============================================

const http = require('http');

const DEVICES = [
  { deviceId: 'sensor-001', location: 'Floor-1-Zone-A', deviceType: 'environmental' },
  { deviceId: 'sensor-002', location: 'Floor-1-Zone-B', deviceType: 'environmental' },
  { deviceId: 'sensor-003', location: 'Floor-2-Zone-A', deviceType: 'environmental' },
  { deviceId: 'sensor-004', location: 'Server-Room-1',  deviceType: 'environmental' },
  { deviceId: 'sensor-005', location: 'Outdoor-Roof',   deviceType: 'environmental' },
];

// Simulate realistic drift in sensor readings
const state = {};
DEVICES.forEach(d => {
  state[d.deviceId] = {
    temperature: 22 + Math.random() * 6,
    humidity:    55 + Math.random() * 20,
    pressure:    1010 + Math.random() * 10,
    co2:         400 + Math.random() * 100,
  };
});

const drift = (val, min, max, delta) => {
  const change = (Math.random() - 0.5) * 2 * delta;
  return Math.min(max, Math.max(min, val + change));
};

const generateReading = (device) => {
  const s = state[device.deviceId];
  s.temperature = drift(s.temperature, 10,  45,   0.5);
  s.humidity    = drift(s.humidity,    20,  95,   1.0);
  s.pressure    = drift(s.pressure,    980, 1040, 0.3);
  s.co2         = drift(s.co2,         350, 2000, 15);

  return {
    deviceId:   device.deviceId,
    deviceType: device.deviceType,
    location:   device.location,
    readings: {
      temperature: parseFloat(s.temperature.toFixed(2)),
      humidity:    parseFloat(s.humidity.toFixed(2)),
      pressure:    parseFloat(s.pressure.toFixed(2)),
      co2:         parseFloat(s.co2.toFixed(2)),
    },
    timestamp: new Date().toISOString(),
  };
};

const postReading = (payload) => {
  const data = JSON.stringify(payload);
  const options = {
    hostname: 'localhost',
    port:     process.env.PORT || 3000,
    path:     '/api/telemetry/ingest',
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  };

  const req = http.request(options, res => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      const result = JSON.parse(body);
      if (result.success) {
        console.log(`[Simulator] ✅ ${payload.deviceId} @ ${payload.location} → T:${payload.readings.temperature}°C H:${payload.readings.humidity}% CO₂:${payload.readings.co2}ppm`);
      }
    });
  });

  req.on('error', err => {
    console.error(`[Simulator] ❌ Failed to post ${payload.deviceId}:`, err.message);
  });

  req.write(data);
  req.end();
};

console.log('🚀 NexusFlow IoT Sensor Simulator starting...');
console.log(`   Simulating ${DEVICES.length} devices, posting every 2 seconds`);
console.log('   Press Ctrl+C to stop\n');

setInterval(() => {
  const device  = DEVICES[Math.floor(Math.random() * DEVICES.length)];
  const reading = generateReading(device);
  postReading(reading);
}, 2000);
