import os
from dotenv import load_dotenv
CHROMA_AVAILABLE = False
chromadb = None
chromadb_error = None

try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError as e:
    chromadb_error = f"ChromaDB import failed: {e}"
except Exception as e:
    # Catch Pydantic compatibility errors with Python 3.14
    chromadb_error = f"ChromaDB initialization error (Python 3.14 compatibility issue): {e}"
    CHROMA_AVAILABLE = False
from sentence_transformers import SentenceTransformer, CrossEncoder
from langchain_text_splitters import RecursiveCharacterTextSplitter
import asyncio
from fastapi.concurrency import run_in_threadpool

load_dotenv()

# Initialize ChromaDB client (persistent local storage)
# Using PersistentClient for local, persistent storage
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
client = None
collection = None

if CHROMA_AVAILABLE and chromadb is not None:
    try:
        # Try PersistentClient first (preferred for local storage)
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        COLLECTION_NAME = "documents"
        collection = client.get_or_create_collection(name=COLLECTION_NAME)
        print(f"[chroma_service] ChromaDB initialized at {CHROMA_DB_PATH}")
        CHROMA_AVAILABLE = True
    except Exception as e:
        print(f"[chroma_service] Error initializing ChromaDB client: {e}")
        chromadb_error = f"ChromaDB client initialization failed: {e}"
        CHROMA_AVAILABLE = False
        client = None
        collection = None
else:
    if chromadb_error:
        print(f"[chroma_service] {chromadb_error}")
    else:
        print("[chroma_service] ChromaDB not available")
    CHROMA_AVAILABLE = False
    client = None
    collection = None

# Model paths - use local models if available, otherwise download from HuggingFace
MODELS_DIR = "./models"
# Using a smaller model as fallback if the large model fails
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"  # Smaller, faster model (384 dim)
EMBED_MODEL_PATH = os.path.join(MODELS_DIR, "all-MiniLM-L6-v2")
CROSS_ENCODER_NAME = 'cross-encoder/ms-marco-MiniLM-L-6-v2'
CROSS_ENCODER_PATH = os.path.join(MODELS_DIR, "ms-marco-MiniLM-L-6-v2")

# Check if local models exist
USE_LOCAL_EMBED = os.path.exists(EMBED_MODEL_PATH)
USE_LOCAL_CROSS = os.path.exists(CROSS_ENCODER_PATH)

if USE_LOCAL_EMBED:
    print(f"[chroma_service] Using local embedding model: {EMBED_MODEL_PATH}")
else:
    print(f"[chroma_service] Local model not found, will download: {EMBED_MODEL_NAME}")
    print(f"[chroma_service] Run 'python download_models.py' to download models locally")

if USE_LOCAL_CROSS:
    print(f"[chroma_service] Using local cross-encoder: {CROSS_ENCODER_PATH}")
else:
    print(f"[chroma_service] Local cross-encoder not found, will download: {CROSS_ENCODER_NAME}")

# Lazy load models on first use to avoid blocking server startup
_model = None
_cross_encoder = None

def get_model():
    """Lazy load embedding model"""
    global _model
    if _model is None:
        model_path = EMBED_MODEL_PATH if USE_LOCAL_EMBED else EMBED_MODEL_NAME
        print(f"[chroma_service] Loading embedding model from: {model_path}...")
        _model = SentenceTransformer(model_path)
        print(f"[chroma_service] Model loaded, dim={_model.get_sentence_embedding_dimension()}")
    return _model

def get_cross_encoder():
    """Lazy load cross-encoder model"""
    global _cross_encoder
    if _cross_encoder is None:
        model_path = CROSS_ENCODER_PATH if USE_LOCAL_CROSS else CROSS_ENCODER_NAME
        print(f"[chroma_service] Loading cross-encoder from: {model_path}...")
        _cross_encoder = CrossEncoder(model_path)
        print(f"[chroma_service] Cross-encoder loaded")
    return _cross_encoder

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)


