from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.database import Base

class MedicineReminder(Base):
    __tablename__ = "medicine_reminders"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    medicine_name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)  # e.g. "500mg"
    frequency = Column(String, nullable=False)  # once_daily, twice_daily, three_times, custom
    reminder_times = Column(Text, nullable=False)  # JSON array of times ["08:00", "20:00"]
    instructions = Column(String, nullable=True)  # "After food", "Before sleep"
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)  # None = ongoing
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
