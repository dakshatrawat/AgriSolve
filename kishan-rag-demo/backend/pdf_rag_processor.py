"""
PDF RAG Processor
-----------------
Scrapes websites, downloads PDFs to tempfile, extracts text (skipping image-only pages),
chunks the content, and prepares it for RAG vector database ingestion.

This extracts BOTH webpage text content AND PDF documents from the URL.
"""
import os
import sys
import requests
import tempfile
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime
import fitz  # PyMuPDF
from typing import List, Dict, Optional, Tuple


class PDFRAGProcessor:
    """Process webpages and PDFs for RAG: extract text, chunk, and prepare for ingestion"""
    
    def __init__(self, min_text_length: int = 100):
        """
        Initialize processor
        
        Args:
            min_text_length: Minimum text length to consider a PDF page as text-based (not just images)
        """
        self.min_text_length = min_text_length
        
    def scrape_website(self, url: str) -> Tuple[str, BeautifulSoup]:
        """
        Scrape website and return soup object
        
        Args:
            url: Website URL to scrape
            
        Returns:
            Tuple of (resolved_url, soup_object)
        """
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        return url, BeautifulSoup(response.content, 'html.parser')
    
    def extract_webpage_text(self, soup: BeautifulSoup) -> str:
        """
        Extract text content from webpage (excluding scripts and styles)
        
        Args:
            soup: BeautifulSoup object of the page
            
        Returns:
            Extracted text content
        """
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Get text
        text = soup.get_text(separator=' ', strip=True)
        return text
    
    def find_pdf_links(self, base_url: str, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """
        Find all PDF links on the page
        
        Args:
            base_url: Base URL for resolving relative links
            soup: BeautifulSoup object of the page
            
        Returns:
            List of dictionaries with 'url' and 'filename' keys
        """
        pdf_links = []
        links = soup.find_all('a', href=True)
        
        for link in links:
            href = link.get('href', '')
            
            if href.lower().endswith('.pdf'):
                pdf_url = urljoin(base_url, href)
                filename = os.path.basename(urlparse(pdf_url).path) or f"document_{len(pdf_links)}.pdf"
                
                pdf_links.append({
                    'url': pdf_url,
                    'filename': filename
                })
        
        return pdf_links
    
    def download_pdf(self, url: str) -> Optional[str]:
        """
        Download PDF to temporary file
        
        Args:
            url: PDF URL to download
            
        Returns:
            Path to temporary file, or None if download failed
        """
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response.content)
            temp_file.close()
            
            return temp_file.name
            
        except Exception as e:
            print(f"❌ Failed to download {url}: {e}")
            return None
    
    def is_page_text_based(self, page) -> bool:
        """
        Check if a PDF page contains extractable text (not just images)
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            True if page has sufficient text content, False if it's image-only
        """
        text = page.get_text("text").strip()
        return len(text) >= self.min_text_length
    
    def extract_text_from_pdf(self, pdf_path: str, skip_image_pages: bool = True) -> Dict:
        """
        Extract text from PDF, optionally skipping image-only pages
        
        Args:
            pdf_path: Path to PDF file
            skip_image_pages: If True, skip pages that are primarily images
            
        Returns:
            Dictionary with extracted text and metadata
        """
        result = {
            'text': '',
            'total_pages': 0,
            'text_pages': 0,
            'skipped_pages': 0,
            'page_texts': []  # List of (page_num, text) tuples
        }
        
        try:
            doc = fitz.open(pdf_path)
            result['total_pages'] = len(doc)
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Check if page is text-based
                if skip_image_pages and not self.is_page_text_based(page):
                    result['skipped_pages'] += 1
                    print(f"  ⏭️  Skipping page {page_num + 1} (image-only)")
                    continue
                
                # Extract text
                text = page.get_text("text")
                if text and text.strip():
                    result['text'] += text + "\n\n"
                    result['text_pages'] += 1
                    result['page_texts'].append((page_num + 1, text))
            
            doc.close()
            
        except Exception as e:
            print(f"❌ Error extracting text from PDF: {e}")
        
        return result
    
    def process_pdf_from_url(self, pdf_url: str, filename: str, skip_image_pages: bool = True) -> Dict:
        """
        Download PDF from URL and extract text
        
        Args:
            pdf_url: URL of PDF to download
            filename: Name of the PDF file
            skip_image_pages: If True, skip image-only pages
            
        Returns:
            Dictionary with extracted text and metadata
        """
        print(f"\n📄 Processing: {filename}")
        print(f"   URL: {pdf_url}")
        
        # Download to temp file
        temp_path = self.download_pdf(pdf_url)
        if not temp_path:
            return {
                'success': False,
                'filename': filename,
                'url': pdf_url,
                'error': 'Download failed',
                'source_type': 'pdf'
            }
        
        try:
            # Extract text
            extraction_result = self.extract_text_from_pdf(temp_path, skip_image_pages)
            
            print(f"   📊 Pages: {extraction_result['total_pages']} total, "
                  f"{extraction_result['text_pages']} with text, "
                  f"{extraction_result['skipped_pages']} skipped")
            print(f"   📝 Extracted: {len(extraction_result['text'])} characters")
            
            return {
                'success': True,
                'filename': filename,
                'url': pdf_url,
                'text': extraction_result['text'],
                'total_pages': extraction_result['total_pages'],
                'text_pages': extraction_result['text_pages'],
                'skipped_pages': extraction_result['skipped_pages'],
                'page_texts': extraction_result['page_texts'],
                'source_type': 'pdf'
            }
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    def process_website(self, url: str, skip_image_pages: bool = True, 
                       extract_webpage_content: bool = True) -> Dict:
        """
        Scrape website, extract webpage content, and process all PDFs found
        
        Args:
            url: Website URL to scrape
            skip_image_pages: If True, skip image-only pages in PDFs
            extract_webpage_content: If True, also extract text from the webpage itself
            
        Returns:
            Dictionary with webpage content and list of processed PDF results
        """
        print(f"\n🔍 Scraping website: {url}")
        
        try:
            # Scrape website
            resolved_url, soup = self.scrape_website(url)
            
            # Extract webpage content
            webpage_text = ""
            if extract_webpage_content:
                webpage_text = self.extract_webpage_text(soup)
                print(f"   📄 Extracted {len(webpage_text)} characters from webpage")
            
            # Find PDF links
            pdf_links = self.find_pdf_links(resolved_url, soup)
            print(f"   Found {len(pdf_links)} PDF(s)")
            
            # Process each PDF
            pdf_results = []
            for pdf_info in pdf_links:
                result = self.process_pdf_from_url(
                    pdf_info['url'],
                    pdf_info['filename'],
                    skip_image_pages
                )
                pdf_results.append(result)
            
            return {
                'success': True,
                'url': resolved_url,
                'webpage_text': webpage_text,
                'webpage_text_length': len(webpage_text),
                'pdfs_found': len(pdf_links),
                'pdf_results': pdf_results
            }
            
        except Exception as e:
            print(f"❌ Error processing website: {e}")
            return {
                'success': False,
                'url': url,
                'error': str(e)
            }


def chunk_text_for_rag(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> List[str]:
    """
    Chunk text for RAG ingestion
    
    Args:
        text: Text to chunk
        chunk_size: Size of each chunk
        chunk_overlap: Overlap between chunks
        
    Returns:
        List of text chunks
    """
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        
        if chunk.strip():
            chunks.append(chunk)
        
        start += (chunk_size - chunk_overlap)
    
    return chunks
