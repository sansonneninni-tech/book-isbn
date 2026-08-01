#!/usr/bin/env python3
"""
Invio messaggi dal PROPRIO ACCOUNT Telegram (non da un bot), per test antispam.

Stessa idea di sender.py, ma i messaggi partono dal tuo utente: nel gruppo
appaiono come scritti da te, non da un bot. Usa l'API utente (MTProto) tramite
Telethon, quindi serve un login vero e proprio con numero di telefono.

    ATTENZIONE - leggi prima di usarlo
    Automatizzare il proprio account espone a limitazioni e ban: Telegram
    riconosce i pattern di invio ripetitivi. Usa questo strumento solo sui tuoi
    gruppi di test, con intervalli larghi, e preferibilmente con un account
    secondario che non ti dispiace perdere. Il file di sessione equivale alla
    password del tuo account: chi ce l'ha entra nel tuo Telegram.

Uso rapido:
    pip install telethon
    export TELEGRAM_API_ID=... TELEGRAM_API_HASH=...   # da my.telegram.org
    python user_sender.py login                        # una volta sola
    python user_sender.py chats                        # trova l'id del gruppo
    python user_sender.py send -c -1001234567890 -m "ciao {n}" -i 15 -n 10
"""

import argparse
import asyncio
import json
import os
import sys
import time
import uuid

# Helper condivisi con la versione bot, cosi' i due strumenti si comportano
# allo stesso modo (placeholder, log, lettura messaggi, controlli).
from common import (
    build_messages,
    describe_end,
    load_dotenv,
    next_step,
    now_iso,
    pick_message,
    render,
    validate_common,
)

# Un account utente e' molto piu' "fragile" di un bot: Telegram lo limita (o lo
# blocca) se vede invii ravvicinati e ripetitivi. Soglia di sicurezza piu' alta.
SAFE_MIN_INTERVAL = 10.0

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SESSION = os.path.join(SCRIPT_DIR, "user.session")


def require_telethon():
    """Importa Telethon dando un errore comprensibile se manca."""
    try:
        from telethon import TelegramClient  # noqa: F401
    except ImportError:
        sys.exit(
            "Manca la libreria Telethon. Installala con:\n"
            "    pip install telethon"
        )


def get_credentials(args):
    """api_id e api_hash si ottengono da https://my.telegram.org > API development tools."""
    api_id = args.api_id or os.environ.get("TELEGRAM_API_ID")
    api_hash = args.api_hash or os.environ.get("TELEGRAM_API_HASH")
    if not api_id or not api_hash:
        sys.exit(
            "Mancano le credenziali API.\n"
            "Vai su https://my.telegram.org > API development tools, crea un'app\n"
            "e poi esporta:\n"
            "    export TELEGRAM_API_ID=1234567\n"
            "    export TELEGRAM_API_HASH=abcdef...\n"
            "(oppure mettili in telegram_tester/.env)"
        )
    try:
        api_id = int(api_id)
    except ValueError:
        sys.exit("TELEGRAM_API_ID deve essere un numero.")
    return api_id, api_hash


def make_client(args):
    """Crea il client, da stringa di sessione (env) o da file di sessione."""
    from telethon import TelegramClient
    from telethon.sessions import StringSession

    api_id, api_hash = get_credentials(args)
    session_string = os.environ.get("TELEGRAM_SESSION")
    if session_string:
        return TelegramClient(StringSession(session_string), api_id, api_hash)
    return TelegramClient(args.session, api_id, api_hash)


async def resolve_target(client, chat_id):
    """Trova il gruppo dal suo id o username.

    Telethon deve conoscere il gruppo: se non l'ha mai visto in questa sessione
    va prima scaricata la lista delle chat (quello che fa il comando `chats`).
    """
    from telethon.errors import RPCError

    try:
        return await client.get_entity(int(chat_id))
    except (ValueError, TypeError):
        pass  # non e' numerico: sara' uno username tipo @gruppo
    except RPCError:
        pass

    try:
        return await client.get_entity(chat_id)
    except (ValueError, RPCError):
        pass

    # Ultimo tentativo: scorro le chat aperte, che popola anche la cache.
    async for dialog in client.iter_dialogs():
        if str(dialog.id) == str(chat_id) or dialog.name == chat_id:
            return dialog.entity

    sys.exit(
        f"Non trovo la chat '{chat_id}'.\n"
        "Controlla l'id con: python user_sender.py chats\n"
        "(per i gruppi l'id inizia con -100 e il meno fa parte del numero)"
    )


# --------------------------------------------------------------------------
# comando: login
# --------------------------------------------------------------------------

