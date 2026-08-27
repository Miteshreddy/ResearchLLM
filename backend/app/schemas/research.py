"""
ResearchPilot AI - Pydantic Schemas
All structured data models used across the application.
These models also generate JSON schemas for Gemini and Groq structured outputs.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime, timezone
import uuid


# --- Enums ---

class ResearchDepth(str, Enum):
    QUICK = "quick"
    STANDARD = "standard"
    DEEP = "deep"


class SourcePreference(str, Enum):
    ANY = "any"
    ACADEMIC = "academic"
    OFFICIAL = "official"
    NEWS = "news"


class SourceMode(str, Enum):
    WEB = "web"
    DOCUMENTS = "documents"
    URLS = "urls"
    WEB_DOCUMENTS = "web_documents"
    WEB_URLS = "web_urls"
    ALL = "all"


class SourceType(str, Enum):
    WEB = "web"
    DOCUMENT = "document"
    URL = "url"
    ACADEMIC = "academic"
    GOVERNMENT = "government"
    OFFICIAL_DOCS = "official_docs"
    COMPANY = "company"
    NEWS = "news"
    BLOG = "blog"
    COMMUNITY = "community"
    OTHER = "other"


class AgentStage(str, Enum):
    PLANNER = "planner"
    RESEARCH = "research"
    EXTRACTION = "extraction"
    EVALUATION = "evaluation"
    KNOWLEDGE_INDEXING = "knowledge_indexing"
    CLAIM_EXTRACTION = "claim_extraction"
    FACT_CHECKING = "fact_checking"
    SYNTHESIS = "synthesis"
    OBSIDIAN_EXPORT = "obsidian_export"


class StageStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    FAILED = "failed"


class VerificationStatus(str, Enum):
    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    CONTRADICTED = "contradicted"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# --- Request Models ---

class ResearchRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=1000, description="Research question")
    depth: ResearchDepth = Field(default=ResearchDepth.STANDARD)
    source_preference: SourcePreference = Field(default=SourcePreference.ANY)
    source_mode: SourceMode = Field(default=SourceMode.WEB, description="Source selection mode")
    document_ids: list[str] = Field(default_factory=list, description="IDs of pre-uploaded documents")
    custom_urls: list[str] = Field(default_factory=list, description="List of custom URLs to extract directly")


# --- Document Upload Models ---

class ParsedDocument(BaseModel):
    document_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    filename: str = Field(...)
    file_type: str = Field(default="unknown")  # pdf, docx, txt, md
    char_count: int = Field(default=0)
    word_count: int = Field(default=0)
    text: str = Field(default="")
    readable: bool = Field(default=True)
    status: str = Field(default="ready")  # ready, unreadable, error
    error: Optional[str] = Field(default=None)
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    char_count: int
    word_count: int
    readable: bool
    status: str
    message: str = "Document processed successfully"
    error: Optional[str] = None


# --- Research Plan ---

class SubQuestion(BaseModel):
    question: str = Field(..., description="Research sub-question")
    search_queries: list[str] = Field(default_factory=list, description="Specific search queries")
    priority: int = Field(default=1, ge=1, le=5, description="Priority 1-5")
    evidence_types: list[str] = Field(default_factory=list, description="Desired evidence types")


class ResearchPlan(BaseModel):
    objective: str = Field(..., description="Overall research objective")
    subquestions: list[SubQuestion] = Field(default_factory=list, description="Decomposed sub-questions")
    estimated_sources: int = Field(default=6, description="Estimated number of sources needed")


# --- Search & Sources ---

class SearchResult(BaseModel):
    url: str = Field(..., description="Source URL")
    title: str = Field(default="", description="Page title")
    snippet: str = Field(default="", description="Search snippet")
    score: float = Field(default=0.0, description="Search relevance score")
    query: str = Field(default="", description="Original search query")


class Source(BaseModel):
    source_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = Field(default="")
    url: str = Field(default="")
    domain: str = Field(default="")
    author: str = Field(default="Unknown")
    published_date: str = Field(default="")
    source_type: str = Field(default="web", description="web, document, url, or specific category")
    document_format: Optional[str] = Field(default=None, description="pdf, docx, txt, md, url, web")
    content: str = Field(default="")
    content_length: int = Field(default=0)
    extraction_success: bool = Field(default=False)
    extraction_error: str = Field(default="")
    retrieved_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary: Optional[str] = Field(default="")
    relevance_score: Optional[float] = Field(default=None)
    credibility_score: Optional[float] = Field(default=None)
    evidence_quality: Optional[str] = Field(default=None)
    reasoning: Optional[str] = Field(default=None)


class SourceEvaluation(BaseModel):
    source_id: str = Field(...)
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0, description="0-1 relevance score")
    credibility_score: float = Field(default=0.0, ge=0.0, le=1.0, description="AI-assisted credibility assessment (0-1)")
    evidence_quality: str = Field(default="", description="Assessment of evidence quality")
    recency_assessment: str = Field(default="", description="How recent/current the source is")
    source_category: str = Field(default="", description="Primary vs secondary source")
    potential_bias: str = Field(default="", description="Identified potential biases")
    reasoning: str = Field(default="", description="Explanation for scores")
    accepted: bool = Field(default=True, description="Whether source passes quality threshold")


# --- Claims & Evidence ---

class Claim(BaseModel):
    claim_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    claim_text: str = Field(..., description="The factual claim")
    source_id: str = Field(..., description="Source this claim came from")
    evidence_excerpt: str = Field(default="", description="Supporting excerpt from source")
    topic: str = Field(default="", description="Related topic")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Extraction confidence")


class Evidence(BaseModel):
    chunk_text: str = Field(..., description="Retrieved text chunk")
    source_id: str = Field(default="")
    source_title: str = Field(default="")
    source_url: str = Field(default="")
    similarity_score: float = Field(default=0.0, description="RAG retrieval similarity")
    metadata: dict = Field(default_factory=dict)


class FactCheckResult(BaseModel):
    claim_id: str = Field(...)
    claim_text: str = Field(default="")
    verification_status: VerificationStatus = Field(default=VerificationStatus.INSUFFICIENT_EVIDENCE)
    supporting_evidence: list[str] = Field(default_factory=list, description="Source IDs that support")
    contradicting_evidence: list[str] = Field(default_factory=list, description="Source IDs that contradict")
    reasoning: str = Field(default="", description="Verification reasoning")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class Contradiction(BaseModel):
    claim_text: str = Field(...)
    source_a: str = Field(default="", description="First source ID")
    source_a_position: str = Field(default="", description="What source A says")
    source_b: str = Field(default="", description="Second source ID")
    source_b_position: str = Field(default="", description="What source B says")
    conclusion: str = Field(default="Evidence is mixed.")


# --- Synthesis ---

class KeyFinding(BaseModel):
    finding: str = Field(...)
    supporting_sources: list[str] = Field(default_factory=list, description="Source IDs")
    confidence: str = Field(default="moderate")


class Synthesis(BaseModel):
    executive_summary: str = Field(default="")
    research_question: str = Field(default="")
    key_findings: list[KeyFinding] = Field(default_factory=list)
    evidence_summary: str = Field(default="")
    contradictions: list[Contradiction] = Field(default_factory=list)
    source_quality_summary: str = Field(default="")
    limitations: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    conclusion: str = Field(default="")


# --- Obsidian ---

class ObsidianNote(BaseModel):
    filename: str = Field(...)
    path: str = Field(default="", description="Relative path within vault")
    content: str = Field(default="")
    frontmatter: dict = Field(default_factory=dict)


class ObsidianVault(BaseModel):
    notes: list[ObsidianNote] = Field(default_factory=list)
    vault_name: str = Field(default="ResearchPilot-Vault")


# --- Agent Events ---

class AgentEvent(BaseModel):
    run_id: str = Field(...)
    stage: AgentStage = Field(...)
    status: StageStatus = Field(...)
    message: str = Field(default="")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    data: dict = Field(default_factory=dict)


# --- Research Run ---

class ResearchStats(BaseModel):
    sources_discovered: int = Field(default=0)
    sources_accepted: int = Field(default=0)
    sources_rejected: int = Field(default=0)
    documents_uploaded: int = Field(default=0)
    claims_extracted: int = Field(default=0)
    claims_verified: int = Field(default=0)
    contradictions_found: int = Field(default=0)
    chunks_indexed: int = Field(default=0)
    chunks_retrieved: int = Field(default=0)
    duration_seconds: float = Field(default=0.0)


class ResearchRun(BaseModel):
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    query: str = Field(default="")
    depth: ResearchDepth = Field(default=ResearchDepth.STANDARD)
    source_preference: SourcePreference = Field(default=SourcePreference.ANY)
    source_mode: SourceMode = Field(default=SourceMode.WEB)
    status: RunStatus = Field(default=RunStatus.PENDING)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = Field(default=None)
    plan: Optional[ResearchPlan] = Field(default=None)
    sources: list[Source] = Field(default_factory=list)
    evaluations: list[SourceEvaluation] = Field(default_factory=list)
    claims: list[Claim] = Field(default_factory=list)
    fact_checks: list[FactCheckResult] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)
    synthesis: Optional[Synthesis] = Field(default=None)
    obsidian_vault: Optional[ObsidianVault] = Field(default=None)
    stats: ResearchStats = Field(default_factory=ResearchStats)
    events: list[AgentEvent] = Field(default_factory=list)
    error: Optional[str] = Field(default=None)


# --- API Response Models ---

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    service: str = "ResearchPilot AI"


class ConfigStatus(BaseModel):
    gemini: str = "not_configured"
    groq: str = "not_configured"
    tavily: str = "not_configured"
    firecrawl: str = "not_configured"
    qdrant: str = "not_configured"
    mock_mode: bool = False


class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    run_id: Optional[str] = None


class RAGSearchResponse(BaseModel):
    results: list[Evidence] = Field(default_factory=list)
    total_chunks: int = Field(default=0)
