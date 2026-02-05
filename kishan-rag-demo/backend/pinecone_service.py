
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


async def upsert_document(text, metadata=None, batch_size=50, chunk_offset=0):
    # Accept doc_name and doc_url in metadata
    doc_name = metadata.get("doc_name") if metadata else None
    doc_url = metadata.get("doc_url") if metadata else None
    chunks = text_splitter.split_text(text)
    total_chunks = len(chunks)
    for batch_start in range(0, total_chunks, batch_size):
        batch_chunks = chunks[batch_start:batch_start+batch_size]
        embeddings = await run_in_threadpool(model.encode, batch_chunks)
        embeddings = embeddings.tolist()
        ids = [f"chunk-{chunk_offset + batch_start + i}" for i in range(len(batch_chunks))]
        to_upsert = []
        for i, (chunk, emb) in enumerate(zip(batch_chunks, embeddings)):
            chunk_metadata = {
                "text": chunk,
                "chunk_index": chunk_offset + batch_start + i
            }
            if doc_name:
                chunk_metadata["doc_name"] = doc_name
            if doc_url:
                chunk_metadata["doc_url"] = doc_url
            to_upsert.append((ids[i], emb, chunk_metadata))
        index.upsert(vectors=to_upsert)
    return total_chunks


async def query_index(query, top_k=3, return_metadata=False):
    # Step A: Retrieve a larger candidate pool
    candidate_k = top_k * 3
    query_emb = await run_in_threadpool(model.encode, [query])
    query_emb = query_emb[0].tolist()
    res = index.query(vector=query_emb, top_k=candidate_k, include_metadata=True)
    candidates = res['matches']
    if not candidates:
        return [] if not return_metadata else []

    # Step B: Cross-Encoder scoring
    pairs = [(query, c['metadata']['text']) for c in candidates]
    scores = await run_in_threadpool(cross_encoder.predict, pairs)

    # Step C: Sort by Cross-Encoder score (descending)
    candidates_with_scores = [
        (c, s) for c, s in zip(candidates, scores)
    ]
    candidates_with_scores.sort(key=lambda x: x[1], reverse=True)

    # Step D: Select top_k
    top_matches = [c for c, _ in candidates_with_scores[:top_k]]

    if return_metadata:
        return top_matches
    return [match['metadata']['text'] for match in top_matches]
