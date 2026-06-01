"""
CRUD para gestión de definiciones de formularios + migración automática de BD.

Operaciones CRUD sobre formularios y detección/aplicación de cambios en esquema
(ALTER TABLE) cuando se agregan/quitan campos.
"""

import json
from typing import List, Dict, Optional
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.database import engine
from backend.models import FormDefinition, FormFieldMigration
from backend.schemas import FormDefinitionCreate, FormDefinitionUpdate

TYPE_MAP_SQL = {
    "string": "VARCHAR",
    "email": "VARCHAR",
    "date": "DATE",
    "boolean": "BOOLEAN",
    "integer": "INTEGER",
    "number": "NUMERIC",
    "text": "TEXT",
}


# ─────────────────────────────────────────────
# Migraciones
# ─────────────────────────────────────────────

def get_existing_columns(table_name: str) -> List[str]:
    """Obtiene las columnas existentes en una tabla."""
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return []
    return [col["name"] for col in inspector.get_columns(table_name)]


def get_table_name(form_def: FormDefinition) -> str:
    """Determina el nombre de la tabla para un formulario."""
    if form_def.table_name:
        return form_def.table_name
    return form_def.name


def extract_fields_from_definition(definition_json: str) -> List[Dict]:
    """Extrae todos los campos de una definición JSON de formulario."""
    definition = json.loads(definition_json)
    fields = []
    for section in definition.get("sections", []):
        for field in section.get("fields", []):
            fields.append(field)
    return fields


def check_form_migration_status(form_def: FormDefinition) -> Dict:
    """
    Verifica el estado de migración de un formulario.
    Retorna qué columnas faltan y cuáles ya existen.
    """
    table_name = get_table_name(form_def)
    existing_cols = get_existing_columns(table_name)

    if not existing_cols:
        return {
            "form_name": form_def.name,
            "table_exists": False,
            "table_name": table_name,
            "missing_columns": [],
            "existing_columns": [],
            "note": "La tabla no existe aún. Se creará con create_all().",
        }

    fields = extract_fields_from_definition(form_def.definition)
    missing = []

    for field in fields:
        col_name = field["name"]
        if col_name not in existing_cols:
            sql_type = TYPE_MAP_SQL.get(field.get("type", "string"), "VARCHAR")
            if field.get("max_length") and sql_type == "VARCHAR":
                sql_type = f"VARCHAR({field['max_length']})"
            missing.append({
                "name": col_name,
                "type": field.get("type", "string"),
                "sql_type": sql_type,
                "required": field.get("required", False),
            })

    return {
        "form_name": form_def.name,
        "table_exists": True,
        "table_name": table_name,
        "missing_columns": missing,
        "existing_columns": existing_cols,
    }


def apply_form_migrations(form_def: FormDefinition, db: Session) -> Dict:
    """
    Aplica las migraciones necesarias para un formulario.
    Crea la tabla si no existe y agrega columnas faltantes.
    """
    table_name = get_table_name(form_def)
    existing_cols = get_existing_columns(table_name)
    fields = extract_fields_from_definition(form_def.definition)

    result = {
        "form_name": form_def.name,
        "table_name": table_name,
        "columns_added": [],
        "columns_existing": [],
        "errors": [],
        "success": True,
    }

    if not existing_cols:
        result["note"] = "La tabla no existe. Ejecutá create_all() para crearla."
        return result

    with engine.connect() as conn:
        for field in fields:
            col_name = field["name"]

            if col_name in existing_cols:
                result["columns_existing"].append(col_name)
                continue

            sql_type = TYPE_MAP_SQL.get(field.get("type", "string"), "VARCHAR")
            if field.get("max_length") and sql_type == "VARCHAR":
                sql_type = f"VARCHAR({field['max_length']})"

            try:
                nullable = "NULL" if not field.get("required", False) else "NOT NULL"
                default_val = ""
                if field.get("default") is not None:
                    if field.get("type") == "boolean":
                        default_val = f" DEFAULT {str(field['default']).lower()}"
                    else:
                        default_val = f" DEFAULT '{field['default']}'"
                elif field.get("type") == "boolean":
                    default_val = " DEFAULT FALSE"

                alter_sql = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {sql_type} {nullable}{default_val}"
                conn.execute(text(alter_sql))

                migration_record = FormFieldMigration(
                    form_name=form_def.name,
                    table_name=table_name,
                    column_name=col_name,
                    column_type=sql_type,
                    status="applied",
                )
                db.add(migration_record)

                result["columns_added"].append(col_name)
            except Exception as e:
                error_msg = f"Error al agregar columna '{col_name}': {str(e)}"
                result["errors"].append(error_msg)
                result["success"] = False

                migration_record = FormFieldMigration(
                    form_name=form_def.name,
                    table_name=table_name,
                    column_name=col_name,
                    column_type=sql_type,
                    status="failed",
                    error=str(e),
                )
                db.add(migration_record)

        conn.commit()

    return result


def sync_all_forms(db: Session) -> List[Dict]:
    """
    Sincroniza todos los formularios activos con la base de datos.
    Retorna una lista de resultados de migración.
    """
    forms = db.query(FormDefinition).filter(FormDefinition.activo == True).all()
    results = []

    for form_def in forms:
        status = check_form_migration_status(form_def)
        if status.get("missing_columns"):
            migration_result = apply_form_migrations(form_def, db)
            db.commit()
            results.append(migration_result)
        else:
            results.append({
                "form_name": form_def.name,
                "table_name": get_table_name(form_def),
                "status": "up_to_date",
                "columns_added": [],
                "errors": [],
            })

    return results


# ─────────────────────────────────────────────
# CRUD
# ─────────────────────────────────────────────

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
    existing = db.query(FormDefinition).filter(FormDefinition.name == data.name).first()
    if existing:
        if existing.activo:
            raise HTTPException(status_code=400, detail=f"Ya existe un formulario con nombre '{data.name}'")
        existing.activo = True
        existing.title = data.title
        existing.description = data.description
        existing.prefix = data.prefix
        existing.tags = json.dumps(data.tags) if data.tags else None
        existing.primary_key = data.primary_key
        existing.model_name = data.model_name
        existing.table_name = data.table_name
        existing.definition = build_definition_json(data)
        db.commit()
        db.refresh(existing)
        return existing

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

    return form_def


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
