from app.services.lab_parser import LabValueParser

def test_robustness():
    parser = LabValueParser()
    
    noisy_text = """
    L a b o r a t o r y  R e s u l t s
    
    Gl u c os e: 1 2 5 . 5 mg/dL
    H e m o g l o b i n: 13. 2 g / d L
    A1c: 6 . 2 %
    """
    
    print("Testing with NOISY text:")
    print("-" * 20)
    print(noisy_text)
    print("-" * 20)
    
    results = parser.parse(noisy_text)
    
    print(f"Extracted {len(results)} lab values:")
    for lab in results:
        print(f"✅ {lab.test_name}: {lab.value} {lab.unit} (Raw: {lab.raw_text})")
    
    assert len(results) >= 3, "Failed to extract all noisy values"
    print("\nRobustness test PASSED! ✨")

if __name__ == "__main__":
    test_robustness()
