// Generatore deterministico della shot list.
// Pipeline: densita' -> espansione beat -> durate -> arco cromatico -> scale/movimenti
// -> riparazione vincoli -> soggetti -> luce -> raccordi -> alternative.

import { RHYTHMS, lightAt, FALLBACK_SUBJECTS, framePhrase, scaleLabel, SCALES } from './vocabulary.js';
import { makeColorArc, colorName, hexToHsl, hueDistance } from './color.js';
import { getStructure, scoreStructures } from './structures.js';
import { pickScale, pickMove, repairScales, repairMoves, linkBetween, scalePool, movePool } from './constraints.js';
import { makeRng } from '../util/rng.js';
import { LIGHT_ARCS } from './vocabulary.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export function parseMaterials(text) {
  const list = String(text || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : [];
}

/** Contesto condiviso fra scoring e generazione. */
export function buildContext(input, seed = 'prisma') {
  const materials = parseMaterials(input.materiali);
  const a = hexToHsl(input.paletteIniziale || '#1b2a4a');
  const b = hexToHsl(input.paletteFinale || '#e8a33d');
  const arc = LIGHT_ARCS.find((l) => l.id === input.lightArc) || LIGHT_ARCS[0];
  return {
    materials,
    hueDelta: hueDistance(a.h, b.h),
    lumaDelta: Math.abs(a.l - b.l),
    lightLabel: arc.label,
    ritmo: input.ritmo || 'respirato',
    rng: makeRng(`${seed}:${input.idea}:${input.paletteIniziale}`),
  };
}

export function proposeStructures(input, seed = 'prisma') {
  const ctx = buildContext(input, seed);
  const scored = scoreStructures(input, ctx);
  return scored.slice(0, 3).map((s) => ({
    id: s.structure.id,
    name: s.structure.name,
    tagline: s.structure.tagline,
    idea: s.structure.idea,
    score: Math.round(s.score * 10) / 10,
    reasons: s.reasons.length
      ? s.reasons.slice(0, 3)
      : ['nessun vincolo forte nei tuoi dati la esclude: resta una lettura possibile del materiale'],
  }));
}

const VARIANT_PREFIX = [
  'Stesso beat da un altro punto di vista: ',
  'Rilancio: ',
  'Eco ravvicinata: ',
  'Contrappunto: ',
];

/** Espande o comprime la beat map per arrivare al numero di shot voluto. */
function fitBeats(beats, target, rng) {
  let list = beats.map((b) => ({ ...b, variant: 0 }));
  let guard = 0;
  while (list.length < target && guard++ < 120) {
    const cands = list
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b.exp)
      .sort((x, y) => x.b.variant - y.b.variant || y.b.w - x.b.w);
    if (!cands.length) break;
    const { b, i } = cands[0];
    const next = list[i + 1] || b;
    const v = b.variant + 1;
    list[i].variant = v;
    list.splice(i + 1, 0, {
      ...b,
      variant: v,
      w: b.w * 0.82,
      i: (b.i + next.i) / 2,
      c: (b.c + next.c) / 2,
      fn: VARIANT_PREFIX[(v - 1) % VARIANT_PREFIX.length] + lower(b.fn),
      echo: undefined,
    });
  }
  // in compressione si tolgono prima le varianti, mai i beat portanti,
  // e mai l'ultimo beat rimasto di un atto (altrimenti l'atto sparisce)
  const removable = (b, k, arr) => {
    if (['svolta', 'chiusura', 'apertura'].includes(b.role)) return false;
    if (arr.filter((x) => x.act === b.act).length <= 1) return false;
    return k > 0 && k < arr.length - 1;
  };
  guard = 0;
  while (list.length > target && guard++ < 120) {
    let idx = list.findIndex((b, k) => b.variant > 0 && removable(b, k, list));
    if (idx < 0) idx = list.findIndex((b, k) => b.exp && removable(b, k, list));
    if (idx < 0) break;
    list.splice(idx, 1);
  }
  return list;
}

/** Durate proporzionali al peso, modulate dal ritmo e riquadrate sulla durata totale. */
function computeDurations(beats, totalDuration, rhythm, rng) {
  const raw = beats.map((b) => b.w * (1 + rng.range(-rhythm.jitter, rhythm.jitter)));
  const avg = totalDuration / beats.length;
  const min = Math.max(0.4, avg * 0.4);
  const max = Math.max(min + 0.3, avg * 2.4);

  let durations = raw.map((r) => r);
  for (let pass = 0; pass < 4; pass++) {
    const sum = durations.reduce((a, b) => a + b, 0);
    durations = durations.map((d) => clamp((d / sum) * totalDuration, min, max));
  }
  // arrotonda a 0.1s e riporta il totale esatto sulla shot piu' lunga
  durations = durations.map((d) => Math.round(d * 10) / 10);
  const drift = Math.round((totalDuration - durations.reduce((a, b) => a + b, 0)) * 10) / 10;
  if (drift !== 0) {
    const idx = durations.indexOf(Math.max(...durations));
    durations[idx] = Math.round((durations[idx] + drift) * 10) / 10;
  }
  return durations;
}

