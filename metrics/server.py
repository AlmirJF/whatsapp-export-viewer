from __future__ import annotations

import html
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


DATABASE_PATH = Path(os.environ.get("METRICS_DB", "/data/metrics.sqlite3"))
PUBLIC_ORIGIN = os.environ.get(
    "PUBLIC_ORIGIN", "https://whatsapp-viewer.runcode.qzz.io"
).rstrip("/")
PORT = int(os.environ.get("PORT", "8080"))
BRASILIA = timezone(timedelta(hours=-3))

EVENTS = {
    "/__metrics/visit": "visit",
    "/__metrics/import-started": "import_started",
    "/__metrics/import-succeeded": "import_succeeded",
    "/__metrics/import-failed": "import_failed",
}

EVENT_LABELS = {
    "visit": "Visitas",
    "import_started": "Tentativas de abertura",
    "import_succeeded": "Aberturas concluídas",
    "import_failed": "Erros de abertura",
}


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH, timeout=5)
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def initialize_database() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(connect()) as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS daily_metrics (
                day TEXT NOT NULL,
                event TEXT NOT NULL,
                count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
                PRIMARY KEY (day, event)
            )
            """
        )
        connection.commit()


def today() -> str:
    return datetime.now(BRASILIA).date().isoformat()


def record(event: str) -> None:
    with closing(connect()) as connection:
        connection.execute(
            """
            INSERT INTO daily_metrics (day, event, count)
            VALUES (?, ?, 1)
            ON CONFLICT(day, event) DO UPDATE SET count = count + 1
            """,
            (today(), event),
        )
        connection.commit()


def totals_since(days: int | None = None) -> dict[str, int]:
    params: tuple[str, ...] = ()
    where = ""
    if days is not None:
        start = (datetime.now(BRASILIA).date() - timedelta(days=days - 1)).isoformat()
        where = "WHERE day >= ?"
        params = (start,)

    values = {event: 0 for event in EVENT_LABELS}
    with closing(connect()) as connection:
        rows = connection.execute(
            f"SELECT event, SUM(count) FROM daily_metrics {where} GROUP BY event",
            params,
        ).fetchall()
    for event, count in rows:
        if event in values:
            values[event] = int(count)
    return values


def recent_days(limit: int = 30) -> list[dict[str, int | str]]:
    start = (datetime.now(BRASILIA).date() - timedelta(days=limit - 1)).isoformat()
    by_day: dict[str, dict[str, int | str]] = {}
    with closing(connect()) as connection:
        rows = connection.execute(
            """
            SELECT day, event, count
            FROM daily_metrics
            WHERE day >= ?
            ORDER BY day DESC, event
            """,
            (start,),
        ).fetchall()

    for day, event, count in rows:
        entry = by_day.setdefault(
            day,
            {"day": day, **{known_event: 0 for known_event in EVENT_LABELS}},
        )
        if event in EVENT_LABELS:
            entry[event] = int(count)
    return [by_day[day] for day in sorted(by_day, reverse=True)]


def format_number(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def percentage(numerator: int, denominator: int) -> str:
    if denominator <= 0:
        return "—"
    return f"{(numerator / denominator) * 100:.1f}%".replace(".", ",")


def render_dashboard() -> bytes:
    current = totals_since(1)
    week = totals_since(7)
    month = totals_since(30)
    all_time = totals_since()
    rows = recent_days()

    cards = "".join(
        f"""
        <article class="card">
          <span>{html.escape(label)}</span>
          <strong>{format_number(all_time[event])}</strong>
          <small>Hoje {format_number(current[event])} · 7 dias {format_number(week[event])} · 30 dias {format_number(month[event])}</small>
        </article>
        """
        for event, label in EVENT_LABELS.items()
    )

    table_rows = "".join(
        f"""
        <tr>
          <td>{html.escape(str(row["day"]))}</td>
          <td>{format_number(int(row["visit"]))}</td>
          <td>{format_number(int(row["import_started"]))}</td>
          <td>{format_number(int(row["import_succeeded"]))}</td>
          <td>{format_number(int(row["import_failed"]))}</td>
          <td>{percentage(int(row["import_succeeded"]), int(row["import_started"]))}</td>
        </tr>
        """
        for row in rows
    )
    if not table_rows:
        table_rows = '<tr><td colspan="6" class="empty">Ainda não há eventos contabilizados.</td></tr>'

    generated_at = datetime.now(BRASILIA).strftime("%d/%m/%Y às %H:%M:%S")
    document = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="60">
  <title>Métricas · WhatsApp Export Viewer</title>
  <style>
    :root {{ color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f4f7f5; color: #15231b; }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; }}
    main {{ width: min(1120px, calc(100% - 32px)); margin: 48px auto; }}
    header {{ display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }}
    h1 {{ margin: 0 0 8px; font-size: clamp(28px, 4vw, 42px); letter-spacing: -.04em; }}
    p {{ margin: 0; color: #607066; }}
    .badge {{ padding: 9px 12px; border: 1px solid #b9d5c4; border-radius: 999px; background: #e9f5ed; color: #146b3a; font-size: 13px; font-weight: 700; }}
    .cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }}
    .card {{ padding: 20px; border: 1px solid #dce5df; border-radius: 16px; background: white; box-shadow: 0 8px 24px rgba(21, 35, 27, .05); }}
    .card span, .card small {{ display: block; color: #607066; }}
    .card span {{ min-height: 36px; font-size: 13px; font-weight: 700; }}
    .card strong {{ display: block; margin: 10px 0 8px; font-size: 32px; letter-spacing: -.04em; }}
    .card small {{ font-size: 11px; line-height: 1.5; }}
    .panel {{ margin-top: 18px; overflow: hidden; border: 1px solid #dce5df; border-radius: 16px; background: white; }}
    .panel-head {{ display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px; border-bottom: 1px solid #e7ede9; }}
    h2 {{ margin: 0; font-size: 17px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
    th, td {{ padding: 13px 16px; border-bottom: 1px solid #eef2ef; text-align: right; white-space: nowrap; }}
    th:first-child, td:first-child {{ text-align: left; }}
    th {{ color: #607066; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }}
    tbody tr:last-child td {{ border-bottom: 0; }}
    .empty {{ padding: 40px; color: #607066; text-align: center !important; }}
    footer {{ margin-top: 16px; color: #607066; font-size: 12px; line-height: 1.6; }}
    @media (max-width: 800px) {{
      main {{ margin: 28px auto; }}
      header {{ align-items: flex-start; flex-direction: column; }}
      .cards {{ grid-template-columns: repeat(2, 1fr); }}
      .panel {{ overflow-x: auto; }}
    }}
    @media (max-width: 480px) {{ .cards {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
  <main>
    <header>
      <div><h1>Métricas internas</h1><p>Contagens agregadas, no horário de Brasília.</p></div>
      <span class="badge">Acesso local via SSH</span>
    </header>
    <section class="cards" aria-label="Resumo">{cards}</section>
    <section class="panel">
      <div class="panel-head"><h2>Últimos 30 dias com atividade</h2><p>Conversão = concluídas ÷ tentativas</p></div>
      <table>
        <thead><tr><th>Dia</th><th>Visitas</th><th>Tentativas</th><th>Concluídas</th><th>Erros</th><th>Conversão</th></tr></thead>
        <tbody>{table_rows}</tbody>
      </table>
    </section>
    <footer>
      Atualizado em {html.escape(generated_at)}. A página recarrega a cada 60 segundos.<br>
      Não são armazenados IP, navegador, nome de arquivo, URL, conteúdo ou metadados de conversas.
    </footer>
  </main>
</body>
</html>"""
    return document.encode("utf-8")


