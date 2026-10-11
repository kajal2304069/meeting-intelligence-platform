"""
Transcribes audio chunks with two engines, picked by language:

- "english": local Whisper via faster-whisper, model size from the
  WHISPER_MODEL env var (default "small"), running on CPU. No API key
  needed — the model is downloaded once from Hugging Face on first use.
- "hinglish": Sarvam AI's speech-to-text API (saaras model) in "codemix"
  mode, built for Hindi/English code-mixed speech. Requires SARVAM_API_KEY
  (and optionally SARVAM_STT_MODEL, default "saaras:v3").

Sarvam's synchronous endpoint caps each request at 30 seconds of audio, so
utils/audio_processor.py pre-chunks everything into <=25s pieces — short
enough for both engines.
"""
from __future__ import annotations
import os
import requests

_whisper_model = None


def _get_whisper_model():
    """Loads the local Whisper model once and reuses it across chunks."""
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        size = os.getenv("WHISPER_MODEL", "small")
        _whisper_model = WhisperModel(size, device="cpu", compute_type="int8")
    return _whisper_model


def _transcribe_english_chunk(path: str) -> str:
    model = _get_whisper_model()
    segments, _ = model.transcribe(path, language="en")
    return " ".join(seg.text.strip() for seg in segments)


def _transcribe_sarvam_chunk(path: str) -> str:
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise RuntimeError("SARVAM_API_KEY is not set — required for Hinglish transcription.")
    model = os.getenv("SARVAM_STT_MODEL", "saaras:v3")
    with open(path, "rb") as f:
        resp = requests.post(
            "https://api.sarvam.ai/speech-to-text",
            headers={"api-subscription-key": api_key},
            data={"model": model, "mode": "codemix"},
            files={"file": (os.path.basename(path), f, "audio/wav")},
            timeout=60,
        )
    resp.raise_for_status()
    return (resp.json() or {}).get("transcript", "") or ""


def transcribe_chunk(path: str, language: str = "english") -> str:
    if (language or "").lower() == "hinglish":
        return _transcribe_sarvam_chunk(path)
    return _transcribe_english_chunk(path)


def transcribe_all(chunks: list[str], language: str = "english") -> str:
    """Transcribes each chunk in order and stitches the text into one full
    meeting transcript. A single bad chunk (network hiccup, odd audio) is
    skipped with a log line rather than failing the whole meeting."""
    parts: list[str] = []
    for path in chunks:
        try:
            text = transcribe_chunk(path, language)
            if text:
                parts.append(text.strip())
        except Exception as e:
            print(f"[transcriber] Skipping chunk {path} after error: {e}")
        finally:
            try:
                os.remove(path)
            except OSError:
                pass
    return " ".join(parts)
