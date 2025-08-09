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

from .data_processor import DataProcessor
from .cnn_model import CNN1D
from .batch_prediction_optimized import OptimizedBatchPredictor

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
    
    def validate_prediction_result(self, result: Dict) -> Tuple[bool, str]:
        """
        Validate prediction result format and content.
        
        Args:
            result: Prediction result dictionary
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check required fields
            required_fields = [
                'prediction', 'predicted_class_index', 'confidence_scores',
                'max_confidence', 'processing_time_ms', 'timestamp'
            ]
            
            for field in required_fields:
                if field not in result:
                    return False, f"Missing required field: {field}"
            
            # Validate prediction is a valid fault category
            if result['prediction'] not in self.fault_categories:
                return False, f"Invalid prediction category: {result['prediction']}"
            
            # Validate predicted class index
            if not (0 <= result['predicted_class_index'] < self.num_classes):
                return False, f"Invalid predicted class index: {result['predicted_class_index']}"
            
            # Validate confidence scores
            confidence_scores = result['confidence_scores']
            if not isinstance(confidence_scores, dict):
                return False, "Confidence scores must be a dictionary"
            
            # Check that all fault categories are present first
            for category in self.fault_categories:
                if category not in confidence_scores:
                    return False, f"Missing confidence score for category: {category}"
            
            if len(confidence_scores) != self.num_classes:
                return False, f"Expected {self.num_classes} confidence scores, got {len(confidence_scores)}"
            
            # Validate confidence values are between 0 and 100
            for category, confidence in confidence_scores.items():
                if not (0 <= confidence <= 100):
                    return False, f"Invalid confidence value for {category}: {confidence}"
            
            # Validate max confidence
            max_conf = result['max_confidence']
            if not (0 <= max_conf <= 1):
                return False, f"Invalid max confidence value: {max_conf}"
            
            return True, ""
            
        except Exception as e:
            return False, f"Error validating prediction result: {str(e)}"
    
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
    
    def is_ready(self) -> bool:
        """
        Check if the prediction service is ready to make predictions.
        
        Returns:
            True if service is ready, False otherwise
        """
        return self.is_model_loaded and self.model is not None
    
    def format_prediction_result(self, prediction_result: Dict, include_metadata: bool = True) -> Dict:
        """
        Format prediction result for API response with enhanced formatting.
        
        Args:
            prediction_result: Raw prediction result from predict_single
            include_metadata: Whether to include metadata in the response
            
        Returns:
            Formatted prediction result
        """
        try:
            # Basic formatted result
            formatted_result = {
                'prediction': {
                    'fault_category': prediction_result['prediction'],
                    'class_index': prediction_result['predicted_class_index'],
                    'confidence': round(prediction_result['max_confidence'] * 100, 2)
                },
                'confidence_scores': prediction_result['confidence_scores'],
                'processing_info': {
                    'processing_time_ms': prediction_result['processing_time_ms'],
                    'timestamp': prediction_result['timestamp']
                }
            }
            
            # Add severity assessment based on fault category
            severity_map = {
                'healthy': 'normal',
                'bowed_rotor': 'high',
                'faulty_bearing': 'critical',
                'broken_rotor_bars': 'critical',
                'rotor_misalignment': 'medium',
                'rotor_unbalanced': 'medium',
                'stator_winding': 'high',
                'voltage_unbalanced': 'medium'
            }
            
            formatted_result['prediction']['severity'] = severity_map.get(
                prediction_result['prediction'], 'unknown'
            )
            
            # Add confidence level assessment
            confidence_pct = prediction_result['max_confidence'] * 100
            if confidence_pct >= 90:
                confidence_level = 'very_high'
            elif confidence_pct >= 75:
                confidence_level = 'high'
            elif confidence_pct >= 60:
                confidence_level = 'medium'
            elif confidence_pct >= 40:
                confidence_level = 'low'
            else:
                confidence_level = 'very_low'
            
            formatted_result['prediction']['confidence_level'] = confidence_level
            
            # Add top 3 predictions for additional context
            confidence_items = list(prediction_result['confidence_scores'].items())
            confidence_items.sort(key=lambda x: x[1], reverse=True)
            formatted_result['top_predictions'] = [
                {
                    'fault_category': category,
                    'confidence': confidence,
                    'severity': severity_map.get(category, 'unknown')
                }
                for category, confidence in confidence_items[:3]
            ]
            
            # Include metadata if requested
            if include_metadata:
                formatted_result['metadata'] = {
                    'data_hash': prediction_result['data_hash'],
                    'model_info': prediction_result['model_info']
                }
            
            return formatted_result
            
        except Exception as e:
            logger.error(f"Error formatting prediction result: {str(e)}")
            raise
    
    def get_confidence_scores_with_ranking(self, prediction_probs: np.ndarray) -> Dict:
        """
        Get confidence scores with ranking and additional analysis.
        
        Args:
            prediction_probs: Model output probabilities array
            
        Returns:
            Dictionary with confidence scores, rankings, and analysis
        """
        try:
            # Get basic confidence scores
            confidence_scores = self.get_confidence_scores(prediction_probs)
            
            # Create ranked list
            ranked_scores = sorted(
                confidence_scores.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            
            # Calculate confidence distribution metrics
            values = list(confidence_scores.values())
            max_confidence = max(values)
            second_max = sorted(values, reverse=True)[1] if len(values) > 1 else 0
            confidence_gap = max_confidence - second_max
            
            # Determine prediction certainty
            if max_confidence >= 90:
                certainty = 'very_certain'
            elif max_confidence >= 75 and confidence_gap >= 20:
                certainty = 'certain'
            elif max_confidence >= 60 and confidence_gap >= 15:
                certainty = 'moderately_certain'
            elif max_confidence >= 40:
                certainty = 'uncertain'
            else:
                certainty = 'very_uncertain'
            
            return {
                'confidence_scores': confidence_scores,
                'ranked_predictions': [
                    {'category': category, 'confidence': confidence, 'rank': i+1}
                    for i, (category, confidence) in enumerate(ranked_scores)
                ],
                'analysis': {
                    'max_confidence': max_confidence,
                    'confidence_gap': round(confidence_gap, 2),
                    'certainty_level': certainty,
                    'entropy': self._calculate_entropy(prediction_probs)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting confidence scores with ranking: {str(e)}")
            raise
    
    def _calculate_entropy(self, probabilities: np.ndarray) -> float:
        """
        Calculate entropy of prediction probabilities.
        
        Args:
            probabilities: Prediction probabilities
            
        Returns:
            Entropy value
        """
        try:
            # Avoid log(0) by adding small epsilon
            epsilon = 1e-10
            probabilities = probabilities + epsilon
            entropy = -np.sum(probabilities * np.log2(probabilities))
            return round(float(entropy), 4)
            
        except Exception as e:
            logger.error(f"Error calculating entropy: {str(e)}")
            return 0.0
    
    def validate_and_format_result(self, prediction_result: Dict) -> Tuple[bool, Dict, str]:
        """
        Validate prediction result and return formatted version.
        
        Args:
            prediction_result: Raw prediction result
            
        Returns:
            Tuple of (is_valid, formatted_result, error_message)
        """
        try:
            # Validate the result first
            is_valid, error_msg = self.validate_prediction_result(prediction_result)
            
            if not is_valid:
                return False, {}, error_msg
            
            # Format the result
            formatted_result = self.format_prediction_result(prediction_result)
            
            return True, formatted_result, ""
            
        except Exception as e:
            error_msg = f"Error validating and formatting result: {str(e)}"
            logger.error(error_msg)
            return False, {}, error_msg
    
    def create_error_response(self, error_message: str, error_code: str = "PREDICTION_ERROR") -> Dict:
        """
        Create standardized error response format.
        
        Args:
            error_message: Error description
            error_code: Error code identifier
            
        Returns:
            Formatted error response
        """
        return {
            'success': False,
            'error': {
                'code': error_code,
                'message': error_message,
                'timestamp': datetime.now(timezone.utc).isoformat()
            },
            'prediction': None,
            'confidence_scores': None
        }
    
    def create_success_response(self, prediction_result: Dict, include_metadata: bool = True) -> Dict:
        """
        Create standardized success response format.
        
        Args:
            prediction_result: Prediction result from predict_single
            include_metadata: Whether to include metadata
            
        Returns:
            Formatted success response
        """
        try:
            formatted_result = self.format_prediction_result(prediction_result, include_metadata)
            
            return {
                'success': True,
                'error': None,
                'prediction': formatted_result['prediction'],
                'confidence_scores': formatted_result['confidence_scores'],
                'top_predictions': formatted_result['top_predictions'],
                'processing_info': formatted_result['processing_info'],
                'metadata': formatted_result.get('metadata', {}) if include_metadata else {}
            }
            
        except Exception as e:
            logger.error(f"Error creating success response: {str(e)}")
            return self.create_error_response(
                f"Error formatting response: {str(e)}", 
                "RESPONSE_FORMATTING_ERROR"
            )
    
    def get_health_status(self) -> Dict:
        """
        Get health status of the prediction service.
        
        Returns:
            Dictionary containing health status information
        """
        status = {
            'status': 'healthy' if self.is_ready() else 'unhealthy',
            'is_model_loaded': self.is_model_loaded,
            'model_path': self.model_path,
            'prediction_count': self.prediction_count,
            'uptime_info': {
                'total_predictions': self.prediction_count,
                'average_response_time_ms': 0.0
            }
        }
        
        if self.prediction_count > 0:
            status['uptime_info']['average_response_time_ms'] = round(
                self.total_prediction_time / self.prediction_count, 2
            )
        
        # Add any error conditions
        errors = []
        if not self.is_model_loaded:
            errors.append("Model not loaded")
        if self.model is None:
            errors.append("Model object is None")
        
        status['errors'] = errors
        
        return status
    
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
            raise         chunk_data = sensor_data_list[chunk_start:chunk_end]
                chunk_num = chunk_start // chunk_size + 1
                
                logger.info(f"Processing chunk {chunk_num}/{(len(sensor_data_list) + chunk_size - 1) // chunk_size}: samples {chunk_start}-{chunk_end-1}")
                
                try:
                    # Process chunk with memory management
                    chunk_start_time = time.time()
                    chunk_result = self._predict_batch_vectorized(chunk_data, chunk_start)
                    chunk_time = (time.time() - chunk_start_time) * 1000
                    processing_times.append(chunk_time)
                    
                    # Collect results
                    batch_results.extend(chunk_result['results'])
                    batch_errors.extend(chunk_result['errors'])
                    
                    # Collect data for visualization
                    for result in chunk_result['results']:
                        if result.get('success', False):
                            all_predictions.append(result['prediction'])
                            all_confidences.append(result['max_confidence'])
                    
                    # Force garbage collection after each chunk
                    gc.collect()
                    
                    logger.debug(f"Chunk {chunk_num} completed in {chunk_time:.2f}ms")
                    
                except Exception as e:
                    logger.error(f"Error processing chunk {chunk_num}: {str(e)}")
                    # Create error results for this chunk
                    for i in range(len(chunk_data)):
                        error_result = {
                            'sample_index': chunk_start + i,
                            'error': f"Chunk processing failed: {str(e)}",
                            'prediction': None,
                            'confidence_scores': None,
                            'success': False
                        }
                        batch_results.append(error_result)
                        batch_errors.append(error_result)
            
            # Calculate batch processing metrics
            total_batch_time = (time.time() - start_time) * 1000
            successful_predictions = [r for r in batch_results if r.get('success', False)]
            
            batch_summary = {
                'total_samples': len(sensor_data_list),
                'successful_predictions': len(successful_predictions),
                'failed_predictions': len(batch_errors),
                'success_rate': len(successful_predictions) / len(sensor_data_list) * 100 if sensor_data_list else 0,
                'total_processing_time_ms': round(total_batch_time, 2),
                'average_time_per_sample_ms': round(total_batch_time / len(sensor_data_list), 2) if sensor_data_list else 0,
                'throughput_samples_per_second': round(len(sensor_data_list) / (total_batch_time / 1000), 2) if total_batch_time > 0 else 0,
                'chunk_size': chunk_size,
                'total_chunks': len(processing_times),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Generate and save visualizations if requested
            if save_visualizations and all_predictions:
                try:
                    self._create_batch_visualizations(
                        all_predictions, all_confidences, batch_summary, 
                        processing_times, output_dir
                    )
                    logger.info(f"Visualizations saved to {output_dir}")
                except Exception as e:
                    logger.warning(f"Failed to create visualizations: {str(e)}")
            
            # Save batch results to file
            if save_visualizations:
                try:
                    self._save_batch_results(batch_results, batch_summary, output_dir)
                    logger.info(f"Batch results saved to {output_dir}")
                except Exception as e:
                    logger.warning(f"Failed to save batch results: {str(e)}")
            
            logger.info(f"Batch prediction completed: {len(successful_predictions)}/{len(sensor_data_list)} successful")
            logger.info(f"Throughput: {batch_summary['throughput_samples_per_second']:.2f} samples/second")
            
            return {
                'results': batch_results,
                'summary': batch_summary,
                'errors': batch_errors,
                'visualizations_saved': save_visualizations,
                'output_directory': output_dir if save_visualizations else None
            }
            
        except Exception as e:
            logger.error(f"Error in batch prediction: {str(e)}")
            raise

    def _predict_batch_chunked(self, sensor_data_list: List[np.ndarray], chunk_size: int = 32) -> Dict:
        """
        Process large batches in chunks for memory efficiency and better performance.
        
        Args:
            sensor_data_list: List of sensor data arrays
            chunk_size: Size of each processing chunk
            
        Returns:
            Dictionary containing batch prediction results
        """
        try:
            start_time = time.time()
            all_results = []
            all_errors = []
            total_successful = 0
            
            logger.info(f"Processing {len(sensor_data_list)} samples in chunks of {chunk_size}")
            
            # Process data in chunks
            for chunk_start in range(0, len(sensor_data_list), chunk_size):
                chunk_end = min(chunk_start + chunk_size, len(sensor_data_list))
                chunk_data = sensor_data_list[chunk_start:chunk_end]
                
                logger.debug(f"Processing chunk {chunk_start//chunk_size + 1}: samples {chunk_start}-{chunk_end-1}")
                
                # Process chunk using optimized batch prediction
                chunk_result = self.predict_batch_optimized(chunk_data)
                
                # Adjust sample indices to reflect position in original list
                for result in chunk_result['results']:
                    if 'sample_index' in result:
                        result['sample_index'] += chunk_start
                
                # Accumulate results
                all_results.extend(chunk_result['results'])
                all_errors.extend(chunk_result['errors'])
                total_successful += chunk_result['summary']['successful_predictions']
            
            # Calculate total processing time
            total_batch_time = (time.time() - start_time) * 1000
            
            # Create comprehensive batch summary
            batch_summary = {
                'total_samples': len(sensor_data_list),
                'successful_predictions': total_successful,
                'failed_predictions': len(all_errors),
                'success_rate': total_successful / len(sensor_data_list) * 100,
                'total_processing_time_ms': round(total_batch_time, 2),
                'average_time_per_sample_ms': round(total_batch_time / len(sensor_data_list), 2),
                'throughput_samples_per_second': round(len(sensor_data_list) / (total_batch_time / 1000), 2),
                'chunk_size': chunk_size,
                'total_chunks': (len(sensor_data_list) + chunk_size - 1) // chunk_size,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Chunked batch prediction completed: {total_successful}/{len(sensor_data_list)} successful")
            logger.info(f"Throughput: {batch_summary['throughput_samples_per_second']:.2f} samples/second")
            
            return {
                'results': all_results,
                'summary': batch_summary,
                'errors': all_errors
            }
            
        except Exception as e:
            logger.error(f"Error in batch prediction: {str(e)}")
            raise
                    batch_errors.append(error_result)
                    logger.error(f"Error processing sample {i}: {str(e)}")
            
            # Calculate batch processing time
            total_processing_time = (time.time() - start_time) * 1000
            
            # Add batch summary information
            successful_predictions = len(batch_results) - len(batch_errors)
            batch_summary = {
                'batch_info': {
                    'total_samples': len(sensor_data_list),
                    'successful_predictions': successful_predictions,
                    'failed_predictions': len(batch_errors),
                    'success_rate': round((successful_predictions / len(sensor_data_list)) * 100, 2),
                    'total_processing_time_ms': round(total_processing_time, 2),
                    'average_time_per_sample_ms': round(total_processing_time / len(sensor_data_list), 2),
                    'throughput_samples_per_second': round(len(sensor_data_list) / (total_processing_time / 1000), 2),
                    'processing_method': 'individual',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                },
                'results': batch_results,
                'errors': batch_errors if batch_errors else None
            }
            
            logger.info(f"Batch prediction completed: {successful_predictions}/{len(sensor_data_list)} successful")
            
            return batch_summary
            
        except Exception as e:
            logger.error(f"Error in batch prediction: {str(e)}")
            raise
    
    def _predict_batch_chunked(self, sensor_data_list: List[np.ndarray], chunk_size: int = 32) -> Dict:
        """
        Process large batches in chunks for memory efficiency and better performance.
        
        Args:
            sensor_data_list: List of sensor data arrays
            chunk_size: Size of each processing chunk
            
        Returns:
            Dictionary containing batch prediction results
        """
        try:
            start_time = time.time()
            all_results = []
            all_errors = []
            total_successful = 0
            
            # Process data in chunks
            for chunk_start in range(0, len(sensor_data_list), chunk_size):
                chunk_end = min(chunk_start + chunk_size, len(sensor_data_list))
                chunk_data = sensor_data_list[chunk_start:chunk_end]
                
                logger.debug(f"Processing chunk {chunk_start//chunk_size + 1}: samples {chunk_start}-{chunk_end-1}")
                
                # Process chunk using optimized batch prediction
                chunk_result = self.predict_batch_optimized(chunk_data)
                
                # Adjust sample indices to reflect position in full batch
                for result in chunk_result['results']:
                    if result is not None:
                        result['sample_index'] += chunk_start
                
                # Collect results
                all_results.extend(chunk_result['results'])
                if chunk_result.get('errors'):
                    # Adjust error indices
                    for error in chunk_result['errors']:
                        error['sample_index'] += chunk_start
                    all_errors.extend(chunk_result['errors'])
                
                total_successful += chunk_result['batch_info']['successful_predictions']
            
            # Calculate total processing time
            total_processing_time = (time.time() - start_time) * 1000
            
            # Create comprehensive batch summary
            batch_summary = {
                'batch_info': {
                    'total_samples': len(sensor_data_list),
                    'successful_predictions': total_successful,
                    'failed_predictions': len(all_errors),
                    'success_rate': round((total_successful / len(sensor_data_list)) * 100, 2),
                    'total_processing_time_ms': round(total_processing_time, 2),
                    'average_time_per_sample_ms': round(total_processing_time / len(sensor_data_list), 2),
                    'throughput_samples_per_second': round(len(sensor_data_list) / (total_processing_time / 1000), 2),
                    'processing_method': 'chunked_optimized',
                    'chunk_size': chunk_size,
                    'total_chunks': (len(sensor_data_list) + chunk_size - 1) // chunk_size,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                },
                'results': all_results,
                'errors': all_errors if all_errors else None
            }
            
            logger.info(f"Chunked batch prediction completed: {total_successful}/{len(sensor_data_list)} successful in {len(all_results)//chunk_size + 1} chunks")
            
            return batch_summary
            
        except Exception as e:
            logger.error(f"Error in chunked batch prediction: {str(e)}")
            raise
    
    def predict_batch_optimized(self, sensor_data_list: List[np.ndarray]) -> List[Dict]:
        """
        Optimized batch prediction using vectorized operations.
        
        Args:
            sensor_data_list: List of sensor data arrays
            
        Returns:
            List of prediction result dictionaries
        """
        try:
            start_time = time.time()
            
            # Check if model is loaded
            if not self.is_model_loaded or self.model is None:
                raise ValueError("Model not loaded. Call load_model() first.")
            
            if not sensor_data_list:
                raise ValueError("Empty sensor data list provided")
            
            logger.info(f"Starting optimized batch prediction for {len(sensor_data_list)} samples")
            
            # Validate all inputs first
            valid_indices = []
            valid_data = []
            invalid_results = []
            
            for i, sensor_data in enumerate(sensor_data_list):
                is_valid, error_msg = self._validate_input_data(sensor_data)
                if is_valid:
                    valid_indices.append(i)
                    valid_data.append(sensor_data)
                else:
                    invalid_results.append({
                        'sample_index': i,
                        'error': f"Input validation failed: {error_msg}",
                        'prediction': None,
                        'confidence_scores': None
                    })
            
            batch_results = [None] * len(sensor_data_list)
            
            # Place invalid results in their correct positions
            for invalid_result in invalid_results:
                batch_results[invalid_result['sample_index']] = invalid_result
            
            if valid_data:
                # Stack valid data for batch processing
                batch_data = np.stack(valid_data)
                
                # Preprocess batch data
                preprocessed_batch = self._preprocess_input_data(batch_data)
                
                # Make batch prediction
                batch_predictions = self.model.predict(preprocessed_batch, verbose=0)
                
                # Process results for each valid sample
                for i, (valid_idx, prediction_probs) in enumerate(zip(valid_indices, batch_predictions)):
                    # Get predicted class
                    predicted_class_idx = np.argmax(prediction_probs)
                    predicted_class = self.fault_categories[predicted_class_idx]
                    
                    # Calculate confidence scores
                    confidence_scores = self.get_confidence_scores(prediction_probs)
                    
                    # Generate data hash
                    data_hash = hashlib.md5(valid_data[i].tobytes()).hexdigest()
                    
                    # Create result
                    result = {
                        'sample_index': valid_idx,
                        'prediction': predicted_class,
                        'predicted_class_index': int(predicted_class_idx),
                        'confidence_scores': confidence_scores,
                        'max_confidence': float(np.max(prediction_probs)),
                        'data_hash': data_hash
                    }
                    
                    batch_results[valid_idx] = result
            
            # Calculate processing time
            total_processing_time = (time.time() - start_time) * 1000
            
            # Add timing information to all results
            for result in batch_results:
                if result and 'error' not in result:
                    result['processing_time_ms'] = round(total_processing_time / len(valid_data) if valid_data else 0, 2)
                    result['timestamp'] = datetime.now(timezone.utc).isoformat()
                    result['model_info'] = {
                        'model_path': self.model_path,
                        'model_version': self.model_metadata.get('version_info', {}).get('model_version', 'unknown')
                    }
            
            # Update performance tracking
            self.prediction_count += len(valid_data)
            self.total_prediction_time += total_processing_time
            
            # Create batch summary
            successful_predictions = len(valid_data)
            failed_predictions = len(invalid_results)
            
            batch_summary = {
                'batch_info': {
                    'total_samples': len(sensor_data_list),
                    'successful_predictions': successful_predictions,
                    'failed_predictions': failed_predictions,
                    'success_rate': round((successful_predictions / len(sensor_data_list)) * 100, 2),
                    'total_processing_time_ms': round(total_processing_time, 2),
                    'average_time_per_sample_ms': round(total_processing_time / len(sensor_data_list), 2),
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'optimization': 'vectorized'
                },
                'results': batch_results,
                'errors': invalid_results if invalid_results else None
            }
            
            logger.info(f"Optimized batch prediction completed: {successful_predictions}/{len(sensor_data_list)} successful")
            
            return batch_summary
            
        except Exception as e:
            logger.error(f"Error in optimized batch prediction: {str(e)}")
            raise
    
    def process_data_stream(self, data_stream: List[np.ndarray], window_size: int = 10, 
                           overlap: float = 0.5, enable_anomaly_detection: bool = True,
                           confidence_threshold: float = 0.7) -> Dict:
        """
        Process real-time IoT data stream with advanced windowing for continuous monitoring.
        
        Args:
            data_stream: List of sensor data arrays representing time series
            window_size: Size of processing window
            overlap: Overlap ratio between windows (0.0 to 1.0)
            enable_anomaly_detection: Whether to detect anomalous patterns
            confidence_threshold: Minimum confidence for reliable predictions
            
        Returns:
            Dictionary containing stream processing results and analytics
        """
        try:
            if not data_stream:
                raise ValueError("Empty data stream provided")
            
            if not (0.0 <= overlap < 1.0):
                raise ValueError("Overlap must be between 0.0 and 1.0")
            
            if not (0.0 <= confidence_threshold <= 1.0):
                raise ValueError("Confidence threshold must be between 0.0 and 1.0")
            
            logger.info(f"Processing data stream with {len(data_stream)} samples, window_size={window_size}, overlap={overlap}")
            
            start_time = time.time()
            
            # Calculate step size based on overlap
            step_size = max(1, int(window_size * (1 - overlap)))
            
            stream_results = []
            window_count = 0
            anomaly_count = 0
            low_confidence_count = 0
            fault_detections = []
            
            # Track prediction trends
            prediction_history = []
            confidence_history = []
            
            # Process data in overlapping windows
            for start_idx in range(0, len(data_stream) - window_size + 1, step_size):
                end_idx = start_idx + window_size
                window_data = data_stream[start_idx:end_idx]
                
                try:
                    # Process window as batch
                    window_result = self.predict_batch_optimized(window_data)
                    
                    # Analyze window results
                    window_analysis = self._analyze_window_results(
                        window_result, window_count, confidence_threshold
                    )
                    
                    # Detect anomalies if enabled
                    if enable_anomaly_detection:
                        anomalies = self._detect_anomalies(w
                        anomaly_info = self._detect_stream_anomalies(
                            window_result, prediction_history, confidence_history
                        )
                        window_analysis['anomaly_detection'] = anomaly_info
                        if anomaly_info['is_anomalous']:
                            anomaly_count += 1
                    
                    # Track low confidence predictions
                    if window_analysis['average_confidence'] < confidence_threshold:
                        low_confidence_count += 1
                    
                    # Track fault detections
                    fault_predictions = [r for r in window_result['results'] 
                                       if r and r.get('prediction') != 'healthy']
                    if fault_predictions:
                        fault_detections.extend([{
                            'window_id': window_count,
                            'sample_index': r['sample_index'],
                            'fault_type': r['prediction'],
                            'confidence': r['max_confidence'],
                            'timestamp': r['timestamp']
                        } for r in fault_predictions])
                    
                    # Update prediction history for trend analysis
                    window_predictions = [r['prediction'] for r in window_result['results'] if r and 'prediction' in r]
                    window_confidences = [r['max_confidence'] for r in window_result['results'] if r and 'max_confidence' in r]
                    
                    prediction_history.extend(window_predictions)
                    confidence_history.extend(window_confidences)
                    
                    # Keep history manageable (last 1000 predictions)
                    if len(prediction_history) > 1000:
                        prediction_history = prediction_history[-1000:]
                        confidence_history = confidence_history[-1000:]
                    
                    # Add comprehensive window metadata
                    window_summary = {
                        'window_info': {
                            'window_id': window_count,
                            'start_index': start_idx,
                            'end_index': end_idx - 1,
                            'window_size': len(window_data),
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'processing_time_ms': window_result['batch_info']['total_processing_time_ms']
                        },
                        'batch_result': window_result,
                        'window_analysis': window_analysis
                    }
                    
                    stream_results.append(window_summary)
                    window_count += 1
                    
                except Exception as e:
                    error_summary = {
                        'window_info': {
                            'window_id': window_count,
                            'start_index': start_idx,
                            'end_index': end_idx - 1,
                            'window_size': len(window_data),
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        },
                        'error': f"Window processing failed: {str(e)}",
                        'batch_result': None,
                        'window_analysis': None
                    }
                    stream_results.append(error_summary)
                    window_count += 1
                    logger.error(f"Error processing window {window_count}: {str(e)}")
            
            # Calculate stream processing statistics
            total_processing_time = (time.time() - start_time) * 1000
            total_samples = len(data_stream)
            
            # Generate stream analytics
            stream_analytics = self._generate_stream_analytics(
                stream_results, prediction_history, confidence_history, fault_detections
            )
            
            # Create comprehensive stream summary
            stream_summary = {
                'stream_info': {
                    'total_samples': total_samples,
                    'total_windows': window_count,
                    'window_size': window_size,
                    'overlap': overlap,
                    'step_size': step_size,
                    'total_processing_time_ms': round(total_processing_time, 2),
                    'average_window_time_ms': round(total_processing_time / window_count if window_count > 0 else 0, 2),
                    'throughput_samples_per_second': round(total_samples / (total_processing_time / 1000), 2),
                    'anomaly_count': anomaly_count,
                    'low_confidence_count': low_confidence_count,
                    'fault_detection_count': len(fault_detections),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                },
                'windows': stream_results,
                'analytics': stream_analytics,
                'fault_detections': fault_detections
            }
            
            logger.info(f"Data stream processing completed: {window_count} windows, {len(fault_detections)} faults detected")
            
            return stream_summary
            
        except Exception as e:
            logger.error(f"Error processing data stream: {str(e)}")
            raise
    
    def _analyze_window_results(self, window_result: Dict, window_id: int, 
                               confidence_threshold: float) -> Dict:
        """
        Analyze results from a single window for patterns and quality metrics.
        
        Args:
            window_result: Batch prediction result for the window
            window_id: Window identifier
            confidence_threshold: Minimum confidence threshold
            
        Returns:
            Dictionary containing window analysis
        """
        try:
            results = window_result.get('results', [])
            valid_results = [r for r in results if r and 'prediction' in r]
            
            if not valid_results:
                return {
                    'valid_predictions': 0,
                    'average_confidence': 0.0,
                    'dominant_prediction': None,
                    'prediction_distribution': {},
                    'high_confidence_count': 0,
                    'quality_score': 0.0
                }
            
            # Calculate confidence statistics
            confidences = [r['max_confidence'] for r in valid_results]
            average_confidence = np.mean(confidences)
            high_confidence_count = sum(1 for c in confidences if c >= confidence_threshold)
            
            # Analyze prediction distribution
            predictions = [r['prediction'] for r in valid_results]
            prediction_counts = {}
            for pred in predictions:
                prediction_counts[pred] = prediction_counts.get(pred, 0) + 1
            
            # Find dominant prediction
            dominant_prediction = max(prediction_counts.items(), key=lambda x: x[1])[0]
            
            # Calculate quality score (combination of confidence and consistency)
            consistency_score = max(prediction_counts.values()) / len(valid_results)
            confidence_score = average_confidence
            quality_score = (consistency_score * 0.4 + confidence_score * 0.6)
            
            return {
                'valid_predictions': len(valid_results),
                'average_confidence': round(average_confidence, 4),
                'confidence_std': round(np.std(confidences), 4),
                'dominant_prediction': dominant_prediction,
                'prediction_distribution': prediction_counts,
                'high_confidence_count': high_confidence_count,
                'consistency_score': round(consistency_score, 4),
                'quality_score': round(quality_score, 4)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing window results: {str(e)}")
            return {'error': str(e)}
    
    def _detect_stream_anomalies(self, window_result: Dict, prediction_history: List[str],
                                confidence_history: List[float]) -> Dict:
        """
        Detect anomalous patterns in the data stream.
        
        Args:
            window_result: Current window results
            prediction_history: Historical predictions
            confidence_history: Historical confidence scores
            
        Returns:
            Dictionary containing anomaly detection results
        """
        try:
            anomaly_flags = []
            anomaly_reasons = []
            
            # Get current window predictions and confidences
            current_results = [r for r in window_result.get('results', []) if r and 'prediction' in r]
            if not current_results:
                return {'is_anomalous': False, 'anomaly_score': 0.0, 'reasons': []}
            
            current_predictions = [r['prediction'] for r in current_results]
            current_confidences = [r['max_confidence'] for r in current_results]
            
            # Check for sudden confidence drops
            if confidence_history:
                recent_avg_confidence = np.mean(confidence_history[-50:]) if len(confidence_history) >= 50 else np.mean(confidence_history)
                current_avg_confidence = np.mean(current_confidences)
                
                if current_avg_confidence < recent_avg_confidence * 0.7:  # 30% drop
                    anomaly_flags.append(True)
                    anomaly_reasons.append(f"Confidence drop: {current_avg_confidence:.3f} vs {recent_avg_confidence:.3f}")
            
            # Check for unusual prediction patterns
            if prediction_history:
                # Check for sudden change in dominant prediction
                recent_predictions = prediction_history[-100:] if len(prediction_history) >= 100 else prediction_history
                recent_dominant = max(set(recent_predictions), key=recent_predictions.count)
                current_dominant = max(set(current_predictions), key=current_predictions.count)
                
                if recent_dominant != current_dominant and recent_dominant == 'healthy':
                    anomaly_flags.append(True)
                    anomaly_reasons.append(f"Sudden fault detection: {recent_dominant} -> {current_dominant}")
            
            # Check for multiple different faults in same window (unusual)
            unique_faults = set(p for p in current_predictions if p != 'healthy')
            if len(unique_faults) > 2:
                anomaly_flags.append(True)
                anomaly_reasons.append(f"Multiple fault types detected: {list(unique_faults)}")
            
            # Check for very low confidence across all predictions
            if np.mean(current_confidences) < 0.4:
                anomaly_flags.append(True)
                anomaly_reasons.append(f"Very low confidence: {np.mean(current_confidences):.3f}")
            
            is_anomalous = any(anomaly_flags)
            anomaly_score = len(anomaly_flags) / 4.0  # Normalize to 0-1
            
            return {
                'is_anomalous': is_anomalous,
                'anomaly_score': round(anomaly_score, 3),
                'reasons': anomaly_reasons,
                'flags_triggered': len(anomaly_flags)
            }
            
        except Exception as e:
            logger.error(f"Error detecting stream anomalies: {str(e)}")
            return {'is_anomalous': False, 'anomaly_score': 0.0, 'reasons': [], 'error': str(e)}
    
    def _generate_stream_analytics(self, stream_results: List[Dict], prediction_history: List[str],
                                  confidence_history: List[float], fault_detections: List[Dict]) -> Dict:
        """
        Generate comprehensive analytics for the processed data stream.
        
        Args:
            stream_results: Results from all processed windows
            prediction_history: Historical predictions
            confidence_history: Historical confidence scores
            fault_detections: List of detected faults
            
        Returns:
            Dictionary containing stream analytics
        """
        try:
            # Calculate overall statistics
            total_windows = len(stream_results)
            successful_windows = len([r for r in stream_results if r.get('batch_result')])
            
            # Prediction distribution analysis
            prediction_counts = {}
            for pred in prediction_history:
                prediction_counts[pred] = prediction_counts.get(pred, 0) + 1
            
            # Confidence statistics
            confidence_stats = {}
            if confidence_history:
                confidence_stats = {
                    'mean': round(np.mean(confidence_history), 4),
                    'std': round(np.std(confidence_history), 4),
                    'min': round(np.min(confidence_history), 4),
                    'max': round(np.max(confidence_history), 4),
                    'median': round(np.median(confidence_history), 4)
                }
            
            # Fault analysis
            fault_types = {}
            for fault in fault_detections:
                fault_type = fault['fault_type']
                fault_types[fault_type] = fault_types.get(fault_type, 0) + 1
            
            # Trend analysis (simple moving average)
            trend_analysis = {}
            if len(confidence_history) >= 10:
                recent_confidence = np.mean(confidence_history[-10:])
                earlier_confidence = np.mean(confidence_history[-20:-10]) if len(confidence_history) >= 20 else np.mean(confidence_history[:-10])
                trend_analysis = {
                    'confidence_trend': 'improving' if recent_confidence > earlier_confidence else 'declining',
                    'trend_magnitude': abs(recent_confidence - earlier_confidence)
                }
            
            # Quality metrics
            quality_metrics = {
                'stream_reliability': successful_windows / total_windows if total_windows > 0 else 0,
                'average_confidence': confidence_stats.get('mean', 0),
                'fault_detection_rate': len(fault_detections) / len(prediction_history) if prediction_history else 0,
                'prediction_consistency': max(prediction_counts.values()) / len(prediction_history) if prediction_history else 0
            }
            
            return {
                'prediction_distribution': prediction_counts,
                'confidence_statistics': confidence_stats,
                'fault_analysis': {
                    'total_faults_detected': len(fault_detections),
                    'fault_types': fault_types,
                    'most_common_fault': max(fault_types.items(), key=lambda x: x[1])[0] if fault_types else None
                },
                'trend_analysis': trend_analysis,
                'quality_metrics': quality_metrics,
                'window_statistics': {
                    'total_windows': total_windows,
                    'successful_windows': successful_windows,
                    'success_rate': successful_windows / total_windows if total_windows > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating stream analytics: {str(e)}")
            return {'error': str(e)}


class DataBuffer:
    """
    Advanced data buffering system for real-time IoT sensor data stream processing.
    
    Features:
    - Configurable buffer size and windowing
    - Automatic prediction triggering
    - Thread-safe operations
    - Data validation and error handling
    """
    
    def __init__(self, prediction_service: PredictionService, buffer_size: int = 100,
                 auto_process_threshold: int = 50, window_size: int = 10):
        """
        Initialize the DataBuffer.
        
        Args:
            prediction_service: PredictionService instance for processing
            buffer_size: Maximum number of samples to buffer
            auto_process_threshold: Threshold for automatic processing
            window_size: Size of processing windows
        """
        self.prediction_service = prediction_service
        self.buffer_size = buffer_size
        self.auto_process_threshold = auto_process_threshold
        self.window_size = window_size
        
        # Buffer storage
        self.buffer = []
        self.buffer_lock = False
        
        # Processing statistics
        self.total_samples_received = 0
        self.total_batches_processed = 0
        self.last_processing_time = None
        
        # Auto-processing settings
        self.auto_processing_enabled = True
        self.processing_callbacks = []
        
        logger.info(f"DataBuffer initialized: buffer_size={buffer_size}, auto_threshold={auto_process_threshold}")
    
    def add_sample(self, sensor_data: np.ndarray, metadata: Dict = None) -> Dict:
        """
        Add sensor data sample to buffer with automatic processing trigger.
        
        Args:
            sensor_data: Sensor data array
            metadata: Optional metadata for the sample
            
        Returns:
            Dictionary with operation status and any processing results
        """
        try:
            if self.buffer_lock:
                return {'status': 'buffer_locked', 'message': 'Buffer is currently being processed'}
            
            # Validate input data
            is_valid, error_msg = self.prediction_service._validate_input_data(sensor_data)
            if not is_valid:
                return {'status': 'validation_error', 'message': error_msg}
            
            # Create sample entry
            sample_entry = {
                'data': sensor_data.copy(),
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'metadata': metadata or {},
                'sample_id': self.total_samples_received
            }
            
            # Add to buffer (FIFO)
            self.buffer.append(sample_entry)
            self.total_samples_received += 1
            
            # Remove oldest samples if buffer is full
            if len(self.buffer) > self.buffer_size:
                removed_sample = self.buffer.pop(0)
                logger.debug(f"Buffer full, removed sample {removed_sample['sample_id']}")
            
            result = {
                'status': 'added',
                'sample_id': sample_entry['sample_id'],
                'buffer_size': len(self.buffer),
                'auto_processing_triggered': False
            }
            
            # Check for automatic processing trigger
            if (self.auto_processing_enabled and 
                len(self.buffer) >= self.auto_process_threshold):
                
                processing_result = self.process_buffer()
                result['auto_processing_triggered'] = True
                result['processing_result'] = processing_result
                
                # Call registered callbacks
                for callback in self.processing_callbacks:
                    try:
                        callback(processing_result)
                    except Exception as e:
                        logger.error(f"Error in processing callback: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error adding sample to buffer: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def add_batch(self, sensor_data_list: List[np.ndarray], metadata_list: List[Dict] = None) -> Dict:
        """
        Add multiple sensor data samples to buffer efficiently.
        
        Args:
            sensor_data_list: List of sensor data arrays
            metadata_list: Optional list of metadata dictionaries
            
        Returns:
            Dictionary with batch operation status
        """
        try:
            if self.buffer_lock:
                return {'status': 'buffer_locked', 'message': 'Buffer is currently being processed'}
            
            if not sensor_data_list:
                return {'status': 'error', 'message': 'Empty sensor data list'}
            
            metadata_list = metadata_list or [{}] * len(sensor_data_list)
            
            added_count = 0
            validation_errors = 0
            
            for i, sensor_data in enumerate(sensor_data_list):
                # Validate input data
                is_valid, error_msg = self.prediction_service._validate_input_data(sensor_data)
                if not is_valid:
                    validation_errors += 1
                    logger.warning(f"Validation failed for sample {i}: {error_msg}")
                    continue
                
                # Create sample entry
                sample_entry = {
                    'data': sensor_data.copy(),
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'metadata': metadata_list[i] if i < len(metadata_list) else {},
                    'sample_id': self.total_samples_received + added_count
                }
                
                self.buffer.append(sample_entry)
                added_count += 1
            
            self.total_samples_received += added_count
            
            # Remove oldest samples if buffer exceeds capacity
            while len(self.buffer) > self.buffer_size:
                removed_sample = self.buffer.pop(0)
                logger.debug(f"Buffer full, removed sample {removed_sample['sample_id']}")
            
            result = {
                'status': 'batch_added',
                'samples_added': added_count,
                'validation_errors': validation_errors,
                'buffer_size': len(self.buffer),
                'auto_processing_triggered': False
            }
            
            # Check for automatic processing trigger
            if (self.auto_processing_enabled and 
                len(self.buffer) >= self.auto_process_threshold):
                
                processing_result = self.process_buffer()
                result['auto_processing_triggered'] = True
                result['processing_result'] = processing_result
                
                # Call registered callbacks
                for callback in self.processing_callbacks:
                    try:
                        callback(processing_result)
                    except Exception as e:
                        logger.error(f"Error in processing callback: {str(e)}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error adding batch to buffer: {str(e)}")
            return {'status': 'error', 'message': str(e)}
    
    def get_buffer_data(self) -> List[np.ndarray]:
        """
        Get all data from buffer.
        
        Returns:
            List of sensor data arrays
        """
        return [sample['data'] for sample in self.buffer]
    
    def process_buffer(self) -> Dict:
        """
        Process all data in buffer and return predictions.
        
        Returns:
            Batch prediction results
        """
        try:
            if not self.buffer:
                return {'error': 'Buffer is empty', 'results': []}
            
            self.buffer_lock = True
            
            # Get data from buffer
            buffer_data = self.get_buffer_data()
            
            # Process as batch
            results = self.prediction_service.predict_batch_optimized(buffer_data)
            
            # Add buffer metadata
            results['buffer_info'] = {
                'buffer_size': len(self.buffer),
                'processed_samples': len(buffer_data),
                'oldest_timestamp': self.buffer[0]['timestamp'] if self.buffer else None,
                'newest_timestamp': self.buffer[-1]['timestamp'] if self.buffer else None
            }
            
            self.total_batches_processed += 1
            self.last_processing_time = datetime.now(timezone.utc).isoformat()
            
            self.buffer_lock = False
            
            return results
            
        except Exception as e:
            self.buffer_lock = False
            logger.error(f"Error processing buffer: {str(e)}")
            return {'error': f'Buffer processing failed: {str(e)}', 'results': []}
    
    def process_windowed_buffer(self, overlap: float = 0.5) -> Dict:
        """
        Process buffer data using windowed approach for continuous monitoring.
        
        Args:
            overlap: Overlap ratio between windows
            
        Returns:
            Stream processing results
        """
        try:
            if not self.buffer:
                return {'error': 'Buffer is empty', 'results': []}
            
            if len(self.buffer) < self.window_size:
                return {'error': f'Insufficient data for windowing. Need {self.window_size}, have {len(self.buffer)}'}
            
            self.buffer_lock = True
            
            # Get data from buffer
            buffer_data = self.get_buffer_data()
            
            # Process using stream processing
            results = self.prediction_service.process_data_stream(
                buffer_data, 
                window_size=self.window_size,
                overlap=overlap
            )
            
            # Add buffer metadata
            results['buffer_info'] = {
                'buffer_size': len(self.buffer),
                'window_size': self.window_size,
                'overlap': overlap,
                'oldest_timestamp': self.buffer[0]['timestamp'] if self.buffer else None,
                'newest_timestamp': self.buffer[-1]['timestamp'] if self.buffer else None
            }
            
            self.total_batches_processed += 1
            self.last_processing_time = datetime.now(timezone.utc).isoformat()
            
            self.buffer_lock = False
            
            return results
            
        except Exception as e:
            self.buffer_lock = False
            logger.error(f"Error processing windowed buffer: {str(e)}")
            return {'error': f'Windowed buffer processing failed: {str(e)}', 'results': []}
    
    def clear_buffer(self) -> None:
        """Clear all data from buffer."""
        if not self.buffer_lock:
            self.buffer.clear()
            logger.info("Buffer cleared")
        else:
            logger.warning("Cannot clear buffer while processing")
    
    def get_buffer_status(self) -> Dict:
        """
        Get buffer status information.
        
        Returns:
            Dictionary with buffer status
        """
        return {
            'buffer_size': len(self.buffer),
            'max_buffer_size': self.buffer_size,
            'is_locked': self.buffer_lock,
            'is_full': len(self.buffer) >= self.buffer_size,
            'auto_processing_enabled': self.auto_processing_enabled,
            'auto_process_threshold': self.auto_process_threshold,
            'window_size': self.window_size,
            'total_samples_received': self.total_samples_received,
            'total_batches_processed': self.total_batches_processed,
            'last_processing_time': self.last_processing_time,
            'oldest_timestamp': self.buffer[0]['timestamp'] if self.buffer else None,
            'newest_timestamp': self.buffer[-1]['timestamp'] if self.buffer else None
        }
    
    def register_processing_callback(self, callback_func) -> None:
        """
        Register callback function to be called after automatic processing.
        
        Args:
            callback_func: Function to call with processing results
        """
        self.processing_callbacks.append(callback_func)
        logger.info("Processing callback registered")
    
    def set_auto_processing(self, enabled: bool, threshold: int = None) -> None:
        """
        Enable or disable automatic processing.
        
        Args:
            enabled: Whether to enable automatic processing
            threshold: New threshold for automatic processing
        """
        self.auto_processing_enabled = enabled
        if threshold is not None:
            self.auto_process_threshold = threshold
        
        logger.info(f"Auto processing {'enabled' if enabled else 'disabled'}, threshold: {self.auto_process_threshold}")
    
    def get_recent_samples(self, count: int = 10) -> List[Dict]:
        """
        Get the most recent samples from buffer.
        
        Args:
            count: Number of recent samples to return
            
        Returns:
            List of recent sample dictionaries
        """
        return self.buffer[-count:] if len(self.buffer) >= count else self.buffer.copy()
    
    def get_buffer_statistics(self) -> Dict:
        """
        Get comprehensive buffer statistics.
        
        Returns:
            Dictionary with buffer statistics
        """
        if not self.buffer:
            return {'error': 'Buffer is empty'}
        
        # Calculate time span
        timestamps = [sample['timestamp'] for sample in self.buffer]
        oldest_time = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
        newest_time = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00'))
        time_span = (newest_time - oldest_time).total_seconds()
        
        # Calculate data rate
        data_rate = len(self.buffer) / time_span if time_span > 0 else 0
        
        return {
            'buffer_utilization': len(self.buffer) / self.buffer_size,
            'time_span_seconds': time_span,
            'data_rate_samples_per_second': round(data_rate, 2),
            'processing_efficiency': self.total_batches_processed / max(1, self.total_samples_received // self.auto_process_threshold),
            'average_batch_size': self.total_samples_received / max(1, self.total_batches_processed)
        }aly_score': 0.0, 'reasons': []}
            
            current_predictions = [r['prediction'] for r in current_results]
            current_confidences = [r['max_confidence'] for r in current_results]
            
            # Check for sudden confidence drops
            if confidence_history:
                recent_avg_confidence = np.mean(confidence_history[-50:]) if len(confidence_history) >= 50 else np.mean(confidence_history)
                current_avg_confidence = np.mean(current_confidences)
                
                if current_avg_confidence < recent_avg_confidence - 0.3:  # 30% drop
                    anomaly_flags.append(True)
                    anomaly_reasons.append(f"Confidence drop: {recent_avg_confidence:.3f} -> {current_avg_confidence:.3f}")
                else:
                    anomaly_flags.append(False)
            
            # Check for unusual prediction patterns
            if prediction_history:
                # Check for sudden change in dominant prediction
                recent_predictions = prediction_history[-100:] if len(prediction_history) >= 100 else prediction_history
                recent_dominant = max(set(recent_predictions), key=recent_predictions.count)
                current_dominant = max(set(current_predictions), key=current_predictions.count)
                
                if recent_dominant != current_dominant and recent_dominant == 'healthy':
                    anomaly_flags.append(True)
                    anomaly_reasons.append(f"Sudden fault detection: {recent_dominant} -> {current_dominant}")
                else:
                    anomaly_flags.append(False)
            
            # Check for high variance in predictions within window
            unique_predictions = len(set(current_predictions))
            if unique_predictions > len(current_predictions) * 0.7:  # More than 70% different predictions
                anomaly_flags.append(True)
                anomaly_reasons.append(f"High prediction variance: {unique_predictions}/{len(current_predictions)} unique")
            else:
                anomaly_flags.append(False)
            
            # Calculate overall anomaly score
            anomaly_score = sum(anomaly_flags) / len(anomaly_flags) if anomaly_flags else 0.0
            is_anomalous = anomaly_score > 0.5
            
            return {
                'is_anomalous': is_anomalous,
                'anomaly_score': round(anomaly_score, 4),
                'reasons': anomaly_reasons,
                'checks_performed': len(anomaly_flags)
            }
            
        except Exception as e:
            logger.error(f"Error detecting stream anomalies: {str(e)}")
            return {'is_anomalous': False, 'anomaly_score': 0.0, 'reasons': [], 'error': str(e)}
    
    def _generate_stream_analytics(self, stream_results: List[Dict], prediction_history: List[str],
                                  confidence_history: List[float], fault_detections: List[Dict]) -> Dict:
        """
        Generate comprehensive analytics for the processed stream.
        
        Args:
            stream_results: List of window processing results
            prediction_history: Historical predictions
            confidence_history: Historical confidence scores
            fault_detections: List of detected faults
            
        Returns:
            Dictionary containing stream analytics
        """
        try:
            # Overall prediction distribution
            prediction_distribution = {}
            for pred in prediction_history:
                prediction_distribution[pred] = prediction_distribution.get(pred, 0) + 1
            
            # Confidence statistics
            confidence_stats = {
                'mean': round(np.mean(confidence_history), 4) if confidence_history else 0.0,
                'std': round(np.std(confidence_history), 4) if confidence_history else 0.0,
                'min': round(np.min(confidence_history), 4) if confidence_history else 0.0,
                'max': round(np.max(confidence_history), 4) if confidence_history else 0.0,
                'median': round(np.median(confidence_history), 4) if confidence_history else 0.0
            }
            
            # Fault analysis
            fault_types = {}
            for fault in fault_detections:
                fault_type = fault['fault_type']
                fault_types[fault_type] = fault_types.get(fault_type, 0) + 1
            
            # Quality metrics
            successful_windows = len([w for w in stream_results if w.get('batch_result') and not w.get('error')])
            quality_scores = [w['window_analysis']['quality_score'] for w in stream_results 
                            if w.get('window_analysis') and 'quality_score' in w['window_analysis']]
            
            return {
                'prediction_distribution': prediction_distribution,
                'confidence_statistics': confidence_stats,
                'fault_analysis': {
                    'total_faults': len(fault_detections),
                    'fault_types': fault_types,
                    'fault_rate': round(len(fault_detections) / len(prediction_history) * 100, 2) if prediction_history else 0.0
                },
                'quality_metrics': {
                    'successful_windows': successful_windows,
                    'success_rate': round(successful_windows / len(stream_results) * 100, 2) if stream_results else 0.0,
                    'average_quality_score': round(np.mean(quality_scores), 4) if quality_scores else 0.0,
                    'quality_std': round(np.std(quality_scores), 4) if quality_scores else 0.0
                },
                'trend_analysis': {
                    'total_predictions': len(prediction_history),
                    'unique_predictions': len(set(prediction_history)),
                    'dominant_prediction': max(prediction_distribution.items(), key=lambda x: x[1])[0] if prediction_distribution else None,
                    'prediction_stability': round(max(prediction_distribution.values()) / len(prediction_history) * 100, 2) if prediction_history else 0.0
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating stream analytics: {str(e)}")
            return {'error': str(e)}
    
    def create_data_buffer(self, buffer_size: int = 100) -> 'DataBuffer':
        """
        Create a data buffer for continuous monitoring.
        
        Args:
            buffer_size: Maximum number of samples to keep in buffer
            
        Returns:
            DataBuffer instance
        """
        return DataBuffer(self, buffer_size)
    
    def predict_batch(self, sensor_data_list: List[np.ndarray]) -> List[Dict]:
        """
        Make predictions on multiple sensor readings.
        
        Args:
            sensor_data_list: List of sensor data arrays
            
        Returns:
            List of prediction result dictionaries
        """
        try:
            start_time = time.time()
            
            # Check if model is loaded
            if not self.is_model_loaded or self.model is None:
                raise ValueError("Model not loaded. Call load_model() first.")
            
            if not sensor_data_list:
                raise ValueError("Empty sensor data list provided")
            
            batch_results = []
            batch_errors = []
            
            logger.info(f"Starting batch prediction for {len(sensor_data_list)} samples")
            
            # Process each sensor reading
            for i, sensor_data in enumerate(sensor_data_list):
                try:
                    # Validate input data
                    is_valid, error_msg = self._validate_input_data(sensor_data)
                    if not is_valid:
                        error_result = {
                            'sample_index': i,
                            'error': f"Input validation failed: {error_msg}",
                            'prediction': None,
                            'confidence_scores': None,
                            'success': False
                        }
                        batch_results.append(error_result)
                        batch_errors.append(error_result)
                        continue
                    
                    # Make individual prediction
                    prediction_result = self.predict_single(sensor_data)
                    prediction_result['sample_index'] = i
                    prediction_result['success'] = True
                    batch_results.append(prediction_result)
                    
                except Exception as e:
                    error_result = {
                        'sample_index': i,
                        'error': f"Prediction failed: {str(e)}",
                        'prediction': None,
                        'confidence_scores': None,
                        'success': False
                    }
                    batch_results.append(error_result)
                    batch_errors.append(error_result)
                    logger.error(f"Error processing sample {i}: {str(e)}")
            
            # Calculate batch processing time
            total_batch_time = (time.time() - start_time) * 1000
            
            # Create batch summary
            successful_predictions = [r for r in batch_results if r.get('success', False)]
            
            batch_summary = {
                'total_samples': len(sensor_data_list),
                'successful_predictions': len(successful_predictions),
                'failed_predictions': len(batch_errors),
                'success_rate': len(successful_predictions) / len(sensor_data_list) * 100,
                'total_processing_time_ms': round(total_batch_time, 2),
                'average_time_per_sample_ms': round(total_batch_time / len(sensor_data_list), 2),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Batch prediction completed: {len(successful_predictions)}/{len(sensor_data_list)} successful")
            
            return {
                'results': batch_results,
                'summary': batch_summary,
                'errors': batch_errors
            }
            
        except Exception as e:
            logger.error(f"Error in batch prediction: {str(e)}")
            raise

    def predict_batch_optimized(self, sensor_data_list: List[np.ndarray]) -> Dict:
        """
        Optimized batch prediction using vectorized operations.
        
        Args:
            sensor_data_list: List of sensor data arrays
            
        Returns:
            Dictionary containing batch prediction results
        """
        try:
            start_time = time.time()
            
            # Check if model is loaded
            if not self.is_model_loaded or self.model is None:
                raise ValueError("Model not loaded. Call load_model() first.")
            
            if not sensor_data_list:
                raise ValueError("Empty sensor data list provided")
            
            logger.info(f"Starting optimized batch prediction for {len(sensor_data_list)} samples")
            
            # Validate all inputs first
            valid_indices = []
            valid_data = []
            validation_errors = []
            
            for i, sensor_data in enumerate(sensor_data_list):
                is_valid, error_msg = self._validate_input_data(sensor_data)
                if is_valid:
                    valid_indices.append(i)
                    valid_data.append(sensor_data)
                else:
                    validation_errors.append({
                        'sample_index': i,
                        'error': f"Input validation failed: {error_msg}",
                        'success': False
                    })
            
            if not valid_data:
                return {
                    'results': validation_errors,
                    'summary': {
                        'total_samples': len(sensor_data_list),
                        'successful_predictions': 0,
                        'failed_predictions': len(validation_errors),
                        'success_rate': 0.0,
                        'total_processing_time_ms': 0.0,
                        'average_time_per_sample_ms': 0.0,
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    },
                    'errors': validation_errors
                }
            
            # Preprocess all valid data in batch
            try:
                # Stack all data into a single batch array
                batch_data = np.stack(valid_data)
                
                # Apply batch normalization
                normalized_batch = self.data_processor.normalize_data(batch_data)
                
                # Reshape for CNN input: (batch_size, 1681, 1)
                preprocessed_batch = normalized_batch.reshape(-1, 1681, 1)
                
                # Make batch prediction
                prediction_start = time.time()
                batch_predictions = self.model.predict(preprocessed_batch, verbose=0)
                prediction_time = (time.time() - prediction_start) * 1000
                
                # Process results
                batch_results = []
                
                for i, (original_idx, prediction_probs) in enumerate(zip(valid_indices, batch_predictions)):
                    # Get predicted class
                    predicted_class_idx = np.argmax(prediction_probs)
                    predicted_class = self.fault_categories[predicted_class_idx]
                    
                    # Calculate confidence scores
                    confidence_scores = self.get_confidence_scores(prediction_probs)
                    
                    # Generate data hash
                    data_hash = hashlib.md5(valid_data[i].tobytes()).hexdigest()
                    
                    result = {
                        'sample_index': original_idx,
                        'prediction': predicted_class,
                        'predicted_class_index': int(predicted_class_idx),
                        'confidence_scores': confidence_scores,
                        'max_confidence': float(np.max(prediction_probs)),
                        'data_hash': data_hash,
                        'success': True
                    }
                    
                    batch_results.append(result)
                
                # Add validation errors to results
                all_results = batch_results + validation_errors
                all_results.sort(key=lambda x: x['sample_index'])  # Sort by original index
                
                # Update performance tracking
                self.prediction_count += len(batch_results)
                self.total_prediction_time += prediction_time
                
                # Calculate batch processing time
                total_batch_time = (time.time() - start_time) * 1000
                
                batch_summary = {
                    'total_samples': len(sensor_data_list),
                    'successful_predictions': len(batch_results),
                    'failed_predictions': len(validation_errors),
                    'success_rate': len(batch_results) / len(sensor_data_list) * 100,
                    'total_processing_time_ms': round(total_batch_time, 2),
                    'model_prediction_time_ms': round(prediction_time, 2),
                    'preprocessing_time_ms': round(total_batch_time - prediction_time, 2),
                    'average_time_per_sample_ms': round(total_batch_time / len(sensor_data_list), 2),
                    'throughput_samples_per_second': round(len(sensor_data_list) / (total_batch_time / 1000), 2),
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                
                logger.info(f"Optimized batch prediction completed: {len(batch_results)}/{len(sensor_data_list)} successful")
                logger.info(f"Throughput: {batch_summary['throughput_samples_per_second']:.2f} samples/second")
                
                return {
                    'results': all_results,
                    'summary': batch_summary,
                    'errors': validation_errors
                }
                
            except Exception as e:
                logger.error(f"Error in batch processing: {str(e)}")
                # Fall back to individual predictions
                logger.info("Falling back to individual predictions")
                return self.predict_batch(sensor_data_list)
                
        except Exception as e:
            logger.error(f"Error in optimized batch prediction: {str(e)}")
            raise

    def create_data_buffer(self, buffer_size: int = 100) -> 'DataBuffer':
        """
        Create a data buffer for continuous monitoring.
        
        Args:
            buffer_size: Maximum number of samples to keep in buffer
            
        Returns:
            DataBuffer instance
        """
        return DataBuffer(self, buffer_size)
    
    def create_iot_stream_processor(self, window_size: int = 10, overlap_ratio: float = 0.5, 
                                   buffer_size: int = 1000) -> 'IoTStreamProcessor':
        """
        Create an IoT stream processor for real-time data processing.
        
        Args:
            window_size: Number of samples per processing window
            overlap_ratio: Overlap ratio between consecutive windows (0.0 to 1.0)
            buffer_size: Maximum buffer size for incoming data
            
        Returns:
            IoTStreamProcessor instance
        """
        return IoTStreamProcessor(self, window_size, overlap_ratio, buffer_size)

    def get_batch_performance_stats(self) -> Dict:
        """
        Get performance statistics for batch operations.
        
        Returns:
            Dictionary with batch performance metrics
        """
        return {
            'total_predictions': self.prediction_count,
            'total_processing_time_ms': round(self.total_prediction_time, 2),
            'average_prediction_time_ms': round(
                self.total_prediction_time / self.prediction_count if self.prediction_count > 0 else 0, 2
            ),
            'predictions_per_second': round(
                (self.prediction_count / (self.total_prediction_time / 1000)) if self.total_prediction_time > 0 else 0, 2
            ),
            'model_info': {
                'is_loaded': self.is_model_loaded,
                'model_path': self.model_path
            }
        }


class IoTStreamProcessor:
    """
    Real-time IoT data stream processor with windowing and continuous monitoring capabilities.
    """
    
    def __init__(self, prediction_service: PredictionService, window_size: int = 10, 
                 overlap_ratio: float = 0.5, buffer_size: int = 1000):
        """
        Initialize IoT stream processor.
        
        Args:
            prediction_service: PredictionService instance
            window_size: Number of samples per processing window
            overlap_ratio: Overlap ratio between consecutive windows (0.0 to 1.0)
            buffer_size: Maximum buffer size for incoming data
        """
        self.prediction_service = prediction_service
        self.window_size = window_size
        self.overlap_ratio = max(0.0, min(1.0, overlap_ratio))  # Clamp to [0, 1]
        self.step_size = max(1, int(window_size * (1 - overlap_ratio)))
        self.buffer_size = buffer_size
        
        # Data storage
        self.data_buffer = []
        self.processed_windows = []
        self.stream_stats = {
            'total_samples': 0,
            'processed_windows': 0,
            'failed_samples': 0,
            'start_time': time.time(),
            'last_processing_time': None
        }
        
        # Stream monitoring
        self.is_streaming = False
        self.stream_lock = False
        
        logger.info(f"IoTStreamProcessor initialized: window_size={window_size}, "
                   f"overlap_ratio={overlap_ratio}, step_size={self.step_size}")
    
    def add_sensor_sample(self, sensor_data: np.ndarray, timestamp: Optional[str] = None) -> bool:
        """
        Add a sensor sample to the stream buffer.
        
        Args:
            sensor_data: Sensor data array (should be 1681 features)
            timestamp: Optional timestamp, current time if None
            
        Returns:
            True if sample was added successfully
        """
        try:
            if self.stream_lock:
                logger.warning("Stream is locked for processing, skipping sample")
                return False
            
            # Validate input data
            is_valid, error_msg = self.prediction_service._validate_input_data(sensor_data)
            if not is_valid:
                logger.error(f"Invalid sensor data: {error_msg}")
                self.stream_stats['failed_samples'] += 1
                return False
            
            # Add to buffer with metadata
            sample_entry = {
                'data': sensor_data.copy(),
                'timestamp': timestamp or datetime.now(timezone.utc).isoformat(),
                'sample_id': self.stream_stats['total_samples'],
                'buffer_position': len(self.data_buffer)
            }
            
            self.data_buffer.append(sample_entry)
            self.stream_stats['total_samples'] += 1
            
            # Remove oldest samples if buffer is full
            if len(self.data_buffer) > self.buffer_size:
                removed = self.data_buffer.pop(0)
                logger.debug(f"Removed oldest sample from buffer: sample_id {removed['sample_id']}")
            
            # Check if we can process a new window
            if len(self.data_buffer) >= self.window_size:
                self._try_process_window()
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding sensor sample: {str(e)}")
            self.stream_stats['failed_samples'] += 1
            return False
    
    def _try_process_window(self) -> bool:
        """
        Try to process a window if enough data is available.
        
        Returns:
            True if window was processed successfully
        """
        try:
            if len(self.data_buffer) < self.window_size:
                return False
            
            # Extract window data
            window_start = len(self.processed_windows) * self.step_size
            window_end = window_start + self.window_size
            
            # Adjust for buffer constraints
            if window_end > len(self.data_buffer):
                window_start = len(self.data_buffer) - self.window_size
                window_end = len(self.data_buffer)
            
            if window_start < 0:
                window_start = 0
            
            window_samples = self.data_buffer[window_start:window_end]
            window_data = [sample['data'] for sample in window_samples]
            
            # Process window
            window_result = self._process_window(window_data, window_samples)
            self.processed_windows.append(window_result)
            self.stream_stats['processed_windows'] += 1
            self.stream_stats['last_processing_time'] = time.time()
            
            logger.debug(f"Processed window {len(self.processed_windows)}: "
                        f"samples {window_start}-{window_end-1}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error processing window: {str(e)}")
            return False
    
    def _process_window(self, window_data: List[np.ndarray], window_samples: List[Dict]) -> Dict:
        """
        Process a window of sensor data.
        
        Args:
            window_data: List of sensor data arrays
            window_samples: List of sample metadata
            
        Returns:
            Dictionary containing window processing results
        """
        try:
            window_start_time = time.time()
            
            # Perform batch prediction on window
            batch_result = self.prediction_service.predict_batch_optimized(window_data)
            
            # Calculate window statistics
            window_stats = self._calculate_window_stats(window_data, window_samples)
            
            # Analyze predictions for anomalies or patterns
            prediction_analysis = self._analyze_window_predictions(batch_result)
            
            # Calculate processing time
            processing_time = (time.time() - window_start_time) * 1000
            
            window_result = {
                'window_id': len(self.processed_windows),
                'window_size': len(window_data),
                'start_sample_id': window_samples[0]['sample_id'],
                'end_sample_id': window_samples[-1]['sample_id'],
                'start_timestamp': window_samples[0]['timestamp'],
                'end_timestamp': window_samples[-1]['timestamp'],
                'batch_result': batch_result,
                'window_stats': window_stats,
                'prediction_analysis': prediction_analysis,
                'processing_time_ms': round(processing_time, 2),
                'processed_at': datetime.now(timezone.utc).isoformat()
            }
            
            return window_result
            
        except Exception as e:
            logger.error(f"Error in window processing: {str(e)}")
            return {
                'window_id': len(self.processed_windows),
                'error': str(e),
                'processed_at': datetime.now(timezone.utc).isoformat()
            }
    
    def _calculate_window_stats(self, window_data: List[np.ndarray], 
                               window_samples: List[Dict]) -> Dict:
        """
        Calculate statistical metrics for a window of data.
        
        Args:
            window_data: List of sensor data arrays
            window_samples: List of sample metadata
            
        Returns:
            Dictionary containing window statistics
        """
        try:
            # Stack data for analysis
            stacked_data = np.stack(window_data)
            
            # Calculate basic statistics
            stats = {
                'mean': np.mean(stacked_data, axis=0).tolist(),
                'std': np.std(stacked_data, axis=0).tolist(),
                'min': np.min(stacked_data, axis=0).tolist(),
                'max': np.max(stacked_data, axis=0).tolist(),
                'median': np.median(stacked_data, axis=0).tolist()
            }
            
            # Calculate data quality metrics
            quality_metrics = {
                'data_completeness': 1.0,  # All samples are complete (validated)
                'signal_to_noise_ratio': self._calculate_snr(stacked_data),
                'data_variance': float(np.var(stacked_data)),
                'outlier_count': self._count_outliers(stacked_data),
                'quality_score': self._calculate_quality_score(stacked_data)
            }
            
            # Time-based metrics
            timestamps = [sample['timestamp'] for sample in window_samples]
            time_metrics = {
                'window_duration_seconds': self._calculate_window_duration(timestamps),
                'sampling_rate_hz': len(window_data) / max(1, self._calculate_window_duration(timestamps)),
                'timestamp_consistency': self._check_timestamp_consistency(timestamps)
            }
            
            return {
                'basic_stats': stats,
                'quality_metrics': quality_metrics,
                'time_metrics': time_metrics
            }
            
        except Exception as e:
            logger.error(f"Error calculating window stats: {str(e)}")
            return {'error': str(e)}
    
    def _calculate_snr(self, data: np.ndarray) -> float:
        """Calculate signal-to-noise ratio for the data."""
        try:
            signal_power = np.mean(data ** 2)
            noise_power = np.var(data - np.mean(data, axis=0))
            snr = 10 * np.log10(signal_power / max(noise_power, 1e-10))
            return round(float(snr), 4)
        except:
            return 0.0
    
    def _count_outliers(self, data: np.ndarray, threshold: float = 3.0) -> int:
        """Count outliers using z-score method."""
        try:
            z_scores = np.abs((data - np.mean(data, axis=0)) / (np.std(data, axis=0) + 1e-10))
            outliers = np.sum(z_scores > threshold)
            return int(outliers)
        except:
            return 0
    
    def _calculate_quality_score(self, data: np.ndarray) -> float:
        """Calculate overall data quality score (0-1)."""
        try:
            # Factors: completeness, consistency, outlier ratio
            completeness = 1.0  # All data is validated
            outlier_ratio = self._count_outliers(data) / data.size
            consistency = 1.0 - min(1.0, outlier_ratio)
            
            quality_score = (completeness + consistency) / 2.0
            return round(quality_score, 4)
        except:
            return 0.5
    
    def _calculate_window_duration(self, timestamps: List[str]) -> float:
        """Calculate duration of window in seconds."""
        try:
            if len(timestamps) < 2:
                return 0.0
            
            start_time = datetime.fromisoformat(timestamps[0].replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(timestamps[-1].replace('Z', '+00:00'))
            duration = (end_time - start_time).total_seconds()
            return max(0.0, duration)
        except:
            return 0.0
    
    def _check_timestamp_consistency(self, timestamps: List[str]) -> float:
        """Check consistency of timestamps (0-1 score)."""
        try:
            if len(timestamps) < 3:
                return 1.0
            
            # Calculate intervals between consecutive timestamps
            intervals = []
            for i in range(1, len(timestamps)):
                try:
                    t1 = datetime.fromisoformat(timestamps[i-1].replace('Z', '+00:00'))
                    t2 = datetime.fromisoformat(timestamps[i].replace('Z', '+00:00'))
                    interval = (t2 - t1).total_seconds()
                    intervals.append(interval)
                except:
                    continue
            
            if not intervals:
                return 0.5
            
            # Calculate coefficient of variation
            mean_interval = np.mean(intervals)
            std_interval = np.std(intervals)
            cv = std_interval / max(mean_interval, 1e-10)
            
            # Convert to consistency score (lower CV = higher consistency)
            consistency = max(0.0, 1.0 - min(1.0, cv))
            return round(consistency, 4)
            
        except:
            return 0.5
    
    def _analyze_window_predictions(self, batch_result: Dict) -> Dict:
        """
        Analyze predictions in a window for patterns and anomalies.
        
        Args:
            batch_result: Batch prediction results
            
        Returns:
            Dictionary containing prediction analysis
        """
        try:
            if not batch_result.get('results'):
                return {'error': 'No prediction results to analyze'}
            
            successful_results = [r for r in batch_result['results'] if r.get('success', False)]
            
            if not successful_results:
                return {'error': 'No successful predictions to analyze'}
            
            # Extract predictions and confidence scores
            predictions = [r['prediction'] for r in successful_results]
            max_confidences = [r['max_confidence'] for r in successful_results]
            
            # Prediction distribution
            prediction_counts = {}
            for pred in predictions:
                prediction_counts[pred] = prediction_counts.get(pred, 0) + 1
            
            # Confidence statistics
            confidence_stats = {
                'mean_confidence': round(np.mean(max_confidences), 4),
                'std_confidence': round(np.std(max_confidences), 4),
                'min_confidence': round(np.min(max_confidences), 4),
                'max_confidence': round(np.max(max_confidences), 4)
            }
            
            # Anomaly detection
            anomaly_analysis = self._detect_prediction_anomalies(predictions, max_confidences)
            
            # Trend analysis
            trend_analysis = {
                'dominant_prediction': max(prediction_counts.items(), key=lambda x: x[1])[0],
                'prediction_diversity': len(set(predictions)),
                'stability_score': max(prediction_counts.values()) / len(predictions),
                'fault_detected': any(pred != 'healthy' for pred in predictions),
                'critical_faults': sum(1 for pred in predictions if pred in ['faulty_bearing', 'broken_rotor_bars'])
            }
            
            return {
                'prediction_distribution': prediction_counts,
                'confidence_statistics': confidence_stats,
                'anomaly_analysis': anomaly_analysis,
                'trend_analysis': trend_analysis,
                'window_health_score': self._calculate_window_health_score(predictions, max_confidences)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing window predictions: {str(e)}")
            return {'error': str(e)}
    
    def _detect_prediction_anomalies(self, predictions: List[str], 
                                   confidences: List[float]) -> Dict:
        """Detect anomalies in prediction patterns."""
        try:
            anomalies = []
            
            # Low confidence anomaly
            low_conf_threshold = 0.6
            low_conf_count = sum(1 for c in confidences if c < low_conf_threshold)
            if low_conf_count > len(confidences) * 0.3:  # More than 30% low confidence
                anomalies.append({
                    'type': 'low_confidence',
                    'description': f'{low_conf_count}/{len(confidences)} predictions have low confidence',
                    'severity': 'medium'
                })
            
            # Rapid prediction changes
            if len(set(predictions)) > len(predictions) * 0.7:  # High diversity
                anomalies.append({
                    'type': 'high_prediction_variability',
                    'description': 'Predictions are highly variable within window',
                    'severity': 'medium'
                })
            
            # Critical fault detection
            critical_faults = ['faulty_bearing', 'broken_rotor_bars', 'stator_winding']
            critical_count = sum(1 for p in predictions if p in critical_faults)
            if critical_count > 0:
                anomalies.append({
                    'type': 'critical_fault_detected',
                    'description': f'{critical_count} critical fault predictions detected',
                    'severity': 'high'
                })
            
            return {
                'anomalies_detected': len(anomalies),
                'anomalies': anomalies,
                'is_anomalous': len(anomalies) > 0
            }
            
        except Exception as e:
            return {'error': str(e), 'is_anomalous': False}
    
    def _calculate_window_health_score(self, predictions: List[str], 
                                     confidences: List[float]) -> float:
        """Calculate overall health score for the window (0-1)."""
        try:
            # Health score based on predictions and confidence
            healthy_count = sum(1 for p in predictions if p == 'healthy')
            health_ratio = healthy_count / len(predictions)
            
            # Confidence factor
            avg_confidence = np.mean(confidences)
            confidence_factor = min(1.0, avg_confidence / 0.8)  # Normalize to 0.8 as good confidence
            
            # Combined health score
            health_score = (health_ratio * 0.7) + (confidence_factor * 0.3)
            return round(health_score, 4)
            
        except:
            return 0.5
    
    def get_stream_status(self) -> Dict:
        """Get current stream processing status."""
        current_time = time.time()
        uptime = current_time - self.stream_stats['start_time']
        
        return {
            'is_streaming': self.is_streaming,
            'buffer_size': len(self.data_buffer),
            'max_buffer_size': self.buffer_size,
            'processed_windows': len(self.processed_windows),
            'stream_stats': {
                **self.stream_stats,
                'uptime_seconds': round(uptime, 2),
                'samples_per_second': round(self.stream_stats['total_samples'] / max(uptime, 1), 2),
                'windows_per_minute': round(len(self.processed_windows) / max(uptime / 60, 1), 2)
            },
            'window_config': {
                'window_size': self.window_size,
                'overlap_ratio': self.overlap_ratio,
                'step_size': self.step_size
            }
        }
    
    def get_recent_windows(self, count: int = 10) -> List[Dict]:
        """Get recent processed windows."""
        return self.processed_windows[-count:] if self.processed_windows else []
    
    def clear_buffer(self) -> None:
        """Clear the data buffer and reset statistics."""
        self.data_buffer.clear()
        self.processed_windows.clear()
        self.stream_stats = {
            'total_samples': 0,
            'processed_windows': 0,
            'failed_samples': 0,
            'start_time': time.time(),
            'last_processing_time': None
        }
        logger.info("Stream buffer and statistics cleared")
    
    def start_streaming(self) -> bool:
        """Start streaming mode."""
        if not self.prediction_service.is_ready():
            logger.error("Cannot start streaming: prediction service not ready")
            return False
        
        self.is_streaming = True
        logger.info("IoT streaming started")
        return True
    
    def stop_streaming(self) -> bool:
        """Stop streaming mode."""
        self.is_streaming = False
        logger.info("IoT streaming stopped")
        return True


class DataBuffer:
    """
    Data buffer for continuous monitoring and real-time processing.
    """
    
    def __init__(self, prediction_service: PredictionService, buffer_size: int = 100):
        """
        Initialize data buffer.
        
        Args:
            prediction_service: PredictionService instance
            buffer_size: Maximum buffer size
        """
        self.prediction_service = prediction_service
        self.buffer_size = buffer_size
        self.buffer = []
        self.buffer_lock = False  # Simple lock for thread safety simulation
        
        logger.info(f"DataBuffer initialized with size {buffer_size}")
    
    def add_sample(self, sensor_data: np.ndarray) -> bool:
        """
        Add a sensor sample to the buffer.
        
        Args:
            sensor_data: Sensor data array
            
        Returns:
            True if sample was added successfully
        """
        try:
            if self.buffer_lock:
                logger.warning("Buffer is locked, skipping sample")
                return False
            
            # Validate input
            is_valid, error_msg = self.prediction_service._validate_input_data(sensor_data)
            if not is_valid:
                logger.error(f"Invalid sensor data: {error_msg}")
                return False
            
            # Add to buffer
            self.buffer.append({
                'data': sensor_data.copy(),
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'index': len(self.buffer)
            })
            
            # Remove oldest samples if buffer is full
            if len(self.buffer) > self.buffer_size:
                removed = self.buffer.pop(0)
                logger.debug(f"Removed oldest sample from buffer: index {removed['index']}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding sample to buffer: {str(e)}")
            return False
    
    def get_buffer_data(self) -> List[np.ndarray]:
        """
        Get all data from buffer.
        
        Returns:
            List of sensor data arrays
        """
        return [sample['data'] for sample in self.buffer]
    
    def process_buffer(self) -> Dict:
        """
        Process all data in buffer and return predictions.
        
        Returns:
            Batch prediction results
        """
        try:
            if not self.buffer:
                return {'error': 'Buffer is empty', 'results': []}
            
            self.buffer_lock = True
            
            # Get data from buffer
            buffer_data = self.get_buffer_data()
            
            # Process as batch
            results = self.prediction_service.predict_batch_optimized(buffer_data)
            
            # Add buffer metadata
            results['buffer_info'] = {
                'buffer_size': len(self.buffer),
                'processed_samples': len(buffer_data),
                'oldest_timestamp': self.buffer[0]['timestamp'] if self.buffer else None,
                'newest_timestamp': self.buffer[-1]['timestamp'] if self.buffer else None
            }
            
            self.buffer_lock = False
            
            return results
            
        except Exception as e:
            self.buffer_lock = False
            logger.error(f"Error processing buffer: {str(e)}")
            return {'error': f'Buffer processing failed: {str(e)}', 'results': []}
    
    def clear_buffer(self) -> None:
        """Clear all data from buffer."""
        self.buffer.clear()
        logger.info("Buffer cleared")
    
    def get_buffer_status(self) -> Dict:
        """
        Get buffer status information.
        
        Returns:
            Dictionary with buffer status
        """
        return {
            'buffer_size': len(self.buffer),
            'max_buffer_size': self.buffer_size,
            'is_locked': self.buffer_lock,
            'is_full': len(self.buffer) >= self.buffer_size,
            'oldest_timestamp': self.buffer[0]['timestamp'] if self.buffer else None,
            'newest_timestamp': self.buffer[-1]['timestamp'] if self.buffer else None
        }