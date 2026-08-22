# Builds the official self-hosted Telegram Bot API server from source.
# https://github.com/tdlib/telegram-bot-api
#
# Running your own Bot API server removes the 20MB file-download limit that
# api.telegram.org imposes, which lets the security bot scan much larger
# attachments with VirusTotal.

FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    git make cmake g++ gperf libssl-dev zlib1g-dev ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src
RUN git clone --depth 1 --recursive https://github.com/tdlib/telegram-bot-api.git .

RUN mkdir -p build && cd build \
    && cmake -DCMAKE_BUILD_TYPE=Release .. \
    && cmake --build . --target install -j"$(nproc)"

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl3 zlib1g ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/telegram-bot-api /usr/local/bin/telegram-bot-api
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8081

ENTRYPOINT ["/entrypoint.sh"]
