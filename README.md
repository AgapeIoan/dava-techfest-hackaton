# dava-techfest-hackaton
WELCOME TO SPARTA!

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