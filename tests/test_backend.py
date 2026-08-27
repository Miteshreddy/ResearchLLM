"""
Backend Tests
Tests for core functionality without requiring external API keys.
"""

import pytest
import json
import os
import sys
import zipfile
import io

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.schemas.research import (
    ResearchRequest, ResearchPlan, SubQuestion, Source, SourceEvaluation,
    Claim, FactCheckResult, Synthesis, KeyFinding, Contradiction,
    ResearchRun, ObsidianVault, AgentEvent, ResearchStats,
    ResearchDepth, SourcePreference, SourceMode, SourceType, VerificationStatus,
    RunStatus, StageStatus, AgentStage,
    HealthResponse, ConfigStatus, DocumentUploadResponse,
)
from app.rag.chunker import DocumentChunker
from app.services.obsidian_export import ObsidianExporter
from app.storage.mock_data import (
    get_mock_research_plan, get_mock_sources, get_mock_evaluations,
    get_mock_claims, get_mock_fact_checks, get_mock_synthesis,
)


class TestSchemas:
    """Test Pydantic schema validation."""

    def test_research_request_valid(self):
        req = ResearchRequest(
            query="How do AI agents work?",
            source_mode=SourceMode.WEB_DOCUMENTS,
            document_ids=["doc_123"],
            custom_urls=["https://example.com/spec"]
        )
        assert req.query == "How do AI agents work?"
        assert req.depth == ResearchDepth.STANDARD
        assert req.source_preference == SourcePreference.ANY
        assert req.source_mode == SourceMode.WEB_DOCUMENTS
        assert req.document_ids == ["doc_123"]
        assert req.custom_urls == ["https://example.com/spec"]

    def test_research_request_short_query(self):
        with pytest.raises(Exception):
            ResearchRequest(query="Hi")

    def test_source_defaults(self):
        source = Source(url="https://example.com")
        assert source.source_type == "web"
        assert source.extraction_success is False
        assert source.author == "Unknown"

    def test_claim_model(self):
        claim = Claim(
            claim_text="AI improves productivity",
            source_id="s1",
            topic="Productivity",
        )
        assert claim.claim_text == "AI improves productivity"
        assert claim.confidence == 0.5

    def test_fact_check_result(self):
        fc = FactCheckResult(
            claim_id="c1",
            verification_status=VerificationStatus.SUPPORTED,
            confidence=0.85,
        )
        assert fc.verification_status == VerificationStatus.SUPPORTED

    def test_research_run_serialization(self):
        run = ResearchRun(query="Test query", source_mode=SourceMode.ALL)
        data = run.model_dump_json()
        restored = ResearchRun.model_validate_json(data)
        assert restored.query == "Test query"
        assert restored.status == RunStatus.PENDING
        assert restored.source_mode == SourceMode.ALL

    def test_health_response(self):
        resp = HealthResponse()
        assert resp.status == "ok"
        assert resp.service == "ResearchPilot AI"

    def test_config_status(self):
        cfg = ConfigStatus()
        assert cfg.gemini == "not_configured"
        assert cfg.groq == "not_configured"
        assert cfg.mock_mode is False

    def test_document_upload_response(self):
        res = DocumentUploadResponse(
            document_id="doc_abc",
            filename="paper.pdf",
            file_type="pdf",
            char_count=500,
            word_count=80,
            readable=True,
            status="ready",
        )
        assert res.document_id == "doc_abc"
        assert res.readable is True

    def test_json_schema_generation(self):
        """Ensure models can generate JSON schemas for structured LLM outputs."""
        schema = ResearchPlan.model_json_schema()
        assert "properties" in schema
        assert "objective" in schema["properties"]

    def test_source_evaluation_bounds(self):
        """Test score boundaries."""
        eval = SourceEvaluation(
            source_id="s1",
            relevance_score=0.95,
            credibility_score=0.1,
        )
        assert 0.0 <= eval.relevance_score <= 1.0
        assert 0.0 <= eval.credibility_score <= 1.0


