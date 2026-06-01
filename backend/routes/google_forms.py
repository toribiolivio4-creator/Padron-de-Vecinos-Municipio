# routes/google_forms.py
"""
Endpoint que recibe respuestas de Google Forms vía Apps Script.

Flujo:
  Google Forms → Apps Script (onFormSubmit) → POST /webhook/google-forms → BD

Agregar al main.py:
    from backend.routes.google_forms import router as google_forms_router
    app.include_router(google_forms_router)
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
import os

import backend.crud as crud
import backend.schemas as schemas
from backend.db.database import get_db

router = APIRouter(prefix="/webhook", tags=["webhooks"])

# ──────────────────────────────────────────────────────────
# Token de seguridad
# Definí la variable de entorno WEBHOOK_SECRET con un valor
# aleatorio y configurá lo mismo en el Apps Script.
# Si no querés seguridad (red interna), podés sacarlo.
# ──────────────────────────────────────────────────────────
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "")


def _verificar_token(x_webhook_secret: Optional[str] = Header(None)):
    if WEBHOOK_SECRET and x_webhook_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Token inválido")


# ──────────────────────────────────────────────────────────
# Modelos de entrada (lo que manda Apps Script)
# Los nombres de campo tienen que coincidir con lo que
# configurás en el Apps Script (ver más abajo).
# ──────────────────────────────────────────────────────────
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional as Opt


class GoogleFormsPadron(BaseModel):
    """
    Mapeo del formulario de Padrón de Vecinos.
    Ajustá los nombres de campo según las preguntas de tu Form.
    """
    dni: str
    nombres: str
    apellidos: str
    celular: Opt[str] = None
    fecha_nacimiento: Opt[date] = None   # formato YYYY-MM-DD
    localidad: Opt[str] = None
    domicilio: Opt[str] = None
    email: Opt[str] = None
    sexo: Opt[str] = None
    ocupacion: Opt[str] = None
    jubilado: bool = False
    pensionado: bool = False
    nivel_estudios: Opt[str] = None


# ──────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────

@router.post(
    "/google-forms/padron",
    status_code=201,
    summary="Webhook: Google Forms → Padrón de Vecinos",
    description=(
        "Recibe la respuesta de un formulario de Google Forms "
        "y la inserta/actualiza en la base de datos. "
        "Llamar desde Apps Script con `onFormSubmit`."
    ),
)
def webhook_padron(
    data: GoogleFormsPadron,
    db: Session = Depends(get_db),
    _: None = Depends(_verificar_token),
):
    padron_data = schemas.PadronCreate(**data.model_dump())
    return crud.upsert_padron(db, padron_data)