"""
ResearchPilot AI - FastAPI Application
Main entry point for the backend server.
"""

import logging
import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.api.research import router as research_router
from app.api.health import router as health_router, rag_router
from app.storage.database import ensure_db
from app.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("=" * 50)
    logger.info("  ResearchPilot AI - Starting Up")
    logger.info("=" * 50)

    settings = get_settings()
    logger.info(f"Mock Mode: {settings.mock_mode}")
    logger.info(f"Gemini: {'configured' if settings.gemini_configured else 'NOT configured'}")
    logger.info(f"Groq: {'configured' if settings.groq_configured else 'NOT configured'}")
    logger.info(f"Tavily: {'configured' if settings.tavily_configured else 'NOT configured'}")
    logger.info(f"Firecrawl: {'configured' if settings.firecrawl_configured else 'NOT configured'}")
    logger.info(f"Qdrant: {'configured' if settings.qdrant_configured else 'NOT configured'}")

    # Initialize database
    ensure_db()
    logger.info("Database initialized")

    # Try to ensure Qdrant collection
    if settings.qdrant_configured:
        try:
            from app.rag.qdrant_store import get_qdrant_store
            store = get_qdrant_store()
            store.ensure_collection()
            logger.info("Qdrant collection ready")
        except Exception as e:
            logger.warning(f"Qdrant initialization failed (will retry on use): {e}")

    logger.info("ResearchPilot AI backend is ready!")
    logger.info("=" * 50)

    yield

    # Shutdown
    logger.info("ResearchPilot AI shutting down...")


app = FastAPI(
    title="ResearchPilot AI",
    description="Autonomous Research Synthesizer & Obsidian Knowledge Exporter",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(research_router)
app.include_router(rag_router)
