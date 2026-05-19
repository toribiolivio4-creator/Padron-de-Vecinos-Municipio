from backend.crud.personas import (
    get_personas,
    get_persona,
    upsert_padron,
    update_persona,
    soft_delete_persona,
)
from backend.crud.ferias import upsert_feria

__all__ = [
    "get_personas",
    "get_persona",
    "upsert_padron",
    "update_persona",
    "soft_delete_persona",
    "upsert_feria",
]
