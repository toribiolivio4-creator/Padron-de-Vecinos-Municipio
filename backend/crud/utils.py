from sqlalchemy.orm import Session
from typing import Optional

from backend.models import Persona


def _get_persona(db: Session, dni: str) -> Optional[Persona]:
    """Busca a una persona por DNI. Devuelve None si no se encuentra."""
    return db.query(Persona).filter(Persona.dni == dni).first()


def _apply_fields(obj, data: dict) -> None:
    """Aplica un diccionario de campos a un objeto ORM."""
    for key, value in data.items():
        setattr(obj, key, value)


def _upsert_persona(db: Session, fields: dict) -> tuple[Persona, bool]:
    """
    Crea o actualiza una Persona a partir de un diccionario de campos.
    Devuelve (instancia, es_nueva). No realiza ninguna confirmación; quien la llama decide cuándo.
    """
    persona = _get_persona(db, fields["dni"])
    is_new = persona is None

    if persona:
        _apply_fields(persona, fields)
    else:
        persona = Persona(**fields)
        db.add(persona)

    return persona, is_new


def _log_upsert(modulo: str, is_new: bool, dni: str, nombre: str, campos: dict = None) -> None:
    """Envía la llamada de registro correspondiente después de una operación de creación o actualización."""
    from backend.logger import log_agregar, log_actualizar
    if is_new:
        log_agregar(modulo=modulo, dni=dni, nombre=nombre)
    else:
        log_actualizar(modulo=modulo, dni=dni, nombre=nombre, campos=campos)


def _full_name(obj) -> str:
    return f"{obj.nombres} {obj.apellidos}"
