"""
Quick Integration Instructions
-------------------------------
Add these lines to backend/app.py to enable PDF RAG endpoints

This system extracts BOTH webpage content AND PDF documents from URLs.
Each chunk tracks its source (webpage URL or PDF URL) for proper attribution.
"""

# ============================================================================
# STEP 1: Add this import near the top of backend/app.py
# ============================================================================
# Add after other imports, around line 20-30

from pdf_rag_endpoint import router as pdf_rag_router


# ============================================================================
# STEP 2: Add this line after app = FastAPI()
# ============================================================================
# Add after app.add_middleware(...) block, around line 85-90

app.include_router(pdf_rag_router)


# ============================================================================
# That's it! The new endpoints will be available:
# ============================================================================
# POST /api/pdf-rag/scrape-and-ingest  - Scrape webpage + PDFs, ingest all
# POST /api/pdf-rag/process-url        - Process single PDF URL  
# GET  /api/pdf-rag/status             - Check system status

# ============================================================================
# What Gets Extracted:
# ============================================================================
# 1. Webpage text content (excluding scripts, styles, nav, footer)
#    - Metadata: source = webpage URL, source_type = "webpage"
#
# 2. All PDF documents linked on the page
#    - Metadata: source = PDF URL, source_type = "pdf", page_url = webpage URL
#    - Skips image-only PDF pages automatically
#
# Each chunk knows its source for proper attribution in RAG responses!

# ============================================================================
# Test the endpoints:
# ============================================================================

"""
# Start backend
cd backend
python main.py

# In another terminal:

# Test 1: Check status
curl http://localhost:8000/api/pdf-rag/status

# Test 2: Scrape website (extracts webpage + PDFs)
curl -X POST http://localhost:8000/api/pdf-rag/scrape-and-ingest \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com", 
    "skip_image_pages": true,
    "extract_webpage_content": true
  }'

# Test 3: Process single PDF
curl -X POST "http://localhost:8000/api/pdf-rag/process-url?url=https://example.com/doc.pdf"
"""

# ============================================================================
# Metadata Tracking:
# ============================================================================
"""
Webpage chunks:
{
  "source": "https://example.com",
  "source_type": "webpage",
  "content_type": "webpage_text"
}

PDF chunks:
{
  "source": "https://example.com/document.pdf",  # PDF URL
  "source_type": "pdf",
  "doc_name": "document.pdf",
  "page_url": "https://example.com",  # Original webpage
  "total_pages": 20,
  "text_pages": 18
}

This allows RAG system to cite proper sources:
- "Found in webpage: https://example.com"
- "Found in PDF: document.pdf (https://example.com/document.pdf)"
"""
