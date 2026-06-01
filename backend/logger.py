# logger.py
"""
Registro de eventos en la base de datos (tabla logs_eventos).
Cada función abre su propia sesión corta e independiente para que
los logs no queden atados al ciclo de vida de la sesión de la request.
En caso de fallo de BD, el evento se imprime en consola como respaldo.
"""
import json
import logging
from typing import Optional

from backend.db.database import SessionLocal

# Consola como respaldo (sin archivo de log)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_console = logging.getLogger("padron")


# ─────────────────────────────────────────────
# Núcleo privado
# ─────────────────────────────────────────────

def _escribir_log(
    nivel: str,
    accion: str,
    modulo: str,
    dni: Optional[str] = None,
    nombre: Optional[str] = None,
    campos: Optional[dict] = None,
    error: Optional[str] = None,
):
    """Inserta una fila en logs_eventos. Si falla, escribe en consola."""
    # Import aquí para evitar circular imports (models → database → models)
    from backend.models import LogEvento

    campos_str = json.dumps(campos, ensure_ascii=False, default=str) if campos else None

    try:
        db = SessionLocal()
        try:
            entrada = LogEvento(
                nivel=nivel,
                accion=accion,
                modulo=modulo,
                dni=dni,
                nombre=nombre,
                campos=campos_str,
                error=error,
            )
            db.add(entrada)
            db.commit()
        finally:
            db.close()
    except Exception as exc:
        # Fallback: al menos queda en consola
        _console.error(
            f"[LOG-DB-ERROR] No se pudo escribir en logs_eventos: {exc} | "
            f"accion={accion} módulo={modulo} dni={dni}"
        )


# ─────────────────────────────────────────────
# API pública (igual que antes)
# ─────────────────────────────────────────────

def log_agregar(modulo: str, dni: str, nombre: str = ""):
    """Registra la creación de un nuevo registro."""
    _console.info(f"[AGREGAR] módulo={modulo} | dni={dni} | nombre={nombre}")
    _escribir_log(nivel="INFO", accion="AGREGAR", modulo=modulo, dni=dni, nombre=nombre)


def log_actualizar(modulo: str, dni: str, nombre: str = "", campos: dict = None):
    """Registra la actualización de un registro existente."""
    detalle = ""
    if campos:
        detalle = " | campos=" + ", ".join(f"{k}={v}" for k, v in campos.items())
    _console.info(f"[ACTUALIZAR] módulo={modulo} | dni={dni} | nombre={nombre}{detalle}")
    _escribir_log(nivel="INFO", accion="ACTUALIZAR", modulo=modulo, dni=dni, nombre=nombre, campos=campos)


def log_eliminar(modulo: str, dni: str, nombre: str = ""):
    """Registra la eliminación (baja lógica) de un registro."""
    _console.warning(f"[ELIMINAR] módulo={modulo} | dni={dni} | nombre={nombre}")
    _escribir_log(nivel="WARNING", accion="ELIMINAR", modulo=modulo, dni=dni, nombre=nombre)


def log_error(modulo: str, accion: str, dni: str, error: str):
    """Registra errores inesperados durante una operación."""
    _console.error(f"[ERROR] módulo={modulo} | accion={accion} | dni={dni} | error={error}")
    _escribir_log(nivel="ERROR", accion="ERROR", modulo=modulo, dni=dni, error=error)
