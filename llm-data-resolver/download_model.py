from huggingface_hub import hf_hub_download
from config import MODEL_REPO, MODEL_FILE, MODEL_FOLDER
import os


def download_llm():
    """Descarca modelul GGUF de pe Hugging Face in folderul specificat."""
    print(f"Se descarca modelul {MODEL_FILE} de la {MODEL_REPO}...")

    if not os.path.exists(MODEL_FOLDER):
        os.makedirs(MODEL_FOLDER)

    hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILE,
        local_dir=MODEL_FOLDER,
        local_dir_use_symlinks=False
    )
    print(f"Modelul a fost descarcat cu succes in folderul '{MODEL_FOLDER}'.")


if __name__ == "__main__":
    download_llm()