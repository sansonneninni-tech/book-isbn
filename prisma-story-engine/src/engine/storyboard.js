// Testi pronti da incollare in Google Flow (o in qualsiasi generatore di
// storyboard che chieda concept, personaggi, descrizione shot, descrizione visual).
//
// Regola: qui non si inventa niente che il piano non abbia gia' detto. La
// coerenza fra reel e storyboard sta nel fatto che tutte e due partono
// dagli stessi dati; se il piano viene rigenerato, questi testi si rifanno
// da capo. Cosi' un montaggio di sketch non litiga mai col piano di ripresa.

import { getLight, RHYTHMS } from './vocabulary.js';
import { paletteEnds, colorName } from './color.js';

const trim = (s) => String(s || '').trim();
const first = (s) => (trim(s) ? trim(s) : null);
const join = (parts) => parts.filter(Boolean).join(' ');

/** Riassume la palette in una frase: entra sia nel concept sia nel visual. */
function paletteText(input) {
  const p = paletteEnds(input);
  if (p.flat) {
    return `palette omogenea, tutto il reel resta su ${colorName(p.base)} (${p.base}), variazioni solo di luminosita' e saturazione`;
  }
  return `palette che viaggia da ${colorName(p.from)} (${p.from}) a ${colorName(p.to)} (${p.to})`;
}

function lightText(input) {
  const light = getLight(input.lightArc);
  return light.fixed
    ? `luce costante: ${light.text.toLowerCase()}`
    : `luce che evolve — ${light.label.toLowerCase()}`;
}

/**
 * Testo per il campo "concept generale" dello storyboard.
 * Vale per tutte le inquadrature del reel: descrive il progetto, non un momento.
 */
export function buildConcept(input, plan) {
  const rhythm = RHYTHMS.find((r) => r.id === input.ritmo) || RHYTHMS[1];
  const modo = plan.meta.modalita === 'indipendente'
    ? 'Le inquadrature sono pensate come immagini autonome, che in montaggio possono essere ordinate liberamente.'
    : 'Le inquadrature sono pensate come una sequenza continua, con raccordi espliciti fra un taglio e il successivo.';

  const righe = [
    input.titolo ? `Reel verticale 9:16 intitolato "${input.titolo}", durata ${plan.meta.durata}s.` : `Reel verticale 9:16, durata ${plan.meta.durata}s.`,
    first(input.idea) && `Idea: ${trim(input.idea)}.`,
    (input.emozioneIniziale || input.emozioneFinale)
      && `L'atmosfera parte da "${input.emozioneIniziale || 'non specificata'}" e arriva a "${input.emozioneFinale || 'non specificata'}".`,
    `Struttura narrativa: ${plan.meta.strutturaNome} — ${plan.meta.tagline}`,
    `Registro visivo: ${paletteText(input)}; ${lightText(input)}; ritmo ${rhythm.label.toLowerCase()}.`,
    input.persone
      ? 'In campo compaiono figure umane.'
      : 'Nessuna figura umana in campo: il reel e\' astratto, non nominare mai persone, mani, volti o corpi.',
    first(input.movente) && `Perche' esiste questo lavoro: ${trim(input.movente)}.`,
    first(input.lascito) && `Cosa deve restare a chi guarda: ${trim(input.lascito)}.`,
    first(input.rifiuto) && `E' vietato tutto cio' che ricade in: ${trim(input.rifiuto)}.`,
    modo,
  ].filter(Boolean);

  return righe.join('\n');
}

/**
 * Testo per il campo "descrizione personaggi / soggetti ricorrenti".
 * Con figure umane e' una descrizione di persona; senza, e' l'elenco dei
 * materiali che tornano nelle inquadrature — che e' esattamente quello che
 * tiene coerenti gli sketch nei generatori di storyboard.
 */
