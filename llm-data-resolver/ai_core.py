import re
import json
from llama_cpp import Llama
from config import MODEL_PATH, LLM_CPU_THREADS
from prompts import json_fixer_prompt_template

# Initializarea modelului LLM (incarcat o singura data la importul modulului)
print("Se incarca modelul LLM in memorie...")
try:
    llm = Llama(
        model_path=MODEL_PATH,
        n_gpu_layers=0,  # Forteaza rularea pe CPU
        n_ctx=4096,
        n_threads=LLM_CPU_THREADS,
        verbose=False
    )
    print("Modelul a fost incarcat cu succes.")
except Exception as e:
    print(f"EROARE CRITICA: Nu s-a putut incarca modelul de la calea: {MODEL_PATH}")
    print(f"Asigurati-va ca ati rulat 'python download_model.py' intai.")
    print(f"Detalii eroare: {e}")
    llm = None

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