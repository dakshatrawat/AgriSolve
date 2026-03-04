from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse, StreamingResponse
from dotenv import load_dotenv
import os
import sys
import fitz  # pymupdf
import tempfile

# Import feature flags from root directory
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.dirname(_backend_dir)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)
import flags
from language_service import get_model_with_fallback

# ============================================================================
# VECTOR DATABASE INITIALIZATION (Based on flags)
# ============================================================================
VECTOR_DB_AVAILABLE = False
VECTOR_DB_INITIALIZED = False
VECTOR_DB_ERROR = None
upsert_document = None
query_index = None

def _set_vector_db_unavailable(error_str: str):
    global VECTOR_DB_AVAILABLE, VECTOR_DB_ERROR, upsert_document, query_index
    VECTOR_DB_AVAILABLE = False
    VECTOR_DB_ERROR = error_str

    async def _upsert_unavailable(*args, **kwargs):
        if "Python 3.14" in error_str:
            raise Exception("ChromaDB is not compatible with Python 3.14. Please use Python 3.11 or 3.12.")
        raise Exception(error_str)

    async def _query_unavailable(*args, **kwargs):
        if "Python 3.14" in error_str:
            raise Exception("ChromaDB is not compatible with Python 3.14. Please use Python 3.11 or 3.12.")
        raise Exception(error_str)

    upsert_document = _upsert_unavailable
    query_index = _query_unavailable


def ensure_vector_db_initialized():
    """Lazy init vector DB to avoid slow startup blocking server port binding."""
    global VECTOR_DB_AVAILABLE, VECTOR_DB_INITIALIZED, upsert_document, query_index

    if VECTOR_DB_INITIALIZED:
        return

    print("[main] Initializing vector database providers...")

    if flags.USE_PINECONE:
        try:
            from pinecone_service import upsert_document as pinecone_upsert_document, query_index as pinecone_query_index
            upsert_document = pinecone_upsert_document
            query_index = pinecone_query_index
            VECTOR_DB_AVAILABLE = True
            print("[main] Using Pinecone for vector storage (cloud-based)")
        except Exception as e:
            error_str = f"Pinecone is not available: {e}"
            print(f"[main] ERROR: {error_str}")
            _set_vector_db_unavailable(error_str)

    elif flags.USE_CHROMADB:
        try:
            import chroma_service
            if chroma_service.CHROMA_AVAILABLE and chroma_service.client is not None and chroma_service.collection is not None:
                from chroma_service import upsert_document as chroma_upsert_document, query_index as chroma_query_index
                upsert_document = chroma_upsert_document
                query_index = chroma_query_index
                VECTOR_DB_AVAILABLE = True
                print("[main] Using ChromaDB for vector storage (local, persistent at ./chroma_db)")
            else:
                error_msg = getattr(chroma_service, 'chromadb_error', 'ChromaDB not properly initialized')
                raise ImportError(error_msg)
        except (ImportError, AttributeError) as e:
            error_str = str(e)
            print(f"[main] ERROR: ChromaDB not available: {error_str}")
            if "Python 3.14" in error_str:
                print("[main] ChromaDB requires Python 3.11 or 3.12. Current Python version is incompatible.")
                print("[main] Please use Python 3.11 or 3.12, or install chromadb: pip install chromadb")
            else:
                print("[main] Please install chromadb: pip install chromadb")
            _set_vector_db_unavailable(error_str)

    VECTOR_DB_INITIALIZED = True
from audio_service import transcribe_audio
import google.generativeai as genai
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "*"  # Allow all origins for production (Vercel deployment)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Lazy load local SLM for fallback
_local_tokenizer = None
_local_model = None
LOCAL_MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"  # Small 1.1B model
MODELS_DIR = "./models"
LOCAL_LLM_PATH = os.path.join(MODELS_DIR, "tinyllama-chat")
USE_LOCAL_LLM = os.path.exists(LOCAL_LLM_PATH)

