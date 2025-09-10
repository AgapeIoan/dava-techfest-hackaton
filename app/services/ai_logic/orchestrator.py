import json
import time
from typing import List, Dict, Any
from .data_processing import normalize_record, prepare_data_for_llm
from .ai_core import run_llm_inference, parse_and_correct_response
from .prompts import prompt_template


def build_golden_record(identical_data: Dict[str, Any], validated_decision: Dict[str, Any]) -> Dict[str, Any]:
    """Reconstruieste inregistrarea finala pe baza datelor si a deciziilor validate."""
    golden_record = identical_data.copy()
    resolved_conflicts = validated_decision.get("resolved_conflicts", {})
    for field, resolution in resolved_conflicts.items():
        chosen_value = resolution.get("chosen_value")
        golden_record[field] = None if chosen_value == "NEEDS_HUMAN_REVIEW" else chosen_value
    return golden_record


def run_single_merge_iteration(record_a: Dict[str, Any], record_b: Dict[str, Any]) -> (Dict[str, Any], Dict[str, Any],
                                                                                       List[str]):
    """
    Ruleaza o singura iteratie de fuziune si returneaza rezultatul detaliat:
    (golden_record, decizie_validata, log-uri).
    """
    log_messages = []
    log_messages.append("Initiating AI merge analysis for a pair of records...")

    norm_a = normalize_record(record_a)
    norm_b = normalize_record(record_b)

    identical_data, conflicting_data = prepare_data_for_llm(norm_a, norm_b)

    if not conflicting_data:
        log_messages.append("INFO: No conflicts detected. Direct merge.")
        final_golden_record = norm_a.copy()
        final_golden_record.update(norm_b)
        return final_golden_record, {}, log_messages

    log_messages.append(f"INFO: Conflicts detected: {list(conflicting_data.keys())}")

    analysis_prompt = prompt_template.format(
        conflicting_data_str=json.dumps(conflicting_data, indent=2),
        identical_data_str=json.dumps(identical_data, indent=2)
    )

    start_time = time.time()
    initial_output = run_llm_inference(analysis_prompt)
    inference_time = time.time() - start_time
    log_messages.append(f"INFO: AI analysis completed in {inference_time:.2f} seconds.")

    validated_decision = parse_and_correct_response(initial_output, conflicting_data)

    if not validated_decision:
        log_messages.append("ERROR: AI process failed to produce a valid decision.")
        return None, None, log_messages

    final_golden_record = build_golden_record(identical_data, validated_decision)

    return final_golden_record, validated_decision, log_messages


def get_ai_merge_suggestion(list_of_records: List[dict]) -> dict:
    """
    Functia principala apelata de serviciu. Fuzioneaza iterativ o lista de inregistrari
    si returneaza o sugestie de Golden Record impreuna cu detalii pentru revizuire.
    """
    if not list_of_records:
        return {
            "suggested_golden_record": {},
            "human_review_required": True,
            "conflicts_resolved": [],
            "processing_log": ["ERROR: Input list of records is empty."]
        }

    if len(list_of_records) == 1:
        return {
            "suggested_golden_record": list_of_records[0],
            "human_review_required": False,
            "conflicts_resolved": [],
            "processing_log": ["INFO: Only one record provided, no merge needed."]
        }

    golden_record = list_of_records[0]
    full_log = [f"Starting iterative merge for {len(list_of_records)} records."]

    for i, next_record in enumerate(list_of_records[1:], start=1):
        full_log.append(f"--- Iteration #{i}: Merging current Golden Record with Record #{i} ---")

        updated_gr, _, log = run_single_merge_iteration(golden_record, next_record)
        full_log.extend(log)

        if updated_gr is None:
            # Daca o iteratie esueaza, ne oprim si returnam o eroare clara
            return {
                "suggested_golden_record": golden_record,
                "human_review_required": True,
                "conflicts_resolved": [{
                    "field_name": "merge_process",
                    "value_A": "current_golden_record",
                    "value_B": f"record_{i}",
                    "chosen_value": "PROCESS_HALTED",
                    "justification": "A critical error occurred during the AI merge process."
                }],
                "processing_log": full_log
            }
        golden_record = updated_gr

    # La final, generam raportul detaliat al conflictelor.
    # In loc sa rulam din nou AI-ul, putem reconstrui raportul din Golden Record-ul final.
    # Un camp 'None' in Golden Record indica un conflict care necesita revizuire.
    final_conflicts_details = []
    human_review_required = False

    # Comparam Golden Record-ul final cu ultima inregistrare pentru a gasi conflictele rezolvate.
    # Aceasta este o aproximare; o metoda mai buna ar fi sa colectam deciziile la fiecare pas.
    # Pentru simplitate, ne concentram pe a identifica campurile care necesita review.

    for key, value in golden_record.items():
        if value is None:
            human_review_required = True
            # Cautam valorile originale in inregistrarile de la intrare
            original_values = [rec.get(key) for rec in list_of_records if rec.get(key) is not None]
            unique_original_values = sorted(list(set(original_values)))

            final_conflicts_details.append({
                "field_name": key,
                "value_A": unique_original_values[0] if unique_original_values else None,
                "value_B": unique_original_values[1] if len(unique_original_values) > 1 else None,
                "chosen_value": "NEEDS_HUMAN_REVIEW",
                "justification": "This field was marked for human review during the merge process due to ambiguity."
            })

    full_log.append("--- Iterative merge process completed. ---")

    return {
        "suggested_golden_record": golden_record,
        "human_review_required": human_review_required,
        "conflicts_resolved": final_conflicts_details,
        "processing_log": full_log
    }