class TestChunker:
    """Test document chunking."""

    def test_basic_chunking(self):
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20)
        text = "This is a test sentence. " * 20
        chunks = chunker.chunk_text(text)
        assert len(chunks) > 1
        for chunk in chunks:
            assert "chunk_text" in chunk
            assert "chunk_id" in chunk

    def test_empty_text(self):
        chunker = DocumentChunker()
        assert chunker.chunk_text("") == []
        assert chunker.chunk_text("   ") == []

    def test_short_text(self):
        chunker = DocumentChunker(chunk_size=1000)
        text = "This is a short text with some content for testing."
        chunks = chunker.chunk_text(text)
        assert len(chunks) >= 1

    def test_metadata_propagation(self):
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=10)
        text = "Sentence one about AI. Sentence two about ML. Sentence three about data science."
        metadata = {"source_id": "test_source", "url": "https://example.com", "document_format": "pdf"}
        chunks = chunker.chunk_text(text, metadata=metadata)
        for chunk in chunks:
            assert chunk.get("source_id") == "test_source"
            assert chunk.get("document_format") == "pdf"

    def test_url_dedup(self):
        """Test URL normalization."""
        from app.services.tavily_search import TavilySearchService
        svc = TavilySearchService.__new__(TavilySearchService)
        assert svc._normalize_url("https://example.com/page/") == "https://example.com/page"
        assert svc._normalize_url("https://example.com/page?ref=123") == "https://example.com/page"


class TestObsidianExport:
    """Test Obsidian vault generation, validation, and ZIP creation."""

    def _create_test_run(self) -> ResearchRun:
        run = ResearchRun(query="How do AI agents work?")
        run.plan = get_mock_research_plan("How do AI agents work?")
        run.sources = get_mock_sources()
        run.evaluations = get_mock_evaluations()
        run.claims = get_mock_claims()
        run.fact_checks = get_mock_fact_checks()
        run.synthesis = get_mock_synthesis("How do AI agents work?")
        run.stats = ResearchStats(
            sources_discovered=3, sources_accepted=3, claims_extracted=5,
            claims_verified=5, contradictions_found=1, chunks_indexed=24,
        )
        return run

    def test_vault_generation_and_validation(self):
        exporter = ObsidianExporter()
        run = self._create_test_run()
        vault = exporter.generate_vault(run)
        assert len(vault.notes) > 0

        # Check index note exists
        index = next((n for n in vault.notes if "00 - Index.md" in n.filename), None)
        assert index is not None

        # Validate vault
        is_valid, msg = exporter.validate_vault(vault)
        assert is_valid is True

    def test_note_frontmatter(self):
        exporter = ObsidianExporter()
        run = self._create_test_run()
        vault = exporter.generate_vault(run)
        for note in vault.notes:
            content = exporter._build_note_content(note)
            assert content.startswith("---")
            assert "---" in content[3:]

    def test_zip_creation(self):
        exporter = ObsidianExporter()
        run = self._create_test_run()
        vault = exporter.generate_vault(run)
        zip_bytes = exporter.export_zip(vault)
        assert len(zip_bytes) > 0

        # Verify it's a valid ZIP
        buffer = io.BytesIO(zip_bytes)
        with zipfile.ZipFile(buffer, "r") as zf:
            names = zf.namelist()
            assert len(names) > 0
            # Check for markdown files
            md_files = [n for n in names if n.endswith(".md")]
            assert len(md_files) > 0
            assert any("00 - Index.md" in fn for fn in md_files)

    def test_wiki_links_present(self):
        exporter = ObsidianExporter()
        run = self._create_test_run()
        vault = exporter.generate_vault(run)
        index = next((n for n in vault.notes if "00 - Index.md" in n.filename), None)
        assert "[[" in index.content  # Wiki links should be present


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
