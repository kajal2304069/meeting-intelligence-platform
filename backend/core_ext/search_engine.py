"""
AI Meeting Search: search across ALL stored transcripts (not just one
meeting's RAG chain like core/rag_engine.py does). Falls back to simple
keyword/snippet search when no LLM/embedding store is wired in, so search
always returns something useful.
"""
from __future__ import annotations
import re
from typing import List, Dict
from . import llm_adapter


def _snippet(text: str, query: str, radius: int = 120) -> str:
    idx = text.lower().find(query.lower())
    if idx == -1:
        return text[:radius * 2].strip() + "..."
    start = max(0, idx - radius)
    end = min(len(text), idx + len(query) + radius)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(text) else ""
    return f"{prefix}{text[start:end].strip()}{suffix}"


def keyword_search(query: str, meetings: List[Dict]) -> List[Dict]:
    """meetings: [{"id", "title", "date", "transcript", "summary"}]"""
    terms = [t for t in re.split(r"\s+", query.strip()) if t]
    results = []
    for m in meetings:
        haystack = f"{m.get('title','')} {m.get('summary','')} {m.get('transcript','')}".lower()
        hits = sum(haystack.count(t.lower()) for t in terms)
        if hits > 0:
            results.append({
                "meeting_id": m["id"],
                "title": m.get("title"),
                "date": m.get("date"),
                "relevance": hits,
                "snippet": _snippet(m.get("transcript", "") or m.get("summary", ""), terms[0] if terms else ""),
            })
    results.sort(key=lambda r: r["relevance"], reverse=True)
    return results


def semantic_search(query: str, meetings: List[Dict]) -> List[Dict]:
    if not llm_adapter.has_llm():
        return keyword_search(query, meetings)

    # Cheap re-ranking pass over keyword shortlist using the LLM, rather than
    # building a full vector index here — plug in your own embeddings store
    # (e.g. the one core/rag_engine.py already uses) for production-grade recall.
    shortlist = keyword_search(query, meetings)[:15]
    if not shortlist:
        return []
    joined = "\n".join(f"{i}: {r['title']} — {r['snippet']}" for i, r in enumerate(shortlist))
    prompt = f"""A user searched meetings for: "{query}"
Rank these candidate results by relevance (most relevant first).
Return ONLY JSON: {{"order": [list of indices, most relevant first]}}

Candidates:
{joined}
"""
    result = llm_adapter.complete_json(prompt)
    if result and isinstance(result.get("order"), list):
        try:
            return [shortlist[i] for i in result["order"] if 0 <= i < len(shortlist)]
        except Exception:
            pass
    return shortlist


def search(query: str, meetings: List[Dict]) -> List[Dict]:
    return semantic_search(query, meetings)
