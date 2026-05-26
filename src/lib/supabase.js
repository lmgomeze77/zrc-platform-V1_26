import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL  || "https://jpecmcplicwhmtfnbpdi.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZWNtY3BsaWN3aG10Zm5icGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzQxOTksImV4cCI6MjA5MTE1MDE5OX0.lqwOc850MbdmW2lZKwLCRESHWOHV1Sk1sFXUtYcn1Q4";

export const supabase = createClient(url, key);
