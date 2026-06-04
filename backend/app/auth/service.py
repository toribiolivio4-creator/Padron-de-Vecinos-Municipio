from datetime import datetime

from backend.app.db.base import get_collection, mongo_ping
from backend.app.auth.schemas import GoogleFormsPadron


def process_google_forms_padron(data: GoogleFormsPadron) -> dict:
    if not mongo_ping():
        raise Exception("MongoDB no disponible")

    col = get_collection("google_forms_padron")
    doc = {
        **data.model_dump(),
        "_submitted_at": datetime.utcnow().isoformat(),
    }
    doc["fecha_nacimiento"] = str(doc["fecha_nacimiento"]) if doc.get("fecha_nacimiento") else None
    result = col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Respuesta guardada en MongoDB correctamente"}
