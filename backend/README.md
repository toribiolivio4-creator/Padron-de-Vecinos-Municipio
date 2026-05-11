# Backend

FastAPI backend for the `padron-vecinos` application.

This service manages the padrón de vecinos, person records, and feria registrations using PostgreSQL.

## Features

- Serves the main frontend from `/`
- Provides REST endpoints for:
  - listing active persons
  - searching by DNI prefix
  - retrieving a person by DNI
  - registering/updating padrón data
  - soft-deleting a person
  - registering/updating feria participation
- Uses SQLAlchemy ORM with PostgreSQL
- Logs create/update/delete operations via `backend/logger.py`

## Requirements

- Python 3.10+ (or compatible)
- PostgreSQL database

## Dependencies

- fastapi
- uvicorn
- sqlalchemy
- psycopg2-binary
- pydantic
- email-validator

## Setup

1. Open a terminal and go to the backend folder:

   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic email-validator
   ```

4. Configure your PostgreSQL connection in `backend/database.py`:

   ```python
   SQLALCHEMY_DATABASE_URL = "postgresql://usuario:contraseña@host:puerto/nombre_base_de_datos"
   ```

   The current default is:

   ```python
   postgresql://postgres:dacia@127.0.0.1:8000/postgres
   ```

5. Ensure the database is available and the connection values are correct.

## Run the application

From the project root (parent of `backend` folder):

```bash
source backend/venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The frontend is served from the `frontend` folder via the backend app.

## API Endpoints

### Frontend

- `GET /`
  - Serves `frontend/index.html`

### Personas

- `GET /personas`
  - Returns all active persons

- `GET /personas/search/{dni_prefix}`
  - Returns up to 10 matching persons for autocomplete searches
  - Response includes `dni`, `nombres`, and `apellidos`

- `GET /personas/{dni}`
  - Returns a single person record by DNI

- `PUT /personas/{dni}`
  - Updates a person using the `PadronCreate` schema

- `PATCH /personas/{dni}/baja`
  - Marks the person as inactive (`activo = false`)

### Padrón

- `POST /padron-vecinos/`
  - Creates or updates a padrón record using `PadronCreate`

### Ferias

- `POST /inscripcion-feria/`
  - Creates or updates a feria registration using `FeriaCreate`
  - Also updates the linked person record if needed

## Data models

### `Persona`

Fields include:

- `dni`
- `nombres`
- `apellidos`
- `celular`
- `fecha_nacimiento`
- `localidad`
- `domicilio`
- `email`
- `sexo`
- `ocupacion`
- `jubilado`
- `pensionado`
- `nivel_estudios`
- `activo`

### `InscripcionFeria`

Fields include:

- `dni_persona`
- `instagram_facebook`
- `rubro`
- `descripcion`

## Notes

- The backend mounts the static frontend files from the top-level `frontend` directory.
- Make sure PostgreSQL is running and reachable before starting the app.
- The database tables are automatically created on startup via SQLAlchemy metadata.

