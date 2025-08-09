"""
Prediction service module for motor fault detection system.

This module handles real-time predictions for API endpoints, providing
model loading and caching, input validation and preprocessing, and
confidence score calculation for motor fault classification.
"""

import os
import numpy as np
import tensorflow as tf
from typing import Dict, List, Optional, Tuple, Union
import logging
import json
import time
from datetime import datetime, timezone
import hashlib

from data_processor import DataProcessor
from batch_prediction_optimized import OptimizedBatchPredictor

logger = logging.getLogger(__name__)


class PredictionService:
    """
    Handles real-time predictions for motor fault detection API endpoints.
    
    Features:
    - Model loading and caching for efficient API responses
    - Input validation and preprocessing for prediction data
    - Single and batch prediction capabilities
    - Confidence score calculation and result formatting
    """
    
    def __init__(self, model_path: Optional[str] = None, data_path: str = ""):
        """
        Initialize the PredictionService.
        
        Args:
            model_path: Path to the trained model file (.keras)
            data_path: Path to data directory (for DataProcessor initialization)
        """
        self.model_path = model_path
        self.data_path = data_path
        self.model = None
        self.model_metadata = {}
        self.is_model_loaded = False
        
        # Initialize data processor for preprocessing
        self.data_processor = DataProcessor(data_path)
        
        # Fault categories matching the model output
        self.fault_categories = [
            'healthy',
            'bowed_rotor', 
            'faulty_bearing',
            'broken_rotor_bars',
            'rotor_misalignment',
            'rotor_unbalanced',
            'stator_winding',
            'voltage_unbalanced'
        ]
        
        # Model specifications
        self.expected_input_shape = (1681, 1)
        self.num_classes = 8
        
        # Performance tracking
        self.prediction_count = 0
        self.total_prediction_time = 0.0
        
        # Load model if path provided
        if model_path:
            self.load_model(model_path)
        
        logger.info("PredictionService initialized successfully")
    
    def load_model(self, model_path: str) -> bool:
        """
        Load trained model with caching for efficient API responses.
        
        Args:
            model_path: Path to the trained model file
            
        Returns:
            True if model loaded successfully, False otherwise
        """
        try:
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return False
            
            logger.info(f"Loading model from: {model_path}")
            
            # Load the TensorFlow model
            self.model = tf.keras.models.load_model(model_path)
            self.model_path = model_path
            self.is_model_loaded = True
            
            # Load metadata if available
            self._load_model_metadata(model_path)
            
            # Validate model architecture
            if not self._validate_model_architecture():
                logger.error("Model architecture validation failed")
                self.is_model_loaded = False
                return False
            
            logger.info("Model loaded and validated successfully")
            logger.info(f"Model input shape: {self.model.input_shape}")
            logger.info(f"Model output shape: {self.model.output_shape}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.is_model_loaded = False
            return False
    
    def _load_model_metadata(self, model_path: str) -> None:
        """
        Load model metadata if available.
        
        Args:
            model_path: Path to the model file
        """
        try:
            metadata_path = model_path.replace('.keras', '_metadata.json')
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    self.model_metadata = json.load(f)
                logger.info("Model metadata loaded successfully")
            else:
                logger.warning("No metadata file found for model")
                self.model_metadata = {}
                
        except Exception as e:
            logger.warning(f"Error loading model metadata: {str(e)}")
            self.model_metadata = {}
    
    def _validate_model_architecture(self) -> bool:
        """
        Validate that the loaded model has the expected architecture.
        
        Returns:
            True if architecture is valid, False otherwise
        """
        try:
            if self.model is None:
                return False
            
            # Check input shape
            expected_input = (None, 1681, 1)  # None for batch dimension
            if self.model.input_shape != expected_input:
                logger.error(f"Invalid input shape. Expected: {expected_input}, Got: {self.model.input_shape}")
                return False
            
            # Check output shape
            expected_output = (None, 8)  # None for batch dimension, 8 classes
            if self.model.output_shape != expected_output:
                logger.error(f"Invalid output shape. Expected: {expected_output}, Got: {self.model.output_shape}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating model architecture: {str(e)}")
            return False
    
    def _validate_input_data(self, sensor_data: np.ndarray) -> Tuple[bool, str]:
        """
        Validate input sensor data for prediction.
        
        Args:
            sensor_data: Input sensor data array
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check if data is numpy array
            if not isinstance(sensor_data, np.ndarray):
                return False, "Input data must be a numpy array"
            
            # Check for empty data
            if sensor_data.size == 0:
                return False, "Input data is empty"
            
            # Check for NaN or infinite values
            if np.isnan(sensor_data).any():
                return False, "Input data contains NaN values"
            
            if np.isinf(sensor_data).any():
                return False, "Input data contains infinite values"
            
            # For single prediction, expect 2D array (samples, features) or 1D array (features)
            if len(sensor_data.shape) == 1:
                # Single sample, should have 1681 features
                if sensor_data.shape[0] != 1681:
                    return False, f"Expected 1681 features for single sample, got {sensor_data.shape[0]}"
            elif len(sensor_data.shape) == 2:
                # Multiple samples or single sample with explicit sample dimension
                if sensor_data.shape[1] != 1681:
                    return False, f"Expected 1681 features per sample, got {sensor_data.shape[1]}"
            else:
                return False, f"Invalid data shape: {sensor_data.shape}. Expected 1D or 2D array"
            
            return True, ""
            
        except Exception as e:
            return False, f"Error validating input data: {str(e)}"
    
    def _preprocess_input_data(self, sensor_data: np.ndarray) -> np.ndarray:
        """
        Preprocess input data for model prediction.
        
        Args:
            sensor_data: Raw sensor data array
            
        Returns:
            Preprocessed data array ready for model input
        """
        try:
            # Ensure data is 2D (samples, features)
            if len(sensor_data.shape) == 1:
                sensor_data = sensor_data.reshape(1, -1)
            
            # Apply normalization (same as training data)
            normalized_data = self.data_processor.normalize_data(sensor_data)
            
            # Reshape for CNN input: (samples, timesteps, features)
            # CNN expects (batch_size, 1681, 1)
            preprocessed_data = normalized_data.reshape(-1, 1681, 1)
            
            return preprocessed_data
            
        except Exception as e:
            logger.error(f"Error preprocessing input data: {str(e)}")
            raise   
 
    def predict_single(self, sensor_data: np.ndarray) -> Dict:
        """
        Make prediction on individual sensor data.
        
        Args:
            sensor_data: Single sensor reading array (1681 features)
            
        Returns:
            Dictionary containing prediction results and metadata
        """
        try:
            start_time = time.time()
            
            # Check if model is loaded
            if not self.is_model_loaded or self.model is None:
                raise ValueError("Model not loaded. Call load_model() first.")
            
            # Validate input data
            is_valid, error_msg = self._validate_input_data(sensor_data)
            if not is_valid:
                raise ValueError(f"Input validation failed: {error_msg}")
            
            # Preprocess input data
            preprocessed_data = self._preprocess_input_data(sensor_data)
            
            # Make prediction
            prediction_probs = self.model.predict(preprocessed_data, verbose=0)
            
            # Get predicted class
            predicted_class_idx = np.argmax(prediction_probs[0])
            predicted_class = self.fault_categories[predicted_class_idx]
            
            # Calculate confidence scores
            confidence_scores = self.get_confidence_scores(prediction_probs[0])
            
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Update performance tracking
            self.prediction_count += 1
            self.total_prediction_time += processing_time
            
            # Generate data hash for tracking
            data_hash = hashlib.md5(sensor_data.tobytes()).hexdigest()
            
            # Prepare result
            result = {
                'prediction': predicted_class,
                'predicted_class_index': int(predicted_class_idx),
                'confidence_scores': confidence_scores,
                'max_confidence': float(np.max(prediction_probs[0])),
                'processing_time_ms': round(processing_time, 2),
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'data_hash': data_hash,
                'model_info': {
                    'model_path': self.model_path,
                    'model_version': self.model_metadata.get('version_info', {}).get('model_version', 'unknown')
                }
            }
            
            logger.info(f"Single prediction completed: {predicted_class} (confidence: {result['max_confidence']:.4f})")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in single prediction: {str(e)}")
            raise
    
    def get_confidence_scores(self, prediction_probs: np.ndarray) -> Dict[str, float]:
        """
        Convert model probabilities to percentage confidence scores.
        
        Args:
            prediction_probs: Model output probabilities array
            
        Returns:
            Dictionary mapping fault categories to confidence percentages
        """
        try:
            confidence_dict = {}
            
            for i, category in enumerate(self.fault_categories):
                # Convert to percentage and round to 2 decimal places
                confidence_percentage = round(float(prediction_probs[i]) * 100, 2)
                confidence_dict[category] = confidence_percentage
            
            return confidence_dict
            
        except Exception as e:
            logger.error(f"Error calculating confidence scores: {str(e)}")
            raise
    
    def predict_batch(self, sensor_data_list: List[np.ndarray], use_optimization: bool = True, 
                     chunk_size: int = 8, save_visualizations: bool = True, 
                     output_dir: str = "batch_predictions") -> Dict:
        """
        Make predictions on multiple sensor readings with enhanced performance optimizations,
        visualization, and result saving capabilities.
        
        Args:
            sensor_data_list: List of sensor data arrays
            use_optimization: Whether to use vectorized batch processing
            chunk_size: Size of chunks for processing large batches (reduced for stability)
            save_visualizations: Whether to save prediction visualizations
            output_dir: Directory to save visualizations and results
            
        Returns:
            Dictionary containing batch prediction results and metadata
        """
        try:
            # Use the optimized batch predictor for better stability
            if not hasattr(self, '_batch_predictor'):
                self._batch_predictor = OptimizedBatchPredictor(self)
            
            return self._batch_predictor.predict_batch_optimized(
                sensor_data_list=sensor_data_list,
                chunk_size=chunk_size,
                save_visualizations=save_visualizations,
                output_dir=output_dir
            )
            
        except Exception as e:
            logger.error(f"Error in batch prediction: {str(e)}")
            raise
    
    def is_ready(self) -> bool:
        """
        Check if the prediction service is ready to make predictions.
        
        Returns:
            True if service is ready, False otherwise
        """
        return self.is_model_loaded and self.model is not None
    
    def get_model_info(self) -> Dict:
        """
        Get information about the loaded model.
        
        Returns:
            Dictionary containing model information
        """
        info = {
            'is_loaded': self.is_model_loaded,
            'model_path': self.model_path,
            'fault_categories': self.fault_categories,
            'num_classes': self.num_classes,
            'expected_input_shape': self.expected_input_shape,
            'prediction_count': self.prediction_count,
            'average_prediction_time_ms': 0.0
        }
        
        if self.prediction_count > 0:
            info['average_prediction_time_ms'] = round(
                self.total_prediction_time / self.prediction_count, 2
            )
        
        if self.is_model_loaded and self.model is not None:
            info['model_input_shape'] = self.model.input_shape
            info['model_output_shape'] = self.model.output_shape
            info['total_params'] = self.model.count_params()
        
        if self.model_metadata:
            info['metadata'] = self.model_metadata
        
        return info
    
    def reset_performance_stats(self) -> None:
        """Reset performance tracking statistics."""
        self.prediction_count = 0
        self.total_prediction_time = 0.0
        logger.info("Performance statistics reset")