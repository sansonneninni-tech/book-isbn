# PRISMA Story Engine — contesto per l'agente

Web app in vanilla JS che progetta la **struttura narrativa** di un reel verticale 9:16 di natura artistica — anche completamente astratto, senza figure umane. Zero build, zero dipendenze, ES modules serviti come statici; un bundler proprio (`build.mjs`) impacchetta tutto in un unico `.html` per la versione single-file.

Il resto di questa nota serve a chi entra nel progetto senza averlo scritto. Leggila prima di toccare qualunque cosa: le decisioni qui dentro non sono arbitrarie, hanno un perché documentato accanto.

## Principio guida

**Il motore decide come si gira, il modello decide cosa si inquadra.**

La grammatica di ripresa — durate, numero di shot, finestre di scala, alternanza dei movimenti, arco cromatico, raccordi — è deterministica e vive in `src/engine/`. Qualunque LLM (ChatGPT, Claude, quello che sarà) può soltanto proporre:
- la sequenza narrativa dei beat (funzione, atto, intensità, posizione cromatica)
- il soggetto concreto di ogni inquadratura sui materiali dell'autore
- l'alternativa se sul posto non funziona

Anche se il modello risponde con valori fuori range, la sua proposta viene **normalizzata e riparata** prima di entrare nel piano (vedi `src/engine/ai-plan.js`). Non c'è nessuna via in cui una risposta di un modello possa far generare due scale identiche di fila, saltare un atto, o rompere l'arco emotivo: il motore fa comunque il suo lavoro sopra.

**Non abbassare questa asticella.** Se aggiungi un provider nuovo (API di qualsiasi tipo), passa dalla stessa pipeline di validazione. Non lasciare mai che dati esterni saltino la normalizzazione, anche quando "l'API è affidabile".

## Domini del progetto (in cinque righe)

1. **Wizard** — tre domande umanistiche (movente, lascito, rifiuto), poi la parte tecnica (idea, palette, luce, ritmo, durata, presenza di persone, modalità sequenziale o indipendente).
2. **Strutture** — sei beat map (`ciclo`, `crescendo`, `rivelazione`, `metamorfosi`, `chiamata-risposta`, `frammento-intero`); un punteggio locale ne propone tre a partire dai dati inseriti.
3. **Piano** — shot list generata deterministicamente su regole, con timeline 9:16, analisi, note di montaggio, modalità shooting.
4. **Storyboard** — quattro testi pronti da incollare in Google Flow o simili: concept, personaggi/soggetti ricorrenti, descrizione shot, descrizione visual. Copiabili con un click, si aggiornano quando lo shot si rigenera.
5. **Provider** — locale, ponte copia-incolla verso ChatGPT, OpenAI API, Claude API. Il locale è sempre il default e il fallback.

## Struttura del codice

```
prisma-story-engine/
├── index.html
├── build.mjs          bundle single-file → dist/prisma-story-engine.html
├── styles/            base · components · print
└── src/
    ├── main.js        orchestrazione (toolbar, routing fra step, dialoghi provider)
    ├── state.js       store minimale + autosave localStorage (protetto contro sandbox)
    │
    ├── engine/        ── il motore deterministico ──
    │   ├── vocabulary.js  scale, movimenti, ritmi, luci (arcs + fixed)
    │   ├── structures.js  le 6 beat map + scoreStructures
    │   ├── color.js       HSL, arco cromatico, palette omogenea, colorName
    │   ├── constraints.js pickScale/pickMove + repair, linkBetween
    │   ├── generator.js   pipeline: densità → durate → colore → scale/mov → soggetti → raccordi
    │   ├── analysis.js    diagnostica + editingNotes
    │   ├── ai-plan.js     prompt del ponte + normalizeAiPlan / normalizeAiShot
    │   └── storyboard.js  i quattro testi per Google Flow, attachStoryboard/refresh
    │
    ├── adapters/      ── interfaccia comune: proposeStructures / generatePlan / regenerateShot ──
    │   ├── index.js       PROVIDERS, getAdapter, load/saveProviderConfig
    │   ├── local.js       default: chiama direttamente engine/generator.js
    │   ├── manual.js      ponte copia-incolla; passa da openBridge, fallback su local
    │   ├── openai.js      API OpenAI; arricchisce il piano locale, fallback su local
    │   ├── claude.js      API Claude; stessa forma di openai.js
    │   └── prompts.js     SYSTEM, enrichPrompt, structuresPrompt, mergeEnrichment, parseJson
    │
    ├── ui/            ── vista, un file per sezione ──
    │   ├── roots.js       le tre domande di apertura
    │   ├── wizard.js      questionario tecnico
    │   ├── structures.js  proposta a 3 card
    │   ├── shotlist.js    shot list + storyboardBar
    │   ├── timeline.js    barra 9:16 proporzionale + curva di intensità
    │   ├── analysis.js    diagnostica + editingNotes
    │   ├── shooting.js    modalità set con checkbox
    │   ├── bridge.js      modale copia-incolla del ponte (openBridge)
    │   ├── dialogs.js     askConfirm, showMessage, showTextFile, copyText, copyButton
    │   └── exports.js     CSV, JSON, stampa/PDF, pannello unico "Salva / Stampa"
    │
    └── util/          rng seedato (mulberry32 + FNV), helper DOM minimale
```

