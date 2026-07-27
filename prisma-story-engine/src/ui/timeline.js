import { el, clear, fmtSec } from '../util/dom.js';
import { readableOn } from '../engine/color.js';

const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/** Curva di intensità disegnata sopra la striscia temporale. */
function intensityCurve(plan) {
  const total = plan.meta.durata || 1;
  const pts = [];
  let t = 0;
  plan.shots.forEach((s) => {
    const x = ((t + s.durata / 2) / total) * 100;
    pts.push([x, 100 - s.intensita * 92 - 4]);
    t += s.durata;
  });
  const svg = svgEl('svg', { class: 'curve', viewBox: '0 0 100 100', preserveAspectRatio: 'none' });
  svg.append(svgEl('polyline', {
    points: [[0, 100 - plan.shots[0].intensita * 92 - 4], ...pts, [100, 100 - plan.shots[plan.shots.length - 1].intensita * 92 - 4]]
      .map((p) => p.join(',')).join(' '),
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.2,
    'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round',
  }));
  pts.forEach(([x, y]) => svg.append(svgEl('circle', { cx: x, cy: y, r: 0.9, fill: 'currentColor', 'vector-effect': 'non-scaling-stroke' })));
  return svg;
}

export function renderTimeline(root, { plan, onSelect }) {
  clear(root);
  const total = plan.meta.durata || 1;

  // barra degli atti
  const actBar = el('div', { class: 'act-bar' }, plan.acts.filter((a) => a.shots).map((a) => el('div', {
    class: `act-seg act-${a.n}`,
    style: { flexGrow: String(a.durata) },
  }, [
    el('span', { text: `Atto ${a.n} · ${a.nome}` }),
    el('span', { class: 'muted', text: fmtSec(a.durata) }),
  ])));

  // striscia cromatica con durate proporzionali
  const strip = el('div', { class: 'strip' }, plan.shots.map((s) => el('button', {
    class: 'strip-seg', type: 'button', title: `${s.n} · ${s.soggetto}`,
    style: { flexGrow: String(s.durata), background: s.colore.hex, color: readableOn(s.colore.hex) },
    onclick: () => onSelect(s.n),
  }, [
    el('span', { class: 'strip-n', text: String(s.n) }),
    el('span', { class: 'strip-scale', text: '▮'.repeat(7 - s.scala.i) }),
  ])));

  const stripWrap = el('div', { class: 'strip-wrap' }, [strip, intensityCurve(plan)]);

  // fotogrammi 9:16
  const frames = el('div', { class: 'frames' }, plan.shots.map((s) => el('button', {
    class: 'frame', type: 'button', onclick: () => onSelect(s.n),
    style: {
      background: `linear-gradient(160deg, ${s.colore.hex} 0%, ${s.colore.hex}cc 55%, rgba(0,0,0,.55) 100%)`,
      color: readableOn(s.colore.hex),
    },
  }, [
    el('span', { class: 'frame-n', text: String(s.n) }),
    el('span', { class: 'frame-scale', style: { width: `${18 + s.scala.i * 12}%` } }),
    el('span', { class: 'frame-info' }, [
      el('strong', { text: fmtSec(s.durata) }),
      el('em', { text: s.movimento.label }),
    ]),
  ])));

  root.append(
    el('div', { class: 'section-head' }, [
      el('h2', { text: 'Timeline 9:16' }),
      el('p', { class: 'muted', text: `${plan.meta.nShot} inquadrature · ${fmtSec(total)} · larghezza proporzionale alla durata, linea = intensità narrativa` }),
    ]),
    actBar,
    stripWrap,
    el('div', { class: 'ruler' }, [el('span', { text: '0s' }), el('span', { text: fmtSec(total / 2) }), el('span', { text: fmtSec(total) })]),
    frames,
  );
}
