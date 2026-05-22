from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Any, Dict
from pathlib import Path
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import FormSubmission
from backend.crud.form_definitions import get_form
import json

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

router = APIRouter(prefix="/api/public/forms", tags=["public-forms"])


class FormSubmitData(BaseModel):
    data: Dict[str, Any]


@router.get("/{name}/submissions")
def list_submissions(name: str, db: Session = Depends(get_db)):
    form_def = get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")
    submissions = db.query(FormSubmission).filter(
        FormSubmission.form_name == name
    ).order_by(FormSubmission.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "data": json.loads(s.data),
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in submissions
    ]


@router.post("/{name}/submit", status_code=201)
def submit_form(name: str, body: FormSubmitData, db: Session = Depends(get_db)):
    form_def = get_form(db, name)
    if not form_def:
        raise HTTPException(status_code=404, detail="Formulario no encontrado")

    submission = FormSubmission(
        form_name=name,
        data=json.dumps(body.data, ensure_ascii=False),
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    _append_to_file(name, body.data, submission.id)

    return {"message": "Formulario enviado correctamente", "id": submission.id}


def _append_to_file(name: str, data: dict, submission_id: int):
    json_path = DATA_DIR / f"{name}.json"
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if json_path.exists():
        try:
            existing = json.loads(json_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            existing = []
    else:
        existing = []

    existing.append({
        "id": submission_id,
        "data": data,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    json_path.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
