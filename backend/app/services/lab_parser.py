"""
LabValueParser - Deterministic extraction of numeric lab values from medical reports

This module extracts structured lab values (test name, numeric value, unit) from
raw text using regex patterns. It does NOT use LLMs, ensuring reliable extraction.

Example:
    Input: "Hemoglobin: 12.5 g/dL (Normal Range: 12-16)"
    Output: {
        "test": "Hemoglobin",
        "value": 12.5,
        "unit": "g/dL",
        "normal_range": {"min": 12.0, "max": 16.0},
        "confidence": 0.95
    }
"""

import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class LabUnit(Enum):
    """Common lab test units"""
    # Concentration
    MG_DL = "mg/dL"
    MMOL_L = "mmol/L"
    G_DL = "g/dL"
    G_L = "g/L"
    
    # Percentage
    PERCENT = "%"
    
    # Count
    CELLS_UL = "cells/μL"
    X10_3_UL = "x10^3/μL"
    X10_6_UL = "x10^6/μL"
    
    # Other
    IU_L = "IU/L"
    U_L = "U/L"
    MG_L = "mg/L"


@dataclass
class LabValue:
    """Structured lab test result"""
    test_name: str
    value: float
    unit: str
    normal_range: Optional[Dict[str, float]] = None
    status: Optional[str] = None  # "low", "normal", "high"
    raw_text: str = ""
    confidence: float = 0.0


