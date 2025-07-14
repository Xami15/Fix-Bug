# backend/mqtt/mqtt_handler.py

import time
import threading
import random

latest_sensor_data = {}

def generate_mock_data():
    global latest_sensor_data
    while True:
        latest_sensor_data = {
            "motor_id": "motor_1",
            "temperature": round(random.uniform(25, 40), 2),
            "vibration": round(random.uniform(0.01, 0.05), 3),
            "timestamp": int(time.time())
        }
        time.sleep(2)

def start_mqtt(mock_mode=False):
    if mock_mode:
        print("[MOCK MODE] Starting mock sensor data...")
        threading.Thread(target=generate_mock_data, daemon=True).start()
