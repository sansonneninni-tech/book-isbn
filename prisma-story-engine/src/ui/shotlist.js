import { el, clear, fmtSec } from '../util/dom.js';
import { readableOn } from '../engine/color.js';

const ROLE_LABEL = {
  apertura: 'Apertura',
  sviluppo: 'Sviluppo',
  trasformazione: 'Trasformazione',
  svolta: 'Punto di svolta',
  chiusura: 'Chiusura',
};

function meta(label, value) {
  return el('div', { class: 'shot-meta' }, [
    el('dt', { text: label }),
    el('dd', { text: value }),
  ]);
}

export function renderShotlist(root, { plan, onRegenerate }) {
  clear(root);
  const acts = [1, 2, 3];

  acts.forEach((n) => {
    const shots = plan.shots.filter((s) => s.act === n);
    if (!shots.length) return;
    const act = plan.acts.find((a) => a.n === n);
    root.append(el('h3', { class: 'act-head' }, [
      el('span', { text: `Atto ${n} · ${act.nome}` }),
      el('span', { class: 'muted', text: `${act.shots} inquadrature · ${fmtSec(act.durata)}` }),
    ]));

    shots.forEach((shot) => {
      const swatch = el('div', {
        class: 'shot-color',
        style: { background: shot.colore.hex, color: readableOn(shot.colore.hex) },
      }, [
        el('strong', { text: `${shot.n}` }),
        el('span', { text: shot.colore.nome }),
      ]);

      root.append(el('article', { class: `card shot role-${shot.role}`, id: `shot-${shot.n}` }, [
        el('header', { class: 'shot-head' }, [
          swatch,
          el('div', { class: 'shot-title' }, [
            el('span', { class: `pill pill-${shot.role}`, text: ROLE_LABEL[shot.role] || shot.role }),
            el('h4', { text: shot.soggetto }),
            el('p', { class: 'funzione', text: shot.funzione }),
          ]),
          el('div', { class: 'shot-dur' }, [
            el('strong', { text: fmtSec(shot.durata) }),
            el('span', { class: 'muted', text: `da ${fmtSec(shot.start)}` }),
          ]),
        ]),

        el('dl', { class: 'shot-grid' }, [
          meta('Piano / scala', shot.scala.label),
          meta('Movimento', shot.movimento.label),
          meta('Luce', shot.luce),
          meta('Colore dominante', `${shot.colore.nome} (${shot.colore.hex})`),
          meta('Intensità', `${Math.round(shot.intensita * 100)}%`),
          meta('Materiale', shot.materiale),
        ]),

        el('div', { class: 'links' }, [
          el('p', { class: 'link link-prev' }, [el('span', { class: 'link-tag', text: `← ${shot.linkPrev.tipo}` }), el('span', { text: shot.linkPrev.testo })]),
          el('p', { class: 'link link-next' }, [el('span', { class: 'link-tag', text: `${shot.linkNext.tipo} →` }), el('span', { text: shot.linkNext.testo })]),
        ]),

        el('div', { class: 'alt' }, [
          el('span', { class: 'alt-tag', text: 'Alternativa' }),
          el('span', { text: shot.alternativa }),
        ]),

        el('div', { class: 'shot-actions no-print' }, [
          el('button', {
            class: 'btn btn-ghost btn-sm', type: 'button',
            text: '↻ Rigenera solo questa inquadratura',
            onclick: () => onRegenerate(shot.n - 1),
          }),
        ]),
      ]));
    });
  });
}
