import time
import json
import random
import paho.mqtt.client as mqtt

broker = "test.mosquitto.org"
port = 1883
client = mqtt.Client()

client.connect(broker, port, 60)

motor_ids = [f"motor_{i+1}" for i in range(10)]

try:
    while True:
        for motor_id in motor_ids:
            data = {
                "motor_id": motor_id,
                "temperature": round(random.uniform(30, 80), 2),
                "vibration": round(random.uniform(0, 10), 2),
                "timestamp": time.time()
            }
            topic = f"motors/{motor_id}/data"
            client.publish(topic, json.dumps(data))
            print(f"Published data to {topic}: {data}")
        time.sleep(2)  # send every 2 seconds
except KeyboardInterrupt:
    print("Stopped publishing")
    client.disconnect()
