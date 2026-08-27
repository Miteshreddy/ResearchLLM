"""
Qdrant Vector Store
Handles collection management, vector storage, and retrieval.
"""

import logging
from typing import Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from app.config import get_settings
from app.llm.embeddings import get_embedding_service
import uuid

logger = logging.getLogger(__name__)


class QdrantStore:
    """Qdrant vector database operations."""

    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[QdrantClient] = None
        self.collection_name = self.settings.collection_name
        self.embedding_service = get_embedding_service()

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            if not self.settings.qdrant_configured:
                raise ValueError("Qdrant is not configured. Set QDRANT_URL and QDRANT_API_KEY.")
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self._client = QdrantClient(
                    url=self.settings.qdrant_url,
                    api_key=self.settings.qdrant_api_key,
                    timeout=30,
                )
        return self._client

    def ensure_collection(self) -> bool:
        """Create collection if it doesn't exist."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)

            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.embedding_service.dimension,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")
            else:
                logger.info(f"Qdrant collection exists: {self.collection_name}")

            # Ensure payload index for run_id
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="run_id",
                    field_schema="keyword",
                )
            except Exception:
                pass

            return True
        except Exception as e:
            logger.error(f"Failed to ensure Qdrant collection: {e}")
            return False

    def index_chunks(self, chunks: list[dict], run_id: str) -> int:
        """
        Index document chunks into Qdrant.
        Each chunk dict should have: chunk_text, source_id, title, url, domain, etc.
        Returns number of chunks indexed.
        """
        if not chunks:
            return 0

        try:
            # Get embeddings for all chunks
            texts = [c["chunk_text"] for c in chunks]
            embeddings = self.embedding_service.embed_batch(texts)

            # Build points
            points = []
            for chunk, embedding in zip(chunks, embeddings):
                point_id = str(uuid.uuid4())
                payload = {
                    "run_id": run_id,
                    "source_id": chunk.get("source_id", ""),
                    "title": chunk.get("title", ""),
                    "url": chunk.get("url", ""),
                    "domain": chunk.get("domain", ""),
                    "author": chunk.get("author", "Unknown"),
                    "published_date": chunk.get("published_date", ""),
                    "retrieved_at": chunk.get("retrieved_at", ""),
                    "source_type": chunk.get("source_type", "web"),
                    "document_format": chunk.get("document_format", "web"),
                    "topic": chunk.get("topic", ""),
                    "chunk_id": chunk.get("chunk_id", ""),
                    "chunk_text": chunk["chunk_text"],
                    "credibility_score": chunk.get("credibility_score", 0.5),
                    "relevance_score": chunk.get("relevance_score", 0.5),
                }
                points.append(PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                ))

            # Upsert in batches
            batch_size = 100
            for i in range(0, len(points), batch_size):
                batch = points[i:i + batch_size]
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=batch,
                )

            logger.info(f"Indexed {len(points)} chunks into Qdrant for run {run_id}")
            return len(points)

        except Exception as e:
            logger.error(f"Failed to index chunks: {e}")
            raise

    def search(
        self,
        query: str,
        top_k: int = 5,
        run_id: Optional[str] = None,
        source_type: Optional[str] = None,
    ) -> list[dict]:
        """
        Search Qdrant for relevant chunks.
        Returns list of {chunk_text, source_id, source_title, source_url, similarity_score, metadata}.
        """
        try:
            query_embedding = self.embedding_service.embed(query)

            # Build filter
            conditions = []
            if run_id:
                conditions.append(
                    FieldCondition(key="run_id", match=MatchValue(value=run_id))
                )
            if source_type:
                conditions.append(
                    FieldCondition(key="source_type", match=MatchValue(value=source_type))
                )

            search_filter = Filter(must=conditions) if conditions else None

            result = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,
                query_filter=search_filter,
                limit=top_k,
                with_payload=True,
            )

            hits = []
            for hit in result.points:
                payload = hit.payload or {}
                hits.append({
                    "chunk_id": payload.get("chunk_id", str(hit.id)),
                    "chunk_text": payload.get("chunk_text", ""),
                    "source_id": payload.get("source_id", ""),
                    "source_title": payload.get("title", payload.get("source_title", "")),
                    "source_url": payload.get("url", payload.get("source_url", "")),
                    "source_domain": payload.get("domain", payload.get("source_domain", "")),
                    "source_type": payload.get("source_type", "web"),
                    "document_format": payload.get("document_format", "web"),
                    "similarity_score": round(float(hit.score), 4),
                    "credibility_score": payload.get("credibility_score", 0.5),
                    "relevance_score": payload.get("relevance_score", 0.5),
                    "run_id": payload.get("run_id", ""),
                    "metadata": {
                        "source_id": payload.get("source_id", ""),
                        "source_type": payload.get("source_type", "web"),
                        "document_format": payload.get("document_format", "web"),
                        "domain": payload.get("domain", ""),
                        "author": payload.get("author", "Unknown"),
                        "published_date": payload.get("published_date", ""),
                    },
                })
            return hits

        except Exception as e:
            logger.warning(f"Qdrant search query failed: {e}")
            return []

    def get_collection_stats(self) -> dict:
        """Get collection statistics."""
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "total_points": info.points_count or 0,
                "vectors_count": info.vectors_count or 0,
                "status": str(info.status),
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"total_points": 0, "vectors_count": 0, "status": "error"}

    def health_check(self) -> bool:
        """Check Qdrant connectivity."""
        try:
            self.client.get_collections()
            return True
        except Exception:
            return False


# Singleton
_qdrant_store: Optional[QdrantStore] = None


def get_qdrant_store() -> QdrantStore:
    global _qdrant_store
    if _qdrant_store is None:
        _qdrant_store = QdrantStore()
    return _qdrant_store
