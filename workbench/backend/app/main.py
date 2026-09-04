"""Canonization governed workbench — FastAPI application.

Boundary: React frontend → this API → PostgreSQL. The browser never touches
the database; API keys live only server-side in .env.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .auth import clear_session, create_session, current_user, verify_password
from .db import get_db, pg_version, start_embedded_postgres
from .schemas import LoginRequest
from .routers import atom_builder, governance, objects, pipeline, system

WORKBENCH_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST = WORKBENCH_DIR / "frontend" / "dist"


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
app.include_router(atom_builder.router, dependencies=[Depends(current_user)])


@app.get("/atom-builder")
@app.get("/atom-builder.html")
@app.get("/atom-builder-v2")
def atom_builder_page(user: str = Depends(current_user)):
    return FileResponse(WORKBENCH_DIR / "atom-builder.html")


@app.get("/field-registry.js")
def atom_builder_registry():
    return FileResponse(WORKBENCH_DIR / "field-registry.js")


@app.get("/prompt-rail.js")
def atom_builder_script():
    return FileResponse(WORKBENCH_DIR / "prompt-rail.js")


@app.get("/prompt-rail.css")
def atom_builder_styles():
    return FileResponse(WORKBENCH_DIR / "prompt-rail.css")


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
