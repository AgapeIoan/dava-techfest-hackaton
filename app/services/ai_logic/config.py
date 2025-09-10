import os

# Detalii pentru descarcarea modelului de pe Hugging Face
MODEL_REPO = "microsoft/Phi-3-mini-4k-instruct-gguf"
MODEL_FILE = "Phi-3-mini-4k-instruct-q4.gguf"

# Calea locala unde va fi salvat si de unde va fi incarcat modelul
MODEL_FOLDER = "models"
MODEL_PATH = f"{MODEL_FOLDER}/{MODEL_FILE}"

# Parametri pentru rularea pe CPU
# Setati n_threads la numarul de nuclee fizice ale procesorului pentru performanta optima.
# O valoare de 0 lasa biblioteca sa aleaga.
LLM_CPU_THREADS = 4

USE_MOCK_LLM = os.getenv("USE_MOCK_LLM", "False").lower() in ("true", "1")