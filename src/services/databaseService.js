import { database } from '../firebaseConfig';
import { ref, set, onValue, push, serverTimestamp } from 'firebase/database';

// Users table operations
const createUser = async (userId, userData) => {
  try {
    await set(ref(database, `users/${userId}`), {
      name: userData.name,
      email: userData.email,
      password: userData.password, // Should be hashed before reaching this point
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Motors table operations
const createMotor = async (motorData) => {
  try {
    const motorRef = ref(database, 'motors');
    const newMotorRef = push(motorRef);
    await set(newMotorRef, {
      companyId: motorData.companyId,
      name: motorData.name,
      location: motorData.location,
      installedAt: serverTimestamp()
    });
    return newMotorRef.key;
  } catch (error) {
    console.error('Error creating motor:', error);
    throw error;
  }
};

// Sensor data operations
const recordSensorData = async (motorId, sensorData) => {
  try {
    const sensorDataRef = ref(database, 'sensorData');
    await push(sensorDataRef, {
      motorId,
      accelerationX: sensorData.accelerationX,
      accelerationY: sensorData.accelerationY,
      accelerationZ: sensorData.accelerationZ,
      gyroX: sensorData.gyroX,
      gyroY: sensorData.gyroY,
      gyroZ: sensorData.gyroZ,
      amplitude: sensorData.amplitude,
      angularVelocity: sensorData.angularVelocity,
      temperature: sensorData.temperature,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error recording sensor data:', error);
    throw error;
  }
};

// Real-time listeners
const subscribeToMotor = (motorId, callback) => {
  const motorRef = ref(database, `motors/${motorId}`);
  return onValue(motorRef, (snapshot) => {
    callback(snapshot.val());
  });
};

const subscribeToSensorData = (motorId, callback) => {
  const query = ref(database, 'sensorData');
  return onValue(query, (snapshot) => {
    const allData = snapshot.val();
    if (!allData) return callback(null);

    // Filter data for specific motor and sort by timestamp
    const motorData = Object.entries(allData)
      .filter(([_, data]) => data.motorId === motorId)
      .map(([key, data]) => ({ ...data, id: key }))
      .sort((a, b) => b.timestamp - a.timestamp);

    callback(motorData);
  });
};

// Get latest sensor readings
const getLatestSensorData = async (motorId) => {
  return new Promise((resolve, reject) => {
    const query = ref(database, 'sensorData');
    onValue(query, (snapshot) => {
      const allData = snapshot.val();
      if (!allData) return resolve(null);

      const motorData = Object.entries(allData)
        .filter(([_, data]) => data.motorId === motorId)
        .map(([key, data]) => ({ ...data, id: key }))
        .sort((a, b) => b.timestamp - a.timestamp);

      resolve(motorData[0] || null);
    }, {
      onlyOnce: true
    }, reject);
  });
};

export {
  createUser,
  createMotor,
  recordSensorData,
  subscribeToMotor,
  subscribeToSensorData,
  getLatestSensorData
};