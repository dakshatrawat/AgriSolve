# AgriSolve RAG System

A multilingual Retrieval-Augmented Generation (RAG) system for agricultural information, featuring web scraping, PDF processing, vector search with reranking, and LLM-powered responses.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Pipeline Breakdown](#pipeline-breakdown)
3. [File Structure](#file-structure)
4. [Models Used](#models-used)
5. [Setup & Configuration](#setup--configuration)
6. [API Endpoints](#api-endpoints)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AgriSolve RAG Pipeline                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │ Web Scraping│───▶│ PDF Download │───▶│  Chunking   │───▶│  Embedding  │  │
│  │   [1,3]     │    │     [3]      │    │    [2]      │    │   & Store   │  │
│  └─────────────┘    └──────────────┘    └─────────────┘    │    [4]      │  │
│                                                             └──────┬──────┘  │
│                                                                    │         │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────▼──────┐  │
│  │ LLM Response│◀───│  Reranking   │◀───│  Retrieve   │◀───│Vector Search│  │
│  │    [10]     │    │     [9]      │    │ Top 15 [8]  │    │    [7]      │  │
│  └─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘  │
│                                                                              │
│                      ┌──────────────┐                                        │
│                      │Query Process │                                        │
│                      │   [5] [6]    │                                        │
│                      └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Breakdown

### [POINT 1] Web Scraping from Given Link
**File:** `backend/pdf_rag_processor.py`

Web scraping functionality that fetches webpage content using HTTP requests and parses HTML using BeautifulSoup.

**Key Implementation:**
- `scrape_website()` method fetches webpage content
- Uses `requests` library with custom User-Agent headers
- BeautifulSoup(webscraping library) parses HTML for text and link extraction
- Handles both HTTP and HTTPS URLs

```python
# Location: pdf_rag_processor.py → PDFRAGProcessor.scrape_website()
def scrape_website(self, url: str) -> Tuple[str, BeautifulSoup]:
    # Fetches URL using requests library
    # Returns parsed BeautifulSoup object for further processing
```

---

### [POINT 2] Breaking Website Content into Chunks with Link
**Files:** `backend/pdf_rag_processor.py`, `backend/chroma_service.py`, `backend/pinecone_service.py`

Content is split into manageable chunks for vector storage and retrieval.

**Key Implementation:**
- **Chunk Size:** 500 characters
- **Chunk Overlap:** 50 characters (ensures context continuity)
- Uses `RecursiveCharacterTextSplitter` from LangChain
- Each chunk retains source URL in metadata

```python
# Location: pdf_rag_processor.py → chunk_text_for_rag()
def chunk_text_for_rag(text: str, chunk_size: int = 500, chunk_overlap: int = 50):
    # Splits text into overlapping chunks
    # Returns list of text chunks ready for embedding

# Location: chroma_service.py / pinecone_service.py
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)
```

---

### [POINT 3] Scraping PDF from Web Page with PDF Link and Chunking
**Files:** `backend/pdf_rag_processor.py`, `backend/pdf_rag_endpoint.py`

Discovers PDF links on webpages, downloads them, extracts text, and prepares for ingestion.

**Key Implementation:**
- `find_pdf_links()` scans anchor tags for `.pdf` extensions
- `download_pdf()` fetches PDF to temporary file
- `extract_text_from_pdf()` uses PyMuPDF (fitz) for text extraction
- Skips image-only pages (configurable threshold: 100 chars minimum)

```python
# Location: pdf_rag_processor.py → PDFRAGProcessor
def find_pdf_links(self, base_url: str, soup: BeautifulSoup):
    # Scans all anchor tags for .pdf href attributes
    # Resolves relative URLs to absolute PDF links

def download_pdf(self, url: str):
    # Downloads PDF to tempfile for processing
    # Returns path to temporary file

def extract_text_from_pdf(self, pdf_path: str, skip_image_pages: bool = True):
    # Uses PyMuPDF to extract text from each page
    # Skips pages with less than min_text_length characters (image-only)
```

---

### [POINT 4] Getting Everything into Metadata
**Files:** `backend/chroma_service.py`, `backend/pinecone_service.py`, `backend/pdf_rag_endpoint.py`

All content is stored with comprehensive metadata for source tracking and retrieval.

**Metadata Fields Stored:**
| Field | Description | Source |
|-------|-------------|--------|
| `source` | Original URL (webpage or PDF) | All content |
| `source_type` | "webpage" or "pdf" | All content |
| `doc_name` | PDF filename | PDFs only |
| `page_url` | Original webpage URL | PDFs only |
| `total_pages` | Total pages in PDF | PDFs only |
| `text_pages` | Pages with extractable text | PDFs only |
| `chunk_index` | Chunk position in document | All content |
| `text` | Actual chunk content | All content |

```python
# Location: pdf_rag_endpoint.py → scrape_and_ingest_all_content()
webpage_metadata = {
    "source": result['url'],
    "source_type": "webpage",
    "content_type": "webpage_text"
}

pdf_metadata = {
    "source": pdf_result['url'],      # PDF URL
    "source_type": "pdf",
    "doc_name": pdf_result['filename'],
    "page_url": result['url'],         # Original webpage
    "total_pages": pdf_result['total_pages'],
    "text_pages": pdf_result['text_pages']
}
```

---

### [POINT 5] Processing Query (Models Used)
**Files:** `backend/app.py`, `backend/language_service.py`, `backend/audio_service.py`

User queries undergo normalization before processing, supporting multilingual input including voice.

**Query Processing Flow:**
1. **Voice Input** → Whisper transcription (audio_service.py)
2. **Hinglish/Native Script** → Normalized to English (language_service.py)
3. **English Query** → Used for vector search

**Models Used:**
| Purpose | Model | File |
|---------|-------|------|
| Voice Transcription | `openai/whisper-small` | audio_service.py |
| Query Normalization | Gemini models (API) | language_service.py |

```python
# Location: app.py → chat_endpoint()
question_for_processing = await process_user_input(request.question, user_language)

# Location: language_service.py → process_user_input()
async def process_user_input(user_input: str, user_language: str) -> str:
    return await normalize_to_english(user_input, user_language)
```

---

### [POINT 6] Breaking Query into Chunks
**Files:** `backend/chroma_service.py`, `backend/pinecone_service.py`

Query is embedded as a single vector for similarity search against document chunks.

**Key Implementation:**
- Query is encoded using the same embedding model as documents
- Single vector representation (384 dimensions)
- No chunking needed for queries (typically short)

```python
# Location: chroma_service.py / pinecone_service.py → query_index()
query_emb = await run_in_threadpool(model.encode, [query])
query_emb = query_emb[0].tolist()
```

---

### [POINT 7] Checking Vector Database for Cosine Similarity (Hybrid Search)
**Files:** `backend/chroma_service.py`, `backend/pinecone_service.py`

Hybrid search combining semantic embedding similarity with cross-encoder reranking.

**Search Process:**
1. **Semantic Search (Bi-Encoder):** Fast initial retrieval via cosine similarity
2. **Cross-Encoder Reranking:** Deep semantic scoring of candidates

**Vector Database Options:**
| Database | Type | Use Case |
|----------|------|----------|
| ChromaDB | Local | Offline usage |
| Pinecone | Cloud | Production deployment |

```python
# Location: chroma_service.py → query_index()
# Step A: Cosine similarity search
results = collection.query(
    query_embeddings=[query_emb],
    n_results=candidate_k  # Retrieve 15 candidates
)

# Location: pinecone_service.py → query_index()
res = index.query(vector=query_emb, top_k=candidate_k, include_metadata=True)
```

---

### [POINT 8] Getting Top 15 Chunks
**Files:** `backend/chroma_service.py`, `backend/pinecone_service.py`

Retrieves a larger candidate pool for reranking to improve result quality.

**Key Implementation:**
- **Candidate Pool:** `top_k * 3` = 15 candidates (for top_k=5)
- **Purpose:** Provides more options for cross-encoder reranking
- **Index Type:** Cosine similarity metric

```python
# Location: chroma_service.py / pinecone_service.py → query_index()
# Step A: Retrieve larger candidate pool
candidate_k = top_k * 3  # 5 * 3 = 15 candidates
```

---

### [POINT 9] Reranking According to Best Similarity
**Files:** `backend/chroma_service.py`, `backend/pinecone_service.py`

Cross-encoder reranking provides deeper semantic understanding than bi-encoder similarity.

**Reranking Process:**
1. Take 15 candidates from initial retrieval
2. Score each (query, candidate) pair with cross-encoder
3. Sort by cross-encoder score (descending)
4. Return top_k best matches

**Model Used:** `cross-encoder/ms-marco-MiniLM-L-6-v2`

```python
# Location: chroma_service.py / pinecone_service.py → query_index()
# Step B: Cross-Encoder scoring
pairs = [(query, c['metadata']['text']) for c in candidates]
scores = await run_in_threadpool(cross_encoder.predict, pairs)

# Step C: Sort by Cross-Encoder score (descending)
candidates_with_scores.sort(key=lambda x: x[1], reverse=True)

# Step D: Select top_k
top_matches = [c for c, _ in candidates_with_scores[:top_k]]
```

---

### [POINT 10] Processing Top Chunk Using LLM
**Files:** `backend/app.py`, `backend/language_service.py`

Top retrieved chunks are used as context for LLM response generation.

**LLM Processing Modes:**

| Mode | Vector DB | LLM | Internet Required |
|------|-----------|-----|-------------------|
| Mode 1 | Pinecone | Gemini API | Yes |
| Mode 2 | ChromaDB | TinyLlama Local | No |

**Model Fallback Chain (Gemini):**
1. gemini-2.5-flash (primary)
2. gemini-2.5-flash-lite
3. gemini-3-flash
4. gemma-3-27b/12b/4b/2b/1b (fallback)
5. TinyLlama-1.1B-Chat (local fallback)

```python
# Location: app.py → chat_endpoint()
# Build prompt with retrieved context
prompt = (
    "You are AgriSolve, a helpful AI agricultural assistant. "
    "Based *only* on the context provided, answer the user's question. "
    f"--- CONTEXT ---\n{context}\n\n"
    f"--- QUESTION ---\n{question_for_processing}\n\n"
)

# Generate response
response = get_model_with_fallback(prompt, stream=True)
```

---

## File Structure

```
backend/
├── app.py                    # Main FastAPI app, chat endpoint [5,7,8,9,10]
├── pdf_rag_processor.py      # Web scraping, PDF extraction, chunking [1,2,3]
├── pdf_rag_endpoint.py       # Ingestion API endpoint [1,2,3,4]
├── chroma_service.py         # ChromaDB operations [4,7,8,9]
├── pinecone_service.py       # Pinecone operations [4,7,8,9]
├── language_service.py       # Translation & query normalization [5,10]
├── audio_service.py          # Whisper voice transcription [5]
├── flags.py                  # Feature flags (DB/LLM selection)
├── requirements.txt          # Python dependencies
└── models/                   # Local model files
    ├── all-MiniLM-L6-v2/     # Embedding model
    ├── ms-marco-MiniLM-L-6-v2/ # Cross-encoder
    ├── whisper-small/        # ASR model
    └── tinyllama-chat/       # Local LLM fallback
```

---

## Models Used

| Purpose | Model Name | Dimensions | Location |
|---------|------------|------------|----------|
| Embedding | all-MiniLM-L6-v2 | 384 | chroma_service.py, pinecone_service.py |
| Reranking | ms-marco-MiniLM-L-6-v2 | - | chroma_service.py, pinecone_service.py |
| Voice ASR | openai/whisper-small | - | audio_service.py |
| LLM (API) | gemini-2.5-flash | - | app.py, language_service.py |
| LLM (Local) | TinyLlama-1.1B-Chat | - | app.py |

---

## Setup & Configuration

### Environment Variables (.env)
```
GOOGLE_API_KEY=your_google_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=aws-us-east-1
PINECONE_INDEX_NAME=agrisolve
CHROMA_DB_PATH=./chroma_db
```

### Feature Flags (flags.py)
```python
# Mode 1: Cloud (requires internet)
USE_CHROMADB = False  
USE_PINECONE = True 
USE_LOCAL_MODEL = False  
USE_GEMINI_API = True 

# Mode 2: Offline (no internet)
USE_CHROMADB = True  
USE_PINECONE = False 
USE_LOCAL_MODEL = True  
USE_GEMINI_API = False 
```

### Running the Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

---

## API Endpoints

| Endpoint | Method | Description | File |
|----------|--------|-------------|------|
| `/api/chat` | POST | Multilingual RAG chat | app.py |
| `/api/upload` | POST | Upload PDF for ingestion | app.py |
| `/api/transcribe` | POST | Voice transcription | app.py |
| `/api/pdf-rag/scrape-and-ingest` | POST | Scrape & ingest from URL | pdf_rag_endpoint.py |
| `/api/pdf-rag/process-url` | POST | Process single PDF URL | pdf_rag_endpoint.py |
| `/api/pdf-rag/status` | GET | Check RAG system status | pdf_rag_endpoint.py |
| `/api/clear-chromadb` | DELETE | Clear ChromaDB collection | app.py |

---

## Key Features

- **Multilingual Support:** Hindi, Marathi, Bengali, Telugu, Tamil, and 15+ Indian languages
- **Voice Input:** Whisper-based speech recognition
- **Hinglish Support:** Handles phonetic input ("computer kya hai")
- **Hybrid Search:** Bi-encoder + Cross-encoder for high accuracy
- **Offline Mode:** ChromaDB + TinyLlama for no-internet usage
- **Source Tracking:** Every response includes source URLs
- **PDF Processing:** Automatic image-page detection and skipping

---

## License

This project is for educational and research purposes.
