import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { useMotors } from '../context/MotorsContext';
import MotorDetailCard from '../components/MotorDetailCard';
import './Dashboard.css';
import { supabase } from '../utils/supabase';
import { auth as firebaseAuthInstance } from '../firebaseConfig';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Motor3D Component
 * Renders a 3D representation of a motor using react-three-fiber.
 * The motor can rotate based on the `isRotating` prop.
 */
function Motor3D({ isRotating }) {
  // useRef to get a direct reference to the mesh object for animations
  const meshRef = useRef();

  // useFrame hook runs on each frame, allowing for animations
  useFrame((state, delta) => {
    if (meshRef.current && isRotating) {
      // Rotate the motor around the Y-axis if isRotating is true
      meshRef.current.rotation.y += delta * 2;
    }
  });

  return (
    // Group all motor parts together
    <group position={[0, 0, 0]}>
      {/* Motor Body: A cylinder representing the main casing */}
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[1, 1, 2, 32]} />
        <meshStandardMaterial color="#f7f9fcff" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Motor Shaft: A smaller cylinder extending from one end */}
      <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <meshStandardMaterial color="#2d3748" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Motor End Caps: Thin cylinders at both ends of the motor body */}
      <mesh position={[0, 0, -1]}>
        <cylinderGeometry args={[1, 1, 0.1, 32]} />
        <meshStandardMaterial color="#718096" metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0, 1]}>
        <cylinderGeometry args={[1, 1, 0.1, 32]} />
        <meshStandardMaterial color="#718096" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Ventilation Holes: Small cylinders arranged around one end cap */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 0.7;
        const y = Math.sin(angle) * 0.7;
        return (
          <mesh key={i} position={[x, y, -1.05]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
            <meshStandardMaterial color="#606369ff" />
          </mesh>
        );
      })}

      {/* Connection Box: A rectangular box on the side of the motor */}
      <mesh position={[0.8, 0, 0.5]}>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial color="#2b6cb0" />
      </mesh>

      {/* Connection Wires: Small boxes representing wires coming out of the connection box */}
      <mesh position={[1.2, 0.2, 0.5]}>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color="#c53030" />
      </mesh>
      <mesh position={[1.2, 0, 0.5]}>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color="#38a169" />
      </mesh>
      <mesh position={[1.2, -0.2, 0.5]}>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color="#3182ce" />
      </mesh>
    </group>
  );
}

/**
 * MotorScene Component
 * Sets up the 3D environment for the Motor3D component, including lighting and camera controls.
 */
