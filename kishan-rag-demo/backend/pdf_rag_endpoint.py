"""
PDF RAG Ingestion Endpoint
---------------------------
FastAPI endpoint for scraping websites, extracting webpage content,
downloading PDFs, and ingesting ALL content into vector database.

Extracts BOTH webpage text AND PDF documents from the URL.
Each chunk includes metadata about its source (webpage URL or PDF URL).

============================================================================
KEY PIPELINE POINTS (README Reference):
============================================================================
[POINT 1] WEB SCRAPING - Orchestrates PDFRAGProcessor.process_website()
[POINT 2] CONTENT CHUNKING - upsert_document() uses RecursiveCharacterTextSplitter
[POINT 3] PDF SCRAPING - Downloads and processes PDFs from discovered links
[POINT 4] METADATA STORAGE - source, source_type, doc_name, page_url stored
============================================================================

Add to backend/app.py:
    from pdf_rag_endpoint import router as pdf_rag_router
    app.include_router(pdf_rag_router)
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from pdf_rag_processor import PDFRAGProcessor, chunk_text_for_rag

# Import backend services
import flags
if flags.USE_PINECONE:
    from pinecone_service import upsert_document
elif flags.USE_CHROMADB:
    from chroma_service import upsert_document
else:
    async def upsert_document(*args, **kwargs):
        raise Exception("No vector database configured")

router = APIRouter(prefix="/api/pdf-rag", tags=["PDF RAG"])


class WebsiteScrapeRequest(BaseModel):
    url: str
    skip_image_pages: bool = True
    extract_webpage_content: bool = True
    min_text_length: int = 100


class PDFIngestResponse(BaseModel):
    success: bool
    message: str
    webpage_chunks: int
    pdf_results: List[dict]
    total_pdfs_processed: int
    total_chunks_ingested: int


@router.post("/scrape-and-ingest", response_model=PDFIngestResponse)
async def scrape_and_ingest_all_content(request: WebsiteScrapeRequest):
    """
    Scrape website for content and PDFs, extract text (skip image pages),
    chunk the content, and ingest into vector database for RAG.
    
    Extracts BOTH:
    - Webpage text content (with source URL metadata)
    - PDF documents (with PDF URL metadata)
    
    Args:
        url: Website URL to scrape
        skip_image_pages: Skip PDF pages that are primarily images (default: True)
        extract_webpage_content: Extract text from the webpage itself (default: True)
        min_text_length: Minimum text length for PDF page detection (default: 100)
    
    Returns:
        JSON with processing results and ingestion status
    """
    try:
        print(f"\n{'='*80}")
        print(f"[PDF RAG] === STARTING SCRAPE AND INGEST ===")
        print(f"[PDF RAG] URL: {request.url}")
        print(f"[PDF RAG] Config: skip_image_pages={request.skip_image_pages}, extract_webpage={request.extract_webpage_content}")
        print(f"[PDF RAG] Vector DB: {'Pinecone' if flags.USE_PINECONE else 'ChromaDB'}")
        print(f"{'='*80}\n")
        
        # Initialize processor
        processor = PDFRAGProcessor(min_text_length=request.min_text_length)
        
        # Process website - extract webpage content AND PDFs
        print(f"[PDF RAG] 📥 Step 1: Processing website...")
        result = processor.process_website(
            request.url, 
            request.skip_image_pages,
            request.extract_webpage_content
        )
        
        if not result['success']:
            return PDFIngestResponse(
                success=False,
                message=result.get('error', 'Processing failed'),
                webpage_chunks=0,
                pdf_results=[],
                total_pdfs_processed=0,
                total_chunks_ingested=0
            )
        
        total_chunks = 0
        webpage_chunks = 0
        ingestion_results = []
        
        # 1. Ingest webpage content first (if extracted)
        if request.extract_webpage_content and result.get('webpage_text'):
            try:
                print(f"\n[PDF RAG] 📄 Step 2: Ingesting WEBPAGE content...")
                print(f"[PDF RAG] Webpage URL: {result['url']}")
                print(f"[PDF RAG] Webpage text length: {len(result['webpage_text'])} characters")
                
                # Prepare metadata for webpage content
                webpage_metadata = {
                    "source": result['url'],
                    "source_type": "webpage",
                    "content_type": "webpage_text"
                }
                print(f"[PDF RAG] Webpage metadata: {webpage_metadata}")
                
                # Ingest to vector database
                print(f"[PDF RAG] Calling upsert_document for webpage...")
                num_chunks = await upsert_document(
                    result['webpage_text'],
                    metadata=webpage_metadata
                )
                
                webpage_chunks = num_chunks
                total_chunks += num_chunks
                
                print(f"[PDF RAG] ✅ Successfully ingested {num_chunks} webpage chunks to Pinecone")
                print(f"[PDF RAG] Total chunks so far: {total_chunks}\n")
                
            except Exception as e:
                import traceback
                print(f"[PDF RAG] ❌ Error ingesting webpage content: {e}")
                traceback.print_exc()
        
        # 2. Ingest each PDF
        print(f"\n[PDF RAG] 📚 Step 3: Processing {len(result.get('pdf_results', []))} PDFs...\n")
        for idx, pdf_result in enumerate(result.get('pdf_results', []), 1):
            if pdf_result['success'] and pdf_result.get('text'):
                try:
                    print(f"[PDF RAG] --- PDF {idx}/{len(result.get('pdf_results', []))} ---")
                    print(f"[PDF RAG] 📄 Ingesting: {pdf_result['filename']}")
                    print(f"[PDF RAG] PDF URL: {pdf_result['url']}")
                    print(f"[PDF RAG] PDF stats: {pdf_result['text_pages']}/{pdf_result['total_pages']} text pages, {len(pdf_result['text'])} chars")
                    
                    # Prepare metadata for PDF content
                    pdf_metadata = {
                        "source": pdf_result['url'],  # PDF URL
                        "source_type": "pdf",
                        "doc_name": pdf_result['filename'],
                        "page_url": result['url'],  # Original webpage URL
                        "total_pages": pdf_result['total_pages'],
                        "text_pages": pdf_result['text_pages']
                    }
                    print(f"[PDF RAG] PDF metadata: {pdf_metadata}")
                    
                    # Ingest to vector database
                    print(f"[PDF RAG] Calling upsert_document for PDF...")
                    num_chunks = await upsert_document(
                        pdf_result['text'],
                        metadata=pdf_metadata
                    )
                    
                    total_chunks += num_chunks
                    
                    ingestion_results.append({
                        'filename': pdf_result['filename'],
                        'pdf_url': pdf_result['url'],
                        'page_url': result['url'],
                        'success': True,
                        'total_pages': pdf_result['total_pages'],
                        'text_pages': pdf_result['text_pages'],
                        'skipped_pages': pdf_result['skipped_pages'],
                        'chunks_ingested': num_chunks,
                        'text_length': len(pdf_result['text'])
                    })
                    
                    print(f"[PDF RAG] ✅ Successfully ingested {num_chunks} PDF chunks to Pinecone")
                    print(f"[PDF RAG] Total chunks so far: {total_chunks}\n")
                    
                except Exception as e:
                    import traceback
                    print(f"[PDF RAG] ❌ Error ingesting {pdf_result['filename']}: {e}")
                    traceback.print_exc()
                    ingestion_results.append({
                        'filename': pdf_result['filename'],
                        'pdf_url': pdf_result['url'],
                        'page_url': result['url'],
                        'success': False,
                        'error': str(e)
                    })
            elif pdf_result.get('success'):
                # PDF processed but no text extracted (all image pages)
                ingestion_results.append({
                    'filename': pdf_result.get('filename', 'Unknown'),
                    'pdf_url': pdf_result.get('url', ''),
                    'page_url': result['url'],
                    'success': False,
                    'error': 'No text extracted (all pages are images)'
                })
            else:
                # PDF processing failed
                ingestion_results.append({
                    'filename': pdf_result.get('filename', 'Unknown'),
                    'pdf_url': pdf_result.get('url', ''),
                    'page_url': result['url'],
                    'success': False,
                    'error': pdf_result.get('error', 'Processing failed')
                })
        
        storage_info = "Pinecone" if flags.USE_PINECONE else "ChromaDB"
        
        message_parts = []
        if webpage_chunks > 0:
            message_parts.append(f"webpage ({webpage_chunks} chunks)")
        if len(ingestion_results) > 0:
            successful_pdfs = sum(1 for r in ingestion_results if r.get('success'))
            message_parts.append(f"{successful_pdfs} PDFs")
        
        message = f"Ingested {' and '.join(message_parts) if message_parts else 'content'} - {total_chunks} total chunks to {storage_info}"
        
        print(f"\n{'='*80}")
        print(f"[PDF RAG] === INGESTION SUMMARY ===")
        print(f"[PDF RAG] ✅ Total chunks ingested to Pinecone: {total_chunks}")
        print(f"[PDF RAG] 📄 Webpage chunks: {webpage_chunks}")
        print(f"[PDF RAG] 📚 PDF chunks: {total_chunks - webpage_chunks}")
        print(f"[PDF RAG] 📊 PDFs processed: {len(ingestion_results)}/{len(result.get('pdf_results', []))}")
        print(f"[PDF RAG] 🎯 Message: {message}")
        print(f"{'='*80}\n")
        
        return PDFIngestResponse(
            success=True,
            message=message,
            webpage_chunks=webpage_chunks,
            pdf_results=ingestion_results,
            total_pdfs_processed=len(result.get('pdf_results', [])),
            total_chunks_ingested=total_chunks
        )
        
    except Exception as e:
        import traceback
        print(f"[PDF RAG] Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process-url")
async def process_single_pdf_url(url: str):
    """
    Process a single PDF URL directly (not from web scraping)
    
    Args:
        url: Direct URL to PDF file
    
    Returns:
        JSON with processing and ingestion status
    """
    try:
        processor = PDFRAGProcessor()
        
        # Get filename from URL
        from urllib.parse import urlparse
        import os
        filename = os.path.basename(urlparse(url).path) or "document.pdf"
        
        # Process PDF
        print(f"\n[PDF RAG] Processing single PDF: {url}")
        result = processor.process_pdf_from_url(url, filename, skip_image_pages=True)
        
        if not result['success'] or not result.get('text'):
            return JSONResponse(
                status_code=400,
                content={
                    'success': False,
                    'error': result.get('error', 'No text extracted')
                }
            )
        
        # Ingest to vector database with proper metadata
        metadata = {
            "source": result['url'],  # PDF URL as source
            "source_type": "pdf",
            "doc_name": result['filename'],
            "total_pages": result['total_pages'],
            "text_pages": result['text_pages']
        }
        
        num_chunks = await upsert_document(result['text'], metadata=metadata)
        
        storage_info = "Pinecone" if flags.USE_PINECONE else "ChromaDB"
        
        return {
            'success': True,
            'message': f"Processed PDF and ingested {num_chunks} chunks to {storage_info}",
            'filename': result['filename'],
            'pdf_url': result['url'],
            'source': result['url'],
            'total_pages': result['total_pages'],
            'text_pages': result['text_pages'],
            'skipped_pages': result['skipped_pages'],
            'chunks_ingested': num_chunks
        }
        
    except Exception as e:
        import traceback
        print(f"[PDF RAG] Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def rag_status():
    """
    Check RAG system status
    
    Returns:
        Status information about vector database and configuration
    """
    vector_db = "Pinecone" if flags.USE_PINECONE else "ChromaDB" if flags.USE_CHROMADB else "None"
    
    return {
        'status': 'operational',
        'vector_database': vector_db,
        'features': {
            'webpage_extraction': True,
            'pdf_extraction': True,
            'image_page_detection': True,
            'source_tracking': True
        },
        'endpoints': {
            '/api/pdf-rag/scrape-and-ingest': 'Scrape website and ingest webpage + PDFs',
            '/api/pdf-rag/process-url': 'Process single PDF URL',
            '/api/pdf-rag/status': 'Check system status'
        },
        'metadata_tracking': {
            'webpage': 'source (webpage URL), source_type (webpage)',
            'pdf': 'source (PDF URL), source_type (pdf), page_url (original webpage), doc_name'
        }
    }
