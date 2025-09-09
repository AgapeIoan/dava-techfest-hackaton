# Patients Dedupe API – Frontend Guide

This API provides endpoints for patient ingestion, deduplication, cluster management, and searching duplicates.
All responses are JSON (unless explicitly returning CSV).

## Base URL
```
http://localhost:8000
```

## Endpoints

### 1. Ingest Patients From CSV
- **Endpoint**: `POST /ingest/patients-csv`
- Body: multipart/form-data
- Key: file (type: File)
- Value: synthetic_patients.csv
- Response: 
```{ "inserted": 200, "updated": 0 }```

### 2. Run deduplication
- **Endpoint**: `POST /dedupe/run`
- Response: 
```{ "run_id": 1, "links_inserted": 1234, "clusters": 456 }```

### 3. Export links as CSV
- **Endpoint**: `GET /export/links.csv`

### 4. Search patients by name
- **Endpoint**: `GET /patients/search?name=Kim%20Carter`
- Response:
```
    {
        "patient": {
            "record_id": "107",
            "original_record_id": "5",
            "first_name": "Brady M",
            "last_name": "wori",
            "gender": "F",
            "date_of_birth": "1972-02-11",
            "address": "4399J oseph Parkways",
            "city": "",
            "county": "Hawaii",
            "ssn": "339-12-0338",
            "phone_number": "0325628265",
            "email": "lauriebrady@outlook.com",
            "cluster_id": "P00005",
            "is_deleted": false,
            "merged_into": null
        },
        "duplicates": [
            {
                "other_record_id": "5",
                "decision": "match",
                "score": 0.5686,
                "s_name": 0.6333,
                "s_dob": 0.0,
                "s_email": 1.0,
                "s_phone": 1.0,
                "s_address": 0.2857,
                "s_gender": 1.0,
                "s_ssn_hard_match": 1.0,
                "reason": "ssn_hard",
                "other_patient": {
                    "record_id": "5",
                    "original_record_id": "",
                    "first_name": "Laurie",
                    "last_name": "Brady",
                    "gender": "F",
                    "date_of_birth": "1972-11-02",
                    "address": "4399 Joseph Parkways",
                    "city": "Patrickview",
                    "county": "Hawaii",
                    "ssn": "339-12-0338",
                    "phone_number": "0325628265",
                    "email": "lauriebrady@outlook.com",
                    "cluster_id": "P00005",
                    "is_deleted": false,
                    "merged_into": null
                }
            }
        ]
    },
```

### 5. Get patient details by record ID
- **Endpoint**: `GET /patients/{record_id}`
- Response: Similar to 4. Search patients by name

### 6. Get all matches
- **Endpoint**: `GET /patients/matches`
- Response: Similar to 4. Search patients by name - but for all patients with duplicates

### 7. Merge 
- **Endpoint**: `POST /patients/merge`
- Body: JSON
```
{
  "master_record_id": "3",
  "duplicate_record_ids": ["1194"],
  "reason": "manual review: SSN hard match",
  "updates": {
    "first_name": "David",
    "address": "3573 Robbin sStravenue"
  }
}

```

### 8. Edit patient
- **Endpoint**: `PATCH /patients/{record_id}`
- Body: JSON
```
{
  "first_name": "Dave",
  "address": "3573 Robbin sStravenue"
}
```

### 9. Delete patient (soft)
- **Endpoint**: `DELETE /patients/{record_id}`

### 10. List all patients with duplicate info
- **Endpoint**: `GET /patients/all
- Response: Similar to 4. Search patients by name

### 11. Add patient (with duplicate check)
- **Endpoint**: `POST /intake/add_or_check`
- Body: JSON
```
{
        "first_name": "Michael",
        "last_name": "Robinson",
        "gender": "M",
        "date_of_birth": "1971-10-13",
        "address": "0866 Anne Lake Apt. 158",
        "city": "Acworth",
        "county": "South Dakota",
        "ssn": "562-77-3079",
        "phone_number": "7658676545",
        "email": "mrobinson@protonmail.com"
}
```

- Response:
```
{
    "created": false,
    "record_id": "1504",
    "decision": "duplicate_found",
    "patient_id": "P00008",
    "duplicates": [
        {
            "other_record_id": "1502",
    .....
 
```

### 12. Add patient (without duplicate check - force)
- **Endpoint**: `POST /intake/force_add`
- Body: JSON
```
{
        "first_name": "Michael",
        "last_name": "Robinson",
        "gender": "M",
        "date_of_birth": "1971-10-13",
        "address": "0866 Anne Lake Apt. 158",
        "city": "Acworth",
        "county": "South Dakota",
        "ssn": "562-77-3079",
        "phone_number": "7658676545",
        "email": "mrobinson@protonmail.com"
}
```
- Response: Similar to 5. Search patients by name

