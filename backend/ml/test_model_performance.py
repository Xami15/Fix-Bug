#!/usr/bin/env python3
"""
Model Performance Testing Script for Motor Fault Detection System

This script loads the trained model and evaluates its performance on the test dataset:
- Load the trained model from saved_model/
- Load and preprocess test data with memory optimization
- Generate comprehensive performance metrics
- Create detailed visualizations
- Validate model accuracy and reliability

Usage:
    python test_model_performance.py [--model-path saved_model/motor_fault_detection_model.h5]
"""

import os
import sys
import argparse
import logging
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.data_processor import DataProcessor
    from src.cnn_model import CNN1D
except ImportError:
    from data_processor import DataProcessor
    from cnn_model import CNN1D

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_testing.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Set matplotlib style
plt.style.use('default')
sns.set_palette("husl")


class MemoryEfficientDataProcessor(DataProcessor):
    """Memory-efficient version of DataProcessor for testing."""
    
    def __init__(self, data_path: str, max_files_per_category: int = 3, max_samples_per_file: int = 50000):
        """Initialize the MemoryEfficientDataProcessor."""
        super().__init__(data_path)
        self.max_files_per_category = max_files_per_category
        self.max_samples_per_file = max_samples_per_file
    
    def load_dataset(self):
        """Load dataset with memory optimization."""
        logger.info("Loading dataset with memory optimization for testing...")
        
        all_data = []
        all_labels = []
        
        for category_idx, category in enumerate(self.fault_categories):
            category_data = []
            files_loaded = 0
            
            # Load from unloaded condition
            if os.path.exists(self.unloaded_dir):
                for filename in os.listdir(self.unloaded_dir):
                    if files_loaded >= self.max_files_per_category:
                        break
                    
                    if filename.endswith('.csv'):
                        fault_category = self._extract_fault_category_from_filename(filename)
                        if fault_category == category:
                            file_path = os.path.join(self.unloaded_dir, filename)
                            data = self._load_csv_file_memory_efficient(file_path)
                            if data is not None:
                                category_data.append(data)
                                files_loaded += 1
                                logger.info(f"Loaded {filename} for category {category}")
            
            # Load from loaded condition
            if os.path.exists(self.loaded_dir):
                for filename in os.listdir(self.loaded_dir):
                    if files_loaded >= self.max_files_per_category * 2:
                        break
                    
                    if filename.endswith('.csv'):
                        fault_category = self._extract_fault_category_from_filename(filename)
                        if fault_category == category:
                            file_path = os.path.join(self.loaded_dir, filename)
                            data = self._load_csv_file_memory_efficient(file_path)
                            if data is not None:
                                category_data.append(data)
                                files_loaded += 1
                                logger.info(f"Loaded {filename} for category {category}")
            
            if category_data:
                combined_data = np.vstack(category_data)
                all_data.append(combined_data)
                all_labels.extend([category_idx] * len(combined_data))
                logger.info(f"Category {category}: {len(combined_data)} samples")
            else:
                logger.warning(f"No data found for category: {category}")
        
        if not all_data:
            raise ValueError("No data loaded from any category")
        
        final_data = np.vstack(all_data)
        final_labels = np.array(all_labels)
        
        logger.info(f"Total dataset loaded: {len(final_data)} samples")
        return final_data, final_labels
    
    def _load_csv_file_memory_efficient(self, file_path: str):
        """Load CSV file with memory optimization."""
        try:
            df = pd.read_csv(file_path, nrows=self.max_samples_per_file)
            
            if not all(col in df.columns for col in self.expected_columns):
                logger.warning(f"Missing expected columns in {file_path}")
                return None
            
            data = df[self.expected_columns].values
            logger.info(f"Loaded {file_path}: {data.shape} samples")
            return data
            
        except Exception as e:
            logger.error(f"Error loading {file_path}: {str(e)}")
            return None
    
    def load_and_preprocess_dataset(self, interval_length: int = 200, 
                                  samples_per_block: int = 500):
        """Load and preprocess dataset with reduced sampling parameters."""
        logger.info("Loading and preprocessing dataset with memory optimization...")
        
        data, labels = self.load_dataset()
        
        if len(data) == 0:
            raise ValueError("No data loaded from dataset")
        
        X, LabelPositional, Label = self.data_preparation(
            [data[labels == i] for i in range(len(self.fault_categories))],
            interval_length=interval_length,
            samples_per_block=samples_per_block
        )
        
        if len(X) == 0:
            raise ValueError("No samples generated after preprocessing")
        
        logger.info(f"Dataset loaded successfully:")
        logger.info(f"  - Total samples: {X.shape[0]}")
        logger.info(f"  - Sample shape: {X.shape[1:]}")
        logger.info(f"  - Label shape: {LabelPositional.shape}")
        
        return X, LabelPositional, Label


