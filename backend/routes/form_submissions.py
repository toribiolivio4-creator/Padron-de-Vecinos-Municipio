from fastapi import APIRouter, HTTPException

from backend.mongo_db import get_collection, ping

router = APIRouter(prefix="/submissions", tags=["form-submissions"])


@router.get("/{collection_name}")
def list_submissions(collection_name: str, limit: int = 50, skip: int = 0):
    if not ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection(collection_name)
    cursor = col.find({}, {"_id": 0}).sort("id", -1).skip(skip).limit(limit)
    return list(cursor)


@router.get("/{collection_name}/{record_id}")
def get_submission(collection_name: str, record_id: int):
    if not ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection(collection_name)
    doc = col.find_one({"id": record_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return doc


@router.get("/{collection_name}/count")
def count_submissions(collection_name: str):
    if not ping():
        raise HTTPException(status_code=503, detail="MongoDB no disponible")

    col = get_collection(collection_name)
    return {"collection": collection_name, "count": col.count_documents({})}
