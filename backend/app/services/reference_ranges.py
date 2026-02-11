"""
ReferenceRangeEngine - Deterministic clinical reference ranges for lab values

This module provides medical reference ranges for common lab tests, with support for:
- Age-specific ranges
- Gender-specific ranges
- Deterministic status evaluation (low/normal/high)
- Severity assessment

This is a DETERMINISTIC engine - no LLMs involved in clinical benchmarking.

Data sources: Standard clinical references (Mayo Clinic, LabCorp, Quest Diagnostics)
"""

from typing import Dict, Optional, List
from dataclasses import dataclass
from enum import Enum


class LabStatus(Enum):
    """Lab value status relative to reference range"""
    CRITICAL_LOW = "critical_low"
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL_HIGH = "critical_high"
    UNKNOWN = "unknown"


class Severity(Enum):
    """Clinical severity of abnormal values"""
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


@dataclass
class ReferenceRange:
    """Reference range for a lab test"""
    test_name: str
    min_value: float
    max_value: float
    unit: str
    critical_low: Optional[float] = None  # Life-threatening low
    critical_high: Optional[float] = None  # Life-threatening high
    gender: Optional[str] = None  # "male", "female", None = both
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    source: str = "Clinical standards"


@dataclass
class LabEvaluation:
    """Result of evaluating a lab value against reference range"""
    test_name: str
    value: float
    unit: str
    status: LabStatus
    reference_range: ReferenceRange
    delta: Optional[float] = None  # Difference from nearest boundary
    severity: Optional[Severity] = None
    interpretation: str = ""