async def upsert_document(text, metadata=None, batch_size=50, chunk_offset=0):
    """
    Upsert document chunks into ChromaDB
    Preserves ALL metadata fields from input including:
    - doc_name, doc_url (for uploaded PDFs)
    - source, source_type, page_url (for scraped webpages/PDFs)
    """
    if not CHROMA_AVAILABLE or client is None or collection is None:
        error_msg = "ChromaDB is not available. "
        if chromadb_error and "Python 3.14" in chromadb_error:
            error_msg += "ChromaDB is not compatible with Python 3.14. Please use Python 3.11 or 3.12, or install chromadb: pip install chromadb"
        else:
            error_msg += "Please install chromadb: pip install chromadb"
        raise ImportError(error_msg)
    model = get_model()  # Lazy load model
    chunks = text_splitter.split_text(text)
    total_chunks = len(chunks)
    
    print(f"[chroma_service] Upserting {total_chunks} chunks with metadata: {metadata}")
    
    for batch_start in range(0, total_chunks, batch_size):
        batch_chunks = chunks[batch_start:batch_start+batch_size]
        embeddings = await run_in_threadpool(model.encode, batch_chunks)
        embeddings = embeddings.tolist()
        
        ids = [f"chunk-{chunk_offset + batch_start + i}" for i in range(len(batch_chunks))]
        metadatas = []
        documents = []
        
        for i, chunk in enumerate(batch_chunks):
            # Start with base metadata
            chunk_metadata = {
                "text": chunk,
                "chunk_index": str(chunk_offset + batch_start + i)
            }
            
            # Preserve ALL metadata fields from input
            if metadata:
                for key, value in metadata.items():
                    # Convert non-string values to strings for ChromaDB compatibility
                    if value is not None:
                        chunk_metadata[key] = str(value) if not isinstance(value, str) else value
            
            metadatas.append(chunk_metadata)
            documents.append(chunk)
        
        # Upsert to ChromaDB (run in threadpool to avoid async issues)
        await run_in_threadpool(
            collection.upsert,
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
    
    print(f"[chroma_service] Successfully upserted {total_chunks} chunks")
    return total_chunks


async def query_index(query, top_k=3, return_metadata=False):
    """
    Query the ChromaDB collection with cross-encoder re-ranking
    Step A: Retrieve a larger candidate pool
    Step B: Cross-Encoder scoring
    Step C: Sort by Cross-Encoder score
    Step D: Select top_k
    """
    if not CHROMA_AVAILABLE or client is None or collection is None:
        error_msg = "ChromaDB is not available. "
        if chromadb_error and "Python 3.14" in chromadb_error:
            error_msg += "ChromaDB is not compatible with Python 3.14. Please use Python 3.11 or 3.12, or install chromadb: pip install chromadb"
        else:
            error_msg += "Please install chromadb: pip install chromadb"
        raise ImportError(error_msg)
    print(f"[chroma_service] Starting query_index for: '{query[:50]}...'")
    model = get_model()  # Lazy load model
    print(f"[chroma_service] Embedding model loaded")
    cross_encoder = get_cross_encoder()  # Lazy load cross-encoder
    print(f"[chroma_service] Cross-encoder loaded")
    
    # Step A: Retrieve candidates
    candidate_k = top_k * 3
    print(f"[chroma_service] Generating embeddings (candidate_k={candidate_k})...")
    query_emb = await run_in_threadpool(model.encode, [query])
    query_emb = query_emb[0].tolist()
    print(f"[chroma_service] Embeddings generated: {len(query_emb)} dimensions")
    
    # Run ChromaDB query in threadpool to avoid httpx issues
    print(f"[chroma_service] Querying ChromaDB...")
    def do_query():
        return collection.query(
            query_embeddings=[query_emb],
            n_results=candidate_k
        )
    results = await run_in_threadpool(do_query)
    print(f"[chroma_service] ChromaDB query completed")
    
    if not results or not results['documents'][0]:
        return [] if not return_metadata else []
    
    # Process results
    candidates = []
    for i, doc in enumerate(results['documents'][0]):
        candidate = {
            'metadata': results['metadatas'][0][i],
            'document': doc
        }
        candidates.append(candidate)
    
    # Step B: Cross-Encoder scoring
    print(f"[chroma_service] Running cross-encoder on {len(candidates)} candidates...")
    pairs = [(query, c['document']) for c in candidates]
    scores = await run_in_threadpool(cross_encoder.predict, pairs)
    print(f"[chroma_service] Cross-encoder scoring completed")
    
    # Step C: Sort by Cross-Encoder score (descending)
    candidates_with_scores = [
        (c, s) for c, s in zip(candidates, scores)
    ]
    candidates_with_scores.sort(key=lambda x: x[1], reverse=True)
    
    # Step D: Select top_k
    top_matches = [c for c, _ in candidates_with_scores[:top_k]]
    print(f"[chroma_service] Query completed. Returning {len(top_matches)} top matches")
    
    if return_metadata:
        return top_matches
    return [match['document'] for match in top_matches]


def clear_collection():
    """
    Clear all documents from the ChromaDB collection.
    
    This deletes all stored embeddings and documents but keeps the collection.
    Useful for resetting the database without deleting the entire chroma_db directory.
    
    Returns:
        dict with success status and count of deleted items
    """
    if not CHROMA_AVAILABLE or client is None or collection is None:
        raise ImportError("ChromaDB is not available")
    
    try:
        # Get count before deletion
        count_result = collection.get()
        item_count = len(count_result['ids']) if count_result and 'ids' in count_result else 0
        
        if item_count == 0:
            print("[chroma_service] Collection is already empty")
            return {"success": True, "deleted_count": 0, "message": "Collection was already empty"}
        
        # Delete all items from collection
        # Get all IDs first
        all_ids = collection.get()['ids']
        
        if all_ids:
            collection.delete(ids=all_ids)
            print(f"[chroma_service] Cleared {len(all_ids)} items from collection")
        
        return {
            "success": True,
            "deleted_count": len(all_ids) if all_ids else 0,
            "message": f"Successfully cleared {len(all_ids) if all_ids else 0} items from ChromaDB"
        }
    except Exception as e:
        print(f"[chroma_service] Error clearing collection: {e}")
        raise Exception(f"Failed to clear ChromaDB collection: {str(e)}")


def delete_collection():
    """
    Delete the entire ChromaDB collection.
    
    This completely removes the collection. It will be recreated on next use.
    
    Returns:
        dict with success status
    """
    if not CHROMA_AVAILABLE or client is None:
        raise ImportError("ChromaDB is not available")
    
    try:
        global collection
        # Delete the collection
        client.delete_collection(name=COLLECTION_NAME)
        collection = None
        print(f"[chroma_service] Deleted collection '{COLLECTION_NAME}'")
        
        # Recreate empty collection
        collection = client.get_or_create_collection(name=COLLECTION_NAME)
        print(f"[chroma_service] Recreated empty collection '{COLLECTION_NAME}'")
        
        return {
            "success": True,
            "message": f"Successfully deleted and recreated collection '{COLLECTION_NAME}'"
        }
    except Exception as e:
        print(f"[chroma_service] Error deleting collection: {e}")
        raise Exception(f"Failed to delete ChromaDB collection: {str(e)}")
