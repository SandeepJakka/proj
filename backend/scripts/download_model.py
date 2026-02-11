import os
from huggingface_hub import hf_hub_download

# Configuration
REPO_ID = "Mungert/MediPhi-Instruct-GGUF"
FILENAME = "MediPhi-Instruct-q4_k_m.gguf" # Correct filename from repo list
MODELS_DIR = "models"

def download_model():
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
    
    dest_path = os.path.join(MODELS_DIR, FILENAME)
    if os.path.exists(dest_path):
        size = os.path.getsize(dest_path)
        print(f"File already exists at {dest_path}, size: {size / (1024*1024):.2f} MB")
        if size > 1024 * 1024 * 1024: # > 1GB
            print("File seems valid. Skipping download.")
            return

    print(f"Downloading {FILENAME} from {REPO_ID} to {MODELS_DIR}...")
    try:
        model_path = hf_hub_download(
            repo_id=REPO_ID,
            filename=FILENAME,
            local_dir=MODELS_DIR,
            local_dir_use_symlinks=False,
            resume_download=True
        )
        print(f"Model downloaded successfully to: {model_path}")
        # Verify size
        size = os.path.getsize(model_path)
        print(f"Final file size: {size / (1024*1024):.2f} MB")
    except Exception as e:
        print(f"Failed to download model: {e}")

if __name__ == "__main__":
    download_model()
