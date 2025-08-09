#!/usr/bin/env python3
"""
Memory-Efficient Model Training Pipeline for Motor Fault Detection System

This script executes the complete training pipeline for Task 10.1 with memory optimization:
- Load and preprocess a subset of the CSV dataset
- Execute model training with reduced memory footprint
- Generate evaluation metrics and visualizations
- Save trained model with metadata
- Validate model achieves ≥85% accuracy requirement

Usage:
    python train_model_memory_efficient.py [--epochs 50] [--batch-size 16] [--data-path "2_CSV_Data_Files"]
"""

import os
import sys
import argparse
import logging
import json
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Tuple, Optional

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.model_trainer import ModelTrainer
    from src.data_processor import DataProcessor
except ImportError:
    # Fallback for direct execution
    from model_trainer import ModelTrainer
    from data_processor import DataProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training_memory_efficient.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


class MemoryEfficientDataProcessor(DataProcessor):
    """
    Memory-efficient version of DataProcessor that reduces dataset size.
    """
    
    def __init__(self, data_path: str, max_files_per_category: int = 2, max_samples_per_file: int = 100000):
        """
        Initialize the MemoryEfficientDataProcessor.
        
        Args:
            data_path: Path to the directory containing CSV data files
            max_files_per_category: Maximum number of files to load per category
            max_samples_per_file: Maximum number of samples to load per file
        """
        super().__init__(data_path)
        self.max_files_per_category = max_files_per_category
        self.max_samples_per_file = max_samples_per_file
    
    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Load dataset with memory optimization.
        
        Returns:
            Tuple of (data, labels) with reduced memory footprint
        """
        logger.info("Loading dataset with memory optimization...")
        
        all_data = []
        all_labels = []
        
        # Process each fault category
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
                    if files_loaded >= self.max_files_per_category * 2:  # Allow more loaded files
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
                # Combine data for this category
                combined_data = np.vstack(category_data)
                all_data.append(combined_data)
                all_labels.extend([category_idx] * len(combined_data))
                logger.info(f"Category {category}: {len(combined_data)} samples")
            else:
                logger.warning(f"No data found for category: {category}")
        
        if not all_data:
            raise ValueError("No data loaded from any category")
        
        # Combine all data
        final_data = np.vstack(all_data)
        final_labels = np.array(all_labels)
        
        logger.info(f"Total dataset loaded: {len(final_data)} samples")
        return final_data, final_labels
    
    def _load_csv_file_memory_efficient(self, file_path: str) -> Optional[np.ndarray]:
        """
        Load CSV file with memory optimization.
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            DataFrame or None if loading failed
        """
        try:
            # Read only a subset of the file to reduce memory usage
            df = pd.read_csv(file_path, nrows=self.max_samples_per_file)
            
            # Validate columns
            if not all(col in df.columns for col in self.expected_columns):
                logger.warning(f"Missing expected columns in {file_path}")
                return None
            
            # Convert to numpy array
            data = df[self.expected_columns].values
            
            logger.info(f"Loaded {file_path}: {data.shape} samples")
            return data
            
        except Exception as e:
            logger.error(f"Error loading {file_path}: {str(e)}")
            return None
    
    def load_and_preprocess_dataset(self, interval_length: int = 200, 
                                  samples_per_block: int = 500) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Load and preprocess dataset with reduced sampling parameters.
        
        Args:
            interval_length: Length of each interval (reduced from 200)
            samples_per_block: Number of samples per block (reduced from 1681)
            
        Returns:
            Tuple of (X, LabelPositional, Label) ready for training
        """
        logger.info("Loading and preprocessing dataset with memory optimization...")
        
        # Load dataset
        data, labels = self.load_dataset()
        
        if len(data) == 0:
            raise ValueError("No data loaded from dataset")
        
        # Prepare data with reduced parameters
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


