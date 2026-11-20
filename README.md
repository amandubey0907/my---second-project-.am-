# NexusFlow — Database & Telemetry Ingestion Module

> **Team Module:** Database & Telemetry Ingestion  
> **Project:** NexusFlow  
> **Developer:** Aman Dubey  

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js |
| Time-Series DB | InfluxDB v2 |
| Document DB | MongoDB (Mongoose) |
| Real-time | Socket.IO |
| Sensor Simulation | Custom IoT Simulator |

---

## 📡 What This Module Does

This module handles the **complete telemetry pipeline** for NexusFlow:

1. **IoT Sensor Simulation** — Generates realistic sensor data (temperature, humidity, pressure, CO₂)
2. **Telemetry Ingestion** — Receives and validates incoming sensor payloads
3. **Dual-Write Storage** — Writes time-series data to InfluxDB + device metadata to MongoDB
4. **Real-time Dashboard** — Live charts showing sensor readings, ingestion rates & DB stats
5. **REST API** — Exposes endpoints for querying telemetry data

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env
# Fill in your MongoDB URI and InfluxDB credentials

# 3. Start the server
npm start

# 4. (Optional) Run the IoT sensor simulator
npm run simulate
```

Open **http://localhost:3000** to view the dashboard.

---

## 📁 Project Structure

```
nexusflow/
├── src/
│   ├── server.js                  # Main Express + Socket.IO server
│   ├── config/
│   │   ├── mongodb.js             # MongoDB connection
│   │   └── influxdb.js            # InfluxDB connection & write client
│   ├── models/
│   │   └── SensorDevice.js        # Mongoose model for device registry
│   ├── ingestion/
│   │   └── telemetryIngestion.js  # Core ingestion pipeline logic
│   ├── routes/
│   │   ├── telemetry.js           # POST /api/telemetry, GET /api/telemetry/latest
│   │   └── dashboard.js           # GET /api/stats
│   └── simulator/
│       └── sensorSimulator.js     # IoT sensor data simulator
├── public/
│   ├── index.html                 # Real-time dashboard UI
│   ├── css/style.css              # Dashboard styles
│   └── js/dashboard.js            # Chart.js + Socket.IO frontend
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/telemetry/ingest` | Ingest single sensor reading |
| `POST` | `/api/telemetry/batch` | Ingest batch of readings |
| `GET` | `/api/telemetry/latest` | Get latest readings per device |
| `GET` | `/api/telemetry/history/:deviceId` | Get historical data |
| `GET` | `/api/stats` | Get DB stats & ingestion metrics |

---

## 📊 Sensor Data Schema

```json
{
  "deviceId": "sensor-001",
  "deviceType": "environmental",
  "location": "Floor-2-Zone-A",
  "readings": {
    "temperature": 24.5,
    "humidity": 65.2,
    "pressure": 1013.25,
    "co2": 412.0
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🔗 Integration with NexusFlow

This module exposes a stable REST + WebSocket interface for other NexusFlow services to consume real-time telemetry data.

---

*Part of the NexusFlow distributed telemetry platform.*
