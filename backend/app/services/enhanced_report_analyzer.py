"""
Enhanced Report Analysis Pipeline

Integrates deterministic components:
1. LabValueParser - Extract numeric values
2. ReferenceRangeEngine - Benchmark against clinical standards
3. Database storage - Structured lab values for trends

This replaces pure LLM-based analysis with hybrid deterministic + AI approach.
"""

from sqlalchemy.orm import Session
from typing import Dict, List
import json

from app.services.lab_parser import LabValueParser
from app.services.reference_ranges import ReferenceRangeEngine, LabStatus
from app.services.ner_service import extract_entities
from app.services.local_llm import LocalMedicalLLM


class EnhancedReportAnalyzer:
    """
    Multi-stage report analysis pipeline.
    
    Stage 1: Deterministic numeric extraction (LabValueParser)
    Stage 2: Clinical benchmarking (ReferenceRangeEngine)
    Stage 3: AI narrative generation (LocalMedicalLLM)
    """
    
    def __init__(self):
        self.lab_parser = LabValueParser()
        self.ref_engine = ReferenceRangeEngine()
        self.ner = extract_entities
        self.llm = None  # Lazy load
    
    def analyze_report(self,
                      raw_text: str,
                      user_gender: str = None,
                      user_age: int = None) -> Dict:
        """
        Comprehensive report analysis.
        
        Returns:
            {
                "lab_values": [LabValue objects],
                "clinical_summary": str,
                "entities": dict,
                "risk_flags": list,
                "ai_narrative": str
            }
        """
        
        # Stage 1: Extract numeric lab values (deterministic)
        lab_values = self.lab_parser.parse(raw_text, extract_ranges=True)
        
        # Stage 2: Benchmark against reference ranges (deterministic)
        evaluations = []
        risk_flags = []
        
        for lab in lab_values:
            evaluation = self.ref_engine.evaluate(
                test_name=lab.test_name,
                value=lab.value,
                unit=lab.unit,
                gender=user_gender,
                age=user_age
            )
            evaluations.append(evaluation)
            
            # Flag critical values
            if evaluation.status in [LabStatus.CRITICAL_LOW, LabStatus.CRITICAL_HIGH]:
                risk_flags.append({
                    "test": lab.test_name,
                    "value": lab.value,
                    "status": evaluation.status.value,
                    "interpretation": evaluation.interpretation
                })
        
        # Stage 3: Extract entities (for context)
        entities = self.ner(raw_text)
        
        # Stage 4: Generate clinical summary (deterministic from evaluations)
        clinical_summary = self._generate_clinical_summary(evaluations)
        
        # Stage 5: AI narrative (optional enhancement)
        ai_narrative = self._generate_ai_narrative(
            lab_values, evaluations, entities, raw_text
        )
        
        return {
            "lab_values": lab_values,
            "evaluations": evaluations,
            "clinical_summary": clinical_summary,
            "entities": entities,
            "risk_flags": risk_flags,
            "ai_narrative": ai_narrative
        }
    
    def _generate_clinical_summary(self, evaluations: List) -> str:
        """Generate summary from deterministic evaluations"""
        
        normal_count = sum(1 for e in evaluations if e.status == LabStatus.NORMAL)
        abnormal_count = len(evaluations) - normal_count
        
        critical = [e for e in evaluations if e.status in [LabStatus.CRITICAL_LOW, LabStatus.CRITICAL_HIGH]]
        high_severity = [e for e in evaluations if e.severity and e.severity.value == "severe"]
        
        lines = []
        lines.append(f"**Lab Results Summary:**")
        lines.append(f"- Total tests analyzed: {len(evaluations)}")
        lines.append(f"- Within normal range: {normal_count}")
        lines.append(f"- Outside normal range: {abnormal_count}")
        
        if critical:
            lines.append(f"\n⚠️ **CRITICAL VALUES DETECTED:**")
            for e in critical:
                lines.append(f"  - {e.test_name}: {e.value} {e.unit} ({e.status.value.upper()})")
                lines.append(f"    {e.interpretation}")
        
        if high_severity and not critical:
            lines.append(f"\n**High Severity Findings:**")
            for e in high_severity:
                lines.append(f"  - {e.test_name}: {e.value} {e.unit} - {e.interpretation}")
        
        return "\n".join(lines)
    
    def _generate_ai_narrative(self, lab_values, evaluations, entities, raw_text) -> str:
        """Generate narrative using local LLM for context and explanation"""
        
        # Only use LLM if we have structured data to validate against
        if not lab_values:
            return "Insufficient structured data for AI narrative."
        
        # Lazy load LLM
        if self.llm is None:
            try:
                self.llm = LocalMedicalLLM.get_instance()
            except Exception as e:
                return f"AI narrative unavailable: {str(e)}"
        
        # Prepare structured context
        structured_findings = []
        for eval in evaluations:
            structured_findings.append(
                f"{eval.test_name}: {eval.value} {eval.unit} - {eval.status.value}"
            )
        
        system_prompt = (
            "You are a medical data interpreter. Given structured lab results, "
            "provide a concise, patient-friendly explanation. Focus on what the results mean "
            "and general health context. Do NOT diagnose. Do NOT prescribe."
        )
        
        user_prompt = (
            f"Lab Results:\n" +
            "\n".join(structured_findings) +
            "\n\nProvide a brief, educational explanation of these results."
        )
        
        try:
            narrative = self.llm.generate_raw(system_prompt, user_prompt, max_tokens=400)
            return narrative.strip()
        except Exception as e:
            return f"AI narrative generation failed: {str(e)}"
    
    def save_lab_values_to_db(self,
                             db: Session,
                             report_id: int,
                             user_id: int,
                             lab_values: List,
                             evaluations: List):
        """
        Save structured lab values to database for trend analysis.
        
        Note: This requires importing the LabValue model and using crud operations
        """
        from app.db.models_lab_values import LabValue as LabValueModel
        
        for lab, eval in zip(lab_values, evaluations):
            db_lab_value = LabValueModel(
                report_id=report_id,
                user_id=user_id,
                test_name=lab.test_name,
                value=lab.value,
                unit=lab.unit,
                normal_range_min=lab.normal_range["min"] if lab.normal_range else None,
                normal_range_max=lab.normal_range["max"] if lab.normal_range else None,
                status=eval.status.value if eval.status else None,
                severity=eval.severity.value if eval.severity else None,
                delta=eval.delta,
                interpretation=eval.interpretation,
                extraction_confidence=lab.confidence,
                raw_text=lab.raw_text,
                evaluation_details=json.dumps({
                    "reference_range": {
                        "min": eval.reference_range.min_value,
                        "max": eval.reference_range.max_value,
                        "unit": eval.reference_range.unit
                    } if eval.reference_range else None
                })
            )
            db.add(db_lab_value)
        
        db.commit()


# Convenience function for report upload pipeline
def analyze_and_store_report(db: Session,
                             report_id: int,
                             user_id: int,
                             raw_text: str,
                             user_gender: str = None,
                             user_age: int = None) -> Dict:
    """
    Complete pipeline: analyze report and store structured data.
    
    This should be called after OCR extraction in the report upload flow.
    """
    analyzer = EnhancedReportAnalyzer()
    
    # Analyze
    analysis = analyzer.analyze_report(raw_text, user_gender, user_age)
    
    # Store structured lab values
    if analysis["lab_values"] and analysis["evaluations"]:
        analyzer.save_lab_values_to_db(
            db, report_id, user_id,
            analysis["lab_values"],
            analysis["evaluations"]
        )
    
    return analysis
