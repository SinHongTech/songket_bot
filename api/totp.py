"""
Pure Python RFC 6238 TOTP (Time-based One-Time Password) Engine.
Compatible with Google Authenticator, Microsoft Authenticator, 1Password, Authy, Apple Keychain.
Zero external dependencies.
"""

import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import List, Optional


def generate_totp_secret() -> str:
    """Generate a 160-bit cryptographically secure Base32 secret string."""
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode("utf-8").replace("=", "")


def get_totp_uri(secret: str, username: str, issuer: str = "Songket") -> str:
    """Generate the standard otpauth:// URI for QR code scanning in Google Authenticator."""
    clean_user = username.replace(" ", "_").replace(":", "_")
    return (
        f"otpauth://totp/{issuer}:{clean_user}"
        f"?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"
    )


def compute_totp_code(secret: str, for_time: Optional[int] = None) -> Optional[str]:
    """Compute the expected 6-digit TOTP code for a given timestamp."""
    try:
        t = for_time if for_time is not None else int(time.time())
        step = t // 30
        padded = secret + "=" * ((8 - len(secret) % 8) % 8)
        key = base64.b32decode(padded, casefold=True)
        msg = struct.pack(">Q", step)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[19] & 0x0F
        truncated = struct.unpack(">I", h[offset : offset + 4])[0] & 0x7FFFFFFF
        return f"{truncated % 1_000_000:06d}"
    except Exception:
        return None


def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
    """
    Verify a 6-digit TOTP code against a secret key with time drift tolerance.
    window = 1 checks: current 30s step, preceding step (-30s), and succeeding step (+30s).
    """
    if not secret or not code:
        return False
    clean_code = code.strip().replace(" ", "").replace("-", "")
    if len(clean_code) != 6 or not clean_code.isdigit():
        return False

    try:
        padded = secret + "=" * ((8 - len(secret) % 8) % 8)
        key = base64.b32decode(padded, casefold=True)
        current_step = int(time.time() // 30)

        for step in range(current_step - window, current_step + window + 1):
            msg = struct.pack(">Q", step)
            h = hmac.new(key, msg, hashlib.sha1).digest()
            offset = h[19] & 0x0F
            truncated = struct.unpack(">I", h[offset : offset + 4])[0] & 0x7FFFFFFF
            expected = f"{truncated % 1_000_000:06d}"
            if hmac.compare_digest(expected, clean_code):
                return True
        return False
    except Exception:
        return False


def generate_backup_codes(count: int = 3) -> List[str]:
    """Generate human-readable 8-character single-use emergency backup recovery codes (e.g. 4F2A-9B1C)."""
    codes = []
    for _ in range(count):
        part1 = secrets.token_hex(2).upper()
        part2 = secrets.token_hex(2).upper()
        codes.append(f"{part1}-{part2}")
    return codes


def hash_backup_code(code: str) -> str:
    """Hash backup code with SHA256 for secure database storage."""
    clean = code.strip().replace(" ", "").replace("-", "").upper()
    return hashlib.sha256(clean.encode()).hexdigest()