def load_trained_model(model_path: str):
    """Load the trained model from file."""
    logger.info(f"Loading trained model from: {model_path}")
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    try:
        from tensorflow import keras
        model = keras.models.load_model(model_path)
        logger.info("Model loaded successfully")
        logger.info(f"Model input shape: {model.input_shape}")
        logger.info(f"Model output shape: {model.output_shape}")
        return model
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise


def create_test_results_folder():
    """Create folder for test results and visualizations."""
    test_dir = "test_results"
    os.makedirs(test_dir, exist_ok=True)
    logger.info(f"Test results folder created: {test_dir}")
    return test_dir


def create_detailed_confusion_matrix(confusion_matrix, class_names, test_dir):
    """Create detailed confusion matrix visualization."""
    logger.info("Creating detailed confusion matrix...")
    
    plt.figure(figsize=(12, 10))
    
    # Create heatmap with annotations
    sns.heatmap(confusion_matrix, annot=True, fmt='d', cmap='Blues', 
                xticklabels=class_names, yticklabels=class_names,
                cbar_kws={'label': 'Number of Predictions'})
    
    plt.title('Detailed Confusion Matrix - Test Set Performance', fontsize=16, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=12)
    plt.ylabel('True Label', fontsize=12)
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    plt.tight_layout()
    
    plt.savefig(os.path.join(test_dir, 'detailed_confusion_matrix.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Detailed confusion matrix saved")


def create_performance_analysis_plot(metrics, class_names, test_dir):
    """Create comprehensive performance analysis visualization."""
    logger.info("Creating performance analysis visualization...")
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Comprehensive Model Performance Analysis', fontsize=16, fontweight='bold')
    
    # 1. Precision, Recall, F1-Score by category
    categories = class_names
    precision = [metrics['precision'].get(cat, 0) for cat in categories]
    recall = [metrics['recall'].get(cat, 0) for cat in categories]
    f1 = [metrics['f1_score'].get(cat, 0) for cat in categories]
    
    x = np.arange(len(categories))
    width = 0.25
    
    ax1.bar(x - width, precision, width, label='Precision', alpha=0.8, color='#FF6B6B')
    ax1.bar(x, recall, width, label='Recall', alpha=0.8, color='#4ECDC4')
    ax1.bar(x + width, f1, width, label='F1-Score', alpha=0.8, color='#45B7D1')
    ax1.set_title('Precision, Recall, and F1-Score by Category')
    ax1.set_ylabel('Score')
    ax1.set_xticks(x)
    ax1.set_xticklabels(categories, rotation=45)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # 2. Overall metrics comparison
    overall_metrics = ['accuracy', 'precision', 'recall', 'f1_score']
    overall_values = []
    metric_names = []
    
    for metric in overall_metrics:
        if f'overall_{metric}' in metrics:
            overall_values.append(metrics[f'overall_{metric}'])
            metric_names.append(metric.replace('_', ' ').title())
    
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    bars = ax2.bar(metric_names, overall_values, color=colors, alpha=0.8)
    ax2.set_title('Overall Performance Metrics')
    ax2.set_ylabel('Score')
    ax2.tick_params(axis='x', rotation=45)
    ax2.grid(True, alpha=0.3)
    
    # Add value labels on bars
    for bar, value in zip(bars, overall_values):
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                f'{value:.3f}', ha='center', va='bottom')
    
    # 3. Class-wise accuracy
    class_accuracy = []
    for i, class_name in enumerate(class_names):
        if class_name in metrics['precision']:
            # Calculate class accuracy from confusion matrix diagonal
            total_predictions = sum(metrics['confusion_matrix'][i])
            correct_predictions = metrics['confusion_matrix'][i][i]
            accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
            class_accuracy.append(accuracy)
        else:
            class_accuracy.append(0)
    
    ax3.bar(range(len(class_names)), class_accuracy, color=sns.color_palette("husl", len(class_names)))
    ax3.set_title('Class-wise Accuracy')
    ax3.set_xlabel('Class')
    ax3.set_ylabel('Accuracy')
    ax3.set_xticks(range(len(class_names)))
    ax3.set_xticklabels(class_names, rotation=45)
    ax3.grid(True, alpha=0.3)
    
    # Add value labels
    for i, acc in enumerate(class_accuracy):
        ax3.text(i, acc + 0.01, f'{acc:.3f}', ha='center', va='bottom')
    
    # 4. Error analysis - False Positives and False Negatives
    fp_rates = []
    fn_rates = []
    
    for i, class_name in enumerate(class_names):
        if class_name in metrics['precision']:
            total_predictions = sum(metrics['confusion_matrix'][i])
            correct_predictions = metrics['confusion_matrix'][i][i]
            false_positives = sum(metrics['confusion_matrix'][:, i]) - correct_predictions
            false_negatives = total_predictions - correct_predictions
            
            fp_rate = false_positives / total_predictions if total_predictions > 0 else 0
            fn_rate = false_negatives / total_predictions if total_predictions > 0 else 0
            
            fp_rates.append(fp_rate)
            fn_rates.append(fn_rate)
        else:
            fp_rates.append(0)
            fn_rates.append(0)
    
    x_pos = np.arange(len(class_names))
    ax4.bar(x_pos - 0.2, fp_rates, 0.4, label='False Positive Rate', alpha=0.8, color='#FF6B6B')
    ax4.bar(x_pos + 0.2, fn_rates, 0.4, label='False Negative Rate', alpha=0.8, color='#4ECDC4')
    ax4.set_title('Error Analysis - False Positive vs False Negative Rates')
    ax4.set_xlabel('Class')
    ax4.set_ylabel('Error Rate')
    ax4.set_xticks(x_pos)
    ax4.set_xticklabels(class_names, rotation=45)
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(test_dir, 'performance_analysis.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Performance analysis visualization saved")


def create_prediction_distribution_plot(y_true_classes, y_pred_classes, class_names, test_dir):
    """Create prediction distribution analysis."""
    logger.info("Creating prediction distribution analysis...")
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle('Prediction Distribution Analysis', fontsize=16, fontweight='bold')
    
    # 1. True vs Predicted distribution
    true_counts = np.bincount(y_true_classes, minlength=len(class_names))
    pred_counts = np.bincount(y_pred_classes, minlength=len(class_names))
    
    x = np.arange(len(class_names))
    width = 0.35
    
    ax1.bar(x - width/2, true_counts, width, label='True Distribution', alpha=0.8, color='#4ECDC4')
    ax1.bar(x + width/2, pred_counts, width, label='Predicted Distribution', alpha=0.8, color='#FF6B6B')
    ax1.set_title('True vs Predicted Class Distribution')
    ax1.set_xlabel('Class')
    ax1.set_ylabel('Number of Samples')
    ax1.set_xticks(x)
    ax1.set_xticklabels(class_names, rotation=45)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # 2. Prediction accuracy by class
    class_accuracy = []
    for i in range(len(class_names)):
        if i < len(true_counts) and true_counts[i] > 0:
            correct = np.sum((y_true_classes == i) & (y_pred_classes == i))
            accuracy = correct / true_counts[i]
            class_accuracy.append(accuracy)
        else:
            class_accuracy.append(0)
    
    colors = ['green' if acc > 0.95 else 'orange' if acc > 0.85 else 'red' for acc in class_accuracy]
    bars = ax2.bar(range(len(class_names)), class_accuracy, color=colors, alpha=0.8)
    ax2.set_title('Prediction Accuracy by Class')
    ax2.set_xlabel('Class')
    ax2.set_ylabel('Accuracy')
    ax2.set_xticks(range(len(class_names)))
    ax2.set_xticklabels(class_names, rotation=45)
    ax2.grid(True, alpha=0.3)
    ax2.axhline(y=0.85, color='red', linestyle='--', alpha=0.7, label='85% Threshold')
    ax2.legend()
    
    # Add value labels
    for i, acc in enumerate(class_accuracy):
        ax2.text(i, acc + 0.01, f'{acc:.3f}', ha='center', va='bottom')
    
    plt.tight_layout()
    plt.savefig(os.path.join(test_dir, 'prediction_distribution.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Prediction distribution analysis saved")


def generate_test_report(metrics, class_names, test_dir):
    """Generate comprehensive test report."""
    logger.info("Generating comprehensive test report...")
    
    report = {
        'test_date': datetime.now().isoformat(),
        'model_performance': {
            'overall_accuracy': metrics['overall_accuracy'],
            'overall_precision': metrics['overall_precision'],
            'overall_recall': metrics['overall_recall'],
            'overall_f1_score': metrics['overall_f1_score']
        },
        'class_performance': {},
        'confusion_matrix': metrics['confusion_matrix'].tolist(),
        'recommendations': []
    }
    
    # Add class-specific performance
    for i, class_name in enumerate(class_names):
        if class_name in metrics['precision']:
            report['class_performance'][class_name] = {
                'precision': metrics['precision'][class_name],
                'recall': metrics['recall'][class_name],
                'f1_score': metrics['f1_score'][class_name]
            }
    
    # Generate recommendations
    if metrics['overall_accuracy'] >= 0.95:
        report['recommendations'].append("Excellent model performance - ready for production deployment")
    elif metrics['overall_accuracy'] >= 0.85:
        report['recommendations'].append("Good model performance - suitable for production with monitoring")
    else:
        report['recommendations'].append("Model performance below threshold - consider retraining")
    
    # Check for class-specific issues
    for class_name, perf in report['class_performance'].items():
        if perf['f1_score'] < 0.85:
            report['recommendations'].append(f"Low performance for {class_name} - consider data augmentation")
    
    # Save report
    report_file = os.path.join(test_dir, 'test_report.json')
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    logger.info(f"Test report saved to: {report_file}")
    return report


def test_model_performance(model_path: str = "saved_model/motor_fault_detection_model.h5"):
    """Test the trained model performance on test dataset."""
    logger.info("=" * 80)
    logger.info("STARTING MODEL PERFORMANCE TESTING")
    logger.info("=" * 80)
    
    start_time = datetime.now()
    logger.info(f"Testing started at: {start_time}")
    
    try:
        # Create test results folder
        test_dir = create_test_results_folder()
        
        # Load trained model
        model = load_trained_model(model_path)
        
        # Initialize memory-efficient data processor
        logger.info("Initializing memory-efficient data processor for test data...")
        data_processor = MemoryEfficientDataProcessor("2_CSV_Data_Files", max_files_per_category=3)
        
        # Load and prepare test data
        logger.info("Loading and preparing test data...")
        X, LabelPositional, Label = data_processor.load_and_preprocess_dataset(
            interval_length=200,
            samples_per_block=1681
        )
        
        if len(X) == 0:
            raise ValueError("No test data loaded")
        
        logger.info(f"Test dataset loaded:")
        logger.info(f"  - Total samples: {X.shape[0]}")
        logger.info(f"  - Sample shape: {X.shape[1:]}")
        logger.info(f"  - Label shape: {LabelPositional.shape}")
        
        # Create train-test split to get test set
        logger.info("Creating train-test split for testing...")
        X_train, X_test, y_train, y_test = data_processor.create_train_test_split(
            X, LabelPositional, test_size=0.25, random_state=101, stratify=True
        )
        
        # Reshape test data for model
        logger.info("Reshaping test data for model...")
        X_test = X_test.reshape(X_test.shape[0], X_test.shape[1], 1)
        
        logger.info(f"Test data shape: {X_test.shape}")
        logger.info(f"Test labels shape: {y_test.shape}")
        
        # Make predictions
        logger.info("Making predictions on test set...")
        y_pred = model.predict(X_test, verbose=0)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_true_classes = np.argmax(y_test, axis=1)
        
        # Calculate metrics
        from sklearn.metrics import confusion_matrix, classification_report
        
        # Get actual classes present in test data
        unique_classes = np.unique(y_true_classes)
        class_names = data_processor.fault_categories
        actual_class_names = [class_names[i] for i in unique_classes]
        
        cm = confusion_matrix(y_true_classes, y_pred_classes)
        report = classification_report(y_true_classes, y_pred_classes, target_names=actual_class_names, output_dict=True)
        
        # Calculate test accuracy
        test_accuracy = np.sum(y_pred_classes == y_true_classes) / len(y_true_classes)
        
        logger.info(f"Test accuracy: {test_accuracy:.4f} ({test_accuracy:.2%})")
        
        # Create comprehensive metrics dictionary
        metrics = {
            'confusion_matrix': cm,
            'precision': {actual_class_names[i]: report[actual_class_names[i]]['precision'] for i in range(len(actual_class_names))},
            'recall': {actual_class_names[i]: report[actual_class_names[i]]['recall'] for i in range(len(actual_class_names))},
            'f1_score': {actual_class_names[i]: report[actual_class_names[i]]['f1-score'] for i in range(len(actual_class_names))},
            'overall_accuracy': test_accuracy,
            'overall_precision': report['weighted avg']['precision'],
            'overall_recall': report['weighted avg']['recall'],
            'overall_f1_score': report['weighted avg']['f1-score']
        }
        
        # Create visualizations
        logger.info("Creating comprehensive visualizations...")
        create_detailed_confusion_matrix(cm, actual_class_names, test_dir)
        create_performance_analysis_plot(metrics, actual_class_names, test_dir)
        create_prediction_distribution_plot(y_true_classes, y_pred_classes, actual_class_names, test_dir)
        
        # Generate test report
        test_report = generate_test_report(metrics, actual_class_names, test_dir)
        
        # Print summary
        logger.info("=" * 80)
        logger.info("MODEL TESTING COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"Test accuracy: {test_accuracy:.4f} ({test_accuracy:.2%})")
        logger.info(f"Overall precision: {metrics['overall_precision']:.4f}")
        logger.info(f"Overall recall: {metrics['overall_recall']:.4f}")
        logger.info(f"Overall F1-score: {metrics['overall_f1_score']:.4f}")
        logger.info(f"Test results saved to: {test_dir}")
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        logger.info(f"Testing completed at: {end_time}")
        logger.info(f"Total testing duration: {duration}")
        
        return {
            'success': True,
            'test_accuracy': test_accuracy,
            'metrics': metrics,
            'test_dir': test_dir,
            'duration': str(duration)
        }
        
    except Exception as e:
        logger.error(f"Model testing failed: {str(e)}")
        logger.error("Check the logs for detailed error information")
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Main testing script entry point."""
    parser = argparse.ArgumentParser(description='Test motor fault detection model performance')
    parser.add_argument('--model-path', type=str, default='saved_model/motor_fault_detection_model.h5', 
                       help='Path to trained model file')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Test model performance
        results = test_model_performance(args.model_path)
        
        if results['success']:
            logger.info("Model testing completed successfully!")
            logger.info(f"Test accuracy: {results['test_accuracy']:.4f} ({results['test_accuracy']:.2%})")
            logger.info(f"Duration: {results['duration']}")
            logger.info(f"Results saved to: {results['test_dir']}")
            
            # Exit with success code
            sys.exit(0)
        else:
            logger.error("Model testing failed!")
            logger.error(f"Error: {results['error']}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Fatal error in model testing script: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main() 