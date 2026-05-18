const { getSupabaseServiceClient } = require('../src/supabaseClient');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    let payload;
    try {
      payload = req.body;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const name = String(payload?.name || '').trim();
    const relationship = String(payload?.relationship || '').trim();
    const messageType = String(payload?.messageType || 'advice').trim();
    const message = String(payload?.message || '').trim();
    const email = String(payload?.email || '').trim();
    const shareable = payload?.shareable === true;

    if (!name || !message) {
      return res.status(400).json({ error: 'Name and message are required' });
    }

    try {
      const supabase = await getSupabaseServiceClient();
      const { data, error } = await supabase.from('baby_feedback').insert([{
        name,
        relationship,
        message_type: messageType,
        message,
        email,
        shareable,
      }]).select();

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ error: error.message || 'Database insert failed' });
      }

      return res.status(201).json(data?.[0] || {});
    } catch (err) {
      console.error('baby-feedback POST error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const supabase = await getSupabaseServiceClient();
      const { data, error } = await supabase
        .from('baby_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase select error:', error);
        return res.status(500).json({ error: error.message || 'Database query failed' });
      }

      return res.status(200).json(data || []);
    } catch (err) {
      console.error('baby-feedback GET error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(405).json({ error: 'Method not allowed' });
};
