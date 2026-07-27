# Prossima tappa: eliminare il copia-incolla, sia verso ChatGPT sia verso Google Flow

Contesto: leggi prima `CLAUDE.md` in radice, poi torna qui.

L'app oggi ha due punti di attrito che sono passaggi manuali:

1. **Verso ChatGPT/Claude** — il ponte (`adapters/manual.js`) prepara un prompt, apre un modale, aspetta che l'utente lo porti in una chat esterna e riporti indietro la risposta.
2. **Verso il generatore di storyboard** (Google Flow o simili) — la shot list mostra quattro testi con pulsanti "Copia", che l'utente incolla dentro Google Flow uno alla volta.

**Obiettivo di questa tappa: rendere entrambi i passaggi automatici via API, senza rimuovere il ponte** — che resta l'unica strada nell'artifact pubblicato in un iframe con sandbox (dove `fetch()` verso domini esterni è bloccato).

## 1 · Chiudere il cerchio con OpenAI/Claude

### Cosa c'è già

`adapters/openai.js` e `adapters/claude.js` esistono già come **arricchimento**: partono dal piano locale e chiedono al modello di riscrivere solo `soggetto`, `funzione`, `alternativa` per ogni shot. Vedi `adapters/prompts.js` per il contratto.

**Limite attuale:** questi adapter NON usano la beat map proposta dal modello (a differenza del ponte), quindi la struttura narrativa scelta dal modello si perde. Il ponte è più potente: passa da `buildBridgePrompt` + `normalizeAiPlan` + `generatePlan(..., { beats, texts })`.

### Cosa fare

Portare l'API allo stesso livello del ponte. In `adapters/openai.js` e `adapters/claude.js`:

1. In `generatePlan`, invece di partire dal piano locale e arricchirlo, mandare `buildBridgePrompt(input, structureId)` (già presente in `engine/ai-plan.js`) come prompt utente. La risposta passa da `extractJson` → `normalizeAiPlan` → `generatePlan(input, structureId, seed, { beats, texts })`. Attacca `plan.meta.origine = 'api-openai'` (o `api-claude`), copia `normalized.report` in `plan.meta.bridgeReport` (la UI lo mostra già).
2. In `regenerateShot`, mandare `buildShotPrompt(input, plan, index)`, poi `extractJson` → `normalizeAiShot` → `regenerateShot(plan, input, index, Date.now(), ai)`. Questo è già supportato dal generatore: guarda come lo fa `adapters/manual.js:73-108`.
3. **Lasciare `enrichPrompt`/`mergeEnrichment` come modalità di fallback** quando `buildBridgePrompt` fallisce: un piano riscritto è meglio di niente.

**Dove agganciare lo storyboard.** Nulla da fare: `generatePlan` chiama `attachStoryboard` internamente, e `regenerateShot` chiama `refreshShotStoryboard`. Se passi da queste funzioni, i testi per Google Flow si aggiornano da soli.

### Contro cosa proteggersi

- **Errori API silenziosi.** Ogni chiamata è dentro un `try/catch` che cade sul locale. Non toglierlo. Aggiungi al più un `notify()` opzionale al chiamante — ma senza cambiare il contratto degli adapter.
- **CORS dal browser.** L'endpoint di OpenAI e di Anthropic non abilita CORS per il browser: la chiamata diretta funziona solo con `anthropic-dangerous-direct-browser-access: true` (Anthropic) o con un proxy. **Documenta questo nel dialogo delle impostazioni** — se l'utente non ha un proxy e chiama direttamente, funziona; su Safari con protezioni strette può non funzionare.
- **Chiavi in localStorage.** Il fatto è già dichiarato nel dialogo (`main.js:openSettings`). Non nasconderlo.

### Come testare

C'è un template pronto in `scratchpad/smoke.mjs`. Aggiungi un test che monti un mock di `fetch()` (nel nodo) e verifichi che l'adapter chiami `buildBridgePrompt`, non `enrichPrompt`, e che il risultato passi per la normalizzazione. Il vincolo duro da controllare: **due scale identiche di fila non devono mai comparire, nemmeno se il modello le propone così** — la riparazione del generatore deve reggere.

Non serve un test UI nuovo: se l'adapter API rispetta il contratto, tutti i test di `sbui.mjs` passano tali e quali (il codice UI non sa di quale adapter sta usando).

## 2 · Adapter per Google Flow

Lo storyboard è oggi solo testo copiabile. Da automatizzare: mandare i quattro testi direttamente all'API di generazione, ricevere lo sketch, mostrarlo dentro la card dell'inquadratura.

### Il dato che parte da qui

`engine/storyboard.js` produce già i quattro testi. Non toccare quello: è la fonte di verità e viene richiamato automaticamente su ogni rigenerazione. Il tuo lavoro sta al livello sopra.

### Il pezzo da aggiungere

