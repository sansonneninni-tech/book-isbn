#!/usr/bin/env python3
"""
Telegram message sender per test antispam.

Invia un messaggio (y) su un gruppo (z) ogni (x) secondi, registrando ogni
invio su un file JSONL cosi' che la piattaforma antispam possa correlare
quello che ha visto con quello che e' stato realmente inviato.

Pensato per gruppi di test di proprieta' di chi lo esegue. Il bot deve essere
stato aggiunto al gruppo: senza questo Telegram rifiuta ogni invio.

Uso rapido:
    export TELEGRAM_BOT_TOKEN="123456:ABC..."
    python sender.py chats                       # trova il chat_id del gruppo
    python sender.py send -c -1001234567890 -m "ciao" -i 5 -n 10
"""

import argparse
import json
import os
import random
import signal
import string
import sys
import time
import uuid
from datetime import datetime, timezone

import requests

API_BASE = "https://api.telegram.org/bot{token}/{method}"

# Telegram limita gli invii a ~20 messaggi/minuto per gruppo. Sotto questa
# soglia il rischio non e' solo il rate limit ma il ban del bot, quindi un
# intervallo piu' aggressivo va chiesto esplicitamente con --force.
SAFE_MIN_INTERVAL = 3.0
HARD_MIN_INTERVAL = 0.2

# Errori che non hanno senso ritentare: token invalido, chat inesistente,
# bot non nel gruppo. Riprovare produrrebbe solo lo stesso errore.
FATAL_ERROR_CODES = (400, 401, 403, 404)


class Stop(Exception):
    """Sollevata quando arriva SIGINT/SIGTERM, per uscire pulito dal loop."""


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_dotenv(path):
    """Carica KEY=VALUE da un .env senza dipendenze esterne."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def get_token(args):
    token = args.token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        sys.exit(
            "Token mancante. Passa --token oppure esporta TELEGRAM_BOT_TOKEN "
            "(o mettilo in telegram_tester/.env)."
        )
    return token


def api_call(token, method, params=None, timeout=20):
    """Chiamata alla Bot API. Ritorna (ok, payload_o_errore)."""
    url = API_BASE.format(token=token, method=method)
    try:
        response = requests.post(url, json=params or {}, timeout=timeout)
    except requests.RequestException as exc:
        return False, {"error": f"network: {exc}"}

    try:
        body = response.json()
    except ValueError:
        return False, {"error": f"http {response.status_code}: risposta non JSON"}

    if body.get("ok"):
        return True, body.get("result")
    return False, {
        "error": body.get("description", "errore sconosciuto"),
        "error_code": body.get("error_code"),
        "retry_after": body.get("parameters", {}).get("retry_after"),
    }


# --------------------------------------------------------------------------
# comando: chats
# --------------------------------------------------------------------------

def cmd_chats(args):
    """Elenca le chat viste di recente dal bot, per scoprire il chat_id."""
    token = get_token(args)
    ok, result = api_call(token, "getUpdates", {"limit": 100, "timeout": 0})
    if not ok:
        sys.exit(f"getUpdates fallita: {result['error']}")

    chats = {}
    for update in result:
        for key in ("message", "edited_message", "channel_post", "my_chat_member"):
            chat = (update.get(key) or {}).get("chat")
            if chat:
                chats[chat["id"]] = chat

    if not chats:
        print(
            "Nessuna chat trovata.\n"
            "- aggiungi il bot al gruppo\n"
            "- scrivi un messaggio qualsiasi nel gruppo\n"
            "- rilancia questo comando\n"
            "Nota: se il bot ha la privacy mode attiva (default), vede solo i\n"
            "comandi tipo /start. Disattivala da BotFather con /setprivacy."
        )
        return

    print(f"{'chat_id':>16}  {'tipo':<10} titolo")
    for chat_id, chat in sorted(chats.items()):
        title = chat.get("title") or chat.get("username") or chat.get("first_name", "")
        print(f"{chat_id:>16}  {chat.get('type', '?'):<10} {title}")


# --------------------------------------------------------------------------
# comando: send
# --------------------------------------------------------------------------

def build_messages(args):
    """Ritorna la lista dei template da inviare (rotazione o random)."""
    messages = []
    if args.message_file:
        with open(args.message_file, encoding="utf-8") as fh:
            messages = [
                line.rstrip("\n")
                for line in fh
                if line.strip() and not line.lstrip().startswith("#")
            ]
        if not messages:
            sys.exit(f"{args.message_file} non contiene messaggi.")
    if args.message:
        messages.extend(args.message)
    if not messages:
        sys.exit("Serve almeno un messaggio: usa -m/--message o --message-file.")
    return messages


def render(template, index, run_id):
    """Espande i placeholder del template.

    {n}    progressivo dell'invio (da 1)
    {ts}   timestamp ISO UTC
    {unix} timestamp unix intero
    {rand} stringa casuale di 8 caratteri
    {uuid} uuid4 completo
    {run}  id di questa sessione di test
    """
    return (
        template.replace("{n}", str(index))
        .replace("{ts}", _now_iso())
        .replace("{unix}", str(int(time.time())))
        .replace("{rand}", "".join(random.choices(string.ascii_lowercase + string.digits, k=8)))
        .replace("{uuid}", str(uuid.uuid4()))
        .replace("{run}", run_id)
    )


def send_one(token, chat_id, text, args):
    """Invia un messaggio gestendo il 429. Ritorna un dict con l'esito."""
    params = {
        "chat_id": chat_id,
        "text": text,
        "disable_notification": args.silent,
        "disable_web_page_preview": True,
    }
    if args.parse_mode:
        params["parse_mode"] = args.parse_mode
    if args.reply_to:
        params["reply_to_message_id"] = args.reply_to

    attempt = 0
    while True:
        attempt += 1
        ok, result = api_call(token, "sendMessage", params)
        if ok:
            return {"ok": True, "message_id": result.get("message_id"), "attempts": attempt}

        retry_after = result.get("retry_after")
        if retry_after and attempt <= args.max_retries:
            wait = retry_after + 1
            print(f"  ! rate limit: attendo {wait}s (tentativo {attempt})", flush=True)
            time.sleep(wait)
            continue

        if result.get("error", "").startswith("network") and attempt <= args.max_retries:
            wait = min(2 ** attempt, 30)
            print(f"  ! errore di rete: retry tra {wait}s", flush=True)
            time.sleep(wait)
            continue

        return {"ok": False, "attempts": attempt, **result}


