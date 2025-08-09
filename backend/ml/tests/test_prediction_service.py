"""
Unit tests for PredictionService class.

Tests cover model loading, input validation, preprocessing,
single predictions, confidence scoring, and error handling.
"""

import unittest
import numpy as np
import tempfile
import os
import json
import time
from unittest.mock import Mock, patch, MagicMock
import tensorflow as tf

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.prediction_service import PredictionService
from src.data_processor import DataProcessor
from src.cnn_model import CNN1D


class TestPredictionService(unittest.TestCase):
    """Test cases for PredictionService class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.data_path = "test_data"
        self.service = PredictionService(data_path=self.data_path)
        
        # Create sample sensor data
        self.sample_sensor_data = np.random.rand(1681).astype(np.float32)
        self.sample_batch_data = np.random.rand(5, 1681).astype(np.float32)
        
        # Expected fault categories
        self.expected_categories = [
            'healthy', 'bowed_rotor', 'faulty_bearing', 'broken_rotor_bars',
            'rotor_misalignment', 'rotor_unbalanced', 'stator_winding', 'voltage_unbalanced'
        ]
    
    def tearDown(self):
        """Clean up after tests."""
        pass
    
    def test_initialization(self):
        """Test PredictionService initialization."""
        service = PredictionService(data_path="test_path")
        
        self.assertEqual(service.data_path, "test_path")
        self.assertIsNone(service.model)
        self.assertFalse(service.is_model_loaded)
        self.assertEqual(service.fault_categories, self.expected_categories)
        self.assertEqual(service.num_classes, 8)
        self.assertEqual(service.expected_input_shape, (1681, 1))
        self.assertEqual(service.prediction_count, 0)
        self.assertEqual(service.total_prediction_time, 0.0)
    
    def test_initialization_with_model_path(self):
        """Test initialization with model path."""
        with patch.object(PredictionService, 'load_model') as mock_load:
            mock_load.return_value = True
            service = PredictionService(model_path="test_model.keras")
            mock_load.assert_called_once_with("test_model.keras")
    
    @patch('tensorflow.keras.models.load_model')
    @patch('os.path.exists')
    def test_load_model_success(self, mock_exists, mock_load_model):
        """Test successful model loading."""
        # Setup mocks
        mock_exists.return_value = True
        mock_model = Mock()
        mock_model.input_shape = (None, 1681, 1)
        mock_model.output_shape = (None, 8)
        mock_load_model.return_value = mock_model
        
        # Mock metadata loading
        with patch.object(self.service, '_load_model_metadata'):
            result = self.service.load_model("test_model.keras")
        
        self.assertTrue(result)
        self.assertTrue(self.service.is_model_loaded)
        self.assertEqual(self.service.model, mock_model)
        self.assertEqual(self.service.model_path, "test_model.keras")
    
    @patch('os.path.exists')
    def test_load_model_file_not_found(self, mock_exists):
        """Test model loading with non-existent file."""
        mock_exists.return_value = False
        
        result = self.service.load_model("nonexistent_model.keras")
        
        self.assertFalse(result)
        self.assertFalse(self.service.is_model_loaded)
    
    @patch('tensorflow.keras.models.load_model')
    @patch('os.path.exists')
    def test_load_model_exception(self, mock_exists, mock_load_model):
        """Test model loading with exception."""
        mock_exists.return_value = True
        mock_load_model.side_effect = Exception("Loading failed")
        
        result = self.service.load_model("test_model.keras")
        
        self.assertFalse(result)
        self.assertFalse(self.service.is_model_loaded)
    
    @patch('os.path.exists')
    def test_load_model_metadata_success(self, mock_exists):
        """Test successful metadata loading."""
        mock_exists.return_value = True
        test_metadata = {"version": "1.0", "accuracy": 0.95}
        
        with patch('builtins.open', unittest.mock.mock_open(read_data=json.dumps(test_metadata))):
            self.service._load_model_metadata("test_model.keras")
        
        self.assertEqual(self.service.model_metadata, test_metadata)
    
    @patch('os.path.exists')
    def test_load_model_metadata_not_found(self, mock_exists):
        """Test metadata loading when file doesn't exist."""
        mock_exists.return_value = False
        
        self.service._load_model_metadata("test_model.keras")
        
        self.assertEqual(self.service.model_metadata, {})
    
    def test_validate_model_architecture_success(self):
        """Test successful model architecture validation."""
        mock_model = Mock()
        mock_model.input_shape = (None, 1681, 1)
        mock_model.output_shape = (None, 8)
        self.service.model = mock_model
        
        result = self.service._validate_model_architecture()
        
        self.assertTrue(result)
    
    def test_validate_model_architecture_invalid_input(self):
        """Test model architecture validation with invalid input shape."""
        mock_model = Mock()
        mock_model.input_shape = (None, 1000, 1)  # Wrong input size
        mock_model.output_shape = (None, 8)
        self.service.model = mock_model
        
        result = self.service._validate_model_architecture()
        
        self.assertFalse(result)
    
    def test_validate_model_architecture_invalid_output(self):
        """Test model architecture validation with invalid output shape."""
        mock_model = Mock()
        mock_model.input_shape = (None, 1681, 1)
        mock_model.output_shape = (None, 10)  # Wrong number of classes
        self.service.model = mock_model
        
        result = self.service._validate_model_architecture()
        
        self.assertFalse(result)
    
    def test_validate_model_architecture_no_model(self):
        """Test model architecture validation with no model loaded."""
        self.service.model = None
        
        result = self.service._validate_model_architecture()
        
        self.assertFalse(result)
    
    def test_validate_input_data_valid_1d(self):
        """Test input validation with valid 1D array."""
        data = np.random.rand(1681)
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertTrue(is_valid)
        self.assertEqual(error_msg, "")
    
    def test_validate_input_data_valid_2d(self):
        """Test input validation with valid 2D array."""
        data = np.random.rand(3, 1681)
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertTrue(is_valid)
        self.assertEqual(error_msg, "")
    
    def test_validate_input_data_not_numpy(self):
        """Test input validation with non-numpy array."""
        data = [1, 2, 3, 4, 5]
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("numpy array", error_msg)
    
    def test_validate_input_data_empty(self):
        """Test input validation with empty array."""
        data = np.array([])
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("empty", error_msg)
    
    def test_validate_input_data_nan_values(self):
        """Test input validation with NaN values."""
        data = np.random.rand(1681)
        data[0] = np.nan
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("NaN", error_msg)
    
    def test_validate_input_data_infinite_values(self):
        """Test input validation with infinite values."""
        data = np.random.rand(1681)
        data[0] = np.inf
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("infinite", error_msg)
    
    def test_validate_input_data_wrong_size_1d(self):
        """Test input validation with wrong size 1D array."""
        data = np.random.rand(1000)  # Wrong size
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("1681 features", error_msg)
    
    def test_validate_input_data_wrong_size_2d(self):
        """Test input validation with wrong size 2D array."""
        data = np.random.rand(3, 1000)  # Wrong feature size
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("1681 features", error_msg)
    
    def test_validate_input_data_wrong_dimensions(self):
        """Test input validation with wrong number of dimensions."""
        data = np.random.rand(2, 1681, 5)  # 3D array
        
        is_valid, error_msg = self.service._validate_input_data(data)
        
        self.assertFalse(is_valid)
        self.assertIn("1D or 2D array", error_msg)
    
    @patch.object(DataProcessor, 'normalize_data')
    def test_preprocess_input_data_1d(self, mock_normalize):
        """Test preprocessing of 1D input data."""
        data = np.random.rand(1681)
        normalized_data = np.random.rand(1, 1681)
        mock_normalize.return_value = normalized_data
        
        result = self.service._preprocess_input_data(data)
        
        self.assertEqual(result.shape, (1, 1681, 1))
        mock_normalize.assert_called_once()
    
    @patch.object(DataProcessor, 'normalize_data')
    def test_preprocess_input_data_2d(self, mock_normalize):
        """Test preprocessing of 2D input data."""
        data = np.random.rand(3, 1681)
        normalized_data = np.random.rand(3, 1681)
        mock_normalize.return_value = normalized_data
        
        result = self.service._preprocess_input_data(data)
        
        self.assertEqual(result.shape, (3, 1681, 1))
        mock_normalize.assert_called_once()
    
    def test_get_confidence_scores(self):
        """Test confidence score calculation."""
        # Create mock prediction probabilities
        prediction_probs = np.array([0.1, 0.05, 0.7, 0.05, 0.03, 0.02, 0.03, 0.02])
        
        confidence_scores = self.service.get_confidence_scores(prediction_probs)
        
        # Check that all categories are present
        for category in self.expected_categories:
            self.assertIn(category, confidence_scores)
        
        # Check that values are converted to percentages
        self.assertEqual(confidence_scores['faulty_bearing'], 70.0)  # 0.7 * 100
        self.assertEqual(confidence_scores['healthy'], 10.0)  # 0.1 * 100
        
        # Check that all values sum to approximately 100%
        total_confidence = sum(confidence_scores.values())
        self.assertAlmostEqual(total_confidence, 100.0, places=1)
    
    def test_predict_single_no_model(self):
        """Test single prediction without loaded model."""
        data = np.random.rand(1681)
        
        with self.assertRaises(ValueError) as context:
            self.service.predict_single(data)
        
        self.assertIn("Model not loaded", str(context.exception))
    
    @patch.object(PredictionService, '_validate_input_data')
    def test_predict_single_invalid_input(self, mock_validate):
        """Test single prediction with invalid input."""
        mock_validate.return_value = (False, "Invalid input")
        self.service.is_model_loaded = True
        self.service.model = Mock()
        
        data = np.random.rand(1681)
        
        with self.assertRaises(ValueError) as context:
            self.service.predict_single(data)
        
        self.assertIn("Input validation failed", str(context.exception))
    
    @patch.object(PredictionService, '_preprocess_input_data')
    @patch.object(PredictionService, '_validate_input_data')
    def test_predict_single_success(self, mock_validate, mock_preprocess):
        """Test successful single prediction."""
        # Setup mocks
        mock_validate.return_value = (True, "")
        preprocessed_data = np.random.rand(1, 1681, 1)
        mock_preprocess.return_value = preprocessed_data
        
        # Mock model prediction
        prediction_probs = np.array([[0.1, 0.05, 0.7, 0.05, 0.03, 0.02, 0.03, 0.02]])
        mock_model = Mock()
        mock_model.predict.return_value = prediction_probs
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        self.service.model_path = "test_model.keras"
        
        data = np.random.rand(1681)
        result = self.service.predict_single(data)
        
        # Check result structure
        self.assertIn('prediction', result)
        self.assertIn('predicted_class_index', result)
        self.assertIn('confidence_scores', result)
        self.assertIn('max_confidence', result)
        self.assertIn('processing_time_ms', result)
        self.assertIn('timestamp', result)
        self.assertIn('data_hash', result)
        self.assertIn('model_info', result)
        
        # Check prediction values
        self.assertEqual(result['prediction'], 'faulty_bearing')  # Index 2 has highest prob
        self.assertEqual(result['predicted_class_index'], 2)
        self.assertEqual(result['max_confidence'], 0.7)
        
        # Check that performance stats were updated
        self.assertEqual(self.service.prediction_count, 1)
        self.assertGreater(self.service.total_prediction_time, 0)
    
    def test_validate_prediction_result_valid(self):
        """Test validation of valid prediction result."""
        result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        result['confidence_scores']['healthy'] = 80.0  # Make healthy the highest
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertTrue(is_valid)
        self.assertEqual(error_msg, "")
    
    def test_validate_prediction_result_missing_field(self):
        """Test validation with missing required field."""
        result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            # Missing confidence_scores
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertFalse(is_valid)
        self.assertIn("Missing required field", error_msg)
    
    def test_validate_prediction_result_invalid_prediction(self):
        """Test validation with invalid prediction category."""
        result = {
            'prediction': 'invalid_category',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertFalse(is_valid)
        self.assertIn("Invalid prediction category", error_msg)
    
    def test_validate_prediction_result_invalid_class_index(self):
        """Test validation with invalid class index."""
        result = {
            'prediction': 'healthy',
            'predicted_class_index': 10,  # Invalid index
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertFalse(is_valid)
        self.assertIn("Invalid predicted class index", error_msg)
    
    def test_validate_prediction_result_invalid_confidence_scores(self):
        """Test validation with invalid confidence scores."""
        result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': "not_a_dict",  # Should be dict
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertFalse(is_valid)
        self.assertIn("dictionary", error_msg)
    
    def test_validate_prediction_result_missing_confidence_category(self):
        """Test validation with missing confidence category."""
        confidence_scores = {category: 10.0 for category in self.expected_categories}
        del confidence_scores['healthy']  # Remove one category
        
        result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': confidence_scores,
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertFalse(is_valid)
        self.assertIn("Missing confidence score", error_msg)
    
    def test_validate_prediction_result_invalid_confidence_value(self):
        """Test validation with invalid confidence value."""
        result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        result['confidence_scores']['healthy'] = 150.0  # Invalid value > 100
        
        is_valid, error_msg = self.service.validate_prediction_result(result)
        
        self.assertFalse(is_valid)
        self.assertIn("Invalid confidence value", error_msg)
    
    def test_get_model_info_no_model(self):
        """Test getting model info when no model is loaded."""
        info = self.service.get_model_info()
        
        self.assertFalse(info['is_loaded'])
        self.assertIsNone(info['model_path'])
        self.assertEqual(info['fault_categories'], self.expected_categories)
        self.assertEqual(info['num_classes'], 8)
        self.assertEqual(info['prediction_count'], 0)
        self.assertEqual(info['average_prediction_time_ms'], 0.0)
    
    def test_get_model_info_with_model(self):
        """Test getting model info when model is loaded."""
        mock_model = Mock()
        mock_model.input_shape = (None, 1681, 1)
        mock_model.output_shape = (None, 8)
        mock_model.count_params.return_value = 100000
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        self.service.model_path = "test_model.keras"
        self.service.prediction_count = 5
        self.service.total_prediction_time = 250.0  # 50ms average
        
        info = self.service.get_model_info()
        
        self.assertTrue(info['is_loaded'])
        self.assertEqual(info['model_path'], "test_model.keras")
        self.assertEqual(info['prediction_count'], 5)
        self.assertEqual(info['average_prediction_time_ms'], 50.0)
        self.assertEqual(info['total_params'], 100000)
        self.assertEqual(info['model_input_shape'], (None, 1681, 1))
        self.assertEqual(info['model_output_shape'], (None, 8))
    
    def test_reset_performance_stats(self):
        """Test resetting performance statistics."""
        self.service.prediction_count = 10
        self.service.total_prediction_time = 500.0
        
        self.service.reset_performance_stats()
        
        self.assertEqual(self.service.prediction_count, 0)
        self.assertEqual(self.service.total_prediction_time, 0.0)
    
    def test_is_ready_true(self):
        """Test is_ready when service is ready."""
        self.service.is_model_loaded = True
        self.service.model = Mock()
        
        self.assertTrue(self.service.is_ready())
    
    def test_is_ready_false_no_model(self):
        """Test is_ready when no model is loaded."""
        self.service.is_model_loaded = False
        self.service.model = None
        
        self.assertFalse(self.service.is_ready())
    
    def test_is_ready_false_model_loaded_but_none(self):
        """Test is_ready when model is marked as loaded but object is None."""
        self.service.is_model_loaded = True
        self.service.model = None
        
        self.assertFalse(self.service.is_ready())
    
    def test_get_health_status_healthy(self):
        """Test health status when service is healthy."""
        self.service.is_model_loaded = True
        self.service.model = Mock()
        self.service.model_path = "test_model.keras"
        self.service.prediction_count = 5
        self.service.total_prediction_time = 250.0
        
        status = self.service.get_health_status()
        
        self.assertEqual(status['status'], 'healthy')
        self.assertTrue(status['is_model_loaded'])
        self.assertEqual(status['model_path'], "test_model.keras")
        self.assertEqual(status['prediction_count'], 5)
        self.assertEqual(status['uptime_info']['average_response_time_ms'], 50.0)
        self.assertEqual(status['errors'], [])
    
    def test_get_health_status_unhealthy(self):
        """Test health status when service is unhealthy."""
        self.service.is_model_loaded = False
        self.service.model = None
        
        status = self.service.get_health_status()
        
        self.assertEqual(status['status'], 'unhealthy')
        self.assertFalse(status['is_model_loaded'])
        self.assertIn("Model not loaded", status['errors'])
        self.assertIn("Model object is None", status['errors'])
    
    def test_format_prediction_result(self):
        """Test prediction result formatting."""
        prediction_result = {
            'prediction': 'faulty_bearing',
            'predicted_class_index': 2,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00',
            'data_hash': 'abc123',
            'model_info': {'model_path': 'test_model.keras', 'model_version': '1.0'}
        }
        prediction_result['confidence_scores']['faulty_bearing'] = 80.0
        
        formatted = self.service.format_prediction_result(prediction_result)
        
        # Check basic structure
        self.assertIn('prediction', formatted)
        self.assertIn('confidence_scores', formatted)
        self.assertIn('processing_info', formatted)
        self.assertIn('top_predictions', formatted)
        self.assertIn('metadata', formatted)
        
        # Check prediction details
        self.assertEqual(formatted['prediction']['fault_category'], 'faulty_bearing')
        self.assertEqual(formatted['prediction']['class_index'], 2)
        self.assertEqual(formatted['prediction']['confidence'], 80.0)
        self.assertEqual(formatted['prediction']['severity'], 'critical')
        self.assertEqual(formatted['prediction']['confidence_level'], 'high')
        
        # Check top predictions
        self.assertEqual(len(formatted['top_predictions']), 3)
        self.assertEqual(formatted['top_predictions'][0]['fault_category'], 'faulty_bearing')
        self.assertEqual(formatted['top_predictions'][0]['confidence'], 80.0)
    
    def test_format_prediction_result_without_metadata(self):
        """Test prediction result formatting without metadata."""
        prediction_result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.9,
            'processing_time_ms': 30.0,
            'timestamp': '2023-01-01T00:00:00',
            'data_hash': 'abc123',
            'model_info': {'model_path': 'test_model.keras'}
        }
        prediction_result['confidence_scores']['healthy'] = 90.0
        
        formatted = self.service.format_prediction_result(prediction_result, include_metadata=False)
        
        self.assertNotIn('metadata', formatted)
        self.assertEqual(formatted['prediction']['confidence_level'], 'very_high')
        self.assertEqual(formatted['prediction']['severity'], 'normal')
    
    def test_get_confidence_scores_with_ranking(self):
        """Test confidence scores with ranking and analysis."""
        prediction_probs = np.array([0.1, 0.05, 0.7, 0.05, 0.03, 0.02, 0.03, 0.02])
        
        result = self.service.get_confidence_scores_with_ranking(prediction_probs)
        
        # Check structure
        self.assertIn('confidence_scores', result)
        self.assertIn('ranked_predictions', result)
        self.assertIn('analysis', result)
        
        # Check ranking
        self.assertEqual(len(result['ranked_predictions']), 8)
        self.assertEqual(result['ranked_predictions'][0]['category'], 'faulty_bearing')
        self.assertEqual(result['ranked_predictions'][0]['confidence'], 70.0)
        self.assertEqual(result['ranked_predictions'][0]['rank'], 1)
        
        # Check analysis
        self.assertEqual(result['analysis']['max_confidence'], 70.0)
        self.assertGreater(result['analysis']['confidence_gap'], 0)
        self.assertIn(result['analysis']['certainty_level'], 
                     ['very_certain', 'certain', 'moderately_certain', 'uncertain', 'very_uncertain'])
        self.assertIsInstance(result['analysis']['entropy'], float)
    
    def test_calculate_entropy(self):
        """Test entropy calculation."""
        # Uniform distribution should have high entropy
        uniform_probs = np.array([0.125] * 8)
        uniform_entropy = self.service._calculate_entropy(uniform_probs)
        
        # Concentrated distribution should have low entropy
        concentrated_probs = np.array([0.9, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.03])
        concentrated_entropy = self.service._calculate_entropy(concentrated_probs)
        
        self.assertGreater(uniform_entropy, concentrated_entropy)
        self.assertIsInstance(uniform_entropy, float)
        self.assertIsInstance(concentrated_entropy, float)
    
    def test_validate_and_format_result_success(self):
        """Test successful validation and formatting."""
        prediction_result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00',
            'data_hash': 'abc123',
            'model_info': {'model_path': 'test_model.keras'}
        }
        prediction_result['confidence_scores']['healthy'] = 80.0
        
        is_valid, formatted_result, error_msg = self.service.validate_and_format_result(prediction_result)
        
        self.assertTrue(is_valid)
        self.assertEqual(error_msg, "")
        self.assertIn('prediction', formatted_result)
        self.assertIn('confidence_scores', formatted_result)
    
    def test_validate_and_format_result_invalid(self):
        """Test validation and formatting with invalid result."""
        invalid_result = {
            'prediction': 'invalid_category',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00'
        }
        
        is_valid, formatted_result, error_msg = self.service.validate_and_format_result(invalid_result)
        
        self.assertFalse(is_valid)
        self.assertEqual(formatted_result, {})
        self.assertIn("Invalid prediction category", error_msg)
    
    def test_create_error_response(self):
        """Test error response creation."""
        error_response = self.service.create_error_response("Test error", "TEST_ERROR")
        
        self.assertFalse(error_response['success'])
        self.assertIsNotNone(error_response['error'])
        self.assertEqual(error_response['error']['code'], "TEST_ERROR")
        self.assertEqual(error_response['error']['message'], "Test error")
        self.assertIsNone(error_response['prediction'])
        self.assertIsNone(error_response['confidence_scores'])
        self.assertIn('timestamp', error_response['error'])
    
    def test_create_success_response(self):
        """Test success response creation."""
        prediction_result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00',
            'data_hash': 'abc123',
            'model_info': {'model_path': 'test_model.keras'}
        }
        prediction_result['confidence_scores']['healthy'] = 80.0
        
        success_response = self.service.create_success_response(prediction_result)
        
        self.assertTrue(success_response['success'])
        self.assertIsNone(success_response['error'])
        self.assertIsNotNone(success_response['prediction'])
        self.assertIsNotNone(success_response['confidence_scores'])
        self.assertIn('top_predictions', success_response)
        self.assertIn('processing_info', success_response)
        self.assertIn('metadata', success_response)
    
    def test_create_success_response_without_metadata(self):
        """Test success response creation without metadata."""
        prediction_result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00',
            'data_hash': 'abc123',
            'model_info': {'model_path': 'test_model.keras'}
        }
        prediction_result['confidence_scores']['healthy'] = 80.0
        
        success_response = self.service.create_success_response(prediction_result, include_metadata=False)
        
        self.assertTrue(success_response['success'])
        self.assertEqual(success_response['metadata'], {})
    
    # Batch Prediction Tests
    def test_predict_batch_no_model(self):
        """Test batch prediction without loaded model."""
        data_list = [np.random.rand(1681) for _ in range(3)]
        
        with self.assertRaises(ValueError) as context:
            self.service.predict_batch(data_list)
        
        self.assertIn("Model not loaded", str(context.exception))
    
    def test_predict_batch_empty_list(self):
        """Test batch prediction with em    def t
est_create_success_response(self):
        """Test success response creation."""
        prediction_result = {
            'prediction': 'healthy',
            'predicted_class_index': 0,
            'confidence_scores': {category: 10.0 for category in self.expected_categories},
            'max_confidence': 0.8,
            'processing_time_ms': 50.0,
            'timestamp': '2023-01-01T00:00:00',
            'data_hash': 'abc123',
            'model_info': {'model_path': 'test_model.keras'}
        }
        prediction_result['confidence_scores']['healthy'] = 80.0
        
        success_response = self.service.create_success_response(prediction_result)
        
        self.assertTrue(success_response['success'])
        self.assertIsNone(success_response['error'])
        self.assertIn('prediction', success_response)
        self.assertIn('confidence_scores', success_response)
        self.assertIn('top_predictions', success_response)
        self.assertEqual(success_response['prediction']['fault_category'], 'healthy')
    
    def test_predict_batch_empty_list(self):
        """Test batch prediction with empty list."""
        self.service.is_model_loaded = True
        self.service.model = Mock()
        
        with self.assertRaises(ValueError) as context:
            self.service.predict_batch([])
        
        self.assertIn("Empty sensor data list", str(context.exception))
    
    def test_predict_batch_no_model(self):
        """Test batch prediction without loaded model."""
        test_data = [np.random.rand(1681) for _ in range(3)]
        
        with self.assertRaises(ValueError) as context:
            self.service.predict_batch(test_data)
        
        self.assertIn("Model not loaded", str(context.exception))
    
    @patch.object(PredictionService, '_predict_batch_chunked')
    def test_predict_batch_with_optimization(self, mock_chunked):
        """Test batch prediction with optimization enabled."""
        mock_chunked.return_value = {
            'batch_info': {
                'total_samples': 5,
                'successful_predictions': 5,
                'failed_predictions': 0,
                'success_rate': 100.0,
                'total_processing_time_ms': 100.0,
                'processing_method': 'chunked_optimized'
            },
            'results': [{'sample_index': i, 'prediction': 'healthy'} for i in range(5)],
            'errors': None
        }
        
        self.service.is_model_loaded = True
        self.service.model = Mock()
        test_data = [np.random.rand(1681) for _ in range(5)]
        
        result = self.service.predict_batch(test_data, use_optimization=True)
        
        mock_chunked.assert_called_once()
        self.assertEqual(result['batch_info']['processing_method'], 'chunked_optimized')
    
    def test_predict_batch_chunked(self):
        """Test chunked batch prediction."""
        # Setup mock model
        mock_predictions = np.array([
            [0.8, 0.05, 0.05, 0.03, 0.02, 0.02, 0.02, 0.01],
            [0.1, 0.7, 0.05, 0.05, 0.03, 0.02, 0.02, 0.02]
        ])
        mock_model = Mock()
        mock_model.predict.return_value = mock_predictions
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Mock predict_batch_optimized to return expected format
        with patch.object(self.service, 'predict_batch_optimized') as mock_optimized:
            mock_optimized.return_value = {
                'batch_info': {
                    'successful_predictions': 2,
                    'failed_predictions': 0
                },
                'results': [
                    {'sample_index': 0, 'prediction': 'healthy'},
                    {'sample_index': 1, 'prediction': 'bowed_rotor'}
                ],
                'errors': None
            }
            
            test_data = [np.random.rand(1681) for _ in range(2)]
            result = self.service._predict_batch_chunked(test_data, chunk_size=1)
            
            self.assertIn('batch_info', result)
            self.assertEqual(result['batch_info']['processing_method'], 'chunked_optimized')
            self.assertEqual(len(result['results']), 2)
    
    def test_data_buffer_creation(self):
        """Test data buffer creation."""
        buffer = self.service.create_data_buffer(buffer_size=50)
        
        self.assertIsNotNone(buffer)
        self.assertEqual(buffer.buffer_size, 50)
        self.assertEqual(len(buffer.buffer), 0)
    
    def test_data_buffer_add_sample(self):
        """Test adding samples to data buffer."""
        buffer = self.service.create_data_buffer(buffer_size=3)
        test_data = np.random.rand(1681)
        
        # Add sample successfully
        result = buffer.add_sample(test_data)
        
        self.assertTrue(result)
        self.assertEqual(len(buffer.buffer), 1)
        self.assertEqual(buffer.buffer[0]['index'], 0)
    
    def test_data_buffer_overflow(self):
        """Test data buffer behavior when full."""
        buffer = self.service.create_data_buffer(buffer_size=2)
        
        # Fill buffer
        for i in range(3):  # Add one more than capacity
            test_data = np.random.rand(1681)
            buffer.add_sample(test_data)
        
        # Buffer should maintain max size
        self.assertEqual(len(buffer.buffer), 2)
        # First sample should be removed (index should be 1, not 0)
        self.assertEqual(buffer.buffer[0]['index'], 1)
    
    def test_data_buffer_process(self):
        """Test processing data buffer."""
        buffer = self.service.create_data_buffer(buffer_size=2)
        
        # Add samples
        for i in range(2):
            test_data = np.random.rand(1681)
            buffer.add_sample(test_data)
        
        # Mock the prediction service
        with patch.object(self.service, 'predict_batch_optimized') as mock_predict:
            mock_predict.return_value = {
                'results': [
                    {'sample_index': 0, 'prediction': 'healthy'},
                    {'sample_index': 1, 'prediction': 'healthy'}
                ]
            }
            
            result = buffer.process_buffer()
            
            self.assertIn('results', result)
            self.assertIn('buffer_info', result)
            mock_predict.assert_called_once()
    
    def test_data_buffer_status(self):
        """Test getting data buffer status."""
        buffer = self.service.create_data_buffer(buffer_size=5)
        
        # Empty buffer status
        status = buffer.get_buffer_status()
        self.assertEqual(status['buffer_size'], 0)
        self.assertEqual(status['max_buffer_size'], 5)
        self.assertFalse(status['is_full'])
        self.assertIsNone(status['oldest_timestamp'])
        
        # Add sample and check status
        test_data = np.random.rand(1681)
        buffer.add_sample(test_data)
        
        status = buffer.get_buffer_status()
        self.assertEqual(status['buffer_size'], 1)
        self.assertIsNotNone(status['oldest_timestamp'])
        self.assertIsNotNone(status['newest_timestamp'])
    
    def test_process_data_stream_basic(self):
        """Test basic data stream processing."""
        # Mock predict_batch_optimized
        with patch.object(self.service, 'predict_batch_optimized') as mock_predict:
            mock_predict.return_value = {
                'batch_info': {
                    'successful_predictions': 3,
                    'total_processing_time_ms': 50.0
                },
                'results': [
                    {'sample_index': i, 'prediction': 'healthy', 'max_confidence': 0.8}
                    for i in range(3)
                ]
            }
            
            test_stream = [np.random.rand(1681) for _ in range(10)]
            result = self.service.process_data_stream(test_stream, window_size=3, overlap=0.0)
            
            self.assertIn('stream_info', result)
            self.assertIn('windows', result)
            self.assertIn('analytics', result)
            self.assertGreater(len(result['windows']), 0)
    
    def test_process_data_stream_with_anomaly_detection(self):
        """Test data stream processing with anomaly detection."""
        with patch.object(self.service, 'predict_batch_optimized') as mock_predict:
            mock_predict.return_value = {
                'batch_info': {
                    'successful_predictions': 2,
                    'total_processing_time_ms': 30.0
                },
                'results': [
                    {'sample_index': 0, 'prediction': 'healthy', 'max_confidence': 0.9},
                    {'sample_index': 1, 'prediction': 'faulty_bearing', 'max_confidence': 0.8}
                ]
            }
            
            test_stream = [np.random.rand(1681) for _ in range(6)]
            result = self.service.process_data_stream(
                test_stream, 
                window_size=2, 
                overlap=0.0,
                enable_anomaly_detection=True,
                confidence_threshold=0.7
            )
            
            self.assertIn('analytics', result)
            self.assertIn('fault_detections', result)
            # Should detect the faulty_bearing prediction
            self.assertGreater(len(result['fault_detections']), 0)
    
    def test_get_batch_performance_stats(self):
        """Test getting batch performance statistics."""
        # Simulate some predictions to generate stats
        self.service.prediction_count = 10
        self.service.total_prediction_time = 500.0  # 500ms total
        
        stats = self.service.get_batch_performance_stats()
        
        self.assertEqual(stats['total_predictions'], 10)
    
    # Enhanced Batch Prediction Performance Tests
    def test_batch_prediction_throughput_small(self):
        """Test batch prediction throughput with small batch size."""
        # Setup mock model for performance testing
        mock_model = Mock()
        mock_predictions = np.random.rand(10, 8)  # 10 samples, 8 classes
        mock_model.predict.return_value = mock_predictions
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        self.service.model_path = "test_model.keras"
        
        # Create test data (10 samples)
        test_data = [np.random.rand(1681).astype(np.float32) for _ in range(10)]
        
        # Measure performance
        start_time = time.time()
        result = self.service.predict_batch(test_data, use_optimization=True)
        end_time = time.time()
        
        processing_time_ms = (end_time - start_time) * 1000
        
        # Verify results
        self.assertIn('summary', result)
        self.assertEqual(result['summary']['total_samples'], 10)
        self.assertEqual(result['summary']['successful_predictions'], 10)
        self.assertGreater(result['summary']['throughput_samples_per_second'], 0)
        
        # Performance assertions (should process 10 samples quickly)
        self.assertLess(processing_time_ms, 5000)  # Less than 5 seconds
        self.assertGreater(result['summary']['throughput_samples_per_second'], 1)  # At least 1 sample/sec
    
    def test_batch_prediction_throughput_medium(self):
        """Test batch prediction throughput with medium batch size."""
        # Setup mock model
        mock_model = Mock()
        mock_predictions = np.random.rand(50, 8)  # 50 samples, 8 classes
        mock_model.predict.return_value = mock_predictions
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        self.service.model_path = "test_model.keras"
        
        # Create test data (50 samples)
        test_data = [np.random.rand(1681).astype(np.float32) for _ in range(50)]
        
        # Measure performance
        start_time = time.time()
        result = self.service.predict_batch(test_data, use_optimization=True, chunk_size=16)
        end_time = time.time()
        
        processing_time_ms = (end_time - start_time) * 1000
        
        # Verify results
        self.assertEqual(result['summary']['total_samples'], 50)
        self.assertEqual(result['summary']['successful_predictions'], 50)
        
        # Performance assertions
        self.assertLess(processing_time_ms, 10000)  # Less than 10 seconds
        self.assertGreater(result['summary']['throughput_samples_per_second'], 5)  # At least 5 samples/sec
        self.assertLess(result['summary']['average_time_per_sample_ms'], 200)  # Less than 200ms per sample
    
    def test_batch_prediction_throughput_large(self):
        """Test batch prediction throughput with large batch size."""
        # Setup mock model
        mock_model = Mock()
        
        # Mock chunked processing by making predict return different sized arrays
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        self.service.model_path = "test_model.keras"
        
        # Create test data (100 samples)
        test_data = [np.random.rand(1681).astype(np.float32) for _ in range(100)]
        
        # Measure performance with chunking
        start_time = time.time()
        result = self.service.predict_batch(test_data, use_optimization=True, chunk_size=32)
        end_time = time.time()
        
        processing_time_ms = (end_time - start_time) * 1000
        
        # Verify results
        self.assertEqual(result['summary']['total_samples'], 100)
        self.assertEqual(result['summary']['successful_predictions'], 100)
        
        # Performance assertions for large batch
        self.assertLess(processing_time_ms, 20000)  # Less than 20 seconds
        self.assertGreater(result['summary']['throughput_samples_per_second'], 5)  # At least 5 samples/sec
        self.assertLess(result['summary']['average_time_per_sample_ms'], 200)  # Less than 200ms per sample
        
        # Verify chunking was used
        self.assertIn('chunk_size', result['summary'])
        self.assertEqual(result['summary']['chunk_size'], 32)
    
    def test_batch_prediction_memory_efficiency(self):
        """Test that batch prediction handles memory efficiently with large datasets."""
        # Setup mock model
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            # Simulate memory-efficient processing
            batch_size = data.shape[0]
            self.assertLessEqual(batch_size, 32)  # Ensure chunks are not too large
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Create large test dataset (200 samples)
        test_data = [np.random.rand(1681).astype(np.float32) for _ in range(200)]
        
        # Process with small chunk size for memory efficiency
        result = self.service.predict_batch(test_data, use_optimization=True, chunk_size=16)
        
        # Verify all samples were processed
        self.assertEqual(result['summary']['total_samples'], 200)
        self.assertEqual(result['summary']['successful_predictions'], 200)
        
        # Verify chunking parameters
        self.assertEqual(result['summary']['chunk_size'], 16)
        expected_chunks = (200 + 16 - 1) // 16  # Ceiling division
        self.assertEqual(result['summary']['total_chunks'], expected_chunks)
    
    def test_batch_prediction_concurrent_performance(self):
        """Test batch prediction performance under concurrent load simulation."""
        import threading
        import queue
        
        # Setup mock model
        mock_model = Mock()
        mock_model.predict.return_value = np.random.rand(10, 8)
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Create multiple small batches to simulate concurrent requests
        test_batches = [
            [np.random.rand(1681).astype(np.float32) for _ in range(10)]
            for _ in range(5)  # 5 concurrent batches
        ]
        
        results_queue = queue.Queue()
        threads = []
        
        def process_batch(batch_data, batch_id):
            try:
                start_time = time.time()
                result = self.service.predict_batch(batch_data, use_optimization=True)
                end_time = time.time()
                
                results_queue.put({
                    'batch_id': batch_id,
                    'result': result,
                    'processing_time': (end_time - start_time) * 1000,
                    'success': True
                })
            except Exception as e:
                results_queue.put({
                    'batch_id': batch_id,
                    'error': str(e),
                    'success': False
                })
        
        # Start concurrent processing
        start_time = time.time()
        for i, batch in enumerate(test_batches):
            thread = threading.Thread(target=process_batch, args=(batch, i))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        total_time = (time.time() - start_time) * 1000
        
        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())
        
        # Verify all batches completed successfully
        self.assertEqual(len(results), 5)
        successful_results = [r for r in results if r['success']]
        self.assertEqual(len(successful_results), 5)
        
        # Performance assertions
        self.assertLess(total_time, 15000)  # Total time less than 15 seconds
        
        # Verify each batch processed correctly
        for result in successful_results:
            batch_result = result['result']
            self.assertEqual(batch_result['summary']['total_samples'], 10)
            self.assertEqual(batch_result['summary']['successful_predictions'], 10)
            self.assertLess(result['processing_time'], 5000)  # Each batch < 5 seconds
    
    def test_batch_prediction_error_handling_performance(self):
        """Test batch prediction performance when handling errors."""
        # Setup mock model
        mock_model = Mock()
        mock_model.predict.return_value = np.random.rand(5, 8)
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Create mixed data: some valid, some invalid
        test_data = [
            np.random.rand(1681).astype(np.float32),  # Valid
            np.random.rand(1000).astype(np.float32),  # Invalid size
            np.random.rand(1681).astype(np.float32),  # Valid
            np.array([np.nan] * 1681),                # Invalid (NaN)
            np.random.rand(1681).astype(np.float32),  # Valid
        ]
        
        # Measure performance with error handling
        start_time = time.time()
        result = self.service.predict_batch(test_data, use_optimization=True)
        end_time = time.time()
        
        processing_time_ms = (end_time - start_time) * 1000
        
        # Verify error handling
        self.assertEqual(result['summary']['total_samples'], 5)
        self.assertEqual(result['summary']['successful_predictions'], 3)  # 3 valid samples
        self.assertEqual(result['summary']['failed_predictions'], 2)      # 2 invalid samples
        self.assertEqual(result['summary']['success_rate'], 60.0)         # 3/5 * 100
        
        # Performance should still be reasonable despite errors
        self.assertLess(processing_time_ms, 5000)  # Less than 5 seconds
        self.assertGreater(result['summary']['throughput_samples_per_second'], 1)
        
        # Verify error details are captured
        self.assertIn('errors', result)
        self.assertEqual(len(result['errors']), 2)
    
    def test_data_stream_processing_performance(self):
        """Test real-time data stream processing performance."""
        # Setup mock model
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Create simulated IoT data stream (100 samples)
        data_stream = [np.random.rand(1681).astype(np.float32) for _ in range(100)]
        
        # Test stream processing with different window configurations
        test_configs = [
            {'window_size': 10, 'overlap': 0.0},   # No overlap
            {'window_size': 10, 'overlap': 0.5},   # 50% overlap
            {'window_size': 20, 'overlap': 0.25},  # 25% overlap
        ]
        
        for config in test_configs:
            with self.subTest(config=config):
                start_time = time.time()
                result = self.service.process_data_stream(
                    data_stream, 
                    window_size=config['window_size'],
                    overlap=config['overlap']
                )
                end_time = time.time()
                
                processing_time_ms = (end_time - start_time) * 1000
                
                # Verify stream processing results
                self.assertIn('stream_info', result)
                self.assertEqual(result['stream_info']['total_samples'], 100)
                self.assertGreater(result['stream_info']['total_windows'], 0)
                self.assertGreater(result['stream_info']['throughput_samples_per_second'], 0)
                
                # Performance assertions
                self.assertLess(processing_time_ms, 30000)  # Less than 30 seconds
                self.assertGreater(result['stream_info']['throughput_samples_per_second'], 3)
                
                # Verify window processing
                self.assertIn('windows', result)
                self.assertGreater(len(result['windows']), 0)
    
    def test_iot_buffer_processing_performance(self):
        """Test IoT data buffer processing performance."""
        # Create data buffer
        buffer = self.service.create_data_buffer(buffer_size=50)
        
        # Setup mock model
        mock_model = Mock()
        mock_model.predict.return_value = np.random.rand(25, 8)
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Simulate IoT data arrival
        test_samples = [np.random.rand(1681).astype(np.float32) for _ in range(25)]
        
        # Add samples to buffer and measure performance
        start_time = time.time()
        
        for sample in test_samples:
            buffer.add_sample(sample)
        
        # Process buffer
        result = buffer.process_buffer()
        
        end_time = time.time()
        processing_time_ms = (end_time - start_time) * 1000
        
        # Verify buffer processing
        self.assertIn('results', result)
        self.assertIn('buffer_info', result)
        self.assertEqual(result['buffer_info']['processed_samples'], 25)
        
        # Performance assertions
        self.assertLess(processing_time_ms, 10000)  # Less than 10 seconds
        
        # Verify buffer state
        buffer_status = buffer.get_buffer_status()
        self.assertEqual(buffer_status['buffer_size'], 25)
        self.assertFalse(buffer_status['is_full'])  # Buffer size is 50, we added 25
        self.assertEqual(stats['total_processing_time_ms'], 500.0)
        self.assertEqual(stats['average_prediction_time_ms'], 50.0)  # 500/10
        self.assertEqual(stats['predictions_per_second'], 20.0)  # 10/(500/1000)
        self.assertIn('model_info', stats)

    def test_batch_prediction_scalability_performance(self):
        """Test batch prediction scalability with increasing batch sizes."""
        # Setup mock model
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            # Simulate realistic processing time based on batch size
            time.sleep(0.001 * batch_size)  # 1ms per sample
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Test different batch sizes
        batch_sizes = [1, 5, 10, 25, 50, 100]
        performance_results = []
        
        for batch_size in batch_sizes:
            with self.subTest(batch_size=batch_size):
                # Create test data
                test_data = [np.random.rand(1681).astype(np.float32) for _ in range(batch_size)]
                
                # Measure performance
                start_time = time.time()
                result = self.service.predict_batch(test_data, use_optimization=True, chunk_size=32)
                end_time = time.time()
                
                processing_time_ms = (end_time - start_time) * 1000
                throughput = result['summary']['throughput_samples_per_second']
                
                performance_results.append({
                    'batch_size': batch_size,
                    'processing_time_ms': processing_time_ms,
                    'throughput': throughput,
                    'avg_time_per_sample': processing_time_ms / batch_size
                })
                
                # Verify results
                self.assertEqual(result['summary']['total_samples'], batch_size)
                self.assertEqual(result['summary']['successful_predictions'], batch_size)
                self.assertEqual(result['summary']['success_rate'], 100.0)
                
                # Performance assertions
                self.assertGreater(throughput, 0)
                self.assertLess(result['summary']['average_time_per_sample_ms'], 1000)  # Less than 1 second per sample
        
        # Verify scalability - larger batches should have better throughput
        small_batch_throughput = performance_results[0]['throughput']  # batch_size=1
        large_batch_throughput = performance_results[-1]['throughput']  # batch_size=100
        
        # Large batches should be more efficient (higher throughput)
        self.assertGreater(large_batch_throughput, small_batch_throughput * 0.5)  # At least 50% of single throughput

    def test_batch_prediction_memory_usage_performance(self):
        """Test batch prediction memory usage with different chunk sizes."""
        import psutil
        import os
        
        # Setup mock model
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            # Simulate memory usage proportional to batch size
            dummy_data = np.random.rand(batch_size, 1681, 8)  # Simulate intermediate processing
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Create large test dataset
        test_data = [np.random.rand(1681).astype(np.float32) for _ in range(200)]
        
        # Test different chunk sizes
        chunk_sizes = [8, 16, 32, 64]
        memory_results = []
        
        for chunk_size in chunk_sizes:
            with self.subTest(chunk_size=chunk_size):
                # Measure memory before processing
                process = psutil.Process(os.getpid())
                memory_before = process.memory_info().rss / 1024 / 1024  # MB
                
                # Process batch
                start_time = time.time()
                result = self.service.predict_batch(test_data, use_optimization=True, chunk_size=chunk_size)
                end_time = time.time()
                
                # Measure memory after processing
                memory_after = process.memory_info().rss / 1024 / 1024  # MB
                memory_used = memory_after - memory_before
                
                processing_time_ms = (end_time - start_time) * 1000
                
                memory_results.append({
                    'chunk_size': chunk_size,
                    'memory_used_mb': memory_used,
                    'processing_time_ms': processing_time_ms,
                    'throughput': result['summary']['throughput_samples_per_second']
                })
                
                # Verify results
                self.assertEqual(result['summary']['total_samples'], 200)
                self.assertEqual(result['summary']['successful_predictions'], 200)
                self.assertEqual(result['summary']['chunk_size'], chunk_size)
                
                # Performance assertions
                self.assertLess(processing_time_ms, 60000)  # Less than 1 minute
                self.assertGreater(result['summary']['throughput_samples_per_second'], 1)
        
        # Verify memory efficiency - smaller chunks should use less peak memory
        # (This is a general expectation, actual results may vary)
        small_chunk_memory = memory_results[0]['memory_used_mb']  # chunk_size=8
        large_chunk_memory = memory_results[-1]['memory_used_mb']  # chunk_size=64
        
        # Log memory usage for analysis
        for result in memory_results:
            print(f"Chunk size {result['chunk_size']}: {result['memory_used_mb']:.2f} MB, "
                  f"{result['processing_time_ms']:.2f} ms, {result['throughput']:.2f} samples/sec")

    def test_real_time_iot_stream_performance(self):
        """Test real-time IoT data stream processing performance with continuous data flow."""
        # Setup mock model
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            # Simulate realistic IoT processing time
            time.sleep(0.0005 * batch_size)  # 0.5ms per sample
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Create IoT data buffer for continuous monitoring
        buffer = self.service.create_data_buffer(buffer_size=100)
        
        # Simulate continuous IoT data stream
        total_samples = 150
        iot_data_stream = [np.random.rand(1681).astype(np.float32) for _ in range(total_samples)]
        
        # Performance metrics
        processing_times = []
        buffer_utilizations = []
        throughput_measurements = []
        
        start_time = time.time()
        
        # Simulate real-time data arrival and processing
        for i, sample in enumerate(iot_data_stream):
            sample_start = time.time()
            
            # Add sample to buffer
            add_result = buffer.add_sample(sample, metadata={'sample_id': i, 'timestamp': time.time()})
            
            # Check if automatic processing was triggered
            if add_result.get('auto_processed', False):
                processing_result = add_result.get('processing_result', {})
                if 'processing_time_ms' in processing_result:
                    processing_times.append(processing_result['processing_time_ms'])
                
                # Calculate throughput for this processing cycle
                if 'buffer_info' in processing_result:
                    processed_samples = processing_result['buffer_info']['processed_samples']
                    processing_time_s = processing_result['processing_time_ms'] / 1000
                    if processing_time_s > 0:
                        throughput = processed_samples / processing_time_s
                        throughput_measurements.append(throughput)
            
            # Track buffer utilization
            buffer_status = buffer.get_buffer_status()
            utilization = (buffer_status['buffer_size'] / buffer_status['max_buffer_size']) * 100
            buffer_utilizations.append(utilization)
            
            sample_end = time.time()
            sample_processing_time = (sample_end - sample_start) * 1000
            
            # Simulate IoT data arrival rate (10ms between samples)
            time.sleep(0.01)
        
        # Process any remaining data in buffer
        final_result = buffer.process_buffer()
        
        total_time = time.time() - start_time
        
        # Performance analysis
        avg_processing_time = np.mean(processing_times) if processing_times else 0
        max_processing_time = np.max(processing_times) if processing_times else 0
        avg_throughput = np.mean(throughput_measurements) if throughput_measurements else 0
        max_buffer_utilization = np.max(buffer_utilizations) if buffer_utilizations else 0
        
        # Assertions for real-time performance
        self.assertLess(avg_processing_time, 5000)  # Average processing < 5 seconds
        self.assertLess(max_processing_time, 10000)  # Max processing < 10 seconds
        self.assertGreater(avg_throughput, 5)  # Average throughput > 5 samples/sec
        self.assertLess(max_buffer_utilization, 100)  # Buffer should not overflow
        
        # Verify final processing
        self.assertIn('results', final_result)
        
        # Log performance metrics
        print(f"IoT Stream Performance:")
        print(f"  Total time: {total_time:.2f}s")
        print(f"  Average processing time: {avg_processing_time:.2f}ms")
        print(f"  Max processing time: {max_processing_time:.2f}ms")
        print(f"  Average throughput: {avg_throughput:.2f} samples/sec")
        print(f"  Max buffer utilization: {max_buffer_utilization:.1f}%")
        print(f"  Processing cycles: {len(processing_times)}")

    def test_batch_prediction_latency_distribution(self):
        """Test batch prediction latency distribution for performance consistency."""
        # Setup mock model with variable processing time
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            # Add some randomness to simulate real-world variability
            base_time = 0.001 * batch_size
            random_factor = np.random.uniform(0.8, 1.2)  # ±20% variability
            time.sleep(base_time * random_factor)
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Run multiple batch predictions to measure latency distribution
        batch_size = 20
        num_runs = 20
        latencies = []
        throughputs = []
        
        for run in range(num_runs):
            test_data = [np.random.rand(1681).astype(np.float32) for _ in range(batch_size)]
            
            start_time = time.time()
            result = self.service.predict_batch(test_data, use_optimization=True)
            end_time = time.time()
            
            latency_ms = (end_time - start_time) * 1000
            throughput = result['summary']['throughput_samples_per_second']
            
            latencies.append(latency_ms)
            throughputs.append(throughput)
            
            # Verify each run
            self.assertEqual(result['summary']['total_samples'], batch_size)
            self.assertEqual(result['summary']['successful_predictions'], batch_size)
        
        # Calculate latency statistics
        mean_latency = np.mean(latencies)
        std_latency = np.std(latencies)
        p95_latency = np.percentile(latencies, 95)
        p99_latency = np.percentile(latencies, 99)
        
        mean_throughput = np.mean(throughputs)
        std_throughput = np.std(throughputs)
        
        # Performance consistency assertions
        self.assertLess(mean_latency, 10000)  # Mean latency < 10 seconds
        self.assertLess(std_latency, mean_latency * 0.5)  # Std dev < 50% of mean (reasonable consistency)
        self.assertLess(p95_latency, mean_latency * 2)  # 95th percentile < 2x mean
        self.assertLess(p99_latency, mean_latency * 3)  # 99th percentile < 3x mean
        
        self.assertGreater(mean_throughput, 1)  # Mean throughput > 1 sample/sec
        self.assertLess(std_throughput, mean_throughput * 0.3)  # Throughput should be relatively stable
        
        # Log latency distribution
        print(f"Latency Distribution (ms):")
        print(f"  Mean: {mean_latency:.2f}")
        print(f"  Std Dev: {std_latency:.2f}")
        print(f"  95th percentile: {p95_latency:.2f}")
        print(f"  99th percentile: {p99_latency:.2f}")
        print(f"Throughput Distribution (samples/sec):")
        print(f"  Mean: {mean_throughput:.2f}")
        print(f"  Std Dev: {std_throughput:.2f}")

    def test_batch_prediction_resource_utilization(self):
        """Test batch prediction resource utilization efficiency."""
        import threading
        
        # Setup mock model
        mock_model = Mock()
        
        def mock_predict_side_effect(data):
            batch_size = data.shape[0]
            # Simulate CPU-intensive processing
            time.sleep(0.002 * batch_size)  # 2ms per sample
            return np.random.rand(batch_size, 8)
        
        mock_model.predict.side_effect = mock_predict_side_effect
        
        self.service.model = mock_model
        self.service.is_model_loaded = True
        
        # Test resource utilization with concurrent batch processing
        num_concurrent_batches = 3
        batch_size = 30
        results = []
        
        def process_batch(batch_id):
            test_data = [np.random.rand(1681).astype(np.float32) for _ in range(batch_size)]
            
            start_time = time.time()
            result = self.service.predict_batch(test_data, use_optimization=True, chunk_size=15)
            end_time = time.time()
            
            processing_time = (end_time - start_time) * 1000
            
            results.append({
                'batch_id': batch_id,
                'processing_time_ms': processing_time,
                'throughput': result['summary']['throughput_samples_per_second'],
                'success_rate': result['summary']['success_rate'],
                'total_samples': result['summary']['total_samples']
            })
        
        # Start concurrent batch processing
        threads = []
        overall_start = time.time()
        
        for i in range(num_concurrent_batches):
            thread = threading.Thread(target=process_batch, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all batches to complete
        for thread in threads:
            thread.join()
        
        overall_end = time.time()
        total_processing_time = (overall_end - overall_start) * 1000
        
        # Analyze resource utilization
        self.assertEqual(len(results), num_concurrent_batches)
        
        total_samples_processed = sum(r['total_samples'] for r in results)
        average_throughput = np.mean([r['throughput'] for r in results])
        overall_throughput = total_samples_processed / (total_processing_time / 1000)
        
        # Verify all batches completed successfully
        for result in results:
            self.assertEqual(result['success_rate'], 100.0)
            self.assertEqual(result['total_samples'], batch_size)
            self.assertGreater(result['throughput'], 0)
        
        # Resource utilization assertions
        self.assertGreater(average_throughput, 5)  # Average throughput > 5 samples/sec
        self.assertGreater(overall_throughput, 10)  # Overall throughput > 10 samples/sec
        self.assertLess(total_processing_time, 30000)  # Total time < 30 seconds
        
        # Log resource utilization metrics
        print(f"Resource Utilization:")
        print(f"  Concurrent batches: {num_concurrent_batches}")
        print(f"  Total samples: {total_samples_processed}")
        print(f"  Total time: {total_processing_time:.2f}ms")
        print(f"  Average throughput: {average_throughput:.2f} samples/sec")
        print(f"  Overall throughput: {overall_throughput:.2f} samples/sec")


if __name__ == '__main__':
    unittest.main()