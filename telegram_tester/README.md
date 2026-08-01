# 🤖 Telegram Spam Tester

Strumento da riga di comando per inviare un messaggio (**y**) su un gruppo Telegram (**z**)
ogni **x** secondi. Serve a generare traffico controllato e ripetibile contro i propri
gruppi di test, per mettere alla prova un filtro antispam.

Ogni invio finisce su un file JSONL, così puoi confrontare quello che il filtro ha
rilevato con quello che è stato realmente spedito.

> Da usare solo su gruppi di tua proprietà, con partecipanti consapevoli. Inviare
> messaggi ripetuti su gruppi altrui viola i [ToS di Telegram](https://telegram.org/tos)
> e porta al ban del bot.

📱 **Sei da smartphone o non hai mai usato un terminale?** Salta questa pagina e
segui la [GUIDA passo passo](GUIDA.md): si fa tutto dal browser, senza installare nulla.

## Setup

### 1. Crea il bot

1. Su Telegram apri [@BotFather](https://t.me/BotFather) → `/newbot`
2. Copia il token (formato `123456789:AAH...`)

### 2. Metti il bot nel gruppo

Aggiungi il bot al gruppo di test come membro. Se non è nel gruppo, ogni invio
fallisce con `403: bot is not a member of the group chat`.

### 3. Configura il token

```bash
cd telegram_tester
cp .env.example .env
# apri .env e incolla il token
```

In alternativa: `export TELEGRAM_BOT_TOKEN="123456789:AAH..."`.

### 4. Dipendenze

Serve solo `requests`, già presente nel `requirements.txt` del progetto:

```bash
pip install requests
```

## Trovare il chat_id del gruppo

```bash
python sender.py chats
```

```
         chat_id  tipo       titolo
  -1001234567890  supergroup Test Antispam
```

Se non compare nulla: scrivi un messaggio nel gruppo e rilancia. I bot hanno la
*privacy mode* attiva di default e vedono solo i comandi tipo `/start` — puoi
disattivarla da BotFather con `/setprivacy` se ti serve.

## Uso

```bash
# 20 messaggi, uno ogni 5 secondi
python sender.py send -c -1001234567890 -m "test antispam {n}" -i 5 -n 20

# per 5 minuti, un messaggio ogni 10 secondi
python sender.py send -c -1001234567890 -m "ciao" -i 10 -d 300

# fino a Ctrl+C, con intervallo irregolare (5-8s)
python sender.py send -c -1001234567890 -m "hey {rand}" -i 5 --jitter 3 --forever

# prova a vuoto: non contatta Telegram
python sender.py send -c -1001234567890 -m "prova" -i 1 -n 5 --dry-run
```

### Più varianti di messaggio

```bash
# rotazione tra i template passati a riga di comando
python sender.py send -c -1001234567890 -m "compra ora" -m "offerta {n}" -i 5 -n 10

# oppure da file, pescati a caso
python sender.py send -c -1001234567890 --message-file messages.example.txt -i 8 -d 120 --random
```

### Placeholder

Utilizzabili dentro ogni messaggio:

| Placeholder | Valore |
|---|---|
| `{n}` | progressivo dell'invio, da 1 |
| `{ts}` | timestamp ISO UTC |
| `{unix}` | timestamp unix |
| `{rand}` | 8 caratteri casuali |
| `{uuid}` | uuid4 completo |
| `{run}` | id della sessione di test |

`{rand}` e `{uuid}` sono utili per verificare se il filtro riconosce come spam anche
messaggi non identici tra loro; `{run}` serve a isolare i messaggi di una singola sessione.

## Opzioni principali

| Flag | Descrizione |
|---|---|
| `-c, --chat-id` | gruppo di destinazione (**z**) |
| `-m, --message` | messaggio (**y**), ripetibile |
| `--message-file` | file con un messaggio per riga |
| `-i, --interval` | secondi tra gli invii (**x**) |
| `--jitter S` | aggiunge 0-S secondi casuali all'intervallo |
| `-n, --count` | numero totale di messaggi |
| `-d, --duration` | durata totale in secondi |
| `--forever` | continua fino a Ctrl+C |
| `--random` | pesca i messaggi a caso invece di ruotarli |
| `--silent` | invia senza notifica |
| `--dry-run` | simula senza chiamare Telegram |
| `--force` | consente intervalli sotto 3s |
| `--keep-going` | non fermarti sugli errori 400/403 |
| `--log FILE` | percorso del log JSONL |

Va indicata almeno una condizione di fine tra `--count`, `--duration` e `--forever`.

## Limiti di Telegram

La Bot API accetta circa **20 messaggi al minuto per gruppo**. Sotto i 3 secondi di
intervallo lo script chiede `--force`, perché oltre al rate limit c'è il rischio
concreto che il bot venga limitato o bannato.

Quando arriva un `429`, lo script legge `retry_after`, aspetta e riprova (fino a
`--max-retries`). Gli errori di rete usano un backoff esponenziale. Ogni tentativo
è tracciato nel log, quindi il rate reale è quello del riepilogo finale, non
necessariamente `60 / intervallo`.

## Log

Ogni riga di `sent.jsonl` è un evento:

```json
{"run_id":"a1b2c3d4","n":1,"sent_at":"2026-08-01T10:00:00+00:00","chat_id":"-1001234567890","text":"test antispam 1","ok":true,"message_id":4521,"attempts":1}
```

Sui falliti trovi `ok: false` con `error` ed `error_code`. Per incrociare i dati con
il tuo filtro:

```bash
# quanti inviati davvero in questa sessione
jq -s '[.[] | select(.run_id=="a1b2c3d4" and .ok)] | length' sent.jsonl

# i message_id, da confrontare con quelli bloccati
jq -r 'select(.ok) | .message_id' sent.jsonl
```

## Errori frequenti

| Messaggio | Causa |
|---|---|
| `403: bot is not a member of the group chat` | il bot non è nel gruppo |
| `400: chat not found` | chat_id sbagliato (i supergruppi iniziano per `-100`) |
| `429: Too Many Requests` | rate limit, gestito in automatico |
| `401: Unauthorized` | token errato o revocato |
| nessuna chat in `chats` | nessun update recente: scrivi nel gruppo e riprova |