function MotorScene({ isRotating }) {
  return (
    <>
      {/* Ambient light to illuminate all objects equally */}
      <ambientLight intensity={0.5} />
      {/* Point lights for specific illumination and shadows */}
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4299e1" />
      {/* Render the 3D motor model */}
      <Motor3D isRotating={isRotating} />
      {/* OrbitControls allows users to rotate, zoom, and pan the camera */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        minDistance={3}
        maxDistance={10}
      />
      {/* PerspectiveCamera defines the view frustum */}
      <PerspectiveCamera makeDefault position={[0, 2, 5]} />
    </>
  );
}

/**
 * Dashboard Component
 * Manages the display of motors, allows adding new motors, and shows a 3D visualization.
 */
export default function Dashboard() {
  // Destructure motor management functions from the MotorsContext
  const { motors, addMotor, removeMotor } = useMotors();

  // State for new motor form inputs
  const [newMotorNameInput, setNewMotorNameInput] = useState('');
  const [newMotorLocation, setNewMotorLocation] = useState('');
  const [newMotorIdInput, setNewMotorIdInput] = useState('');
  // State to control visibility of the add motor form
  const [showAddMotorForm, setShowAddMotorForm] = useState(false);
  // State to store the current authenticated user's ID
  const [userId, setUserId] = useState(null);
  // State to store the currently selected motor for 3D visualization
  const [selectedMotor, setSelectedMotor] = useState(null);
  // State to control the rotation animation of the 3D motor
  const [isMotorRotating, setIsMotorRotating] = useState(false);

  /**
   * useEffect hook to get the current Firebase authenticated user
   * and fetch motors associated with their ID on component mount.
   */
  useEffect(() => {
    const auth = getAuth(); // Get the Firebase Auth instance
    const currentUser = auth.currentUser; // Get the current user

    if (currentUser) {
      const uid = currentUser.email; // Use email as UID for Supabase company_id
      setUserId(uid); // Set the userId state
      fetchMotors(uid); // Fetch motors for this user
    } else {
      console.warn("No authenticated Firebase user found.");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * useEffect hook to generate a suggested unique motor ID
   * and clear input fields when the add motor form is shown/hidden.
   */
  useEffect(() => {
    if (showAddMotorForm) {
      // Extract numeric parts from existing motor IDs
      const motorNumbers = motors
        .map(motor => {
          const motorIdString = String(motor.id);
          const match = motorIdString.match(/(\d+)$/); // Regex to find trailing numbers
          return match ? parseInt(match[1], 10) : 0; // Convert to integer, default to 0
        })
        .filter(num => !isNaN(num)); // Filter out any non-numeric results

      // Calculate the next available number for the motor ID
      const lastNumber = motorNumbers.length > 0 ? Math.max(...motorNumbers) : 0;
      const nextNumber = lastNumber + 1;
      // Format the number to be three digits (e.g., 1 -> 001)
      const formattedNextNumber = String(nextNumber).padStart(3, '0');
      // Construct the suggested motor ID
      const generatedId = `MOTOR-${formattedNextNumber}`;
      setNewMotorIdInput(generatedId); // Set the suggested ID in the input field
    } else {
      // Clear input fields when the form is closed
      setNewMotorIdInput('');
      setNewMotorNameInput('');
      setNewMotorLocation('');
    }
  }, [showAddMotorForm, motors]); // Depends on form visibility and current motors list

  /**
   * Asynchronously fetches motors from the Supabase database
   * for a given user ID (company_id).
   * @param {string} uid - The user's ID (company_id in Supabase).
   */
  const fetchMotors = async (uid) => {
    console.log(`DEBUG: fetchMotors called for UID: "${uid}"`);
    // Query Supabase for motors belonging to the current company_id
    const { data, error } = await supabase
      .from('motors')
      .select('motor_id, company_id, location, motor_name, installed_at')
      .eq('company_id', uid); // Filter by company_id

    if (error) {
      console.error('Error fetching motors from Supabase:', error);
      // Use a custom modal or toast for user feedback instead of alert()
      // For now, using alert as per instruction, but ideally this would be a better UI.
      alert('Failed to fetch motors from database.');
    } else {
      console.log("DEBUG: Motors data fetched:", data);
      // Add fetched motors to the application's state via MotorsContext
      data.forEach((motor) => {
        addMotor(
          motor.motor_id,
          motor.motor_name,
          motor.location,
          motor.company_id,
          null, // No current data for this example
          motor.installed_at
        );
      });
    }
  };

  /**
   * Handles the submission of the add new motor form.
   * Validates inputs, checks for unique motor ID, and inserts into Supabase.
   * @param {Event} e - The form submission event.
   */
  const handleAddMotor = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Trim input values to remove leading/trailing whitespace
    const motorId = newMotorIdInput.trim();
    const motorName = newMotorNameInput.trim();
    const location = newMotorLocation.trim();
    const currentCompanyId = userId; // Get the current user's ID

    // Basic validation for required fields
    if (!motorId || !motorName || !location || !currentCompanyId) {
      alert('Please fill in all fields: Motor Name, Unique Motor ID, and Location, and ensure you are logged in.');
      return;
    }

    // Check if a motor with the same ID already exists for this company
    const { data: existingMotors, error: fetchError } = await supabase
      .from('motors')
      .select('motor_id')
      .eq('motor_id', motorId)
      .eq('company_id', currentCompanyId);

    if (fetchError) {
      console.error('Error checking for existing motor ID:', fetchError);
      alert('Failed to verify motor ID uniqueness. Please try again.');
      return;
    }

    if (existingMotors && existingMotors.length > 0) {
      alert(`The Motor ID "${motorId}" already exists for your company. Please choose a different ID.`);
      return;
    }

    // Set the installation timestamp
    const installedAt = new Date().toISOString();

    // Insert the new motor into the Supabase 'motors' table
    const { error } = await supabase.from('motors').insert([
      {
        motor_id: motorId,
        motor_name: motorName,
        company_id: firebaseAuthInstance.currentUser.email, // Use Firebase auth email as company_id
        location: location,
        installed_at: installedAt,
      },
    ]);

    if (error) {
      console.error('Failed to insert new motor into Supabase:', error);
      alert('Failed to add motor. Please try again. Error: ' + error.message);
      return;
    }

    // Refresh the list of motors from the database and update context
    await fetchMotors(currentCompanyId);
    // Also add to the local context immediately for faster UI update
    addMotor(motorId, motorName, location, currentCompanyId, null, installedAt);

    // Clear form inputs and hide the form
    setNewMotorIdInput('');
    setNewMotorNameInput('');
    setNewMotorLocation('');
    setShowAddMotorForm(false);
  };

  /**
   * Handles the selection of a motor from the list,
   * triggering the display of the 3D animation modal.
   * @param {object} motor - The motor object to be selected.
   */
  const handleSelectMotor = (motor) => {
    setSelectedMotor(motor); // Set the selected motor
    setIsMotorRotating(true); // Start the 3D motor rotation
  };

  /**
   * Handles closing the 3D motor animation modal.
   * Stops the rotation and clears the selected motor after a brief delay.
   */
  const handleCloseAnimation = () => {
    setIsMotorRotating(false); // Stop the 3D motor rotation
    // Add a small timeout to allow the rotation to visibly stop before unmounting
    setTimeout(() => {
      setSelectedMotor(null); // Clear the selected motor to close the modal
    }, 300);
  };

  // Prepare motors data for display, ensuring 'lastUpdated' or 'installed_at' is formatted
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
            {/* Button to toggle the add motor form visibility */}
            <button
              onClick={() => setShowAddMotorForm(!showAddMotorForm)}
              className="dashboard-add-button"
            >
              {showAddMotorForm ? 'Close Form' : 'Add New Motor'}
            </button>
          </div>
        </div>

        {/* Add Motor Form: Conditionally rendered */}
        {showAddMotorForm && (
          <form className="add-motor-form" onSubmit={handleAddMotor}>
            <input
              type="text"
              placeholder="Descriptive Motor Name (e.g., HVAC Unit 1, Pump 3)"
              value={newMotorNameInput}
              onChange={(e) => setNewMotorNameInput(e.target.value)}
              className="dashboard-input"
              required
            />
            <input
              type="text"
              placeholder="Unique Motor ID (e.g., MOTOR-001 - must match hardware label)"
              value={newMotorIdInput}
              onChange={(e) => setNewMotorIdInput(e.target.value)}
              className="dashboard-input"
              required
            />
            <input
              type="text"
              placeholder="Location (e.g., Assembly Line A)"
              value={newMotorLocation}
              onChange={(e) => setNewMotorLocation(e.target.value)}
              className="dashboard-input"
              required
            />
            <button
              type="submit"
              className="dashboard-submit-button"
              disabled={!userId} // Disable if user is not logged in
            >
              Add Motor
            </button>
          </form>
        )}

        {/* 3D Motor Animation Modal: Conditionally rendered when a motor is selected */}
        {selectedMotor && (
          <div className="motor-animation-modal">
            <div className="motor-animation-header">
              <h2>{selectedMotor.name} - 3D Visualization</h2>
              {/* Close button for the modal */}
              <button
                className="close-animation-button"
                onClick={handleCloseAnimation}
              >
                ×
              </button>
            </div>
            <div className="motor-animation-content">
              {/* Canvas for the 3D scene */}
              <Canvas className="motor-canvas">
                <MotorScene isRotating={isMotorRotating} />
              </Canvas>
              {/* Panel displaying motor details and control buttons */}
              <div className="motor-info-panel">
                <h3>Motor Details</h3>
                <p><strong>ID:</strong> {selectedMotor.id}</p>
                <p><strong>Name:</strong> {selectedMotor.name}</p>
                <p><strong>Location:</strong> {selectedMotor.location}</p>
                <p><strong>Status:</strong> <span className="status-running">Running</span></p>
                <div className="control-buttons">
                  {/* Button to start/stop motor rotation */}
                  <button
                    className={isMotorRotating ? "control-button stop" : "control-button start"}
                    onClick={() => setIsMotorRotating(!isMotorRotating)}
                  >
                    {isMotorRotating ? "Stop Motor" : "Start Motor"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Motors Overview Section */}
        <h2 className="section-title">All Motors Overview</h2>
        <div className="dashboard-grid">
          {motors.length === 0 ? (
            // Message displayed if no motors are added yet
            <p className="no-motors-message">
              No motors added yet. Click "Add New Motor" to get started.
            </p>
          ) : (
            // Map through motors and display MotorDetailCard for each
            motorsForDisplay.map((motor) => (
              <div
                key={motor.id}
                onClick={() => handleSelectMotor(motor)} // Click to open 3D animation
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
    </div>
  );
}
