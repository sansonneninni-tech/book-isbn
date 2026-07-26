// Ponte copia-incolla: costruisce il prompt da portare in ChatGPT (o Claude)
// e valida la risposta prima di lasciarla entrare nel piano.
//
// Principio: il modello propone, il motore dispone. Qualunque cosa torni indietro
// passa da qui, viene normalizzata e riparata; i vincoli di ripresa restano nostri.

import { SCALES, MOVE_BANDS, RHYTHMS, LIGHT_ARCS } from './vocabulary.js';
import { getStructure } from './structures.js';
import { colorName } from './color.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);

const ROLES = ['apertura', 'sviluppo', 'trasformazione', 'svolta', 'chiusura'];
const BANDS = Object.keys(MOVE_BANDS);

/** Numero di inquadrature suggerito, coerente con quello che farebbe il motore. */
export function suggestedShotCount(input) {
  const rhythm = RHYTHMS.find((r) => r.id === input.ritmo) || RHYTHMS[1];
  return clamp(Math.round((Number(input.durata) || 20) / rhythm.avgShot), 5, 26);
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export function buildBridgePrompt(input, structureId) {
  const structure = getStructure(structureId);
  const n = suggestedShotCount(input);
  const rhythm = RHYTHMS.find((r) => r.id === input.ritmo) || RHYTHMS[1];
  const light = LIGHT_ARCS.find((l) => l.id === input.lightArc) || LIGHT_ARCS[0];
  const materials = String(input.materiali || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

  const scaleTable = SCALES.map((s) => `${s.i} = ${s.label}`).join(' · ');
  const bandTable = Object.entries(MOVE_BANDS)
    .map(([k, [lo, hi]]) => `"${k}" (energia ${lo}–${hi})`).join(' · ');

  return `Sei un direttore della fotografia. Devi progettare la struttura di un reel verticale 9:16 di natura artistica.

## Il progetto

Idea: ${input.idea || '(non specificata)'}
Emozione: si parte da "${input.emozioneIniziale || 'non specificata'}" e si arriva a "${input.emozioneFinale || 'non specificata'}"
Materiali realmente disponibili: ${materials.length ? materials.join(', ') : '(nessuno indicato — usa soggetti astratti e generici)'}
Figure umane in campo: ${input.persone ? 'sì' : 'NO — non nominare mai persone, mani, volti o corpi'}
Palette: da ${colorName(input.paletteIniziale)} (${input.paletteIniziale}) a ${colorName(input.paletteFinale)} (${input.paletteFinale})
Luce: ${light.label}
Ritmo: ${rhythm.label} (${rhythm.note})
Durata totale: ${input.durata}s

## La struttura scelta

"${structure.name}" — ${structure.tagline}
${structure.idea}

## Cosa devi restituire

Una beat map di ESATTAMENTE ${n} inquadrature che realizzi questa struttura su questa idea.
Per ogni inquadratura decidi la funzione narrativa e la posizione nell'arco; NON decidere durate,
colori esatti o raccordi: quelli li calcola il programma dai tuoi valori.

Campi di ogni inquadratura:
- "fn": la funzione narrativa concreta di questa inquadratura in questa struttura (max 14 parole, in italiano)
- "soggetto": cosa si inquadra esattamente, con i materiali disponibili (max 18 parole, in italiano)
- "alternativa": un modo diverso di riprendere lo stesso beat se sul posto non funziona (una frase)
- "act": 1, 2 o 3 (apertura / trasformazione / chiusura) — devono essere in ordine non decrescente
- "role": uno fra ${ROLES.map((r) => `"${r}"`).join(', ')}
- "w": peso di durata, da 0.5 (breve) a 2 (lunga)
- "i": intensità narrativa, da 0 a 1
- "c": posizione sull'arco cromatico, da 0 (colore iniziale) a 1 (colore finale)
- "scale": [min, max] indici di scala ammessi — ${scaleTable}
- "move": banda di energia del movimento macchina — ${bandTable}

Vincoli non negoziabili:
1. La prima inquadratura ha "role": "apertura"; l'ultima ha "role": "chiusura".
2. Esattamente una inquadratura ha "role": "svolta", ed è quella con la "i" più alta.
3. Ogni atto (1, 2, 3) ha almeno una inquadratura.
4. Le finestre "scale" di inquadrature vicine devono essere diverse: alterna stretto e largo.
5. La curva delle "i" deve avere un arco riconoscibile, non essere piatta.

## Formato

Rispondi SOLO con questo JSON, senza testo prima o dopo, senza blocchi di codice:

{"shots":[
 {"fn":"Stabilire lo stato di quiete","soggetto":"Campo medio sulla superficie d'acqua ferma, riflesso del cielo","alternativa":"Macro sulla stessa acqua, solo texture","act":1,"role":"apertura","w":1.3,"i":0.18,"c":0,"scale":[4,6],"move":"static"},
 {"fn":"Il primo segno del cambiamento","soggetto":"Dettaglio della goccia che rompe la superficie","alternativa":"Piano ravvicinato sul cerchio che si allarga","act":1,"role":"sviluppo","w":0.8,"i":0.3,"c":0.15,"scale":[0,1],"move":"soft"}
]}`;
}

// ---------------------------------------------------------------------------
// Parsing e validazione
// ---------------------------------------------------------------------------

/** Estrae il JSON anche se il modello ha aggiunto testo attorno. */
export function extractJson(text) {
  if (!isStr(text)) return null;
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(t);
  } catch { /* si prova col ritaglio */ }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Normalizza la risposta del modello in beat utilizzabili dal generatore.
 * Non rifiuta mai del tutto: ripara quello che può e dice cosa ha corretto.
 * @returns {{beats:Array, texts:Array, report:Array<{level:string,msg:string}>}|null}
 */
export function normalizeAiPlan(data, input, structureId) {
  const structure = getStructure(structureId);
  const report = [];
  const note = (level, msg) => report.push({ level, msg });

  const raw = Array.isArray(data?.shots) ? data.shots : Array.isArray(data) ? data : null;
  if (!raw || raw.length < 3) return null;

  const target = suggestedShotCount(input);
  let list = raw.slice(0, 26);
  if (list.length !== target) {
    note('info', `Il modello ha proposto ${list.length} inquadrature invece di ${target}: tengo le sue.`);
  }
  if (list.length < 5) {
    note('warn', 'Meno di 5 inquadrature: il piano rischia di essere troppo scarno.');
  }

  const beats = list.map((r, idx) => {
    const scaleRaw = Array.isArray(r?.scale) ? r.scale : [];
    let a = clamp(Math.round(num(scaleRaw[0], 2)), 0, 6);
    let b = clamp(Math.round(num(scaleRaw[1], a + 1)), 0, 6);
    if (a > b) [a, b] = [b, a];

    const move = BANDS.includes(r?.move) ? r.move : 'soft';
    if (!BANDS.includes(r?.move)) note('info', `Shot ${idx + 1}: banda di movimento non valida, uso "soft".`);

    const role = ROLES.includes(r?.role) ? r.role : 'sviluppo';
    const act = clamp(Math.round(num(r?.act, 2)), 1, 3);

    const i = clamp(num(r?.i, 0.5), 0, 1);
    const c = clamp(num(r?.c, list.length > 1 ? idx / (list.length - 1) : 0), 0, 1);
    const w = clamp(num(r?.w, 1), 0.4, 2.2);

    const fallback = structure.beats[Math.min(idx, structure.beats.length - 1)];
    const fn = isStr(r?.fn) ? r.fn.trim() : fallback.fn;
    if (!isStr(r?.fn)) note('warn', `Shot ${idx + 1}: funzione narrativa mancante, uso quella della struttura.`);

    return { fn, act, w, i, c, scale: [a, b], move, role, exp: false, variant: 0 };
  });

  // atti in ordine non decrescente
  for (let k = 1; k < beats.length; k++) {
    if (beats[k].act < beats[k - 1].act) {
      beats[k].act = beats[k - 1].act;
      note('info', `Shot ${k + 1}: atto fuori sequenza, riallineato all'atto ${beats[k].act}.`);
    }
  }

  // ruoli portanti: senza questi il piano non è una narrazione
  if (beats[0].role !== 'apertura') {
    beats[0].role = 'apertura';
    note('warn', 'La prima inquadratura non era marcata come apertura: corretta.');
  }
  const last = beats[beats.length - 1];
  if (last.role !== 'chiusura') {
    last.role = 'chiusura';
    note('warn', 'L’ultima inquadratura non era marcata come chiusura: corretta.');
  }
  const turns = beats.filter((b) => b.role === 'svolta');
  if (turns.length !== 1) {
    beats.forEach((b) => { if (b.role === 'svolta') b.role = 'trasformazione'; });
    const peak = beats.reduce((acc, b, k) => (b.i > beats[acc].i && k > 0 && k < beats.length - 1 ? k : acc), 1);
    beats[peak].role = 'svolta';
    note('warn', turns.length === 0
      ? `Mancava il punto di svolta: assegnato allo shot ${peak + 1}, il più intenso.`
      : `C’erano ${turns.length} punti di svolta: tengo solo lo shot ${peak + 1}.`);
  }

  // atti vuoti
  const used = new Set(beats.map((b) => b.act));
  [1, 2, 3].forEach((n) => {
    if (!used.has(n)) note('warn', `Nessuna inquadratura nell’atto ${n}: la timeline avrà un atto vuoto.`);
  });

  // arco piatto
  const spread = Math.max(...beats.map((b) => b.i)) - Math.min(...beats.map((b) => b.i));
  if (spread < 0.35) note('warn', `Escursione di intensità solo del ${Math.round(spread * 100)}%: l’arco è quasi piatto.`);

  const texts = list.map((r, idx) => ({
    n: idx + 1,
    soggetto: isStr(r?.soggetto) ? r.soggetto.trim() : null,
    alternativa: isStr(r?.alternativa) ? r.alternativa.trim() : null,
  }));
  const missing = texts.filter((t) => !t.soggetto).length;
  if (missing) note('info', `${missing} soggetti mancanti: li compila il motore locale.`);

  if (!report.length) note('ok', 'Risposta accettata senza correzioni.');
  return { beats, texts, report };
}
