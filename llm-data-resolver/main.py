import json
from orchestrator import resolve_multiple_duplicates


def main():
    """Defineste datele de test si ruleaza procesul principal."""

    # Definiti aici cluster-ul de inregistrari pe care doriti sa il testati
    patient_cluster = [
        # Inregistrarea 0: Originalul, dar cu un typo
        {
            "first_name": "Jonathan", "last_name": "Smth", "date_of_birth": "1980-05-15",
            "ssn": "sintetic-ssn-multi", "email": "jonathan.smith@corporate.com"
        },
        # Inregistrarea 1: Cu nickname si email personal
        {
            "first_name": "Jon", "last_name": "Smith", "date_of_birth": "05/15/1980",
            "ssn": "sintetic-ssn-multi", "email": "jonsmith80@email.com"
        },
        {
            "first_name": "Jonathan", "last_name": "Smth", "date_of_birth": "1980-05-15",
            "ssn": "sintetic-ssn-multi", "email": "jonathan.smith@corporte.com"
        },
    ]

    final_record = resolve_multiple_duplicates(patient_cluster)

    if final_record:
        print("\n" + "=" * 60)
        print("PROCES DE FUZIUNE COMPLET FINALIZAT!")
        print("GOLDEN RECORD FINAL (dupa toate iteratiile):")
        print(json.dumps(final_record, indent=2))
        print("=" * 60)


if __name__ == "__main__":
    main()