import re
import json
import time
from typing import Dict, Any
from dotenv import load_dotenv

# Importam configuratia si template-urile de prompt
from .config import AI_PROVIDER, MODEL_PATH, LLM_CPU_THREADS, OPENAI_API_KEY, OPENAI_MODEL_NAME
from .prompts import json_fixer_prompt_template

# =============================================================================
# Sectiunea 1: Initializarea Conditionata a Provider-ului AI
# =============================================================================
load_dotenv()
llm_provider = None

if AI_PROVIDER == "mock":
    class MockLlama:
        """
        O clasa mock care simuleaza Llama.cpp pentru dezvoltare rapida.
        Returneaza un raspuns structurat instantaneu, bazat pe o logica simpla.
        """

        def __init__(self, *args, **kwargs):
            print("\n" + "=" * 50)
            print("--- INITIALIZARE MODUL AI IN MODUL MOCK ---")
            print("--- RASPUNSURILE VOR FI INSTANTANEE SI SIMULATE ---")
            print("=" * 50)

        def __call__(self, prompt_text: str, *args, **kwargs) -> Dict[str, Any]:
            """Simuleaza un apel catre LLM, parsand prompt-ul si generand un raspuns logic."""
            time.sleep(0.1)  # Simulam o mica intarziere

            # Simulare pentru prompt-ul de corectare JSON
            if "### BROKEN JSON TEXT ###" in prompt_text:
                match = re.search(r'\{.*\}', prompt_text, re.DOTALL)
                if match:
                    # O reparare simplista, dar suficienta pentru majoritatea cazurilor de test
                    fixed_json_str = match.group(0).replace(",\nnant_value\"", ',\n"nant_value"').replace("ran",
                                                                                                          "justification")
                    return {"choices": [{"text": fixed_json_str}]}
                return {"choices": [{"text": "{}"}]}

            # Simulare pentru prompt-ul principal de analiza
            conflicts_str_match = re.search(r'### CONFLICTING DATA ###\s*(\{.*?\})', prompt_text, re.DOTALL)
            if not conflicts_str_match:
                return {"choices": [{"text": '{"human_review_required": true, "resolved_conflicts": {}}'}]}

            conflicts = json.loads(conflicts_str_match.group(1))
            resolved = {}
            human_review_needed = False

            for field, values in conflicts.items():
                val_a = values.get("value_A")
                val_b = values.get("value_B")

                if field == "email" and isinstance(val_a, str) and isinstance(val_b, str):
                    user_a, _ = val_a.split('@', 1)
                    user_b, _ = val_b.split('@', 1)
                    if user_a != user_b:
                        human_review_needed = True
                        resolved[field] = {
                            "chosen_value": "NEEDS_HUMAN_REVIEW",
                            "justification": "MOCK: Usernames are different."
                        }
                    else:
                        resolved[field] = {"chosen_value": val_b,
                                           "justification": "MOCK: Email usernames match, chose value B."}
                elif field == "first_name" and isinstance(val_a, str) and isinstance(val_b, str):
                    chosen = val_b if len(val_b) >= len(val_a) else val_a
                    resolved[field] = {"chosen_value": chosen, "justification": "MOCK: Chose longer name."}
                else:
                    resolved[field] = {"chosen_value": val_b, "justification": "MOCK: Default choice (value B)."}

            mock_response = {
                "human_review_required": human_review_needed,
                "resolved_conflicts": resolved
            }
            return {"choices": [{"text": json.dumps(mock_response, indent=2)}]}


    llm_provider = MockLlama()

elif AI_PROVIDER == "openai":
    try:
        from openai import OpenAI

        if not OPENAI_API_KEY:
            raise ValueError("Variabila de mediu 'OPENAI_API_KEY' nu este setata.")
        llm_provider = OpenAI(api_key=OPENAI_API_KEY)
        print(f"\nINFO: Provider-ul AI este setat pe 'openai', folosind modelul '{OPENAI_MODEL_NAME}'.")
    except ImportError:
        print("EROARE: Pachetul 'openai' nu este instalat. Rulati 'pip install openai'.")
        llm_provider = None
    except ValueError as e:
        print(f"EROARE DE CONFIGURARE OPENAI: {e}")
        llm_provider = None

elif AI_PROVIDER == "local":
    try:
        from llama_cpp import Llama

        print("\nSe incarca modelul LLM local in memorie (poate dura)...")
        llm_provider = Llama(
            model_path=MODEL_PATH,
            n_gpu_layers=0,
            n_ctx=4096,
            n_threads=LLM_CPU_THREADS,
            verbose=False
        )
        print("Modelul local a fost incarcat cu succes.")
    except ImportError:
        print("EROARE: Pachetul 'llama-cpp-python' nu este instalat.")
        llm_provider = None
    except Exception as e:
        print(f"EROARE CRITICA la incarcarea modelului local: {e}")
        llm_provider = None

