"""
Unit tests for ModelTrainer class.

Tests for model training pipeline, evaluation, visualization, and model persistence/versioning functionality.
"""

import os
import json
import tempfile
import shutil
import unittest
from unittest.mock import Mock, patch, MagicMock
import numpy as np
import tensorflow as tf

# Add the src directory to the path for imports
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from backend.ml.src.model_trainer import ModelTrainer
    from backend.ml.src.data_processor import DataProcessor
    from backend.ml.src.cnn_model import CNN1D
except ImportError:
    # Fallback for direct execution
    from model_trainer import ModelTrainer
    from data_processor import DataProcessor
    from cnn_model import CNN1D


class TestModelTrainer(unittest.TestCase):
    """Test cases for ModelTrainer class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create temporary directories for testing
        self.temp_dir = tempfile.mkdtemp()
        self.data_dir = os.path.join(self.temp_dir, 'data')
        self.model_dir = os.path.join(self.temp_dir, 'models')
        
        # Create directory structure
        os.makedirs(os.path.join(self.data_dir, '1_Unloaded_Condition'))
        os.makedirs(os.path.join(self.data_dir, '2_Loaded_Condition'))
        os.makedirs(self.model_dir)
        
        # Create mock CSV files
        self._create_mock_csv_files()
        
        # Initialize ModelTrainer
        self.trainer = ModelTrainer(self.data_dir, self.model_dir)
        
        # Create mock data for testing
        self.mock_X = np.random.rand(100, 1681)
        self.mock_y = np.eye(8)[np.random.randint(0, 8, 100)]  # One-hot encoded labels
        
    def tearDown(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    def _create_mock_csv_files(self):
        """Create mock CSV files for testing."""
        import pandas as pd
        
        # Create sample data
        sample_data = pd.DataFrame({
            'Accelerometer 1 (m/s^2)': np.random.rand(2000),
            'Microphone (V)': np.random.rand(2000),
            'Accelerometer 2 (m/s^2)': np.random.rand(2000),
            'Accelerometer 3 (m/s^2)': np.random.rand(2000),
            'Temperature (Celsius)': np.random.rand(2000)
        })
        
        # Save files with different fault categories
        fault_categories = ['healthy', 'bowed_rotor', 'faulty_bearing', 'broken_rotor_bars']
        
        for category in fault_categories:
            # Unloaded condition
            file_path = os.path.join(self.data_dir, '1_Unloaded_Condition', f'{category}_unloaded.csv')
            sample_data.to_csv(file_path, index=False)
            
            # Loaded condition
            file_path = os.path.join(self.data_dir, '2_Loaded_Condition', f'{category}_loaded.csv')
            sample_data.to_csv(file_path, index=False)
    
    def test_initialization(self):
        """Test ModelTrainer initialization."""
        self.assertEqual(self.trainer.data_path, self.data_dir)
        self.assertEqual(self.trainer.model_save_dir, self.model_dir)
        self.assertIsInstance(self.trainer.data_processor, DataProcessor)
        self.assertIsInstance(self.trainer.cnn_model, CNN1D)
        self.assertEqual(self.trainer.train_test_split_ratio, 0.25)
        self.assertEqual(self.trainer.random_state, 101)
        self.assertEqual(self.trainer.kfold_splits, 5)
        self.assertEqual(self.trainer.kfold_random_state, 32)
    
    def test_validate_training_requirements(self):
        """Test training requirements validation."""
        # Should pass with mock data
        self.assertTrue(self.trainer.validate_training_requirements())
        
        # Should fail with non-existent path
        trainer_invalid = ModelTrainer('/non/existent/path', self.model_dir)
        self.assertFalse(trainer_invalid.validate_training_requirements())
    
    @patch('model_trainer.ModelTrainer.load_and_prepare_data')
    def test_create_stratified_train_test_split(self, mock_load_data):
        """Test stratified train-test split creation."""
        # Mock data
        X = np.random.rand(100, 1681)
        y = np.eye(8)[np.random.randint(0, 8, 100)]
        
        X_train, X_test, y_train, y_test = self.trainer.create_stratified_train_test_split(X, y)
        
        # Check split ratios
        expected_train_size = int(len(X) * 0.75)
        expected_test_size = len(X) - expected_train_size
        
        self.assertEqual(len(X_train), expected_train_size)
        self.assertEqual(len(X_test), expected_test_size)
        self.assertEqual(len(y_train), expected_train_size)
        self.assertEqual(len(y_test), expected_test_size)
    
    def test_generate_model_version(self):
        """Test model version generation."""
        version = self.trainer._generate_model_version()
        
        # Should start with 'v' and contain timestamp
        self.assertTrue(version.startswith('v'))
        self.assertIn('_', version)
        
        # Should be unique
        version2 = self.trainer._generate_model_version()
        self.assertNotEqual(version, version2)
    
    def test_save_model_with_metadata(self):
        """Test model saving with metadata."""
        # Create a simple mock model
        with patch.object(self.trainer.cnn_model, 'save_model') as mock_save:
            # Set up some mock training history
            self.trainer.training_history = {
                'test_accuracy': 0.95,
                'test_loss': 0.05,
                'test_precision': 0.94,
                'test_recall': 0.93,
                'epochs_trained': 50,
                'training_duration_seconds': 300
            }
            
            model_path = os.path.join(self.model_dir, 'test_model')
            saved_path = self.trainer.save_model_with_metadata(model_path)
            
            # Check that model was saved
            mock_save.assert_called_once()
            self.assertTrue(saved_path.endswith('.keras'))
            
            # Check that metadata file was created
            metadata_path = saved_path.replace('.keras', '_metadata.json')
            self.assertTrue(os.path.exists(metadata_path))
            
            # Check metadata content
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            self.assertIn('model_info', metadata)
            self.assertIn('training_info', metadata)
            self.assertIn('performance_metrics', metadata)
            self.assertIn('version_info', metadata)
            
            # Check performance metrics
            self.assertEqual(metadata['performance_metrics']['training']['test_accuracy'], 0.95)
            self.assertEqual(metadata['performance_metrics']['training']['epochs_trained'], 50)
    
    def test_load_model_with_metadata(self):
        """Test model loading with metadata."""
        # First save a model
        with patch.object(self.trainer.cnn_model, 'save_model'):
            self.trainer.training_history = {'test_accuracy': 0.90}
            model_path = os.path.join(self.model_dir, 'test_model')
            saved_path = self.trainer.save_model_with_metadata(model_path)
        
        # Now test loading
        with patch.object(self.trainer.cnn_model, 'load_model') as mock_load:
            success, metadata = self.trainer.load_model_with_metadata(saved_path)
            
            self.assertTrue(success)
            mock_load.assert_called_once_with(saved_path)
            self.assertIn('model_info', metadata)
            self.assertIn('performance_metrics', metadata)
    
    def test_model_registry_operations(self):
        """Test model registry operations."""
        # Save a model to create registry
        with patch.object(self.trainer.cnn_model, 'save_model'):
            self.trainer.training_history = {'test_accuracy': 0.90}
            model_path = os.path.join(self.model_dir, 'test_model_1')
            self.trainer.save_model_with_metadata(model_path)
        
        # Check registry was created
        registry = self.trainer.get_model_registry()
        self.assertIn('models', registry)
        self.assertEqual(len(registry['models']), 1)
        self.assertIsNotNone(registry['active_model'])
        
        # List available models
        models = self.trainer.list_available_models()
        self.assertEqual(len(models), 1)
        self.assertIn('version', models[0])
        self.assertIn('test_accuracy', models[0])
        
        # Save another model
        with patch.object(self.trainer.cnn_model, 'save_model'):
            self.trainer.training_history = {'test_accuracy': 0.95}
            model_path = os.path.join(self.model_dir, 'test_model_2')
            self.trainer.save_model_with_metadata(model_path)
        
        # Check registry has two models
        registry = self.trainer.get_model_registry()
        self.assertEqual(len(registry['models']), 2)
        
        # Test setting active model
        first_version = registry['models'][0]['model_version']
        success = self.trainer.set_active_model(first_version)
        self.assertTrue(success)
        
        # Verify active model changed
        updated_registry = self.trainer.get_model_registry()
        self.assertEqual(updated_registry['active_model'], first_version)
    
    def test_delete_model_version(self):
        """Test model version deletion."""
        # Save a model
        with patch.object(self.trainer.cnn_model, 'save_model'):
            self.trainer.training_history = {'test_accuracy': 0.90}
            model_path = os.path.join(self.model_dir, 'test_model')
            self.trainer.save_model_with_metadata(model_path)
        
        # Get the version
        registry = self.trainer.get_model_registry()
        version_to_delete = registry['models'][0]['model_version']
        
        # Delete the model
        success = self.trainer.delete_model_version(version_to_delete, delete_files=False)
        self.assertTrue(success)
        
        # Verify it's removed from registry
        updated_registry = self.trainer.get_model_registry()
        self.assertEqual(len(updated_registry['models']), 0)
        self.assertIsNone(updated_registry['active_model'])
    
    def test_resolve_model_version_to_path(self):
        """Test model version resolution to file path."""
        # Save a model
        with patch.object(self.trainer.cnn_model, 'save_model'):
            self.trainer.training_history = {'test_accuracy': 0.90}
            model_path = os.path.join(self.model_dir, 'test_model')
            saved_path = self.trainer.save_model_with_metadata(model_path)
        
        # Get the version
        registry = self.trainer.get_model_registry()
        version = registry['models'][0]['model_version']
        
        # Resolve version to path
        resolved_path = self.trainer._resolve_model_version_to_path(version)
        self.assertEqual(resolved_path, saved_path)
        
        # Test with non-existent version
        non_existent_path = self.trainer._resolve_model_version_to_path('v99999999_999999')
        self.assertIsNone(non_existent_path)
    
    @patch('matplotlib.pyplot.show')
    @patch('matplotlib.pyplot.savefig')
    def test_generate_confusion_matrices(self, mock_savefig, mock_show):
        """Test confusion matrix generation."""
        # Mock model predictions
        with patch.object(self.trainer.cnn_model, 'predict') as mock_predict:
            # Mock predictions for train and test sets
            mock_predict.side_effect = [
                np.random.rand(80, 8),  # Train predictions
                np.random.rand(20, 8)   # Test predictions
            ]
            
            X_train = np.random.rand(80, 1681)
            y_train = np.eye(8)[np.random.randint(0, 8, 80)]
            X_test = np.random.rand(20, 1681)
            y_test = np.eye(8)[np.random.randint(0, 8, 20)]
            
            result = self.trainer.generate_confusion_matrices(X_train, y_train, X_test, y_test)
            
            # Check that confusion matrices were generated
            self.assertIn('train_confusion_matrix', result)
            self.assertIn('test_confusion_matrix', result)
            self.assertEqual(result['train_confusion_matrix'].shape, (8, 8))
            self.assertEqual(result['test_confusion_matrix'].shape, (8, 8))
    
    @patch('matplotlib.pyplot.show')
    def test_create_training_history_plots(self, mock_show):
        """Test training history plot creation."""
        # Set up mock training history
        self.trainer.training_history = {
            'history': {
                'accuracy': [0.7, 0.8, 0.9],
                'val_accuracy': [0.65, 0.75, 0.85],
                'loss': [0.5, 0.3, 0.1],
                'val_loss': [0.6, 0.4, 0.2],
                'precision': [0.7, 0.8, 0.9],
                'val_precision': [0.65, 0.75, 0.85],
                'recall': [0.7, 0.8, 0.9],
                'val_recall': [0.65, 0.75, 0.85]
            }
        }
        
        # Should not raise an exception
        self.trainer.create_training_history_plots()
        mock_show.assert_called_once()
    
    @patch('matplotlib.pyplot.show')
    def test_create_cross_validation_visualization(self, mock_show):
        """Test cross-validation visualization creation."""
        # Set up mock CV results
        self.trainer.cross_validation_results = {
            'cv_scores': [0.85, 0.87, 0.89, 0.86, 0.88],
            'cv_mean': 0.87,
            'cv_std': 0.015
        }
        
        # Should not raise an exception
        self.trainer.create_cross_validation_visualization()
        mock_show.assert_called_once()
    
    def test_calculate_precision_recall_f1_scores(self):
        """Test precision, recall, F1-score calculation."""
        # Mock model predictions
        with patch.object(self.trainer.cnn_model, 'predict') as mock_predict:
            # Create deterministic predictions for testing
            mock_predictions = np.zeros((20, 8))
            mock_predictions[np.arange(20), np.random.randint(0, 8, 20)] = 1.0
            mock_predict.return_value = mock_predictions
            
            X_test = np.random.rand(20, 1681)
            y_test = np.eye(8)[np.random.randint(0, 8, 20)]
            
            result = self.trainer.calculate_precision_recall_f1_scores(X_test, y_test)
            
            # Check result structure
            self.assertIn('category_metrics', result)
            self.assertIn('macro_average', result)
            self.assertIn('weighted_average', result)
            self.assertIn('overall_accuracy', result)
            
            # Check that all fault categories are included
            for category in self.trainer.data_processor.fault_categories:
                self.assertIn(category, result['category_metrics'])
                self.assertIn('precision', result['category_metrics'][category])
                self.assertIn('recall', result['category_metrics'][category])
                self.assertIn('f1_score', result['category_metrics'][category])
    
    def test_implement_model_performance_comparison(self):
        """Test model performance comparison implementation."""
        # Set up mock evaluation metrics
        self.trainer.evaluation_metrics = {
            'test_accuracy': 0.90,
            'test_precision': 0.89,
            'test_recall': 0.88,
            'test_loss': 0.15
        }
        
        # Set up mock CV results
        self.trainer.cross_validation_results = {
            'cv_mean': 0.87,
            'cv_std': 0.02,
            'cv_scores': [0.85, 0.87, 0.89, 0.86, 0.88]
        }
        
        # Test without baseline metrics
        result = self.trainer.implement_model_performance_comparison()
        
        self.assertIn('current_model_metrics', result)
        self.assertIn('performance_analysis', result)
        self.assertIn('cross_validation_metrics', result)
        
        # Check requirements validation
        self.assertIn('requirements_validation', result['performance_analysis'])
        self.assertTrue(result['performance_analysis']['requirements_validation']['meets_accuracy_requirement'])
        
        # Test with baseline metrics
        baseline_metrics = {
            'accuracy': 0.80,
            'precision': 0.79,
            'recall': 0.78,
            'loss': 0.25
        }
        
        result_with_baseline = self.trainer.implement_model_performance_comparison(baseline_metrics)
        
        self.assertIn('baseline_metrics', result_with_baseline)
        self.assertIn('improvements', result_with_baseline['performance_analysis'])
        
        # Check improvements calculation
        improvements = result_with_baseline['performance_analysis']['improvements']
        self.assertTrue(improvements['accuracy']['is_better'])
        self.assertGreater(improvements['accuracy']['absolute_improvement'], 0)


class TestModelTrainerIntegration(unittest.TestCase):
    """Integration tests for ModelTrainer with real components."""
    
    def setUp(self):
        """Set up integration test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.data_dir = os.path.join(self.temp_dir, 'data')
        self.model_dir = os.path.join(self.temp_dir, 'models')
        
        # Create directory structure
        os.makedirs(os.path.join(self.data_dir, '1_Unloaded_Condition'))
        os.makedirs(os.path.join(self.data_dir, '2_Loaded_Condition'))
        os.makedirs(self.model_dir)
        
        # Create minimal CSV files for integration testing
        self._create_minimal_csv_files()
    
    def tearDown(self):
        """Clean up integration test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    def _create_minimal_csv_files(self):
        """Create minimal CSV files for integration testing."""
        import pandas as pd
        
        # Create minimal data (just enough for sampling to work)
        sample_data = pd.DataFrame({
            'Accelerometer 1 (m/s^2)': np.random.rand(2000),
            'Microphone (V)': np.random.rand(2000),
            'Accelerometer 2 (m/s^2)': np.random.rand(2000),
            'Accelerometer 3 (m/s^2)': np.random.rand(2000),
            'Temperature (Celsius)': np.random.rand(2000)
        })
        
        # Save one file for healthy condition
        file_path = os.path.join(self.data_dir, '1_Unloaded_Condition', 'healthy_test.csv')
        sample_data.to_csv(file_path, index=False)
    
    @patch('model_trainer.ModelTrainer.perform_cross_validation')
    @patch('model_trainer.CNN1D.train')
    def test_complete_training_pipeline_integration(self, mock_train, mock_cv):
        """Test complete training pipeline integration."""
        # Mock the training methods to avoid actual training
        mock_train.return_value = {
            'test_accuracy': 0.90,
            'test_loss': 0.15,
            'test_precision': 0.89,
            'test_recall': 0.88,
            'epochs_trained': 10,
            'training_duration_seconds': 60
        }
        
        mock_cv.return_value = {
            'cv_mean': 0.87,
            'cv_std': 0.02,
            'cv_scores': [0.85, 0.87, 0.89, 0.86, 0.88]
        }
        
        trainer = ModelTrainer(self.data_dir, self.model_dir)
        
        # This should run without errors even with minimal data
        with patch.object(trainer.cnn_model, 'save_model'):
            with patch.object(trainer.cnn_model, 'evaluate') as mock_evaluate:
                mock_evaluate.return_value = {
                    'test_accuracy': 0.90,
                    'test_precision': 0.89,
                    'test_recall': 0.88,
                    'test_loss': 0.15,
                    'confusion_matrix': np.zeros((8, 8)),
                    'per_class_accuracy': np.zeros(8)
                }
                
                # Run pipeline with minimal epochs for testing
                result = trainer.run_complete_training_pipeline(
                    epochs=1, 
                    batch_size=16, 
                    perform_cv=False, 
                    save_model=False
                )
                
                # Check that pipeline completed
                self.assertIn('pipeline_info', result)
                self.assertIn('data_info', result)
                self.assertIn('training_results', result)
                self.assertIn('evaluation_results', result)


if __name__ == '__main__':
    # Set up logging to reduce noise during testing
    import logging
    logging.getLogger().setLevel(logging.WARNING)
    
    # Run tests
    unittest.main(verbosity=2)