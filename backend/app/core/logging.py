import json
import logging
from typing import Optional

from backend.app.db.session import SessionLocal
from backend.app.db.base import LogEvento

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
_console = logging.getLogger("padron")


def _escribir_log(
    nivel: str,
    accion: str,
    modulo: str,
    dni: Optional[str] = None,
    nombre: Optional[str] = None,
    campos: Optional[dict] = None,
    error: Optional[str] = None,
):
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
        _console.error(
            f"[LOG-DB-ERROR] No se pudo escribir en logs_eventos: {exc} | "
            f"accion={accion} modulo={modulo} dni={dni}"
        )


def log_agregar(modulo: str, dni: str, nombre: str = ""):
    _console.info(f"[AGREGAR] modulo={modulo} | dni={dni} | nombre={nombre}")
    _escribir_log(nivel="INFO", accion="AGREGAR", modulo=modulo, dni=dni, nombre=nombre)


def log_actualizar(modulo: str, dni: str, nombre: str = "", campos: dict = None):
    detalle = ""
    if campos:
        detalle = " | campos=" + ", ".join(f"{k}={v}" for k, v in campos.items())
    _console.info(f"[ACTUALIZAR] modulo={modulo} | dni={dni} | nombre={nombre}{detalle}")
    _escribir_log(nivel="INFO", accion="ACTUALIZAR", modulo=modulo, dni=dni, nombre=nombre, campos=campos)


def log_eliminar(modulo: str, dni: str, nombre: str = ""):
    _console.warning(f"[ELIMINAR] modulo={modulo} | dni={dni} | nombre={nombre}")
    _escribir_log(nivel="WARNING", accion="ELIMINAR", modulo=modulo, dni=dni, nombre=nombre)


def log_error(modulo: str, accion: str, dni: str, error: str):
    _console.error(f"[ERROR] modulo={modulo} | accion={accion} | dni={dni} | error={error}")
    _escribir_log(nivel="ERROR", accion="ERROR", modulo=modulo, dni=dni, error=error)
