#!/usr/bin/env python3
"""
Comprehensive Model Training Pipeline with Visualizations for Motor Fault Detection System

This script executes the complete training pipeline for Task 10.1 with extensive visualizations:
- Load and preprocess the CSV dataset
- Execute model training with validation
- Generate comprehensive visualizations and save them in a dedicated folder
- Save trained model with metadata
- Validate model achieves ≥85% accuracy requirement
- Create presentation-ready visualizations for validation and reporting

Usage:
    python train_model_with_visualizations.py [--epochs 50] [--batch-size 16] [--data-path "2_CSV_Data_Files"]
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
    # Fallback for direct execution
    from model_trainer import ModelTrainer
    from data_processor import DataProcessor
    from cnn_model import CNN1D

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training_with_visualizations.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Set matplotlib style for better visualizations
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")


class VisualizationManager:
    """
    Manages the creation and saving of comprehensive visualizations for the training process.
    """
    
    def __init__(self, output_dir: str = "visualizations"):
        """
        Initialize the VisualizationManager.
        
        Args:
            output_dir: Directory to save all visualizations
        """
        self.output_dir = output_dir
        self.figures_dir = os.path.join(output_dir, "figures")
        self.charts_dir = os.path.join(output_dir, "charts")
        self.reports_dir = os.path.join(output_dir, "reports")
        
        # Create directory structure
        for dir_path in [self.output_dir, self.figures_dir, self.charts_dir, self.reports_dir]:
            os.makedirs(dir_path, exist_ok=True)
        
        logger.info(f"VisualizationManager initialized. Output directory: {output_dir}")
    
    def create_dataset_overview_visualization(self, data_processor: DataProcessor):
        """Create dataset overview visualizations."""
        logger.info("Creating dataset overview visualizations...")
        
        # Get dataset statistics
        stats = data_processor.get_dataset_statistics()
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Motor Fault Detection Dataset Overview', fontsize=16, fontweight='bold')
        
        # 1. Category distribution
        categories = list(stats.get('category_counts', {}).keys())
        counts = list(stats.get('category_counts', {}).values())
        
        axes[0, 0].bar(categories, counts, color=sns.color_palette("husl", len(categories)))
        axes[0, 0].set_title('Fault Category Distribution')
        axes[0, 0].set_xlabel('Fault Categories')
        axes[0, 0].set_ylabel('Number of Files')
        axes[0, 0].tick_params(axis='x', rotation=45)
        
        # 2. Data size distribution
        file_sizes = stats.get('file_sizes', [])
        if file_sizes:
            axes[0, 1].hist(file_sizes, bins=20, color='skyblue', alpha=0.7)
            axes[0, 1].set_title('File Size Distribution')
            axes[0, 1].set_xlabel('File Size (MB)')
            axes[0, 1].set_ylabel('Number of Files')
        
        # 3. Sample count per category
        sample_counts = stats.get('samples_per_category', {})
        if sample_counts:
            categories = list(sample_counts.keys())
            samples = list(sample_counts.values())
            axes[1, 0].pie(samples, labels=categories, autopct='%1.1f%%', startangle=90)
            axes[1, 0].set_title('Sample Distribution by Category')
        
        # 4. Data quality metrics
        quality_metrics = stats.get('quality_metrics', {})
        if quality_metrics:
            metrics = list(quality_metrics.keys())
            values = list(quality_metrics.values())
            axes[1, 1].bar(metrics, values, color='lightgreen')
            axes[1, 1].set_title('Data Quality Metrics')
            axes[1, 1].set_ylabel('Percentage')
            axes[1, 1].tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.figures_dir, 'dataset_overview.png'), dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info("Dataset overview visualization saved")
    
    def create_training_progress_visualization(self, training_history: Dict):
        """Create training progress visualizations."""
        logger.info("Creating training progress visualizations...")
        
        if not training_history:
            logger.warning("No training history available for visualization")
            return
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Model Training Progress', fontsize=16, fontweight='bold')
        
        # 1. Training and validation accuracy
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
        
        # 2. Training and validation loss
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
        
        # 3. Learning rate (if available)
        if 'lr' in training_history:
            epochs = range(1, len(training_history['lr']) + 1)
            axes[1, 0].plot(epochs, training_history['lr'], 'g-')
            axes[1, 0].set_title('Learning Rate')
            axes[1, 0].set_xlabel('Epoch')
            axes[1, 0].set_ylabel('Learning Rate')
            axes[1, 0].grid(True)
        
        # 4. Model convergence
        if 'accuracy' in training_history and 'val_accuracy' in training_history:
            epochs = range(1, len(training_history['accuracy']) + 1)
            convergence = [abs(acc - val_acc) for acc, val_acc in zip(training_history['accuracy'], training_history['val_accuracy'])]
            axes[1, 1].plot(epochs, convergence, 'purple')
            axes[1, 1].set_title('Training-Validation Gap (Overfitting Monitor)')
            axes[1, 1].set_xlabel('Epoch')
            axes[1, 1].set_ylabel('Accuracy Gap')
            axes[1, 1].grid(True)
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.figures_dir, 'training_progress.png'), dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info("Training progress visualization saved")
    
    def create_confusion_matrix_visualization(self, confusion_matrix: np.ndarray, class_names: List[str], 
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
        plt.savefig(os.path.join(self.charts_dir, filename), dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info(f"Confusion matrix saved: {filename}")
    
    def create_performance_metrics_visualization(self, metrics: Dict):
        """Create performance metrics visualization."""
        logger.info("Creating performance metrics visualization...")
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Model Performance Metrics', fontsize=16, fontweight='bold')
        
        # 1. Accuracy comparison
        if 'accuracy' in metrics:
            accuracy_data = metrics['accuracy']
            if isinstance(accuracy_data, dict):
                categories = list(accuracy_data.keys())
                accuracies = list(accuracy_data.values())
                axes[0, 0].bar(categories, accuracies, color=sns.color_palette("husl", len(categories)))
                axes[0, 0].set_title('Accuracy by Category')
                axes[0, 0].set_ylabel('Accuracy')
                axes[0, 0].tick_params(axis='x', rotation=45)
        
        # 2. Precision, Recall, F1-Score
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
        
        # 3. Overall metrics
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
        
        # 4. Training time and efficiency
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
        plt.savefig(os.path.join(self.charts_dir, 'performance_metrics.png'), dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info("Performance metrics visualization saved")
    
    def create_model_architecture_visualization(self, model):
        """Create model architecture visualization."""
        logger.info("Creating model architecture visualization...")
        
        try:
            from tensorflow.keras.utils import plot_model
            
            # Save model architecture diagram
            plot_path = os.path.join(self.figures_dir, 'model_architecture.png')
            plot_model(model, to_file=plot_path, show_shapes=True, show_layer_names=True)
            
            logger.info("Model architecture visualization saved")
            
        except ImportError:
            logger.warning("TensorFlow plot_model not available, skipping architecture visualization")
    
    def create_data_distribution_visualization(self, X: np.ndarray, y: np.ndarray, class_names: List[str]):
        """Create data distribution visualization."""
        logger.info("Creating data distribution visualization...")
        
        # Create figure with subplots
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        fig.suptitle('Data Distribution Analysis', fontsize=16, fontweight='bold')
        
        # 1. Class distribution
        unique, counts = np.unique(np.argmax(y, axis=1), return_counts=True)
        axes[0, 0].pie(counts, labels=[class_names[i] for i in unique], autopct='%1.1f%%', startangle=90)
        axes[0, 0].set_title('Class Distribution')
        
        # 2. Sample distribution histogram
        axes[0, 1].hist(counts, bins=len(unique), color='skyblue', alpha=0.7)
        axes[0, 1].set_title('Sample Count Distribution')
        axes[0, 1].set_xlabel('Number of Samples')
        axes[0, 1].set_ylabel('Number of Classes')
        
        # 3. Feature statistics
        if X.ndim >= 2:
            feature_means = np.mean(X, axis=0)
            feature_stds = np.std(X, axis=0)
            
            axes[1, 0].errorbar(range(len(feature_means)), feature_means, yerr=feature_stds, 
                               fmt='o', capsize=5, capthick=2)
            axes[1, 0].set_title('Feature Statistics')
            axes[1, 0].set_xlabel('Feature Index')
            axes[1, 0].set_ylabel('Value')
        
        # 4. Data quality heatmap
        if X.ndim >= 2:
            # Sample correlation matrix for first 10 features
            sample_size = min(1000, X.shape[0])
            sample_indices = np.random.choice(X.shape[0], sample_size, replace=False)
            sample_data = X[sample_indices, :min(10, X.shape[1])]
            
            correlation_matrix = np.corrcoef(sample_data.T)
            im = axes[1, 1].imshow(correlation_matrix, cmap='coolwarm', aspect='auto')
            axes[1, 1].set_title('Feature Correlation Matrix (Sample)')
            plt.colorbar(im, ax=axes[1, 1])
        
        plt.tight_layout()
        plt.savefig(os.path.join(self.figures_dir, 'data_distribution.png'), dpi=300, bbox_inches='tight')
        plt.close()
        
        logger.info("Data distribution visualization saved")
    
    def create_comprehensive_report(self, training_results: Dict, evaluation_results: Dict, 
                                 model_path: str, dataset_info: Dict):
        """Create a comprehensive PDF report with all visualizations."""
        logger.info("Creating comprehensive training report...")
        
        try:
            from reportlab.lib.pagesizes import letter, A4
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib import colors
            
            # Create PDF report
            report_path = os.path.join(self.reports_dir, 'training_report.pdf')
            doc = SimpleDocTemplate(report_path, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            story.append(Paragraph("Motor Fault Detection Model Training Report", title_style))
            story.append(Spacer(1, 20))
            
            # Executive Summary
            story.append(Paragraph("Executive Summary", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            summary_text = f"""
            This report presents the results of training a CNN-based motor fault detection model.
            The model was trained on a comprehensive dataset containing {dataset_info.get('total_samples', 'N/A')} samples
            across {len(dataset_info.get('class_names', []))} fault categories.
            
            Key Results:
            • Test Accuracy: {evaluation_results.get('accuracy', 0):.2%}
            • Model saved to: {model_path}
            • Training completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            story.append(Paragraph(summary_text, styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Dataset Information
            story.append(Paragraph("Dataset Information", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            dataset_table_data = [
                ['Metric', 'Value'],
                ['Total Samples', str(dataset_info.get('total_samples', 'N/A'))],
                ['Training Samples', str(dataset_info.get('train_samples', 'N/A'))],
                ['Test Samples', str(dataset_info.get('test_samples', 'N/A'))],
                ['Sample Shape', str(dataset_info.get('sample_shape', 'N/A'))],
                ['Number of Classes', str(len(dataset_info.get('class_names', [])))]
            ]
            
            dataset_table = Table(dataset_table_data)
            dataset_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(dataset_table)
            story.append(Spacer(1, 20))
            
            # Performance Metrics
            story.append(Paragraph("Performance Metrics", styles['Heading2']))
            story.append(Spacer(1, 12))
            
            metrics_table_data = [
                ['Metric', 'Value'],
                ['Test Accuracy', f"{evaluation_results.get('accuracy', 0):.2%}"],
                ['Overall Precision', f"{evaluation_results.get('overall_precision', 0):.2%}"],
                ['Overall Recall', f"{evaluation_results.get('overall_recall', 0):.2%}"],
                ['Overall F1-Score', f"{evaluation_results.get('overall_f1_score', 0):.2%}"]
            ]
            
            metrics_table = Table(metrics_table_data)
            metrics_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(metrics_table)
            story.append(Spacer(1, 20))
            
            # Add visualizations to report
            visualization_files = [
                ('Dataset Overview', 'dataset_overview.png'),
                ('Training Progress', 'training_progress.png'),
                ('Performance Metrics', 'performance_metrics.png'),
                ('Data Distribution', 'data_distribution.png')
            ]
            
            for title, filename in visualization_files:
                file_path = os.path.join(self.figures_dir, filename)
                if os.path.exists(file_path):
                    story.append(Paragraph(title, styles['Heading3']))
                    story.append(Spacer(1, 12))
                    
                    # Resize image to fit page
                    img = Image(file_path, width=6*inch, height=4*inch)
                    story.append(img)
                    story.append(Spacer(1, 20))
            
            # Build PDF
            doc.build(story)
            logger.info(f"Comprehensive report saved: {report_path}")
            
        except ImportError:
            logger.warning("ReportLab not available, skipping PDF report generation")
            # Create a simple text report instead
            report_path = os.path.join(self.reports_dir, 'training_report.txt')
            with open(report_path, 'w') as f:
                f.write("Motor Fault Detection Model Training Report\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Test Accuracy: {evaluation_results.get('accuracy', 0):.2%}\n")
                f.write(f"Model Path: {model_path}\n")
                f.write(f"Training Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Total Samples: {dataset_info.get('total_samples', 'N/A')}\n")
            
            logger.info(f"Text report saved: {report_path}")


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
    Memory-efficient version of ModelTrainer with visualization support.
    """
    
    def __init__(self, data_path: str, model_save_dir: str = "backend/ml/saved_model/", 
                 visualization_manager: VisualizationManager = None):
        """
        Initialize the MemoryEfficientModelTrainer.
        
        Args:
            data_path: Path to the directory containing CSV data files
            model_save_dir: Directory to save trained models
            visualization_manager: Manager for creating visualizations
        """
        self.data_path = data_path
        self.model_save_dir = model_save_dir
        self.visualization_manager = visualization_manager
        
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
    logger.info("Setting up training environment with visualizations...")
    
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
        "models",
        "visualizations"
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


def execute_training_pipeline_with_visualizations(epochs: int = 50, batch_size: int = 16, 
                                                data_path: str = "2_CSV_Data_Files"):
    """Execute the training pipeline with comprehensive visualizations."""
    logger.info("=" * 80)
    logger.info("STARTING TRAINING PIPELINE WITH VISUALIZATIONS")
    logger.info("=" * 80)
    
    start_time = datetime.now()
    logger.info(f"Training started at: {start_time}")
    
    try:
        # Initialize visualization manager
        logger.info("Initializing visualization manager...")
        viz_manager = VisualizationManager()
        
        # Initialize MemoryEfficientModelTrainer
        logger.info("Initializing MemoryEfficientModelTrainer...")
        trainer = MemoryEfficientModelTrainer(data_path=data_path, visualization_manager=viz_manager)
        
        # Create dataset overview visualization
        logger.info("Creating dataset overview visualization...")
        viz_manager.create_dataset_overview_visualization(trainer.data_processor)
        
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
        
        # Create data distribution visualization
        logger.info("Creating data distribution visualization...")
        class_names = trainer.data_processor.fault_categories
        viz_manager.create_data_distribution_visualization(X, LabelPositional, class_names)
        
        # Create train-test split
        logger.info("Creating train-test split...")
        X_train, X_test, y_train, y_test = trainer.create_stratified_train_test_split(X, LabelPositional)
        
        # Create model architecture visualization
        logger.info("Creating model architecture visualization...")
        model = trainer.cnn_model.create_model()
        viz_manager.create_model_architecture_visualization(model)
        
        # Train model
        logger.info("Training model...")
        training_results = trainer.train_model(
            X_train, y_train, X_test, y_test,
            epochs=epochs,
            batch_size=batch_size
        )
        
        # Create training progress visualization
        logger.info("Creating training progress visualization...")
        viz_manager.create_training_progress_visualization(training_results.get('history', {}))
        
        # Evaluate model
        logger.info("Evaluating model...")
        evaluation_results = trainer.evaluate_model(X_test, y_test)
        
        # Create confusion matrix visualizations
        logger.info("Creating confusion matrix visualizations...")
        if 'confusion_matrix' in evaluation_results:
            viz_manager.create_confusion_matrix_visualization(
                evaluation_results['confusion_matrix'],
                class_names,
                "Test Set Confusion Matrix"
            )
        
        # Create performance metrics visualization
        logger.info("Creating performance metrics visualization...")
        viz_manager.create_performance_metrics_visualization(evaluation_results)
        
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
        
        # Create comprehensive report
        logger.info("Creating comprehensive report...")
        dataset_info = {
            'total_samples': len(X),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'sample_shape': X.shape[1:],
            'class_names': class_names
        }
        viz_manager.create_comprehensive_report(
            training_results, evaluation_results, model_path, dataset_info
        )
        
        # Save training summary
        training_summary = {
            'test_accuracy': test_accuracy,
            'training_results': training_results,
            'evaluation_results': evaluation_results,
            'model_path': model_path,
            'training_date': datetime.now().isoformat(),
            'dataset_info': dataset_info,
            'visualization_paths': {
                'figures_dir': viz_manager.figures_dir,
                'charts_dir': viz_manager.charts_dir,
                'reports_dir': viz_manager.reports_dir
            }
        }
        
        summary_file = "saved_model/training_summary_with_visualizations.json"
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
            'training_results': training_results,
            'evaluation_results': evaluation_results,
            'model_path': model_path,
            'visualization_paths': {
                'figures_dir': viz_manager.figures_dir,
                'charts_dir': viz_manager.charts_dir,
                'reports_dir': viz_manager.reports_dir
            },
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
        results = execute_training_pipeline_with_visualizations(
            epochs=args.epochs,
            batch_size=args.batch_size,
            data_path=args.data_path
        )
        
        if results['success']:
            logger.info("✓ Training pipeline with visualizations completed successfully!")
            logger.info(f"Test accuracy: {results['test_accuracy']:.2%}")
            logger.info(f"Duration: {results['duration']}")
            logger.info(f"Model saved to: {results['model_path']}")
            logger.info(f"Visualizations saved to: {results['visualization_paths']['figures_dir']}")
            
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