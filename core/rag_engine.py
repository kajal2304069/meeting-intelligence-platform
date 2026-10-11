"""
Small, dependency-light RAG chain over a single meeting's transcript:
chunk it, embed each chunk with Mistral's embeddings API, and retrieve the
most relevant chunks per question with plain cosine similarity (no vector
DB needed for one transcript's worth of text).
"""
from __future__ import annotations
import os
import math
import requests
from .summarizer import _chat, _api_key

MISTRAL_EMBED_URL = "https://api.mistral.ai/v1/embeddings"
EMBED_MODEL = os.getenv("MISTRAL_EMBED_MODEL", "mistral-embed")
CHUNK_CHARS = 1500


def _split(transcript: str) -> list[str]:
    text = (transcript or "").strip()
    if not text:
        return []
    return [text[i:i + CHUNK_CHARS] for i in range(0, len(text), CHUNK_CHARS)]


def _embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    resp = requests.post(
        MISTRAL_EMBED_URL,
        headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
        json={"model": EMBED_MODEL, "input": texts},
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    return [d["embedding"] for d in data]


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def build_rag_chain(transcript: str) -> dict:
    chunks = _split(transcript)
    embeddings = _embed(chunks)
    return {"chunks": chunks, "embeddings": embeddings}


def ask_question(rag_chain: dict, question: str) -> str:
    chunks = (rag_chain or {}).get("chunks") or []
    embeddings = (rag_chain or {}).get("embeddings") or []
    if not chunks or not (question or "").strip():
        return "I don't have a transcript to answer from yet."

    q_embedding = _embed([question])[0]
    ranked = sorted(zip(chunks, embeddings), key=lambda ce: _cosine(q_embedding, ce[1]), reverse=True)
    context = "\n---\n".join(c for c, _ in ranked[:4])

    prompt = (
        "Answer the question using ONLY the meeting transcript excerpts "
        "below. If the answer isn't in them, say you don't have that "
        "information from this meeting.\n\n"
        f"Transcript excerpts:\n{context}\n\nQuestion: {question}\nAnswer:"
    )
    return _chat(prompt, max_tokens=400)
