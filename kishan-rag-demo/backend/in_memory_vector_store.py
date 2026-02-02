"""
Simple in-memory vector store fallback when ChromaDB and Pinecone are not available.
Uses sentence-transformers for embeddings and stores vectors in memory.
This is a basic implementation for development/testing purposes.
"""
import os
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from fastapi.concurrency import run_in_threadpool
import numpy as np
from typing import List, Dict, Optional
import asyncio

# Model paths - use local models if available
MODELS_DIR = "./models"
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"  # Smaller, faster model (384 dim)
EMBED_MODEL_PATH = os.path.join(MODELS_DIR, "all-MiniLM-L6-v2")
USE_LOCAL_EMBED = os.path.exists(EMBED_MODEL_PATH)

# Lazy load model
_model = None

def get_model():
    """Lazy load embedding model"""
    global _model
    if _model is None:
        model_path = EMBED_MODEL_PATH if USE_LOCAL_EMBED else EMBED_MODEL_NAME
        print(f"[memory_service] Loading embedding model from: {model_path}...")
        _model = SentenceTransformer(model_path)
        print(f"[memory_service] Model loaded, dim={_model.get_sentence_embedding_dimension()}")
    return _model

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

# In-memory storage
_documents: List[Dict] = []
_embeddings: List[np.ndarray] = []


async def upsert_document(text, metadata=None, batch_size=50, chunk_offset=0):
    """
    Upsert document chunks into in-memory vector store
    Accept doc_name and doc_url in metadata
    """
    model = get_model()  # Lazy load model
    doc_name = metadata.get("doc_name") if metadata else None
    doc_url = metadata.get("doc_url") if metadata else None
    chunks = text_splitter.split_text(text)
    total_chunks = len(chunks)
    
    for batch_start in range(0, total_chunks, batch_size):
        batch_chunks = chunks[batch_start:batch_start+batch_size]
        embeddings = await run_in_threadpool(model.encode, batch_chunks)
        
        ids = [f"chunk-{chunk_offset + batch_start + i}" for i in range(len(batch_chunks))]
        
        for i, (chunk, emb) in enumerate(zip(batch_chunks, embeddings)):
            chunk_metadata = {
                "text": chunk,
                "chunk_index": str(chunk_offset + batch_start + i)
            }
            if doc_name:
                chunk_metadata["doc_name"] = doc_name
            if doc_url:
                chunk_metadata["doc_url"] = doc_url
            
            # Store in memory
            _documents.append({
                "id": ids[i],
                "text": chunk,
                "metadata": chunk_metadata,
                "embedding": emb
            })
            _embeddings.append(emb)
    
    print(f"[memory_service] Stored {total_chunks} chunks in memory (total: {len(_documents)} chunks)")
    return total_chunks


async def query_index(query, top_k=3, return_metadata=False):
    """
    Query the in-memory vector store with cosine similarity
    """
    if len(_documents) == 0:
        return [] if not return_metadata else []
    
    model = get_model()  # Lazy load model
    
    # Encode query
    query_emb = await run_in_threadpool(model.encode, [query])
    query_emb = query_emb[0]
    
    # Calculate cosine similarities
    def compute_similarities():
        similarities = []
        for emb in _embeddings:
            # Cosine similarity
            dot_product = np.dot(query_emb, emb)
            norm_query = np.linalg.norm(query_emb)
            norm_emb = np.linalg.norm(emb)
            similarity = dot_product / (norm_query * norm_emb) if (norm_query * norm_emb) > 0 else 0
            similarities.append(similarity)
        return similarities
    
    similarities = await run_in_threadpool(compute_similarities)
    
    # Get top_k matches
    top_indices = np.argsort(similarities)[::-1][:top_k]
    
    matches = []
    for idx in top_indices:
        doc = _documents[idx]
        if return_metadata:
            matches.append({
                "metadata": doc["metadata"],
            })
        else:
            matches.append(doc["text"])
    
    return matches


