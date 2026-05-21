# Schema auto-generado para "personas" — NO EDITAR MANUALMENTE
# Generado desde form-definitions.json

from pydantic import BaseModel, Field
from pydantic import EmailStr
from datetime import date
from typing import Optional


class PersonaBase(BaseModel):
    """Schema base con campos de solo lectura."""

    dni: str = Field(..., description="DNI")
    nombres: str = Field(..., description="Nombre/s")
    apellidos: str = Field(..., description="Apellido/s")
    fecha_nacimiento: date = Field(..., description="Fecha de Nacimiento")
    sexo: Optional[str] = Field(None, description="Sexo")
    celular: Optional[str] = Field(None, description="Teléfono")
    email: Optional[EmailStr] = Field(None, description="Email")
    domicilio: Optional[str] = Field(None, description="Domicilio")
    localidad: Optional[str] = Field(None, description="Localidad")
    ocupacion: Optional[str] = Field(None, description="Ocupación")
    nivel_estudios: str = Field("No especificado", description="Nivel de estudios")
    jubilado: bool = Field(False, description="Jubilado")
    pensionado: bool = Field(False, description="Pensionado")
    obra_social: Optional[str] = Field(None, description="Obra Social")
    fecha_jubilacion: Optional[date] = Field(None, description="Fecha de Jubilación")
    tipo_pension: Optional[str] = Field(None, description="Tipo de Pensión")
    grupo_sanguineo: Optional[str] = Field(None, description="Grupo Sanguíneo")
    tipo_vivienda: Optional[str] = Field(None, description="Tipo de Vivienda")

    class Config:
        from_attributes = True


class PersonaCreate(PersonaBase):
    """Schema para crear/actualizar registros."""
    pass
