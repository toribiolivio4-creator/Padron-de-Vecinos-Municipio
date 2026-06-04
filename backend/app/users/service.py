from sqlalchemy.orm import Session

from backend.app.users.repository import (
    get_personas,
    get_persona,
    upsert_persona,
    update_persona,
    soft_delete_persona,
)
from backend.app.users.schemas import PersonaCreate
from backend.app.core.logging import log_agregar, log_actualizar, log_eliminar, log_error


def _full_name(obj) -> str:
    return f"{obj.nombres} {obj.apellidos}"


def list_personas(db: Session, dni_prefix: str = None):
    return get_personas(db, dni_prefix)


def get_persona_by_dni(db: Session, dni: str):
    return get_persona(db, dni)


def handle_upsert(db: Session, data: PersonaCreate) -> dict:
    try:
        persona, is_new = upsert_persona(db, data.model_dump())
        db.commit()
        db.refresh(persona)
        if is_new:
            log_agregar(modulo="personas", dni=persona.dni, nombre=_full_name(persona))
        else:
            log_actualizar(modulo="personas", dni=persona.dni, nombre=_full_name(persona), campos={})
        return {"message": "Resident registry record updated successfully."}
    except Exception as e:
        log_error("personas", "upsert", data.dni, str(e))
        raise


def handle_update(db: Session, dni: str, data: PersonaCreate):
    try:
        fields = data.model_dump(exclude_unset=True)
        persona = update_persona(db, dni, fields)
        if not persona:
            return None
        db.commit()
        db.refresh(persona)
        log_actualizar(modulo="personas", dni=dni, nombre=_full_name(persona), campos=fields)
        return persona
    except Exception as e:
        log_error("personas", "update", dni, str(e))
        raise


def handle_soft_delete(db: Session, dni: str) -> bool:
    try:
        persona = get_persona(db, dni)
        if not persona:
            return False
        nombre = _full_name(persona)
        ok = soft_delete_persona(db, dni)
        db.commit()
        log_eliminar(modulo="personas", dni=dni, nombre=nombre)
        return ok
    except Exception as e:
        log_error("personas", "baja", dni, str(e))
        raise
