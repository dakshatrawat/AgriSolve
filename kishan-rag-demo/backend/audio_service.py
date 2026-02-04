import os
import sys
import subprocess
import torch
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from fastapi import UploadFile
import tempfile
import numpy as np
import librosa
import soundfile as sf
from threading import Lock

# Check for resampy (required for librosa.resample)
try:
    import resampy
    _resampy_available = True
except ImportError:
    _resampy_available = False
    print("[audio_service] WARNING: resampy not installed - audio resampling may fail")
    print("[audio_service] Install: pip install resampy")
    
# Use Whisper Small for multilingual support (Hindi, English, Marathi)
MODEL_NAME = "openai/whisper-small"
MODELS_DIR = "./models"
LOCAL_MODEL_PATH = os.path.join(MODELS_DIR, "whisper-small")
USE_LOCAL_MODEL = os.path.exists(LOCAL_MODEL_PATH)

if USE_LOCAL_MODEL:
    print(f"[audio_service] Using local Whisper model: {LOCAL_MODEL_PATH}")
else:
    print(f"[audio_service] Local Whisper model not found, will download: {MODEL_NAME}")
    print(f"[audio_service] Run 'python download_models.py' to download models locally")

device = "cuda" if torch.cuda.is_available() else "cpu"

# Lazy loading with thread-safety
_processor = None
_model = None
_model_lock = Lock()

# Add local ffmpeg to PATH if it exists (for Windows development)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_local_ffmpeg = os.path.join(_backend_dir, 'ffmpeg-8.0.1-essentials_build', 'bin')
if os.path.exists(_local_ffmpeg):
    os.environ['PATH'] = _local_ffmpeg + os.pathsep + os.environ.get('PATH', '')
    print(f"[audio_service] Added local ffmpeg to PATH: {_local_ffmpeg}")

# Check for ffmpeg availability (required for webm/ogg decoding)
def check_ffmpeg():
    """Check if ffmpeg is available on system PATH"""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'], 
            capture_output=True, 
            timeout=3,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False

_ffmpeg_available = check_ffmpeg()
if not _ffmpeg_available:
    print("[audio_service] WARNING: ffmpeg not found on system PATH")
    print("[audio_service] To enable webm/ogg audio transcription:")
    print("[audio_service]   1. Download ffmpeg from https://ffmpeg.org/download.html")
    print("[audio_service]   2. Extract and add to system PATH")
    print("[audio_service]   3. Restart the backend")
else:
    print(f"[audio_service] ffmpeg detected - webm/ogg support enabled")

def get_model():
    """
    Lazy load Whisper model on first call (thread-safe).
    Prevents re-loading on concurrent requests.
    """
    global _processor, _model
    
    # Double-checked locking pattern
    if _processor is None or _model is None:
        with _model_lock:
            # Check again inside lock
            if _processor is None or _model is None:
                model_path = LOCAL_MODEL_PATH if USE_LOCAL_MODEL else MODEL_NAME
                print(f"[audio_service] Loading Whisper model from: {model_path} on {device}...")
                _processor = WhisperProcessor.from_pretrained(model_path)
                _model = WhisperForConditionalGeneration.from_pretrained(model_path).to(device)
                print(f"[audio_service] Whisper model loaded successfully")
    
    return _processor, _model