class MemoryEfficientModelTrainer(ModelTrainer):
    """
    Memory-efficient version of ModelTrainer.
    """
    
    def __init__(self, data_path: str, model_save_dir: str = "backend/ml/saved_model/"):
        """
        Initialize the MemoryEfficientModelTrainer.
        
        Args:
            data_path: Path to the directory containing CSV data files
            model_save_dir: Directory to save trained models
        """
        self.data_path = data_path
        self.model_save_dir = model_save_dir
        
        # Initialize components with memory optimization
        self.data_processor = MemoryEfficientDataProcessor(data_path)
        self.cnn_model = CNN1D()
        
        # Training configuration with reduced parameters
        self.train_test_split_ratio = 0.25
        self.random_state = 101
        self.kfold_splits = 3  # Reduced from 5
        self.kfold_random_state = 32
        
        # Training parameters with reduced memory footprint
        self.default_epochs = 50
        self.default_batch_size = 16  # Reduced from 32
        self.validation_split = 0.2
        
        # Training history and metrics
        self.training_history = {}
        self.evaluation_metrics = {}
        self.cross_validation_results = {}
        
        # Ensure model save directory exists
        os.makedirs(self.model_save_dir, exist_ok=True)
        
        logger.info("MemoryEfficientModelTrainer initialized successfully")
        logger.info(f"Data path: {self.data_path}")
        logger.info(f"Model save directory: {self.model_save_dir}")


def setup_training_environment():
    """Setup the training environment and validate requirements."""
    logger.info("Setting up memory-efficient training environment...")
    
    # Check if we're in the correct directory
    current_dir = Path.cwd()
    logger.info(f"Current working directory: {current_dir}")
    
    # Validate data path exists
    data_path = "2_CSV_Data_Files"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Data path not found: {data_path}")
    
    # Validate required directories exist
    required_dirs = [
        "src",
        "saved_model",
        "models"
    ]
    
    for dir_name in required_dirs:
        if not os.path.exists(dir_name):
            logger.warning(f"Directory {dir_name} not found, creating...")
            os.makedirs(dir_name, exist_ok=True)
    
    logger.info("Memory-efficient training environment setup complete")
    return data_path


def validate_dataset(data_path: str):
    """Validate the dataset structure and files."""
    logger.info("Validating dataset...")
    
    # Check unloaded condition directory
    unloaded_dir = os.path.join(data_path, "1_Unloaded_Condition")
    if not os.path.exists(unloaded_dir):
        raise FileNotFoundError(f"Unloaded condition directory not found: {unloaded_dir}")
    
    # Check loaded condition directory
    loaded_dir = os.path.join(data_path, "2_Loaded_Condition")
    if not os.path.exists(loaded_dir):
        raise FileNotFoundError(f"Loaded condition directory not found: {loaded_dir}")
    
    # Count CSV files
    unloaded_files = [f for f in os.listdir(unloaded_dir) if f.endswith('.csv')]
    loaded_files = [f for f in os.listdir(loaded_dir) if f.endswith('.csv')]
    
    logger.info(f"Found {len(unloaded_files)} unloaded condition files")
    logger.info(f"Found {len(loaded_files)} loaded condition files")
    
    if len(unloaded_files) == 0 and len(loaded_files) == 0:
        raise ValueError("No CSV files found in dataset directories")
    
    logger.info("Dataset validation complete")
    return True


