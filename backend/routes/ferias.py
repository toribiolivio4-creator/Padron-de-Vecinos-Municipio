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


@router.post("", status_code=201)
def registrar_feria(data: schemas.FeriaCreate, db: Session = Depends(get_db)):
    """Crea o actualiza la inscripción de una persona a la feria."""
    return crud.upsert_feria(db, data)
