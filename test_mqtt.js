const mqtt = require('mqtt');

console.log('🔍 Testing MQTT Connection...');

const client = mqtt.connect('mqtt://test.mosquitto.org:1883', {
  keepalive: 60,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
});

client.on('connect', () => {
  console.log('✅ Connected to MQTT broker (Port 1883)');
  
  // Subscribe to all motor topics
  const topic = 'motors/+/data';
  client.subscribe(topic, (err) => {
    if (err) {
      console.error('❌ Failed to subscribe:', err);
    } else {
      console.log(`✅ Subscribed to: ${topic}`);
      console.log('📡 Listening for ESP32 data...');
      console.log('⏰ Waiting for messages...');
      
      // Test publish a message
      setTimeout(() => {
        const testPayload = {
          motor_id: "motor-001",
          temperature: 25.5,
          vibration: 1.2,
          timestamp: Math.floor(Date.now() / 1000),
          status: "Running",
          confidence: 90
        };
        
        console.log('🧪 Publishing test message...');
        client.publish('motors/motor-001/data', JSON.stringify(testPayload));
        console.log('✅ Test message published');
      }, 2000);
    }
  });
});

client.on('message', (topic, message) => {
  console.log('📨 Message received:');
  console.log('   Topic:', topic);
  console.log('   Message:', message.toString());
  
  try {
    const data = JSON.parse(message.toString());
    console.log('   Parsed data:', data);
  } catch (e) {
    console.log('   Raw message (not JSON):', message.toString());
  }
});

client.on('error', (err) => {
  console.error('❌ MQTT Error:', err);
});

client.on('close', () => {
  console.log('🔌 MQTT connection closed');
});

// Keep the script running
setTimeout(() => {
  console.log('⏰ Test completed. Closing connection...');
  client.end();
  process.exit(0);
}, 10000); 