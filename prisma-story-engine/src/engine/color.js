// Arco cromatico: la colonna vertebrale narrativa del reel.
// La progressione di colore non decora la storia, la struttura.

export function hexToHsl(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  return { h: hue, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }) {
  const sN = s / 100;
  const lN = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n) => {
    const v = lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * v).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Distanza angolare fra due tinte, 0..180 */
export function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Interpola fra due colori in HSL.
 * longPath = true prende la strada lunga sulla ruota: piu' viaggio, piu' trasformazione.
 */
export function mixHsl(from, to, t, longPath = false) {
  let dh = to.h - from.h;
  if (!longPath) {
    if (dh > 180) dh -= 360;
    if (dh < -180) dh += 360;
  } else if (Math.abs(dh) < 180) {
    dh = dh >= 0 ? dh - 360 : dh + 360;
  }
  return {
    h: (from.h + dh * t + 360) % 360,
    s: from.s + (to.s - from.s) * t,
    l: from.l + (to.l - from.l) * t,
  };
}

/**
 * Ponte neutro: piu' i due colori sono lontani sulla ruota, piu' l'interpolazione
 * passa da una zona desaturata invece di attraversare tinte che non hai scelto.
 * E' come lavora un colorist: si passa dal neutro, non dal verde.
 */
function neutralBridge(c, t, hueDist) {
  const dip = Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * (hueDist / 180) * 0.8;
  return { ...c, s: c.s * (1 - dip) };
}

/**
 * Costruisce la funzione colore(t) per un progetto.
 * `mode`:
 *   'linear'    A -> B (Crescendo, Rivelazione, Metamorfosi, Frammento)
 *   'return'    A -> B -> A' (Ciclo: si torna al punto di partenza, ma alterati)
 *   'alternate' A / B alternati che convergono (Chiamata-risposta)
 */
export function makeColorArc(startHex, endHex, mode = 'linear', longPath = false) {
  const A = hexToHsl(startHex);
  const B = hexToHsl(endHex);
  const dist = hueDistance(A.h, B.h);
  const bridge = (c, t) => neutralBridge(c, t, longPath ? dist * 0.4 : dist);
  return function colorAt(t, index = 0) {
    const tc = Math.max(0, Math.min(1, t));
    if (mode === 'return') {
      const tri = tc <= 0.5 ? tc * 2 : (1 - tc) * 2;
      const c = bridge(mixHsl(A, B, tri, longPath), tri);
      // il ritorno non e' identico: la luminosita' conserva una traccia del viaggio
      return hslToHex({ ...c, l: c.l + (tc > 0.5 ? (B.l - A.l) * 0.18 : 0) });
    }
    if (mode === 'alternate') {
      const converge = tc; // verso il centro
      const pole = index % 2 === 0 ? 0 : 1;
      const target = pole === 0 ? converge * 0.5 : 1 - converge * 0.5;
      return hslToHex(bridge(mixHsl(A, B, target, longPath), target));
    }
    return hslToHex(bridge(mixHsl(A, B, tc, longPath), tc));
  };
}

const NAMES = [
  [15, 'rosso'], [40, 'arancio'], [58, 'ambra'], [70, 'giallo'], [95, 'lime'],
  [150, 'verde'], [175, 'verde acqua'], [195, 'ciano'], [215, 'azzurro'],
  [250, 'blu'], [275, 'indaco'], [295, 'viola'], [325, 'magenta'], [345, 'rosa'], [361, 'rosso'],
];

/** Nome italiano approssimato: serve in shot list e note di montaggio. */
export function colorName(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (l < 12) return 'nero';
  if (l > 92 && s < 15) return 'bianco';
  if (s < 12) return l < 45 ? 'grigio profondo' : 'grigio chiaro';
  const base = NAMES.find(([lim]) => h < lim)[1];
  const qual = l < 30 ? ' profondo' : l > 72 ? ' chiaro' : s > 70 ? ' saturo' : ' desaturato';
  return base + qual;
}

// Elisione: "l'azzurro" e non "il azzurro". I nomi di colore finiscono in mezzo
// a frasi generate, quindi l'articolo va costruito, non concatenato a mano.
const vocale = (n) => /^[aeiou]/i.test(n);
export const conArticolo = (n) => (vocale(n) ? `l’${n}` : `il ${n}`);
export const dalColore = (n) => (vocale(n) ? `dall’${n}` : `dal ${n}`);
export const alColore = (n) => (vocale(n) ? `all’${n}` : `al ${n}`);

/** Contrasto di luminosita' fra due colori: usato per i raccordi. */
export function lumaDelta(hexA, hexB) {
  return Math.abs(hexToHsl(hexA).l - hexToHsl(hexB).l);
}

export function readableOn(hex) {
  return hexToHsl(hex).l > 58 ? '#0d0d12' : '#f4f4f8';
}
