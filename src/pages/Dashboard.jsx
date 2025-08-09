import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { useMotors } from '../context/MotorsContext';
import MotorDetailCard from '../components/MotorDetailCard';
import MotorAdditionWizard from '../components/MotorAdditionWizard';
import MotorTroubleshootingGuide from '../components/MotorTroubleshootingGuide';
import InductionMotorGuide from '../components/InductionMotorGuide';
import './Dashboard.css';
import { supabase } from '../utils/supabase';
import { auth as firebaseAuthInstance } from '../firebaseConfig';

export default function Dashboard() {
  const { motors, removeMotor, addMotor, publishTestData } = useMotors();
  const [showAddMotorForm, setShowAddMotorForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showMotorGuide, setShowMotorGuide] = useState(false);
  
  // Form states
  const [newMotorNameInput, setNewMotorNameInput] = useState('');
  const [newMotorIdInput, setNewMotorIdInput] = useState('');
  const [newMotorLocation, setNewMotorLocation] = useState('');
  const [isAddingMotor, setIsAddingMotor] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      const uid = currentUser.email;
      setUserId(uid);
      fetchMotors(uid);
    } else {
      console.warn("No authenticated Firebase user found.");
    }
  }, []);

  useEffect(() => {
    if (showAddMotorForm) {
      const motorNumbers = motors
        .map(motor => {
          const motorIdString = String(motor.id);
          const match = motorIdString.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num));

      const lastNumber = motorNumbers.length > 0 ? Math.max(...motorNumbers) : 0;
      const nextNumber = lastNumber + 1;
      const formattedNextNumber = String(nextNumber).padStart(3, '0');
      const generatedId = `MOTOR-${formattedNextNumber}`;
      setNewMotorIdInput(generatedId);
    } else {
      setNewMotorIdInput('');
      setNewMotorNameInput('');
      setNewMotorLocation('');
      setFormErrors({});
    }
  }, [showAddMotorForm, motors]);

  const validateForm = () => {
    const errors = {};
    
    if (!newMotorNameInput.trim()) {
      errors.name = 'Motor name is required';
    } else if (newMotorNameInput.trim().length < 3) {
      errors.name = 'Motor name must be at least 3 characters';
    }
    
    if (!newMotorIdInput.trim()) {
      errors.id = 'Motor ID is required';
    } else if (!/^[A-Za-z0-9-]+$/.test(newMotorIdInput.trim())) {
      errors.id = 'Motor ID can only contain letters, numbers, and hyphens';
    }
    
    if (!newMotorLocation.trim()) {
      errors.location = 'Location is required';
    }
    
    if (!userId) {
      errors.auth = 'You must be logged in to add motors';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchMotors = async (uid) => {
    console.log(`DEBUG: fetchMotors called for UID: "${uid}"`);
    
    const { data, error } = await supabase
      .from('motors')
      .select('motor_id, company_id, location, motor_name, installed_at, status')
      .eq('company_id', uid);

    if (error) {
      console.error('Error fetching motors from Supabase:', error);
      alert('Failed to load existing motors. Please refresh the page.');
    } else {
      console.log("DEBUG: Motors data fetched:", data);
      data.forEach((motor) => {
        addMotor(
          motor.motor_id,
          motor.motor_name,
          motor.location,
          motor.company_id,
          motor.status,
          motor.installed_at
        );
      });
    }
  };

  const handleAddMotor = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsAddingMotor(true);
    
    try {
      const motorId = newMotorIdInput.trim();
      const motorName = newMotorNameInput.trim();
      const location = newMotorLocation.trim();
      const currentCompanyId = userId;

      await addMotorToDatabase(motorId, motorName, location, currentCompanyId);
      
    } catch (error) {
      console.error('Unexpected error adding motor:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsAddingMotor(false);
    }
  };

  const addMotorToDatabase = async (motorId, motorName, location, currentCompanyId) => {
    console.log('DEBUG: addMotorToDatabase called with:', { motorId, motorName, location, currentCompanyId });
    
    // Check for existing motor ID
    const { data: existingMotors, error: fetchError } = await supabase
      .from('motors')
      .select('motor_id')
      .eq('motor_id', motorId)
      .eq('company_id', currentCompanyId);

    if (fetchError) {
      console.error('Error checking for existing motor ID:', fetchError);
      alert('Failed to check for existing motor ID. Please try again.');
      return;
    }

    if (existingMotors && existingMotors.length > 0) {
      setFormErrors({ id: `Motor ID "${motorId}" already exists. Please choose a different ID.` });
      return;
    }

    const installedAt = new Date().toISOString();
    const status = "Stopped";

    const { error } = await supabase.from('motors').insert([
      {
        motor_id: motorId,
        motor_name: motorName,
        company_id: firebaseAuthInstance.currentUser.email,
        location: location,
        installed_at: installedAt,
        status: status
      },
    ]);

    if (error) {
      console.error('Failed to insert new motor into Supabase:', error);
      alert('Failed to add motor. Please check your connection and try again.');
      return;
    }

    await fetchMotors(currentCompanyId);
    addMotor(motorId, motorName, location, currentCompanyId, status, installedAt);

    // Success feedback
    alert(`Motor "${motorName}" (${motorId}) has been successfully added!`);
    
    setNewMotorIdInput('');
    setNewMotorNameInput('');
    setNewMotorLocation('');
    setShowAddMotorForm(false);
    setFormErrors({});
  };

  const handleWizardAddMotor = async (formData) => {
    setIsAddingMotor(true);
    
    try {
      const motorId = formData.id.trim();
      const motorName = formData.name.trim();
      const location = formData.location.trim();
      const currentCompanyId = userId;

      await addMotorToDatabase(motorId, motorName, location, currentCompanyId);
      setShowWizard(false);
      
    } catch (error) {
      console.error('Unexpected error adding motor via wizard:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsAddingMotor(false);
    }
  };

  const motorsForDisplay = motors.map((motor) => ({
    ...motor,
    displayLastUpdated: motor.lastUpdated instanceof Date
      ? motor.lastUpdated.toLocaleTimeString()
      : (motor.installed_at ? new Date(motor.installed_at).toLocaleTimeString() : 'N/A'),
  }));

  return (
    <div className="dashboard-container">
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <h1>Motors Dashboard</h1>
          <div className="dashboard-controls">
            <button
              onClick={() => setShowWizard(true)}
              className="dashboard-add-button wizard-button"
            >
              <span>🚀</span> Quick Add Motor
            </button>
            <button
              onClick={() => setShowAddMotorForm(!showAddMotorForm)}
              className="dashboard-add-button"
            >
              {showAddMotorForm ? 'Close Form' : 'Advanced Add Motor'}
            </button>
            <button
              onClick={() => setShowTroubleshooting(true)}
              className="dashboard-add-button help-button"
            >
              <span>❓</span> Need Help?
            </button>
            <button
              onClick={() => setShowMotorGuide(true)}
              className="dashboard-add-button"
              style={{ backgroundColor: '#10b981' }}
            >
              <span>⚡</span> Motor Guide
            </button>
          </div>
        </div>
        {showAddMotorForm && (
          <form className="add-motor-form" onSubmit={handleAddMotor}>
            <div className="form-field-group">
              <input
                type="text"
                placeholder="Descriptive Motor Name (e.g., HVAC Unit 1, Pump 3)"
                value={newMotorNameInput}
                onChange={(e) => setNewMotorNameInput(e.target.value)}
                className={`dashboard-input ${formErrors.name ? 'error' : ''}`}
                required
              />
              {formErrors.name && <span className="error-message">{formErrors.name}</span>}
            </div>
            
            <div className="form-field-group">
              <input
                type="text"
                placeholder="Unique Motor ID (e.g., MOTOR-001, motor-001, Pump-003)"
                value={newMotorIdInput}
                onChange={(e) => setNewMotorIdInput(e.target.value)}
                className={`dashboard-input ${formErrors.id ? 'error' : ''}`}
                required
              />
              {formErrors.id && <span className="error-message">{formErrors.id}</span>}
            </div>
            
            <div className="form-field-group">
              <input
                type="text"
                placeholder="Location (e.g., Assembly Line A)"
                value={newMotorLocation}
                onChange={(e) => setNewMotorLocation(e.target.value)}
                className={`dashboard-input ${formErrors.location ? 'error' : ''}`}
                required
              />
              {formErrors.location && <span className="error-message">{formErrors.location}</span>}
            </div>
            
            {formErrors.auth && <div className="auth-error-message">{formErrors.auth}</div>}
            
            <button
              type="submit"
              className="dashboard-submit-button"
              disabled={!userId || isAddingMotor}
            >
              {isAddingMotor ? 'Adding Motor...' : 'Add Motor'}
            </button>
          </form>
        )}
        <h2 className="section-title">All Motors Overview</h2>
        <div className="dashboard-grid">
          {motors.length === 0 ? (
            <p className="no-motors-message">
              No motors added yet. Click "Add New Motor" to get started.
            </p>
          ) : (
            motorsForDisplay.map((motor) => (
              <div
                key={motor.id}
                className="motor-card-wrapper"
              >
                <MotorDetailCard
                  motor={motor}
                  onDelete={() => removeMotor(motor.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
      
      {showWizard && (
        <MotorAdditionWizard
          onAddMotor={handleWizardAddMotor}
          onClose={() => setShowWizard(false)}
          userId={userId}
        />
      )}
      
      {showTroubleshooting && (
        <MotorTroubleshootingGuide
          onClose={() => setShowTroubleshooting(false)}
        />
      )}
      
      {showMotorGuide && (
        <InductionMotorGuide
          onClose={() => setShowMotorGuide(false)}
        />
      )}
    </div>
  );
}
