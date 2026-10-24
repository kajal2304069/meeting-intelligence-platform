from dotenv import load_dotenv
load_dotenv()
import json
import os
os.makedirs("outputs", exist_ok=True)

from utils.audio_processor import process_input
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_action_items, extract_key_decisions, extract_questions
from core.rag_engine import build_rag_chain, ask_question
from database.save_data import save_to_database


from backend.core_ext.sentiment_analyzer import analyze_sentiment
from backend.core_ext.task_assigner import auto_assign_all
from backend.core_ext.deadline_predictor import predict_deadline


def get_employee_roster() -> list[str]:
    """Pulls the known employee names used for task auto-assignment.
    Wired to the DB roster (Employees added via the dashboard / /api/employees)
    with an env-var fallback so this still runs standalone."""
    try:
        from backend.db_models import SessionLocal, Employee
        db = SessionLocal()
        try:
            names = [e.name for e in db.query(Employee).all()]
            if names:
                return names
        finally:
            db.close()
    except Exception:
        pass
    return [n.strip() for n in os.getenv("EMPLOYEE_ROSTER", "").split(",") if n.strip()]


def run_pipeline(source: str, language: str = "english") -> dict:
    print("starting AI Video Assistant")

    chunks = process_input(source)

    transcript = transcribe_all(chunks, language)
    print(f"raw transcription (first 300 characters ) {transcript[:300]}")

    title = generate_title(transcript)

    summary = summarize(transcript)

    action_item = extract_action_items(transcript)

    # Task Auto Assignment: fill in owners the extractor couldn't find
    roster = get_employee_roster()
    action_item = auto_assign_all(action_item, transcript, roster)

    # Deadline Prediction: fill in deadlines the extractor couldn't find
    action_item = [predict_deadline(t) for t in action_item]

    # Save extracted tasks
    with open("outputs/tasks.json", "w", encoding="utf-8") as f:
        json.dump(action_item, f, indent=4, ensure_ascii=False)

    decisions = extract_key_decisions(transcript)
    questions = extract_questions(transcript)

    # --- Meeting Sentiment Analysis ---
    sentiment = analyze_sentiment(transcript)
    with open("outputs/sentiment.json", "w", encoding="utf-8") as f:
        json.dump(sentiment, f, indent=4, ensure_ascii=False)

    rag_chain = build_rag_chain(transcript)

    return {
        "title": title,
        "transcript": transcript,
        "summary": summary,
        "action_items": action_item,
        "key_decisions": decisions,
        "open_questions": questions,
        "sentiment": sentiment,
        "rag_chain": rag_chain,
    }


if __name__ == "__main__":

    source = input("Enter YouTube URL or local file path: ").strip()
    language = input("Language (english/hinglish): ").strip() or "english"

    result = run_pipeline(source, language)

    # Save everything to PostgreSQL
    save_to_database(result, source)

    print("\n" + "=" * 60)
    print(f"📌 Title: {result['title']}")
    print(f"\n📋 Summary:\n{result['summary']}")

    sentiment = result["sentiment"]
    print(f"\n🎭 Sentiment: {sentiment['sentiment']} (confidence {sentiment['confidence']})")
    print(f"   {sentiment['rationale']}")

    print("\n✅ Action Items:")

    if result["action_items"]:
        for i, task in enumerate(result["action_items"], start=1):
            print(f"\nTask #{i}")
            print(f"Task      : {task.get('task', 'N/A')}")
            owner_tag = " (auto-assigned)" if task.get("owner_is_predicted") else ""
            print(f"Owner     : {task.get('owner', 'N/A')}{owner_tag}")
            deadline_tag = " (predicted)" if task.get("deadline_is_predicted") else ""
            print(f"Deadline  : {task.get('deadline', 'N/A')}{deadline_tag}")
            print(f"Priority  : {task.get('priority', 'N/A')}")
            print(f"Status    : {task.get('status', 'Pending')}")
    else:
        print("No action items found.")

    print(f"\n🔑 Key Decisions:\n{result['key_decisions']}")
    print(f"\n❓ Open Questions:\n{result['open_questions']}")
    print("=" * 60)

    # Phase 2 — Chat with your meeting via RAG
    print("\n💬 Chat with your meeting (type 'exit' to quit)\n")
    rag_chain = result["rag_chain"]
    while True:
        question = input("You: ").strip()
        if question.lower() in ["exit", "quit", "q"]:
            print("👋 Goodbye!")
            break
        if not question:
            continue
        answer = ask_question(rag_chain, question)
        print(f"\n🤖 Assistant: {answer}\n")

    # Run `uvicorn backend.app:app --reload --port 8000` (from project root) to

