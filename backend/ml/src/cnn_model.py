"""
CNN1D model implementation for motor fault detection system.

This module implements the exact CNN architecture from the research notebook,
following the specifications in the design document with Conv1D layers,
MaxPooling1D layers, and Dense layers for 8-class fault classification.
"""

import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, callbacks
import numpy as np
from typing import Dict, Tuple, Optional, List
import logging
from sklearn.model_selection import KFold
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns

logger = logging.getLogger(__name__)


class CNN1D:
    """
    1D Convolutional Neural Network for motor fault detection.
    
    Implements the exact CNN architecture from the research notebook:
    - Input Shape: (1681, 1) for 1D time-series data
    - Conv1D layers: filters=[16, 32, 64, 128], kernel_size=3, strides=2
    - MaxPooling1D layers: pool_size=2
    - Dense layers: [100, 50, 8] neurons
    - Output: 8 classes with softmax activation
    """
    
    def __init__(self):
        """Initialize the CNN1D model."""
        self.model = None
        self.input_shape = (1681, 1)
        self.num_classes = 8
        self.fault_categories = [
            'healthy',
            'bowed_rotor', 
            'faulty_bearing',
            'broken_rotor_bars',
            'rotor_misalignment',
            'rotor_unbalanced',
            'stator_winding',
            'voltage_unbalanced'
        ]
        self.training_history = {}
        self.is_compiled = False
        
        # Create the model
        self.model = self.create_model()
        logger.info("CNN1D model initialized successfully")
    
    def create_model(self) -> tf.keras.Model:
        """
        Build CNN architecture matching notebook specifications.
        
        Architecture:
        - Conv1D layers with filters=[16, 32, 64, 128], kernel_size=3, strides=2
        - MaxPooling1D layers with pool_size=2
        - Dense layers with [100, 50, 8] neurons
        - ReLU activation for hidden layers, softmax for output
        
        Returns:
            Compiled Keras model
        """
        try:
            model = models.Sequential(name='CNN1D_MotorFaultDetection')
            
            # Input layer
            model.add(layers.Input(shape=self.input_shape, name='input_layer'))
            
            # First Conv1D block
            model.add(layers.Conv1D(
                filters=16,
                kernel_size=3,
                strides=2,
                activation='relu',
                padding='same',
                name='conv1d_1'
            ))
            model.add(layers.MaxPooling1D(
                pool_size=2,
                padding='same',
                name='maxpool1d_1'
            ))
            
            # Second Conv1D block
            model.add(layers.Conv1D(
                filters=32,
                kernel_size=3,
                strides=2,
                activation='relu',
                padding='same',
                name='conv1d_2'
            ))
            model.add(layers.MaxPooling1D(
                pool_size=2,
                padding='same',
                name='maxpool1d_2'
            ))
            
            # Third Conv1D block
            model.add(layers.Conv1D(
                filters=64,
                kernel_size=3,
                strides=2,
                activation='relu',
                padding='same',
                name='conv1d_3'
            ))
            model.add(layers.MaxPooling1D(
                pool_size=2,
                padding='same',
                name='maxpool1d_3'
            ))
            
            # Fourth Conv1D block
            model.add(layers.Conv1D(
                filters=128,
                kernel_size=3,
                strides=2,
                activation='relu',
                padding='same',
                name='conv1d_4'
            ))
            model.add(layers.MaxPooling1D(
                pool_size=2,
                padding='same',
                name='maxpool1d_4'
            ))
            
            # Flatten layer to transition from Conv1D to Dense
            model.add(layers.Flatten(name='flatten'))
            
            # Dense layers
            model.add(layers.Dense(
                100,
                activation='relu',
                name='dense_1'
            ))
            
            model.add(layers.Dense(
                50,
                activation='relu',
                name='dense_2'
            ))
            
            # Output layer - 8 classes for fault categories
            model.add(layers.Dense(
                self.num_classes,
                activation='softmax',
                name='output_layer'
            ))
            
            logger.info("CNN1D model architecture created successfully")
            logger.info(f"Model input shape: {self.input_shape}")
            logger.info(f"Model output classes: {self.num_classes}")
            
            return model
            
        except Exception as e:
            logger.error(f"Error creating CNN1D model: {str(e)}")
            raise
    
    def compile_model(self, learning_rate: float = 0.001) -> None:
        """
        Configure model compilation with Adam optimizer and categorical crossentropy loss.
        
        Args:
            learning_rate: Learning rate for Adam optimizer (default: 0.001)
        """
        try:
            if self.model is None:
                raise ValueError("Model not created. Call create_model() first.")
            
            # Compile with Adam optimizer and categorical crossentropy loss
            self.model.compile(
                optimizer=optimizers.Adam(learning_rate=learning_rate),
                loss='categorical_crossentropy',
                metrics=['accuracy', 'precision', 'recall']
            )
            
            self.is_compiled = True
            logger.info(f"Model compiled successfully with learning_rate={learning_rate}")
            
        except Exception as e:
            logger.error(f"Error compiling model: {str(e)}")
            raise
    
    def get_model_summary(self) -> str:
        """
        Get detailed model architecture summary.
        
        Returns:
            String representation of model architecture
        """
        if self.model is None:
            return "Model not created"
        
        try:
            # Capture model summary as string
            summary_lines = []
            self.model.summary(print_fn=lambda x: summary_lines.append(x))
            return '\n'.join(summary_lines)
            
        except Exception as e:
            logger.error(f"Error getting model summary: {str(e)}")
            return f"Error getting summary: {str(e)}"
    
    def validate_input_shape(self, X: np.ndarray) -> bool:
        """
        Validate that input data has the correct shape for the model.
        
        Args:
            X: Input data array
            
        Returns:
            True if shape is valid, False otherwise
        """
        if len(X.shape) != 3:
            logger.error(f"Input must be 3D array, got {len(X.shape)}D")
            return False
        
        if X.shape[1:] != self.input_shape:
            logger.error(f"Input shape mismatch. Expected: {self.input_shape}, Got: {X.shape[1:]}")
            return False
        
        return True
    
    def prepare_input_data(self, X: np.ndarray) -> np.ndarray:
        """
        Prepare input data for model training/prediction.
        
        Args:
            X: Input data array (samples, features)
            
        Returns:
            Reshaped data array (samples, 1681, 1)
        """
        try:
            if len(X.shape) == 2:
                # Reshape from (samples, 1681) to (samples, 1681, 1)
                X_reshaped = X.reshape(-1, 1681, 1)
            elif len(X.shape) == 3 and X.shape[2] == 1:
                # Already in correct shape
                X_reshaped = X
            else:
                raise ValueError(f"Unexpected input shape: {X.shape}")
            
            if not self.validate_input_shape(X_reshaped):
                raise ValueError("Input validation failed")
            
            logger.info(f"Input data prepared: {X_reshaped.shape}")
            return X_reshaped
            
        except Exception as e:
            logger.error(f"Error preparing input data: {str(e)}")
            raise
    
    def create_callbacks(self, model_checkpoint_path: Optional[str] = None,
                        early_stopping_patience: int = 10) -> List[tf.keras.callbacks.Callback]:
        """
        Create training callbacks for model checkpointing and early stopping.
        
        Args:
            model_checkpoint_path: Path to save best model weights
            early_stopping_patience: Number of epochs to wait before early stopping
            
        Returns:
            List of Keras callbacks
        """
        callbacks_list = []
        
        # Early stopping callback
        early_stopping = callbacks.EarlyStopping(
            monitor='val_accuracy',
            patience=early_stopping_patience,
            restore_best_weights=True,
            verbose=1
        )
        callbacks_list.append(early_stopping)
        
        # Model checkpoint callback
        if model_checkpoint_path:
            checkpoint = callbacks.ModelCheckpoint(
                filepath=model_checkpoint_path,
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=False,
                verbose=1
            )
            callbacks_list.append(checkpoint)
        
        # Reduce learning rate on plateau
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        )
        callbacks_list.append(reduce_lr)
        
        return callbacks_list
    
    def train(self, train_generator, validation_generator, train_steps, val_steps,
              epochs: int = 100, batch_size: int = 32,
              model_checkpoint_path: Optional[str] = None) -> Dict:
        """
        Train model with k-fold cross validation (k=5, random_state=32).
        
        Args:
            X_train: Training input data
            y_train: Training labels (one-hot encoded)
            X_test: Test input data  
            y_test: Test labels (one-hot encoded)
            epochs: Number of training epochs
            batch_size: Training batch size
            validation_split: Fraction of training data to use for validation
            model_checkpoint_path: Path to save best model
            
        Returns:
            Dictionary containing training history and metrics
        """
        try:
            if not self.is_compiled:
                self.compile_model()
            
            logger.info(f"Starting model training...")
            
            # Create callbacks
            callbacks_list = self.create_callbacks(model_checkpoint_path)
            
            # Train the model
            history = self.model.fit(
                train_generator,
                steps_per_epoch=train_steps,
                epochs=epochs,
                validation_data=validation_generator,
                validation_steps=val_steps,
                callbacks=callbacks_list,
                verbose=1
            )
            
            # Evaluate on test set
            test_loss, test_accuracy, test_precision, test_recall = self.model.evaluate(
                validation_generator, steps=val_steps, verbose=0
            )
            
            # Store training history
            self.training_history = {
                'history': history.history,
                'test_accuracy': test_accuracy,
                'test_loss': test_loss,
                'test_precision': test_precision,
                'test_recall': test_recall,
                'epochs_trained': len(history.history['loss'])
            }
            
            logger.info(f"Training completed successfully")
            logger.info(f"Test accuracy: {test_accuracy:.4f}")
            logger.info(f"Test precision: {test_precision:.4f}")
            logger.info(f"Test recall: {test_recall:.4f}")
            
            return self.training_history
            
        except Exception as e:
            logger.error(f"Error during model training: {str(e)}")
            raise
    
    def train_with_kfold(self, X: np.ndarray, y: np.ndarray, 
                        k_splits: int = 5, random_state: int = 32,
                        epochs: int = 100, batch_size: int = 32) -> Dict:
        """
        Train model with k-fold cross validation matching notebook methodology.
        
        Args:
            X: Input data
            y: Labels (one-hot encoded)
            k_splits: Number of folds (default: 5)
            random_state: Random seed (default: 32)
            epochs: Number of training epochs
            batch_size: Training batch size
            
        Returns:
            Dictionary containing cross-validation results
        """
        try:
            if not self.is_compiled:
                self.compile_model()
            
            # Prepare input data
            X_prepared = self.prepare_input_data(X)
            
            # Initialize k-fold cross validation with exact parameters from notebook
            kfold = KFold(n_splits=k_splits, random_state=random_state, shuffle=True)
            
            cv_scores = []
            fold_histories = []
            
            logger.info(f"Starting {k_splits}-fold cross validation...")
            
            for fold, (train_idx, val_idx) in enumerate(kfold.split(X_prepared)):
                logger.info(f"Training fold {fold + 1}/{k_splits}")
                
                # Split data for this fold
                X_fold_train, X_fold_val = X_prepared[train_idx], X_prepared[val_idx]
                y_fold_train, y_fold_val = y[train_idx], y[val_idx]
                
                # Reset model weights for each fold
                self.model = self.create_model()
                self.compile_model()
                
                # Train on this fold
                history = self.model.fit(
                    X_fold_train, y_fold_train,
                    epochs=epochs,
                    batch_size=batch_size,
                    validation_data=(X_fold_val, y_fold_val),
                    verbose=0
                )
                
                # Evaluate on validation set
                val_loss, val_accuracy, val_precision, val_recall = self.model.evaluate(
                    X_fold_val, y_fold_val, verbose=0
                )
                
                cv_scores.append(val_accuracy)
                fold_histories.append(history.history)
                
                logger.info(f"Fold {fold + 1} validation accuracy: {val_accuracy:.4f}")
            
            # Calculate cross-validation statistics
            cv_mean = np.mean(cv_scores)
            cv_std = np.std(cv_scores)
            
            cv_results = {
                'cv_scores': cv_scores,
                'cv_mean': cv_mean,
                'cv_std': cv_std,
                'fold_histories': fold_histories,
                'k_splits': k_splits,
                'random_state': random_state
            }
            
            logger.info(f"Cross-validation completed")
            logger.info(f"CV Mean Accuracy: {cv_mean:.4f} (+/- {cv_std * 2:.4f})")
            
            return cv_results
            
        except Exception as e:
            logger.error(f"Error during k-fold cross validation: {str(e)}")
            raise
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions on input data.
        
        Args:
            X: Input data array
            
        Returns:
            Prediction probabilities array
        """
        try:
            if self.model is None:
                raise ValueError("Model not created")
            
            X_prepared = self.prepare_input_data(X)
            predictions = self.model.predict(X_prepared, verbose=0)
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            raise
    
    def predict_classes(self, X: np.ndarray) -> np.ndarray:
        """
        Predict class labels for input data.
        
        Args:
            X: Input data array
            
        Returns:
            Predicted class indices
        """
        predictions = self.predict(X)
        return np.argmax(predictions, axis=1)
    
    def get_prediction_confidence(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """
        Get prediction confidence scores for all fault categories.
        
        Args:
            X: Input data array
            
        Returns:
            Dictionary with fault categories and confidence scores
        """
        try:
            predictions = self.predict(X)
            
            confidence_dict = {}
            for i, category in enumerate(self.fault_categories):
                confidence_dict[category] = predictions[:, i]
            
            return confidence_dict
            
        except Exception as e:
            logger.error(f"Error getting prediction confidence: {str(e)}")
            raise
    
    def save_model(self, filepath: str) -> None:
        """
        Save the trained model to disk.
        
        Args:
            filepath: Path to save the model
        """
        try:
            if self.model is None:
                raise ValueError("No model to save")
            
            self.model.save(filepath)
            logger.info(f"Model saved successfully to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise
    
    def load_model(self, filepath: str) -> None:
        """
        Load a trained model from disk.
        
        Args:
            filepath: Path to the saved model
        """
        try:
            self.model = tf.keras.models.load_model(filepath)
            self.is_compiled = True
            logger.info(f"Model loaded successfully from {filepath}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def evaluate(self, test_generator, test_steps) -> Dict:
        """
        Generate accuracy metrics and confusion matrices.
        
        Args:
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            
        Returns:
            Dictionary containing comprehensive evaluation metrics
        """
        try:
            if self.model is None:
                raise ValueError("Model not created")
            
            # Get predictions
            y_pred_probs = self.model.predict(test_generator, steps=test_steps, verbose=0)
            y_pred_classes = np.argmax(y_pred_probs, axis=1)
            y_true_classes = []
            for _, labels in test_generator:
                y_true_classes.extend(np.argmax(labels, axis=1))
                if len(y_true_classes) >= len(y_pred_classes):
                    break
            y_true_classes = y_true_classes[:len(y_pred_classes)]

            # Calculate basic metrics
            test_loss, test_accuracy, test_precision, test_recall = self.model.evaluate(
                test_generator, steps=test_steps, verbose=0
            )
            
            # Generate confusion matrix with labels parameter to ensure 8x8 matrix
            cm = confusion_matrix(y_true_classes, y_pred_classes, labels=list(range(self.num_classes)))
            
            # Generate classification report with labels parameter to handle missing classes
            class_report = classification_report(
                y_true_classes, y_pred_classes,
                labels=list(range(self.num_classes)),
                target_names=self.fault_categories,
                output_dict=True,
                zero_division=0
            )
            
            # Calculate per-class metrics (handle division by zero)
            class_totals = cm.sum(axis=1)
            per_class_accuracy = np.divide(cm.diagonal(), class_totals, 
                                         out=np.zeros_like(cm.diagonal(), dtype=float), 
                                         where=class_totals!=0)
            
            evaluation_results = {
                'test_accuracy': test_accuracy,
                'test_loss': test_loss,
                'test_precision': test_precision,
                'test_recall': test_recall,
                'confusion_matrix': cm,
                'classification_report': class_report,
                'per_class_accuracy': per_class_accuracy,
                'predictions': y_pred_probs,
                'predicted_classes': y_pred_classes,
                'true_classes': y_true_classes
            }
            
            logger.info(f"Model evaluation completed")
            logger.info(f"Test Accuracy: {test_accuracy:.4f}")
            logger.info(f"Test Precision: {test_precision:.4f}")
            logger.info(f"Test Recall: {test_recall:.4f}")
            
            return evaluation_results
            
        except Exception as e:
            logger.error(f"Error during model evaluation: {str(e)}")
            raise
    
    def plot_confusion_matrix(self, confusion_matrix: np.ndarray, 
                             save_path: Optional[str] = None,
                             title: str = "Confusion Matrix") -> None:
        """
        Plot and optionally save confusion matrix visualization.
        
        Args:
            confusion_matrix: Confusion matrix array
            save_path: Path to save the plot (optional)
            title: Plot title
        """
        try:
            plt.figure(figsize=(10, 8))
            
            # Create heatmap
            sns.heatmap(
                confusion_matrix,
                annot=True,
                fmt='d',
                cmap='Blues',
                xticklabels=self.fault_categories,
                yticklabels=self.fault_categories,
                cbar_kws={'label': 'Count'}
            )
            
            plt.title(title, fontsize=16, fontweight='bold')
            plt.xlabel('Predicted Label', fontsize=12)
            plt.ylabel('True Label', fontsize=12)
            plt.xticks(rotation=45, ha='right')
            plt.yticks(rotation=0)
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Confusion matrix saved to {save_path}")
            
            plt.show()
            
        except Exception as e:
            logger.error(f"Error plotting confusion matrix: {str(e)}")
            raise
    
    def plot_training_history(self, history: Dict, save_path: Optional[str] = None) -> None:
        """
        Plot training history including loss and accuracy curves.
        
        Args:
            history: Training history dictionary
            save_path: Path to save the plot (optional)
        """
        try:
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            
            # Plot training & validation accuracy
            axes[0, 0].plot(history['accuracy'], label='Training Accuracy')
            if 'val_accuracy' in history:
                axes[0, 0].plot(history['val_accuracy'], label='Validation Accuracy')
            axes[0, 0].set_title('Model Accuracy')
            axes[0, 0].set_xlabel('Epoch')
            axes[0, 0].set_ylabel('Accuracy')
            axes[0, 0].legend()
            axes[0, 0].grid(True)
            
            # Plot training & validation loss
            axes[0, 1].plot(history['loss'], label='Training Loss')
            if 'val_loss' in history:
                axes[0, 1].plot(history['val_loss'], label='Validation Loss')
            axes[0, 1].set_title('Model Loss')
            axes[0, 1].set_xlabel('Epoch')
            axes[0, 1].set_ylabel('Loss')
            axes[0, 1].legend()
            axes[0, 1].grid(True)
            
            # Plot training & validation precision
            if 'precision' in history:
                axes[1, 0].plot(history['precision'], label='Training Precision')
                if 'val_precision' in history:
                    axes[1, 0].plot(history['val_precision'], label='Validation Precision')
                axes[1, 0].set_title('Model Precision')
                axes[1, 0].set_xlabel('Epoch')
                axes[1, 0].set_ylabel('Precision')
                axes[1, 0].legend()
                axes[1, 0].grid(True)
            
            # Plot training & validation recall
            if 'recall' in history:
                axes[1, 1].plot(history['recall'], label='Training Recall')
                if 'val_recall' in history:
                    axes[1, 1].plot(history['val_recall'], label='Validation Recall')
                axes[1, 1].set_title('Model Recall')
                axes[1, 1].set_xlabel('Epoch')
                axes[1, 1].set_ylabel('Recall')
                axes[1, 1].legend()
                axes[1, 1].grid(True)
            
            plt.tight_layout()
            
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Training history plot saved to {save_path}")
            
            plt.show()
            
        except Exception as e:
            logger.error(f"Error plotting training history: {str(e)}")
            raise
    
    def plot_cross_validation_scores(self, cv_scores: List[float], 
                                   save_path: Optional[str] = None) -> None:
        """
        Plot cross-validation scores visualization.
        
        Args:
            cv_scores: List of cross-validation scores
            save_path: Path to save the plot (optional)
        """
        try:
            plt.figure(figsize=(10, 6))
            
            # Bar plot of CV scores
            folds = [f'Fold {i+1}' for i in range(len(cv_scores))]
            bars = plt.bar(folds, cv_scores, alpha=0.7, color='skyblue', edgecolor='navy')
            
            # Add mean line
            mean_score = np.mean(cv_scores)
            plt.axhline(y=mean_score, color='red', linestyle='--',
                       label=f'Mean: {mean_score:.4f}')
            
            # Add value labels on bars
            for bar, score in zip(bars, cv_scores):
                plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.001,
                        f'{score:.4f}', ha='center', va='bottom')
            
            plt.title('Cross-Validation Scores', fontsize=16, fontweight='bold')
            plt.xlabel('Fold')
            plt.ylabel('Accuracy')
            plt.legend()
            plt.grid(True, alpha=0.3)
            plt.ylim(0, 1)
            
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"Cross-validation plot saved to {save_path}")
            
            plt.show()
            
        except Exception as e:
            logger.error(f"Error plotting cross-validation scores: {str(e)}")
            raise
    
    def generate_evaluation_report(self, X_test: np.ndarray, y_test: np.ndarray,
                                 save_dir: Optional[str] = None) -> Dict:
        """
        Generate comprehensive evaluation report with visualizations.
        
        Args:
            X_test: Test input data
            y_test: Test labels (one-hot encoded)
            save_dir: Directory to save plots and reports
            
        Returns:
            Dictionary containing all evaluation metrics and paths to saved files
        """
        try:
            # Perform evaluation
            eval_results = self.evaluate(X_test, y_test)
            
            report = {
                'evaluation_metrics': eval_results,
                'saved_files': []
            }
            
            if save_dir:
                import os
                os.makedirs(save_dir, exist_ok=True)
                
                # Save confusion matrix plot
                cm_path = os.path.join(save_dir, 'confusion_matrix.png')
                self.plot_confusion_matrix(eval_results['confusion_matrix'], cm_path)
                report['saved_files'].append(cm_path)
                
                # Save training history if available
                if hasattr(self, 'training_history') and 'history' in self.training_history:
                    history_path = os.path.join(save_dir, 'training_history.png')
                    self.plot_training_history(self.training_history['history'], history_path)
                    report['saved_files'].append(history_path)
                
                # Save classification report as text
                report_path = os.path.join(save_dir, 'classification_report.txt')
                with open(report_path, 'w') as f:
                    f.write("Motor Fault Detection - Classification Report\n")
                    f.write("=" * 50 + "\n\n")
                    f.write(f"Test Accuracy: {eval_results['test_accuracy']:.4f}\n")
                    f.write(f"Test Precision: {eval_results['test_precision']:.4f}\n")
                    f.write(f"Test Recall: {eval_results['test_recall']:.4f}\n")
                    f.write(f"Test Loss: {eval_results['test_loss']:.4f}\n\n")
                    
                    f.write("Per-Class Accuracy:\n")
                    for i, (category, acc) in enumerate(zip(self.fault_categories, eval_results['per_class_accuracy'])):
                        f.write(f"  {category}: {acc:.4f}\n")
                    
                    f.write(f"\nDetailed Classification Report:\n")
                    from sklearn.metrics import classification_report
                    f.write(classification_report(
                        eval_results['true_classes'], 
                        eval_results['predicted_classes'],
                        target_names=self.fault_categories
                    ))
                
                report['saved_files'].append(report_path)
                logger.info(f"Evaluation report saved to {save_dir}")
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating evaluation report: {str(e)}")
            raise
    
    def validate_model_architecture(self) -> Dict[str, bool]:
        """
        Validate that the model architecture matches the specifications.
        
        Returns:
            Dictionary with validation results for each architectural component
        """
        validation_results = {
            'input_shape_correct': False,
            'conv1d_layers_correct': False,
            'maxpool_layers_correct': False,
            'dense_layers_correct': False,
            'output_shape_correct': False,
            'compilation_correct': False
        }
        
        try:
            if self.model is None:
                return validation_results
            
            # Check input shape
            if self.model.input_shape == (None, 1681, 1):
                validation_results['input_shape_correct'] = True
            
            # Check layer architecture
            conv1d_filters = []
            maxpool_count = 0
            dense_units = []
            
            for layer in self.model.layers:
                if isinstance(layer, layers.Conv1D):
                    conv1d_filters.append(layer.filters)
                elif isinstance(layer, layers.MaxPooling1D):
                    maxpool_count += 1
                elif isinstance(layer, layers.Dense):
                    dense_units.append(layer.units)
            
            # Validate Conv1D layers (should have filters [16, 32, 64, 128])
            if conv1d_filters == [16, 32, 64, 128]:
                validation_results['conv1d_layers_correct'] = True
            
            # Validate MaxPooling layers (should have 4)
            if maxpool_count == 4:
                validation_results['maxpool_layers_correct'] = True
            
            # Validate Dense layers (should have units [100, 50, 8])
            if dense_units == [100, 50, 8]:
                validation_results['dense_layers_correct'] = True
            
            # Check output shape
            if self.model.output_shape == (None, 8):
                validation_results['output_shape_correct'] = True
            
            # Check compilation
            if self.is_compiled:
                validation_results['compilation_correct'] = True
            
            # Log validation results
            all_valid = all(validation_results.values())
            if all_valid:
                logger.info("Model architecture validation: PASSED")
            else:
                logger.warning("Model architecture validation: FAILED")
                for check, result in validation_results.items():
                    if not result:
                        logger.warning(f"  {check}: FAILED")
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Error validating model architecture: {str(e)}")
            return validation_results
    
    def get_model_info(self) -> Dict:
        """
        Get comprehensive model information.
        
        Returns:
            Dictionary with model architecture and configuration details
        """
        info = {
            'input_shape': self.input_shape,
            'num_classes': self.num_classes,
            'fault_categories': self.fault_categories,
            'is_compiled': self.is_compiled,
            'total_params': 0,
            'trainable_params': 0,
            'architecture_validation': {}
        }
        
        if self.model is not None:
            info['total_params'] = self.model.count_params()
            info['trainable_params'] = sum([tf.keras.backend.count_params(w) for w in self.model.trainable_weights])
            info['model_summary'] = self.get_model_summary()
            info['architecture_validation'] = self.validate_model_architecture()
        
        return info
