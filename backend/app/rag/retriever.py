"""
RAG Retriever
High-level retrieval service that combines Qdrant search with metadata enrichment.
"""

import logging
from typing import Optional
from app.rag.qdrant_store import get_qdrant_store
from app.schemas.research import Evidence

logger = logging.getLogger(__name__)


class RAGRetriever:
    """High-level RAG retrieval service."""

    def __init__(self):
        self.store = get_qdrant_store()

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        run_id: Optional[str] = None,
        min_score: float = 0.25,
    ) -> list[Evidence]:
        """
        Retrieve relevant evidence for a query.
        Returns list of Evidence objects sorted by relevance.
        """
        results = self.store.search(
            query=query,
            top_k=top_k,
            run_id=run_id,
        )

        evidence_list = []
        for r in results:
            sim_score = r.get("similarity_score", 0.0)
            if sim_score >= min_score or not evidence_list:
                metadata = r.get("metadata") or {
                    "source_id": r.get("source_id", ""),
                    "source_title": r.get("source_title", ""),
                    "source_url": r.get("source_url", ""),
                    "source_domain": r.get("source_domain", ""),
                    "source_type": r.get("source_type", "web"),
                    "document_format": r.get("document_format", "web"),
                }
                evidence_list.append(Evidence(
                    chunk_text=r.get("chunk_text", ""),
                    source_id=r.get("source_id", ""),
                    source_title=r.get("source_title", ""),
                    source_url=r.get("source_url", ""),
                    similarity_score=sim_score,
                    metadata=metadata,
                ))

        logger.info(f"Retrieved {len(evidence_list)} evidence chunks for query (min_score={min_score})")
        return evidence_list

    def retrieve_for_claims(
        self,
        claims: list[dict],
        run_id: Optional[str] = None,
        top_k: int = 3,
    ) -> dict[str, list[Evidence]]:
        """
        Retrieve evidence for multiple claims.
        Returns {claim_id: [Evidence]}.
        """
        results = {}
        for claim in claims:
            claim_id = claim.get("claim_id", "")
            claim_text = claim.get("claim_text", "")
            if claim_text:
                evidence = self.retrieve(
                    query=claim_text,
                    top_k=top_k,
                    run_id=run_id,
                    min_score=0.20,
                )
                results[claim_id] = evidence
        return results


_retriever: Optional[RAGRetriever] = None


def get_retriever() -> RAGRetriever:
    global _retriever
    if _retriever is None:
        _retriever = RAGRetriever()
    return _retriever
