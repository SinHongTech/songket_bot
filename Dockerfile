FROM aiogram/telegram-bot-api:latest

RUN apk add --no-cache python3 py3-pip

WORKDIR /app

COPY bot/requirements.txt ./bot/requirements.txt
RUN pip install --no-cache-dir --break-system-packages -r bot/requirements.txt

COPY bot ./bot
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/entrypoint.sh"]
