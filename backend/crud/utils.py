# crud/utils.py — Funciones genéricas auto-generadas + compatibilidad
# Las funciones genéricas son generadas desde form-definitions.json
# Las funciones específicas se mantienen para compatibilidad con el CRUD existente

from sqlalchemy.orm import Session
from typing import Optional, Tuple, Any

from backend.models import Persona


# ─────────────────────────────────────────────
# Funciones genéricas (auto-generadas)
# ─────────────────────────────────────────────

def _get_generic(db: Session, model, pk_value: str, pk_field: str = "dni"):
    """Busca un registro genérico por su clave primaria."""
    return db.query(model).filter(getattr(model, pk_field) == pk_value).first()


def _apply_fields(obj: Any, data: dict) -> None:
    """Aplica un diccionario de campos a un objeto ORM."""
    for key, value in data.items():
        if hasattr(obj, key):
            setattr(obj, key, value)


def _upsert_generic(db: Session, model, fields: dict, pk_field: str = "dni") -> Tuple[Any, bool]:
    """Crea o actualiza un registro genérico. Devuelve (instancia, es_nuevo)."""
    pk_value = fields.get(pk_field)
    if not pk_value:
        raise ValueError(f"Primary key field '{pk_field}' is required")

    instance = _get_generic(db, model, pk_value, pk_field)
    is_new = instance is None

    if instance:
        _apply_fields(instance, fields)
    else:
        instance = model(**fields)
        db.add(instance)

    return instance, is_new


# ─────────────────────────────────────────────
# Funciones específicas (compatibilidad CRUD existente)
# ─────────────────────────────────────────────

def _get_persona(db: Session, dni: str) -> Optional[Persona]:
    """Busca a una persona por DNI. Devuelve None si no se encuentra."""
    return db.query(Persona).filter(Persona.dni == dni).first()


def _upsert_persona(db: Session, fields: dict) -> Tuple[Persona, bool]:
    """
    Crea o actualiza una Persona a partir de un diccionario de campos.
    Devuelve (instancia, es_nueva). No realiza commit.
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
    """Envía la llamada de registro correspondiente después de un upsert."""
    from backend.logger import log_agregar, log_actualizar
    if is_new:
        log_agregar(modulo=modulo, dni=dni, nombre=nombre)
    else:
        log_actualizar(modulo=modulo, dni=dni, nombre=nombre, campos=campos)


def _full_name(obj) -> str:
    return f"{obj.nombres} {obj.apellidos}"
