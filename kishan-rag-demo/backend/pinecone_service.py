# ============================================================================
# PINECONE SERVICE - CLOUD VECTOR DATABASE
# ============================================================================
# KEY PIPELINE POINTS (README Reference):
# [POINT 4] METADATA STORAGE - Stores doc_name, doc_url, source, source_type
# [POINT 7] VECTOR SEARCH - Uses cosine similarity via Pinecone query
# [POINT 8] TOP 15 CANDIDATES - Retrieves top_k * 3 candidates for reranking
# [POINT 9] CROSS-ENCODER RERANKING - ms-marco-MiniLM-L-6-v2 reranks results
# ============================================================================
# MODELS USED:
# - Embedding: all-MiniLM-L6-v2 (384 dimensions)
# - Reranking: cross-encoder/ms-marco-MiniLM-L-6-v2
# ============================================================================

import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_text_splitters import RecursiveCharacterTextSplitter
import asyncio
from fastapi.concurrency import run_in_threadpool

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")

# Validate environment variables
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY is not set in .env file")
if not PINECONE_ENVIRONMENT:
    raise ValueError("PINECONE_ENVIRONMENT is not set in .env file")
if not PINECONE_INDEX_NAME:
    raise ValueError("PINECONE_INDEX_NAME is not set in .env file")

print(f"[pinecone_service] Initializing Pinecone...")
print(f"[pinecone_service] API Key: {PINECONE_API_KEY[:20]}...")
print(f"[pinecone_service] Environment: {PINECONE_ENVIRONMENT}")
print(f"[pinecone_service] Index Name: {PINECONE_INDEX_NAME}")

# Parse environment for cloud/region
if PINECONE_ENVIRONMENT and "-" in PINECONE_ENVIRONMENT:
    cloud, region = PINECONE_ENVIRONMENT.split("-", 1)
else:
    cloud, region = "aws", "us-east-1"

print(f"[pinecone_service] Cloud: {cloud}, Region: {region}")

try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    print(f"[pinecone_service] Pinecone client initialized successfully")
except Exception as e:
    print(f"[pinecone_service] ERROR: Failed to initialize Pinecone client: {e}")
    raise


# Embedding model: 384-dim to match Pinecone index
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"  # 384 dimensions
INDEX_DIM = 384
# Bi-Encoder for fast retrieval
model = SentenceTransformer(EMBED_MODEL_NAME)
# Log embedding dimension at startup for sanity
try:
    print(f"[pinecone_service] Embedding model: {EMBED_MODEL_NAME}, dim={model.get_sentence_embedding_dimension()}")
except Exception:
    pass
# Cross-Encoder for re-ranking
cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)


def get_or_create_index():
    try:
        print(f"[pinecone_service] Listing existing indexes...")
        index_names = pc.list_indexes().names()
        print(f"[pinecone_service] Found {len(index_names)} existing indexes: {index_names}")
        
        if PINECONE_INDEX_NAME not in index_names:
            print(f"[pinecone_service] Index '{PINECONE_INDEX_NAME}' not found. Creating new index with dimension {INDEX_DIM}...")
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=INDEX_DIM,
                metric="cosine",
                spec=ServerlessSpec(cloud=cloud, region=region)
            )
            print(f"[pinecone_service] Index '{PINECONE_INDEX_NAME}' created successfully")
        else:
            print(f"[pinecone_service] Index '{PINECONE_INDEX_NAME}' already exists")
        
        index = pc.Index(PINECONE_INDEX_NAME)
        print(f"[pinecone_service] Connected to index '{PINECONE_INDEX_NAME}'")
        return index
    except Exception as e:
        print(f"[pinecone_service] ERROR: Failed to get or create index: {e}")
        import traceback
        traceback.print_exc()
        raise

try:
    index = get_or_create_index()
    print(f"[pinecone_service] Pinecone service initialized successfully")
except Exception as e:
    print(f"[pinecone_service] CRITICAL: Pinecone initialization failed: {e}")
    index = None
    raise


