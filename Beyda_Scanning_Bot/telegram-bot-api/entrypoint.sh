#!/bin/sh
# Reads TELEGRAM_API_ID / TELEGRAM_API_HASH from the environment so the
# server can be started the same way on docker-compose, Railway, or any
# other host without depending on shell variable substitution in a
# platform's "start command" field.
set -e

: "${TELEGRAM_API_ID:?TELEGRAM_API_ID must be set (see https://my.telegram.org)}"
: "${TELEGRAM_API_HASH:?TELEGRAM_API_HASH must be set (see https://my.telegram.org)}"

exec telegram-bot-api \
    --api-id="${TELEGRAM_API_ID}" \
    --api-hash="${TELEGRAM_API_HASH}" \
    --http-port=8081 \
    --dir=/var/lib/telegram-bot-api \
    --local
