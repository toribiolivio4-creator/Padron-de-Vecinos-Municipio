from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas, crud
from database import SessionLocal, engine

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

@app.get("/personas/search/{dni_prefix}", response_model=List[dict])
def buscar_por_dni(dni_prefix: str, db: Session = Depends(get_db)):
    return crud.search_personas(db, dni_prefix)

@app.get("/personas/{dni}", response_model=schemas.PersonaBase)
def obtener_persona(dni: str, db: Session = Depends(get_db)):
    persona = crud.get_persona(db, dni)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return persona

@app.post("/inscripcion-feria/")
def registrar_feria(data: schemas.FeriaCreate, db: Session = Depends(get_db)):
    return crud.upsert_feria(db, data)

@app.post("/padron-vecinos/")
def registrar_padron(data: schemas.PadronCreate, db: Session = Depends(get_db)):
    return crud.upsert_padron(db, data)