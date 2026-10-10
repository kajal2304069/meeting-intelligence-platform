"""
llm_adapter.py
--------------
Thin, defensive adapter so the new AI features (sentiment, deadline
prediction, auto-assignment, productivity scoring) can reuse whichever LLM
client your existing core/summarizer.py or core/extractor.py already talks
to (OpenAI, Anthropic, a local model, etc.) WITHOUT hard-coding a provider.

How it works:
1. On import, it tries a few common patterns to find an existing, already-
   configured LLM callable inside your `core` package (e.g. a `get_llm()`
   or `llm` object exported from core.summarizer or core.extractor).
2. If none is found, it falls back to a lightweight rule-based/heuristic
   implementation for each feature, so the product still runs end-to-end
   with zero extra config.

>>> ACTION FOR YOU: if step 1 doesn't find your client, add ONE line to
whichever of core/summarizer.py or core/extractor.py builds your LLM
client:  `llm = <your client object>`  — this file will then pick it up
automatically. Or just call `set_llm_client(your_client)` once at app
startup (see backend/app.py).
"""
from __future__ import annotations
import os
import re
import json
from typing import Optional, Callable

_llm_client = None
_llm_kind: Optional[str] = None  # "langchain" | "openai" | "anthropic" | None


def set_llm_client(client, kind: Optional[str] = None):
    """Call this once at startup if you want to explicitly wire in your LLM client."""
    global _llm_client, _llm_kind
    _llm_client = client
    _llm_kind = kind


def _try_autodetect():
    global _llm_client, _llm_kind
    if _llm_client is not None:
        return
    candidates = [
        ("core.summarizer", "llm"),
        ("core.summarizer", "get_llm"),
        ("core.extractor", "llm"),
        ("core.extractor", "get_llm"),
        ("core.rag_engine", "llm"),
        ("core.rag_engine", "get_llm"),
    ]
    for module_name, attr in candidates:
        try:
            module = __import__(module_name, fromlist=[attr])
            obj = getattr(module, attr, None)
            if obj is None:
                continue
            _llm_client = obj() if callable(obj) and attr.startswith("get_") else obj
            _llm_kind = "langchain"
            return
        except Exception:
            continue


def has_llm() -> bool:
    _try_autodetect()
    return _llm_client is not None


def complete(prompt: str) -> Optional[str]:
    """Returns raw text completion, or None if no LLM is wired in (caller should
    fall back to heuristics)."""
    _try_autodetect()
    if _llm_client is None:
        return None
    try:
        # LangChain-style .invoke()
        if hasattr(_llm_client, "invoke"):
            res = _llm_client.invoke(prompt)
            return getattr(res, "content", res)
        # Plain callable
        if callable(_llm_client):
            return _llm_client(prompt)
    except Exception as e:
        print(f"[llm_adapter] LLM call failed, falling back to heuristics: {e}")
        return None
    return None


def complete_json(prompt: str) -> Optional[dict]:
    raw = complete(prompt)
    if raw is None:
        return None
    try:
        cleaned = re.sub(r"^```json|```$", "", raw.strip(), flags=re.MULTILINE).strip()
        return json.loads(cleaned)
    except Exception:
        return None
