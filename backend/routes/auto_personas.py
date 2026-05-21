# Rutas auto-generadas para "personas" — NO EDITAR MANUALMENTE
# Generado desde form-definitions.json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.schemas.auto_personas import PersonaBase, PersonaCreate
from backend.database import get_db
from backend.crud.utils import _get_generic, _upsert_generic, _apply_fields
from backend.logger import log_actualizar, log_eliminar, log_error

router = APIRouter(prefix="/personas", tags=['Personas'], redirect_slashes=False)


@router.get(
    "",
    response_model=List[PersonaBase],
    summary="Listar registros de Gestión de Personas",
)
def listar_personas(
    dni_prefix: Optional[str] = Query(None, description="Filtrar por dni"),
    db: Session = Depends(get_db),
):
    from backend.models import Persona
    query = db.query(Persona).filter(Persona.activo == True)
    if dni_prefix:
        query = query.filter(Persona.dni.startswith(dni_prefix)).limit(10)
    return query.all()


@router.get(
    "/{dni}",
    response_model=PersonaBase,
    summary="Obtener registro por DNI",
)
def obtener_personas(dni: str, db: Session = Depends(get_db)):
    from backend.models import Persona
    item = db.query(Persona).filter(Persona.dni == dni).first()
    if not item:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return item


@router.post(
    "",
    status_code=201,
    summary="Crear o actualizar registro",
)
def upsert_personas(data: PersonaCreate, db: Session = Depends(get_db)):
    from backend.models import Persona
    try:
        item, is_new = _upsert_generic(db, Persona, data.model_dump(), "dni")
        db.commit()
        db.refresh(item)
        log_actualizar(modulo="personas", dni=item.dni, nombre=getattr(item, "nombres", ""), campos={})
        return {"message": "Registro procesado correctamente."}
    except Exception as e:
        log_error("personas", "upsert", str(data.dni) if hasattr(data, "dni") else "unknown", str(e))
        raise


@router.put(
    "/{dni}",
    response_model=PersonaBase,
    summary="Actualizar registro",
)
def actualizar_personas(dni: str, data: PersonaCreate, db: Session = Depends(get_db)):
    from backend.models import Persona
    try:
        item = db.query(Persona).filter(Persona.dni == dni).first()
        if not item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        fields = data.model_dump(exclude_unset=True)
        _apply_fields(item, fields)
        db.commit()
        db.refresh(item)
        log_actualizar(modulo="personas", dni=dni, nombre=getattr(item, "nombres", ""), campos=fields)
        return item
    except HTTPException:
        raise
    except Exception as e:
        log_error("personas", "update", dni, str(e))
        raise


@router.patch(
    "/{dni}/baja",
    status_code=200,
    summary="Dar de baja registro",
)
def baja_personas(dni: str, db: Session = Depends(get_db)):
    from backend.models import Persona
    try:
        item = db.query(Persona).filter(Persona.dni == dni).first()
        if not item:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        item.activo = False
        db.commit()
        log_eliminar(modulo="personas", dni=dni, nombre=getattr(item, "nombres", ""))
        return {"mensaje": "Registro dado de baja correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        log_error("personas", "baja", dni, str(e))
        raise
