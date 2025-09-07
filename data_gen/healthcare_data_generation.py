
from faker import Faker
from gender_guesser.detector import Detector
import random
import csv
import re

# --- Configure locales and their weights ---
# Each tuple contains a locale and its weight (probability of being chosen)
locales = [
    ("en_US", 1),  # 100% Americans (adjust weights as needed)
    #("en_GB", 0.10),  # 10% British
    #("es_ES", 0.06),  # 6% Spanish
    #("fr_FR", 0.06),  # 6% French
    #("de_DE", 0.05),  # 5% German
    #("ro_RO", 0.04),  # 4% Romanian
    #("it_IT", 0.04),  # 4% Italian
]

# Create Faker instances for each locale
fakers = [(Faker(locale), weight) for locale, weight in locales]

def pick_faker():
    """Select a Faker instance based on the defined probabilities."""
    r = random.random()
    c = 0.0
    for fk, w in fakers:
        c += w
        if r <= c:
            return fk
    return fakers[0][0]  # fallback to en_US if none matched

DET = Detector(case_sensitive=False)

def infer_gender_from_name(first_name: str) -> str:
    g = DET.get_gender(first_name)
    if g in ("female", "mostly_female"):
        return "F"
    if g in ("male", "mostly_male"):
        return "M"
    return random.choice(["F", "M"])  


def safe_ssn(fk: Faker):
    """Try to generate an SSN; if not available for the locale, create a synthetic one."""
    try:
        ssn_val = fk.ssn()
        return ssn_val.replace(" ", "-").replace("/", "-")
    except Exception:
        # Generate a synthetic SSN if Faker fails
        return f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}"

def safe_phone(fk: Faker, length=10):
    """Generate a phone number with exactly `length` digits."""
    # Get a msisdn (only digits, usually long)
    digits = fk.msisdn()
    digits = re.sub(r"\D", "", digits)
    # If too long, trim it
    if len(digits) > length:
        digits = digits[:length]
    # If too short, add random digits at the end
    while len(digits) < length:
        digits += str(random.randint(0,9))
    return digits

def safe_email(first_name, last_name):
    """
    Generate a synthetic email address using the patient's first and last name.
    The email format and domain are randomly chosen from common patterns and providers.
    """
    # List of common email domains
    domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "protonmail.com"]
    # Patterns for constructing the email username
    patterns = [
        "{first}.{last}",      # e.g. john.smith
        "{first}{last}",      # e.g. johnsmith
        "{f}{last}",          # e.g. jsmith
        "{first}{l}",         # e.g. johns
        "{last}.{first}"      # e.g. smith.john
    ]
    # Randomly select a pattern for the username
    pattern = random.choice(patterns)
    # Format the username using the selected pattern
    email_user = pattern.format(
        first=first_name.lower(),
        last=last_name.lower(),
        f=first_name[0].lower(),
        l=last_name[0].lower()
    )
    # Combine username and randomly selected domain
    return f"{email_user}@{random.choice(domains)}"

def one_patient(record_id: int):
    """Generate a single patient profile."""
    fk = pick_faker()
    first_name = fk.first_name()
    last_name = fk.last_name()
    gender_code = infer_gender_from_name(first_name)
    # Build and return a dictionary with patient data
    return {
        "record_id": record_id,
        "first_name": first_name,
        "last_name": last_name,
        "gender": gender_code,
        "date_of_birth": fk.date_of_birth(minimum_age=18, maximum_age=90).strftime("%Y-%m-%d"),
        "street": fk.street_name(),
        "street_number": fk.building_number(),
        "city": fk.city(),
        "county": fk.state(),
        "ssn": safe_ssn(fk),
        "phone_number": safe_phone(fk, length=10),
        "email": safe_email(first_name, last_name)
    }

def generate_csv(n_records=100, out_path="synthetic_patient_records.csv"):
    """Generate a CSV file with n_records international patients."""
    rows = [one_patient(i+1) for i in range(n_records)]
    fieldnames = [
        "record_id", "first_name", "last_name", "gender", "date_of_birth",
        "street", "street_number", "city", "county", "ssn", "phone_number", "email"
    ]
    # Write patient data to CSV file
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f" File created: {out_path} ({n_records} patients)")

# --- Run the script if executed directly ---
# If this script is run directly, generate 50 patient records and save to CSV
if __name__ == "__main__":
    generate_csv(n_records=10, out_path="data_gen/synthetic_patient_records.csv")
