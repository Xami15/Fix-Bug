#!/usr/bin/env python3
"""
Complete Model Training Pipeline for Motor Fault Detection System

This script executes the complete training pipeline for Task 10.1:
- Load and preprocess the CSV dataset
- Execute model training with validation
- Generate evaluation metrics and visualizations
- Save trained model with metadata
- Validate model achieves ≥85% accuracy requirement

Usage:
    python train_model.py [--epochs 100] [--batch-size 32] [--data-path "2_CSV_Data_Files"]
"""

import os
import sys
import argparse
import logging
import json
from datetime import datetime
from pathlib import Path

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.model_trainer import ModelTrainer
except ImportError:
    # Fallback for direct execution
    from model_trainer import ModelTrainer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def setup_training_environment():
    """Setup the training environment and validate requirements."""
    logger.info("Setting up training environment...")
    
    # Check if we're in the correct directory
    current_dir = Path.cwd()
    logger.info(f"Current working directory: {current_dir}")
    
    # Validate data path exists
    data_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '2_CSV_Data_Files'))
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
    
    logger.info("Training environment setup complete")
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


def execute_training_pipeline(epochs: int = 100, batch_size: int = 32, data_path: str = "2_CSV_Data_Files"):
    """Execute the complete training pipeline."""
    logger.info("=" * 80)
    logger.info("STARTING COMPLETE MODEL TRAINING PIPELINE")
    logger.info("=" * 80)
    
    start_time = datetime.now()
    logger.info(f"Training started at: {start_time}")
    
    try:
        # Initialize ModelTrainer
        logger.info("Initializing ModelTrainer...")
        trainer = ModelTrainer(data_path=data_path)
        
        # Validate training requirements
        logger.info("Validating training requirements...")
        if not trainer.validate_training_requirements():
            raise ValueError("Training requirements validation failed")
        
        # Execute complete training pipeline
        logger.info("Executing complete training pipeline...")
        training_results = trainer.run_complete_training_pipeline(
            epochs=epochs,
            batch_size=batch_size,
            perform_cv=True,
            save_model=True
        )
        
        # Validate model accuracy requirement (≥85%)
        test_accuracy = training_results.get('test_accuracy', 0)
        logger.info(f"Test accuracy achieved: {test_accuracy:.2%}")
        
        if test_accuracy < 0.85:
            logger.warning(f"Model accuracy ({test_accuracy:.2%}) is below the required 85% threshold")
            logger.warning("Consider adjusting training parameters or data preprocessing")
        else:
            logger.info("✓ Model accuracy requirement (≥85%) met successfully!")
        
        # Generate comprehensive evaluation report
        logger.info("Generating comprehensive evaluation report...")
        evaluation_report = trainer.generate_comprehensive_evaluation_report(
            X_train=training_results['X_train'],
            y_train=training_results['y_train'],
            X_test=training_results['X_test'],
            y_test=training_results['y_test'],
            save_dir="saved_model"
        )
        
        # Save training summary
        training_summary = trainer.get_training_summary()
        summary_file = "saved_model/training_summary.json"
        with open(summary_file, 'w') as f:
            json.dump(training_summary, f, indent=2, default=str)
        
        logger.info(f"Training summary saved to: {summary_file}")
        
        end_time = datetime.now()
        duration = end_time - start_time
        
        logger.info("=" * 80)
        logger.info("TRAINING PIPELINE COMPLETED SUCCESSFULLY")
        logger.info("=" * 80)
        logger.info(f"Training completed at: {end_time}")
        logger.info(f"Total training duration: {duration}")
        logger.info(f"Final test accuracy: {test_accuracy:.2%}")
        logger.info(f"Model saved to: {training_results.get('model_path', 'saved_model/')}")
        
        return {
            'success': True,
            'test_accuracy': test_accuracy,
            'training_results': training_results,
            'evaluation_report': evaluation_report,
            'duration': str(duration)
        }
        
    except Exception as e:
        logger.error(f"Training pipeline failed: {str(e)}")
        logger.error("Check the logs for detailed error information")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main training script entry point."""
    parser = argparse.ArgumentParser(description='Train motor fault detection model')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32, help='Training batch size')
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
        
        # Execute training pipeline
        results = execute_training_pipeline(
            epochs=args.epochs,
            batch_size=args.batch_size,
            data_path=data_path
        )
        
        if results['success']:
            logger.info("✓ Training pipeline completed successfully!")
            logger.info(f"Test accuracy: {results['test_accuracy']:.2%}")
            logger.info(f"Duration: {results['duration']}")
            
            # Exit with success code
            sys.exit(0)
        else:
            logger.error("✗ Training pipeline failed!")
            logger.error(f"Error: {results['error']}")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Fatal error in training script: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()