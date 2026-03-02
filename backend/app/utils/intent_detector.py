from langdetect import detect, LangDetectException

def detect_language(text: str) -> str:
    """
    Detects if the text is English or Telugu.
    Returns "telugu" if detected language is 'te', else defaults to "english".
    """
    if not text or len(text.strip()) < 3:
        return "english"
    try:
        lang_code = detect(text)
        if lang_code == "te":
            return "telugu"
        return "english"
    except LangDetectException:
        return "english"
    except Exception:
        return "english"
