// server.js
// Run: npm install && node server.js
// Serves letsbetonit.html and saves bets to Supabase

const express = require('express');
const { getSupabaseServiceClient } = require('./src/supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(express.json());
app.use(express.static(__dirname)); // serves letsbetonit.html from project root

// ── POST /api/bets ──
app.post('/api/bets', async (req, res) => {
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

  const total = [q1chips, q2chips, q3chips, q4chips, q5chips]
    .map(n => parseInt(n) || 0)
    .reduce((a, b) => a + b, 0);

  if (total > 100) {
    return res.status(400).send('Total chips exceed 100.');
  }

  try {
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase.from('bets').insert([{
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
    }]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).send('Database error.');
    }

    res.status(201).json({ id: data?.[0]?.id ?? null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// ── GET /api/bets (optional — view all submissions) ──
app.get('/api/bets', async (req, res) => {
  try {
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).send('Database error.');
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