def get_local_llm():
    """Lazy load local LLM for fallback when API quota exceeded"""
    global _local_tokenizer, _local_model
    if _local_tokenizer is None or _local_model is None:
        model_path = LOCAL_LLM_PATH if USE_LOCAL_LLM else LOCAL_MODEL_NAME
        print(f"[main] Loading local LLM from: {model_path}...")
        _local_tokenizer = AutoTokenizer.from_pretrained(model_path)
        _local_model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            device_map="auto"
        )
        print(f"[main] Local LLM loaded successfully")
    return _local_tokenizer, _local_model


async def translate_text(text: str, target_language: str) -> str:
    """
    Translate English text to target language using Google Gemini API.
    
    Args:
        text: English text to translate
        target_language: Target language code (hi, mr, en)
    
    Returns:
        Translated text (or original if target is English or translation fails)
    """
    # Skip translation if target is English or text is empty
    if target_language in [None, "en", "english"] or not text.strip():
        return text
    
    # Normalize language code
    lang_map = {
        "hi": "Hindi",
        "mr": "Marathi",
        "hindi": "Hindi",
        "marathi": "Marathi"
    }
    target_lang_name = lang_map.get(target_language.lower(), None)
    
    if not target_lang_name:
        print(f"[main] Unknown target language: {target_language}, skipping translation")
        return text
    
    try:
        if not GOOGLE_API_KEY:
            print(f"[main] No Google API key, skipping translation")
            return text
        
        # Use Gemini for translation with fallback
        translation_prompt = f"Translate the following English text to {target_lang_name}. Preserve markdown formatting, code blocks, and special characters. Only return the translated text, nothing else:\n\n{text}"
        
        response = get_model_with_fallback(translation_prompt, stream=False)
        translated = response.text.strip() if response.text else text
        
        print(f"[main] Translated response to {target_lang_name} ({len(translated)} chars)")
        return translated
        
    except Exception as e:
        print(f"[main] Translation failed: {e}, returning original text")
        return text  # Return original on translation failure


from typing import List, Optional

class Message(BaseModel):
    sender: str
    text: str
    sources: Optional[list] = None

class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Message]] = None
    language: Optional[str] = None  # Language code (en, hi, mr) for response translation


