from __future__ import annotations

import html
import json
import os
import re
import sqlite3
from contextlib import closing
from datetime import datetime, time as datetime_time, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


DATABASE_PATH = Path(os.environ.get("METRICS_DB", "/data/metrics.sqlite3"))
PUBLIC_ORIGIN = os.environ.get(
    "PUBLIC_ORIGIN", "https://whatsapp-viewer.runcode.qzz.io"
).rstrip("/")
PORT = int(os.environ.get("PORT", "8080"))
BRASILIA = timezone(timedelta(hours=-3))
CONTACT_PATH = "/__contact"
CONTACT_RETENTION_DAYS = 365
MAX_CONTACTS_PER_DAY = 500
MAX_CONTACT_BODY_BYTES = 16_384
EMAIL_PATTERN = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,63}$")

CONTACT_CATEGORIES = {
    "support": "Suporte técnico",
    "privacy": "Privacidade e dados",
    "security": "Segurança",
    "partnership": "Parcerias e publicidade",
    "suggestion": "Sugestão",
    "other": "Outro assunto",
}

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


class ContactLimitReached(Exception):
    pass


class ContactValidationError(Exception):
    pass


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
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS contact_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                category TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx
            ON contact_requests (created_at DESC)
            """
        )
        delete_expired_contacts(connection)
        connection.commit()


def today() -> str:
    return datetime.now(BRASILIA).date().isoformat()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def brasilia_period_start(days: int) -> str:
    start_date = datetime.now(BRASILIA).date() - timedelta(days=days - 1)
    local_start = datetime.combine(start_date, datetime_time.min, tzinfo=BRASILIA)
    return local_start.astimezone(timezone.utc).isoformat(timespec="seconds")


def delete_expired_contacts(connection: sqlite3.Connection) -> None:
    cutoff = (utc_now() - timedelta(days=CONTACT_RETENTION_DAYS)).isoformat(
        timespec="seconds"
    )
    connection.execute(
        "DELETE FROM contact_requests WHERE created_at < ?",
        (cutoff,),
    )


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


def validate_contact(payload: object) -> dict[str, str] | None:
    if not isinstance(payload, dict):
        raise ContactValidationError("Preencha os campos do formulário.")

    website = payload.get("website", "")
    if isinstance(website, str) and website.strip():
        return None

    values: dict[str, str] = {}
    for field in ("name", "email", "category", "subject", "message"):
        value = payload.get(field)
        if not isinstance(value, str):
            raise ContactValidationError("Preencha todos os campos obrigatórios.")
        values[field] = value.strip()

    if not 2 <= len(values["name"]) <= 100 or re.search(r"[\r\n\0]", values["name"]):
        raise ContactValidationError("Informe um nome válido.")
    if not EMAIL_PATTERN.fullmatch(values["email"]) or len(values["email"]) > 254:
        raise ContactValidationError("Informe um e-mail válido.")
    if values["category"] not in CONTACT_CATEGORIES:
        raise ContactValidationError("Selecione um assunto válido.")
    if not 5 <= len(values["subject"]) <= 120 or re.search(r"[\r\n\0]", values["subject"]):
        raise ContactValidationError("O título deve ter entre 5 e 120 caracteres.")
    if not 20 <= len(values["message"]) <= 3000 or "\0" in values["message"]:
        raise ContactValidationError("A mensagem deve ter entre 20 e 3.000 caracteres.")
    if payload.get("consent") is not True:
        raise ContactValidationError("Confirme a autorização para enviar a solicitação.")

    started_at = payload.get("startedAt")
    if isinstance(started_at, bool) or not isinstance(started_at, (int, float)):
        raise ContactValidationError("Atualize a página e tente novamente.")
    elapsed_ms = int(utc_now().timestamp() * 1000) - int(started_at)
    if elapsed_ms < 2_000 or elapsed_ms > 86_400_000:
        raise ContactValidationError("Revise os dados do formulário e tente novamente.")

    values["email"] = values["email"].lower()
    return values


def record_contact(values: dict[str, str]) -> int:
    created_at = utc_now().isoformat(timespec="seconds")
    today_start = brasilia_period_start(1)
    with closing(connect()) as connection:
        connection.execute("BEGIN IMMEDIATE")
        delete_expired_contacts(connection)
        count_today = int(
            connection.execute(
                "SELECT COUNT(*) FROM contact_requests WHERE created_at >= ?",
                (today_start,),
            ).fetchone()[0]
        )
        if count_today >= MAX_CONTACTS_PER_DAY:
            connection.rollback()
            raise ContactLimitReached
        cursor = connection.execute(
            """
            INSERT INTO contact_requests
                (created_at, name, email, category, subject, message)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                created_at,
                values["name"],
                values["email"],
                values["category"],
                values["subject"],
                values["message"],
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)


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


def contact_count(days: int | None = None) -> int:
    where = ""
    params: tuple[str, ...] = ()
    if days is not None:
        where = "WHERE created_at >= ?"
        params = (brasilia_period_start(days),)
    with closing(connect()) as connection:
        return int(
            connection.execute(
                f"SELECT COUNT(*) FROM contact_requests {where}",
                params,
            ).fetchone()[0]
        )


