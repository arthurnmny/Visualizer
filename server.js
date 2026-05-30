// server.js
// Run: npm install && node server.js
// Serves letsbetonit.html and saves bets to Supabase

require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ──
app.use(express.json());

// Mount the serverless-style API handlers
const babyFeedbackHandler = require('./api/baby-feedback');
const betsHandler = require('./api/bets');

app.all('/api/baby-feedback', babyFeedbackHandler);
app.all('/api/bets', betsHandler);

app.use(express.static(__dirname)); // serves letsbetonit.html from project root

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
