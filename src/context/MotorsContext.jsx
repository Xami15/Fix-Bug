// src/context/MotorsContext.jsx
import React, {
  createContext, useState, useContext,
  useEffect, useCallback, useRef
} from 'react';
import mqtt from 'mqtt';
import { supabase } from '../utils/supabase';

const MotorsContext = createContext();
export const useMotors = () => useContext(MotorsContext);

export const MotorsProvider = ({ children }) => {
  const [motors, setMotors] = useState(() => {
    const saved = localStorage.getItem('motors');
    return saved ? JSON.parse(saved).map(motor => ({
      ...motor,
      lastUpdated: motor.lastUpdated ? new Date(motor.lastUpdated) : null,
      temperature: typeof motor.temperature === 'number' ? motor.temperature : null,
      vibration: typeof motor.vibration === 'number' ? motor.vibration : null,
      confidence: typeof motor.confidence === 'number' ? motor.confidence : 0,
    })) : [];
  });

  const [historyData, setHistoryData] = useState(() => {
    const saved = localStorage.getItem('historyData');
    return saved ? JSON.parse(saved) : [];
  });

  const [liveMotorDataHistory, setLiveMotorDataHistory] = useState({});
  const [mqttConnected, setMqttConnected] = useState(false);

  const mqttClientRef = useRef(null);
  const subscribedTopicsRef = useRef(new Set());
  const pollingIntervalsRef = useRef({});
  
  // Add offline detection timeout (5 seconds)
  const OFFLINE_TIMEOUT = 5000; // 5 seconds

  // Fetch history from Supabase on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('motor_history')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1000); // Limit to prevent memory issues
        
        if (error) {
          console.error('Error fetching history from Supabase:', error);
        } else {
          setHistoryData(data || []);
        }
      } catch (error) {
        console.error('Error in fetchHistory:', error);
      }
    }
    fetchHistory();
  }, []);

  // Save motors to localStorage
  useEffect(() => {
    localStorage.setItem('motors', JSON.stringify(
      motors.map(m => ({
        ...m,
        lastUpdated: m.lastUpdated instanceof Date ? m.lastUpdated.toISOString() : m.lastUpdated,
      }))
    ));
  }, [motors]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('historyData', JSON.stringify(historyData));
  }, [historyData]);

  // MQTT Connection and Data Handling
  useEffect(() => {
    console.log("Initializing MQTT connection...");
    
    // Use WebSocket port for browser compatibility
    const brokerUrl = "wss://test.mosquitto.org:8081";
    
    const client = mqtt.connect(brokerUrl, {
      keepalive: 60,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: true,
      rejectUnauthorized: false, // Add this for WebSocket connections
    });
    
    mqttClientRef.current = client;

    client.on("connect", () => {
      console.log("✅ MQTT connected successfully to test.mosquitto.org:8081");
      setMqttConnected(true);
      
      // Subscribe to wildcard topic immediately after connection
      const wildcardTopic = 'motors/+/data';
      client.subscribe(wildcardTopic, (err) => {
        if (err) {
          console.error("❌ Failed to subscribe to wildcard topic:", err);
        } else {
          console.log("✅ Subscribed to wildcard topic:", wildcardTopic);
          console.log("📡 Now listening for ESP32 data...");
        }
      });
    });

    client.on("message", (topic, message) => {
      console.log("📨 MQTT message received:", {
        topic: topic,
        message: message.toString(),
        timestamp: new Date().toISOString()
      });
      
      try {
        const data = JSON.parse(message.toString());
        console.log("📊 Parsed MQTT data:", data);
        
        const { motor_id, temperature, vibration, timestamp, status, confidence } = data;
        
        if (!motor_id) {
          console.warn("⚠️ MQTT message received without motor_id:", data);
          return;
        }

        const time = timestamp ? new Date(timestamp * 1000) : new Date();
        const tempValue = typeof temperature === 'number' ? temperature : null;
        const vibValue = typeof vibration === 'number' ? vibration : null;
        const confValue = typeof confidence === 'number' ? confidence : 0;

        console.log("🔧 Processing motor data:", {
          motor_id,
          temperature: tempValue,
          vibration: vibValue,
          status,
          confidence: confValue
        });

        // Check if motor exists, if not create it automatically
        setMotors(prev => {
          const motorExists = prev.some(m => m.id === motor_id);
          
          if (!motorExists) {
            console.log(`🆕 Auto-creating motor: ${motor_id} from MQTT data`);
            // Create a new motor entry for ESP32 devices
            const newMotor = {
              id: motor_id,
              name: `ESP32 Motor ${motor_id}`,
              location: 'ESP32 Device',
              temperature: tempValue,
              vibration: vibValue,
              status: 'Online',
              confidence: confValue,
              lastUpdated: time,
            };
            console.log("✅ Created new motor:", newMotor);
            return [...prev, newMotor];
          } else {
            console.log(`🔄 Updating existing motor: ${motor_id}`);
            // Update existing motor
            return prev.map(m =>
              m.id === motor_id
                ? {
                    ...m,
                    temperature: tempValue,
                    vibration: vibValue,
                    status: 'Online',
                    confidence: confValue,
                    lastUpdated: time,
                  }
                : m
            );
          }
        });

        // Update live history data
        setLiveMotorDataHistory(prev => {
          const motorHistory = prev[motor_id] || { temperature: [], vibration: [], timestamps: [] };
          const MAX_HISTORY_POINTS = 60; // Keep last 60 data points

          const updatedHistory = {
            temperature: [...motorHistory.temperature, tempValue].slice(-MAX_HISTORY_POINTS),
            vibration: [...motorHistory.vibration, vibValue].slice(-MAX_HISTORY_POINTS),
            timestamps: [...motorHistory.timestamps, time.toISOString()].slice(-MAX_HISTORY_POINTS),
          };

          return {
            ...prev,
            [motor_id]: updatedHistory
          };
        });

        // Add to history data for persistent storage
        if (tempValue !== null && vibValue !== null) {
          const historyEntry = {
            id: Date.now() + Math.random(), // Unique ID
            motor: motor_id,
            temperature: tempValue,
            vibration: vibValue,
            status: status || 'Online',
            confidence: confValue,
            timestamp: time.toISOString(),
          };

          setHistoryData(prev => {
            const newHistory = [historyEntry, ...prev];
            // Keep only last 1000 entries to prevent memory issues
            return newHistory.slice(0, 1000);
          });
        }

      } catch (e) {
        console.error("❌ Error parsing MQTT message:", e, "Raw message:", message.toString());
      }
    });

    client.on("error", err => {
      console.error("❌ MQTT error:", err);
      setMqttConnected(false);
    });

    client.on("close", () => {
      console.log("🔌 MQTT connection closed");
      setMqttConnected(false);
    });

    client.on("reconnect", () => {
      console.log("🔄 MQTT reconnecting...");
    });

    return () => {
      if (client.connected) {
        client.end();
      }
      subscribedTopicsRef.current.clear();
    };
  }, []);

  // Offline detection mechanism
  useEffect(() => {
    const checkOfflineMotors = () => {
      const now = new Date();
      setMotors(prev => 
        prev.map(motor => {
          if (!motor.lastUpdated) return motor;
          
          const timeSinceLastUpdate = now.getTime() - motor.lastUpdated.getTime();
          
          if (timeSinceLastUpdate > OFFLINE_TIMEOUT && motor.status !== 'Disconnected') {
            console.log(`🔴 Motor ${motor.id} marked as offline (no data for ${Math.round(timeSinceLastUpdate/1000)}s)`);
            return {
              ...motor,
              status: 'Disconnected',
              temperature: null,
              vibration: null,
              confidence: 0
            };
          }
          return motor;
        })
      );
    };

    // Check every 2 seconds
    const interval = setInterval(checkOfflineMotors, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to motor topics when motors change
  useEffect(() => {
    const client = mqttClientRef.current;
    if (!client || !client.connected) return;

    // Subscribe to all motor data topics using wildcard
    const wildcardTopic = 'motors/+/data';
    if (!subscribedTopicsRef.current.has(wildcardTopic)) {
      client.subscribe(wildcardTopic);
      subscribedTopicsRef.current.add(wildcardTopic);
      console.log(`Subscribed to wildcard topic: ${wildcardTopic}`);
    }

    // Also subscribe to specific motor topics for existing motors
    const desiredTopics = new Set(motors.map(m => `motors/${m.id}/data`));

    // Unsubscribe from specific topics we no longer need
    subscribedTopicsRef.current.forEach(topic => {
      if (topic !== wildcardTopic && !desiredTopics.has(topic)) {
        client.unsubscribe(topic);
        subscribedTopicsRef.current.delete(topic);
        console.log(`Unsubscribed from ${topic}`);
      }
    });

    // Subscribe to new specific topics
    motors.forEach(({ id }) => {
      const topic = `motors/${id}/data`;
      if (!subscribedTopicsRef.current.has(topic)) {
        client.subscribe(topic);
        subscribedTopicsRef.current.add(topic);
        console.log(`Subscribed to ${topic}`);
      }
    });
  }, [motors]);

  // Remove polling functionality - we only use MQTT for real-time data
  const addMotor = useCallback((motorId, name, location) => {
    setMotors(prev => {
      if (prev.some(m => m.id === motorId)) return prev;
      return [
        ...prev,
        {
          id: motorId,
          name,
          location,
          temperature: null,
          vibration: null,
          status: 'Disconnected',
          confidence: 0,
          lastUpdated: null,
        }
      ];
    });
  }, []);

  const removeMotor = useCallback((motorId) => {
    setMotors(prev => prev.filter(m => m.id !== motorId));
    
    // Clean up live history data
    setLiveMotorDataHistory(prev => {
      const updated = { ...prev };
      delete updated[motorId];
      return updated;
    });

    // Unsubscribe from MQTT topic
    const topic = `motors/${motorId}/data`;
    if (mqttClientRef.current?.connected && subscribedTopicsRef.current.has(topic)) {
      mqttClientRef.current.unsubscribe(topic);
      subscribedTopicsRef.current.delete(topic);
      console.log(`Unsubscribed from ${topic} due to motor removal`);
    }
  }, []);

  // Function to manually publish test data (for development/testing only)
  const publishTestData = useCallback((motorId, temperature, vibration, status = 'Healthy') => {
    if (!mqttClientRef.current?.connected) {
      console.warn('MQTT not connected, cannot publish test data');
      return;
    }

    const testData = {
      motor_id: motorId,
      temperature: temperature,
      vibration: vibration,
      status: status,
      confidence: Math.random() * 100,
      timestamp: Math.floor(Date.now() / 1000)
    };

    const topic = `motors/${motorId}/data`;
    mqttClientRef.current.publish(topic, JSON.stringify(testData));
    console.log(`Published test data to ${topic}:`, testData);
  }, []);

  return (
    <MotorsContext.Provider value={{
      motors,
      historyData,
      liveMotorDataHistory,
      mqttConnected,
      addMotor,
      removeMotor,
      publishTestData // Only for development/testing
    }}>
      {children}
    </MotorsContext.Provider>
  );
};
