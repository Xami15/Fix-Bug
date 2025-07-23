# backend/api/predict.py

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class SensorInput(BaseModel):
    temperature: float
    vibration: float

@router.post("/predict")
def predict(input: SensorInput):
    # Replace this mock logic later with real model inference
    risk = "High" if input.vibration > 0.04 else "Low"
    return {
        "risk_level": risk,
        "temperature": input.temperature,
        "vibration": input.vibration
    }
