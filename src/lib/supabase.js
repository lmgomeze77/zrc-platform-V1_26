import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL  || null;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || null;

export const supabase = (url && key) ? createClient(url, key) : null;
