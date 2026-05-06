# database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configuración de la URL de PostgreSQL
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_base_de_datos
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:dacia@127.0.0.1:8000/postgres"

# El motor de la base de datos
# PostgreSQL no requiere 'check_same_thread' como SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)

# Sesión local para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base para que nuestros modelos de SQLAlchemy hereden de ella
Base = declarative_base()

def get_db():
    """
    Función de utilidad (Dependency Injection) para FastAPI.
    Crea una sesión por cada petición y la cierra al finalizar.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()