## Modello dati del piano

Dopo `generatePlan`, il piano ha questa forma. **Tutti gli adapter devono produrne uno identico** (aggiungi campi in `meta` se vuoi, mai togliere):

```js
{
  meta: {
    struttura, strutturaNome, tagline, ideaStruttura,
    durata, ritmo, ritmoId, nShot, seed,
    paletteFlat, luceFissa, luceLabel,
    modalita: 'sequenziale' | 'indipendente',
    formato: '9:16 verticale', creato: ISO,
    // popolati solo per piani venuti dal ponte:
    origine: 'ponte' | 'locale', bridgeReport: [{ level, msg }],
    // popolato da attachStoryboard, vedi engine/storyboard.js:
    storyboard: { conceptGenerale, descrizionePersonaggi },
  },
  shots: [{
    id, n, act, role, funzione,
    materiale, soggetto,
    scala: { i, id, family, label },
    movimento: { id, label, family, axis, energy },
    durata, start,
    luce, colore: { hex, nome },
    intensita, alternativa,
    linkPrev: { tipo, testo }, linkNext: { tipo, testo },
    fatto: false,
    storyboard: { descShot, descVisual }, // popolato da attachStoryboard
  }],
  acts: [{ n, nome, shots, durata }],
}
```

## L'interfaccia degli adapter

Tutti e quattro implementano la stessa forma; `main.js` non sa quale sta usando:

```js
{
  id, label, requiresKey, configured,
  proposeStructures(input, seed)          -> [{ id, name, tagline, idea, score, reasons[] }]
  generatePlan(input, structureId, seed)  -> plan (vedi sopra, popolato di storyboard)
  regenerateShot(plan, input, index)      -> plan (con lo shot rifatto + storyboard aggiornato)
}
```

Regole non negoziabili per un adapter nuovo:

- **Non chiamare mai il generatore skipando i vincoli.** Se hai una beat map dal modello, passa da `generatePlan(input, structureId, seed, { beats, texts })`; il generatore applicherà comunque `pickScale/pickMove/repair*` e la scelta dei raccordi.
- **Attacca sempre lo storyboard.** Se il tuo adapter costruisce il piano fuori dal generatore, chiama `attachStoryboard(plan, input)` prima di restituirlo. Se rigenera uno shot, chiama `refreshShotStoryboard(plan, index)` — e i vicini se i raccordi cambiano.
- **Fallback trasparente sul locale in caso di errore.** Log a `console.warn`, ma non far mai fallire l'operazione: l'utente aspetta un piano, non una spiegazione.
- **Rispetta la modalità.** `input.modalita === 'indipendente'` significa niente raccordi computati; il testo prompt deve chiedere al modello di non alludere a ciò che viene prima o dopo.

## Il ponte copia-incolla (adapter `manual`)

`src/adapters/manual.js` è la traduzione di un adapter API in un flusso manuale. Vive per due motivi:
1. **La versione pubblicata online è dentro un iframe con sandbox** (`allow-scripts` e poco altro). La CSP blocca `fetch()` verso API esterne: da lì un adapter API vero non può funzionare, il ponte sì.
2. Non tutti hanno una chiave API. Chi non ce l'ha ha già ChatGPT in un'altra scheda.

Quando aggiungerai gli adapter API veri (vedi la nota qui sotto), **non rimuovere il ponte**: lascialo selezionabile in `adapters/index.js`, perché nell'artifact è l'unico modo per far parlare l'app col modello.

## L'ambiente in cui gira l'app

Lo stesso codice gira in **tre contesti** e devi tenerli tutti in piedi:

