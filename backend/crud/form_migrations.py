"""
Sistema de migración automática de base de datos.

Detecta diferencias entre la definición de un formulario y las columnas
existentes en la tabla, y genera/aplica ALTER TABLE automáticamente.
"""

import json
from typing import List, Dict, Optional
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from backend.database import engine
from backend.models import FormDefinition, FormFieldMigration

TYPE_MAP_SQL = {
    "string": "VARCHAR",
    "email": "VARCHAR",
    "date": "DATE",
    "boolean": "BOOLEAN",
    "integer": "INTEGER",
    "number": "NUMERIC",
    "text": "TEXT",
}


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
