# routes/personas.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

import backend.crud as crud
import backend.schemas as schemas
from backend.db.database import get_db

router = APIRouter(prefix="/personas", tags=["Personas"], redirect_slashes=False)



@router.get(
    "",
    response_model=List[schemas.PersonaBase],
    summary="Listar personas activas",
    response_description="Lista de personas registradas y activas en el sistema",
)
def listar_personas(
    dni_prefix: Optional[str] = Query(
        None,
        description="Filtra personas cuyo DNI empiece con este valor (útil para autocompletado). Devuelve máximo 10 resultados.",
        examples=["284"],
    ),
    db: Session = Depends(get_db),
):
    """
    Retorna todas las personas **activas** registradas en el sistema.

    - Si se provee `dni_prefix`, filtra por DNI (máximo 10 resultados, pensado para autocompletado).
    - Sin parámetros, devuelve el listado completo.
    """
    return crud.get_personas(db, dni_prefix)


@router.get(
    "/{dni}",
    response_model=schemas.PersonaBase,
    summary="Obtener persona por DNI",
    responses={404: {"description": "Persona no encontrada"}},
)
def obtener_persona(dni: str, db: Session = Depends(get_db)):
    """Retorna los datos completos de una persona buscando por su **DNI**."""
    persona = crud.get_persona(db, dni)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.put(
    "/{dni}",
    response_model=schemas.PersonaBase,
    summary="Actualizar datos de una persona",
    responses={404: {"description": "Persona no encontrada"}},
)
def actualizar_persona(dni: str, data: schemas.PadronCreate, db: Session = Depends(get_db)):
    """
    Actualiza los datos de una persona existente identificada por su **DNI**.

    Reemplaza todos los campos enviados en el cuerpo de la solicitud.
    """
    persona = crud.update_persona(db, dni, data)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona


@router.patch(
    "/{dni}/baja",
    status_code=200,
    summary="Dar de baja a una persona",
    responses={
        200: {"description": "Persona dada de baja correctamente", "content": {"application/json": {"examples": {"default": {"value": {"mensaje": "Persona dada de baja correctamente"}}}}}},
        404: {"description": "Persona no encontrada"},
    },
)
def baja_persona(dni: str, db: Session = Depends(get_db)):
    """
    Marca una persona como **inactiva** (soft delete).

    El registro **no se elimina** de la base de datos; simplemente queda excluido
    de los listados y consultas normales.
    """
    ok = crud.soft_delete_persona(db, dni)
    if not ok:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"mensaje": "Persona dada de baja correctamente"}


@router.post(
    "",
    status_code=201,
    summary="Agregar o actualizar persona",
    responses={
        201: {
            "description": "Registro procesado correctamente",
            "content": {"application/json": {"examples": {"default": {"value": {"message": "Resident registry record updated successfully."}}}}},
        }
    },
)
def registrar_persona(data: schemas.PadronCreate, db: Session = Depends(get_db)):
    """
    Crea o actualiza una persona (**upsert**).

    - Si el **DNI** no existe, crea el registro.
    - Si el **DNI** ya existe, actualiza los datos.
    """
    return crud.upsert_padron(db, data)