else:
    print(f"EROARE: Provider-ul AI '{AI_PROVIDER}' nu este recunoscut. Optiuni valide: 'local', 'openai', 'mock'.")


# =============================================================================
# Sectiunea 2: Functii Helper pentru Apelarea Provider-ilor si Dispatcher
# =============================================================================

def _parse_prompt_for_openai(prompt_text: str) -> list:
    """Transforma prompt-ul nostru cu tag-uri in formatul de mesaje OpenAI."""
    system_match = re.search(r'<\|system\|>(.*?)<\|end\|>', prompt_text, re.DOTALL)
    user_match = re.search(r'<\|user\|>(.*?)<\|end\|>', prompt_text, re.DOTALL)

    system_content = system_match.group(1).strip() if system_match else "You are a helpful assistant."
    user_content = user_match.group(1).strip() if user_match else prompt_text

    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_content}
    ]


def _run_openai_inference(prompt_text: str) -> Dict[str, Any]:
    """Apeleaza API-ul OpenAI si formateaza raspunsul pentru a fi consistent."""
    messages = _parse_prompt_for_openai(prompt_text)
    completion = llm_provider.chat.completions.create(
        model=OPENAI_MODEL_NAME,
        messages=messages,
        temperature=0.0,
        max_tokens=1024,
        response_format={"type": "json_object"}
    )
    response_text = completion.choices[0].message.content
    return {"choices": [{"text": response_text}]}


def _run_local_llm_inference(prompt_text: str) -> Dict[str, Any]:
    """Apeleaza modelul local Llama.cpp (sau clasa mock)."""
    return llm_provider(prompt_text, max_tokens=1024, temperature=0.0, stop=["<|end|>"])


def run_llm_inference(prompt_text: str) -> Dict[str, Any]:
    """
    Dispatcher-ul principal. Apeleaza provider-ul AI corect pe baza configuratiei.
    """
    if not llm_provider:
        raise RuntimeError(
            f"Provider-ul AI '{AI_PROVIDER}' nu a fost initializat corect. Verificati configuratia si log-urile de la pornire.")

    if AI_PROVIDER == "openai":
        return _run_openai_inference(prompt_text)

    # 'local' si 'mock' au aceeasi interfata de apel
    return _run_local_llm_inference(prompt_text)


# =============================================================================
# Sectiunea 3: Functii Comune de Procesare a Raspunsului
# =============================================================================

def extract_json_from_llm_output(raw_text: str) -> str:
    """Extrage primul bloc JSON valid dintr-un text care ar putea contine artefacte."""
    match = re.search(r'\{.*\}', raw_text, re.DOTALL)
    if match:
        return match.group(0)
    return raw_text


def validate_email_decision(decision: Dict[str, Any], conflicting_data: Dict[str, Any]) -> Dict[str, Any]:
    """Plasa de siguranta: Suprascrie decizia AI pentru 'email' DACA username-urile sunt diferite."""
    if "email" in decision.get("resolved_conflicts", {}):
        email_conflict = conflicting_data.get("email", {})
        val_a = email_conflict.get("value_A")
        val_b = email_conflict.get("value_B")

        if isinstance(val_a, str) and isinstance(val_b, str) and '@' in val_a and '@' in val_b:
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


def parse_and_correct_response(initial_output: Dict[str, Any], conflicting_data: Dict[str, Any]) -> Dict[str, Any]:
    """Incearca sa parseze raspunsul. Daca esueaza, ruleaza ciclul de auto-corectare."""
    try:
        raw_response_text = initial_output['choices'][0]['text']
        clean_json_str = extract_json_from_llm_output(raw_response_text)
        decision = json.loads(clean_json_str)
    except (json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"INFO: Raspunsul initial nu a fost valid. Eroare: {e}. Se incearca auto-corectarea...")

        fixer_prompt = json_fixer_prompt_template.format(
            broken_json_str=clean_json_str if 'clean_json_str' in locals() else raw_response_text,
            error_message=str(e)
        )

        try:
            fixer_output = run_llm_inference(fixer_prompt)
            corrected_text = fixer_output['choices'][0]['text']
            decision = json.loads(extract_json_from_llm_output(corrected_text))
            print("INFO: Auto-corectarea a reusit.")
        except (json.JSONDecodeError, KeyError, IndexError, RuntimeError) as final_e:
            print(f"EROARE: Auto-corectarea a esuat. Eroare finala: {final_e}")
            return None

    return validate_email_decision(decision, conflicting_data)