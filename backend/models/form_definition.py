from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean
from sqlalchemy.sql import func
from backend.db.database import Base


class FormDefinition(Base):
    __tablename__ = "form_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    prefix = Column(String, nullable=False)
    tags = Column(String, nullable=True)  # JSON array como string
    primary_key = Column(String, default="id")
    model_name = Column(String, nullable=False)
    table_name = Column(String, nullable=True)
    definition = Column(Text, nullable=False)  # JSON completo de la definición
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FormFieldMigration(Base):
    __tablename__ = "form_field_migrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    form_name = Column(String, nullable=False)
    table_name = Column(String, nullable=False)
    column_name = Column(String, nullable=False)
    column_type = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, applied, failed
    error = Column(Text, nullable=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
