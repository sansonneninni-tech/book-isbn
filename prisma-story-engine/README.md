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

Funziona offline. Il progetto viene salvato automaticamente nel browser (localStorage) e può essere esportato come file `.json`, `.csv` o stampato in PDF.

### Versione single-file

Per aprirlo senza server (doppio clic, o da telefono, o su un qualsiasi hosting statico):

```bash
node build.mjs          # -> dist/prisma-story-engine.html
```

`build.mjs` impacchetta i 22 moduli ES e i tre fogli di stile in un unico `.html` autonomo, senza dipendenze. Non è un bundler generico: gestisce le sole forme di import/export usate qui, e si ferma con un errore se ne incontra una diversa.

## Flusso

1. **Wizard** — idea, arco emotivo, materiali disponibili, palette iniziale/finale, evoluzione della luce, ritmo, durata, presenza di persone.
2. **Tre strutture proposte** fra Ciclo, Crescendo, Rivelazione, Metamorfosi, Chiamata-risposta e Frammento→intero, con una motivazione che cita i dati inseriti.
3. **Shot list** generata su regole deterministiche, con rigenerazione della singola inquadratura.
4. **Timeline 9:16** con durate proporzionali, barra cromatica, divisione in atti e curva di intensità.
5. **Analisi**, **note di montaggio**, **modalità shooting** con checkbox, **export**.

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
    ├── adapters/         local | claude | openai (stessa interfaccia)
    ├── ui/               wizard, structures, shotlist, timeline, analysis, shooting, exports
    └── util/             rng seedato, helper DOM
```

## Adapter LLM (opzionale)

Il motore locale è sempre attivo e **definisce la struttura**. Un provider esterno non la sostituisce: riscrive soltanto `soggetto`, `funzione` e `alternativa`, rendendoli concreti sui materiali reali. Durate, scale, movimenti, colori, atti e raccordi restano deterministici. Se la chiamata fallisce, l'app ricade automaticamente sul locale.

Si configura dal pulsante ⚙ nella toolbar: provider, chiave, modello, endpoint.

Interfaccia da rispettare per aggiungere un provider (`src/adapters/`):

```js
{
  id, label, requiresKey,
  proposeStructures(input, seed),        // -> [{id, name, tagline, idea, score, reasons[]}]
  generatePlan(input, structureId, seed), // -> {meta, shots[], acts[]}
  regenerateShot(plan, input, index),     // -> plan
}
```

**Nota sulle chiavi API:** una chiave inserita qui resta nel `localStorage` del browser ed è leggibile da chiunque usi quel dispositivo o da qualsiasi script caricato nella pagina. Va bene per uso personale su una macchina tua; per un uso condiviso, imposta un tuo proxy nel campo *Endpoint* e lascia vuoto il campo chiave, così il segreto resta sul server.

## Aggiungere una struttura narrativa

In `src/engine/structures.js`: aggiungi un oggetto a `STRUCTURES` con la sua `beats[]` (servono almeno un beat con `role: 'apertura'`, uno `'svolta'` e uno `'chiusura'`), scegli il `colorMode` e aggiungi il caso corrispondente in `scoreStructures` per l'affinità. Non serve toccare altro: generatore, vincoli, timeline, analisi ed export la prendono automaticamente.