@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...), doc_url: str = Form(...)):
    ensure_vector_db_initialized()
    if not VECTOR_DB_AVAILABLE:
        if flags.USE_PINECONE:
            error_msg = VECTOR_DB_ERROR or "Pinecone is not available. Please check PINECONE_API_KEY, PINECONE_ENVIRONMENT, and PINECONE_INDEX_NAME in .env"
            return JSONResponse(status_code=503, content={"error": error_msg})
        else:
            error_msg = "ChromaDB is not available. "
            try:
                import chroma_service
                if hasattr(chroma_service, 'chromadb_error') and chroma_service.chromadb_error:
                    if "Python 3.14" in chroma_service.chromadb_error:
                        error_msg += "ChromaDB is not compatible with Python 3.14. Please use Python 3.11 or 3.12."
                    else:
                        error_msg += "Please install chromadb: pip install chromadb"
                else:
                    error_msg += "Please install chromadb: pip install chromadb"
            except:
                error_msg += "Please install chromadb: pip install chromadb"
            return JSONResponse(status_code=503, content={"error": error_msg})
    if not file.filename.lower().endswith('.pdf'):
        return JSONResponse(status_code=400, content={"error": "Only PDF files are supported."})

    try:
        # Save uploaded file to a temporary location for pymupdf
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        doc = fitz.open(tmp_path)
        total_chunks = 0
        batch_pages = 20
        num_pages = doc.page_count
        for start in range(0, num_pages, batch_pages):
            end = min(start + batch_pages, num_pages)
            print(f"Processing pages {start+1} to {end} of {num_pages}...")
            text = "\n".join(doc.load_page(i).get_text("text") or "" for i in range(start, end))
            if text.strip():
                print(f"Upserting batch for pages {start+1}-{end}...")
                num = await upsert_document(
                    text,
                    metadata={
                        "doc_name": file.filename,
                        "doc_url": doc_url
                    },
                    chunk_offset=total_chunks
                )
                total_chunks += num
                print(f"Batch upserted: {num} chunks (total so far: {total_chunks})")
        doc.close()
        os.remove(tmp_path)
        storage_info = "Pinecone" if flags.USE_PINECONE else "ChromaDB (stored locally in ./chroma_db)"
        return {"message": f"PDF uploaded and {total_chunks} chunks upserted to {storage_info}."}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.post("/api/transcribe")
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: str = Form(None)
):
    """
    Transcribe audio to text
    
    Args:
        audio: Audio file (wav, mp3, m4a, etc.)
        language: Optional language code (hi, en, mr) for forced language detection
    
    Returns:
        JSON with 'text' and 'language' fields
    """
    try:
        result = await transcribe_audio(audio, language)
        return JSONResponse(content={
            "text": result["text"],
            "language": result["language"],
            "success": True
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "success": False}
        )


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    ensure_vector_db_initialized()
    if not VECTOR_DB_AVAILABLE:
        if flags.USE_PINECONE:
            error_msg = VECTOR_DB_ERROR or "Pinecone is not available. Please check PINECONE_API_KEY, PINECONE_ENVIRONMENT, and PINECONE_INDEX_NAME in .env"
            return JSONResponse(status_code=503, content={"error": error_msg})
        else:
            error_msg = "ChromaDB is not available. "
            try:
                import chroma_service
                if hasattr(chroma_service, 'chromadb_error') and chroma_service.chromadb_error:
                    if "Python 3.14" in chroma_service.chromadb_error:
                        error_msg += "ChromaDB is not compatible with Python 3.14. Please use Python 3.11 or 3.12."
                    else:
                        error_msg += "Please install chromadb: pip install chromadb"
                else:
                    error_msg += "Please install chromadb: pip install chromadb"
            except:
                error_msg += "Please install chromadb: pip install chromadb"
            return JSONResponse(status_code=503, content={"error": error_msg})
    
    try:
        matches = await query_index(request.question, top_k=5, return_metadata=True)
        context = "\n".join([m["metadata"]["text"] for m in matches])

        # Format chat history for prompt
        history_str = ""
        if request.history:
            for msg in request.history:
                role = "User" if msg.sender == "user" else "Bot"
                history_str += f"{role}: {msg.text}\n"
        if history_str:
            history_str = f"--- CHAT HISTORY ---\n{history_str}\n"

        prompt = (
            "You are AgriSolve, a helpful AI agricultural assistant. "
            "Based *only* on the context provided, answer the user's question. "
            "Format your answer clearly using Markdown for readability. "
            "Use bullet points, bold text, and paragraphs where helpful. "
            "Add an extra blank line after each heading, list, or paragraph for clarity. "
            "Do not make up information. Keep the response size adequate for conversation along with markdown text and heading highlights and lists for visual seperation. "
            "If the user's message is a greeting, acknowledgment, or a very short/unclear query, reply concisely (1-2 sentences) and do not repeat the context or sources.\n\n"
            f"{history_str}"
            f"--- CONTEXT ---\n{context}\n\n"
            f"--- QUESTION ---\n{request.question}\n\n"
            "--- ANSWER (in Markdown) ---"
        )
        sources = [m["metadata"] for m in matches]
        
        # ====================================================================
        # MODE 1: PINECONE + GEMINI API (Fast, Streaming - like backendinitial)
        # ====================================================================
        if flags.USE_PINECONE and flags.USE_GEMINI_API:
            if not GOOGLE_API_KEY:
                def fallback_stream():
                    yield "[LLM not configured] Retrieved context: " + context
                    yield "\n[[SOURCES]]" + JSONResponse(content={"sources": sources}).body.decode()
                return StreamingResponse(fallback_stream(), media_type="text/plain")

            # Check if translation is needed
            needs_translation = request.language and request.language.lower() not in ["en", "english", None]
            
            if needs_translation:
                # For translation, we need to get full response first, then translate
                response = get_model_with_fallback(prompt, stream=False)
                full_response = response.text if response.text else "[No response generated]"
                translated_response = await translate_text(full_response, request.language)
                
                def stream_generator():
                    yield translated_response
                    yield "\n[[SOURCES]]" + JSONResponse(content={"sources": sources}).body.decode()
                return StreamingResponse(stream_generator(), media_type="text/plain")
            else:
                # No translation needed - use streaming for fast response (like backendinitial)
                def stream_generator():
                    response_stream = get_model_with_fallback(prompt, stream=True)
                    for chunk in response_stream:
                        if chunk.text:
                            yield chunk.text
                    # At the end, send a marker and the sources as JSON
                    yield "\n[[SOURCES]]" + JSONResponse(content={"sources": sources}).body.decode()
                return StreamingResponse(stream_generator(), media_type="text/plain")
        
        # ====================================================================
        # MODE 2: CHROMADB + LOCAL MODEL (Offline - No Internet Required)
        # ====================================================================
        elif flags.USE_CHROMADB and flags.USE_LOCAL_MODEL:
            # Use local LLM directly (no API calls, fully offline)
            from fastapi.concurrency import run_in_threadpool
            import asyncio
            
            tokenizer, model = get_local_llm()
            
            # Format prompt for TinyLlama chat format
            chat_prompt = f"<|system|>\n{prompt}</s>\n<|user|>\n{request.question}</s>\n<|assistant|>\n"
            
            inputs = tokenizer(chat_prompt, return_tensors="pt", truncation=True, max_length=1024).to(model.device)
            input_length = inputs.input_ids.shape[1]
            
            def _generate():
                import torch
                with torch.no_grad():
                    outputs = model.generate(
                        inputs.input_ids,
                        attention_mask=inputs.attention_mask if hasattr(inputs, 'attention_mask') else None,
                        max_new_tokens=128,
                        min_new_tokens=5,
                        temperature=0.7,
                        do_sample=True,
                        top_p=0.9,
                        top_k=50,
                        repetition_penalty=1.1,
                        pad_token_id=tokenizer.pad_token_id if tokenizer.pad_token_id is not None else tokenizer.eos_token_id,
                        eos_token_id=tokenizer.eos_token_id,
                        use_cache=True
                    )
                    new_tokens = outputs[0][input_length:]
                    return tokenizer.decode(new_tokens, skip_special_tokens=True)
            
            try:
                response_text = await asyncio.wait_for(
                    run_in_threadpool(_generate),
                    timeout=120.0
                )
            except asyncio.TimeoutError:
                response_text = "I apologize, but the response is taking longer than expected. Please try again with a shorter question."
            
            if "<|assistant|>" in response_text:
                response_text = response_text.split("<|assistant|>")[-1].strip()
            
            response_text = response_text.replace("<|system|>", "").replace("<|user|>", "").replace("</s>", "").strip()
            
            if not response_text or len(response_text) < 5:
                response_text = "I understand your question, but I'm having trouble generating a detailed response. Could you please rephrase your question?"
            
            # Note: Translation requires internet (Gemini API), so skip it in offline mode
            # If translation is needed, user should use Pinecone + Gemini API mode instead
            
            def stream_generator():
                yield response_text
                yield "\n[[SOURCES]]" + JSONResponse(content={"sources": sources}).body.decode()
            
            return StreamingResponse(stream_generator(), media_type="text/plain")
        
        else:
            return JSONResponse(
                status_code=500,
                content={"error": "Invalid mode configuration. Check flags.py"}
            )
                
    except Exception as e:
        import traceback
        print(f"Chat endpoint error: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
