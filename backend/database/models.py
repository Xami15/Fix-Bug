from sqlalchemy import Column, String, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .db_utils import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String, unique=True, nullable=False)
    company_name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship: One user has many motors
    motors = relationship("Motor", back_populates="user", cascade="all, delete")


class Motor(Base):
    __tablename__ = "motors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    installed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship: One motor belongs to one user, and has many readings
    user = relationship("User", back_populates="motors")
    readings = relationship("SensorReading", back_populates="motor", cascade="all, delete")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    motor_id = Column(UUID(as_uuid=True), ForeignKey("motors.id"), nullable=False)
    accel_x = Column(Float, nullable=True)
    accel_y = Column(Float, nullable=True)
    accel_z = Column(Float, nullable=True)
    gyro_x = Column(Float, nullable=True)
    gyro_y = Column(Float, nullable=True)
    gyro_z = Column(Float, nullable=True)
    amplitude = Column(Float, nullable=True)
    angular_velocity = Column(Float, nullable=True)
    temp = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship: Each reading belongs to one motor
    motor = relationship("Motor", back_populates="readings")
