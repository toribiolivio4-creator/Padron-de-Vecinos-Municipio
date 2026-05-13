# routes/ferias.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import backend.crud as crud
import backend.schemas as schemas
from backend.database import get_db

router = APIRouter(
    prefix="/inscripcion-feria",
    tags=["ferias"],
)


@router.post(
    "",
    status_code=201,
    summary="Inscribir o actualizar feriante",
    responses={
        201: {
            "description": "Inscripción procesada correctamente",
            "content": {"application/json": {"example": {"message": "Fair registration processed successfully."}}},
        }
    },
)
def registrar_feria(data: schemas.FeriaCreate, db: Session = Depends(get_db)):
    """
    Crea o actualiza la inscripción de una persona a la feria (**upsert**).

    - Si el **DNI** no existe en el sistema, crea tanto la persona como su inscripción.
    - Si el **DNI** ya existe, actualiza los datos de la persona y de la inscripción.
    """
    return crud.upsert_feria(db, data)
