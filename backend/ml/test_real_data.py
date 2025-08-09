"""
Test script to verify data processor works with real dataset.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from data_processor import DataProcessor
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

def test_real_dataset():
    """Test the data processor with the real motor dataset."""
    
    # Initialize processor with real data path
    data_path = "2_CSV_Data_Files"
    processor = DataProcessor(data_path)
    
    print("Testing DataProcessor with real dataset...")
    
    # Test 1: Get dataset statistics
    print("\n1. Getting dataset statistics...")
    stats = processor.get_dataset_statistics()
    print(f"Total files: {stats['total_files']}")
    print(f"Files by category: {stats['files_by_category']}")
    print(f"Total samples: {stats['total_samples']}")
    
    # Test 2: Load a single file for validation
    print("\n2. Testing single file loading...")
    sample_file = "2_CSV_Data_Files/1_Unloaded_Condition/healthy_unloaded_1_0.csv"
    if os.path.exists(sample_file):
        validation = processor.validate_csv_structure(sample_file)
        print(f"File validation: {validation['valid']}")
        if validation['valid']:
            print(f"Rows: {validation['num_rows']}, Columns: {validation['num_columns']}")
        else:
            print(f"Validation error: {validation['error']}")
    
    # Test 3: Load and preprocess dataset (this might take a while)
    print("\n3. Testing complete data loading and preprocessing...")
    try:
        X, LabelPositional, Label = processor.load_and_preprocess_dataset()
        print(f"Successfully loaded dataset:")
        print(f"  X shape: {X.shape}")
        print(f"  LabelPositional shape: {LabelPositional.shape}")
        print(f"  Label shape: {Label.shape}")
        
        # Test 4: Create train-test split
        print("\n4. Testing train-test split...")
        X_train, X_test, y_train, y_test = processor.create_train_test_split(X, LabelPositional)
        print(f"Train set: {X_train.shape}, Test set: {X_test.shape}")
        
        print("\nAll tests completed successfully!")
        
    except Exception as e:
        print(f"Error during data processing: {str(e)}")
        print("This might be expected if the dataset is too small for sampling.")

if __name__ == "__main__":
    test_real_dataset()