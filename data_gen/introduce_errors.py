import csv
import random
from datetime import datetime, timedelta
from collections import defaultdict
import jellyfish
from jellyfish import damerau_levenshtein_distance as dld
import re

INPUT_FILE = "data_gen/synthetic_patient_records.csv"
OUTPUT_FILE = "data_gen/synthetic_patient_records_with_duplicates.csv"
# Procentul de inregistrari din setul original care vor fi duplicate si corupte.
# 0.3 inseamna ca pentru 100 de inregistrari originale, vom crea 30 de duplicate corupte.
DUPLICATION_RATE = 0.3
CORRUPTIBLE_FIELDS = [
    "first_name", "last_name", "gender", "date_of_birth", "address",
    "city", "county", "ssn", "phone_number", "email"
]

MIN_ERRORS_PER_RECORD = 1
MAX_ERRORS_PER_RECORD = 6

# A compact seed of common US first names with known spelling variants
COMMON_FIRST_NAMES = [
    # Catherine-family
    "Catherine", "Katherine", "Kathryn", "Katharine", "Katarine", "Katheryn",
    # Stephen/Steven
    "Stephen", "Steven",
    # Geoffrey/Jeffrey
    "Geoffrey", "Jeffrey", "Jeffery",
    # Sara/Sarah
    "Sara", "Sarah",
    # Marc/Mark
    "Marc", "Mark",
    # Alan/Allen/Allan
    "Alan", "Allen", "Allan",
    # Sean/Shawn/Shaun
    "Sean", "Shawn", "Shaun",
    # Jon/John/Jonathan
    "Jon", "John", "Jonathan",
    # Erik/Eric
    "Erik", "Eric",
    # Philip/Phillip
    "Philip", "Phillip",
    # Bryan/Brian
    "Bryan", "Brian",
    # Kristin/Kristen/Christen/Christin
    "Kristin", "Kristen", "Christen", "Christin",
    # Madeline/Madelyn/Madalyn
    "Madeline", "Madelyn", "Madalyn",
    # Hailey/Hayley/Haley
    "Hailey", "Hayley", "Haley",
    # Jaime/Jamie
    "Jaime", "Jamie",
    # Michele/Michelle
    "Michele", "Michelle",
    # Desiree/Desirée
    "Desiree", "Desirée",
    # Teresa/Theresa
    "Teresa", "Theresa",
    # Andre/André/André/Andrew (edge)
    "Andre", "André", "Andrew",
    # Alejandro/Alexander/Alexandre (edge)
    "Alexander", "Alexandre", "Alejandro",
    # Jeff/Jef (shorts sometimes appear)
    "Jeff", "Geoff", "Jef",
]

NICKNAMES = {
     "William": ["Bill", "Will", "Billy"],
    "Robert": ["Rob", "Bob", "Robby", "Bobby"],
    "James": ["Jim", "Jimmy"],
    "John": ["Jack", "Johnny"],
    "Michael": ["Mike", "Micky", "Mikey"],
    "Elizabeth": ["Liz", "Beth", "Lizzy", "Eliza", "Betsy", "Betty"],
    "Katherine": ["Kate", "Kathy", "Katie", "Kat"],

    # Male names
    "Thomas": ["Tom", "Tommy"],
    "Charles": ["Charlie", "Chuck"],
    "Richard": ["Rich", "Rick", "Ricky", "Dick"],
    "Edward": ["Ed", "Eddie", "Ted", "Teddy"],
    "Anthony": ["Tony"],
    "Joseph": ["Joe", "Joey"],
    "Christopher": ["Chris", "Topher", "Kit"],
    "Daniel": ["Dan", "Danny"],
    "Matthew": ["Matt"],
    "Nicholas": ["Nick", "Nicky"],
    "Alexander": ["Alex", "Xander", "Lex"],
    "Jonathan": ["Jon", "Johnny", "Nathan"],
    "Steven": ["Steve", "Stevie"],
    "Andrew": ["Andy", "Drew"],
    "Benjamin": ["Ben", "Benny", "Benji"],
    "Brandon": ["Bran", "Brando"],
    "Brian": ["Bry", "Bryan"],
    "Donald": ["Don", "Donnie"],
    "Douglas": ["Doug", "Dougie"],
    "Gregory": ["Greg"],
    "Henry": ["Hank", "Harry"],
    "Jacob": ["Jake", "Jay"],
    "Jason": ["Jase"],
    "Jeremiah": ["Jeremy", "Jerry"],
    "Joshua": ["Josh"],
    "Kenneth": ["Ken", "Kenny"],
    "Lawrence": ["Larry"],
    "Patrick": ["Pat", "Paddy"],
    "Samuel": ["Sam", "Sammy"],
    "Timothy": ["Tim", "Timmy"],
    "Zachary": ["Zach", "Zack"],
    "Phillip": ["Phil"],
    "Jeffrey": ["Jeff", "Jeffy"],
    "Stephen": ["Steve", "Stevie"],
    "Marc": ["Mark"],

    # Female names
    "Allison": ["Allie", "Ally"],
    "Amanda": ["Mandy", "Amy"],
    "Andrea": ["Andi", "Andy"],
    "Angela": ["Angie"],
    "Cynthia": ["Cindy"],
    "Danielle": ["Dani", "Elle"],
    "Jacqueline": ["Jackie"],
    "Jessica": ["Jess", "Jessie"],
    "Kimberly": ["Kim", "Kimmy"],
    "Madeline": ["Maddie", "Maddy"],
    "Melissa": ["Mel", "Missy"],
    "Monica": ["Moni", "Nica"],
    "Rebecca": ["Becky", "Becca"],
    "Samantha": ["Sam", "Sammy"],
    "Stephanie": ["Steph", "Stevie"],
    "Victoria": ["Vicki", "Vicky", "Tori"],
    "Jennifer": ["Jen", "Jenny"],
    "Margaret": ["Maggie", "Peggy", "Meg", "Marge"],
    "Patricia": ["Pat", "Patty", "Trish"],
    "Deborah": ["Deb", "Debbie", "Debby"],
    "Barbara": ["Barb", "Babs"],
    "Sarah": ["Sara", "Sally"],
    "Catherine": ["Cathy", "Cate", "Cathie"],
}

