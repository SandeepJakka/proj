from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from app.db.database import Base


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String, nullable=False)
    relation = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    blood_type = Column(String, nullable=True)
    known_conditions = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    avatar_color = Column(String, default='#2563EB')
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FamilyMemberReport(Base):
    __tablename__ = "family_member_reports"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("family_members.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    local_path = Column(String, nullable=True)
    summary_text = Column(Text, nullable=True)
    report_type = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
