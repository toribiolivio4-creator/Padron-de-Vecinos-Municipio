from typing import Any, Tuple, Optional

from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.orm import declarative_base, Session
from sqlalchemy.sql import func
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

from backend.app.core.config import settings

Base = declarative_base()


# ── LogEvento model ──

class LogEvento(Base):
    __tablename__ = "logs_eventos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    nivel = Column(String(10), nullable=False)
    accion = Column(String(20), nullable=False)
    modulo = Column(String(50), nullable=False)
    dni = Column(String, nullable=True)
    nombre = Column(String, nullable=True)
    campos = Column(Text, nullable=True)
    error = Column(Text, nullable=True)


# ── Generic helpers ──

def apply_fields(obj: Any, data: dict) -> None:
    for key, value in data.items():
        if hasattr(obj, key):
            setattr(obj, key, value)


def get_generic(db: Session, model, pk_value: str, pk_field: str = "dni") -> Optional[Any]:
    return db.query(model).filter(getattr(model, pk_field) == pk_value).first()


def upsert_generic(db: Session, model, fields: dict, pk_field: str = "dni") -> Tuple[Any, bool]:
    pk_value = fields.get(pk_field)
    if not pk_value:
        raise ValueError(f"Primary key field '{pk_field}' is required")
    instance = get_generic(db, model, pk_value, pk_field)
    is_new = instance is None
    if instance:
        apply_fields(instance, fields)
    else:
        instance = model(**fields)
        db.add(instance)
    return instance, is_new


# ── MongoDB ──

_mongo_client = None
_mongo_db = None


def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(settings.mongo_url, serverSelectionTimeoutMS=3000)
    return _mongo_client


def get_mongo_db():
    global _mongo_db
    if _mongo_db is None:
        client = get_mongo_client()
        _mongo_db = client[settings.mongo_db_name]
    return _mongo_db


def mongo_ping():
    try:
        get_mongo_client().admin.command("ping")
        return True
    except ConnectionFailure:
        return False


def get_collection(name):
    return get_mongo_db()[name]


def close_mongo():
    global _mongo_client, _mongo_db
    if _mongo_client:
        _mongo_client.close()
    _mongo_client = None
    _mongo_db = None