/** Distribuisce i materiali evitando ripetizioni contigue; rispetta le "voci" A/B. */
function assignSubjects(beats, materials, rng) {
  const pool = materials.length ? materials : rng.shuffle(FALLBACK_SUBJECTS).slice(0, 4);
  const out = [];
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    if (b.voice && pool.length >= 2) {
      out.push(b.voice === 'A' ? pool[0] : pool[1]);
      continue;
    }
    if (typeof b.echo === 'number' && out[b.echo]) {
      out.push(out[b.echo]);
      continue;
    }
    const avoid = out[i - 1];
    const cands = pool.filter((m) => m !== avoid);
    out.push((cands.length ? cands : pool)[i % (cands.length ? cands.length : pool.length)]);
  }
  return out;
}

function altPhrase(scale, move, subject, people) {
  return `${framePhrase(scale, subject, people)} — ${move.label.toLowerCase()}`;
}

/**
 * Genera il piano completo.
 * `options.beats` sostituisce la beat map della struttura (usata dal ponte AI:
 * il modello propone i beat, il motore applica comunque durate e vincoli).
 * `options.texts` sovrascrive soggetto e alternativa shot per shot.
 * @returns {{meta:Object, shots:Array, acts:Array}}
 */
export function generatePlan(input, structureId, seed = 'prisma', options = {}) {
  const structure = getStructure(structureId);
  if (!structure) throw new Error(`Struttura sconosciuta: ${structureId}`);

  const ctx = buildContext(input, seed);
  const rng = makeRng(`${seed}:${structureId}:${input.idea}:${input.durata}`);
  const rhythm = RHYTHMS.find((r) => r.id === input.ritmo) || RHYTHMS[1];
  const duration = clamp(Number(input.durata) || 20, 6, 90);
  const people = !!input.persone;

  // 1. densita' (o beat map fornita dall'esterno, gia' validata)
  const target = clamp(Math.round(duration / rhythm.avgShot), 5, 26);
  const beats = Array.isArray(options.beats) && options.beats.length >= 3
    ? options.beats.map((b) => ({ variant: 0, exp: false, ...b }))
    : fitBeats(structure.beats, target, rng);

  // 2. durate
  const durations = computeDurations(beats, duration, rhythm, rng);

  // 3. arco cromatico
  const colorAt = makeColorArc(
    input.paletteIniziale || '#1b2a4a',
    input.paletteFinale || '#e8a33d',
    structure.colorMode,
    !!input.viaggioLungo
  );

  // 4. scale e movimenti + riparazione vincoli
  const slots = beats.map((b) => ({ beat: b, scale: pickScale(b, rng), move: pickMove(b, rng) }));
  repairScales(slots, rng);
  repairMoves(slots, rng);

  // 5. soggetti
  const subjects = assignSubjects(beats, ctx.materials, rng);

  // 6. composizione degli shot
  let t = 0;
  const shots = slots.map((slot, i) => {
    const b = slot.beat;
    const tNorm = beats.length > 1 ? i / (beats.length - 1) : 0;
    const hex = colorAt(b.c, i);
    const scala = { i: slot.scale.i, id: slot.scale.id, family: slot.scale.family, label: scaleLabel(slot.scale, people) };
    const start = t;
    t += durations[i];

    const altScale = rng.pick(scalePool(b).filter((s) => s.family !== slot.scale.family)) || slot.scale;
    const altMove = pickMove(b, rng, [slot.move.id], [slot.move.family]);

    return {
      id: `s${i + 1}`,
      n: i + 1,
      act: b.act,
      role: b.role,
      funzione: b.fn,
      materiale: subjects[i],
      soggetto: framePhrase(slot.scale, subjects[i], people),
      scala,
      movimento: { id: slot.move.id, label: slot.move.label, family: slot.move.family, axis: slot.move.axis, energy: slot.move.energy },
      durata: durations[i],
      start: Math.round(start * 10) / 10,
      luce: lightAt(input.lightArc, tNorm, b.i),
      colore: { hex, nome: colorName(hex) },
      intensita: Math.round(b.i * 100) / 100,
      alternativa: altPhrase({ ...altScale, label: scaleLabel(altScale, people) }, altMove, subjects[i], people),
      fatto: false,
    };
  });

  // 6b. testi forniti dall'esterno: sostituiscono solo la descrizione, mai i vincoli
  if (Array.isArray(options.texts)) {
    const byN = new Map(options.texts.map((t) => [Number(t.n), t]));
    shots.forEach((s) => {
      const t = byN.get(s.n);
      if (!t) return;
      if (t.soggetto) s.soggetto = t.soggetto;
      if (t.alternativa) s.alternativa = t.alternativa;
    });
  }

  // 7. raccordi
  const links = [];
  for (let i = 0; i < shots.length - 1; i++) links.push(linkBetween(shots[i], shots[i + 1], ctx));
  shots.forEach((s, i) => {
    s.linkPrev = i > 0 ? links[i - 1] : { tipo: 'apertura', testo: 'Prima immagine: nessun raccordo in entrata, deve reggere da sola nei primi 0,5 secondi.' };
    s.linkNext = i < links.length ? links[i] : { tipo: 'chiusura', testo: 'Ultima immagine: il raccordo in uscita è con il loop del reel — deve poter rientrare sulla prima.' };
  });

  const acts = [1, 2, 3].map((n) => {
    const inAct = shots.filter((s) => s.act === n);
    return {
      n,
      nome: ['Apertura', 'Trasformazione', 'Chiusura'][n - 1],
      shots: inAct.length,
      durata: Math.round(inAct.reduce((a, s) => a + s.durata, 0) * 10) / 10,
    };
  });

  return {
    meta: {
      struttura: structure.id,
      strutturaNome: structure.name,
      tagline: structure.tagline,
      ideaStruttura: structure.idea,
      durata: Math.round(shots.reduce((a, s) => a + s.durata, 0) * 10) / 10,
      ritmo: rhythm.label,
      ritmoId: rhythm.id,
      nShot: shots.length,
      seed,
      formato: '9:16 verticale',
      creato: new Date().toISOString(),
    },
    shots,
    acts,
  };
}

