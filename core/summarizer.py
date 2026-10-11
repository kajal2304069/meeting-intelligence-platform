"""
Summary + title generation via Mistral's chat completions REST API
(calling the HTTP endpoint directly with `requests` rather than the
`mistralai` SDK, since that SDK's import path has changed across major
versions and REST stays stable regardless).

Also exposes `llm` — a thin, LangChain-`.invoke()`-shaped wrapper around the
same API — so backend/core_ext/llm_adapter.py auto-detects it and reuses it
for sentiment analysis, task auto-assignment, and deadline prediction
instead of falling back to their heuristic defaults.
"""
from __future__ import annotations
import os
from types import SimpleNamespace
import requests

MISTRAL_CHAT_URL = "https://api.mistral.ai/v1/chat/completions"
CHAT_MODEL = os.getenv("MISTRAL_CHAT_MODEL", "mistral-small-latest")


def _api_key() -> str:
    key = os.getenv("MISTRAL_API_KEY")
    if not key:
        raise RuntimeError("MISTRAL_API_KEY is not set.")
    return key


def _chat(prompt: str, max_tokens: int = 600) -> str:
    resp = requests.post(
        MISTRAL_CHAT_URL,
        headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
        json={
            "model": CHAT_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return (resp.json()["choices"][0]["message"]["content"] or "").strip()


class _ChatLLM:
    """Minimal LangChain-style shim (just `.invoke()` -> object with
    `.content`) so llm_adapter's auto-detection picks this up as `core.summarizer.llm`."""

    def invoke(self, prompt: str):
        return SimpleNamespace(content=_chat(prompt, max_tokens=300))


llm = _ChatLLM()


def summarize(transcript: str) -> str:
    if not (transcript or "").strip():
        return "No transcript available to summarize."
    prompt = (
        "Summarize this meeting transcript in 4-8 concise bullet points "
        "covering what was discussed, decisions made, and the overall "
        "outcome. Plain text bullets starting with '- ', nothing else.\n\n"
        f"Transcript:\n{transcript[:12000]}"
    )
    return _chat(prompt, max_tokens=500)


def generate_title(transcript: str) -> str:
    if not (transcript or "").strip():
        return "Untitled Meeting"
    prompt = (
        "Give this meeting a short, specific title (max 8 words). "
        "No quotes, no trailing punctuation, no prefix like 'Title:'.\n\n"
        f"Transcript:\n{transcript[:4000]}"
    )
    title = _chat(prompt, max_tokens=20)
    return title.strip(" \"'\n") or "Untitled Meeting"
