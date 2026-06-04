from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.forms.repository import get_form
from backend.app.db.base import get_collection, mongo_ping


def submit_form_data(form_name: str, data: Dict[str, Any]) -> dict:
    if not mongo_ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection(form_name)
    doc = {**data, "_submitted_at": datetime.utcnow().isoformat()}
    result = col.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Formulario guardado correctamente"}


def list_submissions(collection_name: str, limit: int = 50, skip: int = 0):
    if not mongo_ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    from bson import ObjectId

    col = get_collection(collection_name)
    cursor = col.find({"_activo": {"$ne": False}}).sort("_id", -1).skip(skip).limit(limit)

    result = []
    for doc in cursor:
        doc["_id_str"] = str(doc.pop("_id"))
        result.append(doc)
    return result


def get_submission(collection_name: str, record_id: int):
    if not mongo_ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection(collection_name)
    doc = col.find_one({"id": record_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return doc


def count_submissions(collection_name: str):
    if not mongo_ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection(collection_name)
    return {"collection": collection_name, "count": col.count_documents({})}


def soft_delete_submission(collection_name: str, record_id: str):
    if not mongo_ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    from bson import ObjectId

    try:
        obj_id = ObjectId(record_id)
    except:
        raise HTTPException(status_code=400, detail="ID invalido")

    col = get_collection(collection_name)
    result = col.update_one(
        {"_id": obj_id},
        {"$set": {"_activo": False, "_deactivated_at": datetime.utcnow().isoformat()}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    return {"message": "Registro desactivado correctamente"}
