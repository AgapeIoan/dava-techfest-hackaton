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

### 3. List deduplication links

- **Endpoint**: `GET /links/clusters?run_id=1`
- Response: 
```
  {
  "clusters": [
    { "cluster_id": "P00001", "records": ["R001","R057","R103"] },
    { "cluster_id": "P00002", "records": ["R002"] }
  ]
}
  ```

### 4. Export links as CSV
- **Endpoint**: `GET /export/links.csv?run_id=1`

### 5. Search patients by name
- **Endpoint**: `GET /patients/search?name=Kim%20Carter&run_id=1`
- Response:
```
[
  {
    "patient": {
      "record_id": "416",
      "first_name": "Kim",
      "last_name": "Carter",
      "gender": "F",
      "date_of_birth": "1978-04-03",
      "email": "kimc@protonmail.com",
      "cluster_id": "P00416"
    },
    "duplicates": [
      {
        "other_record_id": "1297",
        "decision": "match",
        "score": 0.8857,
        "reason": "ssn_hard",
        "other_patient": {
          "record_id": "1297",
          "first_name": "aKim",
          "last_name": "Carter",
          "cluster_id": "P00416"
        }
      }
    ]
  }
]
```

### 6. Get patient details by record ID
- **Endpoint**: `GET /patients/{record_id}?run_id=1
`