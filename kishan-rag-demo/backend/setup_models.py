"""
Download embedding models locally to avoid runtime downloads
Run this once: python download_models.py
"""
import os
from sentence_transformers import SentenceTransformer, CrossEncoder
from transformers import WhisperProcessor, WhisperForConditionalGeneration, AutoTokenizer, AutoModelForCausalLM

# Create models directory
MODELS_DIR = "./models"
os.makedirs(MODELS_DIR, exist_ok=True)

print("=" * 60)
print("Downloading models locally...")
print("=" * 60)

# Download embedding model
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"  # Smaller model, easier to download
EMBED_MODEL_PATH = os.path.join(MODELS_DIR, "all-MiniLM-L6-v2")

print(f"\n[1/4] Downloading embedding model: {EMBED_MODEL_NAME}")
print(f"      Saving to: {EMBED_MODEL_PATH}")
model = SentenceTransformer(EMBED_MODEL_NAME)
model.save(EMBED_MODEL_PATH)
print(f"      [OK] Embedding model downloaded (dim={model.get_sentence_embedding_dimension()})")

# Download cross-encoder model
CROSS_ENCODER_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"
CROSS_ENCODER_PATH = os.path.join(MODELS_DIR, "ms-marco-MiniLM-L-6-v2")

print(f"\n[2/4] Downloading cross-encoder model: {CROSS_ENCODER_NAME}")
print(f"      Saving to: {CROSS_ENCODER_PATH}")
cross_encoder = CrossEncoder(CROSS_ENCODER_NAME)
cross_encoder.save(CROSS_ENCODER_PATH)
print(f"      [OK] Cross-encoder model downloaded")

# Download Whisper model for audio transcription
WHISPER_MODEL_NAME = "openai/whisper-small"
WHISPER_MODEL_PATH = os.path.join(MODELS_DIR, "whisper-small")

print(f"\n[3/4] Downloading Whisper model: {WHISPER_MODEL_NAME}")
print(f"      Saving to: {WHISPER_MODEL_PATH}")
print(f"      (This may take a while - ~967 MB)")
processor = WhisperProcessor.from_pretrained(WHISPER_MODEL_NAME)
whisper_model = WhisperForConditionalGeneration.from_pretrained(WHISPER_MODEL_NAME)
processor.save_pretrained(WHISPER_MODEL_PATH)
whisper_model.save_pretrained(WHISPER_MODEL_PATH)
print(f"      [OK] Whisper model downloaded")

# Download TinyLlama for local LLM fallback
TINYLLAMA_MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
TINYLLAMA_MODEL_PATH = os.path.join(MODELS_DIR, "tinyllama-chat")

print(f"\n[4/4] Downloading TinyLlama (local LLM fallback): {TINYLLAMA_MODEL_NAME}")
print(f"      Saving to: {TINYLLAMA_MODEL_PATH}")
print(f"      (This may take a while - ~2.2 GB)")
tokenizer = AutoTokenizer.from_pretrained(TINYLLAMA_MODEL_NAME)
llm_model = AutoModelForCausalLM.from_pretrained(TINYLLAMA_MODEL_NAME)
tokenizer.save_pretrained(TINYLLAMA_MODEL_PATH)
llm_model.save_pretrained(TINYLLAMA_MODEL_PATH)
print(f"      [OK] TinyLlama model downloaded")

print("\n" + "=" * 60)
print("[OK] All models downloaded successfully!")
print("=" * 60)
print(f"\nModels saved in: {os.path.abspath(MODELS_DIR)}")
print("\nYou can now run the backend without internet connection.")
print("\nThe system will use:")
print("  - Google Gemini API (primary)")
print("  - TinyLlama local model (fallback when quota exceeded)")
