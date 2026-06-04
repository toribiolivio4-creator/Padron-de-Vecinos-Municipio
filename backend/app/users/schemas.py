from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional


class PersonaBase(BaseModel):
    dni: str = Field(..., description="DNI", examples=["28456789"])
    nombres: str = Field(..., description="Nombre/s", examples=["Juan Carlos"])
    apellidos: str = Field(..., description="Apellido/s", examples=["Gomez"])
    fecha_nacimiento: Optional[date] = Field(None, description="Fecha de Nacimiento", example="1985-06-15")
    sexo: Optional[str] = Field(None, description="Sexo")
    celular: Optional[str] = Field(None, description="Telefono", example="2994123456")
    email: Optional[EmailStr] = Field(None, description="Email", example="juan@email.com")
    domicilio: Optional[str] = Field(None, description="Domicilio", example="Av. Argentina 1234")
    localidad: Optional[str] = Field(None, description="Localidad", example="Neuquen Capital")
    ocupacion: Optional[str] = Field(None, description="Ocupacion", example="Docente")
    nivel_estudios: Optional[str] = Field("No especificado", description="Nivel de estudios")
    jubilado: bool = Field(False, description="Jubilado")
    pensionado: bool = Field(False, description="Pensionado")
    obra_social: Optional[str] = Field(None, description="Obra Social")
    fecha_jubilacion: Optional[date] = Field(None, description="Fecha de Jubilacion")
    tipo_pension: Optional[str] = Field(None, description="Tipo de Pension")
    grupo_sanguineo: Optional[str] = Field(None, description="Grupo Sanguineo")
    tipo_vivienda: Optional[str] = Field(None, description="Tipo de Vivienda")

    class Config:
        from_attributes = True


class PersonaCreate(PersonaBase):
    pass


class PersonaSearchResponse(BaseModel):
    dni: str = Field(..., examples=["28456789"])
    nombres: str = Field(..., examples=["Juan Carlos"])
    apellidos: str = Field(..., examples=["Gomez"])

    class Config:
        from_attributes = True
