-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create motors table
CREATE TABLE motors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES users(id),
    name VARCHAR NOT NULL,
    location VARCHAR NOT NULL,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create sensor_data table
CREATE TABLE sensor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    motor_id UUID REFERENCES motors(id),
    acceleration_x DECIMAL NOT NULL,
    acceleration_y DECIMAL NOT NULL,
    acceleration_z DECIMAL NOT NULL,
    gyro_x DECIMAL NOT NULL,
    gyro_y DECIMAL NOT NULL,
    gyro_z DECIMAL NOT NULL,
    amplitude DECIMAL NOT NULL,
    angular_velocity DECIMAL NOT NULL,
    temperature DECIMAL NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better query performance
CREATE INDEX idx_motors_company_id ON motors(company_id);
CREATE INDEX idx_sensor_data_motor_id ON sensor_data(motor_id);
CREATE INDEX idx_sensor_data_timestamp ON sensor_data(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE motors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Company owners can view their motors" ON motors
    FOR SELECT
    USING (auth.uid() = company_id);

CREATE POLICY "Users can view sensor data for their motors" ON sensor_data
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM motors
            WHERE motors.id = sensor_data.motor_id
            AND motors.company_id = auth.uid()
        )
    );