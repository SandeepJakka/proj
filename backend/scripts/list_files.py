from huggingface_hub import list_repo_files

REPO_ID = "Mungert/MediPhi-Instruct-GGUF"
print(f"Listing files in {REPO_ID}...")
try:
    files = list_repo_files(repo_id=REPO_ID)
    for f in files:
        if f.endswith(".gguf"):
            print(f)
except Exception as e:
    print(f"Error: {e}")
