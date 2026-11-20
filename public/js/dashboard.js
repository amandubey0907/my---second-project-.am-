// ============================================
// NexusFlow — Dashboard Frontend JS
// ============================================

const socket = io();

// ─── Chart Setup ─────────────────────────────────────────────
const MAX_POINTS = 20;

const makeLabels = () => Array(MAX_POINTS).fill('');

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: true,
  animation: { duration: 400 },
  plugins: { legend: { labels: { color: '#8b949e', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#8b949e', maxTicksLimit: 6 }, grid: { color: '#21262d' } },
    y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
  },
};

// Temperature + Humidity chart
const tempHumidCtx = document.getElementById('tempHumidChart').getContext('2d');
const tempHumidChart = new Chart(tempHumidCtx, {
  type: 'line',
  data: {
    labels: makeLabels(),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [], borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,0.1)',
        tension: 0.4, fill: true, pointRadius: 2,
      },
      {
        label: 'Humidity (%)',
        data: [], borderColor: '#3fb950', backgroundColor: 'rgba(63,185,80,0.07)',
        tension: 0.4, fill: true, pointRadius: 2,
      },
    ],
  },
  options: { ...chartDefaults },
});

// CO₂ chart
const co2Ctx = document.getElementById('co2Chart').getContext('2d');
const co2Chart = new Chart(co2Ctx, {
  type: 'bar',
  data: {
    labels: makeLabels(),
    datasets: [{
      label: 'CO₂ (ppm)',
      data: [],
      backgroundColor: 'rgba(210,153,34,0.6)',
      borderColor: '#d29922',
      borderWidth: 1,
      borderRadius: 3,
    }],
  },
  options: { ...chartDefaults },
});

// Pressure chart
const pressureCtx = document.getElementById('pressureChart').getContext('2d');
const pressureChart = new Chart(pressureCtx, {
  type: 'line',
  data: {
    labels: makeLabels(),
    datasets: [{
      label: 'Pressure (hPa)',
      data: [],
      borderColor: '#bc8cff',
      backgroundColor: 'rgba(188,140,255,0.1)',
      tension: 0.4, fill: true, pointRadius: 2,
    }],
  },
  options: { ...chartDefaults },
});

// ─── Helpers ──────────────────────────────────────────────────
const push = (chart, datasetIdx, value) => {
  const ds = chart.data.datasets[datasetIdx];
  ds.data.push(value);
  chart.data.labels.push(new Date().toLocaleTimeString());
  if (ds.data.length > MAX_POINTS) {
    ds.data.shift();
    chart.data.labels.shift();
  }
  chart.update('none');
};

const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
};

const setWidth = (id, pct) => {
  const el = document.getElementById(id);
  if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%';
};

const formatUptime = (sec) => {
  if (sec < 60)   return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
};

// ─── Socket.IO Events ─────────────────────────────────────────
socket.on('connect', () => {
  const pill = document.getElementById('connectionStatus');
  pill.textContent = '● Live';
  pill.className = 'status-pill connected';
});

socket.on('disconnect', () => {
  const pill = document.getElementById('connectionStatus');
  pill.textContent = '● Disconnected';
  pill.className = 'status-pill disconnected';
});

socket.on('stats', (stats) => {
  setText('totalIngested', stats.totalIngested.toLocaleString());
  setText('ingestionRate', stats.ingestionRatePerSec);
  setText('uptime',        formatUptime(stats.uptimeSeconds));
  setText('bufferSize',    stats.bufferSize);
  setText('lastUpdated',   new Date().toLocaleTimeString());
});

