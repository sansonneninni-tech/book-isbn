# PRISMA Story Engine

Web app per progettare la **struttura narrativa** di un reel verticale 9:16 — anche completamente astratto, senza figure umane.

Non è un generatore di inquadrature. Parte dal presupposto che in un reel non narrativo la storia sia una **progressione**: di colore, di luce, di scala, di movimento e di ritmo. Il programma prende quella progressione e la traduce in una sequenza di riprese che hanno una funzione, un ordine e dei raccordi.

## Avvio

Nessuna dipendenza, nessun build step. Serve solo un server statico perché il progetto usa ES modules:

```bash
cd prisma-story-engine
python3 -m http.server 8000
# apri http://localhost:8000
```

Funziona offline. Il progetto viene salvato automaticamente nel browser (localStorage) e può essere esportato come file `.json`, `.csv` o stampato in PDF, tutto dal pannello **⤓ Salva / Stampa**.

### Tre ambienti, un solo comportamento

La stessa app gira da file locale, da server locale e dentro un iframe con `sandbox` (la versione pubblicata online). L'ultimo caso è ostile in modi silenziosi, e ognuno ha una contromisura:

| Cosa blocca la sandbox | Cosa succedeva | Contromisura |
|---|---|---|
| invio dei `<form>` | il pulsante del wizard non faceva niente | nessun form: pulsanti `type="button"` con handler |
| `confirm()` / `alert()` | “Nuovo” sembrava rotto | dialoghi propri (`<dialog>`), che la sandbox non tocca |
| `window.print()` | stampa senza effetto | documento autonomo in una scheda nuova, o mostrato a schermo da salvare come `.html` |
| download di file | click a vuoto | accanto a ogni “Scarica” ci sono “Copia” e “Mostra” |
| `localStorage` | eccezione a ogni salvataggio | ogni accesso protetto; il provider resta in memoria |

### Versione single-file

Per aprirlo senza server (doppio clic, o da telefono, o su un qualsiasi hosting statico):

```bash
node build.mjs          # -> dist/prisma-story-engine.html
```

`build.mjs` impacchetta i 22 moduli ES e i tre fogli di stile in un unico `.html` autonomo, senza dipendenze. Non è un bundler generico: gestisce le sole forme di import/export usate qui, e si ferma con un errore se ne incontra una diversa.

## Flusso

1. **Tre domande** prima di ogni cosa tecnica: perché questo lavoro e perché adesso, cosa deve restare a chi guarda, cosa non deve esserci. Nessuna è obbligatoria; tutte e tre finiscono per intero nei prompt, e la terza diventa un divieto esplicito.
2. **Wizard** — idea, arco emotivo, materiali disponibili, palette, comportamento della luce, ritmo, durata, presenza di persone.
3. **Tre strutture proposte** fra Ciclo, Crescendo, Rivelazione, Metamorfosi, Chiamata-risposta e Frammento→intero, con una motivazione che cita i dati inseriti.
4. **Shot list** generata su regole deterministiche, con rigenerazione della singola inquadratura.
5. **Timeline 9:16** con durate proporzionali, barra cromatica, divisione in atti e curva di intensità.
6. **Analisi**, **note di montaggio**, **modalità shooting** con checkbox, **export**.

Il marchio in alto a sinistra e il pulsante **⌂ Inizio** riportano sempre alla prima schermata senza perdere il piano; **Piano →** ci riporta dentro.

### Palette e luce non sono obbligate a cambiare

La progressione narrativa può venire dal colore, ma non deve per forza:

- **Palette omogenea** — un solo colore per tutto il reel. L'arco resta, ma si muove solo in luminosità e saturazione (tre ampiezze), con un micro-scarto di tinta che tiene vivo il monocromo. L'analisi smette di segnalare l'arco piatto come difetto e comincia a controllare che *qualcos'altro* si muova: se palette omogenea, luce costante e intensità piatta capitano insieme, quello sì che è un errore, e viene detto.
- **Luce costante** — sei tipi (diffusa, dura, controluce, penombra, piena, artificiale) che restano identici dalla prima all'ultima inquadratura, accanto agli otto archi che invece evolvono.

