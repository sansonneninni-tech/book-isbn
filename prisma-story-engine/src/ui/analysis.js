import { el, clear } from '../util/dom.js';
import { analyze, editingNotes } from '../engine/analysis.js';

const ICON = { error: '!', warn: '~', ok: '✓' };
const TITLE = { error: 'Da risolvere', warn: 'Da valutare', ok: 'Funziona' };

export function renderAnalysis(root, { plan, onSelect }) {
  clear(root);
  const items = analyze(plan);
  const counts = items.reduce((acc, i) => ({ ...acc, [i.level]: (acc[i.level] || 0) + 1 }), {});

  root.append(
    el('div', { class: 'section-head' }, [
      el('h2', { text: 'Analisi della narrazione' }),
      el('p', { class: 'muted', text: 'Controlli deterministici sulla sequenza: ripetizioni, buchi, progressione, finale. Sono segnalazioni, non correzioni automatiche.' }),
    ]),
    el('div', { class: 'score-row' }, ['error', 'warn', 'ok'].map((lvl) => el('div', { class: `score score-${lvl}` }, [
      el('strong', { text: String(counts[lvl] || 0) }),
      el('span', { text: TITLE[lvl] }),
    ]))),
    el('div', { class: 'diag' }, items.map((i) => el('div', { class: `diag-item diag-${i.level}` }, [
      el('span', { class: 'diag-icon', text: ICON[i.level] }),
      el('div', {}, [
        el('strong', { text: i.title }),
        el('p', { text: i.msg }),
        i.refs && i.refs.length
          ? el('p', { class: 'diag-refs' }, i.refs.map((n) => el('button', {
              class: 'chip', type: 'button', text: `shot ${n}`, onclick: () => onSelect(n),
            })))
          : null,
      ]),
    ]))),
  );
}

export function renderEditing(root, { plan }) {
  clear(root);
  root.append(
    el('div', { class: 'section-head' }, [
      el('h2', { text: 'Note di montaggio' }),
      el('p', { class: 'muted', text: 'Da leggere quando il materiale è già in timeline.' }),
    ]),
    el('ol', { class: 'notes' }, editingNotes(plan).map((n) => el('li', { text: n }))),
  );
}
