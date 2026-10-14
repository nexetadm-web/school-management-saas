import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dhugnuamyqczvptmvlnq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRodWdudWFteXFjenZwdG12bG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDI2NjQsImV4cCI6MjEwNjQ3ODY2NH0.kcbTjmD96_99M3U_PI4wDqJsv1q-D1LapclxRpawcok';

export function createClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = createClient();
