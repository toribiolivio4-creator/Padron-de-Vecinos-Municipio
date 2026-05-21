"""
Generador de código desde definiciones de formulario en la BD.

Lee un FormDefinition y genera:
  - backend/schemas/auto_<name>.py
  - backend/routes/auto_<name>.py
  - frontend/js/form-schema.js
"""

import json
from pathlib import Path
from typing import Dict, List

from backend.models import FormDefinition
from backend.crud.form_migrations import apply_form_migrations, get_table_name

ROOT = Path(__file__).resolve().parent.parent.parent

TYPE_MAP_PYTHON = {
    "string": "str",
    "email": "EmailStr",
    "date": "date",
    "boolean": "bool",
    "integer": "int",
    "number": "float",
    "text": "str",
}


def extract_form_data(form_def: FormDefinition) -> Dict:
    """Extrae los datos del formulario desde la definición JSON."""
    definition = json.loads(form_def.definition)
    return definition["forms"][0]


def all_fields(form_data: Dict) -> List[Dict]:
    """Extrae todos los campos de todas las secciones."""
    fields = []
    for section in form_data.get("sections", []):
        fields.extend(section.get("fields", []))
    return fields


def generate_pydantic_schema(form_data: Dict) -> str:
    """Genera el código del schema Pydantic."""
    name = form_data["name"]
    fields = all_fields(form_data)
    model_name = form_data.get("model_name", name.capitalize())

    lines = []
    lines.append(f'# Schema auto-generado para "{name}" — NO EDITAR MANUALMENTE')
    lines.append(f'# Generado desde form_definitions (BD)')
    lines.append("")
    lines.append("from pydantic import BaseModel, Field")

    needs_email = any(f["type"] == "email" for f in fields)
    needs_date = any(f["type"] == "date" for f in fields)

    if needs_email:
        lines.append("from pydantic import EmailStr")
    if needs_date:
        lines.append("from datetime import date")

    lines.append("from typing import Optional")
    lines.append("")
    lines.append("")

    class_name = model_name
    lines.append(f"class {class_name}Base(BaseModel):")
    lines.append('    """Schema base con campos de solo lectura."""')
    lines.append("")

    for f in fields:
        py_type = TYPE_MAP_PYTHON.get(f["type"], "str")
        required = f.get("required", False)
        default_val = f.get("default")

        if required:
            lines.append(f'    {f["name"]}: {py_type} = Field(..., description="{f.get("label", f["name"])}")')
        else:
            if f["type"] == "boolean":
                default_str = str(default_val).capitalize() if default_val is not None else "False"
                lines.append(f'    {f["name"]}: {py_type} = Field({default_str}, description="{f.get("label", f["name"])}")')
            elif default_val is not None:
                lines.append(f'    {f["name"]}: {py_type} = Field("{default_val}", description="{f.get("label", f["name"])}")')
            else:
                lines.append(f'    {f["name"]}: Optional[{py_type}] = Field(None, description="{f.get("label", f["name"])}")')

    lines.append("")
    lines.append("    class Config:")
    lines.append("        from_attributes = True")
    lines.append("")
    lines.append("")

    lines.append(f"class {class_name}Create({class_name}Base):")
    lines.append('    """Schema para crear/actualizar registros."""')
    lines.append("    pass")
    lines.append("")

    return "\n".join(lines)


