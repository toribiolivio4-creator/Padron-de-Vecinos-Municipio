# routes/__init__.py
from .personas import router as personas_router
from .form_submissions import router as form_submissions_router

__all__ = ["personas_router", "form_submissions_router"]
