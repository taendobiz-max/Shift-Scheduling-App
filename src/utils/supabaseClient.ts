// Legacy key-free compatibility export.
// The public client is configured exclusively through Vite environment variables
// in src/lib/supabase.ts; no API key is embedded in frontend source code.
export { supabase as default, supabase } from '../lib/supabase';