Un nuovo file `src/adapters/storyboard.js` con questa forma:

```js
export function makeStoryboardAdapter(config = {}) {
  return {
    id: 'flow-google', label: 'Google Flow', requiresKey: true,
    configured: !!config.apiKey,

    // genera lo sketch di UNA inquadratura; ritorna { imageUrl | imageData, meta }
    async generateShotSketch(plan, shotIndex) { ... },

    // opzionale: rigenera in batch tutte le inquadrature (con limite di concorrenza)
    async generateAllSketches(plan, { onProgress } = {}) { ... },
  };
}
```

Convenzioni condivise con gli altri adapter:
- **Costruisci il prompt sempre dallo `storyboard` del piano**, mai da campi grezzi. Se lo shot è stato rigenerato, `shot.storyboard.descShot/descVisual` è già fresco.
- **Concept e personaggi vanno mandati insieme** al primo prompt, poi solo se cambiano (hash del testo → se identico, riusa).
- **Cache dell'immagine per shot** dentro `plan.shots[i].sketch = { url, requestedAt, promptHash }`. Se il `promptHash` non cambia, non ri-chiamare l'API — un rigenera dello shot che non cambia il testo non deve costare.
- **Fallback esplicito e visibile.** Se la chiamata fallisce, lascia lo shot senza sketch e mostra un piccolo `⚠ ripeti` accanto al pulsante — non un errore silente.

### Dove agganciare la UI

`src/ui/shotlist.js` ha già il blocco `shot-sb` in fondo a ogni card, con i due pulsanti "Copia". Aggiungi accanto:

- un pulsante `🎬 Genera sketch` che chiama l'adapter e mostra un placeholder animato
- l'immagine risultante, cliccabile per apertura full-screen (usa un `<dialog>`, la CSP dell'artifact permette immagini `data:` ma non caricamenti esterni — quindi in artifact lo sketch dovrà arrivare come `data:` o non arrivare affatto)

Per la barra in alto (`storyboardBar`), aggiungi due pulsanti aggiuntivi:
- `🎬 Genera tutti gli sketch` con progress
- `⤓ Scarica tutti gli sketch (.zip)` — usa `JSZip` inline o costruisci uno zip minimale a mano; niente CDN.

### Cosa non fare

- **Non far scomparire i pulsanti "Copia".** Google Flow potrebbe cambiare API o l'utente potrebbe voler usare un altro tool: il testo copiabile resta il canale universale.
- **Non mettere l'API key di Google Flow nel bundle.** Deve stare in `localStorage` come le altre, con lo stesso avviso.
- **Non generare sketch automaticamente al primo caricamento.** Costa soldi ogni volta. Solo su click esplicito.

## 3 · Impostazioni (dialogo)

`main.js:openSettings` ha già i campi per API key/modello/proxy per gli adapter LLM. Aggiungi una sezione **Storyboard automatico** separata:
- provider (nessuno / Google Flow / altro)
- API key
- modello/stile (se l'API lo espone come parametro)
- selettore stile (matita, acquerello, realistico) — che diventa un campo del prompt

Il selettore stile deve poter essere cambiato **dopo** aver generato gli sketch: se cambio stile e clicco "rigenera tutti", devono essere rifatti tutti con lo stile nuovo.

## 4 · Percorso incrementale suggerito

1. **Prima** completa gli adapter OpenAI/Claude usando `buildBridgePrompt` e `buildShotPrompt`. È un rifacimento locale, senza nuovi file, senza nuova UI. Lo verifichi con un flusso via API dentro `scratchpad/`.
2. **Poi** aggiungi il dialogo per la chiave di Google Flow e il primo adapter storyboard, ma solo per la generazione di **un** shot. Nessun batch. Nessuna cache. Nient'altro. Vederlo funzionare su una card è il primo checkpoint reale.
3. **Poi** aggiungi la cache per `promptHash`.
4. **Poi** aggiungi il batch e il download `.zip`.
5. **Solo alla fine** togli il ponte come default e metti l'API come default (`adapters/index.js:PROVIDERS` ordinato con l'API in cima quando è configurata).

## 5 · Come chiudere il lavoro

Prima di commit:
- `node build.mjs` deve girare senza errori.
- `scratchpad/ui.mjs`, `sandbox.mjs`, `sbui.mjs` devono passare (il tuo lavoro non deve rompere quello che c'è).
- `dist/prisma-story-engine.html` aperto con `file://` mostra la pagina, non il boot di errore.
- La versione online (redeployata) mostra i pulsanti "Copia" ancora funzionanti come fallback.

Commit in italiano, formato **verbo al presente, prima persona plurale** (guarda la history con `git log --oneline`). Un commit per cambiamento coerente, non un blob.

**Non pushare** finché non ti è stato chiesto: la branca di lavoro è `claude/reel-narrative-structure-r0sajr` (o quella che ti viene detta esplicitamente).
