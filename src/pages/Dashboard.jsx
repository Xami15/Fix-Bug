import React, { useState, useEffect } from 'react';
import { useMotors } from '../context/MotorsContext';
import MotorDetailCard from '../components/MotorDetailCard';
import './Dashboard.css';
import { supabase } from '../utils/supabase';

export default function Dashboard() {
  const { motors, addMotor, removeMotor } = useMotors();
  const [newMotorName, setNewMotorName] = useState('');
  const [newMotorLocation, setNewMotorLocation] = useState('');
  const [newMotorIdInput, setNewMotorIdInput] = useState('');
  const [showAddMotorForm, setShowAddMotorForm] = useState(false);
  const [userId, setUserId] = useState(null);

  // ✅ Get current user ID on mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching current user:", error);
      } else {
        setUserId(user.id);
        fetchMotors(user.id);
      }
    };

    fetchUser();
  }, []);

  // ✅ Fetch only motors belonging to current user
  const fetchMotors = async (user_id) => {
    const { data, error } = await supabase
      .from('motors')
      .select('*')
      .eq('user_id', user_id); // Only fetch motors for this user

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
    const companyName = newMotorName.trim();
    const location = newMotorLocation.trim();

    if (!motorId || !companyName || !location || !userId) return;

    if (motors.some((motor) => motor.id === motorId)) {
      console.warn(`Motor with ID "${motorId}" already exists.`);
      return;
    }

    const { error } = await supabase.from('motors').insert([
      {
        motor_id: motorId,
        company_id: companyName,
        location: location,
        user_id: userId, // ✅ Attach current user ID
      },
    ]);

    if (error) {
      console.error('Failed to insert new motor into Supabase:', error);
      return;
    }

    addMotor(motorId, companyName, location);
    setNewMotorIdInput('');
    setNewMotorName('');
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
              placeholder="Motor Name (e.g., Main Fan Motor)"
              value={newMotorName}
              onChange={(e) => setNewMotorName(e.target.value)}
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
            <button type="submit" className="dashboard-submit-button">
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
