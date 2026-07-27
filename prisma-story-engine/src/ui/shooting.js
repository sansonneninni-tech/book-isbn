// Modalita' shooting: pensata per il telefono, sul set. Testo grande, checkbox,
// solo le informazioni che servono mentre inquadri.

import { el, clear, fmtSec } from '../util/dom.js';
import { readableOn } from '../engine/color.js';

export function renderShooting(root, { plan, onToggle, onExit }) {
  clear(root);
  const done = plan.shots.filter((s) => s.fatto).length;
  const pct = Math.round((done / plan.shots.length) * 100);

  root.append(
    el('header', { class: 'shoot-head' }, [
      el('div', {}, [
        el('strong', { text: 'Modalità shooting' }),
        el('span', { class: 'muted', text: ` ${done}/${plan.shots.length} girate` }),
      ]),
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: 'Esci', onclick: onExit }),
    ]),
    el('div', { class: 'progress' }, [el('div', { class: 'progress-bar', style: { width: `${pct}%` } })]),
    el('div', { class: 'shoot-list' }, plan.shots.map((s) => el('label', {
      class: `shoot-item ${s.fatto ? 'is-done' : ''}`,
    }, [
      el('input', { type: 'checkbox', checked: s.fatto, onchange: () => onToggle(s.n - 1) }),
      el('div', { class: 'shoot-dot', style: { background: s.colore.hex, color: readableOn(s.colore.hex) }, text: String(s.n) }),
      el('div', { class: 'shoot-body' }, [
        el('strong', { text: s.soggetto }),
        el('p', { class: 'shoot-tech', text: `${s.scala.label} · ${s.movimento.label} · ${fmtSec(s.durata)}` }),
        el('p', { class: 'shoot-light', text: s.luce }),
        el('p', { class: 'shoot-alt', text: `Se non funziona: ${s.alternativa}` }),
      ]),
    ]))),
  );
}
