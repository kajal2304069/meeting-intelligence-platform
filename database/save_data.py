"""
Save path for the standalone CLI (`python main.py`) only.

The hosted dashboard does NOT use this — backend/routers/meetings.py saves
pipeline results straight into the Postgres tables defined in
backend/db_models.py. This just keeps `python main.py` fully runnable on
its own (no Postgres required), logging each run to outputs/runs.jsonl.
"""
from __future__ import annotations
import json
import os
import datetime as dt


def save_to_database(result: dict, source: str) -> None:
    os.makedirs("outputs", exist_ok=True)
    record = {
        "source": source,
        "title": result.get("title"),
        "summary": result.get("summary"),
        "action_items": result.get("action_items"),
        "key_decisions": result.get("key_decisions"),
        "open_questions": result.get("open_questions"),
        "sentiment": result.get("sentiment"),
        "saved_at": dt.datetime.utcnow().isoformat(),
    }
    with open("outputs/runs.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    print(f"[save_data] Logged run for source={source!r} to outputs/runs.jsonl")
