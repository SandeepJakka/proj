from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.db.database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # keep nullable for now
    filename = Column(String, nullable=False)
    file_type = Column(String)  # pdf | image
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ReportExtract(Base):
    __tablename__ = "report_extracts"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), index=True)
    raw_text = Column(Text)
    entities_json = Column(Text)  # store JSON as string for MVP
    summary_text = Column(Text)
    medical_analysis_json = Column(Text, nullable=True)  # Cache for LLM result
    created_at = Column(DateTime(timezone=True), server_default=func.now())
