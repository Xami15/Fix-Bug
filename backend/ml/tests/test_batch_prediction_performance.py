"""
Performance tests for batch prediction capabilities.

This module tests the performance and throughput of the batch prediction
system, including data buffering, windowing, and real-time processing.
"""

import pytest
import numpy as np
import time
import threading
from typing import List, Dict
import logging
from unittest.mock import Mock, patch

# Import the modules to test
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from prediction_service import PredictionService, DataBuffer
from data_processor import DataProcessor

logger = logging.getLogger(__name__)


class TestBatchPredictionPerformance:
    """Test suite for batch prediction performance and throughput."""
    
    @pytest.fixture
    def mock_model(self):
        """Create a mock TensorFlow model for testing."""
        mock_model = Mock()
        mock_model.input_shape = (None, 1681, 1)
        mock_model.output_shape = (None, 8)
        mock_model.count_params.return_value = 100000
        
        # Mock prediction results
        def mock_predict(data, verbose=0):
            batch_size = data.shape[0]
            # Return random probabilities that sum to 1 for each sample
            predictions = np.random.dirichlet(np.ones(8), size=batch_size)
            return predictions
        
        mock_model.predict = mock_predict
        return mock_model
    
    @pytest.fixture
    def prediction_service(self, mock_model):
        """Create a PredictionService instance with mocked model."""
        service = PredictionService()
        service.model = mock_model
        service.is_model_loaded = True
        return service
    
    @pytest.fixture
    def sample_sensor_data(self):
        """Generate sample sensor data for testing."""
        return np.random.rand(1681).astype(np.float32)
    
    @pytest.fixture
    def batch_sensor_data(self, sample_sensor_data):
        """Generate batch of sensor data for testing."""
        return [np.random.rand(1681).astype(np.float32) for _ in range(100)]
    
    def test_single_prediction_performance(self, prediction_service, sample_sensor_data):
        """Test performance of single prediction."""
        # Warm up
        prediction_service.predict_single(sample_sensor_data)
        
        # Measure performance
        start_time = time.time()
        iterations = 50
        
        for _ in range(iterations):
            result = prediction_service.predict_single(sample_sensor_data)
            assert 'prediction' in result
            assert 'processing_time_ms' in result
        
        total_time = time.time() - start_time
        avg_time_per_prediction = (total_time / iterations) * 1000  # Convert to ms
        
        logger.info(f"Single prediction average time: {avg_time_per_prediction:.2f}ms")
        
        # Performance assertions
        assert avg_time_per_prediction < 100, f"Single prediction too slow: {avg_time_per_prediction:.2f}ms"
        assert result['processing_time_ms'] > 0
    
    def test_batch_prediction_performance(self, prediction_service, batch_sensor_data):
        """Test performance of batch prediction."""
        batch_sizes = [10, 25, 50, 100]
        performance_results = {}
        
        for batch_size in batch_sizes:
            test_data = batch_sensor_data[:batch_size]
            
            # Warm up
            prediction_service.predict_batch(test_data)
            
            # Measure performance
            start_time = time.time()
            result = prediction_service.predict_batch(test_data)
            processing_time = time.time() - start_time
            
            # Calculate metrics
            throughput = batch_size / processing_time  # samples per second
            avg_time_per_sample = (processing_time / batch_size) * 1000  # ms per sample
            
            performance_results[batch_size] = {
                'total_time_ms': processing_time * 1000,
                'throughput_sps': throughput,
                'avg_time_per_sample_ms': avg_time_per_sample
            }
            
            logger.info(f"Batch size {batch_size}: {throughput:.1f} samples/sec, {avg_time_per_sample:.2f}ms/sample")
            
            # Assertions
            assert result['batch_info']['successful_predictions'] == batch_size
            assert result['batch_info']['success_rate'] == 100.0
            assert throughput > 5, f"Batch throughput too low: {throughput:.1f} samples/sec"
        
        # Test that larger batches are more efficient
        assert performance_results[100]['throughput_sps'] > performance_results[10]['throughput_sps']
    
    def test_optimized_vs_individual_batch_processing(self, prediction_service, batch_sensor_data):
        """Compare performance of optimized vs individual batch processing."""
        test_data = batch_sensor_data[:50]
        
        # Test individual processing
        start_time = time.time()
        individual_result = prediction_service.predict_batch(test_data, use_optimization=False)
        individual_time = time.time() - start_time
        
        # Test optimized processing
        start_time = time.time()
        optimized_result = prediction_service.predict_batch(test_data, use_optimization=True)
        optimized_time = time.time() - start_time
        
        # Calculate performance improvement
        speedup = individual_time / optimized_time
        
        logger.info(f"Individual processing: {individual_time:.3f}s")
        logger.info(f"Optimized processing: {optimized_time:.3f}s")