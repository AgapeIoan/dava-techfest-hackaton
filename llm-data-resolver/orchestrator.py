import json
import time
from data_processing import normalize_record, prepare_data_for_llm
from ai_core import run_llm_inference, parse_and_correct_response
from prompts import prompt_template

def build_golden_record(identical_data, validated_decision):
    """Reconstruieste inregistrarea finala pe baza datelor si a deciziilor validate."""
    golden_record = identical_data.copy()
    resolved_conflicts = validated_decision.get("resolved_conflicts", {})
    for field, resolution in resolved_conflicts.items():
        chosen_value = resolution.get("chosen_value")
        golden_record[field] = None if chosen_value == "NEEDS_HUMAN_REVIEW" else chosen_value
    return golden_record

def run_full_resolution_process(record_a, record_b):
    """Orchestreaza procesul complet pentru o pereche de inregistrari."""
    print("\n" + "="*60)
    print("Initiating conflict resolution process for a pair of records...")
    
    norm_a = normalize_record(record_a)
    norm_b = normalize_record(record_b)
    
    identical_data, conflicting_data = prepare_data_for_llm(norm_a, norm_b)
    
    if not conflicting_data:
        print("INFO: Niciun conflict detectat. Fuziune directa.")
        final_golden_record = norm_a.copy()
        final_golden_record.update(norm_b)
        return final_golden_record

    print("INFO: Conflicte detectate:", list(conflicting_data.keys()))
    
    analysis_prompt = prompt_template.format(
        conflicting_data_str=json.dumps(conflicting_data, indent=2),
        identical_data_str=json.dumps(identical_data, indent=2)
    )
    
    start_time = time.time()
    initial_output = run_llm_inference(analysis_prompt)
    inference_time = time.time() - start_time
    print(f"INFO: Analiza AI a durat {inference_time:.2f} secunde.")
    
    validated_decision = parse_and_correct_response(initial_output, conflicting_data)
    
    if not validated_decision:
        print("EROARE: Procesul a esuat. Nu s-a putut genera un Golden Record.")
        return None
        
    print("\nINFO: Decizii finale (post-validare):")
    print(json.dumps(validated_decision, indent=2))
    
    final_golden_record = build_golden_record(identical_data, validated_decision)
    
    return final_golden_record

def resolve_multiple_duplicates(list_of_records):
    """Primeste o lista de inregistrari si le fuzioneaza iterativ."""
    if not list_of_records or len(list_of_records) < 2:
        return list_of_records[0] if list_of_records else None

    golden_record = list_of_records[0]
    
    print(f"INFO: Initiem fuziunea iterativa pentru {len(list_of_records)} inregistrari.")
    
    for i, next_record in enumerate(list_of_records[1:], start=1):
        print(f"\n### Iteratia #{i}: Fuzionam Golden Record-ul curent cu Inregistrarea #{i} ###")
        updated_golden_record = run_full_resolution_process(golden_record, next_record)
        
        if updated_golden_record is None:
            print(f"EROARE CRITICA la iteratia #{i}. Procesul de fuziune a fost oprit.")
            return None
            
        golden_record = updated_golden_record
        print(f"### Sfarsit Iteratia #{i}. Golden Record-ul a fost actualizat. ###")
    
    return golden_record