Entrambe le scelte cambiano il punteggio delle strutture (senza viaggio di colore il Ciclo e il Crescendo reggono meglio, la Metamorfosi molto meno) e cambiano il prompt mandato al modello, che riceve il divieto esplicito di introdurre colori estranei o di far evolvere la luce.

## Logica narrativa

Ogni struttura è una *beat map*: una sequenza di beat con funzione narrativa, atto, peso di durata, **intensità target** (0–1) e **posizione sull'arco cromatico** (0–1), più una finestra di scale e una banda di energia per il movimento.

La generazione passa da cinque stadi (`src/engine/generator.js`):

1. **Densità** — durata totale ÷ ritmo determina il numero di inquadrature; i beat espandibili si duplicano con variazione interpolata, o si comprimono. Un atto non può mai restare senza inquadrature.
2. **Durate** — proporzionali al peso del beat, con jitter dipendente dal ritmo, clamp min/max e riquadratura sulla durata esatta.
3. **Arco cromatico** (`engine/color.js`) — interpolazione HSL fra palette iniziale e finale. Tre modalità: `linear`, `return` (Ciclo: va e torna, ma la luminosità conserva traccia del viaggio), `alternate` (Chiamata-risposta: due poli che convergono). Quando i due colori sono lontani sulla ruota, l'interpolazione passa da una **zona desaturata** invece di attraversare tinte non scelte — come farebbe un colorist.
4. **Scale e movimenti** (`engine/constraints.js`) — scelti dentro la finestra del beat, poi riparati:
   - mai due scale identiche consecutive (vincolo duro: la finestra del beat si allarga pur di rispettarlo);
   - mai tre scale della stessa famiglia di fila;
   - almeno quattro scale distinte sul totale;
   - mai due movimenti uguali consecutivi, e preferibilmente non della stessa famiglia;
   - l'energia del movimento segue l'intensità del beat: i movimenti forti restano ai picchi.
5. **Continuità** — per ogni taglio si sceglie il raccordo con affinità maggiore: colore (delta hue basso), match on action (stesso asse di movimento), forma (salto di scala ≥ 3), luce, stacco sul beat, materia/suono.

La **diagnostica** (`engine/analysis.js`) rilegge il risultato: n-gram su scale e movimenti per le ripetizioni, varianza di intensità per la progressione piatta, confronto fra intensità finale e picco per il finale debole, copertura degli atti per i buchi, deviazione standard delle durate per il montaggio meccanico.

Tutto è **deterministico e seedato**: lo stesso seed produce lo stesso piano, un seed diverso ne produce un altro. Rigenerare una singola inquadratura cambia *come* la riprendi (scala, movimento, materiale, alternativa) ma mai *perché* esiste: funzione narrativa, durata, atto e colore restano.

## Struttura del progetto

```
prisma-story-engine/
├── index.html
├── build.mjs     bundle single-file -> dist/
├── styles/       base · components · print
└── src/
    ├── main.js           orchestrazione e render
    ├── state.js          store + autosave localStorage
    ├── engine/
    │   ├── vocabulary.js scale, movimenti, luci, ritmi
    │   ├── structures.js le 6 beat map + punteggio di affinità
    │   ├── color.js      arco cromatico HSL
    │   ├── generator.js  pipeline di generazione
    │   ├── constraints.js regole e riparazione
    │   └── analysis.js   diagnostica + note di montaggio
    │   └── ai-plan.js     prompt del ponte + validazione della risposta
    ├── adapters/         local | manual | openai | claude (stessa interfaccia)
    ├── ui/               roots (le tre domande), wizard, structures, shotlist,
    │                     timeline, analysis, shooting, bridge, dialogs, exports
    └── util/             rng seedato, helper DOM
```

## Modalità AI

