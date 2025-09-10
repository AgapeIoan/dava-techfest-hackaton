import re
from datetime import datetime


def normalize_record(record):
    """Normalizeaza valorile din campuri specifice pentru o comparatie corecta."""
    normalized = record.copy()

    if 'date_of_birth' in normalized and normalized['date_of_birth']:
        dob = normalized['date_of_birth']
        try:
            dt_object = datetime.strptime(dob, '%m/%d/%Y')
            normalized['date_of_birth'] = dt_object.strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            try:
                dt_object = datetime.strptime(dob, '%Y-%m-%d')
                normalized['date_of_birth'] = dob
            except (ValueError, TypeError):
                pass

    if 'phone_number' in normalized and normalized['phone_number']:
        phone = normalized['phone_number']
        normalized['phone_number'] = re.sub(r'\D', '', str(phone))

    return normalized


def prepare_data_for_llm(rec_a, rec_b):
    """Compara doua dictionare si le separa in campuri identice si conflictuale."""
    identical_fields = {}
    conflicting_fields = {}
    all_keys = set(rec_a.keys()) | set(rec_b.keys())

    for key in all_keys:
        val_a = rec_a.get(key)
        val_b = rec_b.get(key)
        if val_a == val_b:
            identical_fields[key] = val_a
        else:
            conflicting_fields[key] = {"value_A": val_a, "value_B": val_b}

    return identical_fields, conflicting_fields