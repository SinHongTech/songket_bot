"""
Pure Python RFC 6238 TOTP (Time-based One-Time Password) Engine.
Compatible with Google Authenticator, Microsoft Authenticator, 1Password, Authy, Apple Keychain.
Zero external dependencies.
"""

import base64
import hashlib
import hmac
import re
import secrets
import struct
import time
from typing import List, Optional
from urllib.parse import quote


def generate_totp_secret() -> str:
    """Generate a 160-bit cryptographically secure Base32 secret string."""
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode("utf-8").replace("=", "")


def get_totp_uri(secret: str, username: str, issuer: str = "Songket") -> str:
    """Generate the standard otpauth:// URI for QR code scanning in Google Authenticator."""
    clean_secret = str(secret).strip().replace(" ", "").replace("-", "").upper()
    clean_user = quote(str(username).strip().replace(":", "_"))
    clean_issuer = quote(str(issuer).strip().replace(":", "_"))
    return (
        f"otpauth://totp/{clean_issuer}:{clean_user}"
        f"?secret={clean_secret}&issuer={clean_issuer}&algorithm=SHA1&digits=6&period=30"
    )


def compute_totp_code(secret: str, for_time: Optional[int] = None) -> Optional[str]:
    """Compute the expected 6-digit TOTP code for a given timestamp."""
    if not secret:
        return None
    try:
        clean_secret = str(secret).strip().replace(" ", "").replace("-", "").upper()
        t = for_time if for_time is not None else int(time.time())
        step = t // 30
        padded = clean_secret + "=" * ((8 - len(clean_secret) % 8) % 8)
        key = base64.b32decode(padded, casefold=True)
        msg = struct.pack(">Q", step)
        h = hmac.new(key, msg, hashlib.sha1).digest()
        offset = h[19] & 0x0F
        truncated = struct.unpack(">I", h[offset : offset + 4])[0] & 0x7FFFFFFF
        return f"{truncated % 1_000_000:06d}"
    except Exception:
        return None


import logging

logger = logging.getLogger("totp")


def verify_totp_code(secret: str, code: str, window: int = 2) -> bool:
    """
    Verify a 6-digit TOTP code against a secret key with time drift tolerance.
    window = 2 checks: [-60s, -30s, 0s, +30s, +60s] (5 intervals).
    """
    if not secret or not code:
        logger.warning("[TOTP Verify] Missing secret or code (has_secret=%s, has_code=%s)", bool(secret), bool(code))
        return False
    clean_code = re.sub(r"\D", "", str(code))
    if len(clean_code) != 6:
        logger.warning("[TOTP Verify] Invalid clean_code length: %d (raw='%s')", len(clean_code), code)
        return False

    try:
        clean_secret = str(secret).strip().replace(" ", "").replace("-", "").upper()
        padded = clean_secret + "=" * ((8 - len(clean_secret) % 8) % 8)
        key = base64.b32decode(padded, casefold=True)
        current_step = int(time.time() // 30)

        expected_codes = []
        for step in range(current_step - window, current_step + window + 1):
            msg = struct.pack(">Q", step)
            h = hmac.new(key, msg, hashlib.sha1).digest()
            offset = h[19] & 0x0F
            truncated = struct.unpack(">I", h[offset : offset + 4])[0] & 0x7FFFFFFF
            expected = f"{truncated % 1_000_000:06d}"
            expected_codes.append(expected)
            if hmac.compare_digest(expected, clean_code):
                logger.info("[TOTP Verify] MATCH found (offset=%ds)", (step - current_step) * 30)
                return True
        logger.warning("[TOTP Verify] MISMATCH for code '%s'. Expected in window [-60s..+60s]: %s", clean_code, expected_codes)
        return False
    except Exception as e:
        logger.error("[TOTP Verify] Exception during verification: %s", e)
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
    clean = re.sub(r"[^a-zA-Z0-9]", "", str(code)).upper()
    return hashlib.sha256(clean.encode()).hexdigest()