Quattro provider, selezionabili dal pulsante ⚙ nella toolbar. **In tutti e quattro i casi i vincoli di ripresa restano del motore locale**: durate, varietà di scale, alternanza dei movimenti, raccordi e riparazione vengono ricalcolati qui. Il modello propone, il motore verifica.

| Provider | Costo | Come funziona |
|---|---|---|
| **Locale** (default) | — | Deterministico, istantaneo, offline |
| **Ponte copia-incolla** | gratis | L'app prepara il prompt, tu lo porti nella chat che già usi, riporti indietro la risposta |
| **OpenAI / Claude API** | a consumo | Automatico, richiede una chiave |

### Il ponte copia-incolla

Scelta la struttura, si apre un modale con il prompt già pronto: lo copi, lo incolli in ChatGPT (o Claude, o qualunque altra chat), e riporti indietro la risposta. Nessuna richiesta di rete parte dall'app, quindi **funziona anche nella versione single-file e nell'artifact pubblicato**.

Il modello restituisce la *beat map*: per ogni inquadratura funzione narrativa, atto, ruolo, peso di durata, intensità, posizione sull'arco cromatico, finestra di scale e banda di movimento — più soggetto e alternativa scritti sui materiali reali. Non decide durate, colori esatti né raccordi: quelli restano calcolati.

Quello che torna passa da `engine/ai-plan.js`, che non rifiuta mai in blocco ma **normalizza e ripara**, poi dice cosa ha corretto:

- estrae il JSON anche se la chat ha aggiunto prosa o un blocco di codice attorno;
- riporta nel dominio valido intensità, pesi, indici di scala e posizioni cromatiche fuori range;
- forza i ruoli portanti (prima inquadratura = apertura, ultima = chiusura, una sola svolta, assegnata alla più intensa);
- riallinea gli atti fuori sequenza;
- segnala atti vuoti, arco di intensità piatto e campi mancanti — che vengono compilati dal motore.

Se la risposta è illeggibile, o se annulli, il piano si genera comunque in locale.

**Anche la singola inquadratura passa dal ponte.** Il pulsante *Rigenera* apre un prompt che contiene solo quel beat e i suoi vicini: il modello propone funzione, soggetto, alternativa, finestra di scala e banda di movimento; durata, colore, atto e posizione nel racconto restano quelli del piano, perché toccarli vorrebbe dire rifare il montaggio attorno. La finestra di scala proposta viene comunque passata ai vincoli, quindi non può produrre due piani identici di fila. Chi ha fretta annulla e ottiene la rigenerazione locale, istantanea: sul set non si aspetta.

### Adapter API

`OpenAI` e `Claude` chiamano l'API direttamente e ricadono sul locale in caso di errore. Sono già scritti; servono solo chiave e modello.

Interfaccia da rispettare per aggiungere un provider (`src/adapters/`):

```js
{
  id, label, requiresKey,
  proposeStructures(input, seed),        // -> [{id, name, tagline, idea, score, reasons[]}]
  generatePlan(input, structureId, seed), // -> {meta, shots[], acts[]}
  regenerateShot(plan, input, index),     // -> plan
}
```

**Nota sulle chiavi API** (solo per i provider automatici)**:** una chiave inserita qui resta nel `localStorage` del browser ed è leggibile da chiunque usi quel dispositivo o da qualsiasi script caricato nella pagina. Va bene per uso personale su una macchina tua; per un uso condiviso, imposta un tuo proxy nel campo *Endpoint* e lascia vuoto il campo chiave, così il segreto resta sul server.

## Aggiungere una struttura narrativa

In `src/engine/structures.js`: aggiungi un oggetto a `STRUCTURES` con la sua `beats[]` (servono almeno un beat con `role: 'apertura'`, uno `'svolta'` e uno `'chiusura'`), scegli il `colorMode` e aggiungi il caso corrispondente in `scoreStructures` per l'affinità. Non serve toccare altro: generatore, vincoli, timeline, analisi ed export la prendono automaticamente.
