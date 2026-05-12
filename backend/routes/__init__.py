# routes/__init__.py
from .personas import router as personas_router
from .padron import router as padron_router
from .ferias import router as ferias_router

__all__ = ["personas_router", "padron_router", "ferias_router"]
