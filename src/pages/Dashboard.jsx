import React, { useState, useEffect, useRef, Suspense } from 'react';
import { getAuth } from 'firebase/auth';
import { useMotors } from '../context/MotorsContext';
import MotorDetailCard from '../components/MotorDetailCard';
import MotorAdditionWizard from '../components/MotorAdditionWizard';
import MotorTroubleshootingGuide from '../components/MotorTroubleshootingGuide';
import './Dashboard.css';
import { supabase } from '../utils/supabase';
import { auth as firebaseAuthInstance } from '../firebaseConfig';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';

// A single component for the 3D motor, making the scene cleaner.
function MotorModel({ isRotating }) {
  const motorRef = useRef();

  // Create a clean, industrial look with materials
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: '#b0b0b0',
    metalness: 0.9,
    roughness: 0.3,
  });

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#2a3b4c',
    metalness: 0.6,
    roughness: 0.5,
  });
  
  const terminalBoxMaterial = new THREE.MeshStandardMaterial({
    color: '#4f5e6a',
    metalness: 0.8,
    roughness: 0.4,
  });

  const wireMaterial = new THREE.MeshStandardMaterial({
    color: '#e74c3c',
    metalness: 0.1,
    roughness: 0.9,
  });

  useFrame((state, delta) => {
    if (motorRef.current && isRotating) {
      motorRef.current.rotation.y += delta * 2;
    }
  });

  return (
    <group ref={motorRef} position={[0, 0, 0]}>
      {/* Main Motor Casing */}
      <mesh material={bodyMaterial}>
        <cylinderGeometry args={[1, 1, 2, 64]} />
      </mesh>

      {/* Front End Cap - A more detailed geometry with a flange */}
      <mesh material={metalMaterial} position={[0, 0, 1.05]}>
        <cylinderGeometry args={[1.1, 1.1, 0.1, 64]} />
      </mesh>
      <mesh material={metalMaterial} position={[0, 0, 1.1]}>
        <cylinderGeometry args={[0.9, 0.9, 0.1, 64]} />
      </mesh>
      
      {/* Rear End Cap with Ventilation Holes */}
      <mesh material={metalMaterial} position={[0, 0, -1.05]}>
        <cylinderGeometry args={[1.1, 1.1, 0.1, 64]} />
      </mesh>
      <mesh material={metalMaterial} position={[0, 0, -1.1]}>
        <cylinderGeometry args={[0.9, 0.9, 0.1, 64]} />
      </mesh>
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x = Math.cos(angle) * 0.95;
        const y = Math.sin(angle) * 0.95;
        return (
          <mesh key={`vent-${i}`} position={[x, y, -1.1]}>
            <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
            <meshStandardMaterial color="#1a202c" />
          </mesh>
        );
      })}

      {/* Motor Shaft */}
      <mesh material={metalMaterial} position={[0, 0, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.4, 32]} />
      </mesh>

      {/* Terminal Box - More defined shape */}
      <mesh material={terminalBoxMaterial} position={[0.8, 0.5, 0]}>
        <boxGeometry args={[0.6, 0.8, 0.6]} />
      </mesh>
      <mesh material={terminalBoxMaterial} position={[1.1, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.7, 0.5]} />
      </mesh>
      <mesh material={terminalBoxMaterial} position={[1.2, 0.5, 0]}>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
      </mesh>

      {/* Wires from Terminal Box */}
      <mesh material={wireMaterial} position={[1.4, 0.7, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.05]} />
      </mesh>
      <mesh material={wireMaterial} position={[1.4, 0.5, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.05]} />
      </mesh>
      <mesh material={wireMaterial} position={[1.4, 0.3, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.05]} />
      </mesh>
    </group>
  );
}

// Separate component for the entire 3D scene
function IndustrialScene({ isRotating }) {
  return (
    <>
      {/* High-quality lighting and environment for a professional look */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 7.5]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <spotLight
        position={[0, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* A simple plane as the ground for shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#4f5e6a" />
      </mesh>

      {/* The actual motor model */}
      <MotorModel isRotating={isRotating} />
      
      {/* CORRECTED: Use a valid preset like "warehouse" */}
      <Environment preset="warehouse" />

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        minDistance={3}
        maxDistance={15}
        target={[0, 0, 0]}
      />
      <PerspectiveCamera makeDefault position={[0, 2, 5]} fov={50} />
    </>
  );
}

// The main Dashboard component remains mostly the same, but with cleaner JSX for the 3D modal
export default function Dashboard() {
  const { motors, addMotor, removeMotor } = useMotors();
  const [newMotorNameInput, setNewMotorNameInput] = useState('');
  const [newMotorLocation, setNewMotorLocation] = useState('');
  const [newMotorIdInput, setNewMotorIdInput] = useState('');
  const [showAddMotorForm, setShowAddMotorForm] = useState(false);
  const [userId, setUserId] = useState(null);
  const [selectedMotor, setSelectedMotor] = useState(null);
  const [isMotorRotating, setIsMotorRotating] = useState(false);
  const [isAddingMotor, setIsAddingMotor] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showWizard, setShowWizard] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

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
    } else if (!/^[A-Z0-9-]+$/.test(newMotorIdInput.trim())) {
      errors.id = 'Motor ID can only contain uppercase letters, numbers, and hyphens';
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

  const handleSelectMotor = (motor) => {
    setSelectedMotor(motor);
    // Set rotation based on the motor's actual status
    setIsMotorRotating(motor.status === "Running"); 
  };

  const handleCloseAnimation = () => {
    setIsMotorRotating(false);
    setTimeout(() => {
      setSelectedMotor(null);
    }, 300);
  };
  
  const toggleMotorStatus = () => {
    // This is a client-side only toggle for demonstration.
    // In a real application, you would update the database and then re-fetch.
    const newStatus = isMotorRotating ? "Stopped" : "Running";
    setIsMotorRotating(!isMotorRotating);
    // You would update the motor in your global state and database here.
    console.log(`Motor ${selectedMotor.id} status changed to ${newStatus}`);
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
                placeholder="Unique Motor ID (e.g., MOTOR-001 - must match hardware label)"
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
        {selectedMotor && (
          <div className="motor-animation-modal">
            <div className="motor-animation-header">
              <h2>{selectedMotor.name} - 3D Visualization</h2>
              <button
                className="close-animation-button"
                onClick={handleCloseAnimation}
              >
                ×
              </button>
            </div>
            <div className="motor-animation-content">
              <Canvas className="motor-canvas" shadows>
                <Suspense fallback={null}>
                  <IndustrialScene isRotating={isMotorRotating} />
                </Suspense>
              </Canvas>
              <div className="motor-info-panel">
                <h3>Motor Details</h3>
                <p><strong>ID:</strong> {selectedMotor.id}</p>
                <p><strong>Name:</strong> {selectedMotor.name}</p>
                <p><strong>Location:</strong> {selectedMotor.location}</p>
                <p><strong>Status:</strong> <span className={isMotorRotating ? "status-running" : "status-stopped"}>{isMotorRotating ? "Running" : "Stopped"}</span></p>
                <div className="control-buttons">
                  <button
                    className={isMotorRotating ? "control-button stop" : "control-button start"}
                    onClick={toggleMotorStatus}
                  >
                    {isMotorRotating ? "Stop Motor" : "Start Motor"}
                  </button>
                </div>
              </div>
            </div>
          </div>
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
                onClick={() => handleSelectMotor(motor)}
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
    </div>
  );
}
