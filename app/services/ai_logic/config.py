# app/services/ai_logic/config.py
import os
from dotenv import load_dotenv

load_dotenv()

# --- Configurare Provider AI ---
# Provider-ul AI de utilizat. Optiuni: 'local', 'openai', 'mock'
# Poate fi suprascris de variabila de mediu AI_PROVIDER
# AI_PROVIDER = os.getenv("AI_PROVIDER", "local").lower()

# --- Configurare Model Local (Llama.cpp) ---
MODEL_REPO = "microsoft/Phi-3-mini-4k-instruct-gguf"
MODEL_FILE = "Phi-3-mini-4k-instruct-q4.gguf"
MODEL_FOLDER = "models"
MODEL_PATH = f"{MODEL_FOLDER}/{MODEL_FILE}"
LLM_CPU_THREADS = 4

# --- Configurare OpenAI ---
# Cheia API trebuie setata ca variabila de mediu, NU direct in cod.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL_NAME = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")

# --- Configurare Mod Mock (suprascrie AI_PROVIDER daca e True) ---
USE_MOCK_LLM = os.getenv("USE_MOCK_LLM", "False").lower() in ("true", "1")
if USE_MOCK_LLM:
    AI_PROVIDER = "mock"

AI_PROVIDER = "openai"