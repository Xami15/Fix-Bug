// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ktrhdydqdshqjhjrusqf.supabase.co'; // Replace this
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0cmhkeWRxZHNocWpoanJ1c3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzkyMDAsImV4cCI6MjA2NzMxNTIwMH0.hhIEQQfEr27-30pstPlsisWSQwzf4KJf8LeOimflKUM'; // Replace this

export const supabase = createClient(supabaseUrl, supabaseKey);
