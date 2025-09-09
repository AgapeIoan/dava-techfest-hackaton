# dava-techfest-hackaton

Synthetic Healthcare Dataset Generator

## Synthetic Healthcare Data Generator

### ✅ Why this approach?
- **Fast & reproducible**: Uses Faker with deterministic seeds for consistent results.
- **Flexible**: Schema includes demographics and identifiers (`street_number`, `ssn`, `phone_number`, etc.).
- **Safe**: 100% synthetic data, no privacy risks.
- **Benchmark-ready**: Useful for training and testing deduplication systems.

### ⚡ Scalability
- Linear generation time (O(n)), efficient for thousands to millions of rows.
- Simple CSV output, easily consumed by Python, SQL, Spark, ML pipelines.
- Can be extended with multiprocessing or chunking for very large datasets.

### ⚠️ Limitations
- Data distributions are synthetic and may not match real-world correlations.
- SSNs and phone numbers are valid-looking but not country-specific.
- Phone numbers are forced to fixed length for consistency (less international realism).
- Duplicate generation currently produces one duplicate per entity (not multi-cluster).

### 🚀 Extensions
- Add more locales for international realism.
- Normalize phone numbers to **E.164** format.
- Generate **clusters of duplicates** (3–5 per patient).
- Add per-country rules for SSNs, postcodes, and phone formats.
- Enrich with clinical data if needed for healthcare-specific tasks.

---

## 🧪 Data Corruption & Duplicate Simulation (`introduce_errors.py`)

The `introduce_errors.py` script takes the synthetic patient CSV and generates realistic duplicates and corrupted records for deduplication benchmarking.

**Features:**
- Duplicates a configurable percentage of records (default: 30%).
- Applies random errors to each duplicate, including:
  - Typos in names, addresses, phone numbers
  - Swapping first and last names
  - Blank fields
  - Date of birth changes
  - Phonetic substitutions and nicknames
  - Address abbreviation and omission errors
  - Spelling variants and middle initials
- Ensures each duplicate is actually changed (no accidental perfect copies).
- Outputs a new CSV with both original and corrupted records, including a link to the original record.

**How to use:**
1. Generate the base dataset:
   ```
   python data_gen/healthcare_data_generation.py
   ```
2. Create duplicates and corrupted records:
   ```
   python data_gen/introduce_errors.py
   ```
   The output will be `synthetic_patient_records_with_duplicates.csv`.

**Use case:**  
This enables robust testing of entity resolution, record linkage, and deduplication algorithms in healthcare and other domains.

---

### 🎯 Justification for USA Dataset Selection

For our hackathon, we are strategically focusing on a **USA-only dataset** for three key reasons:

1.  **Speed and Focus:** This allows us to bypass the immense complexity of handling multiple international address formats, date conventions, and character sets. We can dedicate 100% of our time to building a powerful and accurate core matching algorithm, which is the heart of this project.

2.  **A Powerful, Consistent Identifier:** The US Social Security Number (SSN) provides a strong, unique identifier that serves as a perfect anchor for our matching logic. This allows us to create a highly effective algorithm that can intelligently handle cases where an SSN is missing or incorrect.

3.  **Delivering a Polished Demo:** A single-country scope ensures we can build a robust, bug-free, and compelling demo. Instead of explaining complex international rules, we can clearly and quickly showcase our detector's primary value: finding difficult duplicates with high precision.

This focused approach is a strategic choice to ensure we deliver a successful and impressive proof-of-concept, which can be architected to scale to other countries in the future.
