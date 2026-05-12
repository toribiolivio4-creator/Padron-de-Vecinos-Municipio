from sqlalchemy import Column, String, Date, Boolean, ForeignKey, DateTime, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base


class Persona(Base):
    __tablename__ = "personas"

    dni = Column(String, primary_key=True, index=True)
    nombres = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    celular = Column(String, nullable=False)
    fecha_nacimiento = Column(Date, nullable=False)
    localidad = Column(String, nullable=False)
    domicilio = Column(String, nullable=True)
    email = Column(String, nullable=True)
    sexo = Column(String, nullable=True)
    ocupacion = Column(String, nullable=True)
    jubilado = Column(Boolean, default=False)
    pensionado = Column(Boolean, default=False)
    nivel_estudios = Column(String, nullable=True)
    activo = Column(Boolean, default=True)


class InscripcionFeria(Base):
    __tablename__ = "inscripciones_ferias"

    dni_persona = Column(String, ForeignKey("personas.dni"), primary_key=True)
    instagram_facebook = Column(String, nullable=False)
    rubro = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)

    persona = relationship("Persona")


class LogEvento(Base):
    __tablename__ = "logs_eventos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    nivel = Column(String(10), nullable=False)   # INFO, WARNING, ERROR
    accion = Column(String(20), nullable=False)   # AGREGAR, ACTUALIZAR, ELIMINAR, ERROR
    modulo = Column(String(50), nullable=False)
    dni = Column(String, nullable=True)
    nombre = Column(String, nullable=True)
    campos = Column(Text, nullable=True)          # JSON o "k=v, k=v" serializado
    error = Column(Text, nullable=True)
