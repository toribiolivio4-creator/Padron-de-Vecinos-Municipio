from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Any, Dict

from backend.app.db.session import get_db
import backend.app.forms.repository as repo
import backend.app.forms.schemas as schemas
from backend.app.forms.service import (
    submit_form_data,
    list_submissions,
    get_submission,
    count_submissions,
    soft_delete_submission,
)

# ── Admin routes ──

admin_router = APIRouter(prefix="/admin/forms", tags=["admin-forms"])


@admin_router.get("", response_model=List[schemas.FormDefinitionResponse])
def listar_forms(db: Session = Depends(get_db)):
    return repo.get_forms(db)


@admin_router.get("/{name}", response_model=schemas.FormDefinitionFull)
def obtener_form(name: str, db: Session = Depends(get_db)):
    result = repo.get_form_full(db, name)
    if not result:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")
    return result


@admin_router.post("", status_code=201, response_model=schemas.FormDefinitionResponse)
def crear_form(data: schemas.FormDefinitionCreate, db: Session = Depends(get_db)):
    return repo.create_form(db, data)


@admin_router.put("/{name}", response_model=schemas.FormDefinitionResponse)
def actualizar_form(name: str, data: schemas.FormDefinitionUpdate, db: Session = Depends(get_db)):
    return repo.update_form(db, name, data)


@admin_router.delete("/{name}", status_code=200)
def eliminar_form(name: str, db: Session = Depends(get_db)):
    ok = repo.delete_form(db, name)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")
    return {"message": f"Formulario '{name}' eliminado"}


@admin_router.get("/{name}/migration-status", response_model=schemas.MigrationStatus)
def verificar_migracion(name: str, db: Session = Depends(get_db)):
    return repo.check_migration(db, name)


@admin_router.post("/{name}/migrate", response_model=schemas.MigrationResult)
def aplicar_migracion(name: str, db: Session = Depends(get_db)):
    return repo.apply_migration(db, name)


@admin_router.post("/sync-all")
def sincronizar_todos(db: Session = Depends(get_db)):
    return repo.sync_all(db)


@admin_router.get("/tables/{table_name}/columns")
def ver_columnas_tabla(table_name: str, db: Session = Depends(get_db)):
    columns = repo.get_table_columns(db, table_name)
    return {"table": table_name, "columns": columns}


@admin_router.post("/{name}/generate")
def generar_codigo(name: str, db: Session = Depends(get_db)):
    form_def = repo.get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail=f"Formulario '{name}' no encontrado")

    try:
        from backend.app.forms.generate import generate_from_form_definition
        result = generate_from_form_definition(form_def)
        return {
            "message": "Codigo generado correctamente. Las rutas se cargan automaticamente al reiniciar.",
            "form_name": name,
            "files_generated": result.get("files", []),
            "migration_result": result.get("migration"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando codigo: {str(e)}")


# ── Submission routes ──

submissions_router = APIRouter(prefix="/submissions", tags=["form-submissions"])


@submissions_router.post("/{form_name}", status_code=201)
def submit_form(form_name: str, data: Dict[str, Any]):
    return submit_form_data(form_name, data)


@submissions_router.get("/{collection_name}")
def list_submissions_route(collection_name: str, limit: int = 50, skip: int = 0):
    return list_submissions(collection_name, limit, skip)


@submissions_router.get("/{collection_name}/{record_id}")
def get_submission_route(collection_name: str, record_id: int):
    return get_submission(collection_name, record_id)


@submissions_router.get("/{collection_name}/count")
def count_submissions_route(collection_name: str):
    return count_submissions(collection_name)


@submissions_router.put("/{collection_name}/{record_id}/baja")
def soft_delete_submission_route(collection_name: str, record_id: str):
    return soft_delete_submission(collection_name, record_id)
