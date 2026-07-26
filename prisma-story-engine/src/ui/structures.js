import { el, clear } from '../util/dom.js';

export function renderStructures(root, { candidates, input, onPick, onBack }) {
  clear(root);
  root.append(
    el('div', { class: 'section-head' }, [
      el('h2', { text: 'Tre strutture possibili per questa idea' }),
      el('p', { class: 'muted', text: 'Non sono generi: sono modi diversi di far progredire il colore, la scala e l’intensità. Scegline una — potrai sempre tornare qui.' }),
    ]),
    el('div', { class: 'structure-grid' }, candidates.map((c, i) => el('article', { class: `card structure ${i === 0 ? 'is-suggested' : ''}` }, [
      i === 0 ? el('span', { class: 'badge', text: 'più affine alla tua idea' }) : null,
      el('h3', { text: c.name }),
      el('p', { class: 'tagline', text: c.tagline }),
      el('p', { class: 'muted', text: c.idea }),
      el('ul', { class: 'reasons' }, c.reasons.map((r) => el('li', { text: r }))),
      el('button', {
        class: 'btn btn-primary', type: 'button',
        text: `Costruisci con “${c.name}”`,
        onclick: () => onPick(c.id),
      }),
    ]))),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn btn-ghost', type: 'button', text: '← Modifica le risposte', onclick: onBack }),
    ]),
  );
}
