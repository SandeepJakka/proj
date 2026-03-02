from sqlalchemy.orm import Session
from app.db import crud, models
# Removed local_llm import — now using Groq-based LLM via llm_service
from app.services.llm_service import medical_llm_response
import json

async def analyze_health_trends(db: Session, user_id: int):
    # 1. Get all reports for user
    reports = crud.get_user_reports(db, user_id)
    if len(reports) < 2:
        return {
            "summary": "Need at least two reports to analyze trends.",
            "metrics": []
        }

    # 2. Gather summaries
    report_data = []
    for report in reports:
        extract = crud.get_report_extract(db, report.id)
        if extract:
            report_data.append({
                "date": report.created_at.strftime("%Y-%m-%d"),
                "summary": extract.summary_text
            })

    # 3. LLM Analysis — using Groq API via llm_service
    system_prompt = (
        "You are a medical data analyst. Compare the following medical report summaries for the same patient over time. "
        "Identify key health metrics (like Blood Pressure, Glucose, BMI, etc.) and describe their trends. "
        "Provide a concise overall summary of the patient's progress. "
        "Format as JSON with keys: 'overall_summary' (string), 'trends' (list of objects with 'metric', 'entries' [list of {date, value}], and 'observation')."
    )

    user_prompt = f"Patient Report History:\n{json.dumps(report_data, indent=2)}\n\nAnalyze the trends."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_prompt},
    ]
    raw_response = await medical_llm_response(messages)

    try:
        # Attempt to parse JSON from LLM response
        start = raw_response.find("{")
        end = raw_response.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw_response[start:end+1])
        return {"summary": raw_response, "metrics": []}
    except Exception:
        return {"summary": "Error parsing trend analysis.", "metrics": []}
