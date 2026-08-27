"""
Document Parser Unit Tests
Tests text extraction, normalization, and graceful handling of empty/corrupt/scanned files.
"""

import pytest
import io
from app.services.document_parser import (
    DocumentParser, store_document, get_document, get_all_documents, clear_documents
)
from app.schemas.research import SourceType


class TestDocumentParser:
    """Test multi-format document parser."""

    def setup_method(self):
        clear_documents()

    def test_parse_plain_text(self):
        text_content = b"This is a sample research document.\nIt contains facts about AI coding assistants."
        parsed = DocumentParser.parse_file("sample.txt", text_content)
        assert parsed.readable is True
        assert parsed.file_type == "txt"
        assert parsed.word_count > 5
        assert "AI coding assistants" in parsed.text

    def test_parse_markdown(self):
        md_content = b"# Executive Brief\n\nAI agents automate **iterative development** cycles.\n\n- Point 1\n- Point 2"
        parsed = DocumentParser.parse_file("brief.md", md_content)
        assert parsed.readable is True
        assert parsed.file_type == "md"
        assert "iterative development" in parsed.text

    def test_parse_empty_file(self):
        parsed = DocumentParser.parse_file("empty.txt", b"")
        assert parsed.readable is False
        assert parsed.status == "error"
        assert "empty" in parsed.error.lower()

    def test_parse_unreadable_pdf_graceful(self):
        """Simulate a corrupt or unreadable PDF without crashing."""
        corrupt_pdf = b"%PDF-1.4 \x00\x00\x00corrupt header"
        parsed = DocumentParser.parse_file("scanned.pdf", corrupt_pdf)
        assert parsed.readable is False
        assert parsed.file_type == "pdf"
        assert "Could not extract machine-readable text from this PDF." in parsed.error

    def test_parse_csv(self):
        csv_content = b"Metric,Score,Notes\nRelevance,0.95,High quality\nCredibility,0.90,Peer-reviewed"
        parsed = DocumentParser.parse_file("data.csv", csv_content)
        assert parsed.readable is True
        assert parsed.file_type == "csv"
        assert "Relevance | 0.95 | High quality" in parsed.text

    def test_to_source_conversion(self):
        text_content = b"Research findings on agentic reasoning architectures and memory models."
        parsed = DocumentParser.parse_file("agent_notes.txt", text_content)
        source = DocumentParser.to_source(parsed)

        assert source.source_type == SourceType.DOCUMENT.value
        assert source.document_format == "txt"
        assert "agent_notes.txt" in source.title
        assert source.extraction_success is True
        assert source.content == parsed.text

    def test_document_store(self):
        parsed = DocumentParser.parse_file("doc1.txt", b"Content 1")
        store_document(parsed)
        retrieved = get_document(parsed.document_id)
        assert retrieved is not None
        assert retrieved.filename == "doc1.txt"
        assert len(get_all_documents()) == 1
