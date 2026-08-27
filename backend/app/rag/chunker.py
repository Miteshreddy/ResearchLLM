"""
RAG Document Chunker
Splits documents into overlapping chunks for embedding and retrieval.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class DocumentChunker:
    """Split text into overlapping chunks for RAG indexing."""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str, metadata: Optional[dict] = None) -> list[dict]:
        """
        Split text into chunks with metadata.
        Returns list of {chunk_id, chunk_text, char_start, char_end, metadata}.
        """
        if not text or not text.strip():
            return []

        # Clean the text
        text = self._clean_text(text)

        # Split into sentences first for natural boundaries
        sentences = self._split_sentences(text)

        chunks = []
        current_chunk = ""
        current_start = 0
        char_pos = 0

        for sentence in sentences:
            # If adding this sentence would exceed chunk_size, save current chunk
            if current_chunk and len(current_chunk) + len(sentence) + 1 > self.chunk_size:
                chunks.append({
                    "chunk_id": f"chunk_{len(chunks)}",
                    "chunk_text": current_chunk.strip(),
                    "char_start": current_start,
                    "char_end": char_pos,
                    **(metadata or {}),
                })

                # Overlap: keep last portion of current chunk
                overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) > self.chunk_overlap else ""
                current_chunk = overlap_text + " " + sentence
                current_start = max(0, char_pos - self.chunk_overlap)
            else:
                if not current_chunk:
                    current_start = char_pos
                current_chunk = (current_chunk + " " + sentence).strip()

            char_pos += len(sentence) + 1

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append({
                "chunk_id": f"chunk_{len(chunks)}",
                "chunk_text": current_chunk.strip(),
                "char_start": current_start,
                "char_end": char_pos,
                **(metadata or {}),
            })

        logger.info(f"Chunked text into {len(chunks)} chunks (avg {sum(len(c['chunk_text']) for c in chunks) // max(len(chunks), 1)} chars)")
        return chunks

    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean and normalize text."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove URLs (they'll be in metadata)
        text = re.sub(r'http[s]?://\S+', '', text)
        # Remove excessive special characters
        text = re.sub(r'[^\w\s.,;:!?\'"()\-—–/]', ' ', text)
        return text.strip()

    @staticmethod
    def _split_sentences(text: str) -> list[str]:
        """Split text into sentences."""
        # Simple sentence splitter
        sentences = re.split(r'(?<=[.!?])\s+', text)
        # Filter out very short fragments
        return [s.strip() for s in sentences if len(s.strip()) > 10]


def get_chunker(chunk_size: int = 512, chunk_overlap: int = 50) -> DocumentChunker:
    return DocumentChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
