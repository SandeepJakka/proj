def medical_disclaimer(language: str = "english") -> str:
    if language.lower() == "telugu":
        return "\n\n💡 గమనిక: ఇది సాధారణ ఆరోగ్య సలహా మాత్రమే. తీవ్రమైన సమస్యలకు లేదా తగ్గని లక్షణాలకు, దయచేసి మీ వైద్యుడిని సంప్రదించండి."
    return "\n\n💡 Note: This is general health guidance. For serious concerns or persistent symptoms, please consult your doctor."
