# backend/api/live_data.py

from fastapi import APIRouter
from mqtt.mqtt_handler import latest_sensor_data

router = APIRouter()

@router.get("/data/latest")
def get_latest_data():
    return latest_sensor_data