def generate_routes(form_data: Dict) -> str:
    """Genera el código de las rutas FastAPI."""
    name = form_data["name"]
    prefix = form_data["prefix"]
    tags = form_data.get("tags", [name])
    pk = form_data.get("primary_key", "id")
    title = form_data.get("title", name)
    model_name = form_data.get("model_name", name.capitalize())
    class_name = model_name

    lines = []
    lines.append(f'# Rutas auto-generadas para "{name}" — NO EDITAR MANUALMENTE')
    lines.append(f'# Generado desde form_definitions (BD)')
    lines.append("")
    lines.append("from fastapi import APIRouter, Depends, HTTPException, Query")
    lines.append("from sqlalchemy.orm import Session")
    lines.append("from typing import List, Optional")
    lines.append("")
    lines.append(f"from backend.schemas.auto_{name} import {class_name}Base, {class_name}Create")
    lines.append("from backend.database import get_db")
    lines.append("from backend.crud.utils import _get_generic, _upsert_generic, _apply_fields")
    lines.append("from backend.logger import log_actualizar, log_eliminar, log_error")
    lines.append("")
    lines.append(f'router = APIRouter(prefix="{prefix}", tags={tags}, redirect_slashes=False)')
    lines.append("")
    lines.append("")

    # LISTAR
    lines.append("@router.get(")
    lines.append('    "",')
    lines.append(f'    response_model=List[{class_name}Base],')
    lines.append(f'    summary="Listar registros de {title}",')
    lines.append(")")
    lines.append(f"def listar_{name}(")
    lines.append(f"    {pk}_prefix: Optional[str] = Query(None, description=\"Filtrar por {pk}\"),")
    lines.append("    db: Session = Depends(get_db),")
    lines.append("):")
    lines.append(f"    from backend.models import {class_name}")
    lines.append(f"    query = db.query({class_name}).filter({class_name}.activo == True)")
    lines.append(f"    if {pk}_prefix:")
    lines.append(f"        query = query.filter({class_name}.{pk}.startswith({pk}_prefix)).limit(10)")
    lines.append("    return query.all()")
    lines.append("")
    lines.append("")

    # OBTENER POR PK
    lines.append("@router.get(")
    lines.append(f'    "/{{{pk}}}",')
    lines.append(f'    response_model={class_name}Base,')
    lines.append(f'    summary="Obtener registro por {pk.upper()}",')
    lines.append(")")
    lines.append(f"def obtener_{name}({pk}: str, db: Session = Depends(get_db)):")
    lines.append(f"    from backend.models import {class_name}")
    lines.append(f"    item = db.query({class_name}).filter({class_name}.{pk} == {pk}).first()")
    lines.append("    if not item:")
    lines.append(f'        raise HTTPException(status_code=404, detail="Registro no encontrado")')
    lines.append("    return item")
    lines.append("")
    lines.append("")

    # CREAR/ACTUALIZAR (UPSERT)
    lines.append("@router.post(")
    lines.append('    "",')
    lines.append("    status_code=201,")
    lines.append(f'    summary="Crear o actualizar registro",')
    lines.append(")")
    lines.append(f"def upsert_{name}(data: {class_name}Create, db: Session = Depends(get_db)):")
    lines.append(f"    from backend.models import {class_name}")
    lines.append("    try:")
    lines.append(f"        item, is_new = _upsert_generic(db, {class_name}, data.model_dump(), \"{pk}\")")
    lines.append("        db.commit()")
    lines.append("        db.refresh(item)")
    lines.append(f'        log_actualizar(modulo="{name}", dni=item.{pk}, nombre=getattr(item, "nombres", ""), campos={{}})')
    lines.append(f'        return {{"message": "Registro procesado correctamente."}}')
    lines.append("    except Exception as e:")
    lines.append(f'        log_error("{name}", "upsert", str(data.{pk}) if hasattr(data, "{pk}") else "unknown", str(e))')
    lines.append("        raise")
    lines.append("")
    lines.append("")

    # ACTUALIZAR (PUT)
    lines.append("@router.put(")
    lines.append(f'    "/{{{pk}}}",')
    lines.append(f'    response_model={class_name}Base,')
    lines.append(f'    summary="Actualizar registro",')
    lines.append(")")
    lines.append(f"def actualizar_{name}({pk}: str, data: {class_name}Create, db: Session = Depends(get_db)):")
    lines.append(f"    from backend.models import {class_name}")
    lines.append("    try:")
    lines.append(f"        item = db.query({class_name}).filter({class_name}.{pk} == {pk}).first()")
    lines.append("        if not item:")
    lines.append(f'            raise HTTPException(status_code=404, detail="Registro no encontrado")')
    lines.append("        fields = data.model_dump(exclude_unset=True)")
    lines.append("        _apply_fields(item, fields)")
    lines.append("        db.commit()")
    lines.append("        db.refresh(item)")
    lines.append(f'        log_actualizar(modulo="{name}", dni={pk}, nombre=getattr(item, "nombres", ""), campos=fields)')
    lines.append("        return item")
    lines.append("    except HTTPException:")
    lines.append("        raise")
    lines.append("    except Exception as e:")
    lines.append(f'        log_error("{name}", "update", {pk}, str(e))')
    lines.append("        raise")
    lines.append("")
    lines.append("")

    # BAJA (soft delete)
    lines.append("@router.patch(")
    lines.append(f'    "/{{{pk}}}/baja",')
    lines.append("    status_code=200,")
    lines.append(f'    summary="Dar de baja registro",')
    lines.append(")")
    lines.append(f"def baja_{name}({pk}: str, db: Session = Depends(get_db)):")
    lines.append(f"    from backend.models import {class_name}")
    lines.append("    try:")
    lines.append(f"        item = db.query({class_name}).filter({class_name}.{pk} == {pk}).first()")
    lines.append("        if not item:")
    lines.append(f'            raise HTTPException(status_code=404, detail="Registro no encontrado")')
    lines.append("        item.activo = False")
    lines.append("        db.commit()")
    lines.append(f'        log_eliminar(modulo="{name}", dni={pk}, nombre=getattr(item, "nombres", ""))')
    lines.append(f'        return {{"mensaje": "Registro dado de baja correctamente"}}')
    lines.append("    except HTTPException:")
    lines.append("        raise")
    lines.append("    except Exception as e:")
    lines.append(f'        log_error("{name}", "baja", {pk}, str(e))')
    lines.append("        raise")
    lines.append("")

    return "\n".join(lines)


