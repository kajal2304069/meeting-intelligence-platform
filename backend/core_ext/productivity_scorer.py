"""
Productivity scoring: turns raw task history for an employee (or a whole
team) into a 0-100 score. Transparent, rule-based by design (a score that
managers see should be explainable, not a black box).
"""
from __future__ import annotations
from datetime import datetime
from typing import List, Dict


def score_employee(tasks: List[dict]) -> dict:
    """tasks: list of {"status": "Completed|Pending|Overdue", "deadline": "YYYY-MM-DD",
    "completed_at": "YYYY-MM-DD"|None, "priority": "high|medium|low"}"""
    if not tasks:
        return {"score": None, "completed": 0, "total": 0, "on_time_rate": None}

    total = len(tasks)
    completed = [t for t in tasks if t.get("status") == "Completed"]
    overdue = [t for t in tasks if t.get("status") == "Overdue"]

    on_time = 0
    for t in completed:
        try:
            deadline = datetime.strptime(t["deadline"], "%Y-%m-%d")
            done = datetime.strptime(t["completed_at"], "%Y-%m-%d")
            if done <= deadline:
                on_time += 1
        except Exception:
            on_time += 1  # give benefit of the doubt if dates are missing

    completion_rate = len(completed) / total
    on_time_rate = on_time / len(completed) if completed else 0
    overdue_penalty = min(0.3, len(overdue) / total * 0.5)

    priority_weight = {"high": 1.4, "medium": 1.0, "low": 0.7}
    weighted_done = sum(priority_weight.get((t.get("priority") or "medium").lower(), 1.0) for t in completed)
    weighted_total = sum(priority_weight.get((t.get("priority") or "medium").lower(), 1.0) for t in tasks)
    weighted_rate = weighted_done / weighted_total if weighted_total else 0

    raw_score = (0.4 * completion_rate + 0.35 * on_time_rate + 0.25 * weighted_rate) * 100
    raw_score = max(0, raw_score - overdue_penalty * 100)

    return {
        "score": round(raw_score),
        "completed": len(completed),
        "total": total,
        "overdue": len(overdue),
        "on_time_rate": round(on_time_rate * 100),
    }


def score_team(employee_task_map: Dict[str, List[dict]]) -> dict:
    per_employee = {name: score_employee(tasks) for name, tasks in employee_task_map.items()}
    valid = [v["score"] for v in per_employee.values() if v["score"] is not None]
    team_score = round(sum(valid) / len(valid)) if valid else None
    return {"team_score": team_score, "employees": per_employee}
