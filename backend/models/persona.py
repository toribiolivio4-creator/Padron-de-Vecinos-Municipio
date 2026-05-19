from sqlalchemy import Column, String, Date, Boolean
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
