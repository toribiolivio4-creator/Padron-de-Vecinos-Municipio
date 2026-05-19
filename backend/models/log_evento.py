from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.sql import func
from backend.database import Base


class LogEvento(Base):
    __tablename__ = "logs_eventos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    nivel = Column(String(10), nullable=False)
    accion = Column(String(20), nullable=False)
    modulo = Column(String(50), nullable=False)
    dni = Column(String, nullable=True)
    nombre = Column(String, nullable=True)
    campos = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
