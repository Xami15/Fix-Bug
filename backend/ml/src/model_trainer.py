"""
Model training pipeline for motor fault detection system.

This module implements the ModelTrainer class that orchestrates the complete training workflow,
integrating DataProcessor and CNN1D classes with stratified train-test split, k-fold cross validation,
and comprehensive training progress logging and metric tracking.
"""

import os
import json
import logging
import numpy as np
from datetime import datetime
from typing import Dict, Tuple, Optional, List
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
import matplotlib.pyplot as plt
import seaborn as sns

try:
    from .data_processor import DataProcessor
    from .cnn_model import CNN1D
except ImportError:
    # Fallback for direct execution
    from data_processor import DataProcessor
    from cnn_model import CNN1D

logger = logging.getLogger(__name__)


class ModelTrainer:
    """
    Complete model training pipeline for motor fault detection.
    
    Integrates DataProcessor and CNN1D classes for complete training workflow
    with stratified train-test split (75%/25%) matching notebook methodology,
    training progress logging, and comprehensive metric tracking.
    """
    
    def __init__(self, data_path: str, model_save_dir: str = "backend/ml/saved_model/"):
        """
        Initialize the ModelTrainer.
        
        Args:
            data_path: Path to the directory containing CSV data files
            model_save_dir: Directory to save trained models
        """
        self.data_path = data_path
        self.model_save_dir = model_save_dir
        
        # Initialize components
        self.data_processor = DataProcessor(data_path)
        self.cnn_model = CNN1D()
        
        # Training configuration matching notebook methodology
        self.train_test_split_ratio = 0.25  # 75%/25% split
        self.random_state = 101  # For reproducible train-test split
        self.kfold_splits = 5
        self.kfold_random_state = 32  # Matching notebook methodology
        
        # Training parameters
        self.default_epochs = 100
        self.default_batch_size = 32
        self.validation_split = 0.2
        
        # Training history and metrics
        self.training_history = {}
        self.evaluation_metrics = {}
        self.cross_validation_results = {}
        
        # Ensure model save directory exists
        os.makedirs(self.model_save_dir, exist_ok=True)
        
        logger.info("ModelTrainer initialized successfully")
        logger.info(f"Data path: {self.data_path}")
        logger.info(f"Model save directory: {self.model_save_dir}")
    
    def load_and_prepare_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Load and prepare dataset using DataProcessor.
        
        Returns:
            Tuple of (X, LabelPositional, Label) ready for training
        """
        try:
            logger.info("Loading and preparing dataset...")
            
            # Load and preprocess dataset
            X, LabelPositional, Label = self.data_processor.load_and_preprocess_dataset(
                interval_length=200,
                samples_per_block=1681
            )
            
            if len(X) == 0:
                raise ValueError("No data loaded from dataset")
            
            logger.info(f"Dataset loaded successfully:")
            logger.info(f"  - Total samples: {X.shape[0]}")
            logger.info(f"  - Sample shape: {X.shape[1:]}")
            logger.info(f"  - Label shape: {LabelPositional.shape}")
            logger.info(f"  - Number of classes: {LabelPositional.shape[1]}")
            
            # Log class distribution
            class_counts = np.sum(LabelPositional, axis=0)
            for i, (category, count) in enumerate(zip(self.data_processor.fault_categories, class_counts)):
                logger.info(f"  - {category}: {int(count)} samples")
            
            return X, LabelPositional, Label
            
        except Exception as e:
            logger.error(f"Error loading and preparing data: {str(e)}")
            raise
    
    def create_stratified_train_test_split(self, X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Create stratified train-test split (75%/25%) matching notebook methodology.
        
        Args:
            X: Input features
            y: Target labels (one-hot encoded)
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        try:
            logger.info("Creating stratified train-test split...")
            
            # Use DataProcessor's train-test split method with stratification
            X_train, X_test, y_train, y_test = self.data_processor.create_train_test_split(
                X, y, 
                test_size=self.train_test_split_ratio,
                random_state=self.random_state,
                stratify=True
            )
            
            logger.info(f"Train-test split completed:")
            logger.info(f"  - Training set: {X_train.shape[0]} samples ({X_train.shape[0]/len(X)*100:.1f}%)")
            logger.info(f"  - Test set: {X_test.shape[0]} samples ({X_test.shape[0]/len(X)*100:.1f}%)")
            
            # Log class distribution in train and test sets
            train_class_counts = np.sum(y_train, axis=0)
            test_class_counts = np.sum(y_test, axis=0)
            
            logger.info("Class distribution in training set:")
            for i, (category, count) in enumerate(zip(self.data_processor.fault_categories, train_class_counts)):
                logger.info(f"  - {category}: {int(count)} samples")
            
            logger.info("Class distribution in test set:")
            for i, (category, count) in enumerate(zip(self.data_processor.fault_categories, test_class_counts)):
                logger.info(f"  - {category}: {int(count)} samples")
            
            return X_train, X_test, y_train, y_test
            
        except Exception as e:
            logger.error(f"Error creating train-test split: {str(e)}")
            raise
    
    def train_model(self, train_generator, validation_generator, train_steps, val_steps,
                   epochs: Optional[int] = None, batch_size: Optional[int] = None,
                   model_checkpoint_path: Optional[str] = None) -> Dict:
        """
        Train the CNN model with progress logging and metric tracking.
        
        Args:
            X_train: Training input data
            y_train: Training labels (one-hot encoded)
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            epochs: Number of training epochs (default: 100)
            batch_size: Training batch size (default: 32)
            model_checkpoint_path: Path to save best model during training
            
        Returns:
            Dictionary containing training history and metrics
        """
        try:
            epochs = epochs or self.default_epochs
            batch_size = batch_size or self.default_batch_size
            
            logger.info("Starting model training...")
            logger.info(f"Training parameters:")
            logger.info(f"  - Epochs: {epochs}")
            logger.info(f"  - Batch size: {batch_size}")
            logger.info(f"  - Validation split: {self.validation_split}")
            
            # Train the model
            training_start_time = datetime.now()
            
            self.training_history = self.cnn_model.train(
                train_generator=train_generator,
                validation_generator=validation_generator,
                epochs=epochs,
                batch_size=batch_size,
                train_steps=train_steps,
                val_steps=val_steps,
                model_checkpoint_path=model_checkpoint_path
            )
            
            training_end_time = datetime.now()
            training_duration = (training_end_time - training_start_time).total_seconds()
            
            # Add training metadata
            self.training_history.update({
                'training_start_time': training_start_time.isoformat(),
                'training_end_time': training_end_time.isoformat(),
                'training_duration_seconds': training_duration,
                'training_parameters': {
                    'epochs': epochs,
                    'batch_size': batch_size,
                    'validation_split': self.validation_split,
                }
            })
            
            logger.info(f"Model training completed successfully")
            logger.info(f"Training duration: {training_duration:.2f} seconds")
            logger.info(f"Final test accuracy: {self.training_history['test_accuracy']:.4f}")
            
            return self.training_history
            
        except Exception as e:
            logger.error(f"Error during model training: {str(e)}")
            raise
    
    def perform_cross_validation(self, X: np.ndarray, y: np.ndarray,
                                epochs: Optional[int] = None, 
                                batch_size: Optional[int] = None) -> Dict:
        """
        Perform k-fold cross validation with k=5 and random_state=32.
        
        Args:
            X: Input data
            y: Labels (one-hot encoded)
            epochs: Number of training epochs (default: 100)
            batch_size: Training batch size (default: 32)
            
        Returns:
            Dictionary containing cross-validation results
        """
        try:
            epochs = epochs or self.default_epochs
            batch_size = batch_size or self.default_batch_size
            
            logger.info("Starting k-fold cross validation...")
            logger.info(f"Cross-validation parameters:")
            logger.info(f"  - K-folds: {self.kfold_splits}")
            logger.info(f"  - Random state: {self.kfold_random_state}")
            logger.info(f"  - Epochs per fold: {epochs}")
            logger.info(f"  - Batch size: {batch_size}")
            
            cv_start_time = datetime.now()
            
            self.cross_validation_results = self.cnn_model.train_with_kfold(
                X=X,
                y=y,
                k_splits=self.kfold_splits,
                random_state=self.kfold_random_state,
                epochs=epochs,
                batch_size=batch_size
            )
            
            cv_end_time = datetime.now()
            cv_duration = (cv_end_time - cv_start_time).total_seconds()
            
            # Add cross-validation metadata
            self.cross_validation_results.update({
                'cv_start_time': cv_start_time.isoformat(),
                'cv_end_time': cv_end_time.isoformat(),
                'cv_duration_seconds': cv_duration,
                'cv_parameters': {
                    'k_splits': self.kfold_splits,
                    'random_state': self.kfold_random_state,
                    'epochs_per_fold': epochs,
                    'batch_size': batch_size,
                    'total_samples': len(X)
                }
            })
            
            logger.info(f"Cross-validation completed successfully")
            logger.info(f"CV duration: {cv_duration:.2f} seconds")
            logger.info(f"CV Mean Accuracy: {self.cross_validation_results['cv_mean']:.4f} (+/- {self.cross_validation_results['cv_std'] * 2:.4f})")
            
            return self.cross_validation_results
            
        except Exception as e:
            logger.error(f"Error during cross-validation: {str(e)}")
            raise
    
    def evaluate_model(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """
        Evaluate the trained model and generate comprehensive metrics.
        
        Args:
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            
        Returns:
            Dictionary containing evaluation metrics
        """
        try:
            logger.info("Evaluating trained model...")
            
            # Perform comprehensive evaluation
            self.evaluation_metrics = self.cnn_model.evaluate(X_test, y_test)
            
            # Add additional metrics
            self.evaluation_metrics.update({
                'evaluation_timestamp': datetime.now().isoformat(),
                'test_samples': len(X_test),
                'fault_categories': self.data_processor.fault_categories
            })
            
            # Log key metrics
            logger.info(f"Model evaluation completed:")
            logger.info(f"  - Test Accuracy: {self.evaluation_metrics['test_accuracy']:.4f}")
            logger.info(f"  - Test Precision: {self.evaluation_metrics['test_precision']:.4f}")
            logger.info(f"  - Test Recall: {self.evaluation_metrics['test_recall']:.4f}")
            logger.info(f"  - Test Loss: {self.evaluation_metrics['test_loss']:.4f}")
            
            # Log per-class accuracy
            logger.info("Per-class accuracy:")
            for i, (category, accuracy) in enumerate(zip(self.data_processor.fault_categories, 
                                                        self.evaluation_metrics['per_class_accuracy'])):
                logger.info(f"  - {category}: {accuracy:.4f}")
            
            return self.evaluation_metrics
            
        except Exception as e:
            logger.error(f"Error during model evaluation: {str(e)}")
            raise
    
    def log_training_progress(self, message: str, level: str = "info") -> None:
        """
        Log training progress with timestamp.
        
        Args:
            message: Message to log
            level: Log level (info, warning, error)
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        formatted_message = f"[{timestamp}] {message}"
        
        if level == "info":
            logger.info(formatted_message)
        elif level == "warning":
            logger.warning(formatted_message)
        elif level == "error":
            logger.error(formatted_message)
    
    def get_training_summary(self) -> Dict:
        """
        Get comprehensive training summary with all metrics.
        
        Returns:
            Dictionary containing complete training summary
        """
        summary = {
            'model_info': {
                'architecture': 'CNN1D',
                'input_shape': self.cnn_model.input_shape,
                'num_classes': self.cnn_model.num_classes,
                'fault_categories': self.data_processor.fault_categories
            },
            'training_configuration': {
                'train_test_split_ratio': self.train_test_split_ratio,
                'random_state': self.random_state,
                'kfold_splits': self.kfold_splits,
                'kfold_random_state': self.kfold_random_state,
                'default_epochs': self.default_epochs,
                'default_batch_size': self.default_batch_size,
                'validation_split': self.validation_split
            },
            'training_history': self.training_history,
            'cross_validation_results': self.cross_validation_results,
            'evaluation_metrics': self.evaluation_metrics,
            'data_path': self.data_path,
            'model_save_dir': self.model_save_dir
        }
        
        return summary
    
    def run_complete_training_pipeline(self, 
                                     epochs: Optional[int] = None,
                                     batch_size: Optional[int] = None,
                                     perform_cv: bool = True,
                                     save_model: bool = True) -> Dict:
        """
        Execute the complete training pipeline from data loading to model evaluation.
        
        Args:
            epochs: Number of training epochs (default: 100)
            batch_size: Training batch size (default: 32)
            perform_cv: Whether to perform cross-validation (default: True)
            save_model: Whether to save the trained model (default: True)
            
        Returns:
            Dictionary containing complete training results
        """
        try:
            pipeline_start_time = datetime.now()
            self.log_training_progress("Starting complete training pipeline")
            
            # Step 1: Get file paths and labels
            self.log_training_progress("Step 1: Getting file paths and labels")
            file_paths = []
            labels = []
            for i, category in enumerate(self.data_processor.fault_categories):
                for directory in [self.data_processor.unloaded_dir, self.data_processor.loaded_dir]:
                    if not os.path.exists(directory):
                        continue
                    for filename in os.listdir(directory):
                        if filename.endswith('.csv') and self.data_processor._extract_fault_category_from_filename(filename) == category:
                            file_paths.append(os.path.join(directory, filename))
                            labels.append(i)

            # Step 2: Create train-test split
            self.log_training_progress("Step 2: Creating stratified train-test split")
            train_files, test_files, train_labels, test_labels = train_test_split(
                file_paths, labels, test_size=self.train_test_split_ratio, random_state=self.random_state, stratify=labels
            )

            # Step 3: Create data generators
            self.log_training_progress("Step 3: Creating data generators")
            train_generator = self.data_processor.data_generator(train_files, train_labels, batch_size)
            test_generator = self.data_processor.data_generator(test_files, test_labels, batch_size)

            train_steps = len(train_files) // batch_size
            test_steps = len(test_files) // batch_size

            # Step 4: Train final model
            self.log_training_progress("Step 4: Training final model")
            model_checkpoint_path = None
            if save_model:
                model_checkpoint_path = os.path.join(self.model_save_dir, "best_model_checkpoint.keras")
            
            training_results = self.train_model(
                train_generator, test_generator, train_steps, test_steps,
                epochs=epochs, batch_size=batch_size,
                model_checkpoint_path=model_checkpoint_path
            )
            
            # Step 5: Evaluate model
            self.log_training_progress("Step 5: Evaluating trained model")
            evaluation_results = self.evaluate_model(test_generator, test_steps)
            
            # Step 6: Save model (if requested)
            if save_model:
                self.log_training_progress("Step 6: Saving trained model")
                model_path = os.path.join(self.model_save_dir, "motor_fault_detection_model.keras")
                self.cnn_model.save_model(model_path)
                self.log_training_progress(f"Model saved to: {model_path}")
            
            pipeline_end_time = datetime.now()
            pipeline_duration = (pipeline_end_time - pipeline_start_time).total_seconds()
            
            # Compile complete results
            complete_results = {
                'pipeline_info': {
                    'start_time': pipeline_start_time.isoformat(),
                    'end_time': pipeline_end_time.isoformat(),
                    'duration_seconds': pipeline_duration,
                    'performed_cv': perform_cv,
                    'saved_model': save_model
                },
                'data_info': {
                    'total_samples': len(file_paths),
                    'train_samples': len(train_files),
                    'test_samples': len(test_files),
                    'num_classes': len(self.data_processor.fault_categories),
                },
                'training_results': training_results,
                'evaluation_results': evaluation_results
            }
            
            if perform_cv:
                complete_results['cross_validation_results'] = cv_results
            
            self.log_training_progress(f"Complete training pipeline finished successfully in {pipeline_duration:.2f} seconds")
            self.log_training_progress(f"Final model accuracy: {evaluation_results['test_accuracy']:.4f}")
            
            return complete_results
            
        except Exception as e:
            self.log_training_progress(f"Error in training pipeline: {str(e)}", level="error")
            raise
    
    def validate_training_requirements(self) -> bool:
        """
        Validate that all requirements for training are met.
        
        Returns:
            True if all requirements are met, False otherwise
        """
        try:
            # Check if data path exists
            if not os.path.exists(self.data_path):
                logger.error(f"Data path does not exist: {self.data_path}")
                return False
            
            # Check if required directories exist
            unloaded_dir = os.path.join(self.data_path, '1_Unloaded_Condition')
            loaded_dir = os.path.join(self.data_path, '2_Loaded_Condition')
            
            if not os.path.exists(unloaded_dir):
                logger.error(f"Unloaded condition directory not found: {unloaded_dir}")
                return False
            
            if not os.path.exists(loaded_dir):
                logger.error(f"Loaded condition directory not found: {loaded_dir}")
                return False
            
            # Check if CSV files exist
            csv_files_found = 0
            for directory in [unloaded_dir, loaded_dir]:
                for filename in os.listdir(directory):
                    if filename.endswith('.csv'):
                        csv_files_found += 1
            
            if csv_files_found == 0:
                logger.error("No CSV files found in data directories")
                return False
            
            logger.info(f"Training requirements validation passed: {csv_files_found} CSV files found")
            return True
            
        except Exception as e:
            logger.error(f"Error validating training requirements: {str(e)}")
            return False
    
    def generate_confusion_matrices(self, X_train: np.ndarray, y_train: np.ndarray,
                                   X_test: np.ndarray, y_test: np.ndarray,
                                   save_dir: Optional[str] = None) -> Dict[str, np.ndarray]:
        """
        Generate confusion matrices for both training and test datasets using seaborn/matplotlib.
        
        Args:
            X_train: Training input data
            y_train: Training labels (one-hot encoded)
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            save_dir: Directory to save confusion matrix plots
            
        Returns:
            Dictionary containing training and test confusion matrices
        """
        try:
            logger.info("Generating confusion matrices for training and test datasets...")
            
            # Get predictions for training set
            y_train_pred = self.cnn_model.predict(X_train)
            y_train_pred_classes = np.argmax(y_train_pred, axis=1)
            y_train_true_classes = np.argmax(y_train, axis=1)
            
            # Get predictions for test set
            y_test_pred = self.cnn_model.predict(X_test)
            y_test_pred_classes = np.argmax(y_test_pred, axis=1)
            y_test_true_classes = np.argmax(y_test, axis=1)
            
            # Generate confusion matrices with all class labels to ensure 8x8 matrices
            cm_train = confusion_matrix(y_train_true_classes, y_train_pred_classes, 
                                      labels=list(range(self.cnn_model.num_classes)))
            cm_test = confusion_matrix(y_test_true_classes, y_test_pred_classes,
                                     labels=list(range(self.cnn_model.num_classes)))
            
            # Create visualization
            fig, axes = plt.subplots(1, 2, figsize=(20, 8))
            
            # Training confusion matrix
            sns.heatmap(cm_train, annot=True, fmt='d', cmap='Blues',
                       xticklabels=self.data_processor.fault_categories,
                       yticklabels=self.data_processor.fault_categories,
                       ax=axes[0], cbar_kws={'label': 'Count'})
            axes[0].set_title('Training Set Confusion Matrix', fontsize=14, fontweight='bold')
            axes[0].set_xlabel('Predicted Label', fontsize=12)
            axes[0].set_ylabel('True Label', fontsize=12)
            axes[0].tick_params(axis='x', rotation=45)
            
            # Test confusion matrix
            sns.heatmap(cm_test, annot=True, fmt='d', cmap='Oranges',
                       xticklabels=self.data_processor.fault_categories,
                       yticklabels=self.data_processor.fault_categories,
                       ax=axes[1], cbar_kws={'label': 'Count'})
            axes[1].set_title('Test Set Confusion Matrix', fontsize=14, fontweight='bold')
            axes[1].set_xlabel('Predicted Label', fontsize=12)
            axes[1].set_ylabel('True Label', fontsize=12)
            axes[1].tick_params(axis='x', rotation=45)
            
            plt.tight_layout()
            
            # Save plot if directory provided
            if save_dir:
                os.makedirs(save_dir, exist_ok=True)
                save_path = os.path.join(save_dir, 'confusion_matrices_train_test.png')
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Confusion matrices saved to: {save_path}")
            
            plt.show()
            
            confusion_matrices = {
                'train_confusion_matrix': cm_train,
                'test_confusion_matrix': cm_test,
                'train_predictions': y_train_pred_classes,
                'test_predictions': y_test_pred_classes,
                'train_true_labels': y_train_true_classes,
                'test_true_labels': y_test_true_classes
            }
            
            logger.info("Confusion matrices generated successfully")
            return confusion_matrices
            
        except Exception as e:
            logger.error(f"Error generating confusion matrices: {str(e)}")
            raise
    
    def calculate_precision_recall_f1_scores(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict:
        """
        Calculate precision, recall, F1-scores for each fault category.
        
        Args:
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            
        Returns:
            Dictionary containing precision, recall, F1-scores for each category
        """
        try:
            logger.info("Calculating precision, recall, and F1-scores for each fault category...")
            
            # Get predictions
            y_pred = self.cnn_model.predict(X_test)
            y_pred_classes = np.argmax(y_pred, axis=1)
            y_true_classes = np.argmax(y_test, axis=1)
            
            # Calculate precision, recall, F1-score for each class
            precision, recall, f1_score, support = precision_recall_fscore_support(
                y_true_classes, y_pred_classes, 
                labels=list(range(self.cnn_model.num_classes)),
                zero_division=0
            )
            
            # Create detailed classification report
            class_report = classification_report(
                y_true_classes, y_pred_classes,
                labels=list(range(self.cnn_model.num_classes)),
                target_names=self.data_processor.fault_categories,
                output_dict=True,
                zero_division=0
            )
            
            # Organize results by fault category
            category_metrics = {}
            for i, category in enumerate(self.data_processor.fault_categories):
                category_metrics[category] = {
                    'precision': float(precision[i]),
                    'recall': float(recall[i]),
                    'f1_score': float(f1_score[i]),
                    'support': int(support[i])
                }
            
            # Calculate macro and weighted averages
            macro_avg = {
                'precision': float(np.mean(precision)),
                'recall': float(np.mean(recall)),
                'f1_score': float(np.mean(f1_score))
            }
            
            weighted_avg = {
                'precision': float(class_report['weighted avg']['precision']),
                'recall': float(class_report['weighted avg']['recall']),
                'f1_score': float(class_report['weighted avg']['f1-score'])
            }
            
            metrics_results = {
                'category_metrics': category_metrics,
                'macro_average': macro_avg,
                'weighted_average': weighted_avg,
                'classification_report': class_report,
                'overall_accuracy': float(class_report['accuracy'])
            }
            
            # Log results
            logger.info("Per-category metrics:")
            for category, metrics in category_metrics.items():
                logger.info(f"  {category}:")
                logger.info(f"    Precision: {metrics['precision']:.4f}")
                logger.info(f"    Recall: {metrics['recall']:.4f}")
                logger.info(f"    F1-Score: {metrics['f1_score']:.4f}")
                logger.info(f"    Support: {metrics['support']}")
            
            logger.info(f"Macro Average - Precision: {macro_avg['precision']:.4f}, Recall: {macro_avg['recall']:.4f}, F1: {macro_avg['f1_score']:.4f}")
            logger.info(f"Weighted Average - Precision: {weighted_avg['precision']:.4f}, Recall: {weighted_avg['recall']:.4f}, F1: {weighted_avg['f1_score']:.4f}")
            
            return metrics_results
            
        except Exception as e:
            logger.error(f"Error calculating precision, recall, F1-scores: {str(e)}")
            raise
    
    def create_training_history_plots(self, save_dir: Optional[str] = None) -> None:
        """
        Create training history plots and cross-validation score visualization.
        
        Args:
            save_dir: Directory to save plots
        """
        try:
            logger.info("Creating training history plots...")
            
            if not self.training_history or 'history' not in self.training_history:
                logger.warning("No training history available for plotting")
                return
            
            history = self.training_history['history']
            
            # Create training history plots
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            
            # Plot training & validation accuracy
            axes[0, 0].plot(history['accuracy'], label='Training Accuracy', color='blue')
            if 'val_accuracy' in history:
                axes[0, 0].plot(history['val_accuracy'], label='Validation Accuracy', color='orange')
            axes[0, 0].set_title('Model Accuracy', fontsize=14, fontweight='bold')
            axes[0, 0].set_xlabel('Epoch')
            axes[0, 0].set_ylabel('Accuracy')
            axes[0, 0].legend()
            axes[0, 0].grid(True, alpha=0.3)
            
            # Plot training & validation loss
            axes[0, 1].plot(history['loss'], label='Training Loss', color='blue')
            if 'val_loss' in history:
                axes[0, 1].plot(history['val_loss'], label='Validation Loss', color='orange')
            axes[0, 1].set_title('Model Loss', fontsize=14, fontweight='bold')
            axes[0, 1].set_xlabel('Epoch')
            axes[0, 1].set_ylabel('Loss')
            axes[0, 1].legend()
            axes[0, 1].grid(True, alpha=0.3)
            
            # Plot training & validation precision
            if 'precision' in history:
                axes[1, 0].plot(history['precision'], label='Training Precision', color='blue')
                if 'val_precision' in history:
                    axes[1, 0].plot(history['val_precision'], label='Validation Precision', color='orange')
                axes[1, 0].set_title('Model Precision', fontsize=14, fontweight='bold')
                axes[1, 0].set_xlabel('Epoch')
                axes[1, 0].set_ylabel('Precision')
                axes[1, 0].legend()
                axes[1, 0].grid(True, alpha=0.3)
            
            # Plot training & validation recall
            if 'recall' in history:
                axes[1, 1].plot(history['recall'], label='Training Recall', color='blue')
                if 'val_recall' in history:
                    axes[1, 1].plot(history['val_recall'], label='Validation Recall', color='orange')
                axes[1, 1].set_title('Model Recall', fontsize=14, fontweight='bold')
                axes[1, 1].set_xlabel('Epoch')
                axes[1, 1].set_ylabel('Recall')
                axes[1, 1].legend()
                axes[1, 1].grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            # Save plot if directory provided
            if save_dir:
                os.makedirs(save_dir, exist_ok=True)
                save_path = os.path.join(save_dir, 'training_history.png')
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Training history plot saved to: {save_path}")
            
            plt.show()
            
        except Exception as e:
            logger.error(f"Error creating training history plots: {str(e)}")
            raise
    
    def create_cross_validation_visualization(self, save_dir: Optional[str] = None) -> None:
        """
        Create cross-validation score visualization.
        
        Args:
            save_dir: Directory to save plots
        """
        try:
            logger.info("Creating cross-validation score visualization...")
            
            if not self.cross_validation_results or 'cv_scores' not in self.cross_validation_results:
                logger.warning("No cross-validation results available for plotting")
                return
            
            cv_scores = self.cross_validation_results['cv_scores']
            cv_mean = self.cross_validation_results['cv_mean']
            cv_std = self.cross_validation_results['cv_std']
            
            # Create cross-validation visualization
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
            
            # Bar plot of CV scores
            folds = [f'Fold {i+1}' for i in range(len(cv_scores))]
            bars = ax1.bar(folds, cv_scores, alpha=0.7, color='skyblue', edgecolor='navy')
            
            # Add mean line
            ax1.axhline(y=cv_mean, color='red', linestyle='--', linewidth=2,
                       label=f'Mean: {cv_mean:.4f}')
            
            # Add standard deviation bands
            ax1.axhline(y=cv_mean + cv_std, color='red', linestyle=':', alpha=0.7,
                       label=f'±1 Std: {cv_std:.4f}')
            ax1.axhline(y=cv_mean - cv_std, color='red', linestyle=':', alpha=0.7)
            
            # Add value labels on bars
            for bar, score in zip(bars, cv_scores):
                ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.005,
                        f'{score:.4f}', ha='center', va='bottom', fontweight='bold')
            
            ax1.set_title('Cross-Validation Scores by Fold', fontsize=14, fontweight='bold')
            ax1.set_xlabel('Fold')
            ax1.set_ylabel('Accuracy')
            ax1.legend()
            ax1.grid(True, alpha=0.3)
            ax1.set_ylim(0, 1)
            
            # Box plot of CV scores
            ax2.boxplot(cv_scores, labels=['CV Scores'])
            ax2.set_title('Cross-Validation Score Distribution', fontsize=14, fontweight='bold')
            ax2.set_ylabel('Accuracy')
            ax2.grid(True, alpha=0.3)
            
            # Add statistics text
            stats_text = f'Mean: {cv_mean:.4f}\nStd: {cv_std:.4f}\nMin: {min(cv_scores):.4f}\nMax: {max(cv_scores):.4f}'
            ax2.text(0.02, 0.98, stats_text, transform=ax2.transAxes, fontsize=10,
                    verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8))
            
            plt.tight_layout()
            
            # Save plot if directory provided
            if save_dir:
                os.makedirs(save_dir, exist_ok=True)
                save_path = os.path.join(save_dir, 'cross_validation_scores.png')
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Cross-validation plot saved to: {save_path}")
            
            plt.show()
            
        except Exception as e:
            logger.error(f"Error creating cross-validation visualization: {str(e)}")
            raise
    
    def implement_model_performance_comparison(self, comparison_metrics: Optional[Dict] = None) -> Dict:
        """
        Implement model performance comparison and validation metrics.
        
        Args:
            comparison_metrics: Optional dictionary of baseline metrics for comparison
            
        Returns:
            Dictionary containing performance comparison results
        """
        try:
            logger.info("Implementing model performance comparison...")
            
            if not self.evaluation_metrics:
                logger.warning("No evaluation metrics available for comparison")
                return {}
            
            current_metrics = {
                'accuracy': self.evaluation_metrics['test_accuracy'],
                'precision': self.evaluation_metrics['test_precision'],
                'recall': self.evaluation_metrics['test_recall'],
                'loss': self.evaluation_metrics['test_loss']
            }
            
            comparison_results = {
                'current_model_metrics': current_metrics,
                'performance_analysis': {}
            }
            
            # Add cross-validation metrics if available
            if self.cross_validation_results:
                cv_metrics = {
                    'cv_mean_accuracy': self.cross_validation_results['cv_mean'],
                    'cv_std_accuracy': self.cross_validation_results['cv_std'],
                    'cv_scores': self.cross_validation_results['cv_scores']
                }
                comparison_results['cross_validation_metrics'] = cv_metrics
                
                # Analyze CV performance stability
                cv_stability = {
                    'coefficient_of_variation': self.cross_validation_results['cv_std'] / self.cross_validation_results['cv_mean'],
                    'score_range': max(self.cross_validation_results['cv_scores']) - min(self.cross_validation_results['cv_scores']),
                    'is_stable': self.cross_validation_results['cv_std'] < 0.05  # Less than 5% std deviation
                }
                comparison_results['performance_analysis']['cv_stability'] = cv_stability
            
            # Compare with baseline metrics if provided
            if comparison_metrics:
                comparison_results['baseline_metrics'] = comparison_metrics
                comparison_results['performance_analysis']['improvements'] = {}
                
                for metric, current_value in current_metrics.items():
                    if metric in comparison_metrics:
                        baseline_value = comparison_metrics[metric]
                        improvement = current_value - baseline_value
                        improvement_pct = (improvement / baseline_value) * 100 if baseline_value != 0 else 0
                        
                        comparison_results['performance_analysis']['improvements'][metric] = {
                            'absolute_improvement': improvement,
                            'percentage_improvement': improvement_pct,
                            'is_better': improvement > 0 if metric != 'loss' else improvement < 0
                        }
            
            # Performance validation against requirements
            requirements_validation = {
                'meets_accuracy_requirement': current_metrics['accuracy'] >= 0.85,  # ≥85% accuracy requirement
                'accuracy_gap': current_metrics['accuracy'] - 0.85,
                'overall_performance_rating': self._calculate_performance_rating(current_metrics)
            }
            comparison_results['performance_analysis']['requirements_validation'] = requirements_validation
            
            # Log comparison results
            logger.info("Model performance comparison results:")
            logger.info(f"  Current Accuracy: {current_metrics['accuracy']:.4f}")
            logger.info(f"  Meets 85% requirement: {requirements_validation['meets_accuracy_requirement']}")
            
            if self.cross_validation_results:
                logger.info(f"  CV Mean Accuracy: {cv_metrics['cv_mean_accuracy']:.4f} (±{cv_metrics['cv_std_accuracy']:.4f})")
                logger.info(f"  CV Stability: {'Stable' if cv_stability['is_stable'] else 'Unstable'}")
            
            return comparison_results
            
        except Exception as e:
            logger.error(f"Error implementing model performance comparison: {str(e)}")
            raise
    
    def _calculate_performance_rating(self, metrics: Dict) -> str:
        """
        Calculate overall performance rating based on metrics.
        
        Args:
            metrics: Dictionary of performance metrics
            
        Returns:
            Performance rating string
        """
        accuracy = metrics['accuracy']
        precision = metrics['precision']
        recall = metrics['recall']
        
        # Calculate weighted score
        score = (accuracy * 0.5) + (precision * 0.25) + (recall * 0.25)
        
        if score >= 0.95:
            return "Excellent"
        elif score >= 0.90:
            return "Very Good"
        elif score >= 0.85:
            return "Good"
        elif score >= 0.80:
            return "Fair"
        else:
            return "Poor"
    
    def generate_comprehensive_evaluation_report(self, X_train: np.ndarray, y_train: np.ndarray,
                                               X_test: np.ndarray, y_test: np.ndarray,
                                               save_dir: Optional[str] = None,
                                               comparison_metrics: Optional[Dict] = None) -> Dict:
        """
        Generate comprehensive evaluation report with all visualizations and metrics.
        
        Args:
            X_train: Training input data
            y_train: Training labels (one-hot encoded)
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            save_dir: Directory to save all plots and reports
            comparison_metrics: Optional baseline metrics for comparison
            
        Returns:
            Dictionary containing complete evaluation report
        """
        try:
            logger.info("Generating comprehensive evaluation report...")
            
            if save_dir:
                os.makedirs(save_dir, exist_ok=True)
                logger.info(f"Saving evaluation report to: {save_dir}")
            
            # Generate all evaluation components
            report = {
                'timestamp': datetime.now().isoformat(),
                'model_info': {
                    'architecture': 'CNN1D',
                    'input_shape': self.cnn_model.input_shape,
                    'num_classes': self.cnn_model.num_classes,
                    'fault_categories': self.data_processor.fault_categories
                }
            }
            
            # 1. Generate confusion matrices
            confusion_matrices = self.generate_confusion_matrices(X_train, y_train, X_test, y_test, save_dir)
            report['confusion_matrices'] = confusion_matrices
            
            # 2. Calculate precision, recall, F1-scores
            precision_recall_metrics = self.calculate_precision_recall_f1_scores(X_test, y_test)
            report['precision_recall_metrics'] = precision_recall_metrics
            
            # 3. Create training history plots
            self.create_training_history_plots(save_dir)
            
            # 4. Create cross-validation visualization
            self.create_cross_validation_visualization(save_dir)
            
            # 5. Implement performance comparison
            performance_comparison = self.implement_model_performance_comparison(comparison_metrics)
            report['performance_comparison'] = performance_comparison
            
            # 6. Add training summary
            training_summary = self.get_training_summary()
            report['training_summary'] = training_summary
            
            # 7. Save complete report as JSON
            if save_dir:
                report_path = os.path.join(save_dir, 'comprehensive_evaluation_report.json')
                with open(report_path, 'w') as f:
                    # Convert numpy arrays to lists for JSON serialization
                    json_report = self._convert_numpy_to_json(report)
                    json.dump(json_report, f, indent=2)
                logger.info(f"Complete evaluation report saved to: {report_path}")
            
            logger.info("Comprehensive evaluation report generated successfully")
            return report
            
        except Exception as e:
            logger.error(f"Error generating comprehensive evaluation report: {str(e)}")
            raise
    
    def _convert_numpy_to_json(self, obj):
        """
        Convert numpy arrays to lists for JSON serialization.
        
        Args:
            obj: Object to convert
            
        Returns:
            JSON-serializable object
        """
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, dict):
            return {key: self._convert_numpy_to_json(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_numpy_to_json(item) for item in obj]
        else:
            return obj
    
    def save_model_with_metadata(self, model_path: str, metadata: Optional[Dict] = None) -> str:
        """
        Save trained model with comprehensive metadata including training metrics and timestamps.
        
        Args:
            model_path: Path to save the model (without extension)
            metadata: Additional metadata to include
            
        Returns:
            Path to saved model file
        """
        try:
            logger.info(f"Saving model with metadata to: {model_path}")
            
            # Ensure model path has .keras extension
            if not model_path.endswith('.keras'):
                model_path = f"{model_path}.keras"
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            
            # Save the model
            self.cnn_model.save_model(model_path)
            
            # Prepare comprehensive metadata
            model_metadata = {
                'model_info': {
                    'architecture': 'CNN1D',
                    'input_shape': self.cnn_model.input_shape,
                    'num_classes': self.cnn_model.num_classes,
                    'fault_categories': self.data_processor.fault_categories,
                    'model_path': model_path
                },
                'training_info': {
                    'timestamp': datetime.now().isoformat(),
                    'data_path': self.data_path,
                    'training_configuration': {
                        'train_test_split_ratio': self.train_test_split_ratio,
                        'random_state': self.random_state,
                        'kfold_splits': self.kfold_splits,
                        'kfold_random_state': self.kfold_random_state
                    }
                },
                'performance_metrics': {},
                'version_info': {
                    'model_version': self._generate_model_version(),
                    'created_at': datetime.now().isoformat(),
                    'is_active': True
                }
            }
            
            # Add training metrics if available
            if self.training_history:
                model_metadata['performance_metrics']['training'] = {
                    'test_accuracy': self.training_history.get('test_accuracy', 0.0),
                    'test_loss': self.training_history.get('test_loss', 0.0),
                    'test_precision': self.training_history.get('test_precision', 0.0),
                    'test_recall': self.training_history.get('test_recall', 0.0),
                    'epochs_trained': self.training_history.get('epochs_trained', 0),
                    'training_duration_seconds': self.training_history.get('training_duration_seconds', 0)
                }
            
            # Add cross-validation metrics if available
            if self.cross_validation_results:
                model_metadata['performance_metrics']['cross_validation'] = {
                    'cv_mean_accuracy': self.cross_validation_results.get('cv_mean', 0.0),
                    'cv_std_accuracy': self.cross_validation_results.get('cv_std', 0.0),
                    'cv_scores': self.cross_validation_results.get('cv_scores', []),
                    'k_splits': self.cross_validation_results.get('k_splits', 5)
                }
            
            # Add evaluation metrics if available
            if self.evaluation_metrics:
                model_metadata['performance_metrics']['evaluation'] = {
                    'test_accuracy': self.evaluation_metrics.get('test_accuracy', 0.0),
                    'test_precision': self.evaluation_metrics.get('test_precision', 0.0),
                    'test_recall': self.evaluation_metrics.get('test_recall', 0.0),
                    'per_class_accuracy': self.evaluation_metrics.get('per_class_accuracy', []).tolist() if hasattr(self.evaluation_metrics.get('per_class_accuracy', []), 'tolist') else self.evaluation_metrics.get('per_class_accuracy', [])
                }
            
            # Add custom metadata if provided
            if metadata:
                model_metadata['custom_metadata'] = metadata
            
            # Save metadata as JSON file
            metadata_path = model_path.replace('.keras', '_metadata.json')
            with open(metadata_path, 'w') as f:
                json.dump(model_metadata, f, indent=2)
            
            # Update model registry
            self._update_model_registry(model_metadata)
            
            logger.info(f"Model saved successfully: {model_path}")
            logger.info(f"Metadata saved: {metadata_path}")
            logger.info(f"Model version: {model_metadata['version_info']['model_version']}")
            
            return model_path
            
        except Exception as e:
            logger.error(f"Error saving model with metadata: {str(e)}")
            raise
    
    def _generate_model_version(self) -> str:
        """
        Generate a unique model version string.
        
        Returns:
            Version string in format: v{YYYYMMDD}_{HHMMSS}
        """
        timestamp = datetime.now()
        return f"v{timestamp.strftime('%Y%m%d_%H%M%S')}"
    
    def _update_model_registry(self, model_metadata: Dict) -> None:
        """
        Update model registry with new model information.
        
        Args:
            model_metadata: Model metadata dictionary
        """
        try:
            registry_path = os.path.join(self.model_save_dir, 'model_registry.json')
            
            # Load existing registry or create new one
            if os.path.exists(registry_path):
                with open(registry_path, 'r') as f:
                    registry = json.load(f)
            else:
                registry = {
                    'models': [],
                    'active_model': None,
                    'last_updated': None
                }
            
            # Add new model to registry
            registry_entry = {
                'model_version': model_metadata['version_info']['model_version'],
                'model_path': model_metadata['model_info']['model_path'],
                'metadata_path': model_metadata['model_info']['model_path'].replace('.keras', '_metadata.json'),
                'created_at': model_metadata['version_info']['created_at'],
                'is_active': model_metadata['version_info']['is_active'],
                'performance_summary': {
                    'test_accuracy': model_metadata['performance_metrics'].get('training', {}).get('test_accuracy', 0.0),
                    'cv_mean_accuracy': model_metadata['performance_metrics'].get('cross_validation', {}).get('cv_mean_accuracy', 0.0)
                }
            }
            
            # Deactivate previous active model
            for model in registry['models']:
                model['is_active'] = False
            
            # Add new model and set as active
            registry['models'].append(registry_entry)
            registry['active_model'] = model_metadata['version_info']['model_version']
            registry['last_updated'] = datetime.now().isoformat()
            
            # Save updated registry
            with open(registry_path, 'w') as f:
                json.dump(registry, f, indent=2)
            
            logger.info(f"Model registry updated: {registry_path}")
            
        except Exception as e:
            logger.error(f"Error updating model registry: {str(e)}")
            # Don't raise exception as this is not critical for model saving
    
    def load_model_with_metadata(self, model_path: str) -> Tuple[bool, Dict]:
        """
        Load model with version management and metadata.
        
        Args:
            model_path: Path to model file or model version
            
        Returns:
            Tuple of (success, metadata_dict)
        """
        try:
            logger.info(f"Loading model: {model_path}")
            
            # If model_path is a version string, resolve to actual path
            if model_path.startswith('v') and not model_path.endswith('.keras'):
                resolved_path = self._resolve_model_version_to_path(model_path)
                if not resolved_path:
                    logger.error(f"Could not resolve model version: {model_path}")
                    return False, {}
                model_path = resolved_path
            
            # Check if model file exists
            if not os.path.exists(model_path):
                logger.error(f"Model file not found: {model_path}")
                return False, {}
            
            # Load the model
            self.cnn_model.load_model(model_path)
            
            # Load metadata if available
            metadata_path = model_path.replace('.keras', '_metadata.json')
            metadata = {}
            
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                logger.info(f"Metadata loaded from: {metadata_path}")
            else:
                logger.warning(f"No metadata file found: {metadata_path}")
            
            # Update internal state with loaded metadata
            if metadata:
                self._restore_state_from_metadata(metadata)
            
            logger.info(f"Model loaded successfully: {model_path}")
            if metadata.get('version_info', {}).get('model_version'):
                logger.info(f"Model version: {metadata['version_info']['model_version']}")
            
            return True, metadata
            
        except Exception as e:
            logger.error(f"Error loading model with metadata: {str(e)}")
            return False, {}
    
    def _resolve_model_version_to_path(self, version: str) -> Optional[str]:
        """
        Resolve model version string to actual file path.
        
        Args:
            version: Model version string
            
        Returns:
            Model file path or None if not found
        """
        try:
            registry_path = os.path.join(self.model_save_dir, 'model_registry.json')
            
            if not os.path.exists(registry_path):
                logger.warning("Model registry not found")
                return None
            
            with open(registry_path, 'r') as f:
                registry = json.load(f)
            
            # Find model with matching version
            for model in registry['models']:
                if model['model_version'] == version:
                    return model['model_path']
            
            logger.warning(f"Model version not found in registry: {version}")
            return None
            
        except Exception as e:
            logger.error(f"Error resolving model version: {str(e)}")
            return None
    
    def _restore_state_from_metadata(self, metadata: Dict) -> None:
        """
        Restore ModelTrainer state from loaded metadata.
        
        Args:
            metadata: Model metadata dictionary
        """
        try:
            # Restore training configuration
            if 'training_info' in metadata and 'training_configuration' in metadata['training_info']:
                config = metadata['training_info']['training_configuration']
                self.train_test_split_ratio = config.get('train_test_split_ratio', self.train_test_split_ratio)
                self.random_state = config.get('random_state', self.random_state)
                self.kfold_splits = config.get('kfold_splits', self.kfold_splits)
                self.kfold_random_state = config.get('kfold_random_state', self.kfold_random_state)
            
            # Restore performance metrics
            if 'performance_metrics' in metadata:
                perf_metrics = metadata['performance_metrics']
                
                if 'training' in perf_metrics:
                    self.training_history = perf_metrics['training']
                
                if 'cross_validation' in perf_metrics:
                    self.cross_validation_results = perf_metrics['cross_validation']
                
                if 'evaluation' in perf_metrics:
                    self.evaluation_metrics = perf_metrics['evaluation']
            
            logger.info("ModelTrainer state restored from metadata")
            
        except Exception as e:
            logger.error(f"Error restoring state from metadata: {str(e)}")
    
    def get_model_registry(self) -> Dict:
        """
        Get the complete model registry with all saved models.
        
        Returns:
            Dictionary containing model registry
        """
        try:
            registry_path = os.path.join(self.model_save_dir, 'model_registry.json')
            
            if not os.path.exists(registry_path):
                logger.warning("Model registry not found")
                return {
                    'models': [],
                    'active_model': None,
                    'last_updated': None
                }
            
            with open(registry_path, 'r') as f:
                registry = json.load(f)
            
            return registry
            
        except Exception as e:
            logger.error(f"Error getting model registry: {str(e)}")
            return {
                'models': [],
                'active_model': None,
                'last_updated': None,
                'error': str(e)
            }
    
    def list_available_models(self) -> List[Dict]:
        """
        List all available saved models with their metadata.
        
        Returns:
            List of model information dictionaries
        """
        try:
            registry = self.get_model_registry()
            
            if 'error' in registry:
                return []
            
            models_info = []
            for model in registry['models']:
                model_info = {
                    'version': model['model_version'],
                    'path': model['model_path'],
                    'created_at': model['created_at'],
                    'is_active': model['is_active'],
                    'test_accuracy': model['performance_summary']['test_accuracy'],
                    'cv_mean_accuracy': model['performance_summary']['cv_mean_accuracy']
                }
                models_info.append(model_info)
            
            # Sort by creation date (newest first)
            models_info.sort(key=lambda x: x['created_at'], reverse=True)
            
            return models_info
            
        except Exception as e:
            logger.error(f"Error listing available models: {str(e)}")
            return []
    
    def set_active_model(self, model_version: str) -> bool:
        """
        Set a specific model version as the active model.
        
        Args:
            model_version: Version string of the model to activate
            
        Returns:
            True if successful, False otherwise
        """
        try:
            registry_path = os.path.join(self.model_save_dir, 'model_registry.json')
            
            if not os.path.exists(registry_path):
                logger.error("Model registry not found")
                return False
            
            with open(registry_path, 'r') as f:
                registry = json.load(f)
            
            # Find and activate the specified model
            model_found = False
            for model in registry['models']:
                if model['model_version'] == model_version:
                    model['is_active'] = True
                    model_found = True
                    registry['active_model'] = model_version
                else:
                    model['is_active'] = False
            
            if not model_found:
                logger.error(f"Model version not found: {model_version}")
                return False
            
            # Update registry
            registry['last_updated'] = datetime.now().isoformat()
            
            with open(registry_path, 'w') as f:
                json.dump(registry, f, indent=2)
            
            logger.info(f"Active model set to: {model_version}")
            return True
            
        except Exception as e:
            logger.error(f"Error setting active model: {str(e)}")
            return False
    
    def delete_model_version(self, model_version: str, delete_files: bool = True) -> bool:
        """
        Delete a specific model version from registry and optionally delete files.
        
        Args:
            model_version: Version string of the model to delete
            delete_files: Whether to delete the actual model files
            
        Returns:
            True if successful, False otherwise
        """
        try:
            registry_path = os.path.join(self.model_save_dir, 'model_registry.json')
            
            if not os.path.exists(registry_path):
                logger.error("Model registry not found")
                return False
            
            with open(registry_path, 'r') as f:
                registry = json.load(f)
            
            # Find the model to delete
            model_to_delete = None
            for i, model in enumerate(registry['models']):
                if model['model_version'] == model_version:
                    model_to_delete = registry['models'].pop(i)
                    break
            
            if not model_to_delete:
                logger.error(f"Model version not found: {model_version}")
                return False
            
            # Update active model if we're deleting the active one
            if registry['active_model'] == model_version:
                if registry['models']:
                    # Set the most recent remaining model as active
                    latest_model = max(registry['models'], key=lambda x: x['created_at'])
                    latest_model['is_active'] = True
                    registry['active_model'] = latest_model['model_version']
                else:
                    registry['active_model'] = None
            
            # Delete files if requested
            if delete_files:
                try:
                    if os.path.exists(model_to_delete['model_path']):
                        os.remove(model_to_delete['model_path'])
                        logger.info(f"Deleted model file: {model_to_delete['model_path']}")
                    
                    if os.path.exists(model_to_delete['metadata_path']):
                        os.remove(model_to_delete['metadata_path'])
                        logger.info(f"Deleted metadata file: {model_to_delete['metadata_path']}")
                        
                except Exception as e:
                    logger.warning(f"Error deleting files: {str(e)}")
            
            # Update registry
            registry['last_updated'] = datetime.now().isoformat()
            
            with open(registry_path, 'w') as f:
                json.dump(registry, f, indent=2)
            
            logger.info(f"Model version deleted from registry: {model_version}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting model version: {str(e)}")
            return False