class ReferenceRangeEngine:
    """
    Deterministic clinical benchmarking for lab values.
    
    Usage:
        engine = ReferenceRangeEngine()
        evaluation = engine.evaluate(
            test_name="Hemoglobin",
            value=9.5,
            unit="g/dL",
            gender="female",
            age=35
        )
        
        print(evaluation.status)  # LabStatus.LOW
        print(evaluation.interpretation)  # "Below normal range by 2.5 g/dL"
    """
    
    def __init__(self):
        """Initialize with standard reference ranges"""
        self.ranges = self._load_reference_ranges()
    
    def _load_reference_ranges(self) -> Dict[str, List[ReferenceRange]]:
        """
        Load standard clinical reference ranges.
        
        Sources:
        - Mayo Clinic Reference Values
        - LabCorp Test Menu
        - American Association for Clinical Chemistry (AACC)
        """
        
        ranges = {
            # ===== HEMATOLOGY =====
            
            "hemoglobin": [
                ReferenceRange(
                    test_name="Hemoglobin",
                    min_value=13.5, max_value=17.5,
                    critical_low=7.0, critical_high=20.0,
                    unit="g/dL", gender="male",
                    source="Mayo Clinic"
                ),
                ReferenceRange(
                    test_name="Hemoglobin",
                    min_value=12.0, max_value=15.5,
                    critical_low=7.0, critical_high=20.0,
                    unit="g/dL", gender="female",
                    source="Mayo Clinic"
                ),
            ],
            
            "hematocrit": [
                ReferenceRange(
                    test_name="Hematocrit",
                    min_value=38.8, max_value=50.0,
                    unit="%", gender="male"
                ),
                ReferenceRange(
                    test_name="Hematocrit",
                    min_value=34.9, max_value=44.5,
                    unit="%", gender="female"
                ),
            ],
            
            "white blood cell count": [
                ReferenceRange(
                    test_name="White Blood Cell Count",
                    min_value=4.5, max_value=11.0,
                    critical_low=1.0, critical_high=30.0,
                    unit="x10^3/μL"
                ),
            ],
            
            "platelet count": [
                ReferenceRange(
                    test_name="Platelet Count",
                    min_value=150, max_value=400,
                    critical_low=20, critical_high=1000,
                    unit="x10^3/μL"
                ),
            ],
            
            # ===== METABOLIC =====
            
            "glucose": [
                ReferenceRange(
                    test_name="Glucose (Fasting)",
                    min_value=70, max_value=99,
                    critical_low=40, critical_high=400,
                    unit="mg/dL"
                ),
            ],
            
            "hemoglobin a1c": [
                ReferenceRange(
                    test_name="Hemoglobin A1c",
                    min_value=0, max_value=5.6,
                    unit="%"
                ),
            ],
            
            "creatinine": [
                ReferenceRange(
                    test_name="Creatinine",
                    min_value=0.7, max_value=1.3,
                    critical_high=5.0,
                    unit="mg/dL", gender="male"
                ),
                ReferenceRange(
                    test_name="Creatinine",
                    min_value=0.6, max_value=1.1,
                    critical_high=5.0,
                    unit="mg/dL", gender="female"
                ),
            ],
            
            "blood urea nitrogen": [
                ReferenceRange(
                    test_name="Blood Urea Nitrogen",
                    min_value=7, max_value=20,
                    critical_high=100,
                    unit="mg/dL"
                ),
            ],
            
            # ===== ELECTROLYTES =====
            
            "sodium": [
                ReferenceRange(
                    test_name="Sodium",
                    min_value=136, max_value=145,
                    critical_low=120, critical_high=160,
                    unit="mmol/L"
                ),
            ],
            
            "potassium": [
                ReferenceRange(
                    test_name="Potassium",
                    min_value=3.5, max_value=5.0,
                    critical_low=2.5, critical_high=6.5,
                    unit="mmol/L"
                ),
            ],
            
            # ===== LIPID PANEL =====
            
            "total cholesterol": [
                ReferenceRange(
                    test_name="Total Cholesterol",
                    min_value=0, max_value=200,
                    unit="mg/dL"
                ),
            ],
            
            "ldl cholesterol": [
                ReferenceRange(
                    test_name="LDL Cholesterol",
                    min_value=0, max_value=100,
                    unit="mg/dL"
                ),
            ],
            
            "hdl cholesterol": [
                ReferenceRange(
                    test_name="HDL Cholesterol",
                    min_value=40, max_value=200,
                    unit="mg/dL", gender="male"
                ),
                ReferenceRange(
                    test_name="HDL Cholesterol",
                    min_value=50, max_value=200,
                    unit="mg/dL", gender="female"
                ),
            ],
            
            "triglycerides": [
                ReferenceRange(
                    test_name="Triglycerides",
                    min_value=0, max_value=150,
                    unit="mg/dL"
                ),
            ],
            
            # ===== LIVER FUNCTION =====
            
            "alt": [
                ReferenceRange(
                    test_name="ALT",
                    min_value=7, max_value=56,
                    critical_high=400,
                    unit="U/L"
                ),
            ],
            
            "ast": [
                ReferenceRange(
                    test_name="AST",
                    min_value=10, max_value=40,
                    critical_high=400,
                    unit="U/L"
                ),
            ],
            
            # ===== THYROID =====
            
            "thyroid stimulating hormone": [
                ReferenceRange(
                    test_name="Thyroid Stimulating Hormone",
                    min_value=0.4, max_value=4.0,
                    unit="mIU/L"
                ),
            ],
            
            # ===== VITAMINS =====
            
            "vitamin d": [
                ReferenceRange(
                    test_name="Vitamin D",
                    min_value=30, max_value=100,
                    critical_low=10,
                    unit="ng/mL"
                ),
            ],
        }
        
        return ranges
    
    def evaluate(self,
                 test_name: str,
                 value: float,
                 unit: str,
                 gender: Optional[str] = None,
                 age: Optional[int] = None) -> LabEvaluation:
        """
        Evaluate a lab value against reference ranges.
        
        Args:
            test_name: Standardized test name (e.g., "Hemoglobin")
            value: Numeric value
            unit: Unit of measurement
            gender: "male" or "female" (if applicable)
            age: Patient age in years (if applicable)
        
        Returns:
            LabEvaluation with status and interpretation
        """
        # Normalize test name
        test_key = test_name.lower().strip()
        
        # Get applicable ranges
        if test_key not in self.ranges:
            return LabEvaluation(
                test_name=test_name,
                value=value,
                unit=unit,
                status=LabStatus.UNKNOWN,
                reference_range=None,
                interpretation="No reference range available for this test"
            )
        
        # Select most specific range
        ref_range = self._select_best_range(
            self.ranges[test_key],
            gender,
            age
        )
        
        # Evaluate status
        status, delta, severity = self._evaluate_status(value, ref_range)
        
        # Generate interpretation
        interpretation = self._generate_interpretation(
            value, ref_range, status, delta, severity
        )
        
        return LabEvaluation(
            test_name=ref_range.test_name,
            value=value,
            unit=unit,
            status=status,
            reference_range=ref_range,
            delta=delta,
            severity=severity,
            interpretation=interpretation
        )
    
    def _select_best_range(self,
                           ranges: List[ReferenceRange],
                           gender: Optional[str],
                           age: Optional[int]) -> ReferenceRange:
        """Select most specific reference range based on demographics"""
        
        # Try gender-specific first
        if gender:
            for r in ranges:
                if r.gender == gender.lower():
                    # Check age if specified
                    if r.age_min is not None or r.age_max is not None:
                        if age is None:
                            continue
                        if r.age_min and age < r.age_min:
                            continue
                        if r.age_max and age > r.age_max:
                            continue
                    return r
        
        # Fallback to gender-neutral range
        for r in ranges:
            if r.gender is None:
                return r
        
        # Default to first range
        return ranges[0]
    
    def _evaluate_status(self,
                        value: float,
                        ref_range: ReferenceRange) -> tuple:
        """Determine status, delta, and severity"""
        
        # Critical ranges
        if ref_range.critical_low and value < ref_range.critical_low:
            delta = value - ref_range.critical_low
            return LabStatus.CRITICAL_LOW, delta, Severity.SEVERE
        
        if ref_range.critical_high and value > ref_range.critical_high:
            delta = value - ref_range.critical_high
            return LabStatus.CRITICAL_HIGH, delta, Severity.SEVERE
        
        # Normal range
        if ref_range.min_value <= value <= ref_range.max_value:
            return LabStatus.NORMAL, 0.0, None
        
        # Low
        if value < ref_range.min_value:
            delta = value - ref_range.min_value
            
            # Determine severity
            percent_below = abs(delta) / ref_range.min_value * 100
            if percent_below > 30:
                severity = Severity.SEVERE
            elif percent_below > 15:
                severity = Severity.MODERATE
            else:
                severity = Severity.MILD
            
            return LabStatus.LOW, delta, severity
        
        # High
        if value > ref_range.max_value:
            delta = value - ref_range.max_value
            
            # Determine severity
            percent_above = delta / ref_range.max_value * 100
            if percent_above > 30:
                severity = Severity.SEVERE
            elif percent_above > 15:
                severity = Severity.MODERATE
            else:
                severity = Severity.MILD
            
            return LabStatus.HIGH, delta, severity
        
        return LabStatus.UNKNOWN, None, None
    
    def _generate_interpretation(self,
                                value: float,
                                ref_range: ReferenceRange,
                                status: LabStatus,
                                delta: Optional[float],
                                severity: Optional[Severity]) -> str:
        """Generate human-readable interpretation"""
        
        range_str = f"{ref_range.min_value}-{ref_range.max_value} {ref_range.unit}"
        
        if status == LabStatus.NORMAL:
            return f"Within normal range ({range_str})"
        
        elif status == LabStatus.LOW:
            severity_str = f"{severity.value.capitalize()} " if severity else ""
            return f"{severity_str}below normal range by {abs(delta):.1f} {ref_range.unit}. Normal: {range_str}"
        
        elif status == LabStatus.HIGH:
            severity_str = f"{severity.value.capitalize()} " if severity else ""
            return f"{severity_str}above normal range by {delta:.1f} {ref_range.unit}. Normal: {range_str}"
        
        elif status == LabStatus.CRITICAL_LOW:
            return f"⚠️ CRITICALLY LOW - Immediate medical attention may be needed. Normal: {range_str}"
        
        elif status == LabStatus.CRITICAL_HIGH:
            return f"⚠️ CRITICALLY HIGH - Immediate medical attention may be needed. Normal: {range_str}"
        
        else:
            return "Unable to interpret this value."


# Example usage
if __name__ == "__main__":
    engine = ReferenceRangeEngine()
    
    # Test cases
    tests = [
        ("Hemoglobin", 9.5, "g/dL", "female", 35),  # Low
        ("Glucose", 110, "mg/dL", None, None),  # High
        ("Hemoglobin A1c", 5.3, "%", None, None),  # Normal
        ("Potassium", 6.8, "mmol/L", None, None),  # Critical high
    ]
    
    for test_name, value, unit, gender, age in tests:
        result = engine.evaluate(test_name, value, unit, gender, age)
        
        print(f"\n{test_name}: {value} {unit}")
        print(f"  Status: {result.status.value}")
        if result.severity:
            print(f"  Severity: {result.severity.value}")
        print(f"  {result.interpretation}")
