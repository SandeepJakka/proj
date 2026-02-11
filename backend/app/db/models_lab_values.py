"""
Database models for structured lab values.

This enables deterministic trend analysis by storing parsed numeric values
separately from raw text summaries.
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func
from app.db.database import Base


class LabValue(Base):
    """Structured lab test results extracted from reports"""
    __tablename__ = "lab_values"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    
    # Lab test identification
    test_name = Column(String, nullable=False, index=True)  # e.g., "Hemoglobin"
    value = Column(Float, nullable=False)  # e.g., 12.5
    unit = Column(String, nullable=False)  # e.g., "g/dL"
    
    # Reference range (if extracted from report)
    normal_range_min = Column(Float, nullable=True)
    normal_range_max = Column(Float, nullable=True)
    
    # Clinical evaluation (from ReferenceRangeEngine)
    status = Column(String, nullable=True)  # "low", "normal", "high", "critical_low", "critical_high"
    severity = Column(String, nullable=True)  # "mild", "moderate", "severe"
    delta = Column(Float, nullable=True)  # Difference from boundary
    
    # Interpretation
    interpretation = Column(String, nullable=True)  # Human-readable explanation
    
    # Metadata
    extraction_confidence = Column(Float, default=0.0)  # Parser confidence (0-1)
    raw_text = Column(String, nullable=True)  # Original text snippet
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Optional: Store full evaluation details as JSON
    evaluation_details = Column(JSON, nullable=True)
