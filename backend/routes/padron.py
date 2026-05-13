# routes/padron.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import backend.crud as crud
import backend.schemas as schemas
from backend.database import get_db

router = APIRouter(
    prefix="/padron-vecinos",
    tags=["padrón"],
)


@router.post(
    "",
    status_code=201,
    summary="Inscribir o actualizar vecino en el padrón",
    responses={
        201: {
            "description": "Registro procesado correctamente",
            "content": {"application/json": {"example": {"message": "Resident registry record updated successfully."}}},
        }
    },
)
def registrar_padron(data: schemas.PadronCreate, db: Session = Depends(get_db)):
    """
    Crea o actualiza un registro en el padrón de vecinos (**upsert**).

    - Si el **DNI** no existe, crea el registro.
    - Si el **DNI** ya existe, actualiza los datos.
    """
    return crud.upsert_padron(db, data)
