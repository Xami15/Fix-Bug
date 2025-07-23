// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useMotors } from '../context/MotorsContext';
import MotorDetailCard from '../components/MotorDetailCard';
import './Dashboard.css';
import { supabase } from '../utils/supabase';
import { auth as firebaseAuthInstance } from '../firebaseConfig';

export default function Dashboard() {
  const { motors, addMotor, removeMotor } = useMotors();
  const [newMotorNameInput, setNewMotorNameInput] = useState('');
  const [newMotorLocation, setNewMotorLocation] = useState('');
  const [newMotorIdInput, setNewMotorIdInput] = useState('');
  const [showAddMotorForm, setShowAddMotorForm] = useState(false);
  const [userId, setUserId] = useState(null); // Firebase UID (email in this case)

  // --- Effect to get Firebase user on mount and fetch motors ---
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      const uid = currentUser.email; // Using email as UID for company_id in Supabase
      setUserId(uid);
      // Fetch motors associated with this user from Supabase
      fetchMotors(uid);
    } else {
      console.warn("No authenticated Firebase user found.");
    }
  }, []);

  // --- Effect to generate suggested motor ID and clear inputs ---
  useEffect(() => {
    if (showAddMotorForm) {
      const motorNumbers = motors
        .map(motor => {
          // Ensure motor.id is a string before calling .match()
          const motorIdString = String(motor.id);
          const match = motorIdString.match(/(\d+)$/); // Extracts trailing numbers
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num)); // Filter out any non-numeric results

      const lastNumber = motorNumbers.length > 0 ? Math.max(...motorNumbers) : 0;
      const nextNumber = lastNumber + 1;
      const formattedNextNumber = String(nextNumber).padStart(3, '0'); // e.g., 001, 010
      const generatedId = `MOTOR-${formattedNextNumber}`; // Consistent prefix
      setNewMotorIdInput(generatedId); // Pre-fill the input field
    } else {
        // Clear inputs when form is closed
        setNewMotorIdInput('');
        setNewMotorNameInput('');
        setNewMotorLocation('');
    }
  }, [showAddMotorForm, motors]); // Re-run if form visibility changes or motors list updates

  // --- Function to fetch motors from Supabase ---
  const fetchMotors = async (uid) => {
    console.log(`DEBUG: fetchMotors called for UID: "${uid}"`); // <-- Added for debugging
    // Select all necessary fields (company_name removed)
    const { data, error } = await supabase
      .from('motors')
      .select('motor_id, company_id, location, motor_name, installed_at')
      .eq('company_id', uid); // Filter motors by the logged-in user's company_id

    if (error) {
      console.error('Error fetching motors from Supabase:', error);
      alert('Failed to fetch motors from database.');
    } else {
      console.log("DEBUG: Motors data fetched:", data); // <-- Added for debugging
      // It's good practice to clear motors in context before re-adding
      // if fetchMotors is meant to be the single source of truth for the context's motors array.
      // Assuming addMotor handles potential duplicates or MotorsContext itself manages the array cleanly.
      data.forEach((motor) => {
        addMotor(
          motor.motor_id,
          motor.motor_name,
          motor.location,
          motor.company_id, // companyId (Firebase user email)
          null, // companyName is now null as it's removed
          motor.installed_at
        );
      });
    }
  };

  // --- Handler for adding a new motor ---
  const handleAddMotor = async (e) => {
    e.preventDefault();

    const motorId = newMotorIdInput.trim();
    const motorName = newMotorNameInput.trim();
    const location = newMotorLocation.trim();
    const currentCompanyId = userId; // This is the Firebase user email, acting as company_id

    // Basic validation for all required fields
    if (!motorId || !motorName || !location || !currentCompanyId) {
      alert('Please fill in all fields: Motor Name, Unique Motor ID, and Location, and ensure you are logged in.');
      return;
    }

    // --- MODIFIED: Uniqueness check against Supabase for (motor_id, company_id) composite ---
    // This checks if a motor with this ID already exists for *this specific company*
    const { data: existingMotors, error: fetchError } = await supabase
      .from('motors')
      .select('motor_id') // We just need to know if any record exists
      .eq('motor_id', motorId)
      .eq('company_id', currentCompanyId); // <--- Crucial: Check within the current company only

    if (fetchError) {
      console.error('Error checking for existing motor ID:', fetchError);
      alert('Failed to verify motor ID uniqueness. Please try again.');
      return;
    }

    if (existingMotors && existingMotors.length > 0) {
      // If any record is returned, the ID already exists for this company
      alert(`The Motor ID "${motorId}" already exists for your company. Please choose a different ID.`);
      return; // Stop the function here
    }
    // --- END MODIFIED Uniqueness check ---

    const installedAt = new Date().toISOString(); // Current timestamp for installation

    // Insert new motor into Supabase
    const { error } = await supabase.from('motors').insert([
      {
        motor_id: motorId,
        motor_name: motorName,
        company_id: firebaseAuthInstance.currentUser.email, // Use the renamed firebase auth instance
        location: location,
        installed_at: installedAt,
      },
    ]);

    if (error) {
      console.error('Failed to insert new motor into Supabase:', error);
      alert('Failed to add motor. Please try again. Error: ' + error.message);
      return;
    }

    // --- IMPORTANT: Re-fetch all motors for the current user after a successful add ---
    // This ensures the local `motors` state is fully updated, which is crucial for
    // the `useEffect` that suggests the next motor ID.
    await fetchMotors(currentCompanyId);

    // Add motor to local context state (this will trigger MQTT subscription in MotorsContext)
    // Passing null for companyName since it's removed
    addMotor(motorId, motorName, location, currentCompanyId, null, installedAt);

    // Clear form inputs and hide the form after successful addition
    setNewMotorIdInput('');
    setNewMotorNameInput('');
    setNewMotorLocation('');
    setShowAddMotorForm(false);
  };

  // --- Prepare motors data for display ---
  const motorsForDisplay = motors.map((motor) => ({
    ...motor,
    // Ensure lastUpdated is a Date object, fallback to installed_at (also converted to Date)
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
              onClick={() => setShowAddMotorForm(!showAddMotorForm)}
              className="dashboard-add-button"
            >
              {showAddMotorForm ? 'Close Form' : 'Add New Motor'}
            </button>
          </div>
        </div>

        {/* Add Motor Form */}
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
              value={newMotorIdInput} // Pre-filled with suggestion
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
              disabled={!userId} // Disable if user is not authenticated
            >
              Add Motor
            </button>
          </form>
        )}

        {/* All Motors Overview Section */}
        <h2 className="section-title">All Motors Overview</h2>
        <div className="dashboard-grid">
          {motors.length === 0 ? (
            <p className="no-motors-message">
              No motors added yet. Click "Add New Motor" to get started.
            </p>
          ) : (
            motorsForDisplay.map((motor) => (
              <MotorDetailCard
                key={motor.id} // Use motor.id as the unique key for React lists
                motor={motor}
                onDelete={() => removeMotor(motor.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}