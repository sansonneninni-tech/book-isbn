import { el, clear, fmtSec } from '../util/dom.js';
import { readableOn } from '../engine/color.js';
import { copyButton } from './dialogs.js';

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

/**
 * Riquadro sopra la shot list: i due testi che valgono per tutto il reel
 * (concept generale e personaggi ricorrenti), ognuno col suo pulsante che
 * copia davvero. Google Flow (e simili) hanno campi separati per queste due
 * cose e riprodurli qui evita di dover copiare la stessa cosa da posti diversi.
 */
function storyboardBar(plan) {
  const sb = plan.meta.storyboard;
  if (!sb) return null;

  const box = (title, hint, text, label) => el('div', { class: 'sb-block' }, [
    el('div', { class: 'sb-block-head' }, [
      el('div', {}, [
        el('strong', { text: title }),
        el('p', { class: 'field-hint', text: hint }),
      ]),
      copyButton({
        label, title,
        getText: () => text,
        className: 'btn btn-sm btn-primary',
      }),
    ]),
    el('pre', { class: 'sb-preview', text }),
  ]);

  return el('section', { class: 'card storyboard no-print' }, [
    el('div', { class: 'sb-head' }, [
      el('h3', { text: 'Per lo storyboard (Google Flow o simili)' }),
      el('p', { class: 'muted', text: 'Quattro testi pronti da incollare. Questi due valgono per tutto il reel; dentro ogni inquadratura trovi gli altri due, che descrivono quella specifica.' }),
    ]),
    box(
      'Concept generale',
      'Il campo di apertura: idea, palette, luce, ritmo, struttura, modalità.',
      sb.conceptGenerale,
      'Copia concept',
    ),
    box(
      'Personaggi / soggetti ricorrenti',
      'Il campo per la coerenza fra sketch: chi (o cosa) torna in ogni inquadratura.',
      sb.descrizionePersonaggi,
      'Copia personaggi',
    ),
  ]);
}

export function renderShotlist(root, { plan, onRegenerate }) {
  clear(root);
  const acts = [1, 2, 3];

  const bar = storyboardBar(plan);
  if (bar) root.append(bar);

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

      const sb = shot.storyboard || { descShot: '', descVisual: '' };

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

        // Storyboard di questa inquadratura, con i due pulsanti che copiano
        // davvero. Il testo si aggiorna da solo quando lo shot viene rigenerato.
        el('div', { class: 'shot-sb no-print' }, [
          copyButton({
            label: 'Copia descrizione shot',
            title: `Shot ${shot.n} — descrizione`,
            getText: () => shot.storyboard?.descShot || '',
          }),
          copyButton({
            label: 'Copia descrizione visual',
            title: `Shot ${shot.n} — visual`,
            getText: () => shot.storyboard?.descVisual || '',
          }),
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
