from fastapi import APIRouter
from pydantic import BaseModel
import random

router = APIRouter()

class SensorInput(BaseModel):
    temperature: float
    vibration: float

@router.post("/predict")
def predict_failure(data: SensorInput):
    # Replace this with real model later
    failure_chance = round(random.uniform(0, 1), 2)
    return {"failure_probability": failure_chance}
