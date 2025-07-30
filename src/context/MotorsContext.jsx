// src/context/MotorsContext.jsx
import React, {
  createContext, useState, useContext,
  useEffect, useCallback, useRef
} from 'react';
import mqtt from 'mqtt';

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
  const pollingIntervalsRef = useRef({}); // NEW

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

  useEffect(() => {
    const client = mqtt.connect("wss://test.mosquitto.org:8081");
    mqttClientRef.current = client;

    client.on("connect", () => {
      console.log("MQTT connected");
      setMqttConnected(true);
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const { motor_id, temperature, vibration, timestamp, status, confidence } = data;
        if (!motor_id) return;

        const time = timestamp ? new Date(timestamp * 1000) : new Date();

        setMotors(prev =>
          prev.map(m =>
            m.id === motor_id
              ? {
                  ...m,
                  temperature: parseFloat(temperature),
                  vibration: parseFloat(vibration),
                  status: status || 'Online',
                  confidence: confidence || 0,
                  lastUpdated: time,
                }
              : m
          )
        );
      } catch (e) {
        console.error("MQTT error parsing", e);
      }
    });

    client.on("error", err => console.error("MQTT error", err));
    client.on("close", () => setMqttConnected(false));

    return () => {
      if (client.connected) client.end();
      subscribedTopicsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const client = mqttClientRef.current;
    if (!client || !client.connected) return;

    const desiredTopics = new Set(motors.map(m => `motors/${m.id}/data`));

    subscribedTopicsRef.current.forEach(topic => {
      if (!desiredTopics.has(topic)) {
        client.unsubscribe(topic);
        subscribedTopicsRef.current.delete(topic);
      }
    });

    motors.forEach(({ id }) => {
      const topic = `motors/${id}/data`;
      if (!subscribedTopicsRef.current.has(topic)) {
        client.subscribe(topic);
        subscribedTopicsRef.current.add(topic);
      }
    });
  }, [motors]);

  // 🧠 Poll FastAPI every 2s for each motor
  const pollMotorData = useCallback((motorId) => {
    if (pollingIntervalsRef.current[motorId]) return; // already polling

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/motors/${motorId.toLowerCase()}`);
        const data = await res.json();
        console.log(`Polling data for ${motorId.toLowerCase()}:`, data);
        if (!data || !data.temperature || !data.vibration) return;

        const newTemp = parseFloat(data.temperature);
        const newVib = parseFloat(data.vibration);
        const time = data.timestamp ? new Date(data.timestamp * 1000) : new Date();

        setMotors(prev =>
          prev.map(m =>
            m.id === motorId
              ? {
                  ...m,
                  temperature: newTemp,
                  vibration: newVib,
                  lastUpdated: time,
                }
              : m
          )
        );
      } catch (e) {
        console.error(`Polling error for ${motorId}`, e);
      }
    }, 2000); // every 2s

    pollingIntervalsRef.current[motorId] = interval;
  }, []);

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
    pollMotorData(motorId); // Start polling FastAPI
  }, [pollMotorData]);

  const removeMotor = useCallback((motorId) => {
    setMotors(prev => prev.filter(m => m.id !== motorId));
    setLiveMotorDataHistory(prev => {
      const updated = { ...prev };
      delete updated[motorId];
      return updated;
    });

    const topic = `motors/${motorId}/data`;
    if (mqttClientRef.current?.connected && subscribedTopicsRef.current.has(topic)) {
      mqttClientRef.current.unsubscribe(topic);
      subscribedTopicsRef.current.delete(topic);
    }

    // stop polling
    if (pollingIntervalsRef.current[motorId]) {
      clearInterval(pollingIntervalsRef.current[motorId]);
      delete pollingIntervalsRef.current[motorId];
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
