"""
Centralized Language Service for Multilingual AI Chat System

This module handles ALL language-related operations:
- Translation between user language and English (for processing)
- Hinglish/phonetic text normalization
- Language detection and validation

CRITICAL PRINCIPLE:
- User sees ONLY their selected language
- Internal processing is ALWAYS in English
- Translation is invisible to the user
"""

import os
from typing import Optional
import google.generativeai as genai

# Load Google API key for translation
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)


# Language code to name mapping
LANGUAGE_MAP = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "english": "English",
    "hindi": "Hindi",
    "marathi": "Marathi"
}

# Model fallback list (in order of preference)
MODEL_FALLBACK_LIST = [
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
]


def get_model_with_fallback(prompt: str, stream: bool = False):
    """
    Try to generate content with fallback models when quota is exhausted.
    
    Args:
        prompt: The prompt to send to the model
        stream: Whether to stream the response
    
    Returns:
        Response from the first available model
        
    Raises:
        Exception: If all models fail
    """
    last_error = None
    
    for model_name in MODEL_FALLBACK_LIST:
        try:
            print(f"[language_service] Trying model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt, stream=stream)
            print(f"[language_service] Successfully used model: {model_name}")
            return response
        except Exception as e:
            error_msg = str(e)
            print(f"[language_service] Model {model_name} failed: {error_msg}")
            last_error = e
            
            # Check if it's a quota error, if so try next model
            if "quota" in error_msg.lower() or "resource_exhausted" in error_msg.lower() or "429" in error_msg:
                print(f"[language_service] Quota exhausted for {model_name}, trying next model...")
                continue
            else:
                # If it's not a quota error, might be worth trying next model anyway
                print(f"[language_service] Error with {model_name}, trying next model...")
                continue
    
    # If all models failed, raise the last error
    raise Exception(f"All models failed. Last error: {last_error}")


def get_language_name(language_code: str) -> Optional[str]:
    """
    Convert language code to full language name.
    
    Args:
        language_code: Language code (en, hi, mr)
    
    Returns:
        Full language name or None if unknown
    """
    return LANGUAGE_MAP.get(language_code.lower() if language_code else None, None)


def is_english_language(language_code: str) -> bool:
    """Check if language code is English."""
    return language_code and language_code.lower() in ["en", "english"]


async def normalize_to_english(text: str, source_language: str) -> str:
    """
    Normalize text to meaningful English for internal processing.
    
    This handles:
    - Direct translation from native script (Hindi → English)
    - Hinglish/phonetic normalization ("computer kya hai" → "What is a computer?")
    
    Args:
        text: Text in user's language or Hinglish
        source_language: Source language code (hi, mr, en)
    
    Returns:
        Normalized English text for processing
    """
    if not text or not text.strip():
        return text
    
    # If already English, return as-is
    if is_english_language(source_language):
        return text.strip()
    
    if not GOOGLE_API_KEY:
        print(f"[language_service] No Google API key, cannot normalize to English")
        return text  # Fallback: use original
    
    try:
        source_lang_name = get_language_name(source_language)
        if not source_lang_name:
            print(f"[language_service] Unknown source language: {source_language}")
            return text
        
        # Smart prompt that handles both native script and Hinglish
        prompt = (
            f"Convert the following {source_lang_name} text to clear, natural English. "
            f"The text may be in {source_lang_name} script or written phonetically in English letters (like 'computer kya hai'). "
            f"Convert it to proper English that preserves the meaning. "
            f"Only return the English text, nothing else:\n\n{text}"
        )
        
        response = get_model_with_fallback(prompt, stream=False)
        normalized = response.text.strip() if response.text else text
        
        print(f"[language_service] Normalized from {source_lang_name} to English: '{text[:50]}...' → '{normalized[:50]}...'")
        return normalized
        
    except Exception as e:
        print(f"[language_service] Normalization failed: {e}, using original text")
        return text  # Fallback: use original


async def translate_to_user_language(text: str, target_language: str) -> str:
    """
    Translate English text to user's selected language for display.
    
    This is used AFTER processing to show results in user's language.
    
    Args:
        text: English text from LLM/processing
        target_language: Target language code (hi, mr, en)
    
    Returns:
        Translated text in user's language
    """
    if not text or not text.strip():
        return text
    
    # If target is English, return as-is
    if is_english_language(target_language):
        return text
    
    if not GOOGLE_API_KEY:
        print(f"[language_service] No Google API key, cannot translate to {target_language}")
        return text  # Fallback: return English (user will see it)
    
    try:
        target_lang_name = get_language_name(target_language)
        if not target_lang_name:
            print(f"[language_service] Unknown target language: {target_language}")
            return text
        
        # Preserve markdown and formatting
        prompt = (
            f"Translate the following English text to {target_lang_name}. "
            f"Preserve all markdown formatting, code blocks, special characters, and structure. "
            f"Only return the translated text, nothing else:\n\n{text}"
        )
        
        response = get_model_with_fallback(prompt, stream=False)
        translated = response.text.strip() if response.text else text
        
        print(f"[language_service] Translated to {target_lang_name}: {len(translated)} chars")
        return translated
        
    except Exception as e:
        print(f"[language_service] Translation failed: {e}, returning English (user will see it)")
        # CRITICAL: If translation fails, we return English
        # This is a fallback - ideally we should retry or show an error
        return text


async def process_user_input(user_input: str, user_language: str) -> str:
    """
    Process user input: normalize to English for internal processing.
    
    This is the entry point for all user input (text or transcribed audio).
    
    Args:
        user_input: Text as typed/spoken by user (may be native script or Hinglish)
        user_language: User's selected language code
    
    Returns:
        Normalized English text for backend processing
    """
    return await normalize_to_english(user_input, user_language)


async def format_response_for_user(response: str, user_language: str) -> str:
    """
    Format LLM response for user display in their selected language.
    
    This is the exit point for all responses.
    
    Args:
        response: English response from LLM
        user_language: User's selected language code
    
    Returns:
        Translated response in user's language
    """
    return await translate_to_user_language(response, user_language)


