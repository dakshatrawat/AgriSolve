# ============================================================================
# PINECONE SERVICE - CLOUD VECTOR DATABASE (Lightweight - No torch)
# ============================================================================
# Uses fastembed (ONNX) for embeddings instead of sentence-transformers (torch)
# Uses Gemini for reranking instead of local cross-encoder
# Embedding: all-MiniLM-L6-v2 (384 dimensions) - matches existing index
# ============================================================================

import os
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
from langchain_text_splitters import RecursiveCharacterTextSplitter
import asyncio
from fastapi.concurrency import run_in_threadpool
import google.generativeai as genai

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
PINECONE_CLOUD = os.getenv("PINECONE_CLOUD", "aws")
PINECONE_DIMENSION = int(os.getenv("PINECONE_DIMENSION", "384"))
PINECONE_METRIC = os.getenv("PINECONE_METRIC", "cosine")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

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
env_value = (PINECONE_ENVIRONMENT or "").strip()
if env_value.startswith("aws-"):
    cloud, region = "aws", env_value[len("aws-"):]
elif env_value.startswith("gcp-"):
    cloud, region = "gcp", env_value[len("gcp-"):]
elif env_value.startswith("azure-"):
    cloud, region = "azure", env_value[len("azure-"):]
elif env_value:
    cloud, region = PINECONE_CLOUD, env_value
else:
    cloud, region = PINECONE_CLOUD, "us-east-1"

print(f"[pinecone_service] Cloud: {cloud}, Region: {region}")

try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    print(f"[pinecone_service] Pinecone client initialized successfully")
except Exception as e:
    print(f"[pinecone_service] ERROR: Failed to initialize Pinecone client: {e}")
    raise

# Embedding model config
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
INDEX_DIM = PINECONE_DIMENSION

# Lazy-loaded embedding model (fastembed uses ONNX, much lighter than torch)
_embed_model = None

def get_embed_model():
    global _embed_model
    if _embed_model is None:
        from fastembed import TextEmbedding
        print(f"[pinecone_service] Loading embedding model (ONNX): {EMBED_MODEL_NAME}...")
        _embed_model = TextEmbedding(EMBED_MODEL_NAME)
        print(f"[pinecone_service] Embedding model loaded")
    return _embed_model


def _embed_texts(texts):
    """Generate embeddings using fastembed (ONNX runtime)."""
    model = get_embed_model()
    embeddings = list(model.embed(texts))
    return [emb.tolist() for emb in embeddings]


def _embed_query(query):
    """Generate query embedding."""
    model = get_embed_model()
    embeddings = list(model.embed([query]))
    return embeddings[0].tolist()


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
            print(f"[pinecone_service] Index '{PINECONE_INDEX_NAME}' not found. Creating with dim={INDEX_DIM}...")
            pc.create_index(
                name=PINECONE_INDEX_NAME,
                dimension=INDEX_DIM,
                metric=PINECONE_METRIC,
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


async def upsert_document(text, metadata=None, batch_size=50, chunk_offset=0):
    """Upsert document chunks with embeddings and metadata to Pinecone."""
    print(f"\n[pinecone_service] === STARTING UPSERT ===")
    print(f"[pinecone_service] Text length: {len(text)} characters")
    print(f"[pinecone_service] Metadata received: {metadata}")

    chunks = text_splitter.split_text(text)
    total_chunks = len(chunks)
    print(f"[pinecone_service] Split into {total_chunks} chunks")

    total_upserted = 0
    for batch_start in range(0, total_chunks, batch_size):
        batch_chunks = chunks[batch_start:batch_start+batch_size]
        batch_num = (batch_start // batch_size) + 1

        embeddings = await run_in_threadpool(_embed_texts, batch_chunks)

        ids = [f"chunk-{chunk_offset + batch_start + i}" for i in range(len(batch_chunks))]
        to_upsert = []

        for i, (chunk, emb) in enumerate(zip(batch_chunks, embeddings)):
            chunk_metadata = {
                "text": chunk,
                "chunk_index": chunk_offset + batch_start + i
            }
            if metadata:
                for key, value in metadata.items():
                    if value is not None:
                        chunk_metadata[key] = str(value) if not isinstance(value, str) else value

            to_upsert.append((ids[i], emb, chunk_metadata))

        index.upsert(vectors=to_upsert)
        total_upserted += len(to_upsert)
        print(f"[pinecone_service] Batch {batch_num} upserted: {len(to_upsert)} vectors")

    print(f"[pinecone_service] === UPSERT COMPLETE: {total_upserted} chunks ===")
    return total_chunks


async def query_index(query, top_k=3, return_metadata=False):
    """Query Pinecone with ONNX embeddings and Gemini reranking."""
    print(f"\n[pinecone_service] === STARTING QUERY ===")
    print(f"[pinecone_service] Query: '{query}'")

    # Step 1: Retrieve candidates
    candidate_k = top_k * 3
    query_emb = await run_in_threadpool(_embed_query, query)
    res = index.query(vector=query_emb, top_k=candidate_k, include_metadata=True)
    candidates = res['matches']
    print(f"[pinecone_service] Retrieved {len(candidates)} candidates")

    if not candidates:
        return []

    # Step 2: Rerank using Gemini
    if len(candidates) > top_k and GOOGLE_API_KEY:
        try:
            texts = [c['metadata']['text'] for c in candidates]
            rerank_prompt = (
                f"Given the query: \"{query}\"\n\n"
                f"Rank these text passages by relevance (most relevant first). "
                f"Return ONLY a comma-separated list of numbers (0-indexed positions). "
                f"Example: 2,0,5,1,3,4\n\n"
            )
            for i, t in enumerate(texts):
                rerank_prompt += f"[{i}] {t[:200]}\n"

            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(rerank_prompt)
            ranking_text = response.text.strip()

            ranked_indices = []
            for part in ranking_text.split(","):
                part = part.strip()
                if part.isdigit() and int(part) < len(candidates):
                    ranked_indices.append(int(part))

            if ranked_indices:
                reranked = [candidates[i] for i in ranked_indices[:top_k]]
                candidates = reranked
                print(f"[pinecone_service] Reranked with Gemini, returning top {len(candidates)}")
            else:
                candidates = candidates[:top_k]
        except Exception as e:
            print(f"[pinecone_service] Reranking failed: {e}, using Pinecone scores")
            candidates = candidates[:top_k]
    else:
        candidates = candidates[:top_k]

    print(f"[pinecone_service] === QUERY COMPLETE: {len(candidates)} results ===")

    if return_metadata:
        return candidates
    return [match['metadata']['text'] for match in candidates]
