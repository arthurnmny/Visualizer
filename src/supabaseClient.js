// src/supabaseClient.js
// Supabase helper for your Node app.
// Use getSupabaseClient() in browser-like code or public client code.
// Use getSupabaseServiceClient() in trusted server code with full privileges.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
}

let anonClient;
let serviceClient;

async function getSupabaseClient() {
  if (anonClient) return anonClient;
  const { createClient } = await import('@supabase/supabase-js');
  anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return anonClient;
}

async function getSupabaseServiceClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  }
  if (serviceClient) return serviceClient;
  const { createClient } = await import('@supabase/supabase-js');
  serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  return serviceClient;
}

module.exports = {
  getSupabaseClient,
  getSupabaseServiceClient,
};
