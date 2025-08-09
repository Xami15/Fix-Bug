"""
Optimized batch prediction module with visualization and memory management.

This module provides enhanced batch prediction capabilities with:
- Memory-efficient chunked processing
- Visualization generation and saving
- Real-time IoT data stream processing
- Performance monitoring and optimization
"""

import os
import numpy as np
import tensorflow as tf
from typing import Dict, List, Optional, Tuple
import logging
import json
import time
from datetime import datetime, timezone
import hashlib
import gc
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter
import pandas as pd

logger = logging.getLogger(__name__)


class OptimizedBatchPredictor:
    """
    Enhanced batch prediction service with memory optimization and visualization.
    """
    
    def __init__(self, prediction_service):
        """
        Initialize the optimized batch predictor.
        
        Args:
            prediction_service: Main PredictionService instance
        """
        self.prediction_service = prediction_service
        self.batch_history = []
        
    def predict_batch_optimized(self, sensor_data_list: List[np.ndarray], 
                               chunk_size: int = 8, save_visualizations: bool = True,
                               output_dir: str = "batch_predictions") -> Dict:
        """
        Optimized batch prediction with memory management and visualization.
        
        Args:
            sensor_data_list: List of sensor data arrays
            chunk_size: Size of processing chunks (reduced for stability)
            save_visualizations: Whether to generate and save visualizations
            output_dir: Directory for saving results and visualizations
            
        Returns:
            Dictionary with batch results, summary, and visualization info
        """
        try:
            start_time = time.time()
            
            # Validate inputs
            if not self.prediction_service.is_model_loaded:
                raise ValueError("Model not loaded in prediction service")
            
            if not sensor_data_list:
                raise ValueError("Empty sensor data list provided")
            
            # Create output directory
            if save_visualizations:
                os.makedirs(output_dir, exist_ok=True)
                logger.info(f"Created output directory: {output_dir}")
            
            logger.info(f"Starting optimized batch prediction for {len(sensor_data_list)} samples")
            logger.info(f"Using chunk size: {chunk_size}")
            
            # Initialize result containers
            all_results = []
            all_errors = []
            processing_times = []
            memory_usage = []
            
            # Process in memory-efficient chunks
            total_chunks = (len(sensor_data_list) + chunk_size - 1) // chunk_size
            
            for chunk_idx in range(total_chunks):
                chunk_start = chunk_idx * chunk_size
                chunk_end = min(chunk_start + chunk_size, len(sensor_data_list))
                chunk_data = sensor_data_list[chunk_start:chunk_end]
                
                logger.info(f"Processing chunk {chunk_idx + 1}/{total_chunks}: samples {chunk_start}-{chunk_end-1}")
                
                try:
                    # Process chunk with timing
                    chunk_start_time = time.time()
                    chunk_result = self._process_chunk_vectorized(chunk_data, chunk_start)
                    chunk_time = (time.time() - chunk_start_time) * 1000
                    
                    # Collect results
                    all_results.extend(chunk_result['results'])
                    all_errors.extend(chunk_result['errors'])
                    processing_times.append(chunk_time)
                    
                    # Monitor memory usage
                    try:
                        import psutil
                        memory_usage.append(psutil.Process().memory_info().rss / 1024 / 1024)  # MB
                    except ImportError:
                        memory_usage.append(0)
                    
                    # Force garbage collection
                    gc.collect()
                    
                    logger.debug(f"Chunk {chunk_idx + 1} completed in {chunk_time:.2f}ms")
                    
                except Exception as e:
                    logger.error(f"Error processing chunk {chunk_idx + 1}: {str(e)}")
                    # Create error results for failed chunk
                    for i in range(len(chunk_data)):
                        error_result = {
                            'sample_index': chunk_start + i,
                            'error': f"Chunk processing failed: {str(e)}",
                            'prediction': None,
                            'confidence_scores': None,
                            'success': False,
                            'timestamp': datetime.now(timezone.utc).isoformat()
                        }
                        all_results.append(error_result)
                        all_errors.append(error_result)
            
            # Calculate comprehensive metrics
            total_time = (time.time() - start_time) * 1000
            successful_results = [r for r in all_results if r.get('success', False)]
            
            batch_summary = {
                'total_samples': len(sensor_data_list),
                'successful_predictions': len(successful_results),
                'failed_predictions': len(all_errors),
                'success_rate': len(successful_results) / len(sensor_data_list) * 100 if sensor_data_list else 0,
                'total_processing_time_ms': round(total_time, 2),
                'average_time_per_sample_ms': round(total_time / len(sensor_data_list), 2) if sensor_data_list else 0,
                'throughput_samples_per_second': round(len(sensor_data_list) / (total_time / 1000), 2) if total_time > 0 else 0,
                'chunk_size': chunk_size,
                'total_chunks': total_chunks,
                'average_chunk_time_ms': round(np.mean(processing_times), 2) if processing_times else 0,
                'max_memory_usage_mb': max(memory_usage) if memory_usage else 0,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Generate visualizations and save results
            visualization_paths = []
            if save_visualizations and successful_results:
                try:
                    visualization_paths = self._create_comprehensive_visualizations(
                        successful_results, batch_summary, processing_times, 
                        memory_usage, output_dir
                    )
                    
                    # Save detailed results
                    self._save_detailed_results(all_results, batch_summary, output_dir)
                    
                    logger.info(f"Visualizations and results saved to {output_dir}")
                    
                except Exception as e:
                    logger.warning(f"Failed to create visualizations: {str(e)}")
            
            # Store in batch history
            self.batch_history.append({
                'timestamp': batch_summary['timestamp'],
                'total_samples': batch_summary['total_samples'],
                'success_rate': batch_summary['success_rate'],
                'throughput': batch_summary['throughput_samples_per_second']
            })
            
            logger.info(f"Batch prediction completed successfully!")
            logger.info(f"Results: {len(successful_results)}/{len(sensor_data_list)} successful")
            logger.info(f"Throughput: {batch_summary['throughput_samples_per_second']:.2f} samples/second")
            
            return {
                'results': all_results,
                'summary': batch_summary,
                'errors': all_errors,
                'visualizations': visualization_paths,
                'output_directory': output_dir if save_visualizations else None
            }
            
        except Exception as e:
            logger.error(f"Critical error in optimized batch prediction: {str(e)}")
            raise
    
    def _process_chunk_vectorized(self, chunk_data: List[np.ndarray], start_index: int) -> Dict:
        """
        Process a chunk of data using vectorized operations.
        
        Args:
            chunk_data: List of sensor data arrays for this chunk
            start_index: Starting index for sample numbering
            
        Returns:
            Dictionary with chunk results and errors
        """
        try:
            chunk_results = []
            chunk_errors = []
            
            # Validate inputs
            valid_indices = []
            valid_data = []
            
            for i, sensor_data in enumerate(chunk_data):
                global_index = start_index + i
                is_valid, error_msg = self.prediction_service._validate_input_data(sensor_data)
                
                if is_valid:
                    valid_indices.append(global_index)
                    valid_data.append(sensor_data)
                else:
                    error_result = {
                        'sample_index': global_index,
                        'error': f"Validation failed: {error_msg}",
                        'prediction': None,
                        'confidence_scores': None,
                        'success': False,
                        'timestamp': datetime.now(timezone.utc).isoformat()
                    }
                    chunk_results.append(error_result)
                    chunk_errors.append(error_result)
            
            # Process valid data in batch
            if valid_data:
                try:
                    # Stack data for batch processing
                    batch_array = np.stack(valid_data, axis=0)
                    
                    # Preprocess batch
                    preprocessed_batch = self.prediction_service._preprocess_input_data(batch_array)
                    
                    # Make batch prediction with very conservative batch size for stability
                    batch_predictions = self.prediction_service.model.predict(
                        preprocessed_batch,
                        batch_size=min(4, len(valid_data)),  # Very conservative batch size
                        verbose=0
                    )
                    
                    # Process each prediction
                    for i, (valid_idx, prediction_probs) in enumerate(zip(valid_indices, batch_predictions)):
                        predicted_class_idx = np.argmax(prediction_probs)
                        predicted_class = self.prediction_service.fault_categories[predicted_class_idx]
                        
                        confidence_scores = self.prediction_service.get_confidence_scores(prediction_probs)
                        data_hash = hashlib.md5(valid_data[i].tobytes()).hexdigest()
                        
                        result = {
                            'sample_index': valid_idx,
                            'prediction': predicted_class,
                            'predicted_class_index': int(predicted_class_idx),
                            'confidence_scores': confidence_scores,
                            'max_confidence': float(np.max(prediction_probs)),
                            'data_hash': data_hash,
                            'timestamp': datetime.now(timezone.utc).isoformat(),
                            'success': True
                        }
                        
                        chunk_results.append(result)
                    
                except Exception as e:
                    logger.warning(f"Vectorized processing failed, falling back to individual: {str(e)}")
                    # Fallback to individual processing
                    for i, (valid_idx, sensor_data) in enumerate(zip(valid_indices, valid_data)):
                        try:
                            prediction_result = self.prediction_service.predict_single(sensor_data)
                            prediction_result['sample_index'] = valid_idx
                            prediction_result['success'] = True
                            chunk_results.append(prediction_result)
                        except Exception as individual_error:
                            error_result = {
                                'sample_index': valid_idx,
                                'error': f"Individual prediction failed: {str(individual_error)}",
                                'prediction': None,
                                'confidence_scores': None,
                                'success': False,
                                'timestamp': datetime.now(timezone.utc).isoformat()
                            }
                            chunk_results.append(error_result)
                            chunk_errors.append(error_result)
            
            return {
                'results': chunk_results,
                'errors': chunk_errors
            }
            
        except Exception as e:
            logger.error(f"Error in chunk processing: {str(e)}")
            raise
    
    def _create_comprehensive_visualizations(self, successful_results: List[Dict], 
                                           batch_summary: Dict, processing_times: List[float],
                                           memory_usage: List[float], output_dir: str) -> List[str]:
        """
        Create comprehensive visualizations for batch prediction results.
        
        Args:
            successful_results: List of successful prediction results
            batch_summary: Batch processing summary
            processing_times: List of chunk processing times
            memory_usage: List of memory usage measurements
            output_dir: Directory to save visualizations
            
        Returns:
            List of paths to saved visualization files
        """
        try:
            plt.style.use('default')
            visualization_paths = []
            
            # Extract data for visualization
            predictions = [r['prediction'] for r in successful_results]
            confidences = [r['max_confidence'] for r in successful_results]
            
            # 1. Prediction Distribution
            fig, ax = plt.subplots(figsize=(12, 8))
            prediction_counts = Counter(predictions)
            
            colors = plt.cm.Set3(np.linspace(0, 1, len(prediction_counts)))
            bars = ax.bar(prediction_counts.keys(), prediction_counts.values(), color=colors)
            
            ax.set_title('Motor Fault Prediction Distribution', fontsize=16, fontweight='bold')
            ax.set_xlabel('Fault Categories', fontsize=12)
            ax.set_ylabel('Number of Predictions', fontsize=12)
            ax.tick_params(axis='x', rotation=45)
            
            # Add value labels on bars
            for bar in bars:
                height = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2., height,
                       f'{int(height)}', ha='center', va='bottom')
            
            plt.tight_layout()
            dist_path = os.path.join(output_dir, 'prediction_distribution.png')
            plt.savefig(dist_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths.append(dist_path)
            
            # 2. Confidence Score Distribution
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
            
            # Histogram
            ax1.hist(confidences, bins=20, alpha=0.7, color='skyblue', edgecolor='black')
            ax1.set_title('Confidence Score Distribution', fontsize=14, fontweight='bold')
            ax1.set_xlabel('Confidence Score', fontsize=12)
            ax1.set_ylabel('Frequency', fontsize=12)
            ax1.axvline(np.mean(confidences), color='red', linestyle='--', 
                       label=f'Mean: {np.mean(confidences):.3f}')
            ax1.legend()
            
            # Box plot by prediction category
            df_results = pd.DataFrame({
                'prediction': predictions,
                'confidence': confidences
            })
            
            sns.boxplot(data=df_results, x='prediction', y='confidence', ax=ax2)
            ax2.set_title('Confidence by Fault Category', fontsize=14, fontweight='bold')
            ax2.set_xlabel('Fault Categories', fontsize=12)
            ax2.set_ylabel('Confidence Score', fontsize=12)
            ax2.tick_params(axis='x', rotation=45)
            
            plt.tight_layout()
            conf_path = os.path.join(output_dir, 'confidence_analysis.png')
            plt.savefig(conf_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths.append(conf_path)
            
            # 3. Performance Metrics
            fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
            
            # Processing times
            ax1.plot(processing_times, marker='o', linewidth=2, markersize=4)
            ax1.set_title('Chunk Processing Times', fontsize=14, fontweight='bold')
            ax1.set_xlabel('Chunk Number', fontsize=12)
            ax1.set_ylabel('Processing Time (ms)', fontsize=12)
            ax1.grid(True, alpha=0.3)
            
            # Memory usage
            if memory_usage and max(memory_usage) > 0:
                ax2.plot(memory_usage, marker='s', color='orange', linewidth=2, markersize=4)
                ax2.set_title('Memory Usage During Processing', fontsize=14, fontweight='bold')
                ax2.set_xlabel('Chunk Number', fontsize=12)
                ax2.set_ylabel('Memory Usage (MB)', fontsize=12)
                ax2.grid(True, alpha=0.3)
            else:
                ax2.text(0.5, 0.5, 'Memory monitoring\nnot available', 
                        ha='center', va='center', transform=ax2.transAxes, fontsize=12)
                ax2.set_title('Memory Usage', fontsize=14, fontweight='bold')
            
            # Summary metrics
            metrics = [
                f"Total Samples: {batch_summary['total_samples']}",
                f"Success Rate: {batch_summary['success_rate']:.1f}%",
                f"Throughput: {batch_summary['throughput_samples_per_second']:.1f} samples/sec",
                f"Avg Time/Sample: {batch_summary['average_time_per_sample_ms']:.2f} ms",
                f"Total Time: {batch_summary['total_processing_time_ms']:.0f} ms"
            ]
            
            ax3.text(0.1, 0.9, '\n'.join(metrics), transform=ax3.transAxes, 
                    fontsize=12, verticalalignment='top', fontfamily='monospace',
                    bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.8))
            ax3.set_title('Batch Processing Summary', fontsize=14, fontweight='bold')
            ax3.axis('off')
            
            # Fault severity analysis
            severity_map = {
                'healthy': 'Normal',
                'bowed_rotor': 'High',
                'faulty_bearing': 'Critical',
                'broken_rotor_bars': 'Critical',
                'rotor_misalignment': 'Medium',
                'rotor_unbalanced': 'Medium',
                'stator_winding': 'High',
                'voltage_unbalanced': 'Medium'
            }
            
            severities = [severity_map.get(pred, 'Unknown') for pred in predictions]
            severity_counts = Counter(severities)
            
            colors_severity = {'Normal': 'green', 'Medium': 'orange', 'High': 'red', 'Critical': 'darkred'}
            pie_colors = [colors_severity.get(sev, 'gray') for sev in severity_counts.keys()]
            
            ax4.pie(severity_counts.values(), labels=severity_counts.keys(), 
                   autopct='%1.1f%%', colors=pie_colors, startangle=90)
            ax4.set_title('Fault Severity Distribution', fontsize=14, fontweight='bold')
            
            plt.tight_layout()
            perf_path = os.path.join(output_dir, 'performance_analysis.png')
            plt.savefig(perf_path, dpi=300, bbox_inches='tight')
            plt.close()
            visualization_paths.append(perf_path)
            
            # 4. Detailed Results Heatmap (if reasonable number of samples)
            if len(successful_results) <= 100:
                fig, ax = plt.subplots(figsize=(12, 8))
                
                # Create confidence matrix
                fault_categories = self.prediction_service.fault_categories
                confidence_matrix = []
                sample_labels = []
                
                for i, result in enumerate(successful_results[:50]):  # Limit to first 50 for readability
                    conf_scores = [result['confidence_scores'].get(cat, 0) for cat in fault_categories]
                    confidence_matrix.append(conf_scores)
                    sample_labels.append(f"Sample {result['sample_index']}")
                
                if confidence_matrix:
                    sns.heatmap(confidence_matrix, 
                               xticklabels=fault_categories,
                               yticklabels=sample_labels,
                               annot=False, cmap='YlOrRd', ax=ax)
                    ax.set_title('Confidence Scores Heatmap (First 50 Samples)', 
                                fontsize=14, fontweight='bold')
                    ax.set_xlabel('Fault Categories', fontsize=12)
                    ax.set_ylabel('Samples', fontsize=12)
                    
                    plt.tight_layout()
                    heatmap_path = os.path.join(output_dir, 'confidence_heatmap.png')
                    plt.savefig(heatmap_path, dpi=300, bbox_inches='tight')
                    plt.close()
                    visualization_paths.append(heatmap_path)
            
            logger.info(f"Created {len(visualization_paths)} visualizations")
            return visualization_paths
            
        except Exception as e:
            logger.error(f"Error creating visualizations: {str(e)}")
            return []
    
    def _save_detailed_results(self, all_results: List[Dict], batch_summary: Dict, output_dir: str):
        """
        Save detailed batch results to files.
        
        Args:
            all_results: All prediction results
            batch_summary: Batch processing summary
            output_dir: Output directory
        """
        try:
            # Save JSON results
            results_data = {
                'batch_summary': batch_summary,
                'results': all_results,
                'metadata': {
                    'model_path': self.prediction_service.model_path,
                    'fault_categories': self.prediction_service.fault_categories,
                    'generated_at': datetime.now(timezone.utc).isoformat()
                }
            }
            
            json_path = os.path.join(output_dir, 'batch_results.json')
            with open(json_path, 'w') as f:
                json.dump(results_data, f, indent=2, default=str)
            
            # Save CSV summary
            successful_results = [r for r in all_results if r.get('success', False)]
            if successful_results:
                df_data = []
                for result in successful_results:
                    row = {
                        'sample_index': result['sample_index'],
                        'prediction': result['prediction'],
                        'max_confidence': result['max_confidence'],
                        'timestamp': result['timestamp']
                    }
                    # Add individual confidence scores
                    for category, confidence in result['confidence_scores'].items():
                        row[f'conf_{category}'] = confidence
                    df_data.append(row)
                
                df = pd.DataFrame(df_data)
                csv_path = os.path.join(output_dir, 'batch_results.csv')
                df.to_csv(csv_path, index=False)
            
            # Save summary report
            report_path = os.path.join(output_dir, 'batch_report.txt')
            with open(report_path, 'w') as f:
                f.write("MOTOR FAULT DETECTION - BATCH PREDICTION REPORT\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Generated: {batch_summary['timestamp']}\n")
                f.write(f"Total Samples: {batch_summary['total_samples']}\n")
                f.write(f"Successful Predictions: {batch_summary['successful_predictions']}\n")
                f.write(f"Success Rate: {batch_summary['success_rate']:.2f}%\n")
                f.write(f"Processing Time: {batch_summary['total_processing_time_ms']:.2f} ms\n")
                f.write(f"Throughput: {batch_summary['throughput_samples_per_second']:.2f} samples/sec\n\n")
                
                if successful_results:
                    predictions = [r['prediction'] for r in successful_results]
                    prediction_counts = Counter(predictions)
                    
                    f.write("PREDICTION DISTRIBUTION:\n")
                    f.write("-" * 25 + "\n")
                    for category, count in prediction_counts.most_common():
                        percentage = (count / len(successful_results)) * 100
                        f.write(f"{category}: {count} ({percentage:.1f}%)\n")
            
            logger.info("Detailed results saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving detailed results: {str(e)}")
    
    def get_batch_history(self) -> List[Dict]:
        """Get history of batch predictions."""
        return self.batch_history.copy()
    
    def clear_batch_history(self):
        """Clear batch prediction history."""
        self.batch_history.clear()
        logger.info("Batch history cleared")