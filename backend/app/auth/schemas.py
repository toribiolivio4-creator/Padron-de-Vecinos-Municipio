from pydantic import BaseModel
from datetime import date
from typing import Optional


class GoogleFormsPadron(BaseModel):
    dni: str
    nombres: str
    apellidos: str
    celular: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    localidad: Optional[str] = None
    domicilio: Optional[str] = None
    email: Optional[str] = None
    sexo: Optional[str] = None
    ocupacion: Optional[str] = None
    jubilado: bool = False
    pensionado: bool = False
    nivel_estudios: Optional[str] = None
