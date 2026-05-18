const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

let supabase;
async function getSupabase() {
  if (supabase) return supabase;
  const { createClient } = await import('@supabase/supabase-js');
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return supabase;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const name = String(payload.name || '').trim();
    const q1chips = Number(payload.q1chips || 0);
    const q2chips = Number(payload.q2chips || 0);
    const q3chips = Number(payload.q3chips || 0);
    const q4chips = Number(payload.q4chips || 0);
    const q5chips = Number(payload.q5chips || 0);
    const q1response = String(payload.q1response || '');
    const q2response = String(payload.q2response || '');
    const q3response = String(payload.q3response || '');
    const q4response = String(payload.q4response || '');
    const q5response = String(payload.q5response || '');

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const total = q1chips + q2chips + q3chips + q4chips + q5chips;
    if (total > 100) {
      return res.status(400).json({ error: 'Total chips exceed 100' });
    }

    const supabase = await getSupabase();
    const { data, error } = await supabase.from('bets').insert([{
      name,
      q1chips,
      q1response,
      q2chips,
      q2response,
      q3chips,
      q3response,
      q4chips,
      q4response,
      q5chips,
      q5response,
    }]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message || 'Database insert failed' });
    }

    return res.status(201).json(data?.[0] || {});
  }

  if (req.method === 'GET') {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: error.message || 'Database query failed' });
    }

    return res.status(200).json(data || []);
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(405).json({ error: 'Method not allowed' });
}
