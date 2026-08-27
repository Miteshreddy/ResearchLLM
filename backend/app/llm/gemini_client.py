"""
Gemini LLM Client wrapper.
Delegates to LLMService for automatic Gemini primary + Groq fallback routing.
"""

from app.llm.llm_service import LLMService, get_llm_service

# For backward compatibility
GeminiClient = LLMService
get_gemini_client = get_llm_service