# ============================================================================
# [POINT 4] METADATA PRESERVATION IN VECTOR DATABASE
# Stores all metadata fields: doc_name, doc_url, source, source_type, page_url
# [POINT 2] CHUNKING - RecursiveCharacterTextSplitter (500 chars, 50 overlap)
# ============================================================================
async def upsert_document(text, metadata=None, batch_size=50, chunk_offset=0):
    """
    Upsert document chunks with embeddings and metadata to Pinecone.
    Preserves ALL metadata fields from the input.
    """
    print(f"\n[pinecone_service] === STARTING UPSERT ===")
    print(f"[pinecone_service] Text length: {len(text)} characters")
    print(f"[pinecone_service] Metadata received: {metadata}")
    
    chunks = text_splitter.split_text(text)
    total_chunks = len(chunks)
    print(f"[pinecone_service] Split into {total_chunks} chunks (chunk_size=500, overlap=50)")
    
    total_upserted = 0
    for batch_start in range(0, total_chunks, batch_size):
        batch_chunks = chunks[batch_start:batch_start+batch_size]
        batch_num = (batch_start // batch_size) + 1
        print(f"[pinecone_service] Processing batch {batch_num}/{(total_chunks + batch_size - 1) // batch_size}: chunks {batch_start}-{batch_start + len(batch_chunks) - 1}")
        
        embeddings = await run_in_threadpool(model.encode, batch_chunks)
        embeddings = embeddings.tolist()
        
        ids = [f"chunk-{chunk_offset + batch_start + i}" for i in range(len(batch_chunks))]
        to_upsert = []
        
        for i, (chunk, emb) in enumerate(zip(batch_chunks, embeddings)):
            # Start with base metadata
            chunk_metadata = {
                "text": chunk,
                "chunk_index": chunk_offset + batch_start + i
            }
            
            # Preserve ALL metadata fields from input
            if metadata:
                for key, value in metadata.items():
                    # Convert non-string values to strings for Pinecone compatibility
                    if value is not None:
                        chunk_metadata[key] = str(value) if not isinstance(value, str) else value
            
            to_upsert.append((ids[i], emb, chunk_metadata))
        
        # Upsert to Pinecone
        print(f"[pinecone_service] Upserting batch {batch_num} with {len(to_upsert)} vectors to Pinecone...")
        index.upsert(vectors=to_upsert)
        total_upserted += len(to_upsert)
        print(f"[pinecone_service] ✅ Batch {batch_num} upserted successfully")
    
    print(f"[pinecone_service] === UPSERT COMPLETE ===")
    print(f"[pinecone_service] Total chunks upserted to Pinecone: {total_upserted}")
    print(f"[pinecone_service] Metadata stored with each chunk: {list(chunk_metadata.keys())}")
    
    return total_chunks


# ============================================================================
# [POINT 7] HYBRID SEARCH - SEMANTIC + EMBEDDING
# [POINT 8] TOP 15 CANDIDATES RETRIEVAL (top_k * 3 = 15 for top_k=5)
# [POINT 9] CROSS-ENCODER RERANKING FOR BEST SIMILARITY
# ============================================================================
# SEARCH PROCESS:
# Step A: Generate query embedding using all-MiniLM-L6-v2
# Step B: Retrieve 15 candidates via cosine similarity (Pinecone query)
# Step C: Rerank using cross-encoder/ms-marco-MiniLM-L-6-v2
# Step D: Return top_k best matches based on reranked scores
# ============================================================================
async def query_index(query, top_k=3, return_metadata=False):
    """
    Query the Pinecone index with bi-encoder retrieval and cross-encoder reranking.
    """
    print(f"\n[pinecone_service] === STARTING QUERY ===")
    print(f"[pinecone_service] Query: '{query}'")
    print(f"[pinecone_service] Requesting top_k={top_k} results")
    
    # Step A: Retrieve a larger candidate pool
    candidate_k = top_k * 3
    print(f"[pinecone_service] Step 1: Retrieving {candidate_k} candidates from Pinecone...")
    
    query_emb = await run_in_threadpool(model.encode, [query])
    query_emb = query_emb[0].tolist()
    res = index.query(vector=query_emb, top_k=candidate_k, include_metadata=True)
    candidates = res['matches']
    print(f"[pinecone_service] ✅ Retrieved {len(candidates)} candidates")
    
    if not candidates:
        print(f"[pinecone_service] ⚠️ No candidates found in Pinecone")
        return [] if not return_metadata else []

    # Step B: Cross-Encoder scoring
    print(f"[pinecone_service] Step 2: Re-ranking with cross-encoder...")
    pairs = [(query, c['metadata']['text']) for c in candidates]
    scores = await run_in_threadpool(cross_encoder.predict, pairs)
    print(f"[pinecone_service] ✅ Re-ranked {len(scores)} candidates")

    # Step C: Sort by Cross-Encoder score (descending)
    candidates_with_scores = [
        (c, s) for c, s in zip(candidates, scores)
    ]
    candidates_with_scores.sort(key=lambda x: x[1], reverse=True)

    # Step D: Select top_k
    top_matches = [c for c, _ in candidates_with_scores[:top_k]]
    
    print(f"[pinecone_service] === QUERY COMPLETE ===")
    print(f"[pinecone_service] Returning top {len(top_matches)} results")
    
    # Log metadata of top results
    for idx, match in enumerate(top_matches, 1):
        metadata = match.get('metadata', {})
        print(f"[pinecone_service] Result {idx}: score={match.get('score', 'N/A'):.4f}, "
              f"source={metadata.get('source', 'N/A')}, "
              f"source_type={metadata.get('source_type', 'N/A')}, "
              f"text_preview={metadata.get('text', '')[:80]}...")

    if return_metadata:
        return top_matches
    return [match['metadata']['text'] for match in top_matches]
