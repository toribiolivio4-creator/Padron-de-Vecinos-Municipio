from sqlalchemy import Column, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

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
    activo = Column(Boolean, default=True)   # ← NUEVO para soft delete

class InscripcionFeria(Base):
    __tablename__ = "inscripciones_ferias"

    dni_persona = Column(String, ForeignKey("personas.dni"), primary_key=True)
    instagram_facebook = Column(String, nullable=False)
    rubro = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)

    persona = relationship("Persona")