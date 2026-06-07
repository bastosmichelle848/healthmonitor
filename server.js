const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const db = new Database('health.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    heartRate REAL,
    spO2 REAL,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS quedas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT,
    intensidade TEXT,
    contagem INTEGER,
    ts DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── POST /vitals — recebe do Node-RED (tópico healthsensor)
app.post('/vitals', (req, res) => {
  const { heartRate, spO2 } = req.body;
  if (heartRate == null || spO2 == null) return res.status(400).json({ error: 'Dados inválidos' });
  db.prepare('INSERT INTO vitals (heartRate, spO2) VALUES (?, ?)').run(heartRate, spO2);
  console.log(`[${new Date().toLocaleTimeString()}] HR=${heartRate} bpm | SpO2=${spO2}%`);
  res.json({ ok: true });
});

// ── POST /queda — recebe do Node-RED (tópico healthsensor/queda)
app.post('/queda', (req, res) => {
  const { tipo, intensidade, contagem } = req.body;
  db.prepare('INSERT INTO quedas (tipo, intensidade, contagem) VALUES (?, ?, ?)').run(tipo, intensidade, contagem);
  console.log(`[${new Date().toLocaleTimeString()}] QUEDA: ${tipo} / ${intensidade} / contagem=${contagem}`);
  res.json({ ok: true });
});

// ── GET /api/vitals — últimos N registros
app.get('/api/vitals', (req, res) => {
  const limit = parseInt(req.query.limit) || 60;
  const rows = db.prepare('SELECT * FROM vitals ORDER BY ts DESC LIMIT ?').all(limit);
  res.json(rows.reverse());
});

// ── GET /api/quedas — últimas quedas
app.get('/api/quedas', (req, res) => {
  const rows = db.prepare('SELECT * FROM quedas ORDER BY ts DESC LIMIT 20').all();
  res.json(rows);
});

// ── GET /api/stats — estatísticas rápidas
app.get('/api/stats', (req, res) => {
  const last = db.prepare('SELECT heartRate, spO2, ts FROM vitals ORDER BY ts DESC LIMIT 1').get();
  const avgHr = db.prepare('SELECT AVG(heartRate) as v FROM vitals WHERE ts > datetime("now","-5 minutes")').get();
  const avgSpo2 = db.prepare('SELECT AVG(spO2) as v FROM vitals WHERE ts > datetime("now","-5 minutes")').get();
  const quedaCount = db.prepare('SELECT COUNT(*) as v FROM quedas').get();
  res.json({
    latest: last || null,
    avgHr: avgHr?.v?.toFixed(1) || null,
    avgSpo2: avgSpo2?.v?.toFixed(1) || null,
    quedas1h: quedaCount?.v || 0
  });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor iniciado — http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   API:       http://localhost:${PORT}/api/vitals\n`);
});
