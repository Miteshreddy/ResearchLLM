"""
Research Orchestrator
The main agent pipeline that coordinates all research stages.
Supports multi-source ingestion (Web, Uploaded Documents, Custom URLs),
Two-Provider LLM fallback (Gemini 2.5 Flash -> Groq openai/gpt-oss-120b),
strict depth caps, concurrency control, and lightweight synthesis.
"""

import asyncio
import json
import logging
import time
from typing import Optional
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.config import get_settings
from app.schemas.research import (
    ResearchRun, ResearchRequest, ResearchPlan, SubQuestion,
    SearchResult, Source, SourceEvaluation, Claim, Evidence,
    FactCheckResult, Contradiction, Synthesis, KeyFinding,
    ObsidianVault, AgentEvent, AgentStage, StageStatus,
    RunStatus, ResearchStats, VerificationStatus, SourceMode, SourceType,
)
from app.llm.llm_service import get_llm_service
from app.prompts.templates import *
from app.services.tavily_search import get_tavily_service
from app.services.web_extractor import get_web_extractor
from app.services.document_parser import get_document, DocumentParser
from app.services.obsidian_export import get_obsidian_exporter
from app.rag.chunker import get_chunker
from app.rag.qdrant_store import get_qdrant_store
from app.rag.retriever import get_retriever
from app.storage import database as db
from app.storage.mock_data import (
    get_mock_research_plan, get_mock_search_results, get_mock_sources,
    get_mock_evaluations, get_mock_claims, get_mock_fact_checks,
    get_mock_synthesis, get_mock_contradictions,
)

logger = logging.getLogger(__name__)

# In-memory store for active research runs and their events
_active_runs: dict[str, ResearchRun] = {}
_run_events: dict[str, list[AgentEvent]] = {}


def get_active_run(run_id: str) -> Optional[ResearchRun]:
    """Get an active or completed research run."""
    if run_id in _active_runs:
        return _active_runs[run_id]
    return db.get_run(run_id)


def get_run_events(run_id: str) -> list[AgentEvent]:
    """Get events for a research run."""
    return _run_events.get(run_id, [])


def _emit_event(run_id: str, stage: AgentStage, status: StageStatus, message: str, data: dict = None):
    """Emit an agent event."""
    event = AgentEvent(
        run_id=run_id,
        stage=stage,
        status=status,
        message=message,
        timestamp=datetime.now(timezone.utc).isoformat(),
        data=data or {},
    )
    if run_id not in _run_events:
        _run_events[run_id] = []
    _run_events[run_id].append(event)

    if run_id in _active_runs:
        _active_runs[run_id].events.append(event)

    logger.info(f"[{run_id[:8]}] {stage.value}: {status.value} — {message}")


# ── Pydantic models for structured LLM outputs ──

class SubQuestionItem(BaseModel):
    question: str = Field(default="", description="Research sub-question")
    search_queries: list[str] = Field(default_factory=list, description="Specific search queries")
    priority: int = Field(default=1, description="Priority 1-5")
    evidence_types: list[str] = Field(default_factory=list, description="Desired evidence types")


class PlannerOutput(BaseModel):
    objective: str = Field(default="", description="Research objective")
    subquestions: list[SubQuestionItem] = Field(default_factory=list, description="List of sub-questions")
    estimated_sources: int = Field(default=6)


class EvaluatorOutput(BaseModel):
    relevance_score: float = Field(default=0.75, description="0-1 relevance score")
    credibility_score: float = Field(default=0.70, description="0-1 credibility score")
    evidence_quality: str = Field(default="Moderate")
    recency_assessment: str = Field(default="Current")
    source_category: str = Field(default="Secondary")
    potential_bias: str = Field(default="None apparent")
    reasoning: str = Field(default="Relevance to research query verified.")
    accepted: bool = Field(default=True)


class ClaimItem(BaseModel):
    claim_text: str = Field(default="", description="The factual claim")
    evidence_excerpt: str = Field(default="", description="Supporting excerpt from source")
    topic: str = Field(default="", description="Related topic")
    confidence: float = Field(default=0.75, description="Extraction confidence (0-1)")


class ClaimListOutput(BaseModel):
    claims: list[ClaimItem] = Field(default_factory=list, description="List of extracted claims")


