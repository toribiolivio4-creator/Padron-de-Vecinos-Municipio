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


@router.post("", status_code=201)
def registrar_padron(data: schemas.PadronCreate, db: Session = Depends(get_db)):
    """Crea o actualiza un registro en el padrón de vecinos."""
    return crud.upsert_padron(db, data)
