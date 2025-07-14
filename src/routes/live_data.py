# backend/routes/live_data.py
from fastapi import APIRouter
from backend.mqtt.mqtt_handler import latest_sensor_data

router = APIRouter()

@router.get("/live-data")
def get_live_sensor_data():
    return latest_sensor_data