def load_audio(file_path: str, target_sampling_rate: int = 16000) -> np.ndarray:
    """
    Load and preprocess audio file to 16kHz mono.
    Handles: wav, mp3, webm, ogg, m4a, etc.
    
    Critical: Uses librosa with audioread/ffmpeg backend for webm/ogg compatibility.
    """
    try:
        # Validate file exists and has content
        if not os.path.exists(file_path):
            raise ValueError(f"Audio file not found: {file_path}")
        
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise ValueError("Audio file is empty (0 bytes)")
        
        suffix = os.path.splitext(file_path)[1].lower()
        print(f"[audio_service] Loading audio: {file_path} ({file_size} bytes, format: {suffix})")
        
        # Detect format and choose appropriate loader
        # soundfile: wav, flac, ogg (vorbis only, not opus)
        # librosa+audioread+ffmpeg: mp3, m4a, webm, ogg (opus), aac
        
        # Try soundfile first (fast for uncompressed formats)
        try:
            audio_array, sample_rate = sf.read(file_path, dtype='float32')
            print(f"[audio_service] [OK] Loaded with soundfile: sr={sample_rate}, shape={audio_array.shape}")
            
            # Convert stereo to mono if needed
            if len(audio_array.shape) > 1 and audio_array.shape[1] > 1:
                audio_array = audio_array.mean(axis=1)
                print(f"[audio_service] Converted stereo to mono")
            
            # Resample if needed (requires resampy)
            if sample_rate != target_sampling_rate:
                if not _resampy_available:
                    raise Exception(
                        f"Audio resampling required ({sample_rate}Hz -> {target_sampling_rate}Hz) "
                        "but 'resampy' is not installed. Run: pip install resampy"
                    )
                
                audio_array = librosa.resample(
                    audio_array, 
                    orig_sr=sample_rate, 
                    target_sr=target_sampling_rate,
                    res_type='kaiser_best'  # High-quality resampling
                )
                print(f"[audio_service] Resampled {sample_rate}Hz -> {target_sampling_rate}Hz")
            
        except Exception as sf_error:
            # Soundfile failed - likely compressed format (webm, mp3, m4a, ogg-opus)
            print(f"[audio_service] Soundfile failed ({type(sf_error).__name__}), trying librosa...")
            
            # Check if ffmpeg is available for webm/ogg decoding
            if not _ffmpeg_available and suffix in ['.webm', '.ogg', '.opus']:
                raise Exception(
                    f"Cannot decode {suffix} format without ffmpeg. "
                    "Please install ffmpeg from https://ffmpeg.org/download.html and add to PATH, "
                    "or use wav/mp3 format instead."
                )
            
            # librosa.load() with audioread backend (requires ffmpeg/gstreamer + resampy)
            try:
                # Check resampy before attempting librosa.load with resampling
                if not _resampy_available:
                    raise Exception(
                        "Audio resampling library 'resampy' is required but not installed. "
                        "Run: pip install resampy"
                    )
                
                # Force librosa to use audioread backend for webm/ogg
                # This will automatically resample using resampy
                audio_array = librosa.load(
                    file_path,
                    sr=target_sampling_rate,  # Resample to target rate (uses resampy)
                    mono=True,  # Force mono
                    res_type='kaiser_best'  # High-quality resampling
                )[0]  # Returns (audio, sr) tuple
                
                print(f"[audio_service] [OK] Loaded with librosa+audioread: shape={audio_array.shape}")
                
            except Exception as librosa_error:
                # Check if it's a NoBackendError
                error_str = str(librosa_error)
                if "NoBackendError" in str(type(librosa_error).__name__) or "no audio data" in error_str.lower():
                    raise Exception(
                        f"Cannot decode {suffix} audio format. "
                        "FFmpeg is required but not found on your system. "
                        "Install: https://ffmpeg.org/download.html"
                    )
                raise librosa_error
        
        # Validate audio array
        if audio_array.size == 0:
            raise ValueError("Audio array is empty after loading")
        
        if np.isnan(audio_array).any():
            raise ValueError("Audio contains NaN values - file may be corrupted")
        
        if np.isinf(audio_array).any():
            raise ValueError("Audio contains Inf values - file may be corrupted")
        
        # Ensure float32 and 1D
        audio_array = audio_array.astype(np.float32)
        if len(audio_array.shape) > 1:
            audio_array = audio_array.flatten()
        
        # Log duration
        duration = len(audio_array) / target_sampling_rate
        print(f"[audio_service] Audio duration: {duration:.2f}s, samples: {len(audio_array)}")
        
        # Reject very short audio (Whisper needs minimum ~0.3s for meaningful transcription)
        if duration < 0.3:
            raise ValueError(f"Audio too short ({duration:.2f}s). Please record at least 0.3 seconds.")
        
        return audio_array
        
    except Exception as e:
        print(f"[audio_service] [ERROR] Load audio failed: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Re-raise with user-friendly message
        raise Exception(f"Could not load audio: {str(e)}")


async def transcribe_audio(audio_file: UploadFile, language: str = None) -> dict:
    """
    Transcribe audio file to text using Whisper.
    
    Args:
        audio_file: Uploaded audio file (webm, wav, mp3, ogg, m4a, etc.)
        language: Language code (en, hi, bn, te, mr, ta, gu, kn, ml, pa, or, as, ur) or None for auto-detect
    
    Returns:
        dict with 'text' and 'language' keys
    
    Raises:
        Exception with user-friendly error message
    """
    tmp_path = None
    
    try:
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
        
        # Check if format requires ffmpeg and reject if not available
        if not _ffmpeg_available and suffix in ['.webm', '.ogg', '.opus']:
            raise ValueError(
                f"Audio format '{suffix}' requires ffmpeg, which is not installed. "
                "Please use WAV or MP3 format instead, or install ffmpeg from https://ffmpeg.org/download.html"
            )
        
        # === 2. SAVE UPLOADED FILE ===
        # Read content ONCE (UploadFile can only be read once)
        content = await audio_file.read()
        content_size = len(content)
        
        if content_size == 0:
            raise ValueError("Uploaded audio file is empty (0 bytes)")
        
        print(f"[audio_service] Upload size: {content_size} bytes ({content_size/1024:.1f} KB)")
        
        # Write to temp file with proper suffix for librosa to detect format
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode='wb') as tmp:
            tmp.write(content)
            tmp.flush()  # Ensure all data is written to disk
            os.fsync(tmp.fileno())  # Force OS to write to disk
            tmp_path = tmp.name
        
        print(f"[audio_service] Saved to temp file: {tmp_path}")
        
        # === 3. LOAD MODEL ===
        processor, model = get_model()
        
        # === 4. LOAD & PREPROCESS AUDIO ===
        audio_array = load_audio(tmp_path, target_sampling_rate=16000)
        
        # === 5. PREPARE WHISPER INPUT ===
        # Whisper expects float32 array at 16kHz
        input_features = processor(
            audio_array, 
            sampling_rate=16000, 
            return_tensors="pt"
        ).input_features
        
        # Move to correct device
        input_features = input_features.to(device)
        
        print(f"[audio_service] Input features shape: {input_features.shape}")
        
        # === 6. CONFIGURE GENERATION ===
        # Whisper has max_target_positions=448 total tokens
        # This includes decoder_input_ids (language/task tokens ~3-5) + generated tokens
        # Safe max_new_tokens = 448 - decoder_prompt_overhead = ~224 (conservative)
        # OR remove max_new_tokens entirely and let Whisper handle it
        generation_kwargs = {
            "num_beams": 1,  # Greedy decoding for speed
            "no_repeat_ngram_size": 3,  # Prevent repetition
            # Note: NOT setting max_new_tokens - let Whisper use its defaults
            # to avoid "decoder_input_ids + max_new_tokens > 448" error
        }
        
        # Language processing: Use translate mode for non-English, transcribe for English
        # This ensures all output is in English for consistent processing
        # Supported Indian languages: hi, bn, te, mr, ta, gu, kn, ml, pa, or, as, ur
        supported_indian_languages = [
            'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur',
            'hindi', 'bengali', 'telugu', 'marathi', 'tamil', 'gujarati', 
            'kannada', 'malayalam', 'punjabi', 'odia', 'assamese', 'urdu'
        ]
        
        if language and (language[:2].lower() in supported_indian_languages or language.lower() in supported_indian_languages):
            lang_code = language[:2].lower()  # Normalize to 2-letter code
            
            # For non-English: use translate mode to convert to English text
            # For English: use transcribe mode (normal transcription)
            task = "translate" if lang_code != "en" else "transcribe"
            
            forced_decoder_ids = processor.get_decoder_prompt_ids(
                language=lang_code, 
                task=task
            )
            generation_kwargs["forced_decoder_ids"] = forced_decoder_ids
            print(f"[audio_service] Language: {lang_code}, Task: {task} (output will be in English)")
        else:
            # Auto-detect: use translate mode to ensure English output
            forced_decoder_ids = processor.get_decoder_prompt_ids(
                language=None,  # Auto-detect
                task="translate"  # Always translate to English
            )
            generation_kwargs["forced_decoder_ids"] = forced_decoder_ids
            print(f"[audio_service] Auto-detecting language, using translate mode (output will be in English)")
        
        # === 7. GENERATE TRANSCRIPTION ===
        print(f"[audio_service] Generating transcription...")
        with torch.no_grad():
            predicted_ids = model.generate(input_features, **generation_kwargs)
        
        # === 8. DECODE OUTPUT ===
        transcription = processor.batch_decode(
            predicted_ids, 
            skip_special_tokens=True
        )[0].strip()
        
        # Validate transcription is not empty
        if not transcription:
            # Whisper sometimes returns empty for very short/silent audio
            raise ValueError("Transcription returned empty text. Audio may be too short, silent, or unclear.")
        
        print(f"[audio_service] [SUCCESS] Transcription: '{transcription[:100]}{'...' if len(transcription) > 100 else ''}'")
        print(f"[audio_service] Length: {len(transcription)} characters")
        
        # Return original language code (for translation tracking)
        # Note: transcription text is always in English due to translate mode
        supported_indian_languages = [
            'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur',
            'hindi', 'bengali', 'telugu', 'marathi', 'tamil', 'gujarati', 
            'kannada', 'malayalam', 'punjabi', 'odia', 'assamese', 'urdu'
        ]
        original_language = language[:2].lower() if language and (language[:2].lower() in supported_indian_languages or language.lower() in supported_indian_languages) else "auto"
        
        return {
            "text": transcription,  # Always English text (from translate mode)
            "language": original_language  # Original spoken language
        }
    
    except Exception as e:
        # Log full error for debugging
        print(f"[audio_service] [FAILED] TRANSCRIPTION ERROR: {type(e).__name__}")
        print(f"[audio_service] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return user-friendly error
        error_msg = str(e) if str(e) else "Unknown error"
        raise Exception(f"Transcription failed: {error_msg}")
    
    finally:
        # === 9. CLEANUP ===
        # Always remove temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
                print(f"[audio_service] Cleaned up temp file: {tmp_path}")
            except Exception as cleanup_error:
                print(f"[audio_service] Warning: Could not delete temp file: {cleanup_error}")

