# crud.py
from sqlalchemy.orm import Session
import models, schemas
from logger import log_agregar, log_actualizar, log_eliminar, log_error


def search_personas(db: Session, dni_prefix: str):
    results = db.query(models.Persona).filter(
        models.Persona.dni.startswith(dni_prefix)
    ).limit(10).all()
    return [{"dni": p.dni, "nombres": p.nombres, "apellidos": p.apellidos} for p in results]


def get_persona(db: Session, dni: str):
    """Recupera todos los datos de una persona por su DNI."""
    return db.query(models.Persona).filter(models.Persona.dni == dni).first()


def upsert_feria(db: Session, feria_data: schemas.FeriaCreate):
    """
    Lógica de guardado para el Formulario de Ferias.
    Actualiza los datos personales y crea/actualiza la inscripción a la feria.
    """
    try:
        db_persona = db.query(models.Persona).filter(
            models.Persona.dni == feria_data.dni
        ).first()

        persona_dict = feria_data.dict(exclude={"instagram_facebook", "rubro", "descripcion"})
        es_nuevo = db_persona is None

        if db_persona:
            for key, value in persona_dict.items():
                setattr(db_persona, key, value)
        else:
            db_persona = models.Persona(**persona_dict)
            db.add(db_persona)

        # Inscripción a la feria
        db_feria = db.query(models.InscripcionFeria).filter(
            models.InscripcionFeria.dni_persona == feria_data.dni
        ).first()

        if db_feria:
            db_feria.instagram_facebook = feria_data.instagram_facebook
            db_feria.rubro = feria_data.rubro
            db_feria.descripcion = feria_data.descripcion
        else:
            db_feria = models.InscripcionFeria(
                dni_persona=feria_data.dni,
                instagram_facebook=feria_data.instagram_facebook,
                rubro=feria_data.rubro,
                descripcion=feria_data.descripcion,
            )
            db.add(db_feria)

        db.commit()
        db.refresh(db_persona)

        nombre_completo = f"{feria_data.nombres} {feria_data.apellidos}"

        if es_nuevo:
            log_agregar(
                modulo="feria",
                dni=feria_data.dni,
                nombre=nombre_completo,
            )
        else:
            log_actualizar(
                modulo="feria",
                dni=feria_data.dni,
                nombre=nombre_completo,
                campos={
                    "rubro": feria_data.rubro,
                    "instagram_facebook": feria_data.instagram_facebook,
                },
            )

        return {"message": "Inscripción a feria procesada correctamente"}

    except Exception as e:
        log_error("feria", "upsert", feria_data.dni, str(e))
        raise


def upsert_padron(db: Session, padron_data: schemas.PadronCreate):
    """Lógica de guardado para el Formulario de Padrón de Vecinos."""
    try:
        db_persona = db.query(models.Persona).filter(
            models.Persona.dni == padron_data.dni
        ).first()

        datos_actualizar = padron_data.dict()
        es_nuevo = db_persona is None

        if db_persona:
            for key, value in datos_actualizar.items():
                setattr(db_persona, key, value)
        else:
            db_persona = models.Persona(**datos_actualizar)
            db.add(db_persona)

        db.commit()
        db.refresh(db_persona)

        nombre_completo = f"{padron_data.nombres} {padron_data.apellidos}"

        if es_nuevo:
            log_agregar(
                modulo="padron",
                dni=padron_data.dni,
                nombre=nombre_completo,
            )
        else:
            log_actualizar(
                modulo="padron",
                dni=padron_data.dni,
                nombre=nombre_completo,
            )

        return {"message": "Datos del padrón actualizados correctamente"}

    except Exception as e:
        log_error("padron", "upsert", padron_data.dni, str(e))
        raise


def get_all_personas(db: Session):
    return db.query(models.Persona).filter(models.Persona.activo == True).all()


def update_persona(db: Session, dni: str, data):
    try:
        persona = db.query(models.Persona).filter(models.Persona.dni == dni).first()
        if not persona:
            return None

        campos_modificados = data.dict(exclude_unset=True)

        for key, value in campos_modificados.items():
            setattr(persona, key, value)

        db.commit()
        db.refresh(persona)

        log_actualizar(
            modulo="padron",
            dni=dni,
            nombre=f"{persona.nombres} {persona.apellidos}",
            campos=campos_modificados,
        )

        return persona

    except Exception as e:
        log_error("padron", "update", dni, str(e))
        raise


def soft_delete_persona(db: Session, dni: str):
    try:
        persona = db.query(models.Persona).filter(models.Persona.dni == dni).first()
        if not persona:
            return False

        nombre_completo = f"{persona.nombres} {persona.apellidos}"
        persona.activo = False
        db.commit()

        log_eliminar(
            modulo="padron",
            dni=dni,
            nombre=nombre_completo,
        )

        return True

    except Exception as e:
        log_error("padron", "soft_delete", dni, str(e))
        raise