"""Canonization governed workbench — FastAPI application.

Boundary: React frontend → this API → PostgreSQL. The browser never touches
the database; API keys live only server-side in .env.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .auth import clear_session, create_session, current_user, verify_password
from .db import get_db, pg_version, start_embedded_postgres
from .schemas import LoginRequest
from .routers import governance, objects, pipeline, system

FRONTEND_DIST = Path(__file__).resolve().parents[3] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_embedded_postgres()
    yield


app = FastAPI(title="Canonization Workbench", version="0.1.0", lifespan=lifespan)

# The SPA is served from the same origin; CORS is unnecessary but harmless for dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/login")
def login(body: LoginRequest, response: Response):
    if not verify_password(body.password):
        raise HTTPException(401, "Invalid password")
    create_session(response, "David")
    return {"ok": True, "user": "David"}


@app.post("/api/logout")
def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@app.get("/api/me")
def me(user: str = Depends(current_user)):
    return {"user": user, "postgres_version": pg_version()}


app.include_router(objects.router, dependencies=[Depends(current_user)])
app.include_router(governance.router, dependencies=[Depends(current_user)])
app.include_router(pipeline.router, dependencies=[Depends(current_user)])
app.include_router(system.router, dependencies=[Depends(current_user)])


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
