from fastapi import APIRouter, Depends, HTTPException

from backend.app.auth.schemas import GoogleFormsPadron
from backend.app.auth.service import process_google_forms_padron
from backend.app.core.security import verify_webhook_token

router = APIRouter(prefix="/webhook", tags=["webhooks"])


@router.post("/google-forms/padron", status_code=201)
def webhook_padron(data: GoogleFormsPadron, _=Depends(verify_webhook_token)):
    try:
        return process_google_forms_padron(data)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