# Build { metaphone_code: [names...] }
PHONETIC_INDEX = {}
for nm in COMMON_FIRST_NAMES:
    code = jellyfish.metaphone(nm)
    PHONETIC_INDEX.setdefault(code, []).append(nm)

STREET_SUFFIX_MAP = {
    "Street": "St", "Avenue": "Ave", "Drive": "Dr", "Lane": "Ln", "Road": "Rd",
    "Boulevard": "Blvd", "Court": "Ct", "Place": "Pl", "Terrace": "Ter",
}

STREET_SUFFIX_MAP.update({v: k for k, v in STREET_SUFFIX_MAP.items()})

ADDRESS_REGEX = re.compile(
    r"^(?P<number>\d+)\s+"
    r"(?P<name>.+?)\s+"
    r"(?P<suffix>Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Road|Rd|Boulevard|Blvd|Court|Ct|Place|Pl|Terrace|Ter)\b"
    r"(?:\s+(?P<secondary>.*))?$",
    re.IGNORECASE
)

def parse_us_address(address: str) -> dict | None:
    """Decomposes a US address string into its components using RegEx."""
    if not address:
        return None
    match = ADDRESS_REGEX.match(address)
    if not match:
        return None
    return match.groupdict()

def introduce_address_abbreviation_error(record: dict) -> dict:
    """Swaps the street suffix between its full and abbreviated form (e.g., Street <-> St)."""
    address_str = record.get("address", "")
    parts = parse_us_address(address_str)
    if not parts or not parts.get("suffix"):
        return record  # Cannot apply this error if address doesn't parse correctly

    original_suffix = parts["suffix"].title()  # Standardize case for lookup
    new_suffix = STREET_SUFFIX_MAP.get(original_suffix)
    if not new_suffix:
        return record  # Should not happen with the current regex, but a good safeguard

    # Reconstruct the address with the new suffix
    new_address = f"{parts['number']} {parts['name']} {new_suffix}"
    if parts.get("secondary") and parts["secondary"] is not None:
        new_address += f" {parts['secondary']}"
    
    record["address"] = new_address
    return record

def introduce_address_component_omission_error(record: dict) -> dict:
    """Removes a component from the address, like the suffix (St, Ave) or a secondary unit."""
    address_str = record.get("address", "")
    parts = parse_us_address(address_str)
    if not parts:
        return record

    # Decide what can be omitted
    possible_omissions = []
    if parts.get("suffix"):
        possible_omissions.append("suffix")
    if parts.get("secondary") and parts["secondary"] is not None:
        possible_omissions.append("secondary")
    
    if not possible_omissions:
        return record # Nothing to omit
        
    omission_target = random.choice(possible_omissions)
    
    if omission_target == "suffix":
        new_address = f"{parts['number']} {parts['name']}"
        if parts.get("secondary") and parts["secondary"] is not None:
             new_address += f" {parts['secondary']}"
    else: # Omit secondary
        new_address = f"{parts['number']} {parts['name']} {parts['suffix']}"

    record["address"] = new_address
    return record

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

