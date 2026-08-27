"""
Health and Configuration API Routes
"""

from fastapi import APIRouter
from app.config import get_settings
from app.schemas.research import HealthResponse, ConfigStatus, RAGSearchRequest, RAGSearchResponse, Evidence

router = APIRouter(tags=["system"])


@router.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse()


@router.get("/api/config/status", response_model=ConfigStatus)
async def config_status():
    """Check which services are configured. Never returns actual secrets."""
    settings = get_settings()
    return ConfigStatus(
        gemini="configured" if settings.gemini_configured else "not_configured",
        groq="configured" if settings.groq_configured else "not_configured",
        tavily="configured" if settings.tavily_configured else "not_configured",
        firecrawl="configured" if settings.firecrawl_configured else "not_configured",
        qdrant="configured" if settings.qdrant_configured else "not_configured",
        mock_mode=settings.mock_mode,
    )


rag_router = APIRouter(prefix="/api/rag", tags=["rag"])


@rag_router.post("/search", response_model=RAGSearchResponse)
async def rag_search(request: RAGSearchRequest):
    """Search the RAG knowledge base."""
    try:
        from app.rag.retriever import get_retriever
        from app.rag.qdrant_store import get_qdrant_store

        retriever = get_retriever()
        results = retriever.retrieve(
            query=request.query,
            top_k=request.top_k,
            run_id=request.run_id,
        )

        store = get_qdrant_store()
        stats = store.get_collection_stats()

        return RAGSearchResponse(
            results=results,
            total_chunks=stats.get("total_points", 0),
        )
    except Exception as e:
        return RAGSearchResponse(results=[], total_chunks=0)
