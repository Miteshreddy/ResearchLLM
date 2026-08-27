"""
Application configuration loaded from environment variables.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


from pydantic import ConfigDict


class Settings(BaseSettings):
    # Gemini (Primary)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Groq (Fallback)
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"

    # Tavily
    tavily_api_key: str = ""

    # Firecrawl
    firecrawl_api_key: str = ""

    # Qdrant
    qdrant_url: str = ""
    qdrant_api_key: str = ""

    # Application
    mock_mode: bool = False
    collection_name: str = "research_knowledge"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    chunk_size: int = 512
    chunk_overlap: int = 50
    max_retries: int = 4
    request_timeout: int = 30

    # Research depth configs (Strictly enforced prototype limits)
    # Quick: max 2 queries, max 4 sources, max 4 extracted pages
    quick_max_queries: int = 2
    quick_max_sources: int = 4
    # Standard: max 4 queries, max 6 sources, max 6 extracted pages
    standard_max_queries: int = 4
    standard_max_sources: int = 6
    # Deep: max 6 queries, max 8 sources, max 8 extracted pages
    deep_max_queries: int = 6
    deep_max_sources: int = 8

    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def gemini_configured(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key)

    @property
    def tavily_configured(self) -> bool:
        return bool(self.tavily_api_key)

    @property
    def firecrawl_configured(self) -> bool:
        return bool(self.firecrawl_api_key)

    @property
    def qdrant_configured(self) -> bool:
        return bool(self.qdrant_url and self.qdrant_api_key)

    def get_depth_config(self, depth: str) -> dict:
        configs = {
            "quick": {"max_queries": self.quick_max_queries, "max_sources": self.quick_max_sources},
            "standard": {"max_queries": self.standard_max_queries, "max_sources": self.standard_max_sources},
            "deep": {"max_queries": self.deep_max_queries, "max_sources": self.deep_max_sources},
        }
        return configs.get(depth, configs["standard"])


@lru_cache()
def get_settings() -> Settings:
    """Load settings from .env file in project root or backend dir."""
    root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    backend_env = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(root_env):
        return Settings(_env_file=root_env)
    elif os.path.exists(backend_env):
        return Settings(_env_file=backend_env)
    return Settings()
