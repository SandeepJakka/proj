"""
OutputSafetyGuard - Centralized validation for all AI-generated medical content

This module provides multi-layer safety validation to prevent:
1. Unauthorized medical diagnoses
2. Emergency symptom detection without proper guidance
3. Hallucinated or implausible medical claims
4. Prescription/dosage suggestions

All LLM outputs MUST pass through this guard before frontend display.
"""

import re
from typing import Dict, List, Optional
from enum import Enum


class SafetyAction(Enum):
    """Actions to take based on safety validation"""
    DISPLAY = "display"  # Safe to show as-is
    SANITIZE = "sanitize"  # Redact problematic parts
    BLOCK = "block"  # Do not display
    EMERGENCY_REDIRECT = "emergency_redirect"  # Show emergency guidance


class OutputSafetyGuard:
    """
    Validates all AI-generated medical content before user display.
    
    Usage:
        guard = OutputSafetyGuard()
        result = guard.validate(llm_output, user_input_context)
        
        if result["action"] == SafetyAction.EMERGENCY_REDIRECT:
            return emergency_response()
        else:
            return result["sanitized_text"]
    """
    
    # Medical diagnoses - only block if AI is making NEW diagnosis
    FORBIDDEN_DIAGNOSES = [
        # Only severe conditions that need immediate care
        "heart attack", "myocardial infarction", "stroke",
        "pulmonary embolism", "sepsis", "anaphylaxis",
        "cancer", "carcinoma", "lymphoma", "leukemia",
    ]
    
    # Emergency symptoms requiring immediate medical attention
    EMERGENCY_PATTERNS = [
        # Cardiac
        r'\b(chest pain|crushing chest|chest pressure)\b.*\b(arm|jaw|shoulder)\b',
        r'\bsevere chest pain\b',
        
        # Respiratory
        r'\b(difficulty breathing|can\'?t breathe|gasping for air)\b',
        r'\bsevere shortness of breath\b',
        
        # Neurological
        r'\b(sudden weakness|face drooping|can\'?t speak)\b',
        r'\b(severe headache|worst headache)\b',
        r'\b(loss of consciousness|passed out|blacked out)\b',
        r'\b(confusion|disoriented|slurred speech)\b',
        
        # Bleeding
        r'\b(severe bleeding|uncontrolled bleeding|heavy bleeding)\b',
        r'\b(coughing up blood|vomiting blood)\b',
        
        # Trauma
        r'\b(severe injury|major trauma|serious accident)\b',
        
        # Other critical
        r'\b(suicide|suicidal thoughts|want to die)\b',
        r'\b(severe pain|pain 10/10|unbearable pain)\b',
    ]
    
    # Prescription/dosage patterns - allow OTC mentions
    PRESCRIPTION_PATTERNS = [
        r'\bprescribe\b',
        r'\b\d+\s?mg of (prescription|rx)\b',
    ]
    
    # Implausible medical values (hallucination detection)
    IMPLAUSIBLE_PATTERNS = [
        r'\bhemoglobin:?\s*(0|[0-2]\d|30|40|50)\b',  # Normal: 12-18 g/dL
        r'\bglucose:?\s*(500|600|700|800|900)\b',  # Extremely high
        r'\bblood pressure:?\s*(300|400|500)/\d+\b',  # Impossible BP
        r'\bheart rate:?\s*(300|400|500)\b',  # Impossible HR
        r'\btemperature:?\s*(20|25|50|60)\b',  # Impossible temp in Celsius
    ]
    
    def __init__(self):
        """Initialize the safety guard with compiled regex patterns"""
        self.emergency_regexes = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in self.EMERGENCY_PATTERNS
        ]
        self.prescription_regexes = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.PRESCRIPTION_PATTERNS
        ]
        self.implausible_regexes = [
            re.compile(pattern, re.IGNORECASE)
            for pattern in self.IMPLAUSIBLE_PATTERNS
        ]
    
    def validate(self, 
                 text: str, 
                 user_context: str = "",
                 allow_emergencies: bool = False) -> Dict:
        """
        Validate AI-generated text for safety.
        
        Args:
            text: The LLM-generated output to validate
            user_context: Original user input (to allow mirroring of user's own terms)
            allow_emergencies: If True, doesn't redirect emergencies (for testing)
        
        Returns:
            {
                "safe": bool,
                "action": SafetyAction,
                "sanitized_text": str,
                "flags": List[str],
                "original_text": str
            }
        """
        flags = []
        sanitized = text
        action = SafetyAction.DISPLAY
        
        # Normalize for comparison
        text_lower = text.lower()
        context_lower = user_context.lower()
        
        # 1. EMERGENCY DETECTION (highest priority)
        if not allow_emergencies:
            emergency_detected = self._check_emergency(text_lower)
            if emergency_detected:
                return {
                    "safe": False,
                    "action": SafetyAction.EMERGENCY_REDIRECT,
                    "sanitized_text": self._get_emergency_message(),
                    "flags": ["emergency_detected"],
                    "original_text": text,
                    "emergency_type": emergency_detected
                }
        
        # 2. DIAGNOSIS DETECTION
        diagnosis_flags = self._check_diagnoses(text_lower, context_lower)
        if diagnosis_flags:
            flags.extend(diagnosis_flags)
            sanitized = self._redact_diagnoses(sanitized, context_lower)
            action = SafetyAction.SANITIZE
        
        # 3. PRESCRIPTION DETECTION
        if self._check_prescriptions(text_lower):
            flags.append("prescription_detected")
            sanitized = self._redact_prescriptions(sanitized)
            action = SafetyAction.SANITIZE
        
        # 4. HALLUCINATION DETECTION
        if self._check_implausible_values(text_lower):
            flags.append("implausible_values")
            # Don't auto-redact, but flag for logging
        
        # 5. CONFIDENCE CHECK
        if self._is_low_confidence(text_lower):
            flags.append("low_confidence")
        
        # Determine final safety status
        safe = len(flags) == 0 or all(f in ["low_confidence", "implausible_values"] for f in flags)
        
        return {
            "safe": safe,
            "action": action,
            "sanitized_text": sanitized,
            "flags": flags,
            "original_text": text
        }
    
    def _check_emergency(self, text: str) -> Optional[str]:
        """Check if text contains emergency symptoms"""
        for pattern in self.emergency_regexes:
            match = pattern.search(text)
            if match:
                return match.group(0)
        return None
    
    def _check_diagnoses(self, text: str, context: str) -> List[str]:
        """Check for forbidden diagnosis terms"""
        flags = []
        for diagnosis in self.FORBIDDEN_DIAGNOSES:
            if diagnosis in text:
                # Allow if user mentioned it first (mirroring)
                if diagnosis not in context:
                    flags.append(f"diagnosis:{diagnosis}")
        return flags
    
    def _check_prescriptions(self, text: str) -> bool:
        """Check for prescription/dosage suggestions"""
        for pattern in self.prescription_regexes:
            if pattern.search(text):
                return True
        return False
    
    def _check_implausible_values(self, text: str) -> bool:
        """Check for hallucinated medical values"""
        for pattern in self.implausible_regexes:
            if pattern.search(text):
                return True
        return False
    
    def _is_low_confidence(self, text: str) -> bool:
        """Check if output indicates low confidence"""
        low_confidence_markers = [
            "not sure", "uncertain", "may be", "might be",
            "possibly", "potentially", "unclear",
            "insufficient information", "cannot determine"
        ]
        return any(marker in text for marker in low_confidence_markers)
    
    def _redact_diagnoses(self, text: str, context: str) -> str:
        """Redact diagnosis terms not present in user context"""
        context_lower = context.lower()
        
        for diagnosis in self.FORBIDDEN_DIAGNOSES:
            if diagnosis in text.lower() and diagnosis not in context_lower:
                # Replace with safe alternative
                replacement = "a medical condition that requires professional evaluation"
                pattern = re.compile(re.escape(diagnosis), re.IGNORECASE)
                text = pattern.sub(replacement, text)
        
        return text
    
    def _redact_prescriptions(self, text: str) -> str:
        """Redact prescription suggestions"""
        for pattern in self.prescription_regexes:
            text = pattern.sub("[REDACTED: Consult physician for dosage]", text)
        return text
    
    def _get_emergency_message(self) -> str:
        """Return emergency guidance message"""
        return (
            "⚠️ **EMERGENCY GUIDANCE NEEDED**\n\n"
            "Your symptoms suggest a potentially urgent medical situation.\n\n"
            "**Please take immediate action:**\n"
            "- If severe: Call emergency services (911 in US) or go to ER\n"
            "- If moderate: Contact your doctor or urgent care clinic now\n"
            "- Do not rely on AI for emergency medical decisions\n\n"
            "This AI assistant is not a substitute for emergency medical care."
        )


# Singleton instance for application-wide use
_guard_instance = None

def get_safety_guard() -> OutputSafetyGuard:
    """Get or create singleton safety guard instance"""
    global _guard_instance
    if _guard_instance is None:
        _guard_instance = OutputSafetyGuard()
    return _guard_instance
