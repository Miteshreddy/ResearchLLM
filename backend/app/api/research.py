"""
Research API Routes
Handles research creation, document upload, status, sources, evidence, report, and Obsidian export.
"""

import asyncio
import json
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from typing import AsyncGenerator

from app.schemas.research import (
    ResearchRequest, ResearchRun, AgentEvent, RunStatus, DocumentUploadResponse
)
from app.agents.orchestrator import (
    run_research_pipeline, get_active_run, get_run_events, _active_runs, _run_events,
)
from app.services.document_parser import DocumentParser, store_document
from app.services.obsidian_export import get_obsidian_exporter
from app.storage import database as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/research", tags=["research"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and parse user-provided research document (PDF, DOCX, TXT, MD, CSV).
    Extracts text, normalizes content, and stores for the research run.
    """
    try:
        content_bytes = await file.read()
        parsed_doc = DocumentParser.parse_file(file.filename or "uploaded_file", content_bytes)
        store_document(parsed_doc)

        msg = "Document processed successfully" if parsed_doc.readable else (
            parsed_doc.error or "Could not extract machine-readable text from this document."
        )

        return DocumentUploadResponse(
            document_id=parsed_doc.document_id,
            filename=parsed_doc.filename,
            file_type=parsed_doc.file_type,
            char_count=parsed_doc.char_count,
            word_count=parsed_doc.word_count,
            readable=parsed_doc.readable,
            status=parsed_doc.status,
            message=msg,
            error=parsed_doc.error,
        )
    except Exception as e:
        logger.error(f"Document upload processing failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to process document: {str(e)[:150]}")


@router.post("", response_model=dict)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Start a new research run."""
    run = ResearchRun(
        query=request.query,
        depth=request.depth,
        source_preference=request.source_preference,
        source_mode=request.source_mode,
        status=RunStatus.RUNNING,
    )

    # Pre-register in active_runs so GET /{run_id} works immediately
    _active_runs[run.run_id] = run
    _run_events[run.run_id] = []

    # Run pipeline in background with pre-created run_id
    background_tasks.add_task(_run_pipeline_bg, request, run.run_id)

    return {"run_id": run.run_id, "status": "running"}


# ── IMPORTANT: /history/list MUST be declared before /{run_id} ──────────────
@router.get("/history/list")
async def get_history():
    """Get research history."""
    runs = db.get_all_runs()
    return {"runs": runs}


async def _run_pipeline_bg(request: ResearchRequest, run_id: str):
    """Background task to run the research pipeline."""
    try:
        await run_research_pipeline(request, run_id=run_id)
    except Exception as e:
        logger.error(f"Background pipeline error: {e}", exc_info=True)
        if run_id in _active_runs:
            _active_runs[run_id].status = RunStatus.FAILED
            _active_runs[run_id].error = str(e)[:500]


@router.get("/{run_id}")
async def get_research(run_id: str):
    """Get full research run data."""
    run = get_active_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Research run '{run_id}' not found")
    return run.model_dump()


@router.get("/{run_id}/events")
async def get_events_sse(run_id: str):
    """Server-Sent Events stream for live research updates."""
    return StreamingResponse(
        _event_stream(run_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _event_stream(run_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE events for a research run."""
    last_event_count = 0
    max_wait = 600  # 10 minutes max
    waited = 0.0

    while waited < max_wait:
        events = get_run_events(run_id)
        if len(events) > last_event_count:
            for event in events[last_event_count:]:
                data = json.dumps(event.model_dump())
                yield f"data: {data}\n\n"
            last_event_count = len(events)

        # Check if run is complete
        run = get_active_run(run_id)
        if run and run.status in (RunStatus.COMPLETED, RunStatus.FAILED):
            yield f"data: {json.dumps({'stage': 'complete', 'status': run.status.value, 'message': 'Research complete'})}\n\n"
            break

        await asyncio.sleep(0.5)
        waited += 0.5

    yield f"data: {json.dumps({'stage': 'complete', 'status': 'timeout', 'message': 'Stream closed'})}\n\n"


@router.get("/{run_id}/sources")
async def get_sources(run_id: str):
    """Get sources for a research run."""
    run = get_active_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")

    sources_data = []
    for source in run.sources:
        eval_data = next((e for e in run.evaluations if e.source_id == source.source_id), None)
        sources_data.append({
            **source.model_dump(),
            "evaluation": eval_data.model_dump() if eval_data else None,
        })
    return {"sources": sources_data}


@router.get("/{run_id}/evidence")
async def get_evidence(run_id: str):
    """Get claims and evidence for a research run."""
    run = get_active_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")

    evidence_data = []
    for claim in run.claims:
        fc = next((f for f in run.fact_checks if f.claim_id == claim.claim_id), None)
        evidence_data.append({
            "claim": claim.model_dump(),
            "fact_check": fc.model_dump() if fc else None,
        })

    return {
        "evidence": evidence_data,
        "contradictions": [c.model_dump() for c in run.contradictions],
    }


@router.get("/{run_id}/report")
async def get_report(run_id: str):
    """Get the synthesis report."""
    run = get_active_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")
    if not run.synthesis:
        raise HTTPException(status_code=404, detail="Report not yet available")

    return {
        "synthesis": run.synthesis.model_dump(),
        "stats": run.stats.model_dump(),
        "sources_count": len([s for s in run.sources if s.extraction_success]),
    }


@router.get("/{run_id}/export/obsidian")
async def export_obsidian(run_id: str):
    """Export research as Obsidian vault ZIP."""
    run = get_active_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Research run not found")

    if not run.obsidian_vault:
        exporter = get_obsidian_exporter()
        run.obsidian_vault = exporter.generate_vault(run)

    exporter = get_obsidian_exporter()
    zip_bytes = exporter.export_zip(run.obsidian_vault)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=ResearchPilot-Vault-{run.run_id[:8]}.zip",
        },
    )
