import { supabase } from '../supabaseClient'; // Or ../supabase, ensure consistency

// Users table operations
export const createUser = async (userData) => {
  try {
    // Get the authenticated user's ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not authenticated for profile creation.");
    }

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: user.id, // ✅ CRITICAL: Use the Supabase Auth user's ID
          name: userData.name,
          email: userData.email,
          // ❌ REMOVE PASSWORD HERE: Do not store passwords in your custom users table
          created_at: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user profile in custom table:', error);
    throw error;
  }
};

// Motors table operations
export const createMotor = async (motorData) => {
  try {
    // Get the authenticated user's ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("User not authenticated for motor creation.");
    }

    const { data, error } = await supabase
      .from('motors')
      .insert([
        {
          company_id: user.id, // ✅ CRITICAL: Use the Supabase Auth user's ID
          name: motorData.name,
          location: motorData.location,
          installed_at: new Date().toISOString()
        }
      ])
      .select(); // Add .select() to return the inserted data, including auto-generated 'id'

    if (error) throw error;
    return data[0]; // Return the first (and only) inserted record
  } catch (error) {
    console.error('Error creating motor:', error);
    throw error;
  }
};

// Sensor data operations (no changes needed here, as it relies on motor_id and RLS)
export const recordSensorData = async (sensorData) => {
  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .insert([
        {
          motor_id: sensorData.motorId,
          acceleration_x: sensorData.accelerationX,
          acceleration_y: sensorData.accelerationY,
          acceleration_z: sensorData.accelerationZ,
          gyro_x: sensorData.gyroX,
          gyro_y: sensorData.gyroY,
          gyro_z: sensorData.gyroZ,
          amplitude: sensorData.amplitude,
          angular_velocity: sensorData.angularVelocity,
          temperature: sensorData.temperature,
          timestamp: new Date().toISOString()
        }
      ]);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording sensor data:', error);
    throw error;
  }
};

// Real-time subscriptions (no changes needed)
export const subscribeToMotor = (motorId, callback) => {
  return supabase
    .from('motors')
    .select('*')
    .eq('id', motorId)
    .subscribe((payload) => {
      callback(payload.new);
    });
};

export const subscribeToSensorData = (motorId, callback) => {
  return supabase
    .from('sensor_data')
    .select('*')
    .eq('motor_id', motorId)
    .order('timestamp', { ascending: false })
    .subscribe((payload) => {
      callback(payload.new);
    });
};

// Get latest sensor readings (no changes needed)
export const getLatestSensorData = async (motorId) => {
  try {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .eq('motor_id', motorId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting latest sensor data:', error);
    throw error;
  }
};