// You can place this in a utility file or where you handle predictions
import { supabase } from '../utils/supabase';

export async function logPredictionToHistory({
  motor,
  status,
  confidence,
  temperature,
  vibration,
  timestamp = new Date().toISOString(),
}) {
  const { error } = await supabase.from('motor_history').insert([
    { motor, status, confidence, temperature, vibration, timestamp }
  ]);
  if (error) {
    console.error('Failed to log prediction:', error.message);
  }
}