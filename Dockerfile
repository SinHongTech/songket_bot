FROM aiogram/telegram-bot-api:latest AS binary-source

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv libssl3 zlib1g ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=binary-source /usr/local/bin/telegram-bot-api /usr/local/bin/telegram-bot-api

WORKDIR /app

COPY bot/requirements.txt ./bot/requirements.txt
RUN pip install --no-cache-dir --break-system-packages -r bot/requirements.txt || pip install --no-cache-dir -r bot/requirements.txt

COPY bot ./bot
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/entrypoint.sh"]
