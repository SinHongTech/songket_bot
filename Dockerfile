FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git make cmake g++ gperf libssl-dev zlib1g-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --recursive https://github.com/tdlib/telegram-bot-api.git .

RUN mkdir -p build && cd build \
    && cmake -DCMAKE_BUILD_TYPE=Release .. \
    && cmake --build . --target install -j"$(nproc)"

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 zlib1g ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/telegram-bot-api /usr/local/bin/telegram-bot-api

WORKDIR /app

COPY bot/requirements.txt ./bot/requirements.txt
RUN pip install --no-cache-dir -r bot/requirements.txt

COPY bot ./bot
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/entrypoint.sh"]
