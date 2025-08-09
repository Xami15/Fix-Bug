const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class AIPredictionService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/ai`;
  }

  // Helper method for API calls
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Prediction API Error:', error);
      throw error;
    }
  }

  // Real-time motor health prediction using CNN model
  async predictRealtime(motors) {
    try {
      // Prepare data for the new ML model
      const preparedMotors = motors.map(motor => ({
        motor_id: motor.motor_id || motor.id,
        temperature: motor.temperature || 0,
        vibration: motor.vibration || 0,
        acceleration_x: motor.acceleration_x || 0,
        acceleration_y: motor.acceleration_y || 0,
        acceleration_z: motor.acceleration_z || 9.8,
        timestamp: motor.timestamp || new Date().toISOString()
      }));

      const response = await this.makeRequest('/predict/realtime', {
        method: 'POST',
        body: JSON.stringify({ motors: preparedMotors }),
      });

      return response;
    } catch (error) {
      console.error('Real-time prediction failed:', error);
      throw error;
    }
  }

  // Analyze CSV data
  async analyzeCSV(csvData) {
    try {
      const response = await this.makeRequest('/predict/csv', {
        method: 'POST',
        body: JSON.stringify({ csv_data: csvData }),
      });

      return response;
    } catch (error) {
      console.error('CSV analysis failed:', error);
      throw error;
    }
  }

  // Upload and analyze CSV file
  async uploadAndAnalyzeCSV(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseURL}/predict/csv-upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('CSV upload and analysis failed:', error);
      throw error;
    }
  }

  // Predict single motor health using CNN model
  async predictSingleMotor(motorData) {
    try {
      // Prepare data for the new ML model
      const preparedData = {
        motor_id: motorData.motor_id || motorData.id,
        temperature: motorData.temperature || 0,
        vibration: motorData.vibration || 0,
        acceleration_x: motorData.acceleration_x || 0,
        acceleration_y: motorData.acceleration_y || 0,
        acceleration_z: motorData.acceleration_z || 9.8,
        timestamp: motorData.timestamp || new Date().toISOString()
      };

      const response = await this.makeRequest('/predict/single', {
        method: 'POST',
        body: JSON.stringify(preparedData),
      });

      return response;
    } catch (error) {
      console.error('Single motor prediction failed:', error);
      throw error;
    }
  }

  // Get model information
  async getModelInfo() {
    try {
      const response = await this.makeRequest('/model/info', {
        method: 'GET',
      });

      return response;
    } catch (error) {
      console.error('Failed to get model info:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET',
      });

      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Simulate real-time predictions (fallback when API is not available)
  simulateRealtimePrediction(motors) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const predictions = motors.map((motor) => {
          const temp = parseFloat(motor.temperature) || 25;
          const vib = parseFloat(motor.vibration) || 3;
          
          // Simple rule-based prediction
          let prediction = 'Healthy';
          let confidence = 90;
          let insights = [];

          if (temp > 40 || vib > 8) {
            prediction = 'Critical Fault';
            confidence = 95;
            insights = [
              'High probability of bearing failure',
              'Immediate maintenance required',
              'Risk of catastrophic failure'
            ];
          } else if (temp > 30 || vib > 5) {
            prediction = 'Warning';
            confidence = 85;
            insights = [
              'Elevated wear indicators detected',
              'Schedule maintenance within 48 hours',
              'Monitor closely for degradation'
            ];
          } else {
            insights = [
              'All parameters within normal range',
              'Optimal performance detected',
              'No immediate action required'
            ];
          }

          return {
            motor_id: motor.id,
            motor_name: motor.name,
            prediction,
            confidence,
            insights,
            risk_score: Math.min(1, Math.max(0, (temp - 20) / 30 * 0.6 + (vib - 1) / 10 * 0.4)),
            timestamp: new Date().toISOString(),
            features: {
              temperature: motor.temperature,
              vibration: motor.vibration,
              current: motor.current || 5,
              speed: motor.speed || 1500
            }
          };
        });

        resolve({
          success: true,
          predictions,
          timestamp: new Date().toISOString(),
          model_info: {
            model_type: 'Simulated',
            n_features: 4,
            model_loaded: true
          }
        });
      }, 1000 + Math.random() * 2000); // Simulate processing time
    });
  }

  // Simulate CSV analysis (fallback when API is not available)
  simulateCSVAnalysis(csvData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Simulating CSV analysis with data:', csvData.slice(0, 3));
        
        const results = csvData.map((row, index) => {
          // Debug: Log the row data to see what we're working with
          console.log(`Processing row ${index}:`, row);
          
          // Handle different possible field names and data types
          let temp = 25; // Default temperature
          let vib = 1.0; // Default vibration
          
          // Try to extract temperature value
          if (row.temperature !== undefined && row.temperature !== null && row.temperature !== '') {
            temp = parseFloat(row.temperature);
          } else if (row.temp !== undefined && row.temp !== null && row.temp !== '') {
            temp = parseFloat(row.temp);
          }
          
          // Try to extract vibration value
          if (row.vibration !== undefined && row.vibration !== null && row.vibration !== '') {
            vib = parseFloat(row.vibration);
          } else if (row.vib !== undefined && row.vib !== null && row.vib !== '') {
            vib = parseFloat(row.vib);
          }
          
          // Validate the parsed values
          if (isNaN(temp)) {
            console.warn(`Invalid temperature value in row ${index}:`, row.temperature);
            temp = 25; // Use default
          }
          if (isNaN(vib)) {
            console.warn(`Invalid vibration value in row ${index}:`, row.vibration);
            vib = 1.0; // Use default
          }
          
          console.log(`Row ${index} parsed values - Temp: ${temp}, Vib: ${vib}`);
          
          let prediction = 'Healthy';
          let confidence = 90;

          if (temp > 40 || vib > 8) {
            prediction = 'Critical Fault';
            confidence = 95;
          } else if (temp > 30 || vib > 5) {
            prediction = 'Warning';
            confidence = 85;
          }

          return {
            motor_id: row.motor_id || row.id || `historical_${index}`,
            motor_name: row.motor_name || row.name || `Historical Motor ${index}`,
            prediction,
            confidence,
            insights: [
              prediction === 'Healthy' ? 'Normal operation' : 'Anomaly detected',
              'Historical analysis complete'
            ],
            risk_score: Math.min(1, Math.max(0, (temp - 20) / 30 * 0.6 + (vib - 1) / 10 * 0.4)),
            timestamp: row.timestamp || new Date().toISOString(),
            features: {
              temperature: temp,
              vibration: vib,
              current: parseFloat(row.current || 5),
              speed: parseFloat(row.speed || 1500)
            }
          };
        });

        console.log('Simulation results:', results.slice(0, 3));

        resolve({
          success: true,
          results,
          total_records: csvData.length,
          timestamp: new Date().toISOString(),
          model_info: {
            model_type: 'Simulated',
            n_features: 4,
            model_loaded: true
          }
        });
      }, 2000 + Math.random() * 3000); // Simulate processing time
    });
  }
}

// Create and export a singleton instance
const aiPredictionService = new AIPredictionService();
export default aiPredictionService; 