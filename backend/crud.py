# crud.py
from sqlalchemy.orm import Session
from typing import Optional

import backend.models as models
import backend.schemas as schemas
from backend.logger import log_agregar, log_actualizar, log_eliminar, log_error


# ─────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────

def _get_persona(db: Session, dni: str) -> Optional[models.Persona]:
    """Busca a una persona por DNI. Devuelve None si no se encuentra."""
    return db.query(models.Persona).filter(models.Persona.dni == dni).first()


def _apply_fields(obj, data: dict) -> None:
    """Aplica un diccionario de campos a un objeto ORM."""
    for key, value in data.items():
        setattr(obj, key, value)


def _upsert_persona(db: Session, fields: dict) -> tuple[models.Persona, bool]:
    """
    Crea o actualiza una Persona a partir de un diccionario de campos.
    Devuelve (instancia, es_nueva). No realiza ninguna confirmación; quien la llama decide cuándo.
    """
    persona = _get_persona(db, fields["dni"])
    is_new = persona is None

    if persona:
        _apply_fields(persona, fields)
    else:
        persona = models.Persona(**fields)
        db.add(persona)

    return persona, is_new


def _log_upsert(modulo: str, is_new: bool, dni: str, nombre: str, campos: dict = None) -> None:
    """Envía la llamada de registro correspondiente después de una operación de creación o actualización."""
    if is_new:
        log_agregar(modulo=modulo, dni=dni, nombre=nombre)
    else:
        log_actualizar(modulo=modulo, dni=dni, nombre=nombre, campos=campos)


def _full_name(obj) -> str:
    return f"{obj.nombres} {obj.apellidos}"


# ─────────────────────────────────────────────
# Read
# ─────────────────────────────────────────────

def get_personas(db: Session, dni_prefix: Optional[str] = None) -> list[models.Persona]:
    """
    Muestra la lista de personas activas. Si se proporciona `dni_prefix`, filtra por DNI.
    (máximo 10 resultados, pensado para autocompletar).
    """
    query = db.query(models.Persona).filter(models.Persona.activo == True)
    if dni_prefix:
        query = query.filter(models.Persona.dni.startswith(dni_prefix)).limit(10)
    return query.all()


def get_persona(db: Session, dni: str) -> Optional[models.Persona]:
    """Devuelve los datos completos de una persona por su número de DNI."""
    return _get_persona(db, dni)


# ─────────────────────────────────────────────
# Write — Resident registry
# ─────────────────────────────────────────────

def upsert_padron(db: Session, data: schemas.PadronCreate) -> dict:
    """Crea o actualiza un registro en el registro de residentes."""
    try:
        persona, is_new = _upsert_persona(db, data.model_dump())
        db.commit()
        db.refresh(persona)
        _log_upsert("padron", is_new, data.dni, _full_name(data))
        return {"message": "Resident registry record updated successfully."}
    except Exception as e:
        log_error("padron", "upsert", data.dni, str(e))
        raise


def update_persona(db: Session, dni: str, data: schemas.PadronCreate) -> Optional[models.Persona]:
    """Actualiza campos específicos de una persona existente (semántica PATCH)."""
    try:
        persona = _get_persona(db, dni)
        if not persona:
            return None

        fields = data.model_dump(exclude_unset=True)
        _apply_fields(persona, fields)
        db.commit()
        db.refresh(persona)
        log_actualizar(modulo="padron", dni=dni, nombre=_full_name(persona), campos=fields)
        return persona
    except Exception as e:
        log_error("padron", "update", dni, str(e))
        raise


def soft_delete_persona(db: Session, dni: str) -> bool:
    """Marca a una persona como inactiva (eliminación lógica)."""
    try:
        persona = _get_persona(db, dni)
        if not persona:
            return False

        persona.activo = False
        db.commit()
        log_eliminar(modulo="padron", dni=dni, nombre=_full_name(persona))
        return True
    except Exception as e:
        log_error("padron", "soft_delete", dni, str(e))
        raise


# ─────────────────────────────────────────────
# Escribir — Ferias comunitarias
# ─────────────────────────────────────────────

def upsert_feria(db: Session, data: schemas.FeriaCreate) -> dict:
    """
    Crea o actualiza un registro de feriado.
    También sincroniza siempre el registro de la persona vinculada.
    """
    try:
        persona_fields = data.model_dump(include=set(schemas.PersonaBase.model_fields.keys()))
        persona, is_new = _upsert_persona(db, persona_fields)

        feria_fields = {
            "instagram_facebook": data.instagram_facebook,
            "rubro": data.rubro,
            "descripcion": data.descripcion,
        }
        feria = db.query(models.InscripcionFeria).filter(
            models.InscripcionFeria.dni_persona == data.dni
        ).first()

        if feria:
            _apply_fields(feria, feria_fields)
        else:
            db.add(models.InscripcionFeria(dni_persona=data.dni, **feria_fields))

        db.commit()
        db.refresh(persona)
        _log_upsert("feria", is_new, data.dni, _full_name(data), campos=feria_fields)
        return {"message": "Fair registration processed successfully."}
    except Exception as e:
        log_error("feria", "upsert", data.dni, str(e))
        raise