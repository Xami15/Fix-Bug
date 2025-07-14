// src/context/MotorsContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import mqtt from 'mqtt';

const MotorsContext = createContext();
export const useMotors = () => useContext(MotorsContext);

export const MotorsProvider = ({ children }) => {
  const [motors, setMotors] = useState(() => {
    const savedMotors = localStorage.getItem('motors');
    if (savedMotors) {
      const parsedMotors = JSON.parse(savedMotors);
      return parsedMotors.map(motor => ({
        ...motor,
        lastUpdated: motor.lastUpdated ? new Date(motor.lastUpdated) : null,
        temperature: typeof motor.temperature === 'number' ? motor.temperature : null,
        vibration: typeof motor.vibration === 'number' ? motor.vibration : null,
        confidence: typeof motor.confidence === 'number' ? motor.confidence : 0,
      }));
    }
    return [];
  });

  const [historyData, setHistoryData] = useState(() => {
    const saved = localStorage.getItem('historyData');
    return saved ? JSON.parse(saved) : [];
  });

  const [liveMotorDataHistory, setLiveMotorDataHistory] = useState({});
  const [mqttConnected, setMqttConnected] = useState(false);

  const mqttClientRef = useRef(null);
  const subscribedTopicsRef = useRef(new Set());

  // Save motors and historyData to localStorage
  useEffect(() => {
    localStorage.setItem('motors', JSON.stringify(
      motors.map(m => ({
        ...m,
        lastUpdated: m.lastUpdated instanceof Date ? m.lastUpdated.toISOString() : m.lastUpdated,
      }))
    ));
  }, [motors]);

  useEffect(() => {
    localStorage.setItem('historyData', JSON.stringify(historyData));
  }, [historyData]);

  // 1️⃣ Connect to MQTT once
  useEffect(() => {
    const client = mqtt.connect("wss://test.mosquitto.org:8081");
    mqttClientRef.current = client;

    client.on("connect", () => {
      console.log("MotorsContext: Connected to MQTT broker");
      setMqttConnected(true);
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const motorId = data.motor_id;
        if (!motorId) return;

        const newTemperature = parseFloat(data.temperature);
        const newVibration = parseFloat(data.vibration);
        const newTimestamp = data.timestamp ? new Date(data.timestamp * 1000) : new Date();
        const newStatus = data.status || 'Unknown';
        const newConfidence = data.confidence || 0;

        // Update motors only if changed
        setMotors(prevMotors => prevMotors.map(motor => {
          if (motor.id === motorId) {
            const shouldUpdate =
              motor.temperature !== newTemperature ||
              motor.vibration !== newVibration ||
              motor.status !== newStatus ||
              motor.confidence !== newConfidence ||
              (motor.lastUpdated?.getTime() || 0) !== newTimestamp.getTime();

            return shouldUpdate ? {
              ...motor,
              temperature: newTemperature,
              vibration: newVibration,
              status: newStatus,
              confidence: newConfidence,
              lastUpdated: newTimestamp,
            } : motor;
          }
          return motor;
        }));

        // Update chart history
        setLiveMotorDataHistory(prev => {
          const updated = { ...prev };
          if (!updated[motorId]) {
            updated[motorId] = { temperature: [], vibration: [], timestamps: [] };
          }

          const MAX = 60;
          updated[motorId].temperature = [...updated[motorId].temperature.slice(-MAX + 1), newTemperature];
          updated[motorId].vibration = [...updated[motorId].vibration.slice(-MAX + 1), newVibration];
          updated[motorId].timestamps = [...updated[motorId].timestamps.slice(-MAX + 1), newTimestamp.toLocaleTimeString()];
          return updated;
        });

        // Add to log
        const motorNameForLog = motors.find(m => m.id === motorId)?.name || motorId;
        setHistoryData(prev => [
          ...prev,
          {
            id: `log-${Date.now()}-${motorId}`,
            timestamp: newTimestamp.toISOString(),
            motor: motorNameForLog,
            status: newStatus,
            confidence: newConfidence,
            temperature: newTemperature,
            vibration: newVibration,
          }
        ]);

      } catch (err) {
        console.error("MotorsContext: Failed to parse message", message.toString(), err);
      }
    });

    client.on("error", err => {
      console.error("MotorsContext: MQTT error", err);
      setMqttConnected(false);
    });

    client.on("close", () => {
      console.log("MotorsContext: MQTT disconnected");
      setMqttConnected(false);
    });

    return () => {
      if (client.connected) client.end();
      subscribedTopicsRef.current.clear();
    };
  }, []); // connect only once

  // 2️⃣ Handle subscription updates when `motors` change
  useEffect(() => {
    const client = mqttClientRef.current;
    if (!client || !client.connected) return;

    const currentTopics = new Set(motors.map(m => `motors/${m.id}/data`));
    const toUnsubscribe = [];

    subscribedTopicsRef.current.forEach(topic => {
      if (!currentTopics.has(topic)) {
        toUnsubscribe.push(topic);
        client.unsubscribe(topic, err => {
          if (err) console.error(`MotorsContext: Unsubscribe failed: ${topic}`, err);
          else console.log(`MotorsContext: Unsubscribed from ${topic}`);
        });
      }
    });

    toUnsubscribe.forEach(topic => subscribedTopicsRef.current.delete(topic));

    motors.forEach(motor => {
      const topic = `motors/${motor.id}/data`;
      if (!subscribedTopicsRef.current.has(topic)) {
        client.subscribe(topic, err => {
          if (err) console.error(`MotorsContext: Subscribe failed: ${topic}`, err);
          else {
            console.log(`MotorsContext: Subscribed to ${topic}`);
            subscribedTopicsRef.current.add(topic);
          }
        });
      }
    });
  }, [motors]);

  // Add/remove motor logic
  const addMotor = useCallback((newMotorId, newMotorName, newMotorLocation) => {
    setMotors(prev => {
      if (prev.some(m => m.name === newMotorName || m.id === newMotorId)) {
        console.warn(`Motor already exists: ${newMotorId}`);
        return prev;
      }
      return [
        ...prev,
        {
          id: newMotorId,
          name: newMotorName,
          location: newMotorLocation,
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
    setLiveMotorDataHistory(prev => {
      const copy = { ...prev };
      delete copy[motorId];
      return copy;
    });

    const topic = `motors/${motorId}/data`;
    if (mqttClientRef.current?.connected && subscribedTopicsRef.current.has(topic)) {
      mqttClientRef.current.unsubscribe(topic, err => {
        if (err) console.error(`MotorsContext: Failed to unsubscribe ${topic}`, err);
        else {
          console.log(`MotorsContext: Explicitly unsubscribed from ${topic}`);
          subscribedTopicsRef.current.delete(topic);
        }
      });
    }
  }, []);

  return (
    <MotorsContext.Provider value={{
      motors,
      historyData,
      liveMotorDataHistory,
      mqttConnected,
      addMotor,
      removeMotor
    }}>
      {children}
    </MotorsContext.Provider>
  );
};
