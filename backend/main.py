# main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

import backend.models as models
from backend.database import engine
from backend.routes import personas_router, ferias_router

# Crea las tablas en la base de datos si no existen
models.Base.metadata.create_all(bind=engine)

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
        "name": "ferias",
        "description": (
            "Inscripción a **ferias comunitarias**. "
            "Registra o actualiza la participación de un ciudadano como feriante, incluyendo rubro y redes sociales."
        ),
    },
]

# ─────────────────────────────────────────────
# Configuración de FastAPI y Swagger UI
# ─────────────────────────────────────────────
app = FastAPI(
    title="Sistema de Gestión de Padrón y Ferias",
    description="""
API para la gestión del **observatorio estadístico municipal**.

## Funcionalidades

- 👤 **Personas**: Consulta, actualización y baja de ciudadanos registrados.
- 📋 **Padrón de Vecinos**: Inscripción con datos socioeconómicos (ocupación, estudios, jubilación).
- 🛍️ **Ferias Comunitarias**: Inscripción de feriantes con rubro y redes sociales.

## Notas

- Todos los registros usan el **DNI** como clave primaria.
- Las bajas son **lógicas** (soft delete): el registro no se elimina de la base de datos.
- Los endpoints de inscripción realizan **upsert**: crean el registro si no existe, o lo actualizan si ya existe.
""",
    version="1.0.0",
    openapi_tags=tags_metadata,
    contact={
        "name": "Observatorio Estadístico Municipal",
        "email": "soporte@municipio.gob.ar",
    },
    license_info={
        "name": "Uso interno",
    },
    swagger_ui_parameters={
        "filter": True,                      # Barra de búsqueda para endpoints
        "deepLinking": True,                 # Links directos a un endpoint
        "displayRequestDuration": True,      # Muestra cuánto tarda cada consulta
        "defaultModelsExpandDepth": 2,       # Expande los schemas de modelos por defecto
        "docExpansion": "list",              # "list" = endpoints visibles pero cerrados
                                             # "full" = todo abierto | "none" = todo cerrado
        "syntaxHighlight.theme": "monokai", # Tema de colores para el JSON
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
app.include_router(ferias_router)