| Contesto | Come lo prova un utente | Vincoli particolari |
|---|---|---|
| **`file://`** | doppio clic sull'HTML single-file | niente moduli ES relativi, quindi il bundle deve essere un unico script; il download può arrivare troncato — il boot ha già un messaggio d'errore visibile |
| **server locale** | `python3 -m http.server 8000` | tutto funziona normalmente, è l'ambiente di sviluppo |
| **iframe con sandbox** (artifact) | link claude.ai/code/artifact/... | `<form>` non fa submit, `confirm()`/`alert()` ignorati, `window.print()` senza effetto, download silenziosamente scartati, `localStorage` può lanciare, `fetch()` fuori dominio bloccato |

**Contromisure già in atto** (non le rimuovere per "semplificare"):
- niente `<form>`: pulsanti `type="button"` con handler
- niente `confirm()`: usa `askConfirm` in `ui/dialogs.js`
- niente `window.print()` diretto: chiama `printPlan(plan, input)` da `ui/exports.js`, che ripiega
- niente `alert()`: usa `showMessage` o `showTextFile`
- ogni accesso a `localStorage` è in `try/catch`
- ogni download ha accanto "Copia" e "Mostra" — i pulsanti sono in `openExportDialog`

**Aggiungere un test?** In `/tmp/claude-0/-home-user-book-isbn/f72d35a6-d7a1-5a3a-b24c-6bd54894c748/scratchpad/` ci sono già:
- `smoke.mjs` — motore deterministico + vincoli + storyboard
- `ui.mjs` — Playwright, flow completo su `index.html`
- `sandbox.mjs` — Playwright dentro un iframe con `sandbox="allow-scripts"` (riproduce l'artifact)
- `sbui.mjs` — verifica dei pulsanti copia-incolla, con lettura reale degli appunti

Playwright è già installato globalmente:
```bash
node -e "require.resolve('playwright')" # ok
# per usarlo dentro uno script ESM: import pw from '/opt/node22/lib/node_modules/playwright/index.js'; const { chromium } = pw;
# executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
```

## Build e deploy

```bash
python3 -m http.server 8000   # sviluppo, http://localhost:8000
node build.mjs                # single-file → dist/prisma-story-engine.html
```

`build.mjs` **non è un bundler generico**: gestisce solo le forme di import/export usate qui (`import { a, b } from './x.js'` su una riga, `export function/const`, niente default). Se aggiungi `export default`, il build salta con un errore leggibile — non allentare quel controllo, aggiungi i casi mancanti.

Il documento risultante contiene un blocco `#boot` visibile che sparisce a caricamento riuscito, così un file troncato non lascia una pagina nera.

## Convenzioni

- **Italiano ovunque**: UI, commenti, prompt, messaggi diagnostici. La lingua è parte del prodotto.
- **Elisioni** — `il azzurro` è sbagliato. Usa gli helper in `engine/color.js`: `conArticolo(nome)`, `dalColore(nome)`, `alColore(nome)`.
- **Commenti** — spiegano il **perché**, mai il cosa. Se non aggiungono un vincolo, un'invariante o un motivo storico ("questo perché la sandbox blocca X"), toglili.
- **Deterministic seed** — `makeRng(seedString)` da `util/rng.js`. Lo stesso seed produce lo stesso piano. Un `Date.now()` come nonce nei rigen è ok.
- **Niente librerie** — l'app deve poter girare in un iframe sandboxato senza CDN raggiungibili. Se ti serve una funzione, scrivila (venti righe di helper DOM in `util/dom.js` bastano; niente framework).

## Cosa NON toccare senza motivo

- **Le sei strutture** in `structures.js`: sono l'archetipo del prodotto, non prototipi.
- **`repairScales`/`repairMoves`**: sembra codice barocco, ma è quello che impedisce a rigenerazioni e proposte AI di produrre montaggi che leggono come errori. Ogni volta che l'ho semplificato, ci sono cascate falliti in test.
- **`makeColorArc` con neutralBridge**: quel passaggio dalla zona desaturata quando i due colori sono lontani è ciò che fa la differenza fra "gradient CSS" e "come lavora un colorist".
- **Il fallback su locale**: ogni adapter ha un fallback esplicito su `localAdapter`. È deliberato: non deve mai capitare che un errore di rete lasci l'utente senza piano.

---

## Prossima tappa: adapter API automatici, no più copia-incolla

Vedi `docs/NEXT-STEPS.md` per il piano preciso di questa evoluzione (adapter OpenAI/Claude che sostituiscono davvero il ponte, e adapter per il generatore di storyboard tipo Google Flow), con file da toccare, punti di aggancio già pronti, e le due o tre cose delicate.