async def do_login(args):
    """Login interattivo: chiede numero, codice e (se attiva) password 2FA."""
    from telethon import TelegramClient
    from telethon.sessions import StringSession

    if args.print_string:
        # Login direttamente in formato stringa: e' il formato da incollare in
        # un secret quando il programma gira su un'altra macchina.
        api_id, api_hash = get_credentials(args)
        client = TelegramClient(StringSession(), api_id, api_hash)
    else:
        client = make_client(args)

    print("Ti verra' chiesto il numero di telefono (con prefisso, es. +39...),")
    print("poi il codice che Telegram ti manda IN CHAT, non per SMS.")
    print("Se hai la verifica in due passaggi, servira' anche la password.\n")

    await client.start()
    me = await client.get_me()
    print(f"\nLogin riuscito come: {me.first_name} (@{me.username or 'senza username'})")

    if args.print_string:
        print("\nStringa di sessione - vale quanto la password del tuo account,")
        print("non mandarla a nessuno e non scriverla in chat:\n")
        print(client.session.save())
    else:
        print(f"\nSessione salvata in: {args.session}")
        print("Questo file vale quanto la password del tuo account: non condividerlo.")
        print("(e' gia' escluso dal .gitignore, non finira' su GitHub)")
        print("\nSe ti serve la sessione da incollare in un secret, rilancia con:")
        print("    python user_sender.py login --print-string")

    await client.disconnect()


# --------------------------------------------------------------------------
# comando: chats
# --------------------------------------------------------------------------

async def do_chats(args):
    """Elenca gruppi e canali del tuo account, con il loro id."""
    client = make_client(args)
    await client.start()

    print(f"{'chat_id':>16}  {'tipo':<10} nome")
    async for dialog in client.iter_dialogs():
        if args.all or dialog.is_group or dialog.is_channel:
            tipo = "gruppo" if dialog.is_group else "canale" if dialog.is_channel else "privata"
            print(f"{dialog.id:>16}  {tipo:<10} {dialog.name}")

    if not args.all:
        print("\n(mostro solo gruppi e canali: usa --all per vedere anche le chat private)")
    await client.disconnect()


# --------------------------------------------------------------------------
# comando: send
# --------------------------------------------------------------------------

async def send_one(client, target, text, args):
    """Invia un messaggio gestendo il flood wait di Telegram."""
    from telethon.errors import FloodWaitError, RPCError

    attempt = 0
    while True:
        attempt += 1
        try:
            message = await client.send_message(target, text, link_preview=False)
            return {"ok": True, "message_id": message.id, "attempts": attempt}
        except FloodWaitError as exc:
            if attempt > args.max_retries:
                return {"ok": False, "attempts": attempt,
                        "error": f"flood wait {exc.seconds}s, tentativi esauriti"}
            wait = exc.seconds + 1
            print(f"  ! Telegram impone una pausa di {wait}s (tentativo {attempt})", flush=True)
            print("    NB: e' il segnale che stai andando troppo veloce.", flush=True)
            await asyncio.sleep(wait)
        except RPCError as exc:
            return {"ok": False, "attempts": attempt,
                    "error": f"{type(exc).__name__}: {exc}", "fatal": True}
        except (ConnectionError, OSError) as exc:
            if attempt > args.max_retries:
                return {"ok": False, "attempts": attempt, "error": f"rete: {exc}"}
            wait = min(2 ** attempt, 30)
            print(f"  ! errore di rete: riprovo tra {wait}s", flush=True)
            await asyncio.sleep(wait)


async def do_send(args):
    messages = build_messages(args)
    run_id = uuid.uuid4().hex[:8]
    log_file = args.log or os.path.join(SCRIPT_DIR, "sent.jsonl")

    client = target = None
    if not args.dry_run:
        client = make_client(args)
        await client.start()
        me = await client.get_me()
        target = await resolve_target(client, args.chat_id)
        print(f"account     : {me.first_name} (@{me.username or 'senza username'})")

    print(f"run_id      : {run_id}")
    print(f"chat_id     : {args.chat_id}")
    print(f"intervallo  : {args.interval}s" + (f" (+jitter fino a {args.jitter}s)" if args.jitter else ""))
    print(f"messaggi    : {len(messages)} template ({'random' if args.random else 'rotazione'})")
    print(f"fine        : {describe_end(args)}")
    print(f"log         : {log_file}")
    if args.dry_run:
        print("MODALITA' DRY-RUN: nessun messaggio verra' inviato davvero.")
    print("-" * 60)

    sent = failed = index = 0
    start = time.monotonic()
    next_at = start
    interrupted = False

    try:
        with open(log_file, "a", encoding="utf-8") as log:
            while True:
                if args.count is not None and index >= args.count:
                    break
                if args.duration is not None and time.monotonic() - start >= args.duration:
                    break

                delay = next_at - time.monotonic()
                if delay > 0:
                    await asyncio.sleep(delay)

                index += 1
                text = render(pick_message(messages, index, args.random), index, run_id)

                if args.dry_run:
                    outcome = {"ok": True, "message_id": None, "attempts": 0, "dry_run": True}
                else:
                    outcome = await send_one(client, target, text, args)

                record = {"run_id": run_id, "n": index, "sent_at": now_iso(),
                          "chat_id": args.chat_id, "as_user": True,
                          "text": text, **outcome}
                log.write(json.dumps(record, ensure_ascii=False) + "\n")
                log.flush()

                if outcome["ok"]:
                    sent += 1
                    print(f"{'~' if args.dry_run else '+'} [{index}] {text[:70]}", flush=True)
                else:
                    failed += 1
                    print(f"- [{index}] FALLITO: {outcome.get('error')}", flush=True)
                    if outcome.get("fatal") and not args.keep_going:
                        print("Errore non recuperabile: mi fermo. Usa --keep-going per ignorare.", flush=True)
                        break

                next_at = max(next_at + next_step(args), time.monotonic())
    except (KeyboardInterrupt, asyncio.CancelledError):
        interrupted = True
    finally:
        if client:
            await client.disconnect()

    elapsed = time.monotonic() - start
    print("-" * 60)
    if interrupted:
        print("interrotto da tastiera")
    print(f"inviati: {sent}  falliti: {failed}  durata: {elapsed:.1f}s")
    if sent and elapsed > 0:
        print(f"rate medio: {sent / elapsed * 60:.1f} msg/min")
    print(f"log completo: {log_file}")
    return 1 if failed and not sent else 0