/**
 * Rigenera un singolo shot mantenendo la sua funzione narrativa, durata e colore:
 * cambia solo COME lo riprendi, mai il PERCHE'.
 */
export function regenerateShot(plan, input, index, nonce = Date.now()) {
  const shots = plan.shots.map((s) => ({ ...s }));
  const shot = shots[index];
  if (!shot) return plan;

  const ctx = buildContext(input, plan.meta.seed);
  const rng = makeRng(`${plan.meta.seed}:regen:${index}:${nonce}`);
  const people = !!input.persone;
  const structure = getStructure(plan.meta.struttura);
  // ritrova il beat originale (anche se lo shot e' una variante espansa)
  const source =
    structure.beats.find((b) => b.fn === shot.funzione) ||
    structure.beats.find((b) => shot.funzione.toLowerCase().endsWith(lower(b.fn).toLowerCase())) ||
    structure.beats.find((b) => b.role === shot.role) || {};
  const beat = { scale: [0, 6], move: 'soft', ...source, i: shot.intensita };

  const prev = shots[index - 1];
  const next = shots[index + 1];
  const avoidScales = [prev?.scala.i, next?.scala.i, shot.scala.i].filter((v) => v != null);
  const avoidMoveIds = [prev?.movimento.id, next?.movimento.id, shot.movimento.id].filter(Boolean);
  const avoidFams = [prev?.movimento.family, next?.movimento.family].filter(Boolean);

  const scale = pickScale(beat, rng, avoidScales);
  const move = pickMove(beat, rng, avoidMoveIds, avoidFams);
  const pool = ctx.materials.length ? ctx.materials : FALLBACK_SUBJECTS;
  const materiale = rng.pick(pool.filter((m) => m !== prev?.materiale && m !== next?.materiale)) || shot.materiale;

  shot.scala = { i: scale.i, id: scale.id, family: scale.family, label: scaleLabel(scale, people) };
  shot.movimento = { id: move.id, label: move.label, family: move.family, axis: move.axis, energy: move.energy };
  shot.materiale = materiale;
  shot.soggetto = framePhrase(scale, materiale, people);
  const altScale = rng.pick(scalePool(beat).filter((s) => s.family !== scale.family)) || scale;
  const altMove = pickMove(beat, rng, [move.id], [move.family]);
  shot.alternativa = altPhrase({ ...altScale, label: scaleLabel(altScale, people) }, altMove, materiale, people);

  // ricalcola i raccordi toccati
  const links = [];
  for (let i = 0; i < shots.length - 1; i++) links.push(linkBetween(shots[i], shots[i + 1], ctx));
  shots.forEach((s, i) => {
    s.linkPrev = i > 0 ? links[i - 1] : s.linkPrev;
    s.linkNext = i < links.length ? links[i] : s.linkNext;
  });

  return { ...plan, shots };
}
