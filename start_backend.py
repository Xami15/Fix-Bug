#!/usr/bin/env python3
"""
Backend Startup Script for SEP Monitoring Dashboard
Ensures proper initialization of AI models and services
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'fastapi',
        'tensorflow',
        'scikit-learn',
        'pandas',
        'numpy',
        'twilio',
        'aiosmtplib'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} - Missing")
    
    if missing_packages:
        print(f"\n⚠️ Missing packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        for package in missing_packages:
            subprocess.run([sys.executable, '-m', 'pip', 'install', package])
    
    return len(missing_packages) == 0

def initialize_ai_model():
    """Initialize the AI model"""
    print("\n🤖 Initializing AI Model...")
    
    try:
        # Import the CNN predictor to trigger model creation
        sys.path.append('backend/ml')
        from cnn_predictor import cnn_predictor
        
        # Get model info
        model_info = cnn_predictor.get_model_info()
        print(f"✅ Model Type: {model_info.get('model_type', 'Unknown')}")
        print(f"✅ Architecture: {model_info.get('architecture', 'Unknown')}")
        print(f"✅ Model Loaded: {model_info.get('model_loaded', False)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error initializing AI model: {e}")
        return False

def check_backend_health():
    """Check if backend is running and healthy"""
    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            return True
    except:
        pass
    return False

def start_backend():
    """Start the FastAPI backend server"""
    print("\n🚀 Starting Backend Server...")
    
    # Change to backend directory
    backend_dir = Path('backend')
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        return False
    
    os.chdir(backend_dir)
    
    # Start the server
    try:
        print("✅ Starting FastAPI server on http://localhost:8000")
        print("✅ AI endpoints available at http://localhost:8000/ai")
        print("✅ Notification endpoints available at http://localhost:8000/notifications")
        print("\n📊 Dashboard will be available at http://localhost:3000")
        print("🔄 Press Ctrl+C to stop the server\n")
        
        # Start uvicorn server
        subprocess.run([
            sys.executable, '-m', 'uvicorn', 
            'app:app', 
            '--host', '0.0.0.0', 
            '--port', '8000',
            '--reload'
        ])
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return False
    
    return True

def main():
    """Main startup function"""
    print("=" * 60)
    print("🚀 SEP Monitoring Dashboard - Backend Startup")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        print("❌ Failed to install dependencies")
        return
    
    # Initialize AI model
    if not initialize_ai_model():
        print("❌ Failed to initialize AI model")
        return
    
    # Check if backend is already running
    if check_backend_health():
        print("✅ Backend is already running!")
        return
    
    # Start backend
    start_backend()

if __name__ == "__main__":
    main() 