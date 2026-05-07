# logger.py
import logging
import os
from datetime import datetime

# ─────────────────────────────────────────────
# Configuración del archivo de log
# ─────────────────────────────────────────────
LOG_DIR  = "logs"
LOG_FILE = os.path.join(LOG_DIR, "cambios.log")

os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),   # también muestra en consola
    ],
)

logger = logging.getLogger("padron")


# ─────────────────────────────────────────────
# Funciones de registro por acción
# ─────────────────────────────────────────────

def log_agregar(modulo: str, dni: str, nombre: str = ""):
    """Registra la creación de un nuevo registro."""
    logger.info(f"[AGREGAR] módulo={modulo} | dni={dni} | nombre={nombre}")


def log_actualizar(modulo: str, dni: str, nombre: str = "", campos: dict = None):
    """Registra la actualización de un registro existente."""
    detalle = ""
    if campos:
        detalle = " | campos=" + ", ".join(f"{k}={v}" for k, v in campos.items())
    logger.info(f"[ACTUALIZAR] módulo={modulo} | dni={dni} | nombre={nombre}{detalle}")


def log_eliminar(modulo: str, dni: str, nombre: str = ""):
    """Registra la eliminación (baja lógica) de un registro."""
    logger.warning(f"[ELIMINAR] módulo={modulo} | dni={dni} | nombre={nombre}")


def log_error(modulo: str, accion: str, dni: str, error: str):
    """Registra errores inesperados durante una operación."""
    logger.error(f"[ERROR] módulo={modulo} | accion={accion} | dni={dni} | error={error}")