class LabValueParser:
    """
    Extracts numeric lab values from medical report text.
    
    Uses multiple regex patterns to handle various formats:
    - "Hemoglobin: 12.5 g/dL"
    - "Glucose - 120 mg/dL"
    - "WBC 8.5 x10^3/μL"
    - "HbA1c 5.7%"
    """
    
    # Common lab test name patterns
    LAB_TEST_NAMES = [
        # Hematology
        "hemoglobin", "hgb", "hb",
        "hematocrit", "hct",
        "wbc", "white blood cell",
        "rbc", "red blood cell",
        "platelet", "plt",
        "mcv", "mch", "mchc",
        
        # Chemistry
        "glucose", "blood sugar",
        "hba1c", "hemoglobin a1c", "glycated hemoglobin",
        "creatinine",
        "bun", "blood urea nitrogen",
        "sodium", "na",
        "potassium", "k",
        "chloride", "cl",
        "calcium", "ca",
        
        # Lipid panel
        "total cholesterol", "cholesterol",
        "hdl", "hdl cholesterol",
        "ldl", "ldl cholesterol",
        "triglycerides",
        
        # Liver function
        "alt", "sgpt",
        "ast", "sgot",
        "alkaline phosphatase", "alp",
        "bilirubin",
        "albumin",
        
        # Thyroid
        "tsh", "thyroid stimulating hormone",
        "t3", "t4", "free t4",
        
        # Other
        "vitamin d", "25-oh vitamin d", "25 hydroxyvitamin d",
        "vitamin b12", "cobalamin",
        "iron", "ferritin",
        "psa", "prostate specific antigen",
        "crp", "c-reactive protein",
        "esr", "erythrocyte sedimentation rate"
    ]
    
    def __init__(self):
        """Initialize parser with compiled regex patterns"""
        self.patterns = self._compile_patterns()
        self.unit_normalizer = UnitNormalizer()
    
    def _compile_patterns(self) -> List[re.Pattern]:
        """Compile all extraction patterns"""
        
        # Build test name pattern (flexible matching)
        # Allow optional spaces between letters in test names to handle OCR errors like "G l u c o s e"
        test_names = []
        for name in self.LAB_TEST_NAMES:
            # "glucose" -> "g\s*l\s*u\s*c\s*o\s*s\s*e"
            flexible_name = r"\s*".join(re.escape(char) for char in name)
            test_names.append(flexible_name)
        
        test_pattern = "|".join(test_names)
        
        patterns = [
            # Pattern 1: "Test Name: Value Unit"
            re.compile(
                rf'\b({test_pattern})\s*[:\-\—\⁃\•]?\s*(\d+[\.\s]?\d*)\s*([a-zA-Z/%μ^0-9\s]+)',
                re.IGNORECASE
            ),
            
            # Pattern 4: With status indicators
            re.compile(
                rf'\b({test_pattern})\s*[:\-\—\⁃\•]?\s*(\d+[\.\s]?\d*)\s*([a-zA-Z/%μ^0-9\s]+)\s*\((Low|Normal|High)\)',
                re.IGNORECASE
            ),
        ]
        
        return patterns
    
    def parse(self, text: str, extract_ranges: bool = True) -> List[LabValue]:
        """
        Extract all lab values from text.
        
        Args:
            text: Medical report text
            extract_ranges: Also extract normal ranges if present
        
        Returns:
            List of LabValue objects
        """
        # Step 0: Clean text (OCR artifacts)
        # Handle cases like "G l u c o s e" or extra spaces in "12. 5"
        clean_text = self._clean_ocr_text(text)
        
        results = []
        seen_combos = set()  # Deduplication
        
        # Use both clean and original text for matching
        for source_text in [clean_text, text]:
            for pattern in self.patterns:
                for match in pattern.finditer(source_text):
                    # Extract components
                    if len(match.groups()) >= 3:
                        test_name = match.group(1).strip()
                        value_str = match.group(2).replace(" ", "") # Remove spaces in numbers like "12. 5"
                        unit = match.group(3).strip()
                        status = match.group(4).lower() if len(match.groups()) >= 4 else None
                        
                        try:
                            value = float(value_str)
                        except ValueError:
                            continue
                        
                        # Deduplicate
                        combo = (test_name.lower(), value, unit)
                        if combo in seen_combos:
                            continue
                        seen_combos.add(combo)
                    
                    # Normalize unit
                    normalized_unit = self.unit_normalizer.normalize(unit)
                    
                    # Extract normal range if present
                    normal_range = None
                    if extract_ranges:
                        normal_range = self._extract_range_near_match(text, match)
                    
                    # Create result
                    lab_value = LabValue(
                        test_name=self._normalize_test_name(test_name),
                        value=value,
                        unit=normalized_unit,
                        normal_range=normal_range,
                        status=status,
                        raw_text=match.group(0),
                        confidence=0.9  # High confidence for regex matches
                    )
                    
                    results.append(lab_value)
        
        return self._deduplicate_results(results)
    
    def _clean_ocr_text(self, text: str) -> str:
        """Remove common OCR artifacts like excessive spaces within words"""
        # Collapse multiple spaces
        text = re.sub(r' +', ' ', text)
        
        # Try to fix "G l u c o s e" -> "Glucose"
        # We look for single letters separated by spaces
        text = re.sub(r'(?<=\b[a-zA-Z])\s(?=[a-zA-Z]\b)', '', text)
        
        return text

    def _extract_range_near_match(self, text: str, match: re.Match) -> Optional[Dict[str, float]]:
        """Extract normal range appearing near a lab value"""
        # Look for range pattern near the match
        context_start = max(0, match.start() - 50)
        context_end = min(len(text), match.end() + 100)
        context = text[context_start:context_end]
        
        # Pattern: "Normal Range: 12-16" or "Ref: 12.0-16.0"
        range_pattern = re.compile(
            r'(?:Normal Range|Reference Range|Ref\.?|Range):\s*(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)',
            re.IGNORECASE
        )
        
        range_match = range_pattern.search(context)
        if range_match:
            try:
                min_val = float(range_match.group(1))
                max_val = float(range_match.group(2))
                return {"min": min_val, "max": max_val}
            except ValueError:
                pass
        
        return None
    
    def _normalize_test_name(self, name: str) -> str:
        """Standardize test name"""
        name_lower = name.lower().strip()
        
        # Mapping of variants to standard names
        mappings = {
            "hgb": "Hemoglobin",
            "hb": "Hemoglobin",
            "hct": "Hematocrit",
            "wbc": "White Blood Cell Count",
            "rbc": "Red Blood Cell Count",
            "plt": "Platelet Count",
            "hba1c": "Hemoglobin A1c",
            "tsh": "Thyroid Stimulating Hormone",
            "alt": "ALT",
            "ast": "AST",
            "bun": "Blood Urea Nitrogen",
            "ldl": "LDL Cholesterol",
            "hdl": "HDL Cholesterol",
        }
        
        return mappings.get(name_lower, name.title())
    
    def _deduplicate_results(self, results: List[LabValue]) -> List[LabValue]:
        """Remove duplicate extractions, keeping highest confidence"""
        unique = {}
        
        for result in results:
            key = (result.test_name.lower(), result.unit)
            
            if key not in unique or result.confidence > unique[key].confidence:
                unique[key] = result
        
        return list(unique.values())