# --------------------------------------------------------------------------

def build_parser():
    parser = argparse.ArgumentParser(
        description="Invia messaggi ripetuti su un gruppo Telegram DAL TUO ACCOUNT (non da un bot).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Esempi:\n"
            "  python user_sender.py login\n"
            "  python user_sender.py chats\n"
            "  python user_sender.py send -c -1001234567890 -m 'test {n}' -i 15 -n 10\n"
            "\nATTENZIONE: automatizzare il proprio account puo' portare a limitazioni\n"
            "o al blocco dell'account. Usalo solo sui tuoi gruppi di test.\n"
        ),
    )
    parser.add_argument("--api-id", help="API ID da my.telegram.org (default: env TELEGRAM_API_ID)")
    parser.add_argument("--api-hash", help="API hash da my.telegram.org (default: env TELEGRAM_API_HASH)")
    parser.add_argument("--session", default=DEFAULT_SESSION,
                        help="File di sessione (default: telegram_tester/user.session)")
    sub = parser.add_subparsers(dest="command", required=True)

    p_login = sub.add_parser("login", help="Accedi con il tuo account (una volta sola)")
    p_login.add_argument("--print-string", action="store_true",
                         help="Stampa anche la sessione in formato stringa, per i secret")
    p_login.set_defaults(coro=do_login)

    p_chats = sub.add_parser("chats", help="Elenca le tue chat con i relativi id")
    p_chats.add_argument("--all", action="store_true", help="Mostra anche le chat private")
    p_chats.set_defaults(coro=do_chats)

    p_send = sub.add_parser("send", help="Invia messaggi a intervalli regolari")
    p_send.add_argument("-c", "--chat-id", required=True, help="Gruppo di destinazione (z)")
    p_send.add_argument("-m", "--message", action="append",
                        help="Messaggio (y). Ripetibile. Placeholder: {n} {ts} {unix} {rand} {uuid} {run}")
    p_send.add_argument("--message-file", help="File con un messaggio per riga")
    p_send.add_argument("-i", "--interval", type=float, required=True, help="Secondi tra gli invii (x)")
    p_send.add_argument("--jitter", type=float, default=0.0,
                        help="Secondi casuali aggiunti all'intervallo (consigliato per non sembrare un robot)")
    p_send.add_argument("-n", "--count", type=int, help="Numero totale di messaggi")
    p_send.add_argument("-d", "--duration", type=float, help="Durata totale in secondi")
    p_send.add_argument("--forever", action="store_true", help="Continua fino a Ctrl+C")
    p_send.add_argument("--random", action="store_true", help="Messaggi a caso invece che a rotazione")
    p_send.add_argument("--max-retries", type=int, default=5, help="Tentativi su pause/errori di rete")
    p_send.add_argument("--keep-going", action="store_true", help="Non fermarti al primo errore grave")
    p_send.add_argument("--log", help="File JSONL di log (default: telegram_tester/sent.jsonl)")
    p_send.add_argument("--dry-run", action="store_true", help="Simula senza collegarsi a Telegram")
    p_send.add_argument("--force", action="store_true",
                        help=f"Consenti intervalli sotto {SAFE_MIN_INTERVAL}s (rischioso per l'account)")
    p_send.set_defaults(coro=do_send)

    return parser


def main():
    load_dotenv(os.path.join(SCRIPT_DIR, ".env"))
    args = build_parser().parse_args()
    if args.command == "send":
        validate_common(
            args,
            SAFE_MIN_INTERVAL,
            "Con un account personale (non un bot) invii cosi' ravvicinati sono il\n"
            "modo piu' rapido per farsi limitare o bloccare l'account da Telegram.\n",
        )
    if not (args.command == "send" and args.dry_run):
        require_telethon()
    try:
        return asyncio.run(args.coro(args)) or 0
    except KeyboardInterrupt:
        print("\ninterrotto")
        return 0


if __name__ == "__main__":
    sys.exit(main())
