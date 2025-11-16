// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(
    supabaseUrl, 
    supabaseKey,
    {
        auth: {
            // هذا يضمن أن Supabase تبحث عن الجلسة في localStorage
            persistSession: true, 
            autoRefreshToken: true,
            detectSessionInUrl: true, 
            storage: localStorage, // استخدم التخزين المحلي
        },
    }
);