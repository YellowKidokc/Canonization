"""Single-user session auth. The candidate/pipeline API surface can never use
this to self-promote — promotion endpoints additionally require the ruling
service, which only routers import."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeSerializer

from .config import get_settings

SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def _serializer() -> URLSafeSerializer:
    return URLSafeSerializer(get_settings().session_secret, salt="canonization-session")


def create_session(response: Response, username: str) -> None:
    token = _serializer().dumps({"sub": username})
    response.set_cookie(
        get_settings().session_cookie,
        token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,  # localhost-only workbench
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(get_settings().session_cookie)


def verify_password(password: str) -> bool:
    return password == get_settings().canonization_password


def current_user(request: Request) -> str:
    token = request.cookies.get(get_settings().session_cookie)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = _serializer().loads(token)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session") from None
    return data.get("sub", "unknown")


class Actor(str):
    """Marker type for FastAPI dependency injection of the authenticated actor."""


def get_actor(user: str = Depends(current_user)) -> str:
    return user
