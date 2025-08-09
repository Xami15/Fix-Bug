"""
Unit tests for CNN1D model architecture validation and training process.

Tests cover model creation, architecture validation, training methods,
evaluation metrics, and k-fold cross validation functionality.
"""

import unittest
import numpy as np
import tensorflow as tf
from unittest.mock import patch, MagicMock
import tempfile
import os
import sys

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from cnn_model import CNN1D


class TestCNN1D(unittest.TestCase):
    """Test cases for CNN1D model class."""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.cnn = CNN1D()
        
        # Create sample data for testing
        self.sample_size = 100
        self.X_sample = np.random.rand(self.sample_size, 1681, 1)
        self.y_sample = np.eye(8)[np.random.randint(0, 8, self.sample_size)]  # One-hot encoded
        
        # Smaller datasets for faster testing
        self.X_small = np.random.rand(20, 1681, 1)
        self.y_small = np.eye(8)[np.random.randint(0, 8, 20)]
    
    def test_model_initialization(self):
        """Test that CNN1D model initializes correctly."""
        self.assertIsNotNone(self.cnn.model)
        self.assertEqual(self.cnn.input_shape, (1681, 1))
        self.assertEqual(self.cnn.num_classes, 8)
        self.assertEqual(len(self.cnn.fault_categories), 8)
        self.assertFalse(self.cnn.is_compiled)
    
    def test_model_architecture(self):
        """Test that model architecture matches specifications."""
        model = self.cnn.model
        
        # Test input shape
        self.assertEqual(model.input_shape, (None, 1681, 1))
        
        # Test output shape
        self.assertEqual(model.output_shape, (None, 8))
        
        # Count layers by type
        conv1d_layers = [layer for layer in model.layers if isinstance(layer, tf.keras.layers.Conv1D)]
        maxpool_layers = [layer for layer in model.layers if isinstance(layer, tf.keras.layers.MaxPooling1D)]
        dense_layers = [layer for layer in model.layers if isinstance(layer, tf.keras.layers.Dense)]
        
        # Verify layer counts
        self.assertEqual(len(conv1d_layers), 4)  # 4 Conv1D layers
        self.assertEqual(len(maxpool_layers), 4)  # 4 MaxPooling1D layers
        self.assertEqual(len(dense_layers), 3)  # 3 Dense layers (100, 50, 8)
        
        # Test Conv1D layer configurations
        expected_filters = [16, 32, 64, 128]
        for i, layer in enumerate(conv1d_layers):
            self.assertEqual(layer.filters, expected_filters[i])
            self.assertEqual(layer.kernel_size, (3,))
            self.assertEqual(layer.strides, (2,))
            self.assertEqual(layer.activation.__name__, 'relu')
        
        # Test MaxPooling1D layer configurations
        for layer in maxpool_layers:
            self.assertEqual(layer.pool_size, (2,))
        
        # Test Dense layer configurations
        expected_units = [100, 50, 8]
        for i, layer in enumerate(dense_layers):
            self.assertEqual(layer.units, expected_units[i])
            if i < 2:  # First two dense layers use ReLU
                self.assertEqual(layer.activation.__name__, 'relu')
            else:  # Output layer uses softmax
                self.assertEqual(layer.activation.__name__, 'softmax')
    
    def test_model_compilation(self):
        """Test model compilation with correct optimizer and loss."""
        self.cnn.compile_model()
        
        self.assertTrue(self.cnn.is_compiled)
        self.assertIsInstance(self.cnn.model.optimizer, tf.keras.optimizers.Adam)
        self.assertEqual(self.cnn.model.loss, 'categorical_crossentropy')
        
        # Test custom learning rate
        self.cnn.compile_model(learning_rate=0.01)
        self.assertAlmostEqual(self.cnn.model.optimizer.learning_rate.numpy(), 0.01, places=4)
    
    def test_input_validation(self):
        """Test input data validation."""
        # Valid input
        valid_input = np.random.rand(10, 1681, 1)
        self.assertTrue(self.cnn.validate_input_shape(valid_input))
        
        # Invalid shapes
        invalid_2d = np.random.rand(10, 1681)
        self.assertFalse(self.cnn.validate_input_shape(invalid_2d))
        
        invalid_wrong_size = np.random.rand(10, 1000, 1)
        self.assertFalse(self.cnn.validate_input_shape(invalid_wrong_size))
        
        invalid_4d = np.random.rand(10, 1681, 1, 1)
        self.assertFalse(self.cnn.validate_input_shape(invalid_4d))
    
    def test_input_data_preparation(self):
        """Test input data preparation and reshaping."""
        # Test 2D input reshaping
        input_2d = np.random.rand(10, 1681)
        prepared = self.cnn.prepare_input_data(input_2d)
        self.assertEqual(prepared.shape, (10, 1681, 1))
        
        # Test 3D input (already correct shape)
        input_3d = np.random.rand(10, 1681, 1)
        prepared = self.cnn.prepare_input_data(input_3d)
        self.assertEqual(prepared.shape, (10, 1681, 1))
        
        # Test invalid input
        with self.assertRaises(ValueError):
            invalid_input = np.random.rand(10, 1000)
            self.cnn.prepare_input_data(invalid_input)
    
    def test_callbacks_creation(self):
        """Test creation of training callbacks."""
        callbacks = self.cnn.create_callbacks()
        
        # Should have at least early stopping and reduce LR callbacks
        self.assertGreaterEqual(len(callbacks), 2)
        
        # Test with checkpoint path
        with tempfile.NamedTemporaryFile(suffix='.h5', delete=False) as tmp:
            checkpoint_path = tmp.name
        
        callbacks_with_checkpoint = self.cnn.create_callbacks(checkpoint_path)
        self.assertGreater(len(callbacks_with_checkpoint), len(callbacks))
        
        # Clean up
        if os.path.exists(checkpoint_path):
            os.unlink(checkpoint_path)
    
    def test_prediction_methods(self):
        """Test prediction functionality."""
        self.cnn.compile_model()
        
        # Test predict method
        predictions = self.cnn.predict(self.X_small)
        self.assertEqual(predictions.shape, (20, 8))
        
        # Test that predictions sum to 1 (softmax output)
        np.testing.assert_array_almost_equal(predictions.sum(axis=1), np.ones(20), decimal=5)
        
        # Test predict_classes method
        predicted_classes = self.cnn.predict_classes(self.X_small)
        self.assertEqual(predicted_classes.shape, (20,))
        self.assertTrue(all(0 <= cls < 8 for cls in predicted_classes))
        
        # Test get_prediction_confidence method
        confidence = self.cnn.get_prediction_confidence(self.X_small)
        self.assertEqual(len(confidence), 8)  # 8 fault categories
        for category in self.cnn.fault_categories:
            self.assertIn(category, confidence)
            self.assertEqual(confidence[category].shape, (20,))
    
    @patch('matplotlib.pyplot.show')
    def test_evaluation_method(self, mock_show):
        """Test model evaluation with metrics generation."""
        self.cnn.compile_model()
        
        # Train briefly to have a model with some weights
        self.cnn.model.fit(self.X_small, self.y_small, epochs=1, verbose=0)
        
        # Test evaluation
        eval_results = self.cnn.evaluate(self.X_small, self.y_small)
        
        # Check that all expected keys are present
        expected_keys = [
            'test_accuracy', 'test_loss', 'test_precision', 'test_recall',
            'confusion_matrix', 'classification_report', 'per_class_accuracy',
            'predictions', 'predicted_classes', 'true_classes'
        ]
        
        for key in expected_keys:
            self.assertIn(key, eval_results)
        
        # Check shapes and types
        self.assertIsInstance(eval_results['test_accuracy'], (float, np.float32, np.float64))
        self.assertEqual(eval_results['confusion_matrix'].shape, (8, 8))
        self.assertEqual(eval_results['predictions'].shape, (20, 8))
        self.assertEqual(len(eval_results['predicted_classes']), 20)
        self.assertEqual(len(eval_results['true_classes']), 20)
    
    def test_training_method(self):
        """Test basic training functionality."""
        # Split data for training
        split_idx = len(self.X_small) // 2
        X_train, X_test = self.X_small[:split_idx], self.X_small[split_idx:]
        y_train, y_test = self.y_small[:split_idx], self.y_small[split_idx:]
        
        # Test training with minimal epochs
        training_results = self.cnn.train(
            X_train, y_train, X_test, y_test,
            epochs=2, batch_size=5, validation_split=0.2
        )
        
        # Check training results structure
        expected_keys = [
            'history', 'test_accuracy', 'test_loss', 
            'test_precision', 'test_recall', 'epochs_trained'
        ]
        
        for key in expected_keys:
            self.assertIn(key, training_results)
        
        # Check that model was actually trained
        self.assertEqual(training_results['epochs_trained'], 2)
        self.assertIsInstance(training_results['test_accuracy'], (float, np.float32, np.float64))
    
    def test_kfold_cross_validation(self):
        """Test k-fold cross validation with exact parameters."""
        # Use very small dataset and minimal epochs for fast testing
        X_tiny = self.X_small[:15]  # 15 samples for 3-fold CV (5 samples per fold)
        y_tiny = self.y_small[:15]
        
        # Test k-fold with k=3 for faster testing, but verify parameters
        cv_results = self.cnn.train_with_kfold(
            X_tiny, y_tiny, 
            k_splits=3, random_state=32, 
            epochs=1, batch_size=2
        )
        
        # Check CV results structure
        expected_keys = [
            'cv_scores', 'cv_mean', 'cv_std', 'fold_histories',
            'k_splits', 'random_state'
        ]
        
        for key in expected_keys:
            self.assertIn(key, cv_results)
        
        # Check parameters match
        self.assertEqual(cv_results['k_splits'], 3)
        self.assertEqual(cv_results['random_state'], 32)
        
        # Check CV scores
        self.assertEqual(len(cv_results['cv_scores']), 3)
        self.assertEqual(len(cv_results['fold_histories']), 3)
        
        # Check that mean and std are calculated correctly
        expected_mean = np.mean(cv_results['cv_scores'])
        expected_std = np.std(cv_results['cv_scores'])
        self.assertAlmostEqual(cv_results['cv_mean'], expected_mean, places=5)
        self.assertAlmostEqual(cv_results['cv_std'], expected_std, places=5)
    
    def test_kfold_with_exact_notebook_parameters(self):
        """Test k-fold cross validation with exact notebook parameters (k=5, random_state=32)."""
        # Use minimal data for testing but verify the exact parameters are used
        X_test = self.X_small[:25]  # 25 samples for 5-fold CV (5 samples per fold)
        y_test = self.y_small[:25]
        
        cv_results = self.cnn.train_with_kfold(
            X_test, y_test,
            k_splits=5, random_state=32,  # Exact notebook parameters
            epochs=1, batch_size=2
        )
        
        # Verify exact parameters are used
        self.assertEqual(cv_results['k_splits'], 5)
        self.assertEqual(cv_results['random_state'], 32)
        self.assertEqual(len(cv_results['cv_scores']), 5)
    
    def test_model_save_load(self):
        """Test model saving and loading functionality."""
        self.cnn.compile_model()
        
        # Train briefly to have meaningful weights
        self.cnn.model.fit(self.X_small, self.y_small, epochs=1, verbose=0)
        
        # Test saving
        with tempfile.NamedTemporaryFile(suffix='.h5', delete=False) as tmp:
            model_path = tmp.name
        
        self.cnn.save_model(model_path)
        self.assertTrue(os.path.exists(model_path))
        
        # Get predictions before loading
        predictions_before = self.cnn.predict(self.X_small[:5])
        
        # Create new CNN instance and load model
        new_cnn = CNN1D()
        new_cnn.load_model(model_path)
        
        # Get predictions after loading
        predictions_after = new_cnn.predict(self.X_small[:5])
        
        # Predictions should be identical
        np.testing.assert_array_almost_equal(predictions_before, predictions_after, decimal=5)
        
        # Clean up
        if os.path.exists(model_path):
            os.unlink(model_path)
    
    def test_model_summary(self):
        """Test model summary generation."""
        summary = self.cnn.get_model_summary()
        
        # Summary should contain key architecture information
        self.assertIn('conv1d', summary.lower())
        self.assertIn('maxpooling1d', summary.lower())
        self.assertIn('dense', summary.lower())
        self.assertIn('param', summary.lower())
    
    @patch('matplotlib.pyplot.show')
    def test_visualization_methods(self, mock_show):
        """Test visualization methods don't crash."""
        self.cnn.compile_model()
        
        # Train briefly to have data for visualization
        history = self.cnn.model.fit(self.X_small, self.y_small, epochs=2, verbose=0)
        
        # Test confusion matrix plotting
        cm = np.random.randint(0, 10, (8, 8))
        try:
            self.cnn.plot_confusion_matrix(cm)
        except Exception as e:
            self.fail(f"plot_confusion_matrix raised {e} unexpectedly")
        
        # Test training history plotting
        try:
            self.cnn.plot_training_history(history.history)
        except Exception as e:
            self.fail(f"plot_training_history raised {e} unexpectedly")
        
        # Test CV scores plotting
        cv_scores = [0.8, 0.85, 0.82, 0.87, 0.83]
        try:
            self.cnn.plot_cross_validation_scores(cv_scores)
        except Exception as e:
            self.fail(f"plot_cross_validation_scores raised {e} unexpectedly")
    
    @patch('matplotlib.pyplot.show')
    def test_evaluation_report_generation(self, mock_show):
        """Test comprehensive evaluation report generation."""
        self.cnn.compile_model()
        
        # Train briefly
        self.cnn.model.fit(self.X_small, self.y_small, epochs=1, verbose=0)
        
        # Test report generation without saving
        report = self.cnn.generate_evaluation_report(self.X_small, self.y_small)
        
        self.assertIn('evaluation_metrics', report)
        self.assertIn('saved_files', report)
        self.assertEqual(len(report['saved_files']), 0)  # No files saved
        
        # Test report generation with saving
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_with_files = self.cnn.generate_evaluation_report(
                self.X_small, self.y_small, save_dir=tmp_dir
            )
            
            self.assertGreater(len(report_with_files['saved_files']), 0)
            
            # Check that files were actually created
            for file_path in report_with_files['saved_files']:
                self.assertTrue(os.path.exists(file_path))
    
    def test_error_handling(self):
        """Test error handling in various scenarios."""
        # Test prediction without compiled model
        uncompiled_cnn = CNN1D()
        uncompiled_cnn.is_compiled = False
        
        # Should still work as predict doesn't require compilation
        try:
            predictions = uncompiled_cnn.predict(self.X_small[:5])
            self.assertEqual(predictions.shape, (5, 8))
        except Exception as e:
            self.fail(f"Prediction without compilation raised {e} unexpectedly")
        
        # Test evaluation without model
        empty_cnn = CNN1D()
        empty_cnn.model = None
        
        with self.assertRaises(ValueError):
            empty_cnn.evaluate(self.X_small, self.y_small)
        
        # Test save without model
        with self.assertRaises(ValueError):
            empty_cnn.save_model('dummy_path.h5')
        
        # Test load with invalid path
        with self.assertRaises(Exception):
            self.cnn.load_model('nonexistent_path.h5')


if __name__ == '__main__':
    # Set up logging to reduce TensorFlow verbosity during testing
    import logging
    logging.getLogger('tensorflow').setLevel(logging.ERROR)
    
    # Run tests
    unittest.main(verbosity=2)