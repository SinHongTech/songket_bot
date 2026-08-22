#!/bin/sh
set -e

: "${TELEGRAM_API_ID:?TELEGRAM_API_ID must be set (see https://my.telegram.org)}"
: "${TELEGRAM_API_HASH:?TELEGRAM_API_HASH must be set (see https://my.telegram.org)}"

telegram-bot-api \
    --api-id="${TELEGRAM_API_ID}" \
    --api-hash="${TELEGRAM_API_HASH}" \
    --http-port=8081 \
    --dir=/var/lib/telegram-bot-api \
    --local &

sleep 5

exec python -m bot.main
