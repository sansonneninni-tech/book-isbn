// Le sei strutture narrative, come beat map.
// Ogni beat: fn (funzione narrativa concreta), act (atto), w (peso di durata),
// i (intensita' 0..1), c (posizione sull'arco cromatico 0..1),
// scale [min,max] indice, move (banda di energia), exp (espandibile), role, echo (richiamo).

export const STRUCTURES = [
  {
    id: 'ciclo',
    name: 'Ciclo',
    tagline: 'Si torna al punto di partenza, ma niente è più uguale.',
    colorMode: 'return',
    idea: 'La forma si chiude su se stessa: l’ultima inquadratura rima con la prima, alterata da tutto quello che è successo in mezzo.',
    beats: [
      { fn: 'Stabilire lo stato di quiete e la sua regola', act: 1, w: 1.3, i: 0.18, c: 0, scale: [4, 6], move: 'static', role: 'apertura' },
      { fn: 'Isolare il dettaglio che porta il seme del cambiamento', act: 1, w: 0.8, i: 0.3, c: 0.15, scale: [0, 1], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Prima variazione: la regola comincia a piegarsi', act: 2, w: 1, i: 0.45, c: 0.35, scale: [2, 3], move: 'soft', exp: true, role: 'trasformazione' },
      { fn: 'La variazione si propaga a tutto il quadro', act: 2, w: 1, i: 0.62, c: 0.55, scale: [1, 3], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Punto di svolta: il ciclo tocca il suo estremo', act: 2, w: 1.1, i: 0.95, c: 1, scale: [0, 2], move: 'peak', role: 'svolta' },
      { fn: 'Dispersione: l’energia si scarica', act: 3, w: 1, i: 0.58, c: 0.72, scale: [3, 5], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Ritorno: la forma iniziale si ricompone', act: 3, w: 1, i: 0.34, c: 0.35, scale: [4, 6], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Chiusura: la stessa immagine dell’apertura, alterata', act: 3, w: 1.4, i: 0.2, c: 0.06, scale: [4, 6], move: 'static', role: 'chiusura', echo: 0 },
    ],
  },
  {
    id: 'crescendo',
    name: 'Crescendo',
    tagline: 'Un solo gesto che si accumula fino a non poter più crescere.',
    colorMode: 'linear',
    idea: 'Ogni inquadratura aggiunge energia alla precedente. Una sospensione prima del picco impedisce che diventi rumore.',
    beats: [
      { fn: 'Apertura minima: un solo elemento, quasi niente', act: 1, w: 1, i: 0.1, c: 0, scale: [0, 1], move: 'static', role: 'apertura' },
      { fn: 'Primo segnale: qualcosa si mette in moto', act: 1, w: 0.85, i: 0.22, c: 0.12, scale: [2, 3], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Ripetizione con incremento: la stessa cosa, di più', act: 2, w: 0.9, i: 0.36, c: 0.28, scale: [1, 2], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Moltiplicazione: da uno a molti', act: 2, w: 0.9, i: 0.52, c: 0.44, scale: [3, 5], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Accelerazione: le durate si accorciano da sole', act: 2, w: 0.75, i: 0.7, c: 0.58, scale: [1, 3], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Sospensione: il respiro trattenuto prima del picco', act: 2, w: 1.15, i: 0.42, c: 0.7, scale: [5, 6], move: 'static', role: 'svolta' },
      { fn: 'Climax: tutto insieme, massima densità', act: 3, w: 1.1, i: 1, c: 0.88, scale: [0, 2], move: 'peak', role: 'svolta' },
      { fn: 'Chiusura in eco: quello che resta dopo il picco', act: 3, w: 1.35, i: 0.42, c: 1, scale: [4, 6], move: 'soft', role: 'chiusura' },
    ],
  },
  {
    id: 'rivelazione',
    name: 'Rivelazione',
    tagline: 'Tutto è costruito per ritardare una sola immagine.',
    colorMode: 'linear',
    idea: 'Il montaggio nega allo spettatore ciò che vuole vedere, finché negarlo non è più sostenibile. Il valore del finale è tutto nell’attesa.',
    beats: [
      { fn: 'Nascondere: mostrare tutto tranne l’essenziale', act: 1, w: 1.2, i: 0.2, c: 0, scale: [0, 1], move: 'static', role: 'apertura' },
      { fn: 'Primo indizio parziale, illeggibile', act: 1, w: 0.85, i: 0.28, c: 0.12, scale: [1, 2], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Negazione: lo sguardo viene deviato altrove', act: 2, w: 0.9, i: 0.3, c: 0.24, scale: [2, 4], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Avvicinamento: la distanza si accorcia', act: 2, w: 0.9, i: 0.5, c: 0.4, scale: [1, 3], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Soglia: un istante prima di vedere', act: 2, w: 1.1, i: 0.38, c: 0.52, scale: [0, 1], move: 'static', role: 'svolta' },
      { fn: 'Svelamento: l’immagine appare intera', act: 3, w: 1.3, i: 1, c: 0.76, scale: [4, 6], move: 'peak', role: 'svolta' },
      { fn: 'Conseguenza: il mondo riletto alla luce di ciò che sappiamo', act: 3, w: 0.9, i: 0.6, c: 0.9, scale: [2, 4], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Chiusura: quiete informata', act: 3, w: 1.2, i: 0.28, c: 1, scale: [3, 5], move: 'soft', role: 'chiusura' },
    ],
  },
  {
    id: 'metamorfosi',
    name: 'Metamorfosi',
    tagline: 'Una materia diventa un’altra, e non si può tornare indietro.',
    colorMode: 'linear',
    idea: 'Lo stato A e lo stato B sono entrambi mostrati come completi. Il centro del reel è lo stato ibrido, dove convivono.',
    beats: [
      { fn: 'Stato A nella sua forma piena', act: 1, w: 1.25, i: 0.2, c: 0, scale: [3, 5], move: 'static', role: 'apertura' },
      { fn: 'La texture dello stato A, da vicino', act: 1, w: 0.8, i: 0.3, c: 0.08, scale: [0, 1], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Pressione: una forza esterna agisce sulla materia', act: 2, w: 0.9, i: 0.46, c: 0.25, scale: [2, 3], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Prima crepa: la trasformazione diventa visibile', act: 2, w: 0.95, i: 0.6, c: 0.42, scale: [0, 2], move: 'soft', exp: true, role: 'trasformazione' },
      { fn: 'Stato ibrido: A e B coesistono nello stesso quadro', act: 2, w: 1, i: 0.76, c: 0.55, scale: [1, 3], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Soglia: il punto di non ritorno', act: 2, w: 1.05, i: 0.95, c: 0.7, scale: [0, 2], move: 'peak', role: 'svolta' },
      { fn: 'Stato B nascente, ancora instabile', act: 3, w: 0.95, i: 0.54, c: 0.86, scale: [2, 4], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Stato B pieno: la nuova regola del mondo', act: 3, w: 1.35, i: 0.28, c: 1, scale: [4, 6], move: 'static', role: 'chiusura' },
    ],
  },
  {
    id: 'chiamata-risposta',
    name: 'Chiamata-risposta',
    tagline: 'Due voci visive che si rincorrono finché diventano una.',
    colorMode: 'alternate',
    idea: 'Due materiali, due colori o due registri si alternano. Il montaggio è un dialogo: le due voci si avvicinano fino a collidere.',
    beats: [
      { fn: 'Chiamata: la prima voce si presenta', act: 1, w: 1.1, i: 0.3, c: 0, scale: [1, 2], move: 'soft', role: 'apertura', voice: 'A' },
      { fn: 'Risposta: la seconda voce, registro opposto', act: 1, w: 1.1, i: 0.36, c: 0.1, scale: [4, 5], move: 'soft', role: 'apertura', voice: 'B' },
      { fn: 'Chiamata più insistente, più vicina', act: 2, w: 0.85, i: 0.5, c: 0.28, scale: [0, 1], move: 'dynamic', exp: true, role: 'sviluppo', voice: 'A' },
      { fn: 'Risposta che cede terreno', act: 2, w: 0.85, i: 0.55, c: 0.4, scale: [3, 4], move: 'dynamic', exp: true, role: 'sviluppo', voice: 'B' },
      { fn: 'Le due voci si sovrappongono nel tempo', act: 2, w: 0.9, i: 0.75, c: 0.6, scale: [2, 3], move: 'dynamic', exp: true, role: 'trasformazione', voice: 'A' },
      { fn: 'Collisione: entrambe nello stesso quadro', act: 3, w: 1.15, i: 1, c: 0.78, scale: [0, 2], move: 'peak', role: 'svolta', voice: 'B' },
      { fn: 'Fusione: nasce una terza cosa', act: 3, w: 1.1, i: 0.5, c: 0.92, scale: [4, 6], move: 'soft', role: 'trasformazione', voice: 'A' },
      { fn: 'Coda: la nuova voce da sola', act: 3, w: 1.25, i: 0.24, c: 1, scale: [2, 4], move: 'static', role: 'chiusura', voice: 'B' },
    ],
  },
  {
    id: 'frammento-intero',
    name: 'Frammento → intero',
    tagline: 'Pezzi illeggibili che a un certo punto compongono una cosa sola.',
    colorMode: 'linear',
    idea: 'Si parte da dettagli senza contesto. Lo spettatore prova a ricomporre; il reel gli concede l’insieme solo alla fine.',
    beats: [
      { fn: 'Frammento illeggibile: nessun riferimento di scala', act: 1, w: 0.9, i: 0.3, c: 0, scale: [0, 0], move: 'static', role: 'apertura' },
      { fn: 'Secondo frammento: altro angolo, stessa materia', act: 1, w: 0.8, i: 0.35, c: 0.12, scale: [0, 1], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Terzo frammento: comincia a emergere una regola', act: 1, w: 0.8, i: 0.42, c: 0.24, scale: [1, 1], move: 'soft', exp: true, role: 'sviluppo' },
      { fn: 'Accostamento: due frammenti si parlano nel taglio', act: 2, w: 0.85, i: 0.55, c: 0.4, scale: [1, 2], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Connessione: la logica dell’insieme si intuisce', act: 2, w: 0.95, i: 0.7, c: 0.58, scale: [2, 3], move: 'dynamic', exp: true, role: 'trasformazione' },
      { fn: 'Allargamento: il quadro si apre di colpo', act: 3, w: 1.1, i: 0.92, c: 0.78, scale: [4, 5], move: 'peak', role: 'svolta' },
      { fn: 'Intero: l’insieme finalmente leggibile', act: 3, w: 1.25, i: 0.58, c: 0.92, scale: [6, 6], move: 'soft', role: 'sviluppo' },
      { fn: 'Chiusura: ritorno a un frammento, adesso comprensibile', act: 3, w: 1.15, i: 0.28, c: 1, scale: [0, 1], move: 'static', role: 'chiusura', echo: 0 },
    ],
  },
];

export const getStructure = (id) => STRUCTURES.find((s) => s.id === id);

// ---------------------------------------------------------------------------
// Affinita': perche' questa struttura funziona con QUESTA idea.
// ---------------------------------------------------------------------------

const EMOTION_ENERGY = {
  quiete: 0.1, calma: 0.12, silenzio: 0.1, sospensione: 0.3, attesa: 0.35,
  malinconia: 0.25, nostalgia: 0.25, dolcezza: 0.2, intimita: 0.22,
  meraviglia: 0.6, stupore: 0.65, curiosita: 0.45, desiderio: 0.55,
  inquietudine: 0.6, tensione: 0.7, ansia: 0.72, urgenza: 0.8, rabbia: 0.85,
  euforia: 0.9, gioia: 0.75, liberazione: 0.8, esplosione: 0.95,
  smarrimento: 0.5, vertigine: 0.7, rinascita: 0.55, pace: 0.15, sollievo: 0.3,
};

const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function emotionEnergy(text) {
  const t = normalize(text);
  if (!t) return 0.5;
  for (const [k, v] of Object.entries(EMOTION_ENERGY)) {
    if (t.includes(k)) return v;
  }
  return 0.5;
}

const KEYWORDS = {
  rivelazione: ['nascost', 'svela', 'scopr', 'segreto', 'dentro', 'oltre', 'apparire', 'rivela', 'attesa', 'invisibil'],
  metamorfosi: ['trasform', 'divent', 'cambia', 'fonde', 'scioglie', 'brucia', 'cresce', 'muta', 'decompo', 'ghiacc'],
  ciclo: ['ritorn', 'ciclo', 'ripet', 'stagion', 'respir', 'onda', 'giorno', 'loop', 'eterno'],
  crescendo: ['accumul', 'esplo', 'sale', 'cresce', 'accelera', 'piu e piu', 'travolg', 'caos'],
  'chiamata-risposta': ['due', 'dialogo', 'contrasto', 'opposti', 'incontro', 'scontro', 'coppia', 'specchio'],
  'frammento-intero': ['framment', 'pezzi', 'dettagli', 'mosaico', 'compor', 'insieme', 'puzzle', 'rovesc'],
};

/**
 * Punteggia tutte le strutture rispetto all'input del wizard.
 * Ritorna l'elenco ordinato con motivazioni testuali che citano i dati inseriti.
 */
export function scoreStructures(input, ctx) {
  const {
    idea = '', emozioneIniziale = '', emozioneFinale = '', ritmo = 'respirato',
    durata = 20, persone = false, lightArc = 'ombra-luce',
    movente = '', lascito = '',
  } = input;

  const materials = ctx.materials;
  const e0 = emotionEnergy(emozioneIniziale);
  const e1 = emotionEnergy(emozioneFinale);
  const de = e1 - e0;
  const hueDelta = ctx.hueDelta;
  const lumaDelta = ctx.lumaDelta;
  const flat = !!ctx.paletteFlat;
  const lightFixed = !!ctx.lightFixed;
  // anche le risposte iniziali pesano: sono quelle in cui l'autore dice la cosa vera
  const ideaN = normalize(`${idea} ${movente} ${lascito}`);

  const out = STRUCTURES.map((s) => {
    let score = 1;
    const reasons = [];
    const add = (pts, reason) => { score += pts; if (reason) reasons.push(reason); };

    // parole chiave nell'idea: il segnale piu' forte
    const kws = KEYWORDS[s.id] || [];
    const hit = kws.find((k) => ideaN.includes(k));
    if (hit) add(2.2, `nella tua idea compare “${hit}…”, che è esattamente il motore di questa struttura`);

    switch (s.id) {
      case 'ciclo':
        if (Math.abs(de) < 0.2) add(2.4, `parti da “${emozioneIniziale || 'quiete'}” e arrivi a “${emozioneFinale || 'quiete'}”: energie vicine, e il Ciclo vive proprio del ritorno`);
        else add(-1.2);
        if (['contemplativo', 'respirato'].includes(ritmo)) add(1.5, `il ritmo ${ritmo} lascia respirare la rima fra prima e ultima inquadratura`);
        if (durata <= 20) add(0.9, `su ${durata}s la chiusura circolare si riconosce ancora a memoria`);
        if (lightArc === 'costante-cromatica') add(0.8, 'la luce costante rende leggibile che a cambiare è solo il colore');
        if (flat) add(1.5, 'con una palette omogenea non c’è un colore d’arrivo che segni la fine: il ritorno del Ciclo dà comunque una chiusura riconoscibile');
        break;
      case 'crescendo':
        if (de > 0.22) add(2.6, `l’energia sale da “${emozioneIniziale}” a “${emozioneFinale}”: è letteralmente la curva del Crescendo`);
        else if (de < -0.1) add(-1.6);
        if (['pulsato', 'serrato'].includes(ritmo)) add(1.8, `il ritmo ${ritmo} regge l’accumulo senza sfilacciarsi`);
        if (durata >= 20) add(0.9, `${durata}s bastano a costruire l’accumulo e a permettersi la sospensione prima del picco`);
        if (flat || lightFixed) add(1.2, 'colore e luce restano fermi: qui la progressione la fanno densità e durate, ed è esattamente il motore del Crescendo');
        break;
      case 'rivelazione':
        if (materials.length <= 2) add(1.9, `hai pochi soggetti (${materials.slice(0, 2).join(', ') || 'uno solo'}): perfetto, la Rivelazione ne ritarda uno solo`);
        if (['ombra-luce', 'controluce', 'fissa-controluce', 'fissa-penombra'].includes(lightArc)) add(1.5, `la luce “${ctx.lightLabel}” fa già metà del lavoro di occultamento`);
        if (!persone) add(0.8, 'senza figure umane l’attenzione resta sull’oggetto negato');
        if (de > 0.15) add(0.7, 'la salita emotiva coincide con il momento dello svelamento');
        break;
      case 'metamorfosi':
        if (flat) add(-1.8, null);
        else if (hueDelta > 60 || lumaDelta > 25) add(2.5, `fra palette iniziale e finale ci sono ${Math.round(hueDelta)}° di tinta: uno scarto così va raccontato come trasformazione, non come stacco`);
        else add(-0.8);
        if (flat && lightFixed) add(-1.2, null);
        if (['dura-diffusa', 'diffusa-dura', 'golden'].includes(lightArc)) add(1.2, `anche la luce cambia qualità (${ctx.lightLabel}), rinforzando il passaggio di stato`);
        if (durata >= 15) add(0.6, 'c’è spazio per mostrare lo stato ibrido, che è il vero centro della struttura');
        break;
      case 'chiamata-risposta':
        if (materials.length >= 2) add(2.4, `hai indicato più materiali (${materials.slice(0, 2).join(' e ')}): diventano le due voci del dialogo`);
        else add(-1.4);
        if (hueDelta > 100 && !flat) add(1.6, `${Math.round(hueDelta)}° fra i due colori: sono già due poli opposti sulla ruota`);
        if (flat) add(0.6, 'palette omogenea: le due voci si distinguono per materia e scala invece che per colore, e il dialogo resta più severo');
        if (['pulsato', 'sincopato'].includes(ritmo)) add(1.2, `il ritmo ${ritmo} scandisce naturalmente il botta e risposta`);
        break;
      case 'frammento-intero':
        if (materials.length >= 3) add(2.4, `${materials.length} materiali diversi: abbastanza frammenti perché la ricomposizione finale sorprenda`);
        if (ritmo === 'serrato' || ritmo === 'pulsato') add(1.3, `il ritmo ${ritmo} fa passare i frammenti prima che il cervello li decifri`);
        if (!persone) add(0.8, 'l’assenza di figure toglie il riferimento di scala: i frammenti restano illeggibili più a lungo');
        if (de > 0) add(0.6, 'la scoperta dell’insieme coincide con la salita emotiva che hai descritto');
        if (lightFixed) add(0.9, 'con la luce costante i frammenti sembrano davvero pezzi della stessa cosa: è il presupposto della ricomposizione finale');
        break;
    }

    // tiebreak deterministico, per non avere sempre lo stesso ordine a parità
    score += ctx.rng.next() * 0.4;
    return { structure: s, score, reasons };
  });

  return out.sort((a, b) => b.score - a.score);
}
