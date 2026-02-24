const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      // This forces the request to be fresh and helps bypass some local network hangs
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
);

module.exports = supabase;