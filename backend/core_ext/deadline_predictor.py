"""
Deadline prediction: for an action item that has no explicit deadline,
suggest a reasonable one based on stated priority and task complexity.
"""
from __future__ import annotations
from datetime import datetime, timedelta
from . import llm_adapter

PRIORITY_WINDOW_DAYS = {"high": 2, "medium": 5, "low": 10}


def _heuristic(task: dict) -> str:
    priority = (task.get("priority") or "medium").lower()
    days = PRIORITY_WINDOW_DAYS.get(priority, 5)
    text = (task.get("task") or "").lower()
    if any(w in text for w in ["review", "reply", "send", "confirm", "share"]):
        days = min(days, 2)
    elif any(w in text for w in ["design", "build", "implement", "migrate", "research"]):
        days = max(days, 7)
    suggested = datetime.utcnow() + timedelta(days=days)
    return suggested.strftime("%Y-%m-%d")


def predict_deadline(task: dict) -> dict:
    """task: {"task": str, "owner": str, "priority": str, ...}
    Returns task dict with a `deadline` filled in and `deadline_is_predicted` flag."""
    if task.get("deadline") and str(task["deadline"]).strip().lower() not in ("n/a", "none", ""):
        return {**task, "deadline_is_predicted": False}

    if llm_adapter.has_llm():
        prompt = f"""Given this action item from a meeting, suggest a realistic deadline
(a date, YYYY-MM-DD, relative to today {datetime.utcnow().date()}).
Task: {task.get('task')}
Priority: {task.get('priority', 'medium')}
Return ONLY JSON: {{"deadline": "YYYY-MM-DD"}}"""
        result = llm_adapter.complete_json(prompt)
        if result and result.get("deadline"):
            return {**task, "deadline": result["deadline"], "deadline_is_predicted": True}

    return {**task, "deadline": _heuristic(task), "deadline_is_predicted": True}
