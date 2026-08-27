"""
ResearchPilot AI - Two-Provider LLM Router
Primary: Google Gemini (Gemini 2.5 Flash via google-genai)
Fallback: Groq (openai/gpt-oss-120b via groq SDK)

Provides a unified interface with automatic provider fallback, rate-limit fail-fast
fallback, and strict Pydantic structured output validation.
"""

import json
import logging
import re
import time
import asyncio
from typing import Type, TypeVar, Optional, Any

from pydantic import BaseModel
from google import genai
from google.genai import types

from app.config import get_settings

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


def _extract_retry_delay(e: Exception, attempt: int) -> float:
    """Extract recommended retry delay from rate limit error message, or compute exponential backoff."""
    err_str = str(e)
    match = re.search(r"retry in ([\d\.]+)s", err_str, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1)) + 0.5
        except ValueError:
            pass
    match_delay = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+)s?", err_str, re.IGNORECASE)
    if match_delay:
        try:
            return float(match_delay.group(1)) + 0.5
        except ValueError:
            pass
    return float(min(2 ** attempt * 2 + 1, 10))


def _clean_json_string(content: str) -> str:
    """Strip markdown code fences, thought traces, and surrounding chatter from JSON strings."""
    content = content.strip()
    
    # Remove markdown code fences if wrapped
    if "```" in content:
        # Check for ```json ... ``` blocks
        matches = re.findall(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
        if matches:
            # Pick the largest JSON-looking block
            for block in sorted(matches, key=len, reverse=True):
                block_clean = block.strip()
                if (block_clean.startswith("{") and block_clean.endswith("}")) or (block_clean.startswith("[") and block_clean.endswith("]")):
                    return block_clean

    # Find outermost { ... } or [ ... ]
    start_brace = content.find("{")
    start_bracket = content.find("[")

    if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
        end_brace = content.rfind("}")
        if end_brace != -1 and end_brace > start_brace:
            return content[start_brace:end_brace + 1].strip()
    elif start_bracket != -1:
        end_bracket = content.rfind("]")
        if end_bracket != -1 and end_bracket > start_bracket:
            return content[start_bracket:end_bracket + 1].strip()

    return content.strip()


class LLMService:
    """
    Unified LLM Service providing structured JSON and text completion.
    Automatically routes to Gemini 2.5 Flash as primary and Groq (openai/gpt-oss-120b) as fallback.
    """

    def __init__(self):
        self.settings = get_settings()
        self._gemini_client: Optional[genai.Client] = None
        self._groq_client: Optional[Any] = None

    @property
    def gemini_client(self) -> genai.Client:
        if self._gemini_client is None:
            if not self.settings.gemini_configured:
                raise ValueError("GEMINI_API_KEY is not configured")
            self._gemini_client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._gemini_client

    @property
    def groq_client(self) -> Any:
        if self._groq_client is None:
            if not self.settings.groq_configured:
                raise ValueError("GROQ_API_KEY is not configured")
            from groq import Groq
            self._groq_client = Groq(api_key=self.settings.groq_api_key)
        return self._groq_client

    def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> T:
        """
        Execute structured LLM completion against response_model.
        Attempts Gemini first; falls back immediately to Groq on failure or rate limits.
        """
        gemini_error = None

        # 1. Try Gemini (Primary)
        if self.settings.gemini_configured:
            try:
                return self._complete_gemini(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=response_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            except Exception as e:
                gemini_error = e
                logger.warning(
                    f"Primary provider (Gemini) failed: {e}. Triggering Groq fallback..."
                )

        # 2. Try Groq (Fallback)
        if self.settings.groq_configured:
            logger.info(f"Executing Groq fallback (model: {self.settings.groq_model})...")
            try:
                result = self._complete_groq(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=response_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                logger.info("Groq fallback completed successfully")
                return result
            except Exception as groq_err:
                logger.error(f"Groq fallback failed: {groq_err}")
                raise RuntimeError(
                    f"LLM request failed across both providers. Gemini: {gemini_error}; Groq: {groq_err}"
                )

        if gemini_error:
            raise gemini_error
        raise RuntimeError("No LLM providers are configured (set GEMINI_API_KEY or GROQ_API_KEY).")

    def _complete_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> T:
        """Call Gemini with structured output configuration."""
        last_error = None
        for attempt in range(self.settings.max_retries):
            try:
                cfg = types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    response_mime_type="application/json",
                    response_schema=response_model,
                )
                response = self.gemini_client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=user_prompt,
                    config=cfg,
                )
                content = response.text
                if not content:
                    raise ValueError("Empty response from Gemini")

                cleaned = _clean_json_string(content)
                parsed = response_model.model_validate_json(cleaned)
                logger.info(f"Gemini call successful (attempt {attempt + 1})")
                return parsed

            except Exception as e:
                last_error = e
                err_str = str(e)
                cls_name = type(e).__name__
                is_rate_limit = (
                    "429" in err_str
                    or "RESOURCE_EXHAUSTED" in err_str
                    or "quota" in err_str.lower()
                    or "ResourceExhausted" in cls_name
                    or getattr(e, "code", None) == 429
                )

                if is_rate_limit:
                    wait_time = _extract_retry_delay(e, attempt)
                    if wait_time > 8.0:
                        # Fail fast to Groq fallback instead of stalling the pipeline for 60 seconds
                        logger.warning(
                            f"Gemini rate limit wait ({wait_time:.1f}s) exceeds fast threshold. Failing to trigger Groq fallback..."
                        )
                        raise
                    logger.warning(
                        f"Gemini rate limited (429), waiting {wait_time:.1f}s (attempt {attempt + 1}/{self.settings.max_retries})"
                    )
                    time.sleep(wait_time)
                elif "503" in err_str or "UNAVAILABLE" in err_str:
                    logger.warning(f"Gemini 503 service unavailable. Failing to trigger Groq fallback...")
                    raise
                elif "API_KEY_INVALID" in err_str or ("INVALID_ARGUMENT" in err_str and "key" in err_str.lower()):
                    logger.error(f"Gemini invalid API key: {e}")
                    raise
                else:
                    logger.warning(f"Gemini error (attempt {attempt + 1}): {e}")
                    if attempt < self.settings.max_retries - 1:
                        time.sleep(1)

        raise RuntimeError(f"Gemini failed after {self.settings.max_retries} attempts: {last_error}")

    def _complete_groq(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.2,
        max_tokens: int = 4096,
    ) -> T:
        """Call Groq (openai/gpt-oss-120b) and validate against Pydantic schema."""
        schema_json = json.dumps(response_model.model_json_schema(), indent=2)
        enhanced_system = (
            f"{system_prompt}\n\n"
            f"You are a structured data extraction engine. You MUST respond with ONLY a valid JSON object matching this schema:\n"
            f"{schema_json}\n"
            f"Do not include any explanation, conversational text, markdown formatting, or internal commentary outside the JSON object."
        )

        model_name = self.settings.groq_model or "openai/gpt-oss-120b"
        logger.info(f"Calling Groq with model '{model_name}'...")

        completion = self.groq_client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": enhanced_system},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        raw_text = completion.choices[0].message.content
        if not raw_text:
            raise ValueError("Groq returned empty response")

        cleaned = _clean_json_string(raw_text)
        parsed = response_model.model_validate_json(cleaned)
        logger.info(f"Groq structured output parsed successfully with model '{model_name}'")
        return parsed

    async def async_complete(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> T:
        """Asynchronously call structured completion."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self.complete, system_prompt, user_prompt, response_model, temperature, max_tokens
        )

    def complete_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.5,
        max_tokens: int = 4096,
    ) -> str:
        """Simple text completion with fallback."""
        if self.settings.gemini_configured:
            try:
                cfg = types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
                res = self.gemini_client.models.generate_content(
                    model=self.settings.gemini_model,
                    contents=user_prompt,
                    config=cfg,
                )
                if res.text:
                    return res.text.strip()
            except Exception as e:
                logger.warning(f"Gemini text completion failed: {e}")

        if self.settings.groq_configured:
            try:
                completion = self.groq_client.chat.completions.create(
                    model=self.settings.groq_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return completion.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"Groq text completion failed: {e}")
                raise

        raise RuntimeError("No LLM provider available for text completion.")

    async def async_complete_text(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.5,
        max_tokens: int = 4096,
    ) -> str:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self.complete_text, system_prompt, user_prompt, temperature, max_tokens
        )


_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Singleton getter for LLM service."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
