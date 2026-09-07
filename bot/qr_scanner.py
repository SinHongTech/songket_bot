"""
QR Code Scanner Module for Songket Security Bot.

Decodes QR codes embedded in Telegram photos, stickers, and documents,
and extracts destination URLs for automated security scanning.
"""
from __future__ import annotations

import io
import logging
import re
from typing import Optional

try:
    from PIL import Image
except ImportError:
    Image = None

from bot.utils import extract_urls

logger = logging.getLogger("BeydaBot.qr_scanner")

# Check if advanced QR libraries are installed
_QR_BACKEND = None
try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    _QR_BACKEND = "pyzbar"
except ImportError:
    try:
        import cv2
        _QR_BACKEND = "cv2"
    except ImportError:
        _QR_BACKEND = "pil" if Image is not None else None


def decode_qr_from_bytes(image_bytes: bytes) -> list[str]:
    """Decode all QR code text strings from image bytes."""
    if not image_bytes or len(image_bytes) < 32:
        return []

    decoded_texts: list[str] = []

    if Image is not None:
        try:
            img = Image.open(io.BytesIO(image_bytes))

            # 1. Try PyZbar if available
            if _QR_BACKEND == "pyzbar":
                try:
                    from pyzbar.pyzbar import decode
                    # Attempt decode directly, in grayscale, and in RGB
                    candidates = [img]
                    try:
                        candidates.append(img.convert("L"))
                    except Exception:
                        pass
                    try:
                        candidates.append(img.convert("RGB"))
                    except Exception:
                        pass
                    try:
                        from PIL import ImageOps
                        candidates.append(ImageOps.invert(img.convert("L")))
                    except Exception:
                        pass

                    for candidate in candidates:
                        try:
                            results = decode(candidate)
                            for res in results:
                                if res.data:
                                    try:
                                        text = res.data.decode("utf-8", errors="ignore").strip()
                                        if text and text not in decoded_texts:
                                            decoded_texts.append(text)
                                    except Exception:
                                        pass
                            if decoded_texts:
                                return decoded_texts
                        except Exception:
                            continue
                except Exception as e:
                    logger.debug("pyzbar decode failed: %s", e)

            # 2. Try OpenCV if available
            if _QR_BACKEND == "cv2":
                try:
                    import cv2
                    import numpy as np
                    cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                    detector = cv2.QRCodeDetector()
                    val, points, _ = detector.detectAndDecode(cv_img)
                    if val:
                        decoded_texts.append(val)
                        return decoded_texts
                except Exception as e:
                    logger.debug("cv2 qr decode failed: %s", e)

            # 3. Fallback: inspect raw image metadata / text comments for embedded URLs
            if hasattr(img, "info") and isinstance(img.info, dict):
                for k, v in img.info.items():
                    if isinstance(v, str) and ("http://" in v or "https://" in v or "tg://" in v):
                        decoded_texts.append(v)
        except Exception as exc:
            logger.debug("Image parse error for QR decode: %s", exc)

    # 4. Fallback: inspect raw bytes for embedded URL strings
    try:
        raw_str = image_bytes.decode("latin1", errors="ignore")
        found = re.findall(r"https?://[^\s<>\"'{}|\\^`\x00-\x1f]+", raw_str)
        if found:
            decoded_texts.extend(found[:5])
    except Exception:
        pass

    return decoded_texts


def extract_urls_from_qr(image_bytes: bytes) -> list[str]:
    """Extract all web and Telegram auth URLs embedded inside image QR codes."""
    raw_texts = decode_qr_from_bytes(image_bytes)
    found_urls: list[str] = []

    for text in raw_texts:
        if not text:
            continue
        # Extract standard http/https URLs
        urls = extract_urls(text)
        found_urls.extend(urls)

        # Extract Telegram login / token URLs (e.g. tg://login?token=..., https://t.me/login...)
        tg_matches = re.findall(r"(?:tg://login\?[^\s<>\"']+)|(?:https?://t\.me/[^\s<>\"']+)", text, re.IGNORECASE)
        found_urls.extend(tg_matches)

    return list(dict.fromkeys(found_urls))
