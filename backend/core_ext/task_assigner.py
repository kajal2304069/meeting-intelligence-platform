"""
Task auto-assignment: your extractor.py already pulls an `owner` per action
item when it's explicitly named in the transcript. This module fills the
gap for tasks where no owner was mentioned, by matching against the known
employee roster (name mentions, nearest speaker turn, or round-robin by
team/workload as a last resort).
"""
from __future__ import annotations
from typing import List, Dict
from . import llm_adapter


def _nearest_speaker_heuristic(task: dict, transcript: str, roster: List[str]) -> str | None:
    text = (task.get("task") or "")
    for name in roster:
        if name.lower() in text.lower():
            return name
    idx = transcript.lower().find(text.lower()[:40]) if text else -1
    if idx != -1:
        window = transcript[max(0, idx - 300):idx]
        mentions = [name for name in roster if name.lower() in window.lower()]
        if mentions:
            return mentions[-1]
    return None


def _round_robin(roster: List[str], workload: Dict[str, int]) -> str:
    if not roster:
        return "Unassigned"
    return min(roster, key=lambda n: workload.get(n, 0))


def assign_owner(task: dict, transcript: str, roster: List[str],
                  workload: Dict[str, int] | None = None) -> dict:
    workload = workload or {}
    owner = task.get("owner")
    if owner and owner.strip().lower() not in ("n/a", "none", "unassigned", ""):
        return {**task, "owner_is_predicted": False}

    if llm_adapter.has_llm() and roster:
        prompt = f"""Given this action item and the list of meeting participants,
who is the most likely owner? Only pick from the roster, or say "Unassigned"
if unclear.
Task: {task.get('task')}
Roster: {', '.join(roster)}
Return ONLY JSON: {{"owner": "name or Unassigned"}}"""
        result = llm_adapter.complete_json(prompt)
        if result and result.get("owner"):
            workload[result["owner"]] = workload.get(result["owner"], 0) + 1
            return {**task, "owner": result["owner"], "owner_is_predicted": True}

    guess = _nearest_speaker_heuristic(task, transcript, roster) or _round_robin(roster, workload)
    workload[guess] = workload.get(guess, 0) + 1
    return {**task, "owner": guess, "owner_is_predicted": True}


def auto_assign_all(action_items: List[dict], transcript: str, roster: List[str]) -> List[dict]:
    workload: Dict[str, int] = {}
    return [assign_owner(t, transcript, roster, workload) for t in action_items]
