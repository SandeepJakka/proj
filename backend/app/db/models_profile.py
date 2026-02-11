from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class HealthProfile(Base):
    __tablename__ = "health_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    
    # Basic Demographics
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True) # "Male", "Female", "Other"
    
    # Vitals / Metrics
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    blood_type = Column(String, nullable=True)
    
    # Lifestyle
    activity_level = Column(String, nullable=True) # "Sedentary", "Light", "Moderate", "Active"
    dietary_preferences = Column(Text, nullable=True) # JSON or comma-separated
    
    # Medical Context (Self-reported, non-verified)
    known_conditions = Column(Text, nullable=True) # e.g., "Asthma, Hypertension"
    allergies = Column(Text, nullable=True)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