def get_spelling_variants(name: str, max_edit: int = 2):
    if not name:
        return []
    code = jellyfish.metaphone(name)
    candidates = PHONETIC_INDEX.get(code, [])
    # Filter out exact matches; keep near-spellings
    near = [c for c in candidates if c.lower() != name.lower() and dld(c.lower(), name.lower()) <= max_edit]
    # (Optional) bias toward same initial for realism
    same_initial = [c for c in near if c[:1].lower() == name[:1].lower()]
    return same_initial or near

def introduce_spelling_variant(record, p: float = 0.25):
    """With probability p, replace first_name by a phonetic + near-edit variant."""
    if random.random() > p:
        return record
    first = record.get("first_name", "")
    variants = get_spelling_variants(first, max_edit=2)
    if variants:
        record["first_name"] = random.choice(variants)
    return record

def _snapshot(record: dict) -> tuple:
    """Immutable snapshot of the parts we care about to detect changes."""
    # include all fields that your ops may touch
    return (
        record.get("first_name"), record.get("last_name"),
        record.get("gender"), record.get("date_of_birth"),
        record.get("address"),
        record.get("city"), record.get("county"),
        record.get("ssn"), record.get("phone_number"),
        record.get("email")
    )

def apply_with_fallback(record: dict, primary_op, fallback_ops: list) -> dict:
    """
    Try primary_op; if it doesn't change the record, try other ops until one does.
    Prevents 'no-op' when, e.g., no phonetic variant exists or strings are too short.
    """
    before = _snapshot(record)
    r = primary_op(record)
    if _snapshot(r) != before:
        return r

    # try shuffled fallbacks
    ops = fallback_ops[:]
    random.shuffle(ops)
    for op in ops:
        before2 = _snapshot(r)
        r = op(r)
        if _snapshot(r) != before2:
            return r
    return r  # if nothing changes, return as-is (rare)

def main():
    """Orchestreaza procesul de citire, duplicare, corupere si scriere a datelor."""
    clean_data = read_data(INPUT_FILE)
    if not clean_data:
        return

    phonetic_map = build_phonetic_map(clean_data)

    # Define operations (remove duplicates in list; keep order you want)
    error_operations = [
        lambda r: introduce_typo(r, "first_name"),
        lambda r: introduce_typo(r, "last_name"),
        lambda r: introduce_typo(r, "phone_number"),
        lambda r: introduce_typo(r, "address"),

        swap_names,
        introduce_blank_value,
        change_date_of_birth,

        lambda r: introduce_phonetic_error(r, phonetic_map),
        introduce_nickname,
        introduce_spelling_variant,
        add_middle_initial,

        introduce_address_abbreviation_error,
        introduce_address_component_omission_error,
    ]

    # Select records to duplicate
    num_records_to_duplicate = int(len(clean_data) * DUPLICATION_RATE)
    records_to_duplicate = random.sample(clean_data, num_records_to_duplicate)

    corrupted_duplicates = []
    last_record_id = max(int(r['record_id']) for r in clean_data)

    for i, original_record in enumerate(records_to_duplicate):
        new_duplicate = original_record.copy()
        new_duplicate['record_id'] = last_record_id + 1 + i
        new_duplicate['original_record_id'] = original_record['record_id']

        # Decide how many errors to apply for this specific duplicate.
        num_errors_to_apply = random.randint(MIN_ERRORS_PER_RECORD, MAX_ERRORS_PER_RECORD)
        
        # Select a sample of unique error functions to apply.
        # Ensure we don't try to select more functions than are available.
        k = min(num_errors_to_apply, len(error_operations))
        operations_to_apply = random.sample(error_operations, k)

        # Apply each selected operation sequentially.
        for op in operations_to_apply:
            new_duplicate = op(new_duplicate)

        # Safety check: ensure the record has actually changed.
        # This handles the rare case where all selected operations were no-ops.
        if _snapshot(new_duplicate) == _snapshot(original_record):
            # If no changes were made, force a simple, reliable error.
            fallback_op = random.choice([
                lambda r: introduce_typo(r, "address"),
                lambda r: introduce_typo(r, "last_name"),
            ])
            new_duplicate = fallback_op(new_duplicate)

        corrupted_duplicates.append(new_duplicate)

    # Add original_record_id='' to originals
    for record in clean_data:
        record['original_record_id'] = ''

    # Write combined file
    final_data = clean_data + corrupted_duplicates
    final_fieldnames = [
        "record_id", "original_record_id", "first_name", "last_name", "gender", "date_of_birth",
        "address", "city", "county", "ssn", "phone_number", "email"
    ]
    write_data(OUTPUT_FILE, final_data, final_fieldnames)


if __name__ == "__main__":
    main()