class UnitNormalizer:
    """Normalizes lab test units to standard formats"""
    
    UNIT_MAPPINGS = {
        # Glucose
        "mg/dl": "mg/dL",
        "mmol/l": "mmol/L",
        
        # Hemoglobin
        "g/dl": "g/dL",
        "g/l": "g/L",
        
        # Counts
        "cells/ul": "cells/μL",
        "x10^3/ul": "x10^3/μL",
        "x10^6/ul": "x10^6/μL",
        "x103/ul": "x10^3/μL",
        
        # Enzymes
        "iu/l": "IU/L",
        "u/l": "U/L",
    }
    
    def normalize(self, unit: str) -> str:
        """Convert unit to standard format"""
        unit_lower = unit.lower().replace(" ", "")
        return self.UNIT_MAPPINGS.get(unit_lower, unit)
    
    def convert(self, value: float, from_unit: str, to_unit: str) -> Optional[float]:
        """
        Convert value between units.
        
        Example: convert(5.5, "mmol/L", "mg/dL") for glucose
        """
        from_norm = self.normalize(from_unit).lower()
        to_norm = self.normalize(to_unit).lower()
        
        # Glucose: mmol/L ↔ mg/dL (multiply by 18)
        if from_norm == "mmol/l" and to_norm == "mg/dl":
            return value * 18.0
        elif from_norm == "mg/dl" and to_norm == "mmol/l":
            return value / 18.0
        
        # Hemoglobin: g/L ↔ g/dL (divide by 10)
        elif from_norm == "g/l" and to_norm == "g/dl":
            return value / 10.0
        elif from_norm == "g/dl" and to_norm == "g/l":
            return value * 10.0
        
        # Same unit
        elif from_norm == to_norm:
            return value
        
        # Unknown conversion
        return None


# Example usage / testing function
if __name__ == "__main__":
    parser = LabValueParser()
    
    sample_text = """
    Laboratory Results:
    
    Hemoglobin: 12.5 g/dL (Normal Range: 12-16)
    Hematocrit: 38.2% (Ref: 36-44%)
    WBC 8.5 x10^3/μL (Normal)
    Glucose - 110 mg/dL (High)
    HbA1c 5.7% (Normal Range: 4.0-5.6%)
    Creatinine: 1.1 mg/dL
    Total Cholesterol 195 mg/dL
    LDL 120 mg/dL (Ref: <100)
    HDL 45 mg/dL (Low)
    """
    
    results = parser.parse(sample_text)
    
    print(f"Extracted {len(results)} lab values:\n")
    for lab in results:
        print(f"Test: {lab.test_name}")
        print(f"  Value: {lab.value} {lab.unit}")
        if lab.normal_range:
            print(f"  Normal Range: {lab.normal_range['min']}-{lab.normal_range['max']}")
        if lab.status:
            print(f"  Status: {lab.status}")
        print(f"  Confidence: {lab.confidence}")
        print()
