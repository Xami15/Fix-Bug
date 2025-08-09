#!/usr/bin/env python3
"""
Simple Training Script with Visualizations for Motor Fault Detection System

This script executes the training pipeline with basic visualizations:
- Load and preprocess the CSV dataset
- Execute model training with validation
- Generate visualizations and save them in a dedicated folder
- Save trained model with metadata
- Validate model achieves ≥85% accuracy requirement

Usage:
    python train_viz_simple.py [--epochs 50] [--batch-size 16]
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
        logging.FileHandler('training_viz_simple.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Set matplotlib style
plt.style.use('default')
sns.set_palette("husl")


def create_visualizations_folder():
    """Create folder for visualizations."""
    viz_dir = "visualizations"
    os.makedirs(viz_dir, exist_ok=True)
    logger.info(f"Visualizations folder created: {viz_dir}")
    return viz_dir


def create_training_progress_plot(history, viz_dir):
    """Create training progress visualization."""
    logger.info("Creating training progress visualization...")
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    fig.suptitle('Model Training Progress', fontsize=16, fontweight='bold')
    
    # Training and validation accuracy
    if 'accuracy' in history:
        epochs = range(1, len(history['accuracy']) + 1)
        ax1.plot(epochs, history['accuracy'], 'b-', label='Training Accuracy')
        if 'val_accuracy' in history:
            ax1.plot(epochs, history['val_accuracy'], 'r-', label='Validation Accuracy')
        ax1.set_title('Training and Validation Accuracy')
        ax1.set_xlabel('Epoch')
        ax1.set_ylabel('Accuracy')
        ax1.legend()
        ax1.grid(True)
    
    # Training and validation loss
    if 'loss' in history:
        epochs = range(1, len(history['loss']) + 1)
        ax2.plot(epochs, history['loss'], 'b-', label='Training Loss')
        if 'val_loss' in history:
            ax2.plot(epochs, history['val_loss'], 'r-', label='Validation Loss')
        ax2.set_title('Training and Validation Loss')
        ax2.set_xlabel('Epoch')
        ax2.set_ylabel('Loss')
        ax2.legend()
        ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'training_progress.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Training progress visualization saved")


def create_confusion_matrix_plot(confusion_matrix, class_names, viz_dir):
    """Create confusion matrix visualization."""
    logger.info("Creating confusion matrix visualization...")
    
    plt.figure(figsize=(10, 8))
    sns.heatmap(confusion_matrix, annot=True, fmt='d', cmap='Blues', 
               xticklabels=class_names, yticklabels=class_names)
    plt.title('Confusion Matrix', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'confusion_matrix.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Confusion matrix visualization saved")


def create_performance_metrics_plot(metrics, class_names, viz_dir):
    """Create performance metrics visualization."""
    logger.info("Creating performance metrics visualization...")
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    fig.suptitle('Model Performance Metrics', fontsize=16, fontweight='bold')
    
    # Precision, Recall, F1-Score by category
    if 'precision' in metrics and 'recall' in metrics and 'f1_score' in metrics:
        categories = class_names
        precision = [metrics['precision'].get(cat, 0) for cat in categories]
        recall = [metrics['recall'].get(cat, 0) for cat in categories]
        f1 = [metrics['f1_score'].get(cat, 0) for cat in categories]
        
        x = np.arange(len(categories))
        width = 0.25
        
        ax1.bar(x - width, precision, width, label='Precision', alpha=0.8)
        ax1.bar(x, recall, width, label='Recall', alpha=0.8)
        ax1.bar(x + width, f1, width, label='F1-Score', alpha=0.8)
        ax1.set_title('Precision, Recall, and F1-Score by Category')
        ax1.set_ylabel('Score')
        ax1.set_xticks(x)
        ax1.set_xticklabels(categories, rotation=45)
        ax1.legend()
    
    # Overall metrics
    overall_metrics = ['accuracy', 'precision', 'recall', 'f1_score']
    overall_values = []
    metric_names = []
    
    for metric in overall_metrics:
        if f'overall_{metric}' in metrics:
            overall_values.append(metrics[f'overall_{metric}'])
            metric_names.append(metric.replace('_', ' ').title())
    
    if overall_values:
        ax2.bar(metric_names, overall_values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'])
        ax2.set_title('Overall Performance Metrics')
        ax2.set_ylabel('Score')
        ax2.tick_params(axis='x', rotation=45)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'performance_metrics.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Performance metrics visualization saved")


def create_data_distribution_plot(X, y, class_names, viz_dir):
    """Create data distribution visualization."""
    logger.info("Creating data distribution visualization...")
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    fig.suptitle('Data Distribution Analysis', fontsize=16, fontweight='bold')
    
    # Class distribution
    unique, counts = np.unique(np.argmax(y, axis=1), return_counts=True)
    ax1.pie(counts, labels=[class_names[i] for i in unique], autopct='%1.1f%%', startangle=90)
    ax1.set_title('Class Distribution')
    
    # Sample count per class
    ax2.bar(range(len(counts)), counts, color=sns.color_palette("husl", len(counts)))
    ax2.set_title('Sample Count per Class')
    ax2.set_xlabel('Class Index')
    ax2.set_ylabel('Number of Samples')
    ax2.set_xticks(range(len(counts)))
    ax2.set_xticklabels([class_names[i] for i in unique], rotation=45)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'data_distribution.png'), dpi=300, bbox_inches='tight')
    plt.close()
    logger.info("Data distribution visualization saved")


class MemoryEfficientDataProcessor(DataProcessor):
    """Memory-efficient version of DataProcessor."""
    
    def __init__(self, data_path: str, max_files_per_category: int = 2, max_samples_per_file: int = 100000):
        """Initialize the MemoryEfficientDataProcessor."""
        super().__init__(data_path)
        self.max_files_per_category = max_files_per_category
        self.max_samples_per_file = max_samples_per_file
    
    def load_dataset(self):
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


def setup_training_environment():
    """Setup the training environment."""
    logger.info("Setting up training environment...")
    
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
        # Create visualizations folder
        viz_dir = create_visualizations_folder()
        
        # Initialize data processor
        logger.info("Initializing data processor...")
        data_processor = MemoryEfficientDataProcessor(data_path, max_files_per_category=5)
        
        # Load and prepare data
        logger.info("Loading and preparing data...")
        X, LabelPositional, Label = data_processor.load_and_preprocess_dataset(
            interval_length=200,
            samples_per_block=1681  # Use the correct parameter to match model input shape
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
        
        # Log which classes are actually present in the data
        unique_labels = np.unique(np.argmax(LabelPositional, axis=1))
        actual_classes = [class_names[i] for i in unique_labels]
        logger.info(f"Classes present in dataset: {actual_classes}")
        logger.info(f"Number of classes: {len(actual_classes)}")
        
        create_data_distribution_plot(X, LabelPositional, class_names, viz_dir)
        
        # Create train-test split
        logger.info("Creating train-test split...")
        X_train, X_test, y_train, y_test = data_processor.create_train_test_split(
            X, LabelPositional, test_size=0.25, random_state=101, stratify=True
        )
        
        # Reshape data for CNN1D model (expects 3D input: batch_size, timesteps, features)
        logger.info("Reshaping data for CNN1D model...")
        X_train = X_train.reshape(X_train.shape[0], X_train.shape[1], 1)
        X_test = X_test.reshape(X_test.shape[0], X_test.shape[1], 1)
        
        logger.info(f"Training data shape: {X_train.shape}")
        logger.info(f"Test data shape: {X_test.shape}")
        
        # Initialize and train model
        logger.info("Initializing and training model...")
        cnn_model = CNN1D()
        model = cnn_model.create_model()
        
        # Compile the model
        logger.info("Compiling model...")
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
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
        create_training_progress_plot(history.history, viz_dir)
        
        # Evaluate model
        logger.info("Evaluating model...")
        test_loss, test_accuracy = model.evaluate(X_test, y_test, verbose=0)
        
        # Make predictions
        y_pred = model.predict(X_test)
        y_pred_classes = np.argmax(y_pred, axis=1)
        y_true_classes = np.argmax(y_test, axis=1)
        
        # Calculate metrics
        from sklearn.metrics import confusion_matrix, classification_report
        
        # Get the actual classes present in the data
        unique_classes = np.unique(y_true_classes)
        actual_class_names = [class_names[i] for i in unique_classes]
        
        cm = confusion_matrix(y_true_classes, y_pred_classes)
        report = classification_report(y_true_classes, y_pred_classes, target_names=actual_class_names, output_dict=True)
        
        # Create confusion matrix visualization
        create_confusion_matrix_plot(cm, actual_class_names, viz_dir)
        
        # Create performance metrics visualization
        metrics = {
            'precision': {actual_class_names[i]: report[actual_class_names[i]]['precision'] for i in range(len(actual_class_names))},
            'recall': {actual_class_names[i]: report[actual_class_names[i]]['recall'] for i in range(len(actual_class_names))},
            'f1_score': {actual_class_names[i]: report[actual_class_names[i]]['f1-score'] for i in range(len(actual_class_names))},
            'overall_accuracy': test_accuracy,
            'overall_precision': report['weighted avg']['precision'],
            'overall_recall': report['weighted avg']['recall'],
            'overall_f1_score': report['weighted avg']['f1-score']
        }
        create_performance_metrics_plot(metrics, actual_class_names, viz_dir)
        
        # Validate model accuracy requirement (≥85%)
        logger.info(f"Test accuracy achieved: {test_accuracy:.2%}")
        
        if test_accuracy < 0.85:
            logger.warning(f"Model accuracy ({test_accuracy:.2%}) is below the required 85% threshold")
            logger.warning("Consider adjusting training parameters or data preprocessing")
        else:
            logger.info("Model accuracy requirement (>=85%) met successfully!")
        
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
            'visualization_path': viz_dir
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
        logger.info(f"Visualizations saved to: {viz_dir}")
        
        return {
            'success': True,
            'test_accuracy': test_accuracy,
            'model_path': model_path,
            'visualization_path': viz_dir,
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
            logger.info("Training pipeline with visualizations completed successfully!")
            logger.info(f"Test accuracy: {results['test_accuracy']:.2%}")
            logger.info(f"Duration: {results['duration']}")
            logger.info(f"Model saved to: {results['model_path']}")
            logger.info(f"Visualizations saved to: {results['visualization_path']}")
            
            # Exit with success code
            sys.exit(0)
        else:
            logger.error("Training pipeline with visualizations failed!")
            logger.error(f"Error: {results['error']}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Fatal error in training script with visualizations: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main() 