def execute_memory_efficient_training_pipeline(epochs: int = 50, batch_size: int = 16, data_path: str = "2_CSV_Data_Files"):
    """Execute the memory-efficient training pipeline."""
    logger.info("=" * 80)
    logger.info("STARTING MEMORY-EFFICIENT MODEL TRAINING PIPELINE")
    logger.info("=" * 80)
    
    start_time = datetime.now()
    logger.info(f"Training started at: {start_time}")
    
    try:
        # Initialize MemoryEfficientModelTrainer
        logger.info("Initializing MemoryEfficientModelTrainer...")
        trainer = MemoryEfficientModelTrainer(data_path=data_path)
        
        # Load and prepare data with memory optimization
        logger.info("Loading and preparing data with memory optimization...")
        X, LabelPositional, Label = trainer.data_processor.load_and_preprocess_dataset(
            interval_length=200,
            samples_per_block=500  # Reduced from 1681
        )
        
        if len(X) == 0:
            raise ValueError("No data loaded from dataset")
        
        logger.info(f"Dataset loaded successfully:")
        logger.info(f"  - Total samples: {X.shape[0]}")
        logger.info(f"  - Sample shape: {X.shape[1:]}")
        logger.info(f"  - Label shape: {LabelPositional.shape}")
        
        # Create train-test split
        logger.info("Creating train-test split...")
        X_train, X_test, y_train, y_test = trainer.create_stratified_train_test_split(X, LabelPositional)
        
        # Train model
        logger.info("Training model...")
        training_results = trainer.train_model(
            X_train, y_train, X_test, y_test,
            epochs=epochs,
            batch_size=batch_size
        )
        
        # Evaluate model
        logger.info("Evaluating model...")
        evaluation_results = trainer.evaluate_model(X_test, y_test)
        
        # Validate model accuracy requirement (≥85%)
        test_accuracy = evaluation_results.get('accuracy', 0)
        logger.info(f"Test accuracy achieved: {test_accuracy:.2%}")
        
        if test_accuracy < 0.85:
            logger.warning(f"Model accuracy ({test_accuracy:.2%}) is below the required 85% threshold")
            logger.warning("Consider adjusting training parameters or data preprocessing")
        else:
            logger.info("✓ Model accuracy requirement (≥85%) met successfully!")
        
        # Save model
        logger.info("Saving model...")
        model_path = trainer.save_model_with_metadata(
            os.path.join(trainer.model_save_dir, "motor_fault_detection_model.h5"),
            {
                'test_accuracy': test_accuracy,
                'training_results': training_results,
                'evaluation_results': evaluation_results,
                'training_date': datetime.now().isoformat()
            }
        )
        
        # Generate evaluation report
        logger.info("Generating evaluation report...")
        evaluation_report = trainer.generate_comprehensive_evaluation_report(
            X_train, y_train, X_test, y_test,
            save_dir="saved_model"
        )
        
        # Save training summary
        training_summary = {
            'test_accuracy': test_accuracy,
            'training_results': training_results,
            'evaluation_results': evaluation_results,
            'model_path': model_path,
            'training_date': datetime.now().isoformat(),
            'dataset_info': {
                'total_samples': len(X),
                'train_samples': len(X_train),
                'test_samples': len(X_test),
                'sample_shape': X.shape[1:]
            }
        }
        
        summary_file = "saved_model/training_summary_memory_efficient.json"
        with open(summary_file, 'w') as f:
            json.dump(training_summary, f, indent=2, default=str)
        
        logger.info(f"Training summary saved to: {summary_file}")
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        logger.info("=" * 80)
        logger.info("MEMORY-EFFICIENT TRAINING PIPELINE COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"Training completed at: {end_time}")
        logger.info(f"Total training duration: {duration}")
        logger.info(f"Final test accuracy: {test_accuracy:.2%}")
        logger.info(f"Model saved to: {model_path}")
        
        return {
            'success': True,
            'test_accuracy': test_accuracy,
            'training_results': training_results,
            'evaluation_results': evaluation_results,
            'model_path': model_path,
            'duration': str(duration)
        }
        
    except Exception as e:
        logger.error(f"Memory-efficient training pipeline failed: {str(e)}")
        logger.error("Check the logs for detailed error information")
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Main training script entry point."""
    parser = argparse.ArgumentParser(description='Train motor fault detection model (memory-efficient)')
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
        
        # Execute memory-efficient training pipeline
        results = execute_memory_efficient_training_pipeline(
            epochs=args.epochs,
            batch_size=args.batch_size,
            data_path=args.data_path
        )
        
        if results['success']:
            logger.info("✓ Memory-efficient training pipeline completed successfully!")
            logger.info(f"Test accuracy: {results['test_accuracy']:.2%}")
            logger.info(f"Duration: {results['duration']}")
            logger.info(f"Model saved to: {results['model_path']}")
            
            # Exit with success code
            sys.exit(0)
        else:
            logger.error("✗ Memory-efficient training pipeline failed!")
            logger.error(f"Error: {results['error']}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Fatal error in memory-efficient training script: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main() 