FROM aiogram/telegram-bot-api:latest AS binary-source

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 zlib1g ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=binary-source /usr/local/bin/telegram-bot-api /usr/local/bin/telegram-bot-api
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8081

ENTRYPOINT ["/entrypoint.sh"]
