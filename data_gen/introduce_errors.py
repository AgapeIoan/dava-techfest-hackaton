import csv
import random
from datetime import datetime, timedelta
from collections import defaultdict
import jellyfish

INPUT_FILE = "international_patients.csv"
OUTPUT_FILE = "patients_with_duplicates.csv"
# Procentul de inregistrari din setul original care vor fi duplicate si corupte.
# 0.3 inseamna ca pentru 100 de inregistrari originale, vom crea 30 de duplicate corupte.
DUPLICATION_RATE = 0.3
CORRUPTIBLE_FIELDS = [
    "first_name", "last_name", "gender", "date_of_birth", "street",
    "street_number", "city", "county", "ssn", "phone_number", "email"
]

NICKNAMES = {
    "William": ["Bill", "Will", "Billy"], "Robert": ["Rob", "Bob", "Robby"],
    "James": ["Jim", "Jimmy"], "John": ["Jack", "Johnny"],
    "Michael": ["Mike", "Micky"], "Elizabeth": ["Liz", "Beth", "Lizzy"],
    "Katherine": ["Kate", "Kathy", "Katie"],
}

def read_data(filepath: str) -> list[dict]:
    """Citeste datele dintr-un fisier CSV si le returneaza ca lista de dictionare."""
    try:
        with open(filepath, "r", newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))
    except FileNotFoundError:
        print(f"Eroare: Fisierul '{filepath}' nu a fost gasit.")
        print("Ruleaza mai intai scriptul original pentru a genera datele.")
        exit()

def write_data(filepath: str, data: list[dict], fieldnames: list[str]):
    """Scrie o lista de dictionare intr-un fisier CSV, folosind o lista definita de coloane."""
    if not data:
        print("Nu sunt date de scris.")
        return

    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"Fisier creat cu succes: {filepath} ({len(data)} inregistrari)")


def build_phonetic_map(data: list[dict]) -> dict:
    """Creeaza un dictionar pentru cautare fonetica eficienta."""
    phonetic_map = defaultdict(list)
    for record in data:
        name = record.get("first_name", "")
        if name:
            metaphone_code = jellyfish.metaphone(name)
            phonetic_map[metaphone_code].append(name)
    return phonetic_map

def introduce_typo(record: dict, field: str) -> dict:
    value = record[field]
    if len(value) < 2: return record
    pos = random.randint(0, len(value) - 1)
    char_list = list(value)
    action = random.choice(["swap", "delete", "insert", "substitute"])
    if action == "swap" and pos < len(value) - 1: char_list[pos], char_list[pos + 1] = char_list[pos + 1], char_list[pos]
    elif action == "delete": char_list.pop(pos)
    elif action == "insert": char_list.insert(pos, random.choice("abcdefghijklmnopqrstuvwxyz"))
    elif action == "substitute": char_list[pos] = random.choice("abcdefghijklmnopqrstuvwxyz")
    record[field] = "".join(char_list)
    return record

def swap_names(record: dict) -> dict:
    record["first_name"], record["last_name"] = record["last_name"], record["first_name"]
    return record

def introduce_blank_value(record: dict) -> dict:
    field_to_blank = random.choice(CORRUPTIBLE_FIELDS)
    record[field_to_blank] = ""
    return record

def change_date_of_birth(record: dict) -> dict:
    try:
        dob = datetime.strptime(record["date_of_birth"], "%Y-%m-%d")
        if random.random() < 0.5:
            delta = timedelta(days=365 * random.choice([-1, 1]))
            new_dob = dob + delta
        else:
            if dob.month <= 12 and dob.day <= 12 and dob.month != dob.day: new_dob = dob.replace(day=dob.month, month=dob.day)
            else: new_dob = dob + timedelta(days=random.randint(-30, 30))
        record["date_of_birth"] = new_dob.strftime("%Y-%m-%d")
    except (ValueError, TypeError): pass
    return record

def introduce_phonetic_error(record: dict, phonetic_map: dict) -> dict:
    original_name = record["first_name"]
    metaphone_code = jellyfish.metaphone(original_name)
    similar_names = [n for n in phonetic_map.get(metaphone_code, []) if n != original_name]
    if similar_names: record["first_name"] = random.choice(similar_names)
    return record

def introduce_nickname(record: dict) -> dict:
    first_name = record["first_name"]
    if first_name in NICKNAMES: record["first_name"] = random.choice(NICKNAMES[first_name])
    return record

def add_middle_initial(record: dict) -> dict:
    if " " not in record["first_name"]:
        middle_initial = random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        record["first_name"] = f"{record['first_name']} {middle_initial}"
    return record


def main():
    """Orchestreaza procesul de citire, duplicare, corupere si scriere a datelor."""
    
    clean_data = read_data(INPUT_FILE)
    if not clean_data:
        return

    phonetic_map = build_phonetic_map(clean_data)

    error_operations = [
        lambda r: introduce_typo(r, "first_name"), lambda r: introduce_typo(r, "last_name"),
        lambda r: introduce_typo(r, "phone_number"), lambda r: introduce_typo(r, "street"),
        swap_names, introduce_blank_value, change_date_of_birth,
        lambda r: introduce_phonetic_error(r, phonetic_map), introduce_nickname, add_middle_initial,
    ]

    # Selecteaza inregistrarile care vor fi duplicate
    num_records_to_duplicate = int(len(clean_data) * DUPLICATION_RATE)
    records_to_duplicate = random.sample(clean_data, num_records_to_duplicate)

    # Genereaza duplicatele corupte
    corrupted_duplicates = []
    # Gaseste cel mai mare ID existent pentru a genera ID-uri noi, unice
    last_record_id = max(int(r['record_id']) for r in clean_data)

    for i, original_record in enumerate(records_to_duplicate):
        new_duplicate = original_record.copy()
        
        # Atribuie un ID nou, unic si seteaza ID-ul original pentru trasabilitate
        new_duplicate['record_id'] = last_record_id + 1 + i
        new_duplicate['original_record_id'] = original_record['record_id']

        # Aplica o singura eroare aleatorie pe duplicat
        chosen_error_op = random.choice(error_operations)
        new_duplicate = chosen_error_op(new_duplicate)
        
        corrupted_duplicates.append(new_duplicate)

    # Pregateste datele originale adaugand coloana noua (goala)
    for record in clean_data:
        record['original_record_id'] = ''

    # Combina datele originale cu duplicatele si scrie fisierul final
    final_data = clean_data + corrupted_duplicates
    
    # Defineste ordinea finala a coloanelor
    final_fieldnames = [
        "record_id", "original_record_id", "first_name", "last_name", "gender", "date_of_birth",
        "street", "street_number", "city", "county", "ssn", "phone_number", "email"
    ]
    
    write_data(OUTPUT_FILE, final_data, final_fieldnames)


if __name__ == "__main__":
    main()
