"""
Web Content Extraction Service
Uses Firecrawl when available, falls back to httpx + BeautifulSoup.
Supports parallel batch extraction and custom URL ingestion.
"""

import asyncio
import logging
import re
import hashlib
from typing import Optional
from urllib.parse import urlparse
from datetime import datetime, timezone
import httpx
from bs4 import BeautifulSoup
from app.config import get_settings
from app.schemas.research import Source, SourceType

logger = logging.getLogger(__name__)

# URL cache for deduplication within a session
_url_cache: dict[str, Source] = {}


class WebExtractor:
    """Extract clean content from web pages and direct URLs."""

    def __init__(self):
        self.settings = get_settings()
        self._firecrawl = None

    @property
    def firecrawl_client(self):
        if self._firecrawl is None and self.settings.firecrawl_configured:
            try:
                from firecrawl import FirecrawlApp
                self._firecrawl = FirecrawlApp(api_key=self.settings.firecrawl_api_key)
            except Exception as e:
                logger.warning(f"Firecrawl init failed: {e}")
        return self._firecrawl

    async def extract(self, url: str, query: str = "", is_custom_url: bool = False) -> Source:
        """
        Extract content from a URL.
        Returns a Source object with content or error details.
        """
        url = url.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            url = f"https://{url}"

        # Check cache
        url_hash = hashlib.md5(url.encode()).hexdigest()
        if url_hash in _url_cache:
            logger.info(f"Cache hit for {url}")
            return _url_cache[url_hash]

        domain = urlparse(url).netloc
        source_type_val = SourceType.URL.value if is_custom_url else SourceType.WEB.value

        source = Source(
            url=url,
            domain=domain,
            source_type=source_type_val,
            document_format="url" if is_custom_url else "web",
            retrieved_at=datetime.now(timezone.utc).isoformat(),
        )

        # Try Firecrawl first
        if self.firecrawl_client:
            source = await self._extract_firecrawl(url, source)
            if source.extraction_success:
                _url_cache[url_hash] = source
                return source

        # Fallback to httpx + BeautifulSoup
        source = await self._extract_httpx(url, source)
        _url_cache[url_hash] = source
        return source

    async def extract_batch(
        self, urls: list[str], query: str = "", is_custom_url: bool = False, max_concurrency: int = 5
    ) -> list[Source]:
        """Extract multiple URLs concurrently with controlled concurrency."""
        if not urls:
            return []

        semaphore = asyncio.Semaphore(max_concurrency)

        async def _extract_bounded(u: str) -> Source:
            async with semaphore:
                try:
                    return await self.extract(u, query=query, is_custom_url=is_custom_url)
                except Exception as e:
                    logger.warning(f"Batch extraction failed for {u}: {e}")
                    domain = urlparse(u).netloc if "/" in u else u
                    return Source(
                        url=u,
                        domain=domain,
                        source_type=SourceType.URL.value if is_custom_url else SourceType.WEB.value,
                        extraction_success=False,
                        extraction_error=str(e)[:150],
                        retrieved_at=datetime.now(timezone.utc).isoformat(),
                    )

        tasks = [_extract_bounded(u) for u in urls]
        return await asyncio.gather(*tasks)

    async def _extract_firecrawl(self, url: str, source: Source) -> Source:
        """Extract using Firecrawl API."""
        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.firecrawl_client.scrape_url(url, params={"formats": ["markdown"]})
            )
            if result and result.get("markdown"):
                content = result["markdown"]
                source.content = content[:15000]  # Cap content size
                source.content_length = len(content)
                source.title = result.get("metadata", {}).get("title", "")
                source.author = result.get("metadata", {}).get("author", "Unknown")
                source.extraction_success = True
                if not source.title:
                    source.title = source.domain
                logger.info(f"Firecrawl extracted {len(content)} chars from {url}")
            else:
                source.extraction_error = "Firecrawl returned empty content"
        except Exception as e:
            source.extraction_error = f"Firecrawl error: {str(e)[:200]}"
            logger.warning(f"Firecrawl failed for {url}: {e}")
        return source

    async def _extract_httpx(self, url: str, source: Source) -> Source:
        """Extract using httpx + BeautifulSoup (fallback)."""
        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (ResearchPilot AI Bot)"
                }
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

                soup = BeautifulSoup(response.text, "lxml")

                # Remove script and style elements
                for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "svg"]):
                    tag.decompose()

                # Get title
                title_tag = soup.find("title")
                source.title = title_tag.get_text().strip() if title_tag else ""

                # Try to find author
                author_meta = soup.find("meta", attrs={"name": "author"}) or soup.find("meta", attrs={"property": "article:author"})
                if author_meta:
                    source.author = author_meta.get("content", "Unknown")

                # Try to find published date
                date_meta = soup.find("meta", attrs={"property": "article:published_time"}) or soup.find("meta", attrs={"name": "date"})
                if date_meta:
                    source.published_date = date_meta.get("content", "")

                # Get main content: try article tag first, then main, then body
                main_content = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"content|article|post|body", re.I)) or soup.find("body")
                if main_content:
                    text = main_content.get_text(separator="\n", strip=True)
                    # Clean up
                    text = re.sub(r'\n{3,}', '\n\n', text)
                    text = re.sub(r'[ \t]{2,}', ' ', text)
                    source.content = text[:15000]
                    source.content_length = len(text)
                    source.extraction_success = bool(text.strip())
                    if not source.title:
                        source.title = source.domain
                    logger.info(f"httpx extracted {len(text)} chars from {url}")
                else:
                    source.extraction_error = "No readable content found"

        except httpx.HTTPStatusError as e:
            source.extraction_error = f"HTTP {e.response.status_code}"
            logger.warning(f"HTTP error for {url}: {e.response.status_code}")
        except httpx.TimeoutException:
            source.extraction_error = "Request timed out"
            logger.warning(f"Timeout for {url}")
        except Exception as e:
            source.extraction_error = f"Extraction error: {str(e)[:200]}"
            logger.warning(f"Extraction failed for {url}: {e}")

        return source

    @staticmethod
    def _classify_source(domain: str, content: str = "") -> SourceType:
        """Classify source type based on domain."""
        domain = domain.lower()

        academic_domains = ["arxiv.org", "scholar.google", "ieee.org", "acm.org", "doi.org",
                           "researchgate.net", "semanticscholar.org", "pubmed", ".edu"]
        gov_domains = [".gov", ".mil"]
        news_domains = ["reuters.com", "bbc.com", "nytimes.com", "theguardian.com",
                       "washingtonpost.com", "techcrunch.com", "wired.com", "arstechnica.com",
                       "theverge.com", "venturebeat.com"]
        official_domains = ["docs.", "documentation.", "developer.", ".dev", "github.com"]
        company_domains = ["microsoft.com", "google.com", "openai.com", "anthropic.com",
                          "meta.com", "amazon.com", "aws.amazon.com"]
        blog_indicators = ["blog", "medium.com", "substack.com", "dev.to", "hashnode"]
        community_domains = ["reddit.com", "stackoverflow.com", "hackernews", "news.ycombinator"]

        for d in academic_domains:
            if d in domain:
                return SourceType.ACADEMIC
        for d in gov_domains:
            if d in domain:
                return SourceType.GOVERNMENT
        for d in news_domains:
            if d in domain:
                return SourceType.NEWS
        for d in official_domains:
            if d in domain:
                return SourceType.OFFICIAL_DOCS
        for d in company_domains:
            if d in domain:
                return SourceType.COMPANY
        for d in blog_indicators:
            if d in domain:
                return SourceType.BLOG
        for d in community_domains:
            if d in domain:
                return SourceType.COMMUNITY

        return SourceType.OTHER


def get_web_extractor() -> WebExtractor:
    return WebExtractor()


def clear_url_cache():
    """Clear the URL cache."""
    global _url_cache
    _url_cache = {}