export function buildCharacters(input, plan) {
  const materiali = String(input.materiali || '')
    .split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  const ricorrenti = Array.from(new Set(plan.shots.map((s) => s.materiale))).filter(Boolean);

  if (input.persone) {
    const base = materiali.length
      ? `Una figura umana ricorrente in relazione con i materiali del reel (${materiali.join(', ')}).`
      : 'Una figura umana ricorrente, mantenerne l\'aspetto identico in ogni inquadratura.';
    return join([
      base,
      'Nessun dettaglio del viso e\' stato specificato: mantieni la stessa persona per continuita\', senza aggiungere identita\' non richieste.',
      first(input.rifiuto) && `Evitare, per la resa della figura: ${trim(input.rifiuto)}.`,
    ]);
  }

  const elenco = (materiali.length ? materiali : ricorrenti);
  const testa = elenco.length
    ? `Soggetti ricorrenti del reel: ${elenco.join(', ')}. Devono restare visivamente coerenti da un'inquadratura all'altra (stesso materiale, stessa qualita' di superficie, stessa scala di dettaglio).`
    : 'Il reel e\' interamente astratto e non ha soggetti nominabili. Mantieni una coerenza di texture e materia fra le inquadrature.';

  return join([
    'Nessuna figura umana in campo. Non introdurre mai persone, mani, volti, corpi, ombre di persone.',
    testa,
    `Coerenza cromatica: ${paletteText(input)}.`,
  ]);
}

// ---------------------------------------------------------------------------
// Testi per la singola inquadratura
// ---------------------------------------------------------------------------

/**
 * "Cosa succede nell'inquadratura", campo narrativo dello storyboard.
 * Volutamente senza gergo di ripresa (piano, movimento, luce): quelli stanno
 * nell'altro campo, e sovrapporli confonde il generatore di sketch.
 */
export function buildShotDescription(shot, plan) {
  const totale = plan.shots.length;
  const modoInd = plan.meta.modalita === 'indipendente';
  const linkPrev = shot.n > 1 && !modoInd
    ? `Arriva dopo un'inquadratura tenuta insieme da ${shot.linkPrev.tipo}.`
    : null;

  return join([
    `Inquadratura ${shot.n} di ${totale} — atto ${shot.act}, ruolo "${shot.role}".`,
    `Funzione narrativa: ${shot.funzione}.`,
    `Cosa succede: ${shot.soggetto}.`,
    linkPrev,
    `Se sul posto questa versione non funziona, alternativa: ${shot.alternativa}.`,
  ]);
}

/**
 * "Come e' ripresa l'inquadratura", campo tecnico dello storyboard: scala,
 * punto di vista, movimento, luce, colore. Google Flow (e simili) usano
 * questa distinzione per capire come disegnare il fotogramma.
 */
export function buildShotVisual(shot, plan) {
  const modoInd = plan.meta.modalita === 'indipendente';
  const raccordo = shot.n > 1 && !modoInd
    ? `Raccordo con l'inquadratura precedente basato su ${shot.linkPrev.tipo}: ${shot.linkPrev.testo.toLowerCase()}`
    : (modoInd ? 'Inquadratura autonoma: non c\'e\' nessun raccordo da rispettare con quello che viene prima o dopo.' : null);

  return join([
    `Formato 9:16 verticale.`,
    `Scala: ${shot.scala.label.toLowerCase()}.`,
    `Movimento macchina: ${shot.movimento.label.toLowerCase()}` + (shot.movimento.axis && shot.movimento.axis !== 'nessuno' ? ` (asse ${shot.movimento.axis})` : '') + '.',
    `Luce: ${shot.luce.toLowerCase()}.`,
    `Colore dominante: ${shot.colore.nome} (${shot.colore.hex}).`,
    `Intensita' narrativa del momento: ${Math.round(shot.intensita * 100)} su 100.`,
    raccordo,
  ]);
}

/**
 * Attacca i quattro testi al piano: concept e personaggi al meta, descShot
 * e descVisual dentro ogni shot. Da qui in poi possono essere copiati con un
 * click e non serve rigenerarli manualmente: quando cambia lo shot, il testo
 * viene ricostruito.
 */
export function attachStoryboard(plan, input) {
  plan.meta.storyboard = {
    conceptGenerale: buildConcept(input, plan),
    descrizionePersonaggi: buildCharacters(input, plan),
  };
  plan.shots.forEach((s) => {
    s.storyboard = {
      descShot: buildShotDescription(s, plan),
      descVisual: buildShotVisual(s, plan),
    };
  });
  return plan;
}

/** Ricostruisce solo lo storyboard della singola inquadratura, dopo una rigenerazione. */
export function refreshShotStoryboard(plan, index) {
  const s = plan.shots[index];
  if (!s) return plan;
  s.storyboard = {
    descShot: buildShotDescription(s, plan),
    descVisual: buildShotVisual(s, plan),
  };
  return plan;
}
