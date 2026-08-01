# 👤 Inviare i messaggi dal TUO account

Questa è la versione in cui i messaggi nel gruppo appaiono **scritti da te**,
non da un bot. Serve quando devi testare un filtro antispam su messaggi di
utenti veri, perché molti filtri trattano bot e utenti in modo diverso.

---

## ⚠️ Prima di iniziare, tre cose da sapere

**1. Rischi per l'account.** Telegram riconosce gli invii automatici da account
personali. Il rischio non è teorico: si va dal blocco temporaneo degli invii
fino alla sospensione dell'account. Un bot bannato si rifà in 2 minuti, un
account personale no.

👉 **Consiglio: usa il secondo account**, quello che hai già nel gruppo di test,
non quello che usi tutti i giorni.

**2. Serve un login vero.** Numero di telefono, codice di verifica e (se ce
l'hai) password di verifica in due passaggi. Non basta un token come per il bot.

**3. Serve un computer, almeno la prima volta.** Il login è interattivo: devi
digitare il codice che ti arriva. Da telefono non si fa comodamente.
Più sotto trovi le alternative se non hai un PC sottomano.

---

## Passo 1 — Ottieni le credenziali API (dal telefono si può)

Sono due codici che identificano il programma verso Telegram.

1. Apri **https://my.telegram.org** dal browser
2. Inserisci il tuo numero (con prefisso, es. `+39...`) → ricevi un codice
   **dentro Telegram** (non per SMS) → inseriscilo
3. Tocca **API development tools**
4. Compila il modulo:
   - **App title**: `Test Antispam`
   - **Short name**: `testantispam`
   - **Platform**: Desktop
   - gli altri campi lasciali vuoti
5. **Create application**
6. Ti compaiono due valori: **App api_id** (numero) e **App api_hash**
   (lettere e numeri). Copiali e tienili da parte.

> Questi due codici valgono per tutti i tuoi test, si fanno una volta sola.
> Non condividerli.

---

## Passo 2 — Login (dal computer)

Sul computer, con Python installato:

```bash
git clone https://github.com/sansonneninni-tech/book-isbn.git
cd book-isbn/telegram_tester
pip install telethon

export TELEGRAM_API_ID=1234567
export TELEGRAM_API_HASH=incolla_qui_l_hash

python user_sender.py login
```

Ti chiede nel giro di tre domande:
1. il **numero di telefono** (es. `+39331...`)
2. il **codice** che ti arriva in chat su Telegram
3. la **password** di verifica in due passaggi, se l'hai attivata

Se va a buon fine vedi `Login riuscito come: ...` e viene creato il file
`user.session`.

> 🔐 **`user.session` è come la password del tuo account**: chi ce l'ha entra nel
> tuo Telegram. Non mandarlo a nessuno, non caricarlo online. È già escluso dal
> `.gitignore`, quindi non finirà su GitHub per sbaglio.

Il login si fa **una volta sola**: dopo, il programma riusa la sessione.

---

## Passo 3 — Trova l'id del gruppo

```bash
python user_sender.py chats
```

```
         chat_id  tipo       nome
  -1001234567890  gruppo     Il mio gruppo di test
```

Copia il numero, **con il meno davanti**.

---

## Passo 4 — Invia

```bash
python user_sender.py send -c -1001234567890 -m "test antispam {n}" -i 15 -n 10
```

Tradotto: 10 messaggi (`-n 10`), uno ogni 15 secondi (`-i 15`), nel gruppo
indicato da `-c`. Nel gruppo appaiono scritti da te.

Per fermarlo prima: **Ctrl+C**.

### Le opzioni che userai di più

| Opzione | Cosa fa |
|---|---|
| `-m "testo"` | il messaggio. Ripetilo per averne più di uno a rotazione |
| `-i 15` | secondi tra un messaggio e l'altro |
| `--jitter 10` | aggiunge da 0 a 10 secondi a caso: sembra meno un robot |
| `-n 10` | quanti messaggi in tutto |
| `-d 300` | oppure: vai avanti per 300 secondi |
| `--forever` | vai avanti finché non premi Ctrl+C |
| `--random` | pesca i messaggi a caso invece che in ordine |
| `--dry-run` | prova a vuoto: **non si collega nemmeno** a Telegram |
| `--message-file messages.example.txt` | prendi i messaggi da un file |

Dentro il messaggio puoi usare `{n}` (numero progressivo), `{rand}` (lettere a
caso), `{ts}` (data e ora). Servono a verificare se il filtro riconosce lo spam
anche quando i messaggi non sono identici tra loro.

**Prova sempre prima con `--dry-run`**: ti mostra cosa manderebbe e con che
ritmo, senza toccare Telegram e senza rischi.

---

## La soglia dei 10 secondi

Sotto i 10 secondi di intervallo il programma si ferma e ti chiede `--force`.

Non è una formalità: con un account personale, mandare messaggi ogni pochi
secondi è il modo più rapido per farsi limitare. Se il tuo filtro deve essere
testato con raffiche veloci, fallo sapendo cosa rischi — e falla con l'account
secondario.

Se Telegram ti impone una pausa (*flood wait*), il programma te lo scrive,
aspetta il tempo richiesto e riprende. **Quel messaggio è un avvertimento**:
stai andando troppo veloce.

---

## Non ho un computer: alternative

| Come | Difficoltà | Note |
|---|---|---|
| **PC di un amico / lavoro** | facile | il login si fa una volta sola, poi ti porti via il file `user.session` |
| **Termux** (solo Android) | media | app gratuita: `pkg install python`, poi le stesse istruzioni |
| **GitHub Codespaces** | media | dal browser del telefono ti dà un terminale online, gratis fino a 60 ore/mese. Dal repository: bottone verde **Code** → **Codespaces** → **Create** |
| **Versione bot** | facile | nessun login, tutto dal telefono: vedi [GUIDA.md](GUIDA.md) |

> Su iPhone non c'è un equivalente comodo di Termux: le strade sono Codespaces
> o un computer.

---

## Se un giorno vuoi farlo girare in automatico

Il login può essere esportato in una "stringa di sessione" da incollare come
secret, così il programma gira anche su un'altra macchina:

```bash
python user_sender.py login --print-string
```

Poi metti quella stringa in `TELEGRAM_SESSION`, insieme a `TELEGRAM_API_ID` e
`TELEGRAM_API_HASH`.

> ⚠️ Quella stringa **è l'accesso completo al tuo account**. Mettila solo in
> posti che consideri sicuri (i secret di GitHub lo sono; un file nel repo no).
> Il workflow automatico che ho preparato usa apposta **solo la versione bot**:
> tenere la chiave di un account personale su un server è un rischio che non
> vale la pena correre per dei test.

---

## Se qualcosa non va

| Cosa vedi | Cosa fare |
|---|---|
| `Manca la libreria Telethon` | `pip install telethon` |
| `Mancano le credenziali API` | rifai il Passo 1 ed esporta le due variabili |
| `Non trovo la chat` | rilancia `chats` e ricontrolla l'id (col meno davanti) |
| `PhoneNumberBannedError` | quell'account è stato bloccato da Telegram |
| `flood wait` | stai andando troppo veloce: alza `-i` |
| chiede di nuovo il codice | il file `user.session` non è nella cartella da cui lanci il comando |