def recent_contacts(limit: int = 100) -> list[sqlite3.Row]:
    with closing(connect()) as connection:
        connection.row_factory = sqlite3.Row
        delete_expired_contacts(connection)
        connection.commit()
        return connection.execute(
            """
            SELECT id, created_at, name, email, category, subject, message
            FROM contact_requests
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()


def format_contact_datetime(value: str) -> str:
    try:
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(BRASILIA).strftime("%d/%m/%Y %H:%M")
    except ValueError:
        return value


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
    contact_totals = {
        "today": contact_count(1),
        "week": contact_count(7),
        "month": contact_count(30),
        "all": contact_count(),
    }
    contacts = recent_contacts()

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

    contact_rows = "".join(
        f"""
        <tr>
          <td><strong>#{int(row["id"])}</strong><small>{html.escape(format_contact_datetime(str(row["created_at"])))}</small></td>
          <td>{html.escape(CONTACT_CATEGORIES.get(str(row["category"]), str(row["category"])))}</td>
          <td><strong>{html.escape(str(row["name"]))}</strong><small>{html.escape(str(row["email"]))}</small></td>
          <td><strong>{html.escape(str(row["subject"]))}</strong><p>{html.escape(str(row["message"]))}</p></td>
        </tr>
        """
        for row in contacts
    )
    if not contact_rows:
        contact_rows = '<tr><td colspan="4" class="empty">Nenhuma solicitação de contato recebida.</td></tr>'

    generated_at = datetime.now(BRASILIA).strftime("%d/%m/%Y às %H:%M:%S")
    document = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="60">
  <title>Dashboard · WhatsApp Export Viewer</title>
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
    .contact-cards {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 18px; }}
    .contact-cards .card span {{ min-height: auto; }}
    .contacts th, .contacts td {{ text-align: left; vertical-align: top; white-space: normal; }}
    .contacts td:nth-child(1) {{ width: 130px; }}
    .contacts td:nth-child(2) {{ width: 180px; }}
    .contacts td:nth-child(3) {{ width: 220px; overflow-wrap: anywhere; }}
    .contacts strong, .contacts small {{ display: block; }}
    .contacts small {{ margin-top: 5px; color: #607066; font-size: 11px; }}
    .contacts p {{ margin-top: 7px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.55; }}
    footer {{ margin-top: 16px; color: #607066; font-size: 12px; line-height: 1.6; }}
    @media (max-width: 800px) {{
      main {{ margin: 28px auto; }}
      header {{ align-items: flex-start; flex-direction: column; }}
      .cards {{ grid-template-columns: repeat(2, 1fr); }}
      .contact-cards {{ grid-template-columns: repeat(2, 1fr); }}
      .panel {{ overflow-x: auto; }}
    }}
    @media (max-width: 480px) {{ .cards, .contact-cards {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
  <main>
    <header>
      <div><h1>Dashboard interno</h1><p>Tráfego agregado e solicitações de contato, no horário de Brasília.</p></div>
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
    <section class="contact-cards" aria-label="Resumo de contatos">
      <article class="card"><span>Contatos hoje</span><strong>{format_number(contact_totals["today"])}</strong></article>
      <article class="card"><span>Últimos 7 dias</span><strong>{format_number(contact_totals["week"])}</strong></article>
      <article class="card"><span>Últimos 30 dias</span><strong>{format_number(contact_totals["month"])}</strong></article>
      <article class="card"><span>Total armazenado</span><strong>{format_number(contact_totals["all"])}</strong></article>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Solicitações de contato</h2><p>100 mais recentes · retenção de 12 meses</p></div>
      <table class="contacts">
        <thead><tr><th>Protocolo</th><th>Categoria</th><th>Contato</th><th>Solicitação</th></tr></thead>
        <tbody>{contact_rows}</tbody>
      </table>
    </section>
    <footer>
      Atualizado em {html.escape(generated_at)}. A página recarrega a cada 60 segundos.<br>
      Métricas não armazenam IP, navegador, nome de arquivo, URL, conteúdo ou metadados de conversas.<br>
      Dados enviados voluntariamente pelo formulário ficam no banco privado e são removidos após 12 meses.
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

    def send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_common_headers("application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def is_same_origin_request(self) -> bool:
        origin = self.headers.get("Origin", "").rstrip("/")
        fetch_site = self.headers.get("Sec-Fetch-Site", "")
        return origin == PUBLIC_ORIGIN and fetch_site in ("", "same-origin")

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
        if path == CONTACT_PATH:
            self.handle_contact()
            return

        event = EVENTS.get(path)
        if event is None:
            self.send_response(404)
            self.send_common_headers()
            self.end_headers()
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            content_length = -1
        if (
            not self.is_same_origin_request()
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

    def handle_contact(self) -> None:
        try:
            content_length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            content_length = -1
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()

        if not self.is_same_origin_request():
            self.send_json(403, {"message": "Solicitação não autorizada."})
            return
        if content_type != "application/json" or not 0 < content_length <= MAX_CONTACT_BODY_BYTES:
            self.send_json(400, {"message": "Conteúdo do formulário inválido."})
            return

        try:
            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body.decode("utf-8"))
            values = validate_contact(payload)
            if values is None:
                self.send_json(201, {"reference": 0})
                return
            reference = record_contact(values)
            self.send_json(201, {"reference": reference})
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(400, {"message": "Conteúdo do formulário inválido."})
        except ContactValidationError as error:
            self.send_json(422, {"message": str(error)})
        except ContactLimitReached:
            self.send_json(
                429,
                {"message": "Recebemos muitas mensagens agora. Aguarde e tente novamente."},
            )
        except sqlite3.Error:
            self.send_json(503, {"message": "O formulário está temporariamente indisponível."})

    def log_message(self, _format: str, *_args: object) -> None:
        return


if __name__ == "__main__":
    initialize_database()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), MetricsHandler)
    server.serve_forever()
