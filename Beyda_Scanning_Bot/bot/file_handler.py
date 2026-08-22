"""Download and pre-filter Telegram file attachments before they hit VirusTotal."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from bot import config
from bot.telegram_api import TelegramAPI
from bot.utils import is_file_candidate, looks_dangerous_bytes

logger = logging.getLogger("BeydaBot.file_handler")


@dataclass
class FileDecision:
    ok: bool
    reason: str
    file_bytes: Optional[bytes] = None
    oversize: bool = False
    size_mb: int = 0


def fetch_and_validate(api: TelegramAPI, file_id: str, filename: str, filesize: int, mime_type: str) -> FileDecision:
    """Download a document and decide whether it should be sent to VirusTotal."""
    if filesize and filesize > config.MAX_FILE_SIZE_BYTES:
        size_mb = filesize // (1024 * 1024)
        logger.warning("File too large to scan | %s | %d MB", filename, size_mb)
        return FileDecision(ok=False, reason="oversize", oversize=True, size_mb=size_mb)

    file_bytes = api.download_file(file_id)
    if not file_bytes:
        return FileDecision(ok=False, reason="download_failed")

    if len(file_bytes) > config.MAX_FILE_SIZE_BYTES:
        size_mb = len(file_bytes) // (1024 * 1024)
        logger.warning("Downloaded file exceeds size limit | %s | %d MB", filename, size_mb)
        return FileDecision(ok=False, reason="oversize", oversize=True, size_mb=size_mb)

    logger.info("File downloaded | %s | bytes=%d | mime=%s", filename, len(file_bytes), mime_type or "unknown")

    scannable = is_file_candidate(filename, mime_type)
    if not scannable and not looks_dangerous_bytes(file_bytes):
        logger.info("Safe file prefilter | %s", filename)
        return FileDecision(ok=False, reason="prefiltered_safe")

    return FileDecision(ok=True, reason="scan", file_bytes=file_bytes)
