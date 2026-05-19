from sqlalchemy.orm import Session
from typing import Optional

from backend.models import Persona
from backend.schemas import PadronCreate
from backend.crud.utils import _get_persona, _apply_fields, _upsert_persona, _log_upsert, _full_name
from backend.logger import log_actualizar, log_eliminar, log_error


def get_personas(db: Session, dni_prefix: Optional[str] = None) -> list[Persona]:
    """
    Muestra la lista de personas activas. Si se proporciona `dni_prefix`, filtra por DNI.
    (máximo 10 resultados, pensado para autocompletar).
    """
    query = db.query(Persona).filter(Persona.activo == True)
    if dni_prefix:
        query = query.filter(Persona.dni.startswith(dni_prefix)).limit(10)
    return query.all()


def get_persona(db: Session, dni: str) -> Optional[Persona]:
    """Devuelve los datos completos de una persona por su número de DNI."""
    return _get_persona(db, dni)


def upsert_padron(db: Session, data: PadronCreate) -> dict:
    """Crea o actualiza un registro en el registro de residentes."""
    try:
        persona, is_new = _upsert_persona(db, data.model_dump())
        db.commit()
        db.refresh(persona)
        _log_upsert("personas", is_new, data.dni, _full_name(data))
        return {"message": "Resident registry record updated successfully."}
    except Exception as e:
        log_error("personas", "upsert", data.dni, str(e))
        raise


def update_persona(db: Session, dni: str, data: PadronCreate) -> Optional[Persona]:
    """Actualiza campos específicos de una persona existente (semántica PATCH)."""
    try:
        persona = _get_persona(db, dni)
        if not persona:
            return None

        fields = data.model_dump(exclude_unset=True)
        _apply_fields(persona, fields)
        db.commit()
        db.refresh(persona)
        log_actualizar(modulo="personas", dni=dni, nombre=_full_name(persona), campos=fields)
        return persona
    except Exception as e:
        log_error("personas", "update", dni, str(e))
        raise


def soft_delete_persona(db: Session, dni: str) -> bool:
    """Marca a una persona como inactiva (eliminación lógica)."""
    try:
        persona = _get_persona(db, dni)
        if not persona:
            return False

        persona.activo = False
        db.commit()
        log_eliminar(modulo="personas", dni=dni, nombre=_full_name(persona))
        return True
    except Exception as e:
        log_error("padron", "soft_delete", dni, str(e))
        raise
