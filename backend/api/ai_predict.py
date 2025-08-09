from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import sys
import os
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Add the ml directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ml'))

try:
    from cnn_predictor import predict_motor_health, analyze_csv_data, get_model_info
except ImportError as e:
    print(f"Warning: Could not import CNN predictor: {e}")
    # Fallback functions
    def predict_motor_health(motor_data):
        return []
    def analyze_csv_data(csv_data):
        return []
    def get_model_info():
        return {"error": "CNN predictor not available"}

# Pydantic models for request/response
class MotorData(BaseModel):
    motor_id: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    temperature: Optional[float] = 25.0
    vibration: Optional[float] = 3.0
    acceleration_x: Optional[float] = 0.0
    acceleration_y: Optional[float] = 0.0
    acceleration_z: Optional[float] = 9.8
    current: Optional[float] = 5.0
    speed: Optional[float] = 1500.0
    timestamp: Optional[str] = None

class RealtimePredictionRequest(BaseModel):
    motors: List[MotorData]

class CSVAnalysisRequest(BaseModel):
    csv_data: List[Dict[str, Any]]

class PredictionResponse(BaseModel):
    success: bool
    predictions: Optional[List[Dict[str, Any]]] = None
    results: Optional[List[Dict[str, Any]]] = None
    prediction: Optional[Dict[str, Any]] = None
    timestamp: str
    model_info: Optional[Dict[str, Any]] = None
    total_records: Optional[int] = None
    error: Optional[str] = None

class ModelInfoResponse(BaseModel):
    success: bool
    model_info: Dict[str, Any]
    timestamp: str

class HealthResponse(BaseModel):
    success: bool
    status: str
    model_loaded: bool
    timestamp: str
    error: Optional[str] = None

# Create FastAPI router
ai_predict_router = APIRouter(prefix="/ai", tags=["AI Predictions"])

@ai_predict_router.post("/predict/realtime", response_model=PredictionResponse)
async def predict_realtime(request: RealtimePredictionRequest):
    """Predict motor health for real-time data using CNN model"""
    try:
        # Convert Pydantic models to dictionaries
        motors = [motor.dict() for motor in request.motors]
        
        # Process each motor with the CNN predictor
        predictions = []
        for motor in motors:
            # Prepare sensor data for ML analysis
            sensor_data = {
                'temperature': motor.get('temperature', 0),
                'vibration': motor.get('vibration', 0),
                'acceleration_x': motor.get('acceleration_x', 0),
                'acceleration_y': motor.get('acceleration_y', 0),
                'acceleration_z': motor.get('acceleration_z', 9.8)
            }
            
            # Get prediction from CNN model
            prediction_result = predict_motor_health(sensor_data)
            
            # Format the response
            motor_prediction = {
                'motor_id': motor.get('motor_id') or motor.get('id'),
                'motor_name': motor.get('name', f"Motor {motor.get('motor_id') or motor.get('id')}"),
                'prediction': prediction_result.get('prediction', 0),
                'confidence': prediction_result.get('confidence', 0.0),
                'health_status': prediction_result.get('health_status', 'Unknown'),
                'recommendations': prediction_result.get('recommendations', []),
                'risk_score': prediction_result.get('prediction', 0) * prediction_result.get('confidence', 0.0),
                'timestamp': motor.get('timestamp') or datetime.now().isoformat(),
                'features': sensor_data
            }
            
            predictions.append(motor_prediction)
        
        return PredictionResponse(
            success=True,
            predictions=predictions,
            timestamp=datetime.now().isoformat(),
            model_info=get_model_info()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@ai_predict_router.post("/predict/csv", response_model=PredictionResponse)
async def predict_csv(csv_data: CSVAnalysisRequest):
    """Analyze CSV data for historical predictions"""
    try:
        # Validate CSV data
        if not csv_data.csv_data:
            raise HTTPException(status_code=400, detail="CSV data is empty")
        
        # Check for required columns
        required_columns = ['temperature', 'vibration']
        first_row = csv_data.csv_data[0] if csv_data.csv_data else {}
        
        missing_columns = [col for col in required_columns if col not in first_row]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Analyze CSV data
        results = analyze_csv_data(csv_data.csv_data)
        
        return PredictionResponse(
            success=True,
            results=results,
            total_records=len(csv_data.csv_data),
            timestamp=datetime.now().isoformat(),
            model_info=get_model_info()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV analysis failed: {str(e)}")

@ai_predict_router.post("/predict/csv-upload", response_model=PredictionResponse)
async def predict_csv_upload(file: UploadFile = File(...)):
    """Analyze uploaded CSV file"""
    try:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be a CSV")
        
        # Read CSV file
        try:
            contents = await file.read()
            df = pd.read_csv(contents)
            csv_data = df.to_dict('records')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading CSV file: {str(e)}")
        
        # Validate CSV data
        if not csv_data:
            raise HTTPException(status_code=400, detail="CSV data is empty")
        
        # Check for required columns
        required_columns = ['temperature', 'vibration']
        first_row = csv_data[0] if csv_data else {}
        
        missing_columns = [col for col in required_columns if col not in first_row]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Analyze CSV data
        results = analyze_csv_data(csv_data)
        
        return PredictionResponse(
            success=True,
            results=results,
            total_records=len(csv_data),
            timestamp=datetime.now().isoformat(),
            model_info=get_model_info()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV analysis failed: {str(e)}")

@ai_predict_router.get("/model/info", response_model=ModelInfoResponse)
async def model_info():
    """Get information about the AI model"""
    try:
        info = get_model_info()
        
        return ModelInfoResponse(
            success=True,
            model_info=info,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

@ai_predict_router.post("/predict/single", response_model=PredictionResponse)
async def predict_single_motor(motor: MotorData):
    """Predict health for a single motor"""
    try:
        # Convert to list for the predictor
        motor_data = [motor.dict()]
        
        # Get prediction
        predictions = predict_motor_health(motor_data)
        
        if not predictions:
            raise HTTPException(status_code=500, detail="Failed to generate prediction")
        
        return PredictionResponse(
            success=True,
            prediction=predictions[0],
            timestamp=datetime.now().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Single prediction failed: {str(e)}")

@ai_predict_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for AI service"""
    try:
        model_info = get_model_info()
        
        return HealthResponse(
            success=True,
            status="healthy",
            model_loaded=model_info.get('model_loaded', False),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        return HealthResponse(
            success=False,
            status="unhealthy",
            model_loaded=False,
            timestamp=datetime.now().isoformat(),
            error=str(e)
        ) 