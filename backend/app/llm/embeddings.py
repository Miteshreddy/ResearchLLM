"""
Local embedding model using sentence-transformers.
Uses BAAI/bge-small-en-v1.5 - no paid API required.
"""

import logging
import numpy as np
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Local embedding service using sentence-transformers."""

    def __init__(self):
        self.settings = get_settings()
        self._model = None
        self._dimension = 384  # bge-small-en-v1.5 dimension

    @property
    def model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {self.settings.embedding_model}")
                self._model = SentenceTransformer(self.settings.embedding_model)
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise RuntimeError(f"Embedding model load failed: {e}")
        return self._model

    @property
    def dimension(self) -> int:
        return self._dimension

    def embed(self, text: str) -> list[float]:
        """Embed a single text string."""
        if not text.strip():
            return [0.0] * self._dimension
        try:
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            raise

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of text strings."""
        if not texts:
            return []
        try:
            # Filter empty and track indices
            valid_texts = []
            valid_indices = []
            for i, t in enumerate(texts):
                if t.strip():
                    valid_texts.append(t)
                    valid_indices.append(i)

            if not valid_texts:
                return [[0.0] * self._dimension] * len(texts)

            embeddings = self.model.encode(valid_texts, normalize_embeddings=True, batch_size=32)

            # Map back to original indices
            result = [[0.0] * self._dimension] * len(texts)
            for idx, emb in zip(valid_indices, embeddings):
                result[idx] = emb.tolist()

            return result
        except Exception as e:
            logger.error(f"Batch embedding error: {e}")
            raise

    def similarity(self, embedding1: list[float], embedding2: list[float]) -> float:
        """Calculate cosine similarity between two embeddings."""
        a = np.array(embedding1)
        b = np.array(embedding2)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))


# Singleton
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
