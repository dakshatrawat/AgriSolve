# ============================================================================
# AUDIO SERVICE - VOICE TRANSCRIPTION (Google Gemini)
# ============================================================================
# Uses Google Gemini's multimodal API for audio transcription.
# Supports: Hindi, English, Marathi, Bengali, Tamil, Telugu, etc.
# No heavy local models needed (no torch/transformers/whisper).
# ============================================================================

import os
import tempfile
import google.generativeai as genai
from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Supported languages for reference
SUPPORTED_LANGUAGES = [
    'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur',
    'sa', 'ne', 'kok', 'mni', 'brx', 'doi', 'mai', 'sat', 'ks'
]

# Map of MIME types for audio formats
AUDIO_MIME_TYPES = {
    '.webm': 'audio/webm',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mp3',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.opus': 'audio/ogg',
}


async def transcribe_audio(audio_file: UploadFile, language: str = None) -> dict:
    """
    Transcribe audio file to text using Google Gemini multimodal API.

    Args:
        audio_file: Uploaded audio file (webm, wav, mp3, ogg, m4a, etc.)
        language: Language code (en, hi, mr, etc.) or None for auto-detect

    Returns:
        dict with 'text' and 'language' keys

    Raises:
        Exception with user-friendly error message
    """
    tmp_path = None

    try:
        if not GOOGLE_API_KEY:
            raise ValueError("Google API key not configured. Cannot transcribe audio.")

        # === 1. VALIDATE UPLOAD ===
        if not audio_file or not audio_file.filename:
            raise ValueError("No audio file provided")

        filename = audio_file.filename
        content_type = audio_file.content_type or "unknown"
        suffix = os.path.splitext(filename)[1].lower() or '.webm'

        print(f"[audio_service] === NEW TRANSCRIPTION REQUEST ===")
        print(f"[audio_service] Filename: {filename}")
        print(f"[audio_service] Content-Type: {content_type}")
        print(f"[audio_service] Suffix: {suffix}")

        # === 2. SAVE UPLOADED FILE ===
        content = await audio_file.read()
        content_size = len(content)

        if content_size == 0:
            raise ValueError("Uploaded audio file is empty (0 bytes)")

        print(f"[audio_service] Upload size: {content_size} bytes ({content_size/1024:.1f} KB)")

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode='wb') as tmp:
            tmp.write(content)
            tmp.flush()
            os.fsync(tmp.fileno())
            tmp_path = tmp.name

        print(f"[audio_service] Saved to temp file: {tmp_path}")

        # === 3. UPLOAD TO GEMINI ===
        mime_type = AUDIO_MIME_TYPES.get(suffix, content_type)
        print(f"[audio_service] Uploading to Gemini with mime_type: {mime_type}")

        uploaded_file = genai.upload_file(tmp_path, mime_type=mime_type)
        print(f"[audio_service] File uploaded to Gemini: {uploaded_file.name}")

        # === 4. TRANSCRIBE WITH GEMINI ===
        lang_hint = ""
        if language and language.lower() not in ["auto", "none"]:
            lang_names = {
                'hi': 'Hindi', 'mr': 'Marathi', 'bn': 'Bengali', 'te': 'Telugu',
                'ta': 'Tamil', 'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam',
                'pa': 'Punjabi', 'or': 'Odia', 'as': 'Assamese', 'ur': 'Urdu',
                'en': 'English', 'sa': 'Sanskrit', 'ne': 'Nepali'
            }
            lang_name = lang_names.get(language[:2].lower(), language)
            lang_hint = f" The audio is likely in {lang_name}."

        prompt = (
            f"Transcribe this audio to text. Output ONLY the transcribed text in English, nothing else. "
            f"If the audio is in a non-English language, translate it to English.{lang_hint} "
            f"If the audio is unclear or empty, respond with exactly: [EMPTY]"
        )

        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content([prompt, uploaded_file])

        transcription = response.text.strip() if response.text else ""

        # Clean up uploaded file from Gemini
        try:
            genai.delete_file(uploaded_file.name)
        except Exception:
            pass

        # Validate transcription
        if not transcription or transcription == "[EMPTY]":
            raise ValueError("Transcription returned empty. Audio may be too short, silent, or unclear.")

        print(f"[audio_service] [SUCCESS] Transcription: '{transcription[:100]}{'...' if len(transcription) > 100 else ''}'")
        print(f"[audio_service] Length: {len(transcription)} characters")

        # Determine original language
        original_language = language[:2].lower() if language and language[:2].lower() in SUPPORTED_LANGUAGES else "auto"

        return {
            "text": transcription,
            "language": original_language
        }

    except Exception as e:
        print(f"[audio_service] [FAILED] TRANSCRIPTION ERROR: {type(e).__name__}")
        print(f"[audio_service] Error: {str(e)}")
        import traceback
        traceback.print_exc()

        error_msg = str(e) if str(e) else "Unknown error"
        raise Exception(f"Transcription failed: {error_msg}")

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
                print(f"[audio_service] Cleaned up temp file: {tmp_path}")
            except Exception as cleanup_error:
                print(f"[audio_service] Warning: Could not delete temp file: {cleanup_error}")
