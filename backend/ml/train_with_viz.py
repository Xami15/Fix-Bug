#!/usr/bin/env python3
"""
Training Script with Visualizations for Motor Fault Detection System

This script executes the training pipeline with comprehensive visualizations:
- Load and preprocess the CSV dataset
- Execute model training with validation
- Generate visualizations and save them in a dedicated folder
- Save trained model with metadata
- Validate model achieves ≥85% accuracy requirement

Usage:
    python train_with_viz.py [--epochs 50] [--batch-size 16]
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
from typing import Tuple, Optional, Dict, List
import warnings
warnings.filterwarnings('ignore')

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.model_trainer import ModelTrainer
    from src.data_processor import DataProcessor
    from src.cnn_model import CNN1D
except ImportError:
    from model_trainer import ModelTrainer
    from data_processor import DataProcessor
    from cnn_model import CNN1D

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training_with_viz.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Set matplotlib style
plt.style.use('default')
sns.set_palette("husl")


class VisualizationManager:
    """Manages the creation and saving of visualizations."""
    
    def __init__(self, output_dir: str = "visualizations"):
        """Initialize the VisualizationManager."""
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"VisualizationManager initialized. Output directory: {output_dir}")
    
    def create_dataset_overview(self, data_processor: DataProcessor):
        """Create dataset overview visualization."""
        logger.info("Creating dataset overview visualization...")
        
        # Get dataset statistics
        stats = data_processor.get_dataset_statistics()
        
        # Create figure
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Motor Fault Detection Dataset Overview', fontsize=16, fontweight='bold')
        
        # Category distribution
        categories = list(stats.get('category_counts', {}).keys())
        counts = list(stats.get('category_counts', {}).values())
        
        if categories and counts:
            axes[0, 0].bar(categories, counts, color=sns.color_palette("husl", len(categories)))
            axes[0, 0].set_title('Fault Category Distribution')
            axes[0, 0].set_xlabel('Fault Categories')
            axes[0, 0].set_ylabel('Number of Files')
            axes[0, 0].tick_params(axis='x', rotation=45)
        
        # Data quality metrics
        quality_metrics = stats.get('quality_metrics', {})
        if quality_metrics:
            metrics = list(quality_metrics.keys())
            values = list(quality_metrics.values())
            axes[0, 1].bar(metrics, values, color='lightgreen')
            axes[0, 1].set_title('Data Quality Metrics')
            axes[0, 1].set_ylabel('Percentage')
            axes[0, 1].tick_params(axis='x', rotation=45)
        
        # File size distribution
        file_sizes = stats.get('file_sizes', [])
        if file_sizes:
            axes[1, 0].hist(file_sizes, bins=20, color='skyblue', alpha=0.7)
            axes[1, 0].set_title('File Size Distribution')
            axes[1, 0].set_xlabel('File Size (MB)')
            axes[1, 0].set_ylabel('Number of Files')
        
        # Sample count per category
        sample_counts = stats.get('samples_per_category', {})
        if sample_counts:
            categories = list(sample_counts.keys())
            samples = list(sample_counts.values())
            axes[1, 1].pie(samples, labels=categories, autopct='%1.1f%%', startangle=90)
            axes[1, 1].set_title('Sample Distribution by Category')
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'dataset_overview.png'), dpi=300, bbox_inches='tight')
        plt.close()
        logger.info("Dataset overview visualization saved")
    
    def create_training_progress(self, training_history: Dict):
        """Create training progress visualization."""
        logger.info("Creating training progress visualization...")
        
        if not training_history:
            logger.warning("No training history available for visualization")
            return
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Model Training Progress', fontsize=16, fontweight='bold')
        
        # Training and validation accuracy
        if 'accuracy' in training_history:
            epochs = range(1, len(training_history['accuracy']) + 1)
            axes[0, 0].plot(epochs, training_history['accuracy'], 'b-', label='Training Accuracy')
            if 'val_accuracy' in training_history:
                axes[0, 0].plot(epochs, training_history['val_accuracy'], 'r-', label='Validation Accuracy')
            axes[0, 0].set_title('Training and Validation Accuracy')
            axes[0, 0].set_xlabel('Epoch')
            axes[0, 0].set_ylabel('Accuracy')
            axes[0, 0].legend()
            axes[0, 0].grid(True)
        
        # Training and validation loss
        if 'loss' in training_history:
            epochs = range(1, len(training_history['loss']) + 1)
            axes[0, 1].plot(epochs, training_history['loss'], 'b-', label='Training Loss')
            if 'val_loss' in training_history:
                axes[0, 1].plot(epochs, training_history['val_loss'], 'r-', label='Validation Loss')
            axes[0, 1].set_title('Training and Validation Loss')
            axes[0, 1].set_xlabel('Epoch')
            axes[0, 1].set_ylabel('Loss')
            axes[0, 1].legend()
            axes[0, 1].grid(True)
        
        # Learning rate
        if 'lr' in training_history:
            epochs = range(1, len(training_history['lr']) + 1)
            axes[1, 0].plot(epochs, training_history['lr'], 'g-')
            axes[1, 0].set_title('Learning Rate')
            axes[1, 0].set_xlabel('Epoch')
            axes[1, 0].set_ylabel('Learning Rate')
            axes[1, 0].grid(True)
        
        # Model convergence
        if 'accuracy' in training_history and 'val_accuracy' in training_history:
            epochs = range(1, len(training_history['accuracy']) + 1)
            convergence = [abs(acc - val_acc) for acc, val_acc in zip(training_history['accuracy'], training_history['val_accuracy'])]
            axes[1, 1].plot(epochs, convergence, 'purple')
            axes[1, 1].set_title('Training-Validation Gap (Overfitting Monitor)')
            axes[1, 1].set_xlabel('Epoch')
            axes[1, 1].set_ylabel('Accuracy Gap')
            axes[1, 1].grid(True)
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'training_progress.png'), dpi=300, bbox_inches='tight')
        plt.close()
        logger.info("Training progress visualization saved")
    
    def create_confusion_matrix(self, confusion_matrix: np.ndarray, class_names: List[str], 
                              title: str = "Confusion Matrix"):
        """Create confusion matrix visualization."""
        logger.info(f"Creating confusion matrix visualization: {title}")
        
        plt.figure(figsize=(10, 8))
        sns.heatmap(confusion_matrix, annot=True, fmt='d', cmap='Blues', 
                   xticklabels=class_names, yticklabels=class_names)
        plt.title(title, fontsize=14, fontweight='bold')
        plt.xlabel('Predicted Label')
        plt.ylabel('True Label')
        plt.tight_layout()
        
        filename = f"confusion_matrix_{title.lower().replace(' ', '_')}.png"
        plt.savefig(os.path.join(self.output_dir, filename), dpi=300, bbox_inches='tight')
        plt.close()
        logger.info(f"Confusion matrix saved: {filename}")
    
    def create_performance_metrics(self, metrics: Dict):
        """Create performance metrics visualization."""
        logger.info("Creating performance metrics visualization...")
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Model Performance Metrics', fontsize=16, fontweight='bold')
        
        # Accuracy comparison
        if 'accuracy' in metrics:
            accuracy_data = metrics['accuracy']
            if isinstance(accuracy_data, dict):
                categories = list(accuracy_data.keys())
                accuracies = list(accuracy_data.values())
                axes[0, 0].bar(categories, accuracies, color=sns.color_palette("husl", len(categories)))
                axes[0, 0].set_title('Accuracy by Category')
                axes[0, 0].set_ylabel('Accuracy')
                axes[0, 0].tick_params(axis='x', rotation=45)
        
        # Precision, Recall, F1-Score
        if 'precision' in metrics and 'recall' in metrics and 'f1_score' in metrics:
            categories = list(metrics['precision'].keys())
            precision = list(metrics['precision'].values())
            recall = list(metrics['recall'].values())
            f1 = list(metrics['f1_score'].values())
            
            x = np.arange(len(categories))
            width = 0.25
            
            axes[0, 1].bar(x - width, precision, width, label='Precision', alpha=0.8)
            axes[0, 1].bar(x, recall, width, label='Recall', alpha=0.8)
            axes[0, 1].bar(x + width, f1, width, label='F1-Score', alpha=0.8)
            axes[0, 1].set_title('Precision, Recall, and F1-Score by Category')
            axes[0, 1].set_ylabel('Score')
            axes[0, 1].set_xticks(x)
            axes[0, 1].set_xticklabels(categories, rotation=45)
            axes[0, 1].legend()
        
        # Overall metrics
        overall_metrics = ['accuracy', 'precision', 'recall', 'f1_score']
        overall_values = []
        metric_names = []
        
        for metric in overall_metrics:
            if f'overall_{metric}' in metrics:
                overall_values.append(metrics[f'overall_{metric}'])
                metric_names.append(metric.replace('_', ' ').title())
        
        if overall_values:
            axes[1, 0].bar(metric_names, overall_values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'])
            axes[1, 0].set_title('Overall Performance Metrics')
            axes[1, 0].set_ylabel('Score')
            axes[1, 0].tick_params(axis='x', rotation=45)
        
        # Training time distribution
        if 'training_time' in metrics:
            time_components = ['Data Loading', 'Training', 'Evaluation', 'Total']
            time_values = [
                metrics.get('data_loading_time', 0),
                metrics.get('training_time', 0),
                metrics.get('evaluation_time', 0),
                metrics.get('total_time', 0)
            ]
            
            axes[1, 1].pie(time_values, labels=time_components, autopct='%1.1f%%', startangle=90)
            axes[1, 1].set_title('Time Distribution')
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'performance_metrics.png'), dpi=300, bbox_inches='tight')
        plt.close()
        logger.info("Performance metrics visualization saved")
    
    def create_data_distribution(self, X: np.ndarray, y: np.ndarray, class_names: List[str]):
        """Create data distribution visualization."""
        logger.info("Creating data distribution visualization...")
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Data Distribution Analysis', fontsize=16, fontweight='bold')
        
        # Class distribution
        unique, counts = np.unique(np.argmax(y, axis=1), return_counts=True)
        axes[0, 0].pie(counts, labels=[class_names[i] for i in unique], autopct='%1.1f%%', startangle=90)
        axes[0, 0].set_title('Class Distribution')
        
        # Sample distribution histogram
        axes[0, 1].hist(counts, bins=len(unique), color='skyblue', alpha=0.7)
        axes[0, 1].set_title('Sample Count Distribution')
        axes[0, 1].set_xlabel('Number of Samples')
        axes[0, 1].set_ylabel('Number of Classes')
        
        # Feature statistics
        if X.ndim >= 2:
            feature_means = np.mean(X, axis=0)
            feature_stds = np.std(X, axis=0)
            
            axes[1, 0].errorbar(range(len(feature_means)), feature_means, yerr=feature_stds, 
                               fmt='o', capsize=5, capthick=2)
            axes[1, 0].set_title('Feature Statistics')
            axes[1, 0].set_xlabel('Feature Index')
            axes[1, 0].set_ylabel('Value')
        
        # Data quality heatmap
        if X.ndim >= 2:
            sample_size = min(1000, X.shape[0])
            sample_indices = np.random.choice(X.shape[0], sample_size, replace=False)
            sample_data = X[sample_indices, :min(10, X.shape[1])]
            
            correlation_matrix = np.corrcoef(sample_data.T)
            im = axes[1, 1].imshow(correlation_matrix, cmap='coolwarm', aspect='auto')
            axes[1, 1].set_title('Feature Correlation Matrix (Sample)')
            plt.colorbar(im, ax=axes[1, 1])
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.output_dir, 'data_distribution.png'), dpi=300, bbox_inches='tight')
        plt.close()
        logger.info("Data distribution visualization saved")


class MemoryEfficientDataProcessor(DataProcessor):
    """Memory-efficient version of DataProcessor."""
    
    def __init__(self, data_path: str, max_files_per_category: int = 2, max_samples_per_file: int = 100000):
        """Initialize the MemoryEfficientDataProcessor."""
        super().__init__(data_path)
        self.max_files_per_category = max_files_per_category
        self.max_samples_per_file = max_samples_per_file
    
    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load dataset with memory optimization."""
        logger.info("Loading dataset with memory optimization...")
        
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
    
    def _load_csv_file_memory_efficient(self, file_path: str) -> Optional[np.ndarray]:
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
                                  samples_per_block: int = 500) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
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


