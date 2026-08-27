# RAG Fundamentals

Retrieval-Augmented Generation (RAG) is an AI framework that enhances large language model outputs by incorporating external knowledge retrieval.

## Core Concept

RAG combines two key capabilities:
1. **Retrieval**: Searching a knowledge base for relevant information
2. **Generation**: Using an LLM to synthesize retrieved information into coherent responses

## Architecture

A typical RAG pipeline consists of:

### Indexing Phase
- **Document loading**: Ingesting documents from various sources
- **Chunking**: Splitting documents into manageable pieces (typically 256-1024 tokens)
- **Embedding**: Converting text chunks into vector representations
- **Storage**: Storing vectors in a vector database (e.g., Qdrant, Pinecone, Weaviate)

### Retrieval Phase
- **Query processing**: Converting user queries into embeddings
- **Similarity search**: Finding the most relevant chunks using cosine similarity or other metrics
- **Re-ranking**: Optionally re-ordering results for better relevance
- **Context assembly**: Combining retrieved chunks into a coherent context

### Generation Phase
- **Prompt construction**: Combining the query with retrieved context
- **LLM inference**: Generating a response grounded in the retrieved evidence
- **Citation**: Linking generated statements back to source documents

## Key Benefits
- Reduces hallucination by grounding responses in real data
- Enables access to current information beyond training cutoff
- Provides traceability and citation capability
- More cost-effective than fine-tuning for many use cases

## Common Challenges
- Chunking strategy significantly impacts retrieval quality
- Embedding model choice affects semantic understanding
- Retrieval noise can degrade generation quality
- Balancing retrieval breadth vs. precision
