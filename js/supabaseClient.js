// js/supabaseClient.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ Use your Project URL (Settings → Data API → Project URL)
const SUPABASE_URL = "https://lrcgmpuqkbrbmnsxjnae.supabase.co";

// ✅ Use your Publishable key (Settings → API Keys → Publishable key)
// (NOT the secret key, NOT service_role)
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zYZT_nPCIsJHqig1yjlmUw_Y3rkYGuV";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
