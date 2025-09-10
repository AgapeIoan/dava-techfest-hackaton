import re
import json
from llama_cpp import Llama
from .config import MODEL_PATH, LLM_CPU_THREADS, USE_MOCK_LLM
from .prompts import json_fixer_prompt_template

class MockLlama:
    """
    O clasa mock care simuleaza Llama.cpp pentru dezvoltare rapida.
    Returneaza un raspuns structurat instantaneu, bazat pe o logica simpla.
    """
    def __init__(self, *args, **kwargs):
        print("="*50)
        print("--- INITIALIZARE MODUL AI IN MODUL MOCK ---")
        print("--- RASPUNSURILE VOR FI INSTANTANEE SI SIMULATE ---")
        print("="*50)

    def __call__(self, prompt_text: str, *args, **kwargs):
        """Simuleaza un apel catre LLM, parsand prompt-ul si generand un raspuns logic."""
        time.sleep(0.1) # Simulam o mica intarziere de retea

        # Daca este un prompt de corectare JSON, il reparam simplu
        if "### BROKEN JSON TEXT ###" in prompt_text:
            match = re.search(r'\{.*\}', prompt_text, re.DOTALL)
            if match:
                # O reparare simplista, dar suficienta pentru majoritatea cazurilor
                fixed_json_str = match.group(0).replace(",\nnant_value\"", ',\n"nant_value"').replace("ran", "justification")
                return {"choices": [{"text": fixed_json_str}]}
            return {"choices": [{"text": "{}"}]}

        # Daca este un prompt de analiza, simulam logica
        conflicts_str_match = re.search(r'### CONFLICTING DATA ###\s*(\{.*?\})', prompt_text, re.DOTALL)
        if not conflicts_str_match:
            return {"choices": [{"text": '{"human_review_required": true, "resolved_conflicts": {}}'}]}

        conflicts = json.loads(conflicts_str_match.group(1))
        resolved = {}
        human_review_needed = False

        for field, values in conflicts.items():
            val_a = values.get("value_A")
            val_b = values.get("value_B")
            
            if field == "email":
                user_a, _ = (val_a or "@").split('@', 1)
                user_b, _ = (val_b or "@").split('@', 1)
                if user_a != user_b:
                    human_review_needed = True
                    resolved[field] = {
                        "chosen_value": "NEEDS_HUMAN_REVIEW",
                        "justification": "MOCK: Usernames are different."
                    }
                else:
                    resolved[field] = {"chosen_value": val_b, "justification": "MOCK: Default choice."}
            elif field == "first_name":
                # Alege numele mai lung, o regula simpla
                chosen = val_b if len(str(val_b)) >= len(str(val_a)) else val_a
                resolved[field] = {"chosen_value": chosen, "justification": "MOCK: Chose longer name."}
            else:
                # Pentru orice altceva, alege valoarea din record-ul B
                resolved[field] = {"chosen_value": val_b, "justification": "MOCK: Default choice (value B)."}

        mock_response = {
            "human_review_required": human_review_needed,
            "resolved_conflicts": resolved
        }
        
        return {"choices": [{"text": json.dumps(mock_response, indent=2)}]}
    
llm = None
if USE_MOCK_LLM:
    llm = MockLlama()
else:
    try:
        from llama_cpp import Llama
        print("Se incarca modelul LLM real in memorie (poate dura)...")
        llm = Llama(
            model_path=MODEL_PATH,
            n_gpu_layers=0,
            n_ctx=4096,
            n_threads=LLM_CPU_THREADS,
            verbose=False
        )
        print("Modelul real a fost incarcat cu succes.")
    except ImportError:
        print("EROARE: Pachetul 'llama-cpp-python' nu este instalat.")
        print("Rulati 'pip install -r requirements.txt' sau setati USE_MOCK_LLM=True.")
    except Exception as e:
        print(f"EROARE CRITICA: Nu s-a putut incarca modelul de la calea: {MODEL_PATH}")
        print(f"Asigurati-va ca ati rulat 'python download_model.py' intai.")
        print(f"Detalii eroare: {e}")

def run_llm_inference(prompt_text):
    """Ruleaza LLM-ul cu un prompt dat si returneaza output-ul brut."""
    if not llm:
        raise RuntimeError("Modelul LLM nu a fost initializat corect.")
    return llm(prompt_text, max_tokens=1024, temperature=0.0, stop=["<|end|>"])

def extract_json_from_llm_output(raw_text: str) -> str:
    """Extrage primul bloc JSON valid dintr-un text care ar putea contine artefacte."""
    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match: return match.group(0)
    return raw_text

def validate_email_decision(decision, conflicting_data):
    """Plasa de siguranta: Suprascrie decizia AI pentru 'email' DACA username-urile sunt diferite."""
    if "email" in decision.get("resolved_conflicts", {}):
        email_conflict = conflicting_data.get("email", {})
        val_a = email_conflict.get("value_A")
        val_b = email_conflict.get("value_B")

        if isinstance(val_a, str) and isinstance(val_b, str):
            if '@' in val_a and '@' in val_b:
                user_a, _ = val_a.split('@', 1)
                user_b, _ = val_b.split('@', 1)

                if user_a != user_b:
                    email_res = decision["resolved_conflicts"]["email"]
                    if email_res.get("chosen_value") != "NEEDS_HUMAN_REVIEW":
                        print("INFO: Logica de cod a suprascris decizia AI pentru email.")
                        email_res["chosen_value"] = "NEEDS_HUMAN_REVIEW"
                        email_res["justification"] = "CODE OVERRIDE: Usernames are different, choice is ambiguous."
                        decision["human_review_required"] = True
    return decision

def parse_and_correct_response(initial_output, conflicting_data):
    """Incearca sa parseze raspunsul. Daca esueaza, ruleaza ciclul de auto-corectare."""
    raw_response_text = initial_output['choices'][0]['text']
    clean_json_str = extract_json_from_llm_output(raw_response_text)
    
    try:
        decision = json.loads(clean_json_str)
    except json.JSONDecodeError as e:
        print(f"INFO: Raspunsul initial nu a fost valid. Eroare: {e}. Se incearca auto-corectarea...")
        fixer_prompt = json_fixer_prompt_template.format(broken_json_str=clean_json_str, error_message=str(e))
        fixer_output = run_llm_inference(fixer_prompt)
        try:
            corrected_text = fixer_output['choices'][0]['text']
            decision = json.loads(extract_json_from_llm_output(corrected_text))
            print("INFO: Auto-corectarea a reusit.")
        except (json.JSONDecodeError, KeyError, IndexError) as final_e:
            print(f"EROARE: Auto-corectarea a esuat. Eroare finala: {final_e}")
            return None
            
    return validate_email_decision(decision, conflicting_data)