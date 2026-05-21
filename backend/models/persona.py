from sqlalchemy import Column, String, Date, Boolean
from backend.database import Base


class Persona(Base):
    __tablename__ = "personas"

    dni = Column(String, primary_key=True, index=True)
    nombres = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    celular = Column(String, nullable=True)
    fecha_nacimiento = Column(Date, nullable=False)
    localidad = Column(String, nullable=True)
    domicilio = Column(String, nullable=True)
    email = Column(String, nullable=True)
    sexo = Column(String, nullable=True)
    ocupacion = Column(String, nullable=True)
    jubilado = Column(Boolean, default=False)
    pensionado = Column(Boolean, default=False)
    nivel_estudios = Column(String, nullable=True)
    obra_social = Column(String, nullable=True)
    fecha_jubilacion = Column(Date, nullable=True)
    tipo_pension = Column(String, nullable=True)
    grupo_sanguineo = Column(String, nullable=True)
    tipo_vivienda = Column(String, nullable=True)
    activo = Column(Boolean, default=True)
