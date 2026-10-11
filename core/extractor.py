"""
Pulls action items, key decisions, and open questions out of a transcript
via GPT, each as structured JSON.
"""
from __future__ import annotations
import json
import re
from .summarizer import _chat


def _parse_json_list(raw: str) -> list:
    cleaned = re.sub(r"^```json|^```|```$", "", (raw or "").strip(), flags=re.MULTILINE).strip()
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def extract_action_items(transcript: str) -> list[dict]:
    if not (transcript or "").strip():
        return []
    prompt = (
        "Extract every action item / task from this meeting transcript. "
        "Return ONLY a JSON array, each item shaped like: "
        '{"task": "...", "owner": "name or null if not mentioned", '
        '"deadline": "YYYY-MM-DD or null if not mentioned", '
        '"priority": "high|medium|low"}. '
        "If there are none, return [].\n\n"
        f"Transcript:\n{transcript[:12000]}"
    )
    raw = _chat(prompt, max_tokens=900)
    items = _parse_json_list(raw)

    cleaned = []
    for it in items:
        if not isinstance(it, dict) or not it.get("task"):
            continue
        cleaned.append({
            "task": it.get("task"),
            "owner": it.get("owner") or None,
            "deadline": it.get("deadline") or None,
            "priority": (it.get("priority") or "medium").lower(),
            "status": "Pending",
        })
    return cleaned


def extract_key_decisions(transcript: str) -> list[str]:
    if not (transcript or "").strip():
        return []
    prompt = (
        "List the key decisions made in this meeting as a JSON array of "
        "short strings. If none were made, return [].\n\n"
        f"Transcript:\n{transcript[:12000]}"
    )
    return _parse_json_list(_chat(prompt, max_tokens=400))


def extract_questions(transcript: str) -> list[str]:
    if not (transcript or "").strip():
        return []
    prompt = (
        "List the open / unresolved questions raised in this meeting as a "
        "JSON array of short strings. If none, return [].\n\n"
        f"Transcript:\n{transcript[:12000]}"
    )
    return _parse_json_list(_chat(prompt, max_tokens=400))
