// ============================================
// NexusFlow - Main Server (Express + Socket.IO)
// ============================================

require('dotenv').config();

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const morgan    = require('morgan');
const path      = require('path');

const { connectMongoDB } = require('./config/mongodb');
const { initInfluxDB }   = require('./config/influxdb');
const { getIngestionStats, getLatestBuffered } = require('./ingestion/telemetryIngestion');

const telemetryRoutes = require('./routes/telemetry');
const dashboardRoutes = require('./routes/dashboard');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../public')));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/stats',     dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'NexusFlow — Database & Telemetry Ingestion',
    version: '1.0.0',
    uptime: process.uptime().toFixed(1) + 's',
    timestamp: new Date().toISOString(),
  });
});

// ─── Socket.IO Real-time Push ─────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket.IO] 🔌 Client connected:', socket.id);

  // Send latest data on connect
  socket.emit('stats',  getIngestionStats());
  socket.emit('latest', getLatestBuffered(10));

  socket.on('disconnect', () => {
    console.log('[Socket.IO] 🔌 Client disconnected:', socket.id);
  });
});

// Broadcast live stats to all connected dashboards every 2 seconds
setInterval(() => {
  const stats  = getIngestionStats();
  const latest = getLatestBuffered(1)[0] || null;
  io.emit('stats',  stats);
  if (latest) io.emit('newReading', latest);
}, 2000);

// ─── Startup ──────────────────────────────────────────────────
const start = async () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   NexusFlow — Telemetry Ingestion Module  ║');
  console.log('╚══════════════════════════════════════════╝\n');

  await connectMongoDB();
  initInfluxDB();

  server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard:   http://localhost:${PORT}`);
    console.log(`🔗 Health:      http://localhost:${PORT}/health`);
    console.log(`📡 Ingest API:  POST http://localhost:${PORT}/api/telemetry/ingest`);
    console.log(`📈 Stats API:   GET  http://localhost:${PORT}/api/stats\n`);
  });
};

start();

// Export for testing
module.exports = { app, server, io };
