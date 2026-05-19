from sqlalchemy.orm import Session

from backend.models import Persona, InscripcionFeria
from backend.schemas import FeriaCreate, PersonaBase
from backend.crud.utils import _upsert_persona, _apply_fields, _log_upsert, _full_name
from backend.logger import log_error


def upsert_feria(db: Session, data: FeriaCreate) -> dict:
    """
    Crea o actualiza un registro de feriado.
    También sincroniza siempre el registro de la persona vinculada.
    """
    try:
        persona_fields = data.model_dump(include=set(PersonaBase.model_fields.keys()))
        persona, is_new = _upsert_persona(db, persona_fields)

        feria_fields = {
            "instagram_facebook": data.instagram_facebook,
            "rubro": data.rubro,
            "descripcion": data.descripcion,
        }
        feria = db.query(InscripcionFeria).filter(
            InscripcionFeria.dni_persona == data.dni
        ).first()

        if feria:
            _apply_fields(feria, feria_fields)
        else:
            db.add(InscripcionFeria(dni_persona=data.dni, **feria_fields))

        db.commit()
        db.refresh(persona)
        _log_upsert("feria", is_new, data.dni, _full_name(data), campos=feria_fields)
        return {"message": "Fair registration processed successfully."}
    except Exception as e:
        log_error("feria", "upsert", data.dni, str(e))
        raise
