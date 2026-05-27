# main.py
import importlib
from pathlib import Path
from fastapi import FastAPI, APIRouter
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from contextlib import asynccontextmanager

import backend.models
from backend.models import Persona, LogEvento, FormDefinition, FormFieldMigration
from backend.database import engine, Base
from backend.routes import personas_router, form_submissions_router
from backend.routes.google_forms import router as google_forms_router
from backend.routes.form_admin import router as form_admin_router


# ─────────────────────────────────────────────
# Lifespan: crea tablas al iniciar (si la DB está disponible)
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas verificadas/creadas correctamente.")
    except Exception as e:
        print(f"⚠️ No se pudo conectar a la base de datos al iniciar: {e}")
        print("   Los endpoints de DB fallarán hasta que PostgreSQL esté disponible.")

    yield


# ─────────────────────────────────────────────
# Metadata de tags (se muestra en Swagger UI)
# ─────────────────────────────────────────────
tags_metadata = [
    {
        "name": "personas",
        "description": (
            "Operaciones sobre el registro de **personas**. "
            "Permite listar, consultar, actualizar y dar de baja ciudadanos."
        ),
    },
    {
        "name": "admin-forms",
        "description": (
            "Panel de administración de **formularios dinámicos**. "
            "Permite crear, editar y gestionar formularios schema-driven con migraciones automáticas de BD."
        ),
    },
    {
        "name": "webhooks",
        "description": "Endpoints para recibir datos de servicios externos (Google Forms).",
    },
]

# ─────────────────────────────────────────────
# Configuración de FastAPI y Swagger UI
# ─────────────────────────────────────────────
app = FastAPI(
    title="Sistema de Gestión de Padrón Municipal",
    description="""
API para la gestión del **observatorio estadístico municipal**.

## Funcionalidades

- 👤 **Personas**: Consulta, actualización y baja de ciudadanos registrados.
- 📋 **Padrón de Vecinos**: Inscripción con datos socioeconómicos (ocupación, estudios, jubilación).

## Notas

- Todos los registros usan el **DNI** como clave primaria.
- Las bajas son **lógicas** (soft delete): el registro no se elimina de la base de datos.
- Los endpoints de inscripción realizan **upsert**: crean el registro si no existe, o lo actualizan si ya existe.
""",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    contact={
        "name": "Observatorio Estadístico Municipal",
        "email": "soporte@municipio.gob.ar",
    },
    license_info={
        "name": "Uso interno",
    },
    swagger_ui_parameters={
        "filter": True,
        "deepLinking": True,
        "displayRequestDuration": True,
        "defaultModelsExpandDepth": 2,
        "docExpansion": "list",
        "syntaxHighlight.theme": "monokai",
    },
)

# ─────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Middleware: deshabilitar cache en desarrollo
# ─────────────────────────────────────────────
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/frontend/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

# ─────────────────────────────────────────────
# Frontend estático
# ─────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/frontend", StaticFiles(directory="frontend"), name="frontend")

@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse("frontend/index.html")

# ─────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────
app.include_router(personas_router)
app.include_router(google_forms_router)
app.include_router(form_admin_router)
app.include_router(form_submissions_router)

# ─────────────────────────────────────────────
# Auto-descubrimiento de routers generados
# ─────────────────────────────────────────────
_routes_dir = Path(__file__).resolve().parent / "routes"
for _f in sorted(_routes_dir.glob("auto_*.py")):
    _module_name = f"backend.routes.{_f.stem}"
    try:
        _mod = importlib.import_module(_module_name)
        if hasattr(_mod, "router") and isinstance(_mod.router, APIRouter):
            app.include_router(_mod.router)
            print(f"  ✅ Router auto-cargado: {_module_name}")
    except Exception as _e:
        print(f"  ⚠️ No se pudo cargar {_module_name}: {_e}")
