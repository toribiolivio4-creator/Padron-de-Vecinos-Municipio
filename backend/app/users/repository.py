from typing import Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.users.models import Persona
from backend.app.db.base import apply_fields


def get_personas(db: Session, dni_prefix: Optional[str] = None) -> list[Persona]:
    query = db.query(Persona).filter(Persona.activo == True)
    if dni_prefix:
        query = query.filter(Persona.dni.startswith(dni_prefix)).limit(10)
    return query.all()


def get_persona(db: Session, dni: str) -> Optional[Persona]:
    return db.query(Persona).filter(Persona.dni == dni).first()


def upsert_persona(db: Session, fields: dict) -> Tuple[Persona, bool]:
    persona = get_persona(db, fields["dni"])
    is_new = persona is None
    if persona:
        apply_fields(persona, fields)
    else:
        persona = Persona(**fields)
        db.add(persona)
    return persona, is_new


def update_persona(db: Session, dni: str, fields: dict) -> Optional[Persona]:
    persona = get_persona(db, dni)
    if not persona:
        return None
    apply_fields(persona, fields)
    return persona


def soft_delete_persona(db: Session, dni: str) -> bool:
    persona = get_persona(db, dni)
    if not persona:
        return False
    persona.activo = False
    return True
