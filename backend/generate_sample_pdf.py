import os
from reportlab.pdfgen import canvas

def create_sample_pdf(filename="sample.pdf"):
    c = canvas.Canvas(filename)
    
    text = """
    Medical Diagnosis Guide
    
    What is diagnosis?
    Diagnosis is the process of determining which disease or condition explains a person's symptoms and signs. It is most often referred to as diagnosis with the medical context being implicit. The information required for diagnosis is typically collected from a history and physical examination of the person seeking medical care. Often, one or more diagnostic procedures, such as medical tests, are also done during the process.
    
    Types of diagnosis include:
    - Clinical diagnosis
    - Laboratory diagnosis
    - Tissue diagnosis
    """
    
    textobject = c.beginText(50, 800)
    for line in text.split('\n'):
        textobject.textLine(line.strip())
        
    c.drawText(textobject)
    c.save()

if __name__ == "__main__":
    create_sample_pdf()