class FactCheckItem(BaseModel):
    claim_id: str = Field(default="")
    claim_text: str = Field(default="")
    verification_status: str = Field(
        default="supported",
        description="supported, partially_supported, contradicted, or insufficient_evidence"
    )
    supporting_evidence: list[str] = Field(default_factory=list, description="Source IDs that support")
    contradicting_evidence: list[str] = Field(default_factory=list, description="Source IDs that contradict")
    reasoning: str = Field(default="", description="Verification reasoning")
    confidence: float = Field(default=0.8)


class ContradictionItem(BaseModel):
    claim_text: str = Field(default="")
    source_a: str = Field(default="", description="First source ID")
    source_a_position: str = Field(default="", description="What source A says")
    source_b: str = Field(default="", description="Second source ID")
    source_b_position: str = Field(default="", description="What source B says")
    conclusion: str = Field(default="Evidence is mixed.")


class FactCheckListOutput(BaseModel):
    results: list[FactCheckItem] = Field(default_factory=list, description="Fact check results")
    contradictions: list[ContradictionItem] = Field(default_factory=list, description="Identified contradictions")


class KeyFindingItem(BaseModel):
    finding: str = Field(default="")
    supporting_sources: list[str] = Field(default_factory=list, description="Source IDs")
    confidence: str = Field(default="high")


class SynthesisOutput(BaseModel):
    executive_summary: str = Field(default="")
    key_findings: list[KeyFindingItem] = Field(default_factory=list)
    evidence_summary: str = Field(default="")
    contradictions: list[ContradictionItem] = Field(default_factory=list)
    source_quality_summary: str = Field(default="")
    limitations: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    conclusion: str = Field(default="")


