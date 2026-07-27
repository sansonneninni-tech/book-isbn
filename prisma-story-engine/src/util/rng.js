// Generatore pseudo-casuale deterministico: stesso seed -> stesso reel.
// Serve perche' il piano deve essere riproducibile (e rigenerabile shot per shot).

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(hashSeed(seed));
  return {
    next,
    /** float in [a, b) */
    range(a, b) {
      return a + next() * (b - a);
    },
    /** intero in [a, b] */
    int(a, b) {
      return Math.floor(a + next() * (b - a + 1));
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    /** estrazione pesata: weightFn(item) -> numero >= 0 */
    weighted(arr, weightFn) {
      const weights = arr.map((it) => Math.max(0.0001, weightFn(it)));
      const total = weights.reduce((a, b) => a + b, 0);
      let r = next() * total;
      for (let i = 0; i < arr.length; i++) {
        r -= weights[i];
        if (r <= 0) return arr[i];
      }
      return arr[arr.length - 1];
    },
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
