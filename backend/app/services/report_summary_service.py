def build_report_summary(raw_text: str, entities: dict) -> str:
    lines = ["Medical Report Summary:"]
    if entities:
        lines.append("Key extracted entities:")
        for k, v in entities.items():
            lines.append(f"- {k}: {', '.join(v[:10])}")
    lines.append("\nReport text (condensed):")
    lines.append(raw_text[:1500])  # keep it bounded
    return "\n".join(lines)
