from fastapi import Header, HTTPException
from typing import Optional

from backend.app.core.config import settings


def verify_webhook_token(x_webhook_secret: Optional[str] = Header(None)):
    if settings.webhook_secret and x_webhook_secret != settings.webhook_secret:
        raise HTTPException(status_code=401, detail="Token inválido")
