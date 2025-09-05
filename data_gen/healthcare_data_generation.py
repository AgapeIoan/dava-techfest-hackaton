
from faker import Faker
import random
import csv

# --- Configure locales and their weights ---
# Each tuple contains a locale and its weight (probability of being chosen)
locales = [
    ("en_US", 1),  # 65% Americans
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
        cum += w
        if r <= c:
            return fk
    return fakers[0][0]  # fallback to en_US if none matched

def safe_ssn(fk: Faker):
    """Try to generate an SSN; if not available for the locale, create a synthetic one."""
    try:
        ssn_val = fk.ssn()
        return ssn_val.replace(" ", "-").replace("/", "-")
    except Exception:
        # Generate a synthetic SSN if Faker fails
        return f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}"

def one_patient(record_id: int):
    """Generate a single patient profile."""
    fk = pick_faker()
    # Return a dictionary with patient data
    return {
        "record_id": record_id,
        "first_name": fk.first_name(),
        "last_name": fk.last_name(),
        "gender": random.choice(["F","M"]),
        "date_of_birth": fk.date_of_birth(minimum_age=18, maximum_age=90).strftime("%Y-%m-%d"),
        "street": fk.street_name(),
        "street_number": fk.building_number(),
        "city": fk.city(),
        "county": fk.state(),
        "ssn": safe_ssn(fk),
        "phone_number": fk.phone_number(),
        "email": fk.email()
    }

def generate_csv(n_records=100, out_path="international_patients.csv"):
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
if __name__ == "__main__":
    # Generate 50 patient records and save to CSV
    generate_csv(n_records=50, out_path="international_patients.csv")