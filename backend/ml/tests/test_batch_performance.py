"""
Performance tests for batch prediction capabilities.

Tests cover throughput, latency, memory usage, and scalability
for batch processing operations in the PredictionService.
"""

import unittest
import numpy as np
import time
import psutil
import os
from unittest.mock import Mock, patch
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from src.prediction_service import PredictionService, DataBuffer


class TestBatchPerformance(unittest.TestCase):
    """Performance test cases for batch prediction operations."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.service = PredictionService(data_path="test_data")
        
        # Mock model for performance testing
        self.mock_model = Mock()
        self.mock_model.input_shape = (None, 1681, 1)
        self.mock_model.output_shape = (None, 8)
        
        # Create predictable mock predictions
        self.mock_predictions = np.array([
            [0.8, 0.05, 0.05, 0.03, 0.02, 0.02, 0.02, 0.01]  # Healthy prediction
        ])
        self.mock_model.predict.return_value = self.mock_predictions
        
        # Set up service with mock model
        self.service.model = self.mock_model
        self.service.is_model_loaded = True
        self.service.model_path = "mock_model.keras"
        
        # Performance thresholds
        self.max_single_prediction_time_ms = 100  # 100ms per prediction
        self.min_batch_throughput_samples_per_sec = 50  # 50 samples/second
        self.max_memory_increase_mb = 500  # 500MB memory increase
    
    def tearDown(self):
        """Clean up after tests."""
        self.service.reset_performance_stats()
    
    def _create_test_data(self, num_samples: int) -> list:
        """Create test sensor data."""
        return [np.random.rand(1681).astype(np.float32) for _ in range(num_samples)]
    
    def _measure_memory_usage(self):
        """Get current memory usage in MB."""
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / 1024 / 1024
    
    def test_single_prediction_latency(self):
        """Test latency of single predictions."""
        print("\n=== Testing Single Prediction Latency ===")
        
        test_data = self._create_test_data(1)[0]
        
        # Warm up
        self.service.predict_single(test_data)
        
        # Measure latency over multiple runs
        latencies = []
        num_runs = 100
        
        for i in range(num_runs):
            start_time = time.time()
            result = self.service.predict_single(test_data)
            latency_ms = (time.time() - start_time) * 1000
            latencies.append(latency_ms)
            
            # Verify result structure
            self.assertIn('prediction', result)
            self.assertIn('processing_time_ms', result)
        
        # Calculate statistics
        avg_latency = np.mean(latencies)
        p95_latency = np.percentile(latencies, 95)
        p99_latency = np.percentile(latencies, 99)
        
        print(f"Single Prediction Latency:")
        print(f"  Average: {avg_latency:.2f}ms")
        print(f"  95th percentile: {p95_latency:.2f}ms")
        print(f"  99th percentile: {p99_latency:.2f}ms")
        print(f"  Max allowed: {self.max_single_prediction_time_ms}ms")
        
        # Performance assertions
        self.assertLess(avg_latency, self.max_single_prediction_time_ms,
                       f"Average latency {avg_latency:.2f}ms exceeds threshold {self.max_single_prediction_time_ms}ms")
        self.assertLess(p95_latency, self.max_single_prediction_time_ms * 1.5,
                       f"95th percentile latency {p95_latency:.2f}ms exceeds threshold")
    
    def test_batch_prediction_throughput(self):
        """Test throughput of batch predictions."""
        print("\n=== Testing Batch Prediction Throughput ===")
        
        batch_sizes = [1, 5, 10, 25, 50, 100]
        results = {}
        
        for batch_size in batch_sizes:
            print(f"\nTesting batch size: {batch_size}")
            
            test_data = self._create_test_data(batch_size)
            
            # Measure batch processing time
            start_time = time.time()
            batch_result = self.service.predict_batch(test_data)
            processing_time = time.time() - start_time
            
            # Calculate throughput
            throughput = batch_size / processing_time
            
            # Handle different result structures
            if 'batch_info' in batch_result:
                success_rate = batch_result['batch_info']['success_rate']
            elif 'summary' in batch_result:
                success_rate = batch_result['summary']['success_rate']
            else:
                # Calculate success rate from results
                total_results = len(batch_result.get('results', []))
                successful_results = len([r for r in batch_result.get('results', []) if r.get('success', True)])
                success_rate = (successful_results / total_results * 100) if total_results > 0 else 0
            
            results[batch_size] = {
                'processing_time_s': processing_time,
                'throughput_samples_per_sec': throughput,
                'success_rate': success_rate
            }
            
            print(f"  Processing time: {processing_time:.3f}s")
            print(f"  Throughput: {throughput:.2f} samples/sec")
            print(f"  Success rate: {success_rate:.1f}%")
            
            # Verify all predictions succeeded
            self.assertEqual(success_rate, 100.0)
            self.assertEqual(len(batch_result.get('results', [])), batch_size)
        
        # Check that larger batches have better throughput
        throughput_10 = results[10]['throughput_samples_per_sec']
        throughput_50 = results[50]['throughput_samples_per_sec']
        
        print(f"\nThroughput comparison:")
        print(f"  Batch size 10: {throughput_10:.2f} samples/sec")
        print(f"  Batch size 50: {throughput_50:.2f} samples/sec")
        print(f"  Minimum required: {self.min_batch_throughput_samples_per_sec} samples/sec")
        
        # Performance assertions
        self.assertGreater(throughput_50, self.min_batch_throughput_samples_per_sec,
                          f"Batch throughput {throughput_50:.2f} samples/sec below threshold")
        self.assertGreater(throughput_50, throughput_10 * 0.8,
                          "Larger batches should have similar or better throughput")
    
    def test_optimized_vs_regular_batch_performance(self):
        """Compare performance of optimized vs regular batch processing."""
        print("\n=== Testing Optimized vs Regular Batch Performance ===")
        
        batch_size = 50
        test_data = self._create_test_data(batch_size)
        
        # Test regular batch processing
        start_time = time.time()
        regular_result = self.service.predict_batch(test_data, use_optimization=False)
        regular_time = time.time() - start_time
        
        # Test optimized batch processing
        start_time = time.time()
        optimized_result = self.service.predict_batch(test_data, use_optimization=True)
        optimized_time = time.time() - start_time
        
        # Calculate performance metrics
        regular_throughput = batch_size / regular_time
        optimized_throughput = batch_size / optimized_time
        speedup = regular_time / optimized_time
        
        print(f"Regular batch processing:")
        print(f"  Time: {regular_time:.3f}s")
        print(f"  Throughput: {regular_throughput:.2f} samples/sec")
        
        print(f"Optimized batch processing:")
        print(f"  Time: {optimized_time:.3f}s")
        print(f"  Throughput: {optimized_throughput:.2f} samples/sec")
        print(f"  Speedup: {speedup:.2f}x")
        
        # Verify both methods produce same results
        self.assertEqual(len(regular_result.get('results', [])), len(optimized_result.get('results', [])))
        
        # Get success rates with fallback
        regular_success = regular_result.get('batch_info', {}).get('success_rate', 
                         regular_result.get('summary', {}).get('success_rate', 100.0))
        optimized_success = optimized_result.get('batch_info', {}).get('success_rate',
                           optimized_result.get('summary', {}).get('success_rate', 100.0))
        
        self.assertEqual(regular_success, optimized_success)
        
        # Performance assertion - optimized should be faster or at least as fast
        self.assertGreaterEqual(speedup, 0.9, 
                               "Optimized batch processing should not be significantly slower")
    
    def test_chunked_batch_processing_performance(self):
        """Test performance of chunked batch processing for large datasets."""
        print("\n=== Testing Chunked Batch Processing Performance ===")
        
        large_batch_size = 200
        chunk_sizes = [16, 32, 64]
        test_data = self._create_test_data(large_batch_size)
        
        results = {}
        
        for chunk_size in chunk_sizes:
            print(f"\nTesting chunk size: {chunk_size}")
            
            start_time = time.time()
            result = self.service._predict_batch_chunked(test_data, chunk_size)
            processing_time = time.time() - start_time
            
            throughput = large_batch_size / processing_time
            
            results[chunk_size] = {
                'processing_time_s': processing_time,
                'throughput_samples_per_sec': throughput,
                'success_rate': result['batch_info']['success_rate']
            }
            
            print(f"  Processing time: {processing_time:.3f}s")
            print(f"  Throughput: {throughput:.2f} samples/sec")
            print(f"  Success rate: {result['batch_info']['success_rate']:.1f}%")
            print(f"  Total chunks: {result['batch_info']['total_chunks']}")
            
            # Verify results
            success_rate = result.get('batch_info', {}).get('success_rate', 
                          result.get('summary', {}).get('success_rate', 100.0))
            self.assertEqual(success_rate, 100.0)
            self.assertEqual(len(result.get('results', [])), large_batch_size)
        
        # Find optimal chunk size
        best_chunk_size = max(results.keys(), key=lambda k: results[k]['throughput_samples_per_sec'])
        best_throughput = results[best_chunk_size]['throughput_samples_per_sec']
        
        print(f"\nOptimal chunk size: {best_chunk_size} (throughput: {best_throughput:.2f} samples/sec)")
        
        # Performance assertion
        self.assertGreater(best_throughput, self.min_batch_throughput_samples_per_sec,
                          f"Best chunked throughput {best_throughput:.2f} below threshold")
    
    def test_memory_usage_during_batch_processing(self):
        """Test memory usage during large batch processing."""
        print("\n=== Testing Memory Usage During Batch Processing ===")
        
        # Measure baseline memory
        baseline_memory = self._measure_memory_usage()
        print(f"Baseline memory usage: {baseline_memory:.2f} MB")
        
        # Test with increasingly large batches
        batch_sizes = [50, 100, 200, 500]
        memory_usage = {}
        
        for batch_size in batch_sizes:
            print(f"\nTesting batch size: {batch_size}")
            
            # Create test data
            test_data = self._create_test_data(batch_size)
            
            # Measure memory before processing
            memory_before = self._measure_memory_usage()
            
            # Process batch
            result = self.service.predict_batch(test_data)
            
            # Measure memory after processing
            memory_after = self._measure_memory_usage()
            memory_increase = memory_after - memory_before
            
            memory_usage[batch_size] = {
                'memory_before_mb': memory_before,
                'memory_after_mb': memory_after,
                'memory_increase_mb': memory_increase,
                'memory_per_sample_kb': (memory_increase * 1024) / batch_size if batch_size > 0 else 0
            }
            
            print(f"  Memory before: {memory_before:.2f} MB")
            print(f"  Memory after: {memory_after:.2f} MB")
            print(f"  Memory increase: {memory_increase:.2f} MB")
            print(f"  Memory per sample: {memory_usage[batch_size]['memory_per_sample_kb']:.2f} KB")
            
            # Verify processing succeeded
            success_rate = result.get('batch_info', {}).get('success_rate', 
                          result.get('summary', {}).get('success_rate', 100.0))
            self.assertEqual(success_rate, 100.0)
        
        # Check memory usage is reasonable
        max_memory_increase = max(data['memory_increase_mb'] for data in memory_usage.values())
        print(f"\nMaximum memory increase: {max_memory_increase:.2f} MB")
        print(f"Maximum allowed: {self.max_memory_increase_mb} MB")
        
        # Performance assertion
        self.assertLess(max_memory_increase, self.max_memory_increase_mb,
                       f"Memory increase {max_memory_increase:.2f} MB exceeds threshold")
    
    def test_concurrent_batch_processing(self):
        """Test performance under concurrent batch processing load."""
        print("\n=== Testing Concurrent Batch Processing ===")
        
        num_threads = 4
        batch_size = 25
        batches_per_thread = 5
        
        def process_batches():
            """Process multiple batches in a thread."""
            thread_results = []
            for i in range(batches_per_thread):
                test_data = self._create_test_data(batch_size)
                start_time = time.time()
                result = self.service.predict_batch(test_data)
                processing_time = time.time() - start_time
                
                success_rate = result.get('batch_info', {}).get('success_rate', 
                              result.get('summary', {}).get('success_rate', 100.0))
                
                thread_results.append({
                    'batch_id': i,
                    'processing_time_s': processing_time,
                    'success_rate': success_rate,
                    'throughput': batch_size / processing_time
                })
            return thread_results
        
        # Run concurrent processing
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(process_batches) for _ in range(num_threads)]
            all_results = []
            
            for future in as_completed(futures):
                thread_results = future.result()
                all_results.extend(thread_results)
        
        total_time = time.time() - start_time
        
        # Calculate statistics
        total_samples = num_threads * batches_per_thread * batch_size
        overall_throughput = total_samples / total_time
        avg_thread_throughput = np.mean([r['throughput'] for r in all_results])
        success_rates = [r['success_rate'] for r in all_results]
        
        print(f"Concurrent processing results:")
        print(f"  Threads: {num_threads}")
        print(f"  Batches per thread: {batches_per_thread}")
        print(f"  Batch size: {batch_size}")
        print(f"  Total samples: {total_samples}")
        print(f"  Total time: {total_time:.3f}s")
        print(f"  Overall throughput: {overall_throughput:.2f} samples/sec")
        print(f"  Average thread throughput: {avg_thread_throughput:.2f} samples/sec")
        print(f"  Success rate range: {min(success_rates):.1f}% - {max(success_rates):.1f}%")
        
        # Performance assertions
        self.assertTrue(all(rate == 100.0 for rate in success_rates),
                       "All concurrent batches should succeed")
        self.assertGreater(overall_throughput, self.min_batch_throughput_samples_per_sec * 0.8,
                          "Concurrent throughput should be reasonable")
    
    def test_data_stream_processing_performance(self):
        """Test performance of real-time data stream processing."""
        print("\n=== Testing Data Stream Processing Performance ===")
        
        stream_length = 100
        window_sizes = [5, 10, 20]
        overlap_ratios = [0.0, 0.5]
        
        test_stream = self._create_test_data(stream_length)
        
        for window_size in window_sizes:
            for overlap in overlap_ratios:
                print(f"\nTesting window_size={window_size}, overlap={overlap}")
                
                start_time = time.time()
                result = self.service.process_data_stream(
                    test_stream, 
                    window_size=window_size, 
                    overlap=overlap
                )
                processing_time = time.time() - start_time
                
                # Calculate metrics
                num_windows = len(result['windows'])
                samples_per_second = stream_length / processing_time
                windows_per_second = num_windows / processing_time
                
                print(f"  Processing time: {processing_time:.3f}s")
                print(f"  Windows processed: {num_windows}")
                print(f"  Samples/sec: {samples_per_second:.2f}")
                print(f"  Windows/sec: {windows_per_second:.2f}")
                print(f"  Success rate: {result['stream_info']['total_samples'] / stream_length * 100:.1f}%")
                
                # Verify stream processing
                self.assertGreater(num_windows, 0, "Should process at least one window")
                self.assertGreater(samples_per_second, 10, "Should process at least 10 samples/sec")
    
    def test_data_buffer_performance(self):
        """Test performance of data buffer operations."""
        print("\n=== Testing Data Buffer Performance ===")
        
        buffer_size = 100
        num_samples = 500
        
        buffer = self.service.create_data_buffer(buffer_size)
        test_data = self._create_test_data(num_samples)
        
        # Test buffer filling performance
        start_time = time.time()
        successful_adds = 0
        
        for i, sample in enumerate(test_data):
            if buffer.add_sample(sample):
                successful_adds += 1
        
        filling_time = time.time() - start_time
        
        # Test buffer processing performance
        start_time = time.time()
        buffer_result = buffer.process_buffer()
        processing_time = time.time() - start_time
        
        # Calculate metrics
        add_rate = successful_adds / filling_time
        buffer_throughput = len(buffer.get_buffer_data()) / processing_time
        
        print(f"Buffer performance:")
        print(f"  Buffer size: {buffer_size}")
        print(f"  Samples added: {successful_adds}/{num_samples}")
        print(f"  Add rate: {add_rate:.2f} samples/sec")
        print(f"  Filling time: {filling_time:.3f}s")
        print(f"  Processing time: {processing_time:.3f}s")
        print(f"  Buffer throughput: {buffer_throughput:.2f} samples/sec")
        
        # Verify buffer operations
        self.assertEqual(successful_adds, num_samples, "All samples should be added successfully")
        self.assertGreater(add_rate, 1000, "Buffer should accept samples quickly")
        self.assertGreater(buffer_throughput, 50, "Buffer processing should be reasonably fast")
        
        # Verify buffer result
        self.assertIn('results', buffer_result)
        self.assertEqual(len(buffer_result['results']), buffer_size)
    
    def test_performance_regression(self):
        """Test for performance regression by comparing against baseline."""
        print("\n=== Testing Performance Regression ===")
        
        # Define baseline performance expectations
        baseline_expectations = {
            'single_prediction_max_ms': 50,
            'batch_throughput_min_samples_per_sec': 100,
            'memory_increase_max_mb': 200
        }
        
        # Test single prediction performance
        test_data = self._create_test_data(1)[0]
        start_time = time.time()
        result = self.service.predict_single(test_data)
        single_prediction_time = (time.time() - start_time) * 1000
        
        # Test batch throughput
        batch_data = self._create_test_data(50)
        start_time = time.time()
        batch_result = self.service.predict_batch(batch_data)
        batch_time = time.time() - start_time
        batch_throughput = 50 / batch_time
        
        # Test memory usage
        memory_before = self._measure_memory_usage()
        large_batch = self._create_test_data(100)
        large_result = self.service.predict_batch(large_batch)
        memory_after = self._measure_memory_usage()
        memory_increase = memory_after - memory_before
        
        print(f"Performance regression test results:")
        print(f"  Single prediction: {single_prediction_time:.2f}ms (baseline: <{baseline_expectations['single_prediction_max_ms']}ms)")
        print(f"  Batch throughput: {batch_throughput:.2f} samples/sec (baseline: >{baseline_expectations['batch_throughput_min_samples_per_sec']} samples/sec)")
        print(f"  Memory increase: {memory_increase:.2f}MB (baseline: <{baseline_expectations['memory_increase_max_mb']}MB)")
        
        # Performance regression assertions
        self.assertLess(single_prediction_time, baseline_expectations['single_prediction_max_ms'],
                       f"Single prediction performance regression: {single_prediction_time:.2f}ms")
        self.assertGreater(batch_throughput, baseline_expectations['batch_throughput_min_samples_per_sec'],
                          f"Batch throughput regression: {batch_throughput:.2f} samples/sec")
        self.assertLess(memory_increase, baseline_expectations['memory_increase_max_mb'],
                       f"Memory usage regression: {memory_increase:.2f}MB")
        
        print("✓ No performance regression detected")


if __name__ == '__main__':
    # Run performance tests with detailed output
    unittest.main(verbosity=2, buffer=True)