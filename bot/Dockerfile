FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libzbar0 \
    chromium \
    fonts-khmeros \
    fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY bot/requirements.txt ./bot/requirements.txt
RUN pip install --no-cache-dir -r bot/requirements.txt

COPY bot ./bot

ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "bot.main"]
