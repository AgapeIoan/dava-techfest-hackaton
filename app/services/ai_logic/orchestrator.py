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
    # Prefill unresolved fields with anchor values to avoid blanks in UI, while keeping HUMAN_REVIEW
    if validated_decision and isinstance(validated_decision.get("resolved_conflicts"), dict):
        for field, res in validated_decision["resolved_conflicts"].items():
            if res.get("chosen_value") == "NEEDS_HUMAN_REVIEW":
                # choose value from record_a, fallback to record_b
                anchor_val = record_a.get(field)
                if anchor_val is None or anchor_val == "":
                    anchor_val = record_b.get(field)
                final_golden_record[field] = anchor_val
    # Ensure required identifiers are preserved (anchor to record_a by default)
    anchor_id = record_a.get("record_id") or record_b.get("record_id") or ""
    final_golden_record["record_id"] = str(anchor_id)

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
        one = dict(list_of_records[0])
        if not isinstance(one.get("record_id", ""), str):
            rid = one.get("record_id")
            one["record_id"] = "" if rid is None else str(rid)
        return {
            "suggested_golden_record": one,
            "human_review_required": False,
            "conflicts_resolved": [],
            "processing_log": ["INFO: Only one record provided, no merge needed."]
        }

    golden_record = list_of_records[0]
    full_log = [f"Starting iterative merge for {len(list_of_records)} records."]
    # Accumulate per-field AI resolutions across iterations
    decisions_map: Dict[str, Dict[str, Any]] = {}
    # Pre-compute unique original values per field for reporting
    unique_values: Dict[str, list] = {}
    for rec in list_of_records:
        for k, v in rec.items():
            if k not in unique_values:
                unique_values[k] = []
            if v is not None and v not in unique_values[k]:
                unique_values[k].append(v)

    for i, next_record in enumerate(list_of_records[1:], start=1):
        full_log.append(f"--- Iteration #{i}: Merging current Golden Record with Record #{i} ---")

        updated_gr, decision, log = run_single_merge_iteration(golden_record, next_record)
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
        # accumulate per-field decisions
        try:
            if decision and isinstance(decision.get("resolved_conflicts"), dict):
                for field, res in decision["resolved_conflicts"].items():
                    if field in {"record_id", "original_record_id", "cluster_id", "merged_into"}:
                        continue
                    decisions_map[field] = {
                        "chosen_value": res.get("chosen_value"),
                        "justification": res.get("justification") or "Resolved by AI",
                    }
        except Exception:
            pass

    # Build detailed field-level resolutions from accumulated AI decisions
    final_conflicts_details = []
    human_review_required = False
    for field, res in decisions_map.items():
        vals = unique_values.get(field, [])
        value_a = vals[0] if len(vals) > 0 else None
        value_b = vals[1] if len(vals) > 1 else None
        chosen = res.get("chosen_value")
        justif = res.get("justification") or "Resolved by AI"
        if chosen == "NEEDS_HUMAN_REVIEW":
            human_review_required = True
        final_conflicts_details.append({
            "field_name": field,
            "value_A": value_a,
            "value_B": value_b,
            "chosen_value": chosen,
            "justification": justif,
        })

    full_log.append("--- Iterative merge process completed. ---")

    # Final safety: ensure record_id is present and string
    if not isinstance(golden_record.get("record_id", ""), str):
        rid = golden_record.get("record_id")
        golden_record["record_id"] = "" if rid is None else str(rid)

    return {
        "suggested_golden_record": golden_record,
        "human_review_required": human_review_required,
        "conflicts_resolved": final_conflicts_details,
        "processing_log": full_log
    }
