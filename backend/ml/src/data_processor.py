"""
Data processing module for motor fault detection system.

This module implements the exact data preprocessing methodology from the CNN1D notebook,
including sampling, data preparation, and fault category mapping based on filename patterns.
"""

import os
import pandas as pd
import numpy as np
from typing import Tuple, List, Dict, Optional
from sklearn.model_selection import train_test_split
import logging

logger = logging.getLogger(__name__)


class DataProcessor:
    """
    Core data processor class for motor fault detection system.
    
    Handles loading CSV files from both loaded/unloaded directories,
    implements fault category mapping based on filename patterns,
    and provides the exact sampling methodology from the CNN1D notebook.
    """
    
    def __init__(self, data_path: str):
        """
        Initialize the DataProcessor.
        
        Args:
            data_path: Path to the directory containing CSV data files
        """
        self.data_path = data_path
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
        
        # Expected CSV columns (5 sensor channels)
        self.expected_columns = [
            'Accelerometer 1 (m/s^2)',
            'Microphone (V)', 
            'Accelerometer 2 (m/s^2)',
            'Accelerometer 3 (m/s^2)',
            'Temperature (Celsius)'
        ]
        
        # Directory structure
        self.unloaded_dir = os.path.join(data_path, '1_Unloaded_Condition')
        self.loaded_dir = os.path.join(data_path, '2_Loaded_Condition')
    
    def _extract_fault_category_from_filename(self, filename: str) -> Optional[str]:
        """
        Extract fault category from filename pattern.
        
        Args:
            filename: CSV filename to parse
            
        Returns:
            Fault category string or None if not recognized
        """
        filename_lower = filename.lower()
        
        # Map filename patterns to fault categories
        if 'healthy' in filename_lower:
            return 'healthy'
        elif 'bowed_rotor' in filename_lower:
            return 'bowed_rotor'
        elif 'faulty_bearing' in filename_lower:
            return 'faulty_bearing'
        elif 'broken_rotor_bars' in filename_lower:
            return 'broken_rotor_bars'
        elif 'rotor_misalignment' in filename_lower:
            return 'rotor_misalignment'
        elif 'rotor_unbalanced' in filename_lower:
            return 'rotor_unbalanced'
        elif 'stator_winding' in filename_lower:
            return 'stator_winding'
        elif 'voltage_unbalanced' in filename_lower:
            return 'voltage_unbalanced'
        else:
            logger.warning(f"Unknown fault category in filename: {filename}")
            return None
    
    def _load_csv_file(self, file_path: str) -> Optional[pd.DataFrame]:
        """
        Load a single CSV file with error handling.
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            DataFrame or None if loading failed
        """
        try:
            df = pd.read_csv(file_path)
            
            # Validate columns
            if list(df.columns) != self.expected_columns:
                logger.error(f"Invalid columns in {file_path}. Expected: {self.expected_columns}, Got: {list(df.columns)}")
                return None
                
            # Check for required number of sensor columns (5)
            if len(df.columns) != 5:
                logger.error(f"Expected 5 sensor columns in {file_path}, got {len(df.columns)}")
                return None
                
            return df
            
        except Exception as e:
            logger.error(f"Error loading CSV file {file_path}: {str(e)}")
            return None
    
    def load_dataset(self) -> Tuple[np.ndarray, np.ndarray]:
        """
        Load and combine all CSV files from both loaded and unloaded directories.
        
        Returns:
            Tuple of (data_list, labels) where:
            - data_list: List of numpy arrays, one per fault category
            - labels: Array of fault category indices
        """
        data_by_category = {category: [] for category in self.fault_categories}
        
        # Process both directories
        for directory in [self.unloaded_dir, self.loaded_dir]:
            if not os.path.exists(directory):
                logger.warning(f"Directory not found: {directory}")
                continue
                
            for filename in os.listdir(directory):
                if not filename.endswith('.csv'):
                    continue
                    
                file_path = os.path.join(directory, filename)
                fault_category = self._extract_fault_category_from_filename(filename)
                
                if fault_category is None:
                    continue
                    
                df = self._load_csv_file(file_path)
                if df is not None:
                    # Convert to numpy array and store
                    data_array = df.values
                    data_by_category[fault_category].append(data_array)
                    logger.info(f"Loaded {filename}: {data_array.shape} samples for category '{fault_category}'")
        
        # Combine data for each category
        data_list = []
        for category in self.fault_categories:
            if data_by_category[category]:
                # Concatenate all files for this category
                combined_data = np.vstack(data_by_category[category])
                data_list.append(combined_data)
                logger.info(f"Category '{category}': {combined_data.shape} total samples")
            else:
                logger.warning(f"No data found for category '{category}'")
                # Add empty array to maintain category order
                data_list.append(np.array([]).reshape(0, 5))
        
        return data_list, np.array(self.fault_categories)
    
    def sampling(self, data: np.ndarray, interval_length: int, samples_per_block: int) -> np.ndarray:
        """
        Exact sampling function from CNN1D notebook.
        
        Function to sample blocks of data from a given time series.
        
        Args:
            data: Time series data to be sampled (single column)
            interval_length: Length of each interval to be sampled (200)
            samples_per_block: Number of samples to be collected in each block (1681)
            
        Returns:
            SplitData: 2D array containing sampled blocks of data
        """
        # Calculate the number of blocks that can be sampled based on the interval length
        # This is the exact formula from the notebook
        no_of_blocks = (round(len(data) / interval_length) - round(samples_per_block / interval_length) - 1)
        
        if no_of_blocks <= 0:
            logger.warning(f"Insufficient data for sampling. Data length: {len(data)}, blocks: {no_of_blocks}")
            return np.array([]).reshape(0, samples_per_block)
        
        split_data = np.zeros([no_of_blocks, samples_per_block])
        
        # Sample blocks from the time series data - exact implementation from notebook
        for i in range(no_of_blocks):
            start_idx = i * interval_length
            end_idx = start_idx + samples_per_block
            if end_idx <= len(data):
                split_data[i, :] = data[start_idx:end_idx].T
            else:
                # If we can't fit the full block, we stop here
                split_data = split_data[:i]
                break
        
        return split_data
    
    def data_preparation(self, data_list: List[np.ndarray], interval_length: int = 200, 
                        samples_per_block: int = 1681) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare data for training a model with exact methodology from CNN1D notebook.
        
        Args:
            data_list: List of time series data for different machine states
            interval_length: Length of each interval to be sampled (200)
            samples_per_block: Number of samples to be collected in each block (1681)
            
        Returns:
            Tuple of:
            - X: 2D array containing the sampled data
            - LabelPositional: 2D array representing one-hot encoding of the classes (8 categories)
            - Label: 2D array representing the classes directly
        """
        X = None
        LabelPositional = None
        Label = None
        
        for count, data_array in enumerate(data_list):
            if len(data_array) == 0:
                logger.warning(f"Empty data array for category {count}, skipping")
                continue
            
            # Use first column (accelerometer 1) for sampling as per notebook methodology
            # Note: The notebook uses single-column data, we'll use the first accelerometer
            first_column = data_array[:, 0].reshape(-1, 1)
            split_data = self.sampling(first_column.flatten(), interval_length, samples_per_block)
            
            if len(split_data) == 0:
                logger.warning(f"No samples generated for category {count}")
                continue
            
            # Initialize label arrays - using 8 categories (not 10 as in original notebook)
            y = np.zeros([len(split_data), 8])  # 8 fault categories
            y[:, count] = 1
            y1 = np.zeros([len(split_data), 1])
            y1[:, 0] = count
            
            # Stack up and label the data
            if X is None:
                X = split_data
                LabelPositional = y
                Label = y1
            else:
                X = np.append(X, split_data, axis=0)
                LabelPositional = np.append(LabelPositional, y, axis=0)
                Label = np.append(Label, y1, axis=0)
            
            logger.info(f"Category {count} ({self.fault_categories[count]}): {len(split_data)} samples generated")
        
        if X is None:
            logger.error("No data was processed successfully")
            return np.array([]), np.array([]), np.array([])
        
        logger.info(f"Total samples generated: {len(X)}")
        return X, LabelPositional, Label
    
    def normalize_data(self, data: np.ndarray) -> np.ndarray:
        """
        Apply standardization to sensor readings.
        
        Args:
            data: Input data array
            
        Returns:
            Normalized data array
        """
        if len(data) == 0:
            return data
            
        # Standardization: (x - mean) / std
        mean = np.mean(data, axis=0)
        std = np.std(data, axis=0)
        
        # Avoid division by zero
        std = np.where(std == 0, 1, std)
        
        normalized_data = (data - mean) / std
        return normalized_data
    
    def validate_data_shape(self, data: np.ndarray, expected_shape: Tuple[int, ...]) -> bool:
        """
        Validate that data has the expected shape.
        
        Args:
            data: Data array to validate
            expected_shape: Expected shape tuple
            
        Returns:
            True if shape matches, False otherwise
        """
        if data.shape != expected_shape:
            logger.error(f"Data shape mismatch. Expected: {expected_shape}, Got: {data.shape}")
            return False
        return True
    
    def load_and_preprocess_dataset(self, interval_length: int = 200, 
                                   samples_per_block: int = 1681) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Complete data loading and preprocessing pipeline.
        
        Args:
            interval_length: Length of each interval to be sampled (200)
            samples_per_block: Number of samples to be collected in each block (1681)
            
        Returns:
            Tuple of (X, LabelPositional, Label) ready for training
        """
        try:
            # Load raw dataset
            data_list, category_names = self.load_dataset()
            
            if len(data_list) == 0:
                raise ValueError("No data loaded from dataset")
            
            # Prepare data with sampling and one-hot encoding
            X, LabelPositional, Label = self.data_preparation(data_list, interval_length, samples_per_block)
            
            if len(X) == 0:
                raise ValueError("No samples generated during data preparation")
            
            # Normalize the data
            X_normalized = self.normalize_data(X)
            
            logger.info(f"Dataset loaded successfully: {X_normalized.shape} samples")
            return X_normalized, LabelPositional, Label
            
        except Exception as e:
            logger.error(f"Error in data loading pipeline: {str(e)}")
            raise
    
    def create_train_test_split(self, X: np.ndarray, y: np.ndarray, 
                               test_size: float = 0.25, random_state: int = 101,
                               stratify: bool = True) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Create stratified train-test split.
        
        Args:
            X: Input features
            y: Target labels (one-hot encoded)
            test_size: Proportion of test set (default 0.25 for 75%/25% split)
            random_state: Random seed for reproducibility
            stratify: Whether to use stratified sampling
            
        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        try:
            if stratify:
                # Convert one-hot to class indices for stratification
                y_indices = np.argmax(y, axis=1)
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_size, random_state=random_state, 
                    stratify=y_indices
                )
            else:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_size, random_state=random_state
                )
            
            logger.info(f"Train-test split completed: Train={X_train.shape}, Test={X_test.shape}")
            return X_train, X_test, y_train, y_test
            
        except Exception as e:
            logger.error(f"Error in train-test split: {str(e)}")
            raise
    
    def validate_csv_structure(self, file_path: str) -> Dict[str, any]:
        """
        Validate CSV file structure and return metadata.
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            Dictionary with validation results and metadata
        """
        validation_result = {
            'valid': False,
            'error': None,
            'num_rows': 0,
            'num_columns': 0,
            'columns': [],
            'has_missing_values': False,
            'missing_count': 0
        }
        
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                validation_result['error'] = f"File not found: {file_path}"
                return validation_result
            
            # Try to read the file
            df = pd.read_csv(file_path)
            
            validation_result['num_rows'] = len(df)
            validation_result['num_columns'] = len(df.columns)
            validation_result['columns'] = list(df.columns)
            
            # Check for missing values
            missing_values = df.isnull().sum().sum()
            validation_result['has_missing_values'] = missing_values > 0
            validation_result['missing_count'] = missing_values
            
            # Validate expected structure
            if list(df.columns) != self.expected_columns:
                validation_result['error'] = f"Invalid columns. Expected: {self.expected_columns}, Got: {list(df.columns)}"
                return validation_result
            
            if len(df.columns) != 5:
                validation_result['error'] = f"Expected 5 sensor columns, got {len(df.columns)}"
                return validation_result
            
            # Check for non-numeric data
            try:
                df.astype(float)
            except ValueError as e:
                validation_result['error'] = f"Non-numeric data found: {str(e)}"
                return validation_result
            
            validation_result['valid'] = True
            return validation_result
            
        except Exception as e:
            validation_result['error'] = f"Error reading CSV: {str(e)}"
            return validation_result
    
    def load_single_file_for_prediction(self, file_path: str) -> Optional[np.ndarray]:
        """
        Load and preprocess a single CSV file for prediction.
        
        Args:
            file_path: Path to CSV file
            
        Returns:
            Preprocessed data array or None if loading failed
        """
        try:
            # Validate file structure first
            validation = self.validate_csv_structure(file_path)
            if not validation['valid']:
                logger.error(f"File validation failed: {validation['error']}")
                return None
            
            # Load the file
            df = self._load_csv_file(file_path)
            if df is None:
                return None
            
            # Convert to numpy array
            data_array = df.values
            
            # Apply normalization
            normalized_data = self.normalize_data(data_array)
            
            logger.info(f"Single file loaded for prediction: {normalized_data.shape}")
            return normalized_data
            
        except Exception as e:
            logger.error(f"Error loading single file for prediction: {str(e)}")
            return None
    
    def get_dataset_statistics(self) -> Dict[str, any]:
        """
        Get comprehensive statistics about the loaded dataset.
        
        Returns:
            Dictionary with dataset statistics
        """
        stats = {
            'total_files': 0,
            'files_by_category': {},
            'samples_by_category': {},
            'total_samples': 0,
            'categories': self.fault_categories,
            'directory_structure': {
                'unloaded_dir': self.unloaded_dir,
                'loaded_dir': self.loaded_dir
            }
        }
        
        try:
            for directory in [self.unloaded_dir, self.loaded_dir]:
                if not os.path.exists(directory):
                    continue
                    
                for filename in os.listdir(directory):
                    if not filename.endswith('.csv'):
                        continue
                    
                    stats['total_files'] += 1
                    
                    # Get fault category
                    fault_category = self._extract_fault_category_from_filename(filename)
                    if fault_category:
                        if fault_category not in stats['files_by_category']:
                            stats['files_by_category'][fault_category] = 0
                            stats['samples_by_category'][fault_category] = 0
                        
                        stats['files_by_category'][fault_category] += 1
                        
                        # Count samples in file
                        file_path = os.path.join(directory, filename)
                        df = self._load_csv_file(file_path)
                        if df is not None:
                            sample_count = len(df)
                            stats['samples_by_category'][fault_category] += sample_count
                            stats['total_samples'] += sample_count
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting dataset statistics: {str(e)}")
            return stats

    def data_generator(self, file_paths: List[str], labels: List[int], batch_size: int, 
                     interval_length: int = 200, samples_per_block: int = 1681):
        """
        Data generator for memory-efficient training.
        """
        while True:
            # Shuffle file paths and labels
            indices = np.arange(len(file_paths))
            np.random.shuffle(indices)
            file_paths = np.array(file_paths)[indices]
            labels = np.array(labels)[indices]

            for i in range(0, len(file_paths), batch_size):
                batch_files = file_paths[i:i+batch_size]
                batch_labels = labels[i:i+batch_size]
                
                X_batch = []
                y_batch = []
                
                for file_path, label in zip(batch_files, batch_labels):
                    df = self._load_csv_file(file_path)
                    if df is not None:
                        data_array = df.values
                        first_column = data_array[:, 0].reshape(-1, 1)
                        split_data = self.sampling(first_column.flatten(), interval_length, samples_per_block)
                        
                        if len(split_data) > 0:
                            y = np.zeros((len(split_data), len(self.fault_categories)))
                            y[:, label] = 1
                            
                            X_batch.extend(split_data)
                            y_batch.extend(y)
                
                if len(X_batch) > 0:
                    X_batch = np.array(X_batch)
                    y_batch = np.array(y_batch)
                    X_batch = self.normalize_data(X_batch)
                    yield X_batch, y_batch
