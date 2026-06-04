from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.db.session import get_db
from backend.app.users.schemas import PersonaBase, PersonaCreate
from backend.app.users.service import list_personas, get_persona_by_dni, handle_upsert, handle_update, handle_soft_delete

router = APIRouter(prefix="/personas", tags=["personas"], redirect_slashes=False)


@router.get("", response_model=List[PersonaBase])
def listar_personas(
    dni_prefix: Optional[str] = Query(None, description="Filtrar por DNI"),
    db: Session = Depends(get_db),
):
    return list_personas(db, dni_prefix)


@router.get("/{dni}", response_model=PersonaBase)
def obtener_persona(dni: str, db: Session = Depends(get_db)):
    persona = get_persona_by_dni(db, dni)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.post("", status_code=201)
def registrar_persona(data: PersonaCreate, db: Session = Depends(get_db)):
    return handle_upsert(db, data)


@router.put("/{dni}", response_model=PersonaBase)
def actualizar_persona(dni: str, data: PersonaCreate, db: Session = Depends(get_db)):
    persona = handle_update(db, dni, data)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.patch("/{dni}/baja", status_code=200)
def baja_persona(dni: str, db: Session = Depends(get_db)):
    ok = handle_soft_delete(db, dni)
    if not ok:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"mensaje": "Persona dada de baja correctamente"}
