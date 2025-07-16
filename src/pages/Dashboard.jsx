import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useMotors } from '../context/MotorsContext';
import MotorDetailCard from '../components/MotorDetailCard';
import './Dashboard.css';
import { supabase } from '../utils/supabase';
import { auth } from '../firebaseConfig';

export default function Dashboard() {
  const { motors, addMotor, removeMotor } = useMotors();
  const [newMotorLocation, setNewMotorLocation] = useState('');
  const [newMotorIdInput, setNewMotorIdInput] = useState('');
  const [showAddMotorForm, setShowAddMotorForm] = useState(false);
  const [userId, setUserId] = useState(null); // Firebase UID

  // ✅ Get Firebase user on mount
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

  // ✅ Fetch only motors belonging to current Firebase user
  const fetchMotors = async (uid) => {
    const { data, error } = await supabase
      .from('motors')
      .select('*')
      .eq('user_id', uid);

    if (error) {
      console.error('Error fetching motors from Supabase:', error);
    } else {
      data.forEach((motor) => {
        addMotor(motor.motor_id, motor.company_id, motor.location);
      });
    }
  };

  const handleAddMotor = async (e) => {
    e.preventDefault();

    const motorId = newMotorIdInput.trim();
    const location = newMotorLocation.trim();

    if (!motorId || !location || !userId) return;

    if (motors.some((motor) => motor.id === motorId)) {
      console.warn(`Motor with ID "${motorId}" already exists.`);
      return;
    }

    const { error } = await supabase.from('motors').insert([
      {
        motor_id: motorId,
        company_id: auth.currentUser.email, // Firebase UID as company_id
        location: location,
      
      },
    ]);

    if (error) {
      console.error('Failed to insert new motor into Supabase:', error);
      return;
    }

    addMotor(motorId, userId, location);
    setNewMotorIdInput('');
    setNewMotorLocation('');
    setShowAddMotorForm(false);
  };

  const motorsForDisplay = motors.map((motor) => ({
    ...motor,
    displayLastUpdated: motor.lastUpdated
      ? motor.lastUpdated.toLocaleTimeString()
      : 'N/A',
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

        {showAddMotorForm && (
          <form className="add-motor-form" onSubmit={handleAddMotor}>
            <input
              type="text"
              placeholder="Unique Motor ID (e.g., HVAC-001)"
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
              disabled={!userId}
            >
              Add Motor
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
              <MotorDetailCard
                key={motor.id}
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