socket.on('newReading', (reading) => {
  if (!reading || !reading.readings) return;

  const r = reading.readings;
  const deviceId = reading.deviceId;

  // Update charts
  push(tempHumidChart, 0, r.temperature);
  push(tempHumidChart, 1, r.humidity);
  push(co2Chart,       0, r.co2);
  push(pressureChart,  0, r.pressure);

  // Update gauges
  setText('g-temp', r.temperature.toFixed(1));
  setText('g-hum',  r.humidity.toFixed(1));
  setText('g-pres', r.pressure.toFixed(1));
  setText('g-co2',  r.co2.toFixed(0));

  setWidth('gf-temp', ((r.temperature + 10) / 55) * 100); // -10 to 45°C
  setWidth('gf-hum',  r.humidity);
  setWidth('gf-pres', ((r.pressure - 980) / 60) * 100);   // 980–1040 hPa
  setWidth('gf-co2',  (r.co2 / 2000) * 100);              // up to 2000 ppm

  // Live device label
  setText('liveDevice', deviceId + ' · ' + (reading.location || ''));

  // Add log entry
  addLog(reading);
});

// ─── Live Log ─────────────────────────────────────────────────
const addLog = (reading) => {
  const log  = document.getElementById('logBody');
  const time = new Date().toLocaleTimeString();
  const r    = reading.readings;

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML =
    `<span class="log-time">${time}</span>` +
    `<span class="log-device">${reading.deviceId}</span>` +
    `<span class="log-data">T:${r.temperature}°C H:${r.humidity}% P:${r.pressure}hPa CO₂:${r.co2}ppm</span>`;

  log.prepend(entry);

  // Cap log at 50 entries
  while (log.children.length > 50) log.removeChild(log.lastChild);
};

const clearLog = () => { document.getElementById('logBody').innerHTML = ''; };

// ─── Fetch DB stats on load ───────────────────────────────────
const fetchStats = async () => {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();

    // MongoDB
    const mg = data.databases?.mongodb;
    if (mg) {
      const badge = document.getElementById('mongoBadge');
      badge.textContent = mg.status;
      badge.className = 'db-badge ' + (mg.status === 'connected' ? 'connected' : 'disconnected');
      document.getElementById('mongoDetails').textContent =
        mg.status === 'connected'
          ? `DB: ${mg.database} · Collections: ${mg.collections} · Docs: ${mg.documents} · Size: ${mg.dataSize}`
          : `Status: ${mg.status} (demo mode — buffering in memory)`;
    }

    // InfluxDB
    const inx = data.databases?.influxdb;
    if (inx) {
      const badge = document.getElementById('influxBadge');
      badge.textContent = inx.status;
      badge.className = 'db-badge ' + (inx.status === 'connected' ? 'connected' : 'disconnected');
      document.getElementById('influxDetails').textContent =
        `URL: ${inx.url} · Org: ${inx.org} · Bucket: ${inx.bucket}`;
    }
  } catch (err) {
    console.warn('Stats fetch failed:', err.message);
  }
};

fetchStats();
setInterval(fetchStats, 10000);

// ─── Manual Injection ─────────────────────────────────────────
const injectReading = async () => {
  const payload = {
    deviceId:   document.getElementById('i-deviceId').value  || 'sensor-manual',
    location:   document.getElementById('i-location').value  || 'Manual',
    deviceType: 'environmental',
    readings: {
      temperature: parseFloat(document.getElementById('i-temp').value),
      humidity:    parseFloat(document.getElementById('i-humidity').value),
      pressure:    parseFloat(document.getElementById('i-pressure').value),
      co2:         parseFloat(document.getElementById('i-co2').value),
    },
  };

  const result = document.getElementById('injectResult');
  try {
    const res  = await fetch('/api/telemetry/ingest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    result.style.color = data.success ? '#3fb950' : '#f85149';
    result.textContent = data.success
      ? `✅ Injected: ${payload.deviceId} · Storage: InfluxDB=${data.storage?.influxdb}, MongoDB=${data.storage?.mongodb}`
      : `❌ Error: ${JSON.stringify(data.errors)}`;
  } catch (err) {
    result.style.color = '#f85149';
    result.textContent = '❌ ' + err.message;
  }
};
