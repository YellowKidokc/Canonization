"""Intake + pipeline endpoints: sources upload, job creation, SSE progress."""
from __future__ import annotations

import queue
import uuid as uuidlib
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_actor
from ..db import get_db, session_scope
from ..models.entities import FailureReceipt, ModelRun, ProcessingJob, Source
from ..pipeline import three_call
from ..schemas import FailureReceiptOut, JobDetail, JobOut, ModelRunOut, SourceDetail, SourceOut
from ..services import sources as source_service

router = APIRouter(prefix="/api", tags=["pipeline"])


@router.post("/sources", response_model=SourceOut, status_code=201)
async def upload_source(
    file: UploadFile = File(...),
    original_location: str | None = Form(None),
    author: str | None = Form(None),
    db: Session = Depends(get_db),
    actor: str = Depends(get_actor),
):
    data = await file.read()
    if not data:
        raise HTTPException(422, "Empty file")
    source, created = source_service.intake_bytes(
        db,
        data=data,
        filename=file.filename or "unnamed",
        original_location=original_location,
        author=author,
    )
    db.commit()
    return source


@router.post("/sources/folder", response_model=list[SourceOut], status_code=201)
def intake_folder(path: str, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """Batch intake from a local folder path (server-readable). Per-file results."""
    folder = Path(path)
    if not folder.is_dir():
        raise HTTPException(404, f"Not a folder: {path}")
    results = source_service.intake_folder(db, folder)
    db.commit()
    return [s for s, _ in results]


@router.get("/sources", response_model=list[SourceOut])
def list_sources(db: Session = Depends(get_db)):
    return db.scalars(select(Source).order_by(Source.created_at.desc())).all()


@router.get("/sources/{sid}", response_model=SourceDetail)
def get_source(sid: uuidlib.UUID, db: Session = Depends(get_db)):
    s = db.get(Source, sid)
    if s is None:
        raise HTTPException(404, "No such source")
    return s


@router.get("/sources/{sid}/content")
def get_source_content(sid: uuidlib.UUID, db: Session = Depends(get_db)):
    """The preserved, hash-verified source text."""
    s = db.get(Source, sid)
    if s is None:
        raise HTTPException(404, "No such source")
    data = source_service.read_source_bytes(s)
    return Response(content=data, media_type="text/markdown; charset=utf-8")


@router.post("/jobs", response_model=JobOut, status_code=201)
def create_job(source_id: uuidlib.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    s = db.get(Source, source_id)
    if s is None:
        raise HTTPException(404, "No such source")
    job = ProcessingJob(source_id=source_id, status="PENDING", receipt={})
    db.add(job)
    db.flush()
    db.commit()
    three_call.start_pipeline_thread(session_scope, job.id)
    return job


@router.get("/jobs", response_model=list[JobOut])
def list_jobs(db: Session = Depends(get_db)):
    return db.scalars(select(ProcessingJob).order_by(ProcessingJob.created_at.desc())).all()


@router.get("/jobs/{jid}", response_model=JobDetail)
def get_job(jid: uuidlib.UUID, db: Session = Depends(get_db)):
    j = db.get(ProcessingJob, jid)
    if j is None:
        raise HTTPException(404, "No such job")
    return j


@router.delete("/jobs/{jid}", status_code=204)
def delete_job(jid: uuidlib.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """Remove a job record without deleting its preserved source or governed outputs.

    A genuinely active worker cannot be deleted. A RUNNING row whose worker has
    already died is considered stale and may be cleaned up.
    """
    job = db.get(ProcessingJob, jid)
    if job is None:
        raise HTTPException(404, "No such job")
    if three_call.is_job_thread_active(jid):
        raise HTTPException(409, "Job is still actively running")
    db.delete(job)
    db.commit()
    return Response(status_code=204)


@router.get("/jobs/{jid}/runs", response_model=list[ModelRunOut])
def job_runs(jid: uuidlib.UUID, db: Session = Depends(get_db)):
    return db.scalars(select(ModelRun).where(ModelRun.job_id == jid).order_by(ModelRun.call_number)).all()


@router.post("/jobs/{jid}/attach-suggestions")
def attach_job_suggestions(jid: uuidlib.UUID, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """Reattach stored Call 2 advice to objects from an earlier successful run."""
    job = db.get(ProcessingJob, jid)
    if job is None:
        raise HTTPException(404, "No such job")
    evaluations = (job.receipt or {}).get("call2_evaluations") or []
    attached = three_call.attach_call2_evaluations(db, jid, evaluations)
    job.receipt = {**(job.receipt or {}), "call2_attached_suggestions": attached}
    db.commit()
    return {"job_id": str(jid), "attached": attached, "evaluations": len(evaluations)}


@router.get("/jobs/{jid}/failures", response_model=list[FailureReceiptOut])
def job_failures(jid: uuidlib.UUID, db: Session = Depends(get_db)):
    return db.scalars(select(FailureReceipt).where(FailureReceipt.job_id == jid)).all()


@router.get("/failures", response_model=list[FailureReceiptOut])
def all_failures(db: Session = Depends(get_db)):
    return db.scalars(select(FailureReceipt).order_by(FailureReceipt.created_at.desc()).limit(200)).all()


@router.get("/jobs/{jid}/events")
def job_events(jid: uuidlib.UUID):
    """SSE stream of pipeline progress."""
    q = three_call.hub.subscribe(str(jid))

    def stream():
        try:
            while True:
                try:
                    event: three_call.ProgressEvent = q.get(timeout=120)
                except queue.Empty:
                    break
                yield event.sse()
                if event.stage == "closed":
                    break
        finally:
            three_call.hub.unsubscribe(str(jid), q)

    return StreamingResponse(stream(), media_type="text/event-stream")