class MetricsHandler(BaseHTTPRequestHandler):
    server_version = ""
    sys_version = ""

    def send_common_headers(self, content_type: str | None = None) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        if content_type:
            self.send_header("Content-Type", content_type)

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/healthz":
            try:
                with closing(connect()) as connection:
                    connection.execute("SELECT 1").fetchone()
                self.send_response(204)
                self.send_common_headers()
                self.end_headers()
            except sqlite3.Error:
                self.send_response(503)
                self.send_common_headers()
                self.end_headers()
            return

        if path != "/":
            self.send_response(404)
            self.send_common_headers()
            self.end_headers()
            return

        body = render_dashboard()
        self.send_response(200)
        self.send_common_headers("text/html; charset=utf-8")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        )
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:
        path = urlsplit(self.path).path
        event = EVENTS.get(path)
        if event is None:
            self.send_response(404)
            self.send_common_headers()
            self.end_headers()
            return

        origin = self.headers.get("Origin", "").rstrip("/")
        fetch_site = self.headers.get("Sec-Fetch-Site", "")
        try:
            content_length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            content_length = -1
        if (
            origin != PUBLIC_ORIGIN
            or fetch_site not in ("", "same-origin")
            or content_length != 0
        ):
            self.send_response(403)
            self.send_common_headers()
            self.end_headers()
            return

        try:
            record(event)
            self.send_response(204)
        except sqlite3.Error:
            self.send_response(503)
        self.send_common_headers()
        self.end_headers()

    def log_message(self, _format: str, *_args: object) -> None:
        return


if __name__ == "__main__":
    initialize_database()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), MetricsHandler)
    server.serve_forever()
