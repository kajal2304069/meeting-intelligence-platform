"""
Meeting sentiment analysis: classifies a transcript as Positive / Neutral /
Negative with a confidence score, plus a one-line rationale.
"""
from __future__ import annotations
from . import llm_adapter

POSITIVE_WORDS = {"great", "good", "excellent", "agree", "awesome", "happy",
                   "progress", "on track", "solved", "thanks", "well done",
                   "love", "excited", "successful", "resolved"}
NEGATIVE_WORDS = {"delay", "delayed", "blocked", "issue", "problem", "concern",
                   "risk", "worried", "frustrated", "missed", "fail", "failed",
                   "behind", "confused", "disagree", "escalate", "urgent",
                   "broken", "stuck"}


def _heuristic(transcript: str) -> dict:
    text = transcript.lower()
    pos = sum(text.count(w) for w in POSITIVE_WORDS)
    neg = sum(text.count(w) for w in NEGATIVE_WORDS)
    total = pos + neg
    if total == 0:
        return {"sentiment": "Neutral", "confidence": 0.5,
                "rationale": "No strong emotional language detected."}
    score = (pos - neg) / total
    if score > 0.15:
        label = "Positive"
    elif score < -0.15:
        label = "Negative"
    else:
        label = "Neutral"
    confidence = min(0.95, 0.5 + abs(score) * 0.5)
    return {
        "sentiment": label,
        "confidence": round(confidence, 2),
        "rationale": f"Detected {pos} positive vs {neg} negative signal words.",
    }


def analyze_sentiment(transcript: str) -> dict:
    if llm_adapter.has_llm():
        prompt = f"""Analyze the overall sentiment of this meeting transcript.
Return ONLY JSON: {{"sentiment": "Positive|Neutral|Negative", "confidence": 0-1, "rationale": "one short sentence"}}

Transcript:
{transcript[:6000]}
"""
        result = llm_adapter.complete_json(prompt)
        if result and "sentiment" in result:
            return result
    return _heuristic(transcript)
