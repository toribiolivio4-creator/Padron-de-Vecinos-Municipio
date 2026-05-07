# crud.py
from sqlalchemy.orm import Session
import models, schemas

def search_personas(db: Session, dni_prefix: str):
    results = db.query(models.Persona).filter(
        models.Persona.dni.startswith(dni_prefix)
    ).limit(10).all()
    return [{"dni": p.dni, "nombres": p.nombres, "apellidos": p.apellidos} for p in results]

def get_persona(db: Session, dni: str):
    """
    Recupera todos los datos de una persona por su DNI.
    """
    return db.query(models.Persona).filter(models.Persona.dni == dni).first()

def upsert_feria(db: Session, feria_data: schemas.FeriaCreate):
    """
    Lógica de guardado para el Formulario de Ferias.
    Actualiza los datos personales y crea/actualiza la inscripción a la feria.
    """
    # 1. Buscar si la persona ya existe en el padrón
    db_persona = db.query(models.Persona).filter(models.Persona.dni == feria_data.dni).first()
    
    # Extraer datos de persona del esquema de feria
    persona_dict = feria_data.dict(exclude={'instagram_facebook', 'rubro', 'descripcion'})
    
    if db_persona:
        # Actualización de datos existentes
        for key, value in persona_dict.items():
            setattr(db_persona, key, value)
    else:
        # Creación de nuevo registro en padrón
        db_persona = models.Persona(**persona_dict)
        db.add(db_persona)

    # 2. Manejar la inscripción específica a la feria
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
            descripcion=feria_data.descripcion
        )
        db.add(db_feria)

    db.commit()
    db.refresh(db_persona)
    return {"message": "Inscripción a feria procesada correctamente"}

def upsert_padron(db: Session, padron_data: schemas.PadronCreate):
    """
    Lógica de guardado para el Formulario de Padrón de Vecinos.
    """
    db_persona = db.query(models.Persona).filter(models.Persona.dni == padron_data.dni).first()
    
    datos_actualizar = padron_data.dict()

    if db_persona:
        # Update completo de todos los campos del padrón
        for key, value in datos_actualizar.items():
            setattr(db_persona, key, value)
    else:
        # Insert de nueva persona
        db_persona = models.Persona(**datos_actualizar)
        db.add(db_persona)

    db.commit()
    db.refresh(db_persona)
    return {"message": "Datos del padrón actualizados correctamente"}


def get_all_personas(db: Session):
    return db.query(models.Persona).filter(
        models.Persona.activo == True
    ).all()

def update_persona(db: Session, dni: str, data):
    persona = db.query(models.Persona).filter(models.Persona.dni == dni).first()
    if not persona:
        return None
    for key, value in data.dict(exclude_unset=True).items():
        setattr(persona, key, value)
    db.commit()
    db.refresh(persona)
    return persona

def soft_delete_persona(db: Session, dni: str):
    persona = db.query(models.Persona).filter(models.Persona.dni == dni).first()
    if not persona:
        return False
    persona.activo = False
    db.commit()
    return True