def cmd_send(args):
    token = get_token(args)
    messages = build_messages(args)

    if args.interval < HARD_MIN_INTERVAL:
        sys.exit(f"--interval minimo consentito: {HARD_MIN_INTERVAL}s")
    if args.interval < SAFE_MIN_INTERVAL and not args.force:
        sys.exit(
            f"--interval {args.interval}s e' sotto la soglia di sicurezza di "
            f"{SAFE_MIN_INTERVAL}s (Telegram limita a ~20 msg/min per gruppo e "
            "puo' bannare il bot). Aggiungi --force se e' proprio quello che vuoi testare."
        )
    if args.count is None and args.duration is None and not args.forever:
        sys.exit("Definisci una fine: --count N, --duration SECONDI oppure --forever.")

    run_id = uuid.uuid4().hex[:8]
    log_file = args.log or os.path.join(os.path.dirname(os.path.abspath(__file__)), "sent.jsonl")

    stop_requested = {"value": False}

    def handle_signal(signum, frame):  # noqa: ARG001
        stop_requested["value"] = True
        print("\nInterruzione richiesta, chiudo dopo l'invio corrente...", flush=True)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    print(f"run_id      : {run_id}")
    print(f"chat_id     : {args.chat_id}")
    print(f"intervallo  : {args.interval}s" + (f" (+jitter fino a {args.jitter}s)" if args.jitter else ""))
    print(f"messaggi    : {len(messages)} template ({'random' if args.random else 'rotazione'})")
    print(f"fine        : " + (
        f"{args.count} invii" if args.count is not None
        else f"{args.duration}s" if args.duration is not None
        else "manuale (Ctrl+C)"
    ))
    print(f"log         : {log_file}")
    if args.dry_run:
        print("MODALITA' DRY-RUN: nessun messaggio verra' inviato davvero.")
    print("-" * 60)

    sent = failed = 0
    start = time.monotonic()
    next_at = start
    index = 0

    with open(log_file, "a", encoding="utf-8") as log:
        while not stop_requested["value"]:
            if args.count is not None and index >= args.count:
                break
            if args.duration is not None and time.monotonic() - start >= args.duration:
                break

            # Attesa a passi brevi cosi' Ctrl+C risponde subito.
            while time.monotonic() < next_at and not stop_requested["value"]:
                time.sleep(min(0.2, next_at - time.monotonic()))
            if stop_requested["value"]:
                break

            index += 1
            template = random.choice(messages) if args.random else messages[(index - 1) % len(messages)]
            text = render(template, index, run_id)

            if args.dry_run:
                outcome = {"ok": True, "message_id": None, "attempts": 0, "dry_run": True}
            else:
                outcome = send_one(token, args.chat_id, text, args)

            record = {
                "run_id": run_id,
                "n": index,
                "sent_at": _now_iso(),
                "chat_id": args.chat_id,
                "text": text,
                **outcome,
            }
            log.write(json.dumps(record, ensure_ascii=False) + "\n")
            log.flush()

            if outcome["ok"]:
                sent += 1
                marker = "~" if args.dry_run else "+"
                print(f"{marker} [{index}] {text[:70]}", flush=True)
            else:
                failed += 1
                print(f"- [{index}] FALLITO: {outcome.get('error')}", flush=True)
                if outcome.get("error_code") in FATAL_ERROR_CODES and not args.keep_going:
                    print(
                        "Errore di configurazione (token, chat_id sbagliato o bot non "
                        "nel gruppo): mi fermo. Usa --keep-going per ignorare.",
                        flush=True,
                    )
                    break

            # Pianifico sull'orologio monotono per non accumulare deriva.
            next_at += args.interval
            if args.jitter:
                next_at += random.uniform(0, args.jitter)
            now = time.monotonic()
            if next_at < now:
                next_at = now

    elapsed = time.monotonic() - start
    print("-" * 60)
    print(f"inviati: {sent}  falliti: {failed}  durata: {elapsed:.1f}s")
    if sent and elapsed > 0:
        print(f"rate medio: {sent / elapsed * 60:.1f} msg/min")
    print(f"log completo: {log_file}")
    return 1 if failed and not sent else 0


