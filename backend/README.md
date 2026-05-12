# Backend — Resident Registry & Community Fairs Management System

REST API built with **FastAPI** and **SQLAlchemy**, connected to **PostgreSQL**. It manages the resident registry (padrón de vecinos), person records, and community fair registrations, while also serving the static frontend from the root route.

---

## Tech Stack

| Technology | Role |
|---|---|
| Python 3.10+ | Main language |
| FastAPI | HTTP framework / REST API |
| SQLAlchemy | ORM for database access |
| PostgreSQL | Relational database |
| Pydantic v2 | Data validation and serialization |
| Uvicorn | ASGI server |

---

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── database.py          # SQLAlchemy engine and session configuration
├── models.py            # ORM models (database tables)
├── schemas.py           # Pydantic schemas (input/output validation)
├── crud.py              # Business logic and data access layer
├── logger.py            # Event logging to database and console
├── routes/
│   ├── __init__.py      # Exports the three routers
│   ├── personas.py      # Person query and management endpoints
│   ├── padron.py        # Resident registry registration endpoint
│   └── ferias.py        # Community fair registration endpoint
└── logs/
    └── cambios.log      # Historical change log
```

---

## Database Models

### `Persona`
Main citizens table. Primary key: `dni`.

| Field | Type | Description |
|---|---|---|
| `dni` | String (PK) | National Identity Document number |
| `nombres` | String | First name(s) |
| `apellidos` | String | Last name(s) |
| `celular` | String | Mobile phone number |
| `fecha_nacimiento` | Date | Date of birth |
| `localidad` | String | City / district of residence |
| `domicilio` | String (optional) | Street address |
| `email` | String (optional) | Email address |
| `sexo` | String (optional) | Gender |
| `ocupacion` | String (optional) | Occupation |
| `jubilado` | Boolean | Is retired |
| `pensionado` | Boolean | Receives a pension |
| `nivel_estudios` | String (optional) | Highest education level |
| `activo` | Boolean | Active/inactive status (soft delete flag) |

### `InscripcionFeria`
Community fair registrations. Primary key: `dni_persona` (FK → `personas.dni`).

| Field | Type | Description |
|---|---|---|
| `dni_persona` | String (PK/FK) | DNI of the registered person |
| `instagram_facebook` | String | Vendor's social media account |
| `rubro` | String | Category of products or services |
| `descripcion` | String | Description of the business/venture |

### `LogEvento`
Audit log for all write operations. Written automatically by `logger.py`.

| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK) | Auto-incremented identifier |
| `timestamp` | DateTime | Date and time of the event |
| `nivel` | String | Level: `INFO`, `WARNING`, `ERROR` |
| `accion` | String | Action: `AGREGAR`, `ACTUALIZAR`, `ELIMINAR`, `ERROR` |
| `modulo` | String | Source module: `padron` or `feria` |
| `dni` | String (optional) | DNI involved in the operation |
| `nombre` | String (optional) | Full name of the person |
| `campos` | Text (JSON) | Modified fields (for update operations) |
| `error` | Text (optional) | Error description (if applicable) |

---

## API Endpoints

### Frontend
| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Serves `frontend/index.html` |

### Persons (`/personas`)
| Method | Route | Description |
|---|---|---|
| `GET` | `/personas` | Lists all active persons |
| `GET` | `/personas?dni_prefix={value}` | Filters by DNI prefix (max 10 results, useful for autocomplete) |
| `GET` | `/personas/{dni}` | Returns a single person by DNI |
| `PUT` | `/personas/{dni}` | Fully updates a person's data |
| `PATCH` | `/personas/{dni}/baja` | Soft delete: marks the person as inactive |

### Resident Registry (`/padron-vecinos`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/padron-vecinos` | Creates or updates a registry record (upsert by DNI) |

### Community Fairs (`/inscripcion-feria`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/inscripcion-feria` | Creates or updates a fair registration (upsert). Also syncs the linked person record. |

> Interactive API documentation is available at `/docs` (Swagger UI) and `/redoc` once the application is running.

---

## Installation & Setup

### Prerequisites
- Python 3.10 or higher
- A running and accessible PostgreSQL instance
- A `frontend/` directory must exist at the project root (one level above `backend/`)

### 1. Create and activate the virtual environment

From the `backend/` folder:

```bash
python3 -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows
```

### 2. Install dependencies

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic email-validator
```

### 3. Configure the database connection

Edit `backend/database.py` and update the connection URL:

```python
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@host:port/database_name"
```

The current default points to a local instance:

```python
postgresql://postgres:dacia@127.0.0.1:8000/postgres
```

> ⚠️ **Important:** Do not commit real credentials to the repository. Use environment variables or a `.env` file with [python-dotenv](https://pypi.org/project/python-dotenv/) instead.

### 4. Create the tables

Tables are created automatically on startup via `Base.metadata.create_all()`. No manual migrations are needed for the initial setup.

---

## Running the Application

From the **project root** (the parent directory of `backend/`):

```bash
source backend/venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The application will be available at `http://localhost:8000`.

---

## Logging System

The `logger.py` module automatically records all write operations:

- **`log_agregar`** — triggered when a new record is created.
- **`log_actualizar`** — triggered when an existing record is updated, storing the modified fields.
- **`log_eliminar`** — triggered when a soft delete is performed.
- **`log_error`** — triggered on any unexpected exception during a write operation.

Each event is persisted to the `logs_eventos` table in the database. If the database write fails, the event is printed to the console as a fallback.

---

## Additional Notes

- **Soft delete:** persons are never physically removed from the database. Setting `activo = False` excludes them from queries while preserving the full record history.
- **Upsert logic:** both `/padron-vecinos` and `/inscripcion-feria` apply upsert semantics — if the DNI already exists the record is updated; otherwise it is created.
- **CORS:** the application currently allows requests from any origin (`allow_origins=["*"]`). Restrict this in `main.py` before deploying to production.
- **Static frontend:** frontend files are served from the `frontend/` directory at the project root. The backend exposes the `/static`, `/frontend`, and `/` routes for this purpose.
