from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean
from sqlalchemy.sql import func
from backend.db.database import Base


class FormSubmission(Base):
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_name = Column(String, nullable=False, index=True)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