def generate_frontend_schema(form_data: Dict) -> str:
    """Genera el schema JavaScript para el frontend."""
    sections = form_data.get("sections", [])

    lines = []
    lines.append("// form-schema.js — AUTO-GENERADO desde form_definitions (BD)")
    lines.append("// NO EDITAR MANUALMENTE. Modificar desde el panel admin.")
    lines.append("")
    lines.append("const FORM_SCHEMA = {")
    lines.append("    sections: [")

    for sec_idx, section in enumerate(sections):
        lines.append("        {")
        lines.append(f'            id: "{section["id"]}",')
        lines.append(f'            title: "{section["title"]}",')
        lines.append(f'            icon: "{section.get("icon", "📋")}",')
        if section.get("collapsed"):
            lines.append("            collapsed: true,")
        lines.append("            fields: [")

        for field in section["fields"]:
            lines.append("                {")
            lines.append(f'                    id: "{field["name"]}",')
            lines.append(f'                    label: "{field.get("label", field["name"])}",')

            fe = field.get("frontend", {}) or {}
            widget = fe.get("widget", "")

            if field["type"] == "boolean":
                lines.append('                    type: "checkbox",')
            elif field["type"] == "date":
                lines.append('                    type: "date",')
            elif field["type"] == "email":
                lines.append('                    type: "email",')
            elif widget == "select":
                lines.append('                    type: "select",')
            else:
                lines.append('                    type: "text",')

            if field.get("required"):
                lines.append("                    required: true,")

            if field.get("max_length"):
                lines.append(f'                    maxLength: {field["max_length"]},')

            if field.get("placeholder"):
                lines.append(f'                    placeholder: "{field["placeholder"]}",')

            if field.get("default") is not None:
                if field["type"] == "boolean":
                    lines.append(f'                    defaultValue: {str(field["default"]).lower()},')
                else:
                    lines.append(f'                    defaultValue: "{field["default"]}",')

            if fe.get("mask"):
                lines.append(f'                    mask: "{fe["mask"]}",')

            if fe.get("visible") is False:
                lines.append("                    visible: false,")

            if fe.get("depends_on"):
                lines.append(f'                    dependsOn: "{fe["depends_on"]}",')

            if fe.get("autocomplete"):
                lines.append("                    autocomplete: true,")
                if fe.get("autocomplete_endpoint"):
                    lines.append(f'                    autocompleteEndpoint: "{fe["autocomplete_endpoint"]}",')
                if fe.get("autocomplete_param"):
                    lines.append(f'                    autocompleteParam: "{fe["autocomplete_param"]}",')
                if fe.get("autocomplete_source"):
                    lines.append(f'                    autocompleteSource: "{fe["autocomplete_source"]}",')

            if fe.get("validation"):
                v = fe["validation"]
                lines.append("                    validation: {")
                if "pattern" in v:
                    lines.append(f'                        pattern: /{v["pattern"]}/,')
                if "message" in v:
                    lines.append(f'                        message: "{v["message"]}",')
                if "min_length" in v:
                    lines.append(f'                        minLength: {v["min_length"]},')
                if "custom" in v:
                    lines.append(f'                        custom: "{v["custom"]}",')
                lines.append("                    },")

            if fe.get("conditional"):
                lines.append("                    conditional: {")
                lines.append(f'                        showFields: {json.dumps(fe["conditional"]["show_fields"])},')
                lines.append("                    },")

            if widget == "select" and fe.get("options"):
                lines.append("                    options: [")
                for opt in fe["options"]:
                    lines.append(f'                        {{ value: "{opt["value"]}", label: "{opt["label"]}" }},')
                lines.append("                    ],")

            lines.append("                },")

        lines.append("            ],")
        lines.append("        },")

    lines.append("    ],")
    lines.append("};")
    lines.append("")

    return "\n".join(lines)


def generate_from_form_definition(form_def: FormDefinition, db_session=None) -> Dict:
    """
    Genera todo el código desde una definición de formulario.
    Primero aplica migraciones, luego genera los archivos.
    """
    form_data = extract_form_data(form_def)
    name = form_data["name"]
    files_generated = []

    # Aplicar migraciones primero
    migration_result = None
    if db_session:
        migration_result = apply_form_migrations(form_def, db_session)
        db_session.commit()

    # Generar schema Pydantic
    schemas_dir = ROOT / "backend" / "schemas"
    schema_path = schemas_dir / f"auto_{name}.py"
    schema_content = generate_pydantic_schema(form_data)
    schema_path.write_text(schema_content, encoding="utf-8")
    files_generated.append(str(schema_path))

    # Generar rutas
    routes_dir = ROOT / "backend" / "routes"
    routes_path = routes_dir / f"auto_{name}.py"
    routes_content = generate_routes(form_data)
    routes_path.write_text(routes_content, encoding="utf-8")
    files_generated.append(str(routes_path))

    # Generar frontend schema
    frontend_js = ROOT / "frontend" / "js"
    frontend_js.mkdir(parents=True, exist_ok=True)
    schema_js_path = frontend_js / "form-schema.js"
    js_content = generate_frontend_schema(form_data)
    schema_js_path.write_text(js_content, encoding="utf-8")
    files_generated.append(str(schema_js_path))

    return {
        "files": files_generated,
        "migration": migration_result,
    }