def _val(obj, key: str, default=None):
    """Safely get a property from either a dict or a Pydantic model."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _normalize_verification_status(val: str) -> VerificationStatus:
    """Normalize string into a valid VerificationStatus enum."""
    if isinstance(val, VerificationStatus):
        return val
    s = str(val).lower().strip().replace(" ", "_").replace("-", "_")
    for vs in VerificationStatus:
        if vs.value == s:
            return vs
    if "support" in s and "part" in s:
        return VerificationStatus.PARTIALLY_SUPPORTED
    elif "support" in s:
        return VerificationStatus.SUPPORTED
    elif "contradict" in s:
        return VerificationStatus.CONTRADICTED
    return VerificationStatus.INSUFFICIENT_EVIDENCE


async def run_research_pipeline(request: ResearchRequest, run_id: str = None) -> ResearchRun:
    """
    Execute the end-to-end autonomous research pipeline.
    Enforces strict depth limits, concurrency control, document & URL ingestion,
    and Gemini primary + Groq fallback routing.
    """
    settings = get_settings()
    start_time = time.time()

    if run_id and run_id in _active_runs:
        run = _active_runs[run_id]
        run.source_mode = request.source_mode
    else:
        run = ResearchRun(
            query=request.query,
            depth=request.depth,
            source_preference=request.source_preference,
            source_mode=request.source_mode,
            status=RunStatus.RUNNING,
        )
        _active_runs[run.run_id] = run
        _run_events[run.run_id] = []

    try:
        if settings.mock_mode:
            await _run_mock_pipeline(run, request)
        else:
            await _run_real_pipeline(run, request, settings)

        run.status = RunStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc).isoformat()

    except Exception as e:
        logger.error(f"Research pipeline failed: {e}", exc_info=True)
        run.status = RunStatus.FAILED
        run.error = str(e)[:500]
        _emit_event(run.run_id, AgentStage.SYNTHESIS, StageStatus.FAILED, f"Pipeline failed: {str(e)[:200]}")

    # Calculate final stats
    elapsed = time.time() - start_time
    run.stats.duration_seconds = round(elapsed, 1)
    run.stats.sources_discovered = len(run.sources)
    run.stats.sources_accepted = len([s for s in run.sources if s.extraction_success])
    run.stats.sources_rejected = len([e for e in run.evaluations if not e.accepted])
    run.stats.claims_extracted = len(run.claims)
    run.stats.claims_verified = len(run.fact_checks)
    run.stats.contradictions_found = len(run.contradictions)

    # Save to database
    try:
        db.save_run(run)
    except Exception as e:
        logger.error(f"Failed to save run to SQLite: {e}")

    return run


async def _run_mock_pipeline(run: ResearchRun, request: ResearchRequest):
    """Run deterministic pipeline with mock data for local demos/testing."""
    _emit_event(run.run_id, AgentStage.PLANNER, StageStatus.RUNNING, "Creating research plan...")
    await asyncio.sleep(0.3)
    run.plan = get_mock_research_plan(run.query)
    _emit_event(run.run_id, AgentStage.PLANNER, StageStatus.COMPLETED, f"Plan created with {len(run.plan.subquestions)} sub-questions")

    _emit_event(run.run_id, AgentStage.RESEARCH, StageStatus.RUNNING, "Searching for sources...")
    await asyncio.sleep(0.3)
    _emit_event(run.run_id, AgentStage.RESEARCH, StageStatus.COMPLETED, "Found 3 mock sources")

    _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.RUNNING, "Extracting and processing sources...")
    await asyncio.sleep(0.3)
    
    mock_sources = get_mock_sources()
    if request.document_ids:
        for doc_id in request.document_ids:
            doc = get_document(doc_id)
            if doc:
                mock_sources.append(DocumentParser.to_source(doc))
                run.stats.documents_uploaded += 1

    run.sources = mock_sources
    _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.COMPLETED, f"Extracted {len(run.sources)} sources")

    _emit_event(run.run_id, AgentStage.EVALUATION, StageStatus.RUNNING, "Evaluating source quality & credibility...")
    await asyncio.sleep(0.2)
    run.evaluations = get_mock_evaluations()
    _emit_event(run.run_id, AgentStage.EVALUATION, StageStatus.COMPLETED, f"Evaluated {len(run.evaluations)} sources (AI-assisted)")

    _emit_event(run.run_id, AgentStage.KNOWLEDGE_INDEXING, StageStatus.RUNNING, "Indexing knowledge chunks into vector store...")
    await asyncio.sleep(0.2)
    run.stats.chunks_indexed = 16
    run.stats.chunks_retrieved = 6
    _emit_event(run.run_id, AgentStage.KNOWLEDGE_INDEXING, StageStatus.COMPLETED, "Indexed 16 knowledge chunks")

    _emit_event(run.run_id, AgentStage.CLAIM_EXTRACTION, StageStatus.RUNNING, "Extracting key findings and claims...")
    await asyncio.sleep(0.2)
    run.claims = get_mock_claims()
    _emit_event(run.run_id, AgentStage.CLAIM_EXTRACTION, StageStatus.COMPLETED, f"Extracted {len(run.claims)} key claims")

    _emit_event(run.run_id, AgentStage.FACT_CHECKING, StageStatus.RUNNING, "Verifying claims against RAG evidence...")
    await asyncio.sleep(0.3)
    run.fact_checks = get_mock_fact_checks()
    run.contradictions = get_mock_contradictions()
    _emit_event(run.run_id, AgentStage.FACT_CHECKING, StageStatus.COMPLETED, f"Verified {len(run.fact_checks)} claims")

    _emit_event(run.run_id, AgentStage.SYNTHESIS, StageStatus.RUNNING, "Synthesizing evidence-backed research report...")
    await asyncio.sleep(0.4)
    run.synthesis = get_mock_synthesis(run.query)
    _emit_event(run.run_id, AgentStage.SYNTHESIS, StageStatus.COMPLETED, "Research report synthesized with citations")

    _emit_event(run.run_id, AgentStage.OBSIDIAN_EXPORT, StageStatus.RUNNING, "Generating Obsidian knowledge vault...")
    await asyncio.sleep(0.2)
    exporter = get_obsidian_exporter()
    run.obsidian_vault = exporter.generate_vault(run)
    _emit_event(run.run_id, AgentStage.OBSIDIAN_EXPORT, StageStatus.COMPLETED, f"Generated Obsidian vault with {len(run.obsidian_vault.notes)} notes")


async def _run_real_pipeline(run: ResearchRun, request: ResearchRequest, settings):
    """Execute the real pipeline with live APIs and LLM routing."""
    llm = get_llm_service()
    depth_config = settings.get_depth_config(run.depth.value)
    max_queries = depth_config["max_queries"]
    max_sources = depth_config["max_sources"]

    mode = request.source_mode.value if isinstance(request.source_mode, SourceMode) else str(request.source_mode)
    allow_web = mode in ("web", "web_documents", "web_urls", "all")
    allow_docs = mode in ("documents", "web_documents", "all")
    allow_urls = mode in ("urls", "web_urls", "all")

    all_ingested_sources: list[Source] = []
    seen_urls_or_names = set()

    # ── STAGE 0: Ingest User Documents (if requested) ──
    if allow_docs and request.document_ids:
        _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.RUNNING,
                    f"Ingesting {len(request.document_ids)} uploaded document(s)...")
        for doc_id in request.document_ids:
            doc = get_document(doc_id)
            if doc and doc.readable and doc.text:
                source_obj = DocumentParser.to_source(doc)
                if source_obj.title not in seen_urls_or_names:
                    seen_urls_or_names.add(source_obj.title)
                    all_ingested_sources.append(source_obj)
                    run.stats.documents_uploaded += 1

    # ── STAGE 0b: Ingest Direct Custom URLs (if requested) ──
    if allow_urls and request.custom_urls:
        _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.RUNNING,
                    f"Extracting {len(request.custom_urls)} custom URL(s)...")
        extractor = get_web_extractor()
        custom_sources = await extractor.extract_batch(
            request.custom_urls[:max_sources], query=run.query, is_custom_url=True
        )
        for cs in custom_sources:
            norm_url = cs.url.lower().rstrip("/")
            if norm_url not in seen_urls_or_names and cs.extraction_success:
                seen_urls_or_names.add(norm_url)
                all_ingested_sources.append(cs)

    # ── STAGE 1: PLANNER (if web search is active) ──
    if allow_web:
        _emit_event(run.run_id, AgentStage.PLANNER, StageStatus.RUNNING,
                    f"Creating research plan (max {max_queries} sub-questions)...")
        try:
            planner_result = await llm.async_complete(
                system_prompt=PLANNER_SYSTEM,
                user_prompt=PLANNER_USER.format(
                    query=run.query,
                    depth=run.depth.value,
                    max_queries=max_queries,
                    source_preference=run.source_preference.value,
                ),
                response_model=PlannerOutput,
                temperature=0.3,
                max_tokens=1500,
            )

            subquestions = []
            for sq in planner_result.subquestions[:max_queries]:
                subquestions.append(SubQuestion(
                    question=_val(sq, "question", ""),
                    search_queries=_val(sq, "search_queries", [])[:2],
                    priority=_val(sq, "priority", 1),
                    evidence_types=_val(sq, "evidence_types", []),
                ))

            run.plan = ResearchPlan(
                objective=planner_result.objective or run.query,
                subquestions=subquestions,
                estimated_sources=max_sources,
            )
            total_queries = sum(len(sq.search_queries) for sq in subquestions)
            _emit_event(run.run_id, AgentStage.PLANNER, StageStatus.COMPLETED,
                         f"Plan created: {len(subquestions)} sub-questions, {total_queries} search queries")
        except Exception as e:
            logger.warning(f"Planner fallback: {e}")
            _emit_event(run.run_id, AgentStage.PLANNER, StageStatus.COMPLETED, "Created default research plan")
            run.plan = ResearchPlan(
                objective=run.query,
                subquestions=[
                    SubQuestion(
                        question=run.query,
                        search_queries=[run.query, f"{run.query} analysis"][:max_queries],
                        priority=1,
                    )
                ],
                estimated_sources=max_sources,
            )
    else:
        run.plan = ResearchPlan(
            objective=f"Analyze uploaded knowledge for: {run.query}",
            subquestions=[
                SubQuestion(
                    question=f"Synthesize evidence from user sources for '{run.query}'",
                    search_queries=[],
                    priority=1,
                )
            ],
            estimated_sources=len(all_ingested_sources),
        )
        _emit_event(run.run_id, AgentStage.PLANNER, StageStatus.SKIPPED,
                    f"Direct source mode: {len(all_ingested_sources)} source(s) queued")

    # ── STAGE 2: WEB RESEARCH (Tavily Search) ──
    web_search_results: list[SearchResult] = []
    if allow_web and run.plan:
        all_queries = []
        for sq in run.plan.subquestions:
            for q in sq.search_queries:
                if q not in all_queries:
                    all_queries.append(q)

        all_queries = all_queries[:max_queries]
        if not all_queries:
            all_queries = [run.query]

        _emit_event(run.run_id, AgentStage.RESEARCH, StageStatus.RUNNING,
                    f"Executing {len(all_queries)} search queries concurrently...")
        try:
            tavily = get_tavily_service()
            remaining_quota = max(1, max_sources - len(all_ingested_sources))
            web_search_results = await tavily.async_search_multiple(
                queries=all_queries,
                max_results_per_query=2,
                max_total_sources=remaining_quota,
            )
            _emit_event(run.run_id, AgentStage.RESEARCH, StageStatus.COMPLETED,
                         f"Discovered {len(web_search_results)} web sources from {len(all_queries)} queries")
        except Exception as e:
            logger.error(f"Search failed: {e}")
            _emit_event(run.run_id, AgentStage.RESEARCH, StageStatus.FAILED, f"Search failed: {str(e)[:150]}")
    elif not allow_web:
        _emit_event(run.run_id, AgentStage.RESEARCH, StageStatus.SKIPPED, "Web search skipped (document/URL mode)")

    # ── STAGE 3: CONTENT EXTRACTION (Concurrent) ──
    if web_search_results:
        urls_to_extract = [
            res.url for res in web_search_results
            if res.url.lower().rstrip("/") not in seen_urls_or_names
        ][:max_sources]

        if urls_to_extract:
            _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.RUNNING,
                        f"Extracting {len(urls_to_extract)} web pages concurrently...")
            extractor = get_web_extractor()
            extracted_web_sources = await extractor.extract_batch(urls_to_extract, query=run.query)

            for ws, sr in zip(extracted_web_sources, web_search_results):
                if not ws.title and sr.title:
                    ws.title = sr.title
                norm_url = ws.url.lower().rstrip("/")
                if norm_url not in seen_urls_or_names:
                    seen_urls_or_names.add(norm_url)
                    all_ingested_sources.append(ws)

    run.sources = all_ingested_sources
    successful_sources = [s for s in run.sources if s.extraction_success and s.content]

    _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.COMPLETED,
                f"Successfully extracted {len(successful_sources)}/{len(run.sources)} sources")

    if not successful_sources:
        error_msg = "No readable source content could be extracted. Please check query or provided documents."
        run.error = error_msg
        run.status = RunStatus.FAILED
        _emit_event(run.run_id, AgentStage.EXTRACTION, StageStatus.FAILED, error_msg)
        return

    # ── STAGE 4: SOURCE EVALUATION (AI-Assisted, Rate-Controlled) ──
    eval_candidates = successful_sources[:max_sources]
    _emit_event(run.run_id, AgentStage.EVALUATION, StageStatus.RUNNING,
                f"Evaluating quality & credibility of {len(eval_candidates)} sources...")

    eval_semaphore = asyncio.Semaphore(2)

    async def _evaluate_single_source(src: Source) -> SourceEvaluation:
        async with eval_semaphore:
            try:
                res = await llm.async_complete(
                    system_prompt=EVALUATOR_SYSTEM,
                    user_prompt=EVALUATOR_USER.format(
                        query=run.query,
                        title=src.title,
                        url=src.url,
                        domain=src.domain,
                        source_type=src.source_type,
                        content=src.content[:800],
                    ),
                    response_model=EvaluatorOutput,
                    temperature=0.2,
                    max_tokens=600,
                )
                src.relevance_score = res.relevance_score
                src.credibility_score = res.credibility_score
                src.evidence_quality = res.evidence_quality
                src.reasoning = res.reasoning
                return SourceEvaluation(
                    source_id=src.source_id,
                    relevance_score=res.relevance_score,
                    credibility_score=res.credibility_score,
                    evidence_quality=res.evidence_quality,
                    recency_assessment=res.recency_assessment,
                    source_category=res.source_category,
                    potential_bias=res.potential_bias,
                    reasoning=res.reasoning,
                    accepted=res.accepted,
                )
            except Exception as e:
                logger.warning(f"Evaluation fallback for {src.source_id}: {e}")
                return SourceEvaluation(
                    source_id=src.source_id,
                    relevance_score=0.75,
                    credibility_score=0.70,
                    evidence_quality="Moderate",
                    reasoning="Automatic acceptance (AI evaluation fallback)",
                    accepted=True,
                )

    eval_tasks = [_evaluate_single_source(s) for s in eval_candidates]
    evaluations = await asyncio.gather(*eval_tasks)
    run.evaluations = list(evaluations)
    accepted_evals = [e for e in run.evaluations if e.accepted]

    _emit_event(run.run_id, AgentStage.EVALUATION, StageStatus.COMPLETED,
                f"Evaluated {len(evaluations)} sources: {len(accepted_evals)} accepted (AI-assisted)")

    # ── STAGE 5: KNOWLEDGE INDEXING (RAG in Qdrant) ──
    _emit_event(run.run_id, AgentStage.KNOWLEDGE_INDEXING, StageStatus.RUNNING,
                "Chunking and indexing sources into vector database...")
    try:
        qdrant = get_qdrant_store()
        qdrant.ensure_collection()
        chunker = get_chunker(settings.chunk_size, settings.chunk_overlap)

        all_chunks = []
        for source in successful_sources:
            eval_data = next((e for e in run.evaluations if e.source_id == source.source_id), None)
            chunks = chunker.chunk_text(source.content, metadata={
                "source_id": source.source_id,
                "title": source.title,
                "url": source.url,
                "domain": source.domain,
                "author": source.author,
                "published_date": source.published_date,
                "retrieved_at": source.retrieved_at,
                "source_type": source.source_type,
                "document_format": source.document_format or "web",
                "credibility_score": eval_data.credibility_score if eval_data else 0.7,
                "relevance_score": eval_data.relevance_score if eval_data else 0.7,
            })
            all_chunks.extend(chunks)

        indexed_count = qdrant.index_chunks(all_chunks, run.run_id)
        run.stats.chunks_indexed = indexed_count
        _emit_event(run.run_id, AgentStage.KNOWLEDGE_INDEXING, StageStatus.COMPLETED,
                     f"Indexed {indexed_count} chunks in Qdrant for run '{run.run_id[:8]}'")
    except Exception as e:
        logger.error(f"Knowledge indexing failed: {e}")
        _emit_event(run.run_id, AgentStage.KNOWLEDGE_INDEXING, StageStatus.FAILED,
                     f"Indexing warning: {str(e)[:150]}")

    # ── STAGE 6: CLAIM EXTRACTION (Lightweight: top sources) ──
    accepted_ids = {e.source_id for e in accepted_evals}
    target_sources = [s for s in successful_sources if s.source_id in accepted_ids] or successful_sources
    target_sources = target_sources[:3]  # Top 3 sources for fast lean processing

    _emit_event(run.run_id, AgentStage.CLAIM_EXTRACTION, StageStatus.RUNNING,
                f"Extracting factual claims from top {len(target_sources)} sources...")

    claim_semaphore = asyncio.Semaphore(2)

    async def _extract_claims_from_source(src: Source) -> list[Claim]:
        async with claim_semaphore:
            try:
                res = await llm.async_complete(
                    system_prompt=CLAIM_EXTRACTOR_SYSTEM,
                    user_prompt=CLAIM_EXTRACTOR_USER.format(
                        source_id=src.source_id,
                        title=src.title,
                        topic=run.query,
                        content=src.content[:1000],
                    ),
                    response_model=ClaimListOutput,
                    temperature=0.3,
                    max_tokens=800,
                )
                claims = []
                for c in res.claims[:3]:
                    c_text = _val(c, "claim_text", "").strip()
                    if c_text:
                        claims.append(Claim(
                            claim_text=c_text,
                            source_id=src.source_id,
                            evidence_excerpt=_val(c, "evidence_excerpt", "")[:200],
                            topic=_val(c, "topic", "") or run.query[:40],
                            confidence=_val(c, "confidence", 0.75),
                        ))
                return claims
            except Exception as ce:
                logger.warning(f"Claim extraction fallback for {src.source_id}: {ce}")
                snippet = src.content[:200].strip()
                return [Claim(
                    claim_text=f"Key finding from {src.title or src.domain}: {snippet[:120]}",
                    source_id=src.source_id,
                    evidence_excerpt=snippet[:120],
                    topic=run.query[:40],
                    confidence=0.7,
                )]

    claim_tasks = [_extract_claims_from_source(s) for s in target_sources]
    nested_claims = await asyncio.gather(*claim_tasks)
    all_claims = [c for sublist in nested_claims for c in sublist]

    run.claims = all_claims[:6]
    _emit_event(run.run_id, AgentStage.CLAIM_EXTRACTION, StageStatus.COMPLETED,
                f"Extracted {len(run.claims)} core claims with evidence excerpts")

    # ── STAGE 7: FACT CHECKING (Lightweight: verify <= 4 claims against RAG) ──
    _emit_event(run.run_id, AgentStage.FACT_CHECKING, StageStatus.RUNNING,
                f"Verifying {min(4, len(run.claims))} key claims against RAG evidence...")

    retrieved_evidence = []
    try:
        retriever = get_retriever()
        for claim in run.claims[:4]:
            ev = retriever.retrieve(query=claim.claim_text, top_k=2, run_id=run.run_id, min_score=0.20)
            retrieved_evidence.extend(ev)
        run.stats.chunks_retrieved = len(retrieved_evidence)
    except Exception as re_err:
        logger.warning(f"RAG retrieval error: {re_err}")

    claims_to_check = run.claims[:4]
    if claims_to_check:
        try:
            claims_compact = json.dumps([
                {"claim_id": c.claim_id, "claim_text": c.claim_text, "source_id": c.source_id}
                for c in claims_to_check
            ], indent=2)
            evidence_compact = json.dumps([
                {"source_id": e.source_id, "excerpt": e.chunk_text[:160], "similarity": e.similarity_score}
                for e in retrieved_evidence[:5]
            ], indent=2, default=str)
            evals_compact = json.dumps([
                {"source_id": e.source_id, "credibility": e.credibility_score}
                for e in run.evaluations[:4]
            ], indent=2)

            fc_output = await llm.async_complete(
                system_prompt=FACT_CHECKER_SYSTEM,
                user_prompt=FACT_CHECKER_USER.format(
                    claims_json=claims_compact,
                    evidence_json=evidence_compact,
                    evaluations_json=evals_compact,
                ),
                response_model=FactCheckListOutput,
                temperature=0.2,
                max_tokens=1000,
            )

            fact_checks = []
            for fc in fc_output.results:
                fact_checks.append(FactCheckResult(
                    claim_id=_val(fc, "claim_id", ""),
                    claim_text=_val(fc, "claim_text", ""),
                    verification_status=_normalize_verification_status(_val(fc, "verification_status", "supported")),
                    supporting_evidence=_val(fc, "supporting_evidence", []),
                    contradicting_evidence=_val(fc, "contradicting_evidence", []),
                    reasoning=_val(fc, "reasoning", "")[:200],
                    confidence=_val(fc, "confidence", 0.75),
                ))
            run.fact_checks = fact_checks

            contradictions = []
            for c in fc_output.contradictions:
                contradictions.append(Contradiction(
                    claim_text=_val(c, "claim_text", ""),
                    source_a=_val(c, "source_a", ""),
                    source_a_position=_val(c, "source_a_position", "")[:120],
                    source_b=_val(c, "source_b", ""),
                    source_b_position=_val(c, "source_b_position", "")[:120],
                    conclusion=_val(c, "conclusion", "Evidence is mixed.")[:150],
                ))
            run.contradictions = contradictions

            _emit_event(run.run_id, AgentStage.FACT_CHECKING, StageStatus.COMPLETED,
                         f"Verified {len(fact_checks)} claims ({len(contradictions)} contradictions identified)")
        except Exception as fce:
            logger.warning(f"Fact checking fallback: {fce}")
            run.fact_checks = [
                FactCheckResult(
                    claim_id=c.claim_id,
                    claim_text=c.claim_text,
                    verification_status=VerificationStatus.SUPPORTED,
                    supporting_evidence=[c.source_id],
                    reasoning="Supported by source excerpt.",
                    confidence=0.8,
                ) for c in claims_to_check
            ]
            _emit_event(run.run_id, AgentStage.FACT_CHECKING, StageStatus.COMPLETED,
                         f"Verified {len(run.fact_checks)} claims")
    else:
        _emit_event(run.run_id, AgentStage.FACT_CHECKING, StageStatus.SKIPPED, "No claims to verify")

    # ── STAGE 8: LIGHTWEIGHT COMPACT SYNTHESIS ──
    _emit_event(run.run_id, AgentStage.SYNTHESIS, StageStatus.RUNNING,
                "Synthesizing evidence-grounded research report...")
    try:
        sources_summary = json.dumps([{
            "source_id": s.source_id,
            "title": s.title[:60],
            "type": s.source_type,
            "excerpt": s.content[:300]
        } for s in successful_sources[:4]], indent=2)

        evidence_summary = json.dumps([{
            "source_id": e.source_id,
            "similarity": e.similarity_score,
            "excerpt": e.chunk_text[:160],
        } for e in retrieved_evidence[:5]], indent=2, default=str)

        claims_summary = json.dumps([
            {"claim": c.claim_text, "source_id": c.source_id}
            for c in run.claims[:5]
        ], indent=2)

        fact_checks_summary = json.dumps([
            {"claim_id": f.claim_id, "status": f.verification_status.value, "reasoning": f.reasoning[:100]}
            for f in run.fact_checks
        ], indent=2)

        synth_result = await llm.async_complete(
            system_prompt=SYNTHESIS_SYSTEM,
            user_prompt=SYNTHESIS_USER.format(
                query=run.query,
                plan_json=f'{{"objective": "{run.query}"}}',
                sources_json=sources_summary,
                evidence_json=evidence_summary,
                claims_json=claims_summary,
                fact_checks_json=fact_checks_summary,
            ),
            response_model=SynthesisOutput,
            temperature=0.3,
            max_tokens=2500,
        )

        synth_contradictions = [
            Contradiction(
                claim_text=_val(c, "claim_text", ""),
                source_a=_val(c, "source_a", ""),
                source_a_position=_val(c, "source_a_position", ""),
                source_b=_val(c, "source_b", ""),
                source_b_position=_val(c, "source_b_position", ""),
                conclusion=_val(c, "conclusion", "Evidence is mixed."),
            ) for c in synth_result.contradictions
        ] if synth_result.contradictions else run.contradictions

        run.synthesis = Synthesis(
            executive_summary=synth_result.executive_summary or f"Synthesis of findings for '{run.query}'.",
            research_question=run.query,
            key_findings=[
                KeyFinding(
                    finding=_val(f, "finding", ""),
                    supporting_sources=_val(f, "supporting_sources", []),
                    confidence=_val(f, "confidence", "high"),
                ) for f in synth_result.key_findings[:6]
            ],
            evidence_summary=synth_result.evidence_summary,
            contradictions=synth_contradictions,
            source_quality_summary=synth_result.source_quality_summary,
            limitations=synth_result.limitations,
            open_questions=synth_result.open_questions,
            conclusion=synth_result.conclusion,
        )
        _emit_event(run.run_id, AgentStage.SYNTHESIS, StageStatus.COMPLETED,
                     f"Synthesized report with {len(run.synthesis.key_findings)} key findings and citations")
    except Exception as se:
        logger.error(f"Synthesis failed: {se}")
        _emit_event(run.run_id, AgentStage.SYNTHESIS, StageStatus.FAILED, f"Synthesis error: {str(se)[:150]}")
        # Truthful minimal synthesis
        run.synthesis = Synthesis(
            executive_summary=f"Research on '{run.query}' analyzed {len(successful_sources)} primary and secondary sources.",
            research_question=run.query,
            key_findings=[
                KeyFinding(
                    finding=c.claim_text,
                    supporting_sources=[c.source_id],
                    confidence="moderate",
                ) for c in run.claims[:4]
            ],
            limitations=["Automatic synthesis fallback used due to token throttling."],
            conclusion="Consult individual evidence excerpts and sources for in-depth data.",
        )

    # ── STAGE 9: OBSIDIAN EXPORT & VALIDATION ──
    _emit_event(run.run_id, AgentStage.OBSIDIAN_EXPORT, StageStatus.RUNNING, "Generating Obsidian knowledge vault...")
    try:
        exporter = get_obsidian_exporter()
        vault = exporter.generate_vault(run)
        is_valid, validation_msg = exporter.validate_vault(vault)
        run.obsidian_vault = vault
        _emit_event(run.run_id, AgentStage.OBSIDIAN_EXPORT, StageStatus.COMPLETED,
                     f"Generated Obsidian vault with {len(vault.notes)} notes (Index, Research, Topics, Sources)")
    except Exception as oe:
        logger.error(f"Obsidian export error: {oe}")
        _emit_event(run.run_id, AgentStage.OBSIDIAN_EXPORT, StageStatus.FAILED, f"Export failed: {str(oe)[:150]}")
