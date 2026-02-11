import spacy

nlp = spacy.load("en_core_sci_sm")

def extract_entities(text: str) -> dict:
    doc = nlp(text)
    entities = {}
    for ent in doc.ents:
        entities.setdefault(ent.label_, set()).add(ent.text)

    return {k: list(v) for k, v in entities.items()}
