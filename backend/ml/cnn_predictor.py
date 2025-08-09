import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CNNPredictor:
    def __init__(self, model_path: str = None):
        """Initialize CNN Predictor with trained model"""
        self.model = None
        self.scaler = None
        self.model_info = {
            'model_type': 'CNN',
            'version': '1.0.0',
            'features': ['temperature', 'vibration', 'acceleration_x', 'acceleration_y', 'acceleration_z'],
            'last_updated': datetime.now().isoformat()
        }
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            logger.warning("No model file found, using default predictions")
    
    def load_model(self, model_path: str):
        """Load trained model and scaler"""
        try:
            self.model = joblib.load(model_path)
            scaler_path = model_path.replace('.pkl', '_scaler.pkl')
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            logger.info(f"Model loaded successfully from {model_path}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
    
    def preprocess_data(self, data: Dict) -> np.ndarray:
        """Preprocess input data for prediction"""
        try:
            # Extract features
            features = []
            for feature in self.model_info['features']:
                if feature in data:
                    features.append(float(data[feature]))
                else:
                    features.append(0.0)  # Default value if missing
            
            # Normalize if scaler is available
            if self.scaler:
                features = self.scaler.transform([features])
            else:
                features = np.array([features])
            
            return features
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            return np.array([[0.0] * len(self.model_info['features'])])
    
    def predict_motor_health(self, sensor_data: Dict) -> Dict:
        """Predict motor health status from sensor data"""
        try:
            # Preprocess data
            processed_data = self.preprocess_data(sensor_data)
            
            # Make prediction
            if self.model:
                prediction = self.model.predict(processed_data)[0]
                confidence = self.model.predict_proba(processed_data)[0].max()
            else:
                # Fallback prediction based on rules
                prediction, confidence = self._rule_based_prediction(sensor_data)
            
            # Determine health status
            health_status = self._determine_health_status(prediction, confidence, sensor_data)
            
            return {
                'prediction': int(prediction),
                'confidence': float(confidence),
                'health_status': health_status,
                'timestamp': datetime.now().isoformat(),
                'recommendations': self._get_recommendations(health_status, sensor_data)
            }
        except Exception as e:
            logger.error(f"Error in motor health prediction: {e}")
            return {
                'prediction': 0,
                'confidence': 0.0,
                'health_status': 'Unknown',
                'timestamp': datetime.now().isoformat(),
                'recommendations': ['Unable to analyze data']
            }
    
    def _rule_based_prediction(self, sensor_data: Dict) -> Tuple[int, float]:
        """Rule-based prediction when ML model is not available"""
        try:
            temp = float(sensor_data.get('temperature', 0))
            vib = float(sensor_data.get('vibration', 0))
            
            # Simple rule-based logic
            if temp > 80 or vib > 10:
                return 1, 0.8  # Faulty
            elif temp > 60 or vib > 5:
                return 0, 0.6  # Warning
            else:
                return 0, 0.9  # Healthy
            
        except Exception as e:
            logger.error(f"Error in rule-based prediction: {e}")
            return 0, 0.5
    
    def _determine_health_status(self, prediction: int, confidence: float, sensor_data: Dict) -> str:
        """Determine health status based on prediction and sensor data"""
        try:
            temp = float(sensor_data.get('temperature', 0))
            vib = float(sensor_data.get('vibration', 0))
            
            if prediction == 1:
                if confidence > 0.8:
                    return 'Critical'
                else:
                    return 'Warning'
            else:
                if temp > 70 or vib > 8:
                    return 'Attention'
                elif temp > 50 or vib > 5:
                    return 'Normal'
                else:
                    return 'Excellent'
        except Exception as e:
            logger.error(f"Error determining health status: {e}")
            return 'Unknown'
    
    def _get_recommendations(self, health_status: str, sensor_data: Dict) -> List[str]:
        """Get recommendations based on health status"""
        recommendations = []
        
        try:
            temp = float(sensor_data.get('temperature', 0))
            vib = float(sensor_data.get('vibration', 0))
            
            if health_status == 'Critical':
                recommendations.extend([
                    'Immediate shutdown recommended',
                    'Contact maintenance team',
                    'Check for mechanical failures'
                ])
            elif health_status == 'Warning':
                recommendations.extend([
                    'Schedule maintenance soon',
                    'Monitor closely',
                    'Check lubrication'
                ])
            elif health_status == 'Attention':
                recommendations.extend([
                    'Monitor temperature and vibration',
                    'Check for unusual sounds',
                    'Consider preventive maintenance'
                ])
            elif health_status == 'Normal':
                recommendations.extend([
                    'Continue normal operation',
                    'Regular monitoring recommended'
                ])
            else:  # Excellent
                recommendations.extend([
                    'Optimal performance',
                    'Continue current maintenance schedule'
                ])
            
            # Add specific recommendations based on sensor values
            if temp > 70:
                recommendations.append('High temperature detected - check cooling system')
            if vib > 8:
                recommendations.append('High vibration detected - check alignment and bearings')
                
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            recommendations.append('Unable to generate specific recommendations')
        
        return recommendations
    
    def analyze_csv_data(self, csv_path: str) -> Dict:
        """Analyze CSV data file for batch predictions"""
        try:
            if not os.path.exists(csv_path):
                return {'error': 'CSV file not found'}
            
            df = pd.read_csv(csv_path)
            results = []
            
            for _, row in df.iterrows():
                sensor_data = row.to_dict()
                prediction = self.predict_motor_health(sensor_data)
                results.append(prediction)
            
            # Aggregate results
            total_predictions = len(results)
            healthy_count = sum(1 for r in results if r['prediction'] == 0)
            faulty_count = sum(1 for r in results if r['prediction'] == 1)
            
            return {
                'total_predictions': total_predictions,
                'healthy_count': healthy_count,
                'faulty_count': faulty_count,
                'health_percentage': (healthy_count / total_predictions * 100) if total_predictions > 0 else 0,
                'predictions': results
            }
            
        except Exception as e:
            logger.error(f"Error analyzing CSV data: {e}")
            return {'error': str(e)}
    
    def get_model_info(self) -> Dict:
        """Get model information"""
        return self.model_info
    
    def update_model(self, new_model_path: str):
        """Update model with new trained model"""
        try:
            self.load_model(new_model_path)
            self.model_info['last_updated'] = datetime.now().isoformat()
            logger.info("Model updated successfully")
        except Exception as e:
            logger.error(f"Error updating model: {e}")

# Global instance
cnn_predictor = CNNPredictor()

# Convenience functions for external use
def predict_motor_health(sensor_data: Dict) -> Dict:
    """Predict motor health from sensor data"""
    return cnn_predictor.predict_motor_health(sensor_data)

def analyze_csv_data(csv_path: str) -> Dict:
    """Analyze CSV data file"""
    return cnn_predictor.analyze_csv_data(csv_path)

def get_model_info() -> Dict:
    """Get model information"""
    return cnn_predictor.get_model_info()

def update_model(new_model_path: str):
    """Update model"""
    cnn_predictor.update_model(new_model_path)

if __name__ == "__main__":
    # Test the predictor
    test_data = {
        'temperature': 65.5,
        'vibration': 3.2,
        'acceleration_x': 0.1,
        'acceleration_y': 0.2,
        'acceleration_z': 9.8
    }
    
    result = predict_motor_health(test_data)
    print("Test Prediction Result:", result) 