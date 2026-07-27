// Vocabolario di ripresa. Ogni voce porta con se' i metadati che servono
// ai vincoli: famiglia, asse, energia. Sono i "mattoni" che il generatore assembla.

/** Scale, dalla piu' stretta alla piu' larga. L'indice E' la scala. */
export const SCALES = [
  { i: 0, id: 'macro', label: 'Macro / texture', abstract: 'Macro sulla materia', family: 'stretta' },
  { i: 1, id: 'dettaglio', label: 'Dettaglio', abstract: 'Dettaglio isolato', family: 'stretta' },
  { i: 2, id: 'ravvicinato', label: 'Primo piano', abstract: 'Piano ravvicinato', family: 'media' },
  { i: 3, id: 'mezzo', label: 'Mezza figura', abstract: 'Piano medio sulla forma', family: 'media' },
  { i: 4, id: 'campo-medio', label: 'Campo medio', abstract: 'Campo medio', family: 'larga' },
  { i: 5, id: 'campo-lungo', label: 'Campo lungo', abstract: 'Campo lungo', family: 'larga' },
  { i: 6, id: 'totale', label: 'Campo lunghissimo / totale', abstract: 'Totale ambientale', family: 'larga' },
];

export const scaleLabel = (s, people) => (people ? s.label : s.abstract);

/**
 * Movimenti macchina.
 * energy 0..1 = quanta tensione porta il movimento (guida l'aggancio all'intensita' del beat)
 * axis = usato per il match on action fra shot consecutivi
 */
export const MOVES = [
  { id: 'fisso', label: 'Fisso su cavalletto', family: 'statico', axis: 'nessuno', energy: 0.05 },
  { id: 'micro-drift', label: 'Micro-drift a mano', family: 'statico', axis: 'nessuno', energy: 0.18 },
  { id: 'rack-focus', label: 'Rack focus (fuoco che si sposta)', family: 'ottico', axis: 'profondita', energy: 0.3 },
  { id: 'pan-lento', label: 'Panoramica lenta orizzontale', family: 'pan', axis: 'orizzontale', energy: 0.32 },
  { id: 'tilt-lento', label: 'Tilt lento verticale', family: 'pan', axis: 'verticale', energy: 0.34 },
  { id: 'zoom-in', label: 'Zoom ottico lento in avanti', family: 'ottico', axis: 'profondita', energy: 0.4 },
  { id: 'laterale', label: 'Carrello laterale (truck)', family: 'carrello', axis: 'orizzontale', energy: 0.46 },
  { id: 'carrello-avanti', label: 'Carrello in avanti', family: 'carrello', axis: 'profondita', energy: 0.52 },
  { id: 'carrello-indietro', label: 'Carrello indietro (rivelazione)', family: 'carrello', axis: 'profondita', energy: 0.5 },
  { id: 'gimbal', label: 'Gimbal fluido che accompagna', family: 'carrello', axis: 'libero', energy: 0.56 },
  { id: 'orbita', label: 'Orbita attorno al soggetto', family: 'carrello', axis: 'libero', energy: 0.64 },
  { id: 'tilt-rapido', label: 'Tilt rapido verso l’alto', family: 'pan', axis: 'verticale', energy: 0.72 },
  { id: 'handheld', label: 'A mano nervosa, ravvicinata', family: 'handheld', axis: 'libero', energy: 0.82 },
  { id: 'whip-pan', label: 'Whip pan', family: 'pan', axis: 'orizzontale', energy: 0.95 },
];

/** Bande di energia richiamate dai beat. */
export const MOVE_BANDS = {
  static: [0, 0.25],
  soft: [0.18, 0.5],
  dynamic: [0.42, 0.72],
  peak: [0.62, 1],
};

export const RHYTHMS = [
  { id: 'contemplativo', label: 'Contemplativo', avgShot: 3.4, jitter: 0.22, note: 'stacchi rari, il tempo si dilata' },
  { id: 'respirato', label: 'Respirato', avgShot: 2.3, jitter: 0.3, note: 'respiro naturale, alternanza lunga/corta' },
  { id: 'pulsato', label: 'Pulsato', avgShot: 1.4, jitter: 0.35, note: 'stacchi sul beat, energia costante' },
  { id: 'serrato', label: 'Serrato', avgShot: 0.85, jitter: 0.3, note: 'montaggio fitto, quasi percussivo' },
  { id: 'sincopato', label: 'Sincopato', avgShot: 1.6, jitter: 0.75, note: 'durate molto diseguali, spiazzante' },
];

