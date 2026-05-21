from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FieldOption(BaseModel):
    value: str
    label: str


class FieldValidation(BaseModel):
    pattern: Optional[str] = None
    message: Optional[str] = None
    min_length: Optional[int] = None
    custom: Optional[str] = None


class FieldConditional(BaseModel):
    show_fields: List[str] = []


class FieldFrontend(BaseModel):
    widget: Optional[str] = None
    mask: Optional[str] = None
    placeholder: Optional[str] = None
    validation: Optional[FieldValidation] = None
    autocomplete: Optional[bool] = False
    autocomplete_endpoint: Optional[str] = None
    autocomplete_param: Optional[str] = None
    autocomplete_source: Optional[str] = None
    visible: Optional[bool] = None
    depends_on: Optional[str] = None
    conditional: Optional[FieldConditional] = None
    options: Optional[List[FieldOption]] = None


class FormField(BaseModel):
    name: str
    label: str
    type: str  # string, email, date, boolean, integer, number, text
    required: bool = False
    default: Optional[str] = None
    max_length: Optional[int] = None
    placeholder: Optional[str] = None
    primary_key: Optional[bool] = False
    frontend: Optional[FieldFrontend] = None


class FormSection(BaseModel):
    id: str
    title: str
    icon: str = "📋"
    collapsed: bool = False
    fields: List[FormField]


class FormDefinitionCreate(BaseModel):
    name: str = Field(..., description="Identificador único del formulario")
    title: str = Field(..., description="Título visible del formulario")
    description: Optional[str] = None
    prefix: str = Field(..., description="Prefijo de ruta API (ej: /personas)")
    tags: Optional[List[str]] = None
    primary_key: str = Field(default="id", description="Campo clave primaria")
    model_name: str = Field(..., description="Nombre del modelo SQLAlchemy")
    table_name: Optional[str] = None
    sections: List[FormSection] = Field(..., description="Secciones y campos del formulario")


class FormDefinitionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    prefix: Optional[str] = None
    tags: Optional[List[str]] = None
    primary_key: Optional[str] = None
    model_name: Optional[str] = None
    sections: Optional[List[FormSection]] = None


class FormDefinitionResponse(BaseModel):
    id: int
    name: str
    title: str
    description: Optional[str] = None
    prefix: str
    tags: Optional[str] = None
    primary_key: str
    model_name: str
    table_name: Optional[str] = None
    definition: str
    activo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FormDefinitionFull(BaseModel):
    id: int
    name: str
    title: str
    description: Optional[str] = None
    prefix: str
    tags: Optional[List[str]] = []
    primary_key: str
    model_name: str
    table_name: Optional[str] = None
    sections: List[FormSection]
    activo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MigrationResult(BaseModel):
    form_name: str
    table_name: str
    columns_added: List[str] = []
    columns_existing: List[str] = []
    errors: List[str] = []
    success: bool


class MigrationStatus(BaseModel):
    form_name: str
    table_exists: bool
    missing_columns: List[dict] = []
    existing_columns: List[str] = []