# --------------------------------------------------------------------------

def build_parser():
    parser = argparse.ArgumentParser(
        description="Invia messaggi ripetuti su un gruppo Telegram per testare filtri antispam.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Esempi:\n"
            "  python sender.py chats\n"
            "  python sender.py send -c -1001234567890 -m 'test {n}' -i 5 -n 20\n"
            "  python sender.py send -c -1001234567890 --message-file spam.txt -i 10 -d 300 --random\n"
            "  python sender.py send -c -1001234567890 -m 'burst {rand}' -i 1 -n 30 --force\n"
        ),
    )
    parser.add_argument("--token", help="Bot token (default: env TELEGRAM_BOT_TOKEN)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_chats = sub.add_parser("chats", help="Elenca i chat_id visti dal bot")
    p_chats.set_defaults(func=cmd_chats)

    p_send = sub.add_parser("send", help="Invia messaggi a intervalli regolari")
    p_send.add_argument("-c", "--chat-id", required=True,
                        help="Gruppo di destinazione (z). Numerico, es. -1001234567890, oppure @username")
    p_send.add_argument("-m", "--message", action="append",
                        help="Messaggio da inviare (y). Ripetibile. Placeholder: {n} {ts} {unix} {rand} {uuid} {run}")
    p_send.add_argument("--message-file", help="File con un messaggio per riga")
    p_send.add_argument("-i", "--interval", type=float, required=True,
                        help="Secondi tra un invio e l'altro (x)")
    p_send.add_argument("--jitter", type=float, default=0.0,
                        help="Secondi casuali aggiunti all'intervallo, per un pattern meno regolare")
    p_send.add_argument("-n", "--count", type=int, help="Numero totale di messaggi")
    p_send.add_argument("-d", "--duration", type=float, help="Durata totale in secondi")
    p_send.add_argument("--forever", action="store_true", help="Continua fino a Ctrl+C")
    p_send.add_argument("--random", action="store_true",
                        help="Pesca i messaggi a caso invece di ruotarli in ordine")
    p_send.add_argument("--silent", action="store_true", help="Invia senza notifica")
    p_send.add_argument("--parse-mode", choices=["HTML", "Markdown", "MarkdownV2"],
                        help="Formattazione del testo")
    p_send.add_argument("--reply-to", type=int, help="message_id a cui rispondere")
    p_send.add_argument("--max-retries", type=int, default=5,
                        help="Tentativi su rate limit / errori di rete (default 5)")
    p_send.add_argument("--keep-going", action="store_true",
                        help="Non fermarti sugli errori 400/403")
    p_send.add_argument("--log", help="File JSONL di log (default: telegram_tester/sent.jsonl)")
    p_send.add_argument("--dry-run", action="store_true",
                        help="Simula gli invii senza chiamare Telegram")
    p_send.add_argument("--force", action="store_true",
                        help=f"Consenti intervalli sotto {SAFE_MIN_INTERVAL}s")
    p_send.set_defaults(func=cmd_send)

    return parser


def main():
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    args = build_parser().parse_args()
    return args.func(args) or 0


if __name__ == "__main__":
    sys.exit(main())
