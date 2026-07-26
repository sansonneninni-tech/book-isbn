// Le regole che impediscono alla shot list di essere "inquadrature a caso".
// Sono deterministiche e applicate in due tempi: scelta guidata + passata di riparazione.

import { SCALES, MOVES, MOVE_BANDS } from './vocabulary.js';
import { hexToHsl, hueDistance, colorName, conArticolo } from './color.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Scale ammesse per un beat, con un margine se la finestra e' troppo stretta. */
export function scalePool(beat) {
  const [a, b] = beat.scale;
  const pool = SCALES.filter((s) => s.i >= a && s.i <= b);
  if (pool.length >= 2) return pool;
  return SCALES.filter((s) => s.i >= clamp(a - 1, 0, 6) && s.i <= clamp(b + 1, 0, 6));
}

/** Movimenti ammessi: energia compatibile con la banda del beat. */
export function movePool(beat) {
  const [lo, hi] = MOVE_BANDS[beat.move] || MOVE_BANDS.soft;
  const pool = MOVES.filter((m) => m.energy >= lo - 0.06 && m.energy <= hi + 0.06);
  return pool.length ? pool : MOVES;
}

/**
 * Sceglie una scala nella finestra del beat evitando quelle in `avoid`.
 * Se la finestra e' satura allarga progressivamente: il vincolo "mai due scale
 * uguali di fila" e' duro, la finestra del beat e' solo una preferenza.
 */
export function pickScale(beat, rng, avoid = []) {
  const [a, b] = beat.scale;
  for (let widen = 0; widen <= 6; widen++) {
    const lo = clamp(a - widen, 0, 6);
    const hi = clamp(b + widen, 0, 6);
    const pool = SCALES.filter((s) => s.i >= lo && s.i <= hi && !avoid.includes(s.i));
    if (pool.length) return rng.pick(pool);
  }
  const any = SCALES.filter((s) => !avoid.includes(s.i));
  return rng.pick(any.length ? any : SCALES);
}

export function pickMove(beat, rng, avoidIds = [], avoidFamilies = []) {
  const [lo, hi] = MOVE_BANDS[beat.move] || MOVE_BANDS.soft;
  // piu' il movimento e' vicino all'intensita' del beat, piu' e' probabile
  const w = (m) => 1 / (0.12 + Math.abs(m.energy - beat.i));
  for (const pad of [0.06, 0.2, 0.45, 1]) {
    const pool = MOVES.filter(
      (m) => m.energy >= lo - pad && m.energy <= hi + pad
        && !avoidIds.includes(m.id) && !avoidFamilies.includes(m.family)
    );
    if (pool.length) return rng.weighted(pool, w);
  }
  // l'identita' del movimento e' un vincolo duro, la famiglia solo una preferenza
  const noId = MOVES.filter((m) => !avoidIds.includes(m.id));
  return rng.weighted(noId.length ? noId : MOVES, w);
}

/**
 * REGOLA 1 — varieta' delle scale.
 * Mai due scale identiche consecutive; almeno 4 scale distinte sul totale.
 */
export function repairScales(slots, rng) {
  const around = (i) => [slots[i - 1]?.scale.i, slots[i + 1]?.scale.i].filter((v) => v != null);

  for (let i = 1; i < slots.length; i++) {
    if (slots[i].scale.i === slots[i - 1].scale.i) {
      slots[i].scale = pickScale(slots[i].beat, rng, [slots[i - 1].scale.i]);
    }
  }

  // tre scale della stessa famiglia di fila appiattiscono la lettura
  for (let i = 2; i < slots.length; i++) {
    const fam = slots[i].scale.family;
    if (fam === slots[i - 1].scale.family && fam === slots[i - 2].scale.family) {
      const alt = scalePool(slots[i].beat).filter((s) => s.family !== fam && !around(i).includes(s.i));
      if (alt.length) slots[i].scale = rng.pick(alt);
    }
  }

  // almeno quattro scale distinte: senza salti di scala il reel legge piatto
  const distinct = new Set(slots.map((s) => s.scale.i));
  if (distinct.size < 4 && slots.length >= 6) {
    for (let i = 0; i < slots.length; i++) {
      if (distinct.size >= 4) break;
      const alt = scalePool(slots[i].beat).filter((s) => !distinct.has(s.i) && !around(i).includes(s.i));
      if (alt.length) {
        slots[i].scale = rng.pick(alt);
        distinct.add(slots[i].scale.i);
      }
    }
  }

  // passata finale: il vincolo duro non deve mai cadere per colpa delle passate sopra
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].scale.i === slots[i - 1].scale.i) {
      slots[i].scale = pickScale(slots[i].beat, rng, around(i));
    }
  }
  return slots;
}

/**
 * REGOLA 2 — mai due movimenti uguali consecutivi (ne' della stessa famiglia).
 */
export function repairMoves(slots, rng) {
  for (let i = 1; i < slots.length; i++) {
    const prev = slots[i - 1].move;
    const cur = slots[i].move;
    if (cur.id === prev.id || cur.family === prev.family) {
      slots[i].move = pickMove(slots[i].beat, rng, [prev.id], [prev.family]);
    }
  }
  return slots;
}

/**
 * REGOLA 3 — continuita': ogni taglio deve avere un aggancio dichiarato.
 * Si sceglie il raccordo con l'affinita' piu' alta fra le due inquadrature.
 */
export function linkBetween(a, b, ctx) {
  const ha = hexToHsl(a.colore.hex);
  const hb = hexToHsl(b.colore.hex);
  const dh = hueDistance(ha.h, hb.h);
  const dl = Math.abs(ha.l - hb.l);
  const dScale = Math.abs(a.scala.i - b.scala.i);

  if (dh < 24 && dl < 22) {
    const na = colorName(a.colore.hex);
    const nb = colorName(b.colore.hex);
    return {
      tipo: 'colore',
      testo: na === nb
        // stessa dominante ai due lati: il taglio sparisce, ed e' una scelta, non un caso
        ? `Raccordo di colore: la dominante resta ${conArticolo(na)} da una parte e dall’altra, il taglio diventa invisibile.`
        : `Raccordo di colore: ${conArticolo(na)} resta in campo e regge il taglio verso ${conArticolo(nb)}.`,
    };
  }
  if (a.movimento.axis !== 'nessuno' && a.movimento.axis === b.movimento.axis) {
    return {
      tipo: 'movimento',
      testo: `Match on action: il movimento sull’asse ${a.movimento.axis} prosegue attraverso lo stacco.`,
    };
  }
  if (dScale >= 3) {
    return {
      tipo: 'forma',
      testo: `Raccordo di forma: la stessa geometria torna a scala diversa (da ${a.scala.label.toLowerCase()} a ${b.scala.label.toLowerCase()}).`,
    };
  }
  if (a.luce === b.luce) {
    return { tipo: 'luce', testo: 'Raccordo di luce: stessa direzione e qualità della sorgente, cambia solo il soggetto.' };
  }
  if (['pulsato', 'serrato', 'sincopato'].includes(ctx.ritmo)) {
    return { tipo: 'suono', testo: 'Stacco sul beat: il taglio cade sull’accento sonoro, il suono tiene insieme le due immagini.' };
  }
  return {
    tipo: 'materia',
    testo: `Raccordo di materia: il suono di ${a.materiale} anticipa l’immagine successiva di ${b.materiale}.`,
  };
}
