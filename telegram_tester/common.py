"""
Parti condivise tra sender.py (invio da bot) e user_sender.py (invio dal
proprio account), cosi' i due strumenti si comportano allo stesso modo.

Volutamente senza dipendenze esterne: chi usa solo una delle due versioni non
deve installare le librerie dell'altra.
"""

import os
import random
import string
import sys
import time
import uuid
from datetime import datetime, timezone

# Sotto questa soglia non si scende mai, nemmeno con --force: e' il limite
# oltre il quale lo strumento smette di essere un test e diventa un flood.
HARD_MIN_INTERVAL = 0.2


def now_iso():
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


def build_messages(args):
    """Ritorna la lista dei template da inviare (da -m e/o --message-file)."""
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
        .replace("{ts}", now_iso())
        .replace("{unix}", str(int(time.time())))
        .replace("{rand}", "".join(random.choices(string.ascii_lowercase + string.digits, k=8)))
        .replace("{uuid}", str(uuid.uuid4()))
        .replace("{run}", run_id)
    )


def pick_message(messages, index, use_random):
    """Sceglie il template: a caso oppure a rotazione."""
    return random.choice(messages) if use_random else messages[(index - 1) % len(messages)]


def next_step(args):
    """Secondi da aspettare prima del prossimo invio, jitter compreso."""
    return args.interval + (random.uniform(0, args.jitter) if args.jitter else 0)


def describe_end(args):
    """Riga di riepilogo su quando si fermera' l'invio."""
    if args.count is not None:
        return f"{args.count} invii"
    if args.duration is not None:
        return f"{args.duration}s"
    return "manuale (Ctrl+C)"


def validate_common(args, safe_min_interval, extra_hint=""):
    """Controlli validi per entrambe le versioni: intervallo e condizione di fine."""
    if args.interval < HARD_MIN_INTERVAL:
        sys.exit(f"--interval minimo consentito: {HARD_MIN_INTERVAL}s")
    if args.interval < safe_min_interval and not args.force:
        sys.exit(
            f"--interval {args.interval}s e' sotto la soglia di sicurezza di "
            f"{safe_min_interval}s.\n{extra_hint}"
            "Se e' proprio il caso che vuoi testare, aggiungi --force."
        )
    if args.count is None and args.duration is None and not args.forever:
        sys.exit("Definisci una fine: --count N, --duration SECONDI oppure --forever.")
