// Unit Converter Utility for Motor Monitoring Dashboard
// Ensures consistent units across all pages and components

export class UnitConverter {
  // Temperature conversions
  static celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }

  static fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
  }

  static kelvinToCelsius(kelvin) {
    return kelvin - 273.15;
  }

  static celsiusToKelvin(celsius) {
    return celsius + 273.15;
  }

  // Vibration conversions
  static mps2ToG(mps2) {
    return mps2 / 9.80665;
  }

  static gToMps2(g) {
    return g * 9.80665;
  }

  static mmpsToMps2(mmps) {
    return mmps / 1000;
  }

  static mps2ToMmps(mps2) {
    return mps2 * 1000;
  }

  // Frequency conversions
  static hzToRpm(hz) {
    return hz * 60;
  }

  static rpmToHz(rpm) {
    return rpm / 60;
  }

  // Pressure conversions
  static paToPsi(pa) {
    return pa * 0.000145038;
  }

  static psiToPa(psi) {
    return psi / 0.000145038;
  }

  // Power conversions
  static wattsToHp(watts) {
    return watts * 0.00134102;
  }

  static hpToWatts(hp) {
    return hp / 0.00134102;
  }

  // Speed conversions
  static mpsToKph(mps) {
    return mps * 3.6;
  }

  static kphToMps(kph) {
    return kph / 3.6;
  }

  // Format numbers with appropriate units
  static formatTemperature(value, unit = 'C') {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    const rounded = Math.round(value * 100) / 100;
    return `${rounded}°${unit}`;
  }

  static formatVibration(value, unit = 'm/s²') {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    const rounded = Math.round(value * 1000) / 1000;
    return `${rounded} ${unit}`;
  }

  static formatFrequency(value, unit = 'Hz') {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    const rounded = Math.round(value * 100) / 100;
    return `${rounded} ${unit}`;
  }

  static formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    
    const rounded = Math.round(value * 100) / 100;
    return `${rounded}%`;
  }

  // Convert sensor data to standard units
  static standardizeSensorData(data) {
    const standardized = { ...data };
    
    // Standardize temperature to Celsius
    if (data.temperature !== undefined && data.temperature !== null) {
      if (data.temperature_unit === 'F') {
        standardized.temperature = this.fahrenheitToCelsius(data.temperature);
        standardized.temperature_unit = 'C';
      } else if (data.temperature_unit === 'K') {
        standardized.temperature = this.kelvinToCelsius(data.temperature);
        standardized.temperature_unit = 'C';
      }
    }
    
    // Standardize vibration to m/s²
    if (data.vibration !== undefined && data.vibration !== null) {
      if (data.vibration_unit === 'g') {
        standardized.vibration = this.gToMps2(data.vibration);
        standardized.vibration_unit = 'm/s²';
      } else if (data.vibration_unit === 'mm/s') {
        standardized.vibration = this.mmpsToMps2(data.vibration);
        standardized.vibration_unit = 'm/s²';
      }
    }
    
    return standardized;
  }

  // Get appropriate unit for display based on value range
  static getOptimalUnit(value, unitType) {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }

    switch (unitType) {
      case 'temperature':
        if (Math.abs(value) < 1) {
          return { value: value * 1000, unit: 'm°C', label: 'Millidegrees Celsius' };
        } else if (Math.abs(value) > 1000) {
          return { value: value / 1000, unit: 'k°C', label: 'Kilodegrees Celsius' };
        } else {
          return { value: value, unit: '°C', label: 'Degrees Celsius' };
        }
      
      case 'vibration':
        if (Math.abs(value) < 0.001) {
          return { value: value * 1000000, unit: 'μm/s²', label: 'Micrometers per second squared' };
        } else if (Math.abs(value) < 1) {
          return { value: value * 1000, unit: 'mm/s²', label: 'Millimeters per second squared' };
        } else if (Math.abs(value) > 1000) {
          return { value: value / 1000, unit: 'km/s²', label: 'Kilometers per second squared' };
        } else {
          return { value: value, unit: 'm/s²', label: 'Meters per second squared' };
        }
      
      case 'frequency':
        if (Math.abs(value) < 0.001) {
          return { value: value * 1000000, unit: 'μHz', label: 'Microhertz' };
        } else if (Math.abs(value) < 1) {
          return { value: value * 1000, unit: 'mHz', label: 'Millihertz' };
        } else if (Math.abs(value) > 1000) {
          return { value: value / 1000, unit: 'kHz', label: 'Kilohertz' };
        } else {
          return { value: value, unit: 'Hz', label: 'Hertz' };
        }
      
      default:
        return { value: value, unit: '', label: 'Unknown unit' };
    }
  }

  // Convert motor data for different display contexts
  static convertForDisplay(motorData, displayPreferences = {}) {
    const converted = { ...motorData };
    
    // Apply temperature conversion if needed
    if (displayPreferences.temperatureUnit && motorData.temperature !== undefined) {
      switch (displayPreferences.temperatureUnit) {
        case 'F':
          converted.temperature = this.celsiusToFahrenheit(motorData.temperature);
          converted.temperature_unit = 'F';
          break;
        case 'K':
          converted.temperature = this.celsiusToKelvin(motorData.temperature);
          converted.temperature_unit = 'K';
          break;
        default:
          converted.temperature_unit = 'C';
      }
    }
    
    // Apply vibration conversion if needed
    if (displayPreferences.vibrationUnit && motorData.vibration !== undefined) {
      switch (displayPreferences.vibrationUnit) {
        case 'g':
          converted.vibration = this.mps2ToG(motorData.vibration);
          converted.vibration_unit = 'g';
          break;
        case 'mm/s':
          converted.vibration = this.mps2ToMmps(motorData.vibration);
          converted.vibration_unit = 'mm/s';
          break;
        default:
          converted.vibration_unit = 'm/s²';
      }
    }
    
    return converted;
  }

  // Validate sensor data ranges
  static validateSensorRanges(data) {
    const warnings = [];
    
    // Temperature validation (assuming Celsius)
    if (data.temperature !== undefined && data.temperature !== null) {
      if (data.temperature < -50 || data.temperature > 200) {
        warnings.push(`Temperature value ${data.temperature}°C is outside normal range (-50°C to 200°C)`);
      }
    }
    
    // Vibration validation (assuming m/s²)
    if (data.vibration !== undefined && data.vibration !== null) {
      if (data.vibration < 0 || data.vibration > 100) {
        warnings.push(`Vibration value ${data.vibration} m/s² is outside normal range (0 to 100 m/s²)`);
      }
    }
    
    // Confidence validation
    if (data.confidence !== undefined && data.confidence !== null) {
      if (data.confidence < 0 || data.confidence > 100) {
        warnings.push(`Confidence value ${data.confidence}% is outside normal range (0% to 100%)`);
      }
    }
    
    return warnings;
  }

  // Get unit conversion factors
  static getConversionFactors() {
    return {
      temperature: {
        C_to_F: 9/5,
        C_to_K: 1,
        F_to_C: 5/9,
        K_to_C: 1
      },
      vibration: {
        mps2_to_g: 1/9.80665,
        g_to_mps2: 9.80665,
        mps2_to_mmps: 1000,
        mmps_to_mps2: 1/1000
      },
      frequency: {
        hz_to_rpm: 60,
        rpm_to_hz: 1/60
      }
    };
  }
}

// Default export
export default UnitConverter; 