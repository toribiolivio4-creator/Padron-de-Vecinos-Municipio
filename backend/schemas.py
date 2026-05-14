# schemas.py
from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional


# ---------------------------------------------------------
# ESQUEMA BASE: Campos que comparten ambos formularios
# ---------------------------------------------------------
class PersonaBase(BaseModel):
    dni: str = Field(..., description="DNI del ciudadano (clave primaria)", example="28456789")
    nombres: str = Field(..., description="Nombres del ciudadano", example="Juan Carlos")
    apellidos: str = Field(..., description="Apellidos del ciudadano", example="Gómez")
    celular: Optional[str] = Field(None, description="Número de celular con código de área", example="2994123456")
    fecha_nacimiento: Optional[date] = Field(None, description="Fecha de nacimiento (YYYY-MM-DD)", example="1985-06-15")
    localidad: Optional[str] = Field(None, description="Localidad de residencia", example="Neuquén Capital")
    domicilio: Optional[str] = Field(None, description="Dirección completa", example="Av. Argentina 1234")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico", example="juan@email.com")

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# FORMULARIO 1: Inscripción a Ferias
# ---------------------------------------------------------
class FeriaCreate(PersonaBase):
    instagram_facebook: str = Field(
        ...,
        alias="pagina_redes",
        description="Usuario o URL de redes sociales (Instagram o Facebook)",
        example="@juan_artesanias",
    )
    rubro: str = Field(..., description="Rubro o categoría del puesto en la feria", example="Artesanías en cuero")
    descripcion: str = Field(
        ...,
        description="Descripción de los productos o servicios que ofrece",
        example="Venta de cintos, billeteras y accesorios de cuero artesanal.",
    )

    class Config:
        populate_by_name = True


# ---------------------------------------------------------
# FORMULARIO 2: Padrón de Vecinos
# ---------------------------------------------------------
class PadronCreate(PersonaBase):
    jubilado: bool = Field(False, description="Indica si el ciudadano es jubilado")
    pensionado: bool = Field(False, description="Indica si el ciudadano percibe una pensión")
    sexo: Optional[str] = Field(None, description="Género del ciudadano", example="Masculino")
    ocupacion: Optional[str] = Field(None, description="Ocupación o profesión", example="Docente")
    nivel_estudios: Optional[str] = Field(
        "No especificado",
        description="Nivel educativo alcanzado",
        example="Universitario completo",
    )

    class Config:
        from_attributes = True


# ---------------------------------------------------------
# ESQUEMA PARA BÚSQUEDA (Search Combobox)
# ---------------------------------------------------------
class PersonaSearchResponse(BaseModel):
    dni: str = Field(..., examples="28456789")
    nombres: str = Field(..., examples="Juan Carlos")
    apellidos: str = Field(..., examples="Gómez")

    class Config:
        from_attributes = True