def setup_training_environment():
    """Setup the training environment."""
    logger.info("Setting up training environment with visualizations...")
    
    current_dir = Path.cwd()
    logger.info(f"Current working directory: {current_dir}")
    
    data_path = "2_CSV_Data_Files"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data path not found: {data_path}")
    
    required_dirs = ["src", "saved_model", "models", "visualizations"]
    
    for dir_name in required_dirs:
        if not os.path.exists(dir_name):
            logger.warning(f"Directory {dir_name} not found, creating...")
            os.makedirs(dir_name, exist_ok=True)
    
    logger.info("Training environment setup complete")
    return data_path


def validate_dataset(data_path: str):
    """Validate the dataset structure and files."""
    logger.info("Validating dataset...")
    
    unloaded_dir = os.path.join(data_path, "1_Unloaded_Condition")
    loaded_dir = os.path.join(data_path, "2_Loaded_Condition")
    
    if not os.path.exists(unloaded_dir):
        raise FileNotFoundError(f"Unloaded condition directory not found: {unloaded_dir}")
    
    if not os.path.exists(loaded_dir):
        raise FileNotFoundError(f"Loaded condition directory not found: {loaded_dir}")
    
    unloaded_files = [f for f in os.listdir(unloaded_dir) if f.endswith('.csv')]
    loaded_files = [f for f in os.listdir(loaded_dir) if f.endswith('.csv')]
    
    logger.info(f"Found {len(unloaded_files)} unloaded condition files")
    logger.info(f"Found {len(loaded_files)} loaded condition files")
    
    if len(unloaded_files) == 0 and len(loaded_files) == 0:
        raise ValueError("No CSV files found in dataset directories")
    
    logger.info("Dataset validation complete")
    return True


