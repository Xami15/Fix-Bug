import React, { useState } from 'react';
import './MotorAdditionWizard.css';

const MotorAdditionWizard = ({ onAddMotor, onClose, userId }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    location: ''
  });
  const [errors, setErrors] = useState({});

  const steps = [
    {
      id: 1,
      title: 'Motor Name',
      description: 'Give your motor a descriptive name',
      field: 'name',
      placeholder: 'e.g., HVAC Unit 1, Pump 3, Conveyor Belt A'
    },
    {
      id: 2,
      title: 'Motor ID',
      description: 'Enter a unique identifier for your motor',
      field: 'id',
      placeholder: 'e.g., MOTOR-001, motor-001, Pump-003'
    },
    {
      id: 3,
      title: 'Location',
      description: 'Where is this motor located?',
      field: 'location',
      placeholder: 'e.g., Assembly Line A, Building 3, Floor 2'
    }
  ];

  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          newErrors.name = 'Motor name is required';
        } else if (formData.name.trim().length < 3) {
          newErrors.name = 'Motor name must be at least 3 characters';
        }
        break;
      case 2:
        if (!formData.id.trim()) {
          newErrors.id = 'Motor ID is required';
        } else if (!/^[A-Za-z0-9-]+$/.test(formData.id.trim())) {
          newErrors.id = 'Motor ID can only contain letters, numbers, and hyphens';
        }
        break;
      case 3:
        if (!formData.location.trim()) {
          newErrors.location = 'Location is required';
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      onAddMotor(formData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const currentStepData = steps.find(step => step.id === currentStep);

  return (
    <div className="motor-wizard-overlay">
      <div className="motor-wizard-modal">
        <div className="motor-wizard-header">
          <h2>Add New Motor</h2>
          <button className="wizard-close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="motor-wizard-progress">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`progress-step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
            >
              <div className="progress-number">{step.id}</div>
              <div className="progress-label">{step.title}</div>
            </div>
          ))}
        </div>

        <div className="motor-wizard-content">
          <h3>{currentStepData.title}</h3>
          <p className="step-description">{currentStepData.description}</p>
          
          <div className="wizard-input-group">
            <input
              type="text"
              placeholder={currentStepData.placeholder}
              value={formData[currentStepData.field]}
              onChange={(e) => handleInputChange(currentStepData.field, e.target.value)}
              className={`wizard-input ${errors[currentStepData.field] ? 'error' : ''}`}
              autoFocus
            />
            {errors[currentStepData.field] && (
              <span className="wizard-error-message">{errors[currentStepData.field]}</span>
            )}
          </div>
        </div>

        <div className="motor-wizard-actions">
          {currentStep > 1 && (
            <button className="wizard-button secondary" onClick={handleBack}>
              Back
            </button>
          )}
          <button className="wizard-button primary" onClick={handleNext}>
            {currentStep === steps.length ? 'Add Motor' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MotorAdditionWizard; 