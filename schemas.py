# schemas.py
from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional

# ---------------------------------------------------------
# ESQUEMA BASE: Campos que comparten ambos formularios
# ---------------------------------------------------------
class PersonaBase(BaseModel):
    dni: str = Field(..., description="DNI del ciudadano (Llave Primaria)")
    nombres: str
    apellidos: str
    celular: str
    fecha_nacimiento: date
    localidad: str
    domicilio: Optional[str] = None
    email: Optional[EmailStr] = None

    class Config:
        # Permite que Pydantic trabaje con objetos de SQLAlchemy (ORM)
        from_attributes = True


# ---------------------------------------------------------
# FORMULARIO 1: Inscripción a Ferias
# ---------------------------------------------------------
class FeriaCreate(PersonaBase):
    instagram_facebook: str = Field(..., alias="pagina_redes")
    rubro: str
    descripcion: str

    class Config:
        populate_by_name = True


# ---------------------------------------------------------
# FORMULARIO 2: Padrón de Vecinos
# ---------------------------------------------------------
class PadronCreate(PersonaBase):
    jubilado: bool = False
    pensionado: bool = False
    sexo: str
    ocupacion: str
    # Campos recomendados / opcionales
    nivel_estudios: Optional[str] = "No especificado"

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# ESQUEMA PARA BÚSQUEDA (Search Combobox)
# ---------------------------------------------------------
class PersonaSearchResponse(BaseModel):
    dni: str
    nombres: str
    apellidos: str

    class Config:
        from_attributes = True