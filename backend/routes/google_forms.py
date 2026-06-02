# routes/google_forms.py
"""
Endpoint que recibe respuestas de Google Forms vía Apps Script.

Flujo:
  Google Forms → Apps Script (onFormSubmit) → POST /webhook/google-forms → MongoDB

Agregar al main.py:
    from backend.routes.google_forms import router as google_forms_router
    app.include_router(google_forms_router)
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
import os

from backend.db.mongo_db import get_collection, ping

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
        "y la guarda en MongoDB. "
        "Llamar desde Apps Script con `onFormSubmit`."
    ),
)
def webhook_padron(
    data: GoogleFormsPadron,
    _: None = Depends(_verificar_token),
):
    if not ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection("google_forms_padron")
    doc = {
        **data.model_dump(),
        "_submitted_at": datetime.utcnow().isoformat(),
    }
    doc["fecha_nacimiento"] = str(doc["fecha_nacimiento"]) if doc.get("fecha_nacimiento") else None
    result = col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Respuesta guardada en MongoDB correctamente"}