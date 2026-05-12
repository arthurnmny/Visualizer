// server.js
// Run: npm install && node server.js
// Serves letsbetonit.html and saves bets to data/bets.sqlite3

const express  = require('express');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Ensure data directory exists ──
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ── Open / init database ──
const db = new Database(path.join(DATA_DIR, 'bets.sqlite3'));

db.exec(`
  CREATE TABLE IF NOT EXISTS bets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    name        TEXT NOT NULL,
    q1chips     INTEGER DEFAULT 0,
    q1response  TEXT,
    q2chips     INTEGER DEFAULT 0,
    q2response  TEXT,
    q3chips     INTEGER DEFAULT 0,
    q3response  TEXT,
    q4chips     INTEGER DEFAULT 0,
    q4response  TEXT,
    q5chips     INTEGER DEFAULT 0,
    q5response  TEXT
  )
`);

const insert = db.prepare(`
  INSERT INTO bets
    (name, q1chips, q1response, q2chips, q2response, q3chips, q3response,
     q4chips, q4response, q5chips, q5response)
  VALUES
    (@name, @q1chips, @q1response, @q2chips, @q2response, @q3chips, @q3response,
     @q4chips, @q4response, @q5chips, @q5response)
`);

// ── Middleware ──
app.use(express.json());
app.use(express.static(__dirname)); // serves letsbetonit.html from project root

// ── POST /api/bets ──
app.post('/api/bets', (req, res) => {
  const {
    name,
    q1chips, q1response,
    q2chips, q2response,
    q3chips, q3response,
    q4chips, q4response,
    q5chips, q5response,
  } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).send('Name is required.');
  }

  // Validate chip totals don't exceed 100
  const total = [q1chips, q2chips, q3chips, q4chips, q5chips]
    .map(n => parseInt(n) || 0)
    .reduce((a, b) => a + b, 0);

  if (total > 100) {
    return res.status(400).send('Total chips exceed 100.');
  }

  try {
    const result = insert.run({
      name:        name.trim(),
      q1chips:     parseInt(q1chips)  || 0,
      q1response:  q1response  || '',
      q2chips:     parseInt(q2chips)  || 0,
      q2response:  q2response  || '',
      q3chips:     parseInt(q3chips)  || 0,
      q3response:  q3response  || '',
      q4chips:     parseInt(q4chips)  || 0,
      q4response:  q4response  || '',
      q5chips:     parseInt(q5chips)  || 0,
      q5response:  q5response  || '',
    });
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// ── GET /api/bets (optional — view all submissions) ──
app.get('/api/bets', (req, res) => {
  const rows = db.prepare('SELECT * FROM bets ORDER BY submitted_at DESC').all();
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Database: ${path.join(DATA_DIR, 'bets.sqlite3')}`);
});
