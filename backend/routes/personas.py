# routes/personas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import backend.crud as crud
import backend.schemas as schemas
from backend.database import get_db

router = APIRouter(
    prefix="/personas",
    tags=["personas"],
)


@router.get("", response_model=List[schemas.PersonaBase])
def listar_personas(
    dni_prefix: Optional[str] = Query(None, description="Filtra personas cuyo DNI empiece con este valor"),
    db: Session = Depends(get_db),
):
    """
    Lista todas las personas activas.
    Si se provee `dni_prefix`, filtra por DNI (útil para autocompletado).

    Ejemplos:
    GET /personas
    GET /personas?dni_prefix=123
    """
    return crud.get_personas(db, dni_prefix)


@router.get("/{dni}", response_model=schemas.PersonaBase)
def obtener_persona(dni: str, db: Session = Depends(get_db)):
    """Retorna una persona por su DNI."""
    persona = crud.get_persona(db, dni)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.put("/{dni}", response_model=schemas.PersonaBase)
def actualizar_persona(dni: str, data: schemas.PadronCreate, db: Session = Depends(get_db)):
    """Actualiza los datos de una persona existente."""
    persona = crud.update_persona(db, dni, data)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.patch("/{dni}/baja", status_code=200)
def baja_persona(dni: str, db: Session = Depends(get_db)):
    """Marca una persona como inactiva (soft delete)."""
    ok = crud.soft_delete_persona(db, dni)
    if not ok:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"mensaje": "Persona dada de baja correctamente"}
