import base64
import hashlib
from cryptography.fernet import Fernet
from app.config import settings

def _get_fernet() -> Fernet:
    # Generate a Fernet key from SECRET_KEY
    key = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
    b64_key = base64.urlsafe_b64encode(key)
    return Fernet(b64_key)

_fernet = _get_fernet()

def encrypt_text(plain_text: str) -> str:
    if not plain_text:
        return ""
    try:
        encrypted_bytes = _fernet.encrypt(plain_text.encode('utf-8'))
        return base64.b64encode(encrypted_bytes).decode('utf-8')
    except Exception:
        return ""

def decrypt_text(encrypted_text: str) -> str:
    if not encrypted_text:
        return ""
    try:
        encrypted_bytes = base64.b64decode(encrypted_text.encode('utf-8'))
        decrypted_bytes = _fernet.decrypt(encrypted_bytes)
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Backward compatibility for old unencrypted text
        return encrypted_text
