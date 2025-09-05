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

### 🎯 Justification for USA Dataset Selection

For our hackathon, we are strategically focusing on a **USA-only dataset** for three key reasons:

1.  **Speed and Focus:** This allows us to bypass the immense complexity of handling multiple international address formats, date conventions, and character sets. We can dedicate 100% of our time to building a powerful and accurate core matching algorithm, which is the heart of this project.

2.  **A Powerful, Consistent Identifier:** The US Social Security Number (SSN) provides a strong, unique identifier that serves as a perfect anchor for our matching logic. This allows us to create a highly effective algorithm that can intelligently handle cases where an SSN is missing or incorrect.

3.  **Delivering a Polished Demo:** A single-country scope ensures we can build a robust, bug-free, and compelling demo. Instead of explaining complex international rules, we can clearly and quickly showcase our detector's primary value: finding difficult duplicates with high precision.

This focused approach is a strategic choice to ensure we deliver a successful and impressive proof-of-concept, which can be architected to scale to other countries in the future.
