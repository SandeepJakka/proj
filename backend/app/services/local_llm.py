import os
import json
from llama_cpp import Llama

# Model Configuration
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../models/MediPhi-Instruct-q4_k_m.gguf")
N_CTX = 4096  # Context window
N_GPU_LAYERS = 0 # Set to 0 for CPU only, or higher if GPU is available (optional)

class LocalMedicalLLM:
    _instance = None
    _model = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = LocalMedicalLLM()
        return cls._instance

    def __init__(self):
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Please run scripts/download_model.py first.")
        
        print(f"Loading Local Medical Model from {MODEL_PATH}...")
        self._model = Llama(
            model_path=MODEL_PATH,
            n_ctx=N_CTX,
            n_gpu_layers=N_GPU_LAYERS,
            verbose=False
        )
        print("Model loaded successfully.")

    def predict(self, symptoms: list[str], age: int = None, gender: str = None, report_summary: str = None) -> dict:
        prompt = self._construct_prompt(symptoms, age, gender, report_summary)
        
        output = self._model(
            prompt,
            max_tokens=512,
            stop=["<|end|>", "User:", "Observation:"],
            echo=False,
            temperature=0.2, # Low temperature for more deterministic/clinical results
        )
        
        response_text = output["choices"][0]["text"].strip()
        return self._parse_response(response_text)

    def _construct_prompt(self, symptoms: list[str], age: int, gender: str, report_summary: str = None) -> str:
        symptoms_str = ", ".join(symptoms) if symptoms else "None provided"
        context_str = f"Patient info: Age {age}, Gender {gender}." if age and gender else ""
        report_context = f"Medical Report Summary:\n{report_summary}\n" if report_summary else ""
        
        # Phi-3 / MediPhi Instruct Template
        # <|user|>\n{prompt} <|end|>\n<|assistant|>\n
        
        system_msg = (
            "You are a helpful medical assistant. "
            "Analyze the symptoms and/or report summary and provide structured medical reasoning. "
            "IMPORTANT: Prioritize the 'Medical Report Summary' over the health profile context. "
            "Do NOT diagnose. Do NOT prescribe. "
            "Output MUST be strict JSON with keys: 'findings' (list), 'explanation' (string), 'confidence' (low/medium/high)."
        )

        user_msg = (
            f"{context_str}\n"
            f"{report_context}"
            f"Symptoms: {symptoms_str}\n\n"
            "Provide a clinical assessment in JSON format."
        )

        full_prompt = (
            f"<|system|>\n{system_msg} <|end|>\n"
            f"<|user|>\n{user_msg} <|end|>\n"
            f"<|assistant|>\n"
        )
        return full_prompt

    def _parse_response(self, text: str) -> dict:
        try:
            # Attempt to find JSON in the output
            start_idx = text.find("{")
            end_idx = text.rfind("}")
            
            if start_idx != -1 and end_idx != -1:
                json_str = text[start_idx : end_idx + 1]
                return json.loads(json_str)
            else:
                # Fallback if no JSON found
                return {
                    "findings": ["Could not parse specific findings"],
                    "explanation": text[:200] + "...",
                    "confidence": "low"
                }
        except json.JSONDecodeError:
            return {
                "findings": ["Error parsing model output"],
                "explanation": "The model produced invalid JSON.",
                "confidence": "low"
            }
    def generate_raw(self, system_prompt: str, user_prompt: str, max_tokens=1024) -> str:
        """
        Generic generation method for non-diagnostic tasks (e.g., lifestyle, summaries).
        """
        full_prompt = (
            f"<|system|>\n{system_prompt} <|end|>\n"
            f"<|user|>\n{user_prompt} <|end|>\n"
            f"<|assistant|>\n"
        )
        
        output = self._model(
            full_prompt,
            max_tokens=max_tokens,
            stop=["<|end|>", "User:", "Observation:"],
            echo=False,
            temperature=0.7, # Higher temperature for creative tasks like meal planning
        )
        return output["choices"][0]["text"].strip()
