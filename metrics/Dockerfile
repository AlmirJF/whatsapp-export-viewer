FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    METRICS_DB=/data/metrics.sqlite3 \
    PORT=8080

RUN groupadd --gid 10001 metrics \
    && useradd --uid 10001 --gid metrics --no-create-home --shell /usr/sbin/nologin metrics \
    && install -d -o metrics -g metrics -m 0750 /data

WORKDIR /app
COPY --chown=metrics:metrics server.py ./server.py

USER metrics
EXPOSE 8080
VOLUME ["/data"]

CMD ["python", "server.py"]
