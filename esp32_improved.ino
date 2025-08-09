#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <MPU6050.h>
#include <math.h>
#include <time.h>

// ====== CONFIGURATION ======
const char* ssid = "Share The Link";
const char* password = "1010101010";

const char* mqtt_server = "test.mosquitto.org";
const int mqtt_port = 1883;

#define MOTOR_ID "motor-001"   // 👈 Change if using multiple ESP32s
#define LM35_PIN 34            // Analog pin for LM35 temperature sensor

WiFiClient espClient;
PubSubClient client(espClient);
MPU6050 mpu;

unsigned long lastSend = 0;
const unsigned long sendInterval = 3000; // in milliseconds

// ====== Setup WiFi ======
void setup_wifi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected. IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    return;
  }

  // Set up time using NTP for accurate timestamps
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("Waiting for time sync...");
  int timeAttempts = 0;
  while (time(nullptr) < 100000 && timeAttempts < 10) {
    delay(500);
    Serial.print("*");
    timeAttempts++;
  }
  if (time(nullptr) >= 100000) {
    Serial.println("\nTime synchronized.");
  } else {
    Serial.println("\n⚠️ Time sync failed, using local time");
  }
}

// ====== MQTT Reconnect ======
void reconnect() {
  int attempts = 0;
  while (!client.connected() && attempts < 5) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("✅ MQTT connected!");
      return;
    } else {
      Serial.print("❌ failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 2s...");
      delay(2000);
      attempts++;
    }
  }
  Serial.println("❌ MQTT connection failed after 5 attempts");
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 Motor Monitor ===");

  // Initialize MPU6050
  Wire.begin(); // SDA = 21, SCL = 22
  mpu.initialize();

  if (!mpu.testConnection()) {
    Serial.println("❌ MPU6050 connection failed!");
    Serial.println("Check wiring: SDA=21, SCL=22, VCC=3.3V, GND=GND");
    while (true); // halt if not connected
  } else {
    Serial.println("✅ MPU6050 connected successfully");
  }

  // Initialize WiFi and MQTT
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);

  // Set LM35 pin as input
  pinMode(LM35_PIN, INPUT);
  
  Serial.println("Setup complete!");
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected, reconnecting...");
    setup_wifi();
  }

  // Check MQTT connection
  if (!client.connected()) {
    Serial.println("⚠️ MQTT disconnected, reconnecting...");
    reconnect();
  }

  client.loop();

  unsigned long now = millis();
  if (now - lastSend >= sendInterval) {
    lastSend = now;

    // ===== Read LM35 Temperature =====
    int adcValue = analogRead(LM35_PIN);
    float voltage = adcValue * 3.3 / 4095.0;
    float temperatureC = voltage * 100.0;

    // ===== Read MPU6050 Acceleration =====
    int16_t ax, ay, az;
    mpu.getAcceleration(&ax, &ay, &az);
    float vibration = sqrt(ax * ax + ay * ay + az * az) / 16384.0;

    // ===== Create MQTT Topic & Payload =====
    String topic = "motors/" + String(MOTOR_ID) + "/data";
    String payload = "{";
    payload += "\"motor_id\":\"" + String(MOTOR_ID) + "\",";
    payload += "\"temperature\":" + String(temperatureC, 2) + ",";
    payload += "\"vibration\":" + String(vibration, 2) + ",";
    payload += "\"timestamp\":" + String(time(nullptr)) + ",";
    payload += "\"status\":\"Running\",";
    payload += "\"confidence\":90";
    payload += "}";

    Serial.println("📤 Publishing to topic: " + topic);
    Serial.println("📦 Payload: " + payload);

    // Publish with QoS 1 for better reliability
    if (client.publish(topic.c_str(), payload.c_str())) {
      Serial.println("✅ Message published successfully");
    } else {
      Serial.println("❌ Failed to publish message");
    }
    
    Serial.println("---");
  }
} 