"""
LLM Router Unit Tests
Tests JSON cleaning, retry logic extraction, and fallback mechanisms.
"""

import pytest
from pydantic import BaseModel, Field
from app.llm.llm_service import _clean_json_string, _extract_retry_delay


class SampleResponse(BaseModel):
    status: str = Field(default="ok")
    summary: str = Field(default="")
    count: int = Field(default=0)


class TestLLMRouter:
    """Test LLM utility functions and JSON parsing."""

    def test_clean_json_plain(self):
        raw = '{"status": "ok", "summary": "test", "count": 5}'
        cleaned = _clean_json_string(raw)
        assert cleaned == raw
        parsed = SampleResponse.model_validate_json(cleaned)
        assert parsed.status == "ok"
        assert parsed.count == 5

    def test_clean_json_with_code_fences(self):
        raw = '```json\n{"status": "ok", "summary": "with markdown fences", "count": 2}\n```'
        cleaned = _clean_json_string(raw)
        assert cleaned.startswith("{") and cleaned.endswith("}")
        parsed = SampleResponse.model_validate_json(cleaned)
        assert parsed.summary == "with markdown fences"

    def test_clean_json_with_surrounding_text(self):
        raw = 'Here is the requested JSON output:\n{"status": "ok", "summary": "surrounded", "count": 10}\nHope this helps!'
        cleaned = _clean_json_string(raw)
        assert cleaned.startswith("{") and cleaned.endswith("}")
        parsed = SampleResponse.model_validate_json(cleaned)
        assert parsed.count == 10

    def test_extract_retry_delay_from_error(self):
        e = Exception("Resource exhausted: please retry in 4.5s")
        delay = _extract_retry_delay(e, attempt=0)
        assert 4.5 <= delay <= 5.5

    def test_extract_retry_delay_fallback(self):
        e = Exception("Generic 429 error without explicit delay")
        delay = _extract_retry_delay(e, attempt=1)
        assert delay >= 2.0
