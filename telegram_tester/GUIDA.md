# 📱 Guida per usarlo dal telefono

Guida senza comandi da scrivere: fai tutto da Telegram e dal sito di GitHub.
Servono circa 10 minuti la prima volta, poi bastano 30 secondi per ogni test.

---

## Parte 1 — Crea il bot (su Telegram)

Un "bot" è un finto utente che scrive al posto tuo. Serve perché è l'unico modo
consentito per far scrivere qualcosa da un programma.

1. Apri **Telegram** e cerca `@BotFather` (quello con la spunta blu)
2. Premi **Avvia** / scrivi `/start`
3. Scrivi `/newbot`
4. Ti chiede un **nome** → scrivi quello che vuoi, es. `Test Antispam`
5. Ti chiede uno **username** → deve finire per `bot`, es. `mio_test_antispam_bot`
   (se è già preso te lo dice, prova con un altro)
6. BotFather ti risponde con una riga tipo:

   ```
   123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
   ```

   Questo è il **token**. È come la password del bot.
   **Copialo e tienilo da parte** (mandalo ai tuoi Messaggi salvati su Telegram).

> ⚠️ Non darlo a nessuno e non scriverlo in chat pubbliche: chi ha il token
> comanda il bot. Se ti scappa, da BotFather fai `/revoke` e te ne dà uno nuovo.

---

## Parte 2 — Metti il bot nel tuo gruppo

1. Apri il **gruppo di test** (quello dove ci siete solo tu e l'altro account)
2. Tocca il **nome del gruppo** in alto → **Aggiungi membro** / *Add member*
3. Cerca lo username del tuo bot (es. `mio_test_antispam_bot`) e aggiungilo
4. Scrivi un messaggio qualsiasi nel gruppo, ad esempio `/start`

Se il bot non è nel gruppo, ogni invio fallirà.

---

## Parte 3 — Dai il token a GitHub (una volta sola)

Il token va messo in una "cassaforte" di GitHub, così non finisce scritto nel codice.

1. Dal browser del telefono apri il tuo repository su **github.com**
   (l'app GitHub non ha questa schermata: usa **Chrome/Safari**)
2. In alto tocca il menu **···** o scorri fino a **Settings** (Impostazioni)
3. Nel menu a sinistra: **Secrets and variables** → **Actions**
4. Bottone verde **New repository secret**
5. Compila:
   - **Name**: `TELEGRAM_BOT_TOKEN` (scritto esattamente così)
   - **Secret**: incolla il token di BotFather
6. **Add secret**

---

## Parte 4 — Trova l'ID del gruppo

Ogni gruppo Telegram ha un numero che lo identifica. Serve per dire al bot
*dove* scrivere.

1. Sempre su github.com, nel repository, tab **Actions**
2. Nella lista a sinistra tocca **Telegram Spam Tester**
3. Bottone **Run workflow** (a destra)
4. In **Cosa fare** scegli **trova-chat-id**
5. Lascia perdere gli altri campi → **Run workflow**
6. Aspetta ~30 secondi, ricarica la pagina, tocca la riga gialla/verde che è apparsa
7. Tocca **run** → apri il passaggio **Trova chat_id**

Vedrai una cosa così:

```
         chat_id  tipo       titolo
  -1001234567890  supergroup Il mio gruppo di test
```

Quel numero (**con il meno davanti**) è l'ID del tuo gruppo. Copialo.

> Non compare niente? Scrivi un messaggio nel gruppo e rilancia il punto 3.

---

## Parte 5 — Manda i messaggi 🎉

1. **Actions** → **Telegram Spam Tester** → **Run workflow**
2. Compila:

   | Campo | Cosa metterci |
   |---|---|
   | **Cosa fare** | `invia` |
   | **chat_id** | il numero del punto precedente, es. `-1001234567890` |
   | **messaggio** | il testo da mandare, es. `test antispam {n}` |
   | **intervallo** | ogni quanti secondi, es. `10` |
   | **quantita** | quanti messaggi in tutto, es. `10` |
   | **prova a vuoto** | lascialo vuoto (spuntalo per fare una prova finta) |
   | **forza** | lascialo vuoto |

3. **Run workflow** e guarda il gruppo su Telegram: i messaggi arrivano 😎

Con i valori dell'esempio: 10 messaggi, uno ogni 10 secondi, cioè 100 secondi in tutto.

---

## Cose utili da sapere

**Scrivere sempre lo stesso testo?**
Metti `{n}` dentro il messaggio e diventa un numero progressivo: `test 1`, `test 2`...
Altri disponibili: `{rand}` (lettere a caso), `{ts}` (data e ora).
Servono a capire se il tuo filtro riconosce lo spam anche quando i messaggi
non sono identici tra loro.

**Fermarlo prima della fine**
Nella pagina della corsa in esecuzione, in alto a destra: **Cancel workflow**.

**Ogni quanto posso mandarli?**
Telegram accetta circa **20 messaggi al minuto** per gruppo. Sotto i 3 secondi
di intervallo il programma si blocca da solo e devi spuntare **forza**: oltre
quella soglia Telegram può bloccarti il bot. Se vai troppo veloce, Telegram
rallenta gli invii e il programma aspetta da solo il tempo necessario — quindi
il ritmo reale può essere più lento di quello che hai chiesto.

**Il registro degli invii**
Alla fine di ogni corsa, in fondo alla pagina, c'è **log-invii** da scaricare:
un file con l'elenco esatto di cosa è stato inviato e quando. Ti serve per
confrontarlo con quello che la tua piattaforma antispam ha rilevato.

**Limiti**
La corsa si ferma da sola dopo 30 minuti, per sicurezza. Su repository pubblici
GitHub Actions è gratis; su quelli privati consuma i minuti gratuiti mensili.

---

## Se qualcosa non va

| Cosa vedi | Cosa fare |
|---|---|
| `Manca il secret TELEGRAM_BOT_TOKEN` | rifai la Parte 3, il nome deve essere identico |
| `Unauthorized` | token sbagliato o revocato: ricontrolla la Parte 3 |
| `bot is not a member of the group chat` | il bot non è nel gruppo: rifai la Parte 2 |
| `chat not found` | chat_id sbagliato: rifai la Parte 4 (ricordati il `-` davanti) |
| nessuna chat in trova-chat-id | scrivi nel gruppo e rilancia |
| non vedo il bottone Run workflow | il file deve stare sul ramo principale `main` |

---

## E se un domani vuoi usarlo dal computer

C'è la versione da riga di comando, molto più flessibile (più messaggi diversi,
intervalli irregolari, durata a tempo): vedi [README.md](README.md).
