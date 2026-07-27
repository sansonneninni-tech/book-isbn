// Diagnostica narrativa: cerca ripetizioni, buchi, finale debole, progressione piatta.
// Non "corregge": segnala, perche' la scelta finale resta tua.

import { hexToHsl, hueDistance, dalColore, alColore } from './color.js';

const pct = (v) => `${Math.round(v * 100)}%`;

function stdev(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
}

export function analyze(plan) {
  const { shots, acts, meta } = plan;
  const out = [];
  const push = (level, title, msg, refs = []) => out.push({ level, title, msg, refs });

  if (!shots.length) return [{ level: 'error', title: 'Piano vuoto', msg: 'Nessuna inquadratura generata.', refs: [] }];

  const intens = shots.map((s) => s.intensita);
  const durs = shots.map((s) => s.durata);
  const peak = Math.max(...intens);
  const peakIdx = intens.indexOf(peak);
  const total = meta.durata;

  // --- ripetizioni -----------------------------------------------------------
  const scaleRep = [];
  const moveRep = [];
  for (let i = 1; i < shots.length; i++) {
    if (shots[i].scala.i === shots[i - 1].scala.i) scaleRep.push(shots[i].n);
    if (shots[i].movimento.family === shots[i - 1].movimento.family) moveRep.push(shots[i].n);
  }
  if (scaleRep.length) push('error', 'Scale ripetute', `Stessa scala su inquadrature consecutive (shot ${scaleRep.join(', ')}). Rigenerale: due piani identici di fila leggono come un errore di montaggio, non come una scelta.`, scaleRep);
  if (moveRep.length) push('warn', 'Movimenti della stessa famiglia', `Shot ${moveRep.join(', ')} ripetono il tipo di movimento del precedente. Alterna almeno uno statico fra due movimenti simili.`, moveRep);

  const distinctScales = new Set(shots.map((s) => s.scala.i)).size;
  if (distinctScales < 4) push('warn', 'Poca varietà di scale', `Solo ${distinctScales} scale diverse su ${shots.length} inquadrature. Aggiungi almeno un macro e un totale: il salto di scala è quello che tiene sveglio lo spettatore.`);
  else push('ok', 'Varietà di scale', `${distinctScales} scale diverse: la lettura ha respiro.`);

  const distinctMoves = new Set(shots.map((s) => s.movimento.id)).size;
  if (distinctMoves < 3) push('warn', 'Movimenti poco vari', `Solo ${distinctMoves} movimenti macchina diversi. Rischi che il reel sembri girato in un unico modo.`);

  // --- progressione ----------------------------------------------------------
  const range = peak - Math.min(...intens);
  if (range < 0.4) push('warn', 'Progressione piatta', `L’intensità varia solo del ${pct(range)}: non c’è né salita né caduta. Serve almeno un picco riconoscibile e una discesa dopo.`);
  else push('ok', 'Arco di intensità', `Escursione del ${pct(range)}, con il picco sullo shot ${shots[peakIdx].n}.`);

  const h0 = hexToHsl(shots[0].colore.hex);
  const hN = hexToHsl(shots[shots.length - 1].colore.hex);
  const dh = hueDistance(h0.h, hN.h);
  const dl = Math.abs(h0.l - hN.l);
  const spread = Math.max(...shots.map((s) => hueDistance(hexToHsl(s.colore.hex).h, h0.h)));
  if (meta.paletteFlat) {
    // palette omogenea: la piattezza cromatica e' voluta, non e' un difetto
    push('ok', 'Palette omogenea', `Tutto il reel resta su ${shots[0].colore.nome}, con ${Math.round(dl)} punti di escursione in luminosità. Il viaggio lo devono fare scala, movimento e ritmo.`);
    const flatIntensity = range < 0.45;
    if (meta.luceFissa && flatIntensity) {
      push('error', 'Non si muove niente', 'Palette omogenea, luce costante e intensità quasi piatta insieme: senza almeno una di queste tre cose in movimento non c’è progressione, e il reel legge come un unico fotogramma lungo. Alza il picco o accetta un’escursione di luminosità più ampia.');
    } else if (meta.luceFissa) {
      push('ok', 'Coerenza voluta', 'Colore e luce restano fermi per scelta: la narrazione passa tutta da scala, movimento e durate — e lì l’escursione c’è.');
    }
  } else if (meta.struttura === 'ciclo') {
    if (spread < 25) push('warn', 'Ciclo senza viaggio', 'Il Ciclo torna al punto di partenza, ma nel mezzo il colore non si allontana mai abbastanza: il ritorno non si sente. Allarga la palette finale.');
    else push('ok', 'Ciclo cromatico', `Il colore si allontana fino a ${Math.round(spread)}° e rientra: il ritorno sarà percepibile.`);
  } else if (dh < 18 && dl < 12) {
    push('warn', 'Arco cromatico piatto', `Fra prima e ultima inquadratura ci sono solo ${Math.round(dh)}° di tinta e ${Math.round(dl)} punti di luminosità. Se il colore non viaggia, la narrazione non viaggia.`);
  } else {
    push('ok', 'Arco cromatico', `${dalColore(shots[0].colore.nome)} ${alColore(shots[shots.length - 1].colore.nome)}: ${Math.round(dh)}° di viaggio cromatico.`);
  }

  // --- buchi strutturali -----------------------------------------------------
  const roles = new Set(shots.map((s) => s.role));
  if (!roles.has('svolta')) push('error', 'Manca il punto di svolta', 'Nessuna inquadratura è marcata come svolta: senza un momento che cambia le regole, la sequenza resta una raccolta di immagini.');
  if (!roles.has('chiusura')) push('error', 'Manca la chiusura', 'Nessuna inquadratura chiude il discorso. Il reel finirebbe, non si concluderebbe.');
  if (!roles.has('apertura')) push('error', 'Manca l’apertura', 'Serve un’inquadratura che stabilisca il mondo prima di poterlo rompere.');

  acts.forEach((a) => {
    if (a.shots === 0) push('error', `Atto ${a.n} vuoto`, `L’atto “${a.nome}” non ha inquadrature.`);
    else if (a.durata / total < 0.13) push('warn', `Atto ${a.n} troppo corto`, `“${a.nome}” occupa solo ${pct(a.durata / total)} del reel (${a.durata}s): passerà inosservato.`);
  });

  // --- finale ----------------------------------------------------------------
  const last = shots[shots.length - 1];
  const tailStart = total - last.durata;
  if (peakIdx >= shots.length - 2 && meta.struttura !== 'crescendo') {
    push('warn', 'Finale senza risoluzione', 'Il picco cade sulle ultime due inquadrature: manca lo spazio per far atterrare l’immagine. Aggiungi una coda più bassa.');
  }
  if (last.intensita > 0.55 && meta.struttura !== 'crescendo') {
    push('warn', 'Finale debole per eccesso', `L’ultimo shot è ancora al ${pct(last.intensita)} di intensità: il reel si interrompe invece di chiudersi.`);
  }
  if (last.durata < total * 0.06) {
    push('warn', 'Chiusura troppo breve', `L’ultima inquadratura dura ${last.durata}s: non basta a lasciare un’immagine in memoria. Portala almeno a ${(total * 0.1).toFixed(1)}s.`);
  } else {
    push('ok', 'Chiusura', `Ultima inquadratura di ${last.durata}s in ${last.colore.nome}: c’è il tempo di posare lo sguardo.`);
  }

  // --- ritmo -----------------------------------------------------------------
  const avg = total / shots.length;
  if (stdev(durs) < avg * 0.13) push('warn', 'Durate troppo uguali', 'Le inquadrature durano quasi tutte lo stesso tempo: il montaggio risulterà meccanico. Allunga i beat di apertura e chiusura.');
  if (avg < 0.7) push('warn', 'Montaggio molto fitto', `Media di ${avg.toFixed(1)}s per inquadratura su ${shots.length} shot: girabile, ma prevedi molto materiale e stabilizza in ripresa.`);

  // --- raccordi --------------------------------------------------------------
  if (meta.modalita === 'indipendente') {
    push('ok', 'Elenco indipendente', 'Ogni inquadratura è pensata per reggere da sola: i raccordi non sono richiesti e non vengono valutati. L’ordine finale lo deciderai in montaggio.');
  } else {
    const weakLinks = shots.filter((s, i) => i > 0 && s.linkPrev.tipo === 'materia').length;
    if (weakLinks > shots.length * 0.5) push('warn', 'Raccordi generici', 'Più di metà dei tagli si regge solo sul suono. Avvicina le palette di shot adiacenti o ripeti un asse di movimento per avere raccordi visivi veri.');
  }

  const order = { error: 0, warn: 1, ok: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

/** Note di montaggio derivate dal piano: cosa fare in post. */
export function editingNotes(plan) {
  const { shots, meta } = plan;
  const notes = [];
  notes.push(`Formato ${meta.formato}, durata ${meta.durata}s su ${meta.nShot} inquadrature — ritmo ${meta.ritmo.toLowerCase()}.`);
  notes.push(`Struttura “${meta.strutturaNome}”: ${meta.ideaStruttura}`);

  const peak = shots.reduce((a, b) => (b.intensita > a.intensita ? b : a), shots[0]);
  notes.push(`Monta partendo dal picco (shot ${peak.n}, ${peak.funzione.toLowerCase()}): posizionalo per primo in timeline e costruisci il resto attorno.`);

  if (meta.modalita === 'indipendente') {
    notes.push('Modalità elenco: le inquadrature non hanno raccordi predefiniti. Prova più di un ordine in montaggio prima di fissarlo, e cerca da lì gli accostamenti che ti convincono di più.');
  } else {
    const colorCuts = shots.filter((s) => s.linkPrev.tipo === 'colore').map((s) => s.n);
    if (colorCuts.length) notes.push(`Tagli tenuti dal colore: shot ${colorCuts.join(', ')} — non correggerli separatamente in grading, o il raccordo si perde.`);

    const actionCuts = shots.filter((s) => s.linkPrev.tipo === 'movimento').map((s) => s.n);
    if (actionCuts.length) notes.push(`Match on action: shot ${actionCuts.join(', ')} — taglia a metà del movimento, mai all’inizio o alla fine.`);
  }

  if (meta.paletteFlat) {
    notes.push(`Grading: una sola dominante per tutto, ${shots[0].colore.nome}. Lavora su luminosità e contrasto, non sulla tinta: un solo shot che vira fuori palette si nota più di dieci tagli sbagliati.`);
  } else {
    notes.push(`Grading: porta la dominante ${dalColore(shots[0].colore.nome)} ${alColore(shots[shots.length - 1].colore.nome)} in modo progressivo, senza salti fra shot adiacenti.`);
  }
  if (meta.luceFissa) notes.push(`Luce costante (${meta.luceLabel || 'stessa per tutto il reel'}): non cambiare sorgente fra un’inquadratura e l’altra, e in post non correggere l’esposizione shot per shot — la costanza è la scelta.`);
  if (['pulsato', 'serrato', 'sincopato'].includes(meta.ritmoId)) notes.push('Allinea ogni stacco a un accento della traccia: con questo ritmo un taglio fuori beat si sente subito.');
  else notes.push('Con questo ritmo evita di tagliare sul beat: lascia che le immagini scivolino leggermente rispetto alla musica.');

  notes.push(`Ultima inquadratura (${shots[shots.length - 1].durata}s): tienila abbastanza da permettere il loop del reel sulla prima immagine.`);
  return notes;
}
