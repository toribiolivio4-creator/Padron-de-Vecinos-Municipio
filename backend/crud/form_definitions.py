"""
CRUD para gestión de definiciones de formularios.
"""

import json
import os
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.models import FormDefinition
from backend.schemas import FormDefinitionCreate, FormDefinitionUpdate

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
from backend.crud.form_migrations import (
    check_form_migration_status,
    apply_form_migrations,
    sync_all_forms,
    get_existing_columns,
    get_table_name,
)


def build_definition_json(data: FormDefinitionCreate) -> str:
    """Construye el JSON de definición desde un FormDefinitionCreate."""
    definition = {
        "forms": [
            {
                "name": data.name,
                "title": data.title,
                "description": data.description or "",
                "prefix": data.prefix,
                "tags": data.tags or [],
                "primary_key": data.primary_key,
                "model_name": data.model_name,
                "sections": [
                    {
                        "id": section.id,
                        "title": section.title,
                        "icon": section.icon,
                        "collapsed": section.collapsed,
                        "fields": [
                            {
                                "name": field.name,
                                "label": field.label,
                                "type": field.type,
                                "required": field.required,
                                "default": field.default,
                                "max_length": field.max_length,
                                "placeholder": field.placeholder,
                                "primary_key": field.primary_key,
                                "frontend": field.frontend.model_dump() if field.frontend else None,
                            }
                            for field in section.fields
                        ],
                    }
                    for section in data.sections
                ],
            }
        ]
    }
    return json.dumps(definition, ensure_ascii=False, indent=4)


def get_forms(db: Session) -> List[FormDefinition]:
    """Lista todos los formularios activos."""
    return db.query(FormDefinition).filter(FormDefinition.activo == True).all()


def get_form(db: Session, name: str) -> Optional[FormDefinition]:
    """Obtiene un formulario por su nombre."""
    return db.query(FormDefinition).filter(FormDefinition.name == name).first()


def get_form_full(db: Session, name: str) -> Optional[dict]:
    """Obtiene un formulario con su definición completa parseada."""
    form_def = get_form(db, name)
    if not form_def:
        return None

    definition = json.loads(form_def.definition)
    form_data = definition["forms"][0]

    return {
        "id": form_def.id,
        "name": form_data["name"],
        "title": form_data["title"],
        "description": form_data.get("description"),
        "prefix": form_data["prefix"],
        "tags": form_data.get("tags", []),
        "primary_key": form_data.get("primary_key", "id"),
        "model_name": form_data.get("model_name"),
        "table_name": form_def.table_name,
        "sections": form_data.get("sections", []),
        "activo": form_def.activo,
        "created_at": form_def.created_at,
        "updated_at": form_def.updated_at,
    }


def create_form(db: Session, data: FormDefinitionCreate) -> FormDefinition:
    """Crea un nuevo formulario y aplica migraciones."""
    existing = get_form(db, data.name)
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un formulario con nombre '{data.name}'")

    definition_json = build_definition_json(data)

    form_def = FormDefinition(
        name=data.name,
        title=data.title,
        description=data.description,
        prefix=data.prefix,
        tags=json.dumps(data.tags) if data.tags else None,
        primary_key=data.primary_key,
        model_name=data.model_name,
        table_name=data.table_name,
        definition=definition_json,
    )

    db.add(form_def)
    db.commit()
    db.refresh(form_def)

    _init_data_file(data.name)

    return form_def


def _init_data_file(name: str):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    json_path = DATA_DIR / f"{name}.json"
    if not json_path.exists():
        json_path.write_text("[]", encoding="utf-8")


def update_form(db: Session, name: str, data: FormDefinitionUpdate) -> FormDefinition:
    """Actualiza un formulario existente y aplica migraciones si hay cambios en los campos."""
    form_def = get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")

    definition = json.loads(form_def.definition)
    form_data = definition["forms"][0]

    if data.title is not None:
        form_data["title"] = data.title
        form_def.title = data.title
    if data.description is not None:
        form_data["description"] = data.description
        form_def.description = data.description
    if data.prefix is not None:
        form_data["prefix"] = data.prefix
        form_def.prefix = data.prefix
    if data.tags is not None:
        form_data["tags"] = data.tags
        form_def.tags = json.dumps(data.tags)
    if data.primary_key is not None:
        form_data["primary_key"] = data.primary_key
        form_def.primary_key = data.primary_key
    if data.model_name is not None:
        form_data["model_name"] = data.model_name
        form_def.model_name = data.model_name
    if data.sections is not None:
        form_data["sections"] = [
            {
                "id": section.id,
                "title": section.title,
                "icon": section.icon,
                "collapsed": section.collapsed,
                "fields": [
                    {
                        "name": field.name,
                        "label": field.label,
                        "type": field.type,
                        "required": field.required,
                        "default": field.default,
                        "max_length": field.max_length,
                        "placeholder": field.placeholder,
                        "primary_key": field.primary_key,
                        "frontend": field.frontend.model_dump() if field.frontend else None,
                    }
                    for field in section.fields
                ],
            }
            for section in data.sections
        ]

    form_def.definition = json.dumps(definition, ensure_ascii=False, indent=4)

    db.commit()
    db.refresh(form_def)

    return form_def


def delete_form(db: Session, name: str) -> bool:
    """Elimina (soft delete) un formulario."""
    form_def = get_form(db, name)
    if not form_def:
        return False

    form_def.activo = False
    db.commit()
    return True


def check_migration(db: Session, name: str) -> dict:
    """Verifica el estado de migración de un formulario."""
    form_def = get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")

    return check_form_migration_status(form_def)


def apply_migration(db: Session, name: str) -> dict:
    """Aplica las migraciones pendientes de un formulario."""
    form_def = get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")

    result = apply_form_migrations(form_def, db)
    db.commit()
    return result


def sync_all(db: Session) -> List[dict]:
    """Sincroniza todos los formularios activos con la BD."""
    return sync_all_forms(db)


def get_table_columns(db: Session, table_name: str) -> List[str]:
    """Obtiene las columnas de una tabla."""
    return get_existing_columns(table_name)
