from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from contextlib import asynccontextmanager

from backend.app.db.base import Base
from backend.app.db.session import engine
from backend.app.db.base import LogEvento
from backend.app.users.models import Persona
from backend.app.forms.models import FormDefinition, FormFieldMigration
from backend.app.users.router import router as personas_router
from backend.app.auth.router import router as auth_router
from backend.app.forms.router import admin_router, submissions_router
from backend.app.core.exceptions import register_exception_handlers

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        print("Tablas verificadas/creadas correctamente.")
    except Exception as e:
        print(f"No se pudo conectar a la base de datos al iniciar: {e}")
    yield


tags_metadata = [
    {
        "name": "personas",
        "description": "Operaciones sobre el registro de personas. Permite listar, consultar, actualizar y dar de baja ciudadanos.",
    },
    {
        "name": "admin-forms",
        "description": "Panel de administracion de formularios dinamicos. Permite crear, editar y gestionar formularios schema-driven con migraciones automaticas de BD.",
    },
    {
        "name": "webhooks",
        "description": "Endpoints para recibir datos de servicios externos (Google Forms).",
    },
    {
        "name": "form-submissions",
        "description": "Endpoints para envio y consulta de respuestas de formularios publicos.",
    },
]

app = FastAPI(
    title="Sistema de Gestion de Padron Municipal",
    description="""
API para la gestion del observatorio estadistico municipal.

## Funcionalidades
- **Personas**: Consulta, actualizacion y baja de ciudadanos registrados.
- **Padron de Vecinos**: Inscripcion con datos socioeconomicos.
- **Formularios**: Creacion dinamica y recepcion de respuestas.

## Notas
- Todos los registros usan el **DNI** como clave primaria.
- Las bajas son **logicas** (soft delete).
- Los endpoints de inscripcion realizan **upsert**.
""",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    contact={
        "name": "Observatorio Estadistico Municipal",
        "email": "soporte@municipio.gob.ar",
    },
    license_info={"name": "Uso interno"},
    swagger_ui_parameters={
        "filter": True,
        "deepLinking": True,
        "displayRequestDuration": True,
        "defaultModelsExpandDepth": 2,
        "docExpansion": "list",
        "syntaxHighlight.theme": "monokai",
    },
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/frontend/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


app.add_middleware(NoCacheMiddleware)

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")


@app.get("/", include_in_schema=False)
def serve_frontend():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


app.include_router(personas_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(submissions_router)