export const LIGHT_ARCS = [
  {
    id: 'ombra-luce', label: 'Dall’ombra alla luce',
    stages: [
      'Penombra, sorgente fuori campo',
      'Fascio radente che entra nel quadro',
      'Luce che invade e apre le ombre',
      'Luce piena, ombre residue morbide',
    ],
  },
  {
    id: 'luce-ombra', label: 'Dalla luce all’ombra',
    stages: [
      'Luce piena e aperta',
      'Prime ombre che mordono il quadro',
      'Contrasto che si chiude',
      'Solo un residuo di luce nel buio',
    ],
  },
  {
    id: 'diffusa-dura', label: 'Da diffusa a dura',
    stages: [
      'Luce diffusa, nessuna ombra netta',
      'Compare una direzione',
      'Ombre disegnate, bordi netti',
      'Taglio duro, alto contrasto',
    ],
  },
  {
    id: 'dura-diffusa', label: 'Da dura a diffusa',
    stages: [
      'Taglio duro, ombre incise',
      'Il contrasto si ammorbidisce',
      'Luce che avvolge',
      'Diffusione totale, materia senza ombra',
    ],
  },
  {
    id: 'controluce', label: 'Controluce crescente',
    stages: [
      'Luce frontale neutra',
      'La sorgente scivola dietro il soggetto',
      'Silhouette e bordo incendiato',
      'Controluce pieno, flare in campo',
    ],
  },
  {
    id: 'costante-cromatica', label: 'Luce costante, colore che muta',
    stages: [
      'Intensità stabile, dominante fredda',
      'La dominante slitta',
      'Il colore vira senza cambio di intensità',
      'Nuova dominante, stessa quantità di luce',
    ],
  },
  {
    id: 'golden', label: 'Ora dorata in caduta',
    stages: [
      'Sole alto, luce ancora bianca',
      'Ambra radente sulle superfici',
      'Ultimo raggio, ombre lunghissime',
      'Blu hour, luce residua nel cielo',
    ],
  },
  {
    id: 'artificiale', label: 'Notturna artificiale / pulsata',
    stages: [
      'Buio con una sola sorgente pratica',
      'Seconda sorgente di colore opposto',
      'Pulsazione, intermittenza',
      'Sature artificiali, nessuna luce naturale',
    ],
  },
];

/**
 * Luci che NON evolvono. Non sono un ripiego: tenere la luce identica per tutto
 * il reel e' una scelta, e sposta il peso della narrazione su scala e ritmo.
 */
export const LIGHT_FIXED = [
  { id: 'fissa-diffusa', label: 'Costante — diffusa e morbida', text: 'Luce diffusa costante, nessuna ombra netta, stessa quantità dall’inizio alla fine' },
  { id: 'fissa-dura', label: 'Costante — dura e direzionale', text: 'Taglio duro costante, ombre incise sempre nella stessa direzione' },
  { id: 'fissa-controluce', label: 'Costante — controluce', text: 'Controluce fisso: bordi accesi e corpo in ombra, identico per tutto il reel' },
  { id: 'fissa-penombra', label: 'Costante — penombra', text: 'Penombra costante, una sola sorgente bassa fuori campo' },
  { id: 'fissa-piena', label: 'Costante — piena e neutra', text: 'Luce piena e neutra, costante: dalla luce non arriva nessuna drammatizzazione' },
  { id: 'fissa-artificiale', label: 'Costante — artificiale notturna', text: 'Sorgenti artificiali fisse, stessa temperatura e stessa posizione per tutto il reel' },
];

/** Risolve un id di luce, fissa o in evoluzione. Ritorna sempre qualcosa. */
export function getLight(arcId) {
  const fixed = LIGHT_FIXED.find((l) => l.id === arcId);
  if (fixed) return { ...fixed, fixed: true };
  const arc = LIGHT_ARCS.find((a) => a.id === arcId) || LIGHT_ARCS[0];
  return { ...arc, fixed: false };
}

export function lightAt(arcId, t, intensity) {
  const light = getLight(arcId);
  // luce costante: nessun modificatore, restare identici e' proprio il punto
  if (light.fixed) return light.text;
  const idx = Math.min(light.stages.length - 1, Math.floor(t * light.stages.length));
  const mod = intensity > 0.8 ? ' — punto di massima esposizione'
    : intensity < 0.25 ? ' — tenuta bassa, poca informazione' : '';
  return light.stages[idx] + mod;
}

/** Materiali di ripiego quando l'utente non elenca nulla di concreto. */
export const FALLBACK_SUBJECTS = [
  'la superficie riflettente', 'il vapore che sale', 'la texture ruvida',
  'la goccia sospesa', 'il tessuto in movimento', 'la crepa nella materia',
  'la polvere in controluce', 'il vetro rigato', 'l’ombra proiettata',
];

/** Costruisce la descrizione di soggetto in base alla scala. */
export function framePhrase(scale, subject, people) {
  const s = scale.i;
  if (s <= 0) return `Macro su ${subject}: solo texture, nessun riferimento di scala`;
  if (s === 1) return `Dettaglio isolato di ${subject}, resto fuori fuoco`;
  if (s === 2) return people ? `Primo piano, ${subject} in campo` : `Piano ravvicinato su ${subject}`;
  if (s === 3) return people ? `Mezza figura, ${subject} nel gesto` : `Piano medio: ${subject} e il suo intorno immediato`;
  if (s === 4) return `Campo medio: ${subject} dentro il contesto`;
  if (s === 5) return `Campo lungo: ${subject} piccolo nello spazio`;
  return `Totale: lo spazio intero, ${subject} come accento`;
}