def execute_training_with_visualizations(epochs: int = 50, batch_size: int = 16, 
                                       data_path: str = "2_CSV_Data_Files"):
    """Execute the training pipeline with visualizations."""
    logger.info("=" * 80)
    logger.info("STARTING TRAINING PIPELINE WITH VISUALIZATIONS")
    logger.info("=" * 80)
    
    start_time = datetime.now()
    logger.info(f"Training started at: {start_time}")
    
    try:
        # Initialize visualization manager
        logger.info("Initializing visualization manager...")
        viz_manager = VisualizationManager()
        
        # Initialize data processor
        logger.info("Initializing data processor...")
        data_processor = MemoryEfficientDataProcessor(data_path)
        
        # Create dataset overview visualization
        logger.info("Creating dataset overview visualization...")
        viz_manager.create_dataset_overview(data_processor)
        
        # Load and prepare data
        logger.info("Loading and preparing data...")
        X, LabelPositional, Label = data_processor.load_and_preprocess_dataset(
            interval_length=200,
            samples_per_block=500
        )
        
        if len(X) == 0:
            raise ValueError("No data loaded from dataset")
        
        logger.info(f"Dataset loaded successfully:")
        logger.info(f"  - Total samples: {X.shape[0]}")
        logger.info(f"  - Sample shape: {X.shape[1:]}")
        logger.info(f"  - Label shape: {LabelPositional.shape}")
        
        # Create data distribution visualization
        logger.info("Creating data distribution visualization...")
        class_names = data_processor.fault_categories
        viz_manager.create_data_distribution(X, LabelPositional, class_names)
        
        # Create train-test split
        logger.info("Creating train-test split...")
        X_train, X_test, y_train, y_test = data_processor.create_train_test_split(
            X, LabelPositional, test_size=0.25, random_state=101, stratify=True
        )
        
        # Initialize and train model
        logger.info("Initializing and training model...")
        cnn_model = CNN1D()
        model = cnn_model.create_model()
        
        # Train model
        logger.info("Training model...")
        history = model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.2,
            verbose=1
        )
        
        # Create training progress visualization
        logger.info("Creating training progress visualization...")
        viz_manager.create_training_progress(history.history)
        
        # Evaluate model
        logger.info("Evaluating model...")
        test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
        
        # Make predictions
        y_pred = model.predict(X_test)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_true_classes = np.argmax(y_test, axis=1)
        
        # Calculate metrics
        from sklearn.metrics import confusion_matrix, classification_report, precision_recall_fscore_support
        
        cm = confusion_matrix(y_true_classes, y_pred_classes)
        report = classification_report(y_true_classes, y_pred_classes, target_names=class_names, output_dict=True)
        
        # Create confusion matrix visualization
        logger.info("Creating confusion matrix visualization...")
        viz_manager.create_confusion_matrix(cm, class_names, "Test Set Confusion Matrix")
        
        # Create performance metrics visualization
        logger.info("Creating performance metrics visualization...")
        metrics = {
            'accuracy': test_accuracy,
            'precision': {class_names[i]: report[class_names[i]]['precision'] for i in range(len(class_names))},
            'recall': {class_names[i]: report[class_names[i]]['recall'] for i in range(len(class_names))},
            'f1_score': {class_names[i]: report[class_names[i]]['f1-score'] for i in range(len(class_names))},
            'overall_accuracy': test_accuracy,
            'overall_precision': report['weighted avg']['precision'],
            'overall_recall': report['weighted avg']['recall'],
            'overall_f1_score': report['weighted avg']['f1-score']
        }
        viz_manager.create_performance_metrics(metrics)
        
        # Validate model accuracy requirement (≥85%)
        logger.info(f"Test accuracy achieved: {test_accuracy:.2%}")
        
        if test_accuracy < 0.85:
            logger.warning(f"Model accuracy ({test_accuracy:.2%}) is below the required 85% threshold")
            logger.warning("Consider adjusting training parameters or data preprocessing")
        else:
            logger.info("✓ Model accuracy requirement (≥85%) met successfully!")
        
        # Save model
        logger.info("Saving model...")
        model_path = os.path.join("saved_model", "motor_fault_detection_model.h5")
        model.save(model_path)
        
        # Save training summary
        training_summary = {
            'test_accuracy': test_accuracy,
            'model_path': model_path,
            'training_date': datetime.now().isoformat(),
            'dataset_info': {
                'total_samples': len(X),
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'sample_shape': X.shape[1:],
                'class_names': class_names
            },
            'metrics': metrics,
            'visualization_path': viz_manager.output_dir
        }
        
        summary_file = "saved_model/training_summary_with_viz.json"
        with open(summary_file, 'w') as f:
            json.dump(training_summary, f, indent=2, default=str)
        
        logger.info(f"Training summary saved to: {summary_file}")
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        logger.info("=" * 80)
        logger.info("TRAINING PIPELINE WITH VISUALIZATIONS COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"Training completed at: {end_time}")
        logger.info(f"Total training duration: {duration}")
        logger.info(f"Final test accuracy: {test_accuracy:.2%}")
        logger.info(f"Model saved to: {model_path}")
        logger.info(f"Visualizations saved to: {viz_manager.output_dir}")
        
        return {
            'success': True,
            'test_accuracy': test_accuracy,
            'model_path': model_path,
            'visualization_path': viz_manager.output_dir,
            'duration': str(duration)
        }
        
    except Exception as e:
        logger.error(f"Training pipeline with visualizations failed: {str(e)}")
        logger.error("Check the logs for detailed error information")
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Main training script entry point."""
    parser = argparse.ArgumentParser(description='Train motor fault detection model with visualizations')
    parser.add_argument('--epochs', type=int, default=50, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=16, help='Training batch size')
    parser.add_argument('--data-path', type=str, default='2_CSV_Data_Files', help='Path to dataset directory')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Setup environment
        data_path = setup_training_environment()
        
        # Validate dataset
        validate_dataset(data_path)
        
        # Execute training pipeline with visualizations
        results = execute_training_with_visualizations(
            epochs=args.epochs,
            batch_size=args.batch_size,
            data_path=args.data_path
        )
        
        if results['success']:
            logger.info("✓ Training pipeline with visualizations completed successfully!")
            logger.info(f"Test accuracy: {results['test_accuracy']:.2%}")
            logger.info(f"Duration: {results['duration']}")
            logger.info(f"Model saved to: {results['model_path']}")
            logger.info(f"Visualizations saved to: {results['visualization_path']}")
            
            # Exit with success code
            sys.exit(0)
        else:
            logger.error("✗ Training pipeline with visualizations failed!")
            logger.error(f"Error: {results['error']}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Fatal error in training script with visualizations: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main() 