from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.database import Base

class HealthPlan(Base):
    __tablename__ = "health_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    plan_type = Column(String, nullable=False)  # "nutrition" or "fitness"
    plan_content = Column(Text, nullable=False)  # The full plan markdown
    goal = Column(String, nullable=True)
    is_current = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
