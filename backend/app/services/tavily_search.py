"""
Tavily Search Service
Discovers web sources using Tavily API with focused search queries.
Supports concurrent multi-query execution.
"""

import asyncio
import logging
from typing import Optional
from app.config import get_settings
from app.schemas.research import SearchResult

logger = logging.getLogger(__name__)


class TavilySearchService:
    """Tavily web search for research discovery."""

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not self.settings.tavily_configured:
                raise ValueError("TAVILY_API_KEY is not configured")
            from tavily import TavilyClient
            self._client = TavilyClient(api_key=self.settings.tavily_api_key)
        return self._client

    def search(
        self,
        query: str,
        max_results: int = 3,
        search_depth: str = "basic",
        include_domains: Optional[list[str]] = None,
        exclude_domains: Optional[list[str]] = None,
    ) -> list[SearchResult]:
        """
        Search for sources using Tavily synchronously.
        Returns list of SearchResult objects.
        """
        try:
            kwargs = {
                "query": query,
                "max_results": max_results,
                "search_depth": search_depth,
            }
            if include_domains:
                kwargs["include_domains"] = include_domains
            if exclude_domains:
                kwargs["exclude_domains"] = exclude_domains

            response = self.client.search(**kwargs)

            results = []
            for item in response.get("results", []):
                results.append(SearchResult(
                    url=item.get("url", ""),
                    title=item.get("title", ""),
                    snippet=item.get("content", "")[:500],
                    score=item.get("score", 0.0),
                    query=query,
                ))

            logger.info(f"Tavily search for '{query[:50]}...' returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Tavily search failed for '{query[:50]}...': {e}")
            return []

    async def async_search(
        self,
        query: str,
        max_results: int = 3,
        search_depth: str = "basic",
    ) -> list[SearchResult]:
        """Asynchronously execute a single Tavily search."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, self.search, query, max_results, search_depth
        )

    async def async_search_multiple(
        self,
        queries: list[str],
        max_results_per_query: int = 2,
        search_depth: str = "basic",
        max_total_sources: int = 6,
    ) -> list[SearchResult]:
        """
        Concurrently execute multiple search queries and deduplicate results.
        Enforces max_total_sources limit.
        """
        if not queries:
            return []

        tasks = [
            self.async_search(q, max_results=max_results_per_query, search_depth=search_depth)
            for q in queries
        ]
        results_lists = await asyncio.gather(*tasks, return_exceptions=True)

        all_results = []
        seen_urls = set()

        for res in results_lists:
            if isinstance(res, list):
                for item in res:
                    url_key = self._normalize_url(item.url)
                    if url_key not in seen_urls:
                        seen_urls.add(url_key)
                        all_results.append(item)
                        if len(all_results) >= max_total_sources:
                            break
            if len(all_results) >= max_total_sources:
                break

        logger.info(f"Multi-search: {len(queries)} queries concurrently executed → {len(all_results)} unique results")
        return all_results[:max_total_sources]

    def search_multiple(
        self,
        queries: list[str],
        max_results_per_query: int = 3,
        search_depth: str = "basic",
    ) -> list[SearchResult]:
        """Synchronous search multiple wrapper."""
        all_results = []
        seen_urls = set()

        for query in queries:
            results = self.search(
                query=query,
                max_results=max_results_per_query,
                search_depth=search_depth,
            )
            for result in results:
                url_key = self._normalize_url(result.url)
                if url_key not in seen_urls:
                    seen_urls.add(url_key)
                    all_results.append(result)

        return all_results

    @staticmethod
    def _normalize_url(url: str) -> str:
        """Normalize URL for deduplication."""
        url = url.lower().strip()
        url = url.rstrip("/")
        # Remove common tracking params
        if "?" in url:
            base = url.split("?")[0]
            return base
        return url


_tavily_service: Optional[TavilySearchService] = None


def get_tavily_service() -> TavilySearchService:
    global _tavily_service
    if _tavily_service is None:
        _tavily_service = TavilySearchService()
    return _tavily_service
