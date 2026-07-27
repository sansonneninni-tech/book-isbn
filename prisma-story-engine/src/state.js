// Store minimale con autosalvataggio locale. Nessuna dipendenza, nessun server.

const KEY = 'prisma.project.v1';

export const DEFAULT_INPUT = {
  titolo: 'Reel senza titolo',
  // le tre domande di partenza: non tecniche, ma finiscono in ogni prompt
  movente: '',
  lascito: '',
  rifiuto: '',
  idea: '',
  emozioneIniziale: 'attesa',
  emozioneFinale: 'meraviglia',
  materiali: '',
  paletteMode: 'transizione', // transizione | omogenea
  paletteIniziale: '#16283f',
  paletteFinale: '#e0a24a',
  paletteVariazione: 'media',
  viaggioLungo: false,
  lightArc: 'ombra-luce',
  ritmo: 'respirato',
  durata: 22,
  persone: false,
  // sequenziale = shot legati da raccordi; indipendente = elenco di immagini
  // autonome, ognuna deve reggersi da sola (piu' liberta' in fase di montaggio)
  modalita: 'sequenziale',
};

const listeners = new Set();

export const state = {
  step: 'radici', // radici | wizard | strutture | piano
  tab: 'shotlist', // shotlist | timeline | analisi | montaggio
  input: { ...DEFAULT_INPUT },
  candidates: [],
  plan: null,
  shooting: false,
  busy: false,
  seed: 'prisma',
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  persist();
  listeners.forEach((fn) => fn(state));
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      step: state.step, tab: state.tab, input: state.input, shooting: state.shooting,
      candidates: state.candidates, plan: state.plan, seed: state.seed,
    }));
  } catch (err) {
    console.warn('Salvataggio locale non riuscito:', err.message);
  }
}

export function restore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    Object.assign(state, {
      step: saved.step || 'radici',
      tab: saved.tab || 'shotlist',
      input: { ...DEFAULT_INPUT, ...(saved.input || {}) },
      candidates: saved.candidates || [],
      plan: saved.plan || null,
      seed: saved.seed || 'prisma',
      shooting: !!saved.shooting && !!saved.plan,
    });
    return true;
  } catch {
    return false;
  }
}

export function resetAll() {
  // in un iframe con sandbox l'accesso a localStorage puo' lanciare: azzerare
  // il progetto deve funzionare lo stesso, altrimenti il pulsante sembra morto
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn('Cancellazione locale non riuscita:', err.message);
  }
  Object.assign(state, {
    step: 'radici', tab: 'shotlist', input: { ...DEFAULT_INPUT },
    candidates: [], plan: null, shooting: false, seed: 'prisma',
  });
  listeners.forEach((fn) => fn(state));
}

/** Esporta il progetto come oggetto serializzabile (per il file .json). */
export function snapshot() {
  return { version: 1, input: state.input, plan: state.plan, seed: state.seed };
}

export function loadSnapshot(obj) {
  if (!obj || !obj.input) throw new Error('File di progetto non valido');
  setState({
    input: { ...DEFAULT_INPUT, ...obj.input },
    plan: obj.plan || null,
    seed: obj.seed || 'prisma',
    step: obj.plan ? 'piano' : 'radici',
  });
}
