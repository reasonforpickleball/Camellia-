import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jsiokoocslpydmuoxtix.supabase.co';
const SUPABASE_KEY = 'sb_publishable_v3Jm5XDF1roCZxjf2Jr8UA_WPcp0OMr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
