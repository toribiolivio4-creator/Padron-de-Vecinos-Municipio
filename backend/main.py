from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import backend.models as models, backend.schemas as schemas, backend.crud as crud
from backend.database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Gestión de Padrón y Ferias")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

@app.get("/")
def serve_frontend():
    return FileResponse("frontend/index.html")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ⚠️ IMPORTANTE: rutas específicas SIEMPRE antes que las que tienen parámetros

@app.get("/personas", response_model=List[schemas.PersonaBase])
def listar_personas(db: Session = Depends(get_db)):
    return crud.get_all_personas(db)

@app.get("/personas/search/{dni_prefix}", response_model=List[dict])
def buscar_por_dni(dni_prefix: str, db: Session = Depends(get_db)):
    return crud.search_personas(db, dni_prefix)

@app.get("/personas/{dni}", response_model=schemas.PersonaBase)
def obtener_persona(dni: str, db: Session = Depends(get_db)):
    persona = crud.get_persona(db, dni)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona

@app.post("/padron-vecinos/")
def registrar_padron(data: schemas.PadronCreate, db: Session = Depends(get_db)):
    return crud.upsert_padron(db, data)

@app.put("/personas/{dni}", response_model=schemas.PersonaBase)
def actualizar_persona(dni: str, data: schemas.PadronCreate, db: Session = Depends(get_db)):
    persona = crud.update_persona(db, dni, data)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona

@app.patch("/personas/{dni}/baja")
def baja_persona(dni: str, db: Session = Depends(get_db)):
    ok = crud.soft_delete_persona(db, dni)
    if not ok:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"mensaje": "Persona dada de baja correctamente"}

@app.post("/inscripcion-feria/")
def registrar_feria(data: schemas.FeriaCreate, db: Session = Depends(get_db)):
    return crud.upsert_feria(db, data)