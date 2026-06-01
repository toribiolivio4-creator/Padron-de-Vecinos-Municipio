"""
Rutas para el panel de administración de formularios.

Permite crear, editar, eliminar formularios y gestionar migraciones de BD.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import backend.crud as crud
import backend.schemas as schemas
from backend.db.database import get_db

router = APIRouter(prefix="/admin/forms", tags=["admin-forms"])


@router.get(
    "",
    response_model=List[schemas.FormDefinitionResponse],
    summary="Listar formularios",
)
def listar_forms(db: Session = Depends(get_db)):
    """Lista todos los formularios activos."""
    return crud.get_forms(db)


@router.get(
    "/{name}",
    response_model=schemas.FormDefinitionFull,
    summary="Obtener formulario completo",
    responses={404: {"description": "Formulario no encontrado"}},
)
def obtener_form(name: str, db: Session = Depends(get_db)):
    """Obtiene un formulario con su definición completa."""
    result = crud.get_form_full(db, name)
    if not result:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")
    return result


@router.post(
    "",
    status_code=201,
    response_model=schemas.FormDefinitionResponse,
    summary="Crear formulario",
)
def crear_form(data: schemas.FormDefinitionCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo formulario y registra su definición.

    Después de crear, podés aplicar migraciones con POST /admin/forms/{name}/migrate
    y generar código con POST /admin/forms/{name}/generate.
    """
    return crud.create_form(db, data)


@router.put(
    "/{name}",
    response_model=schemas.FormDefinitionResponse,
    summary="Actualizar formulario",
    responses={404: {"description": "Formulario no encontrado"}},
)
def actualizar_form(name: str, data: schemas.FormDefinitionUpdate, db: Session = Depends(get_db)):
    """Actualiza un formulario existente."""
    return crud.update_form(db, name, data)


@router.delete(
    "/{name}",
    status_code=200,
    summary="Eliminar formulario",
    responses={404: {"description": "Formulario no encontrado"}},
)
def eliminar_form(name: str, db: Session = Depends(get_db)):
    """Elimina un formulario (soft delete)."""
    ok = crud.delete_form(db, name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")
    return {"message": f"Formulario '{name}' eliminado"}


@router.get(
    "/{name}/migration-status",
    response_model=schemas.MigrationStatus,
    summary="Verificar estado de migración",
)
def verificar_migracion(name: str, db: Session = Depends(get_db)):
    """
    Verifica qué columnas faltan en la tabla del formulario.
    Útil para ver el estado antes de aplicar migraciones.
    """
    return crud.check_migration(db, name)


@router.post(
    "/{name}/migrate",
    response_model=schemas.MigrationResult,
    summary="Aplicar migración",
)
def aplicar_migracion(name: str, db: Session = Depends(get_db)):
    """
    Aplica las migraciones pendientes para un formulario.

    Agrega automáticamente las columnas que faltan en la tabla.
    """
    return crud.apply_migration(db, name)


@router.post(
    "/sync-all",
    summary="Sincronizar todos los formularios",
)
def sincronizar_todos(db: Session = Depends(get_db)):
    """
    Sincroniza todos los formularios activos con la base de datos.
    Aplica migraciones pendientes para cada uno.
    """
    return crud.sync_all(db)


@router.get(
    "/tables/{table_name}/columns",
    summary="Ver columnas de una tabla",
)
def ver_columnas_tabla(table_name: str, db: Session = Depends(get_db)):
    """Lista las columnas existentes en una tabla."""
    columns = crud.get_table_columns(db, table_name)
    return {"table": table_name, "columns": columns}


@router.post(
    "/{name}/generate",
    summary="Generar código desde formulario",
)
def generar_codigo(name: str, db: Session = Depends(get_db)):
    """
    Genera automáticamente:
    - Schema Pydantic (backend/schemas/auto_<name>.py)
    - Rutas FastAPI (backend/routes/auto_<name>.py)
    - Schema frontend (frontend/js/form-schema.js)

    Primero aplica migraciones pendientes, luego genera el código.
    """
    form_def = crud.get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")

    try:
        from backend.generate import generate_from_form_definition
        result = generate_from_form_definition(form_def)
        return {
            "message": "Código generado correctamente. Las rutas se cargan automáticamente al reiniciar el servidor.",
            "form_name": name,
            "files_generated": result.get("files", []),
            "migration_result": result.get("migration"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando código: {str(e)}")
