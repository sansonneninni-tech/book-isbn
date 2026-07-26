import { el, clear } from '../util/dom.js';
import { LIGHT_ARCS, RHYTHMS } from '../engine/vocabulary.js';
import { makeColorArc, colorName } from '../engine/color.js';

const EMOZIONI = [
  'quiete', 'attesa', 'sospensione', 'malinconia', 'nostalgia', 'inquietudine',
  'tensione', 'meraviglia', 'stupore', 'vertigine', 'euforia', 'liberazione',
  'smarrimento', 'rinascita', 'pace', 'urgenza',
];

function field(label, hint, control) {
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label', text: label }),
    hint ? el('span', { class: 'field-hint', text: hint }) : null,
    control,
  ]);
}

export function renderWizard(root, { input, onChange, onSubmit }) {
  clear(root);
  const set = (k) => (e) => {
    const t = e.target;
    onChange({ [k]: t.type === 'checkbox' ? t.checked : t.value });
  };

  const datalist = el('datalist', { id: 'emozioni' }, EMOZIONI.map((e) => el('option', { value: e })));

  const gradient = el('div', { class: 'gradient-preview' });
  const gradientLabel = el('p', { class: 'field-hint gradient-label' });
  const paintGradient = () => {
    const arc = makeColorArc(input.paletteIniziale, input.paletteFinale, 'linear', input.viaggioLungo);
    const stops = Array.from({ length: 9 }, (_, i) => arc(i / 8));
    gradient.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    gradientLabel.textContent = `Arco cromatico: da ${colorName(input.paletteIniziale)} a ${colorName(input.paletteFinale)}${input.viaggioLungo ? ' — passando dal lato lungo della ruota' : ''}`;
  };

  const durataOut = el('output', { class: 'range-out', text: `${input.durata}s` });

  const form = el('form', {
    class: 'wizard',
    onsubmit: (e) => { e.preventDefault(); onSubmit(); },
  }, [
    datalist,

    el('section', { class: 'card' }, [
      el('h2', { text: '1 · L’idea' }),
      field('Titolo di lavoro', null,
        el('input', { type: 'text', value: input.titolo, oninput: set('titolo') })),
      field('Che cosa vuoi fare vedere?', 'Anche una frase sola. Vale anche se è vaga: serve a orientare la struttura, non a descrivere il risultato.',
        el('textarea', { rows: 3, placeholder: 'Es. la luce che attraversa il vetro e si rompe in colori, finché non resta solo il bianco', oninput: set('idea') }, input.idea)),
    ]),

    el('section', { class: 'card' }, [
      el('h2', { text: '2 · L’arco emotivo' }),
      el('div', { class: 'row' }, [
        field('Da dove parte', 'la sensazione dei primi 2 secondi',
          el('input', { type: 'text', list: 'emozioni', value: input.emozioneIniziale, oninput: set('emozioneIniziale') })),
        field('Dove arriva', 'quello che resta a video spento',
          el('input', { type: 'text', list: 'emozioni', value: input.emozioneFinale, oninput: set('emozioneFinale') })),
      ]),
    ]),

    el('section', { class: 'card' }, [
      el('h2', { text: '3 · Materiali disponibili' }),
      field('Cosa hai davvero sottomano', 'Separa con virgole. Sono i soggetti reali che finiranno nelle inquadrature: vetro, acqua, tessuto, fumo, metallo arrugginito…',
        el('textarea', { rows: 2, placeholder: 'vetro rigato, acqua in movimento, tessuto nero, polvere in controluce', oninput: set('materiali') }, input.materiali)),
      el('label', { class: 'toggle' }, [
        el('input', { type: 'checkbox', checked: input.persone, onchange: set('persone') }),
        el('span', { text: 'Ci saranno figure umane in campo' }),
      ]),
    ]),

    el('section', { class: 'card' }, [
      el('h2', { text: '4 · Palette' }),
      el('div', { class: 'row' }, [
        field('Colore iniziale', null,
          el('input', { type: 'color', value: input.paletteIniziale, oninput: (e) => { onChange({ paletteIniziale: e.target.value }); } })),
        field('Colore finale', null,
          el('input', { type: 'color', value: input.paletteFinale, oninput: (e) => { onChange({ paletteFinale: e.target.value }); } })),
      ]),
      el('label', { class: 'toggle' }, [
        el('input', { type: 'checkbox', checked: input.viaggioLungo, onchange: (e) => { onChange({ viaggioLungo: e.target.checked }); } }),
        el('span', { text: 'Viaggio lungo sulla ruota dei colori (più trasformazione, meno eleganza)' }),
      ]),
      gradient,
      gradientLabel,
    ]),

    el('section', { class: 'card' }, [
      el('h2', { text: '5 · Luce' }),
      field('Come evolve durante il reel', 'La luce è il secondo motore narrativo dopo il colore.',
        el('select', { onchange: set('lightArc') },
          LIGHT_ARCS.map((a) => el('option', { value: a.id, selected: a.id === input.lightArc, text: a.label })))),
    ]),

    el('section', { class: 'card' }, [
      el('h2', { text: '6 · Ritmo e durata' }),
      el('div', { class: 'rhythm-grid' }, RHYTHMS.map((r) => el('label', {
        class: `rhythm ${r.id === input.ritmo ? 'is-active' : ''}`,
      }, [
        el('input', { type: 'radio', name: 'ritmo', value: r.id, checked: r.id === input.ritmo, onchange: set('ritmo') }),
        el('strong', { text: r.label }),
        el('span', { text: r.note }),
        el('em', { text: `~${r.avgShot}s a inquadratura` }),
      ]))),
      field('Durata totale', null, el('div', { class: 'range-wrap' }, [
        el('input', {
          type: 'range', min: 8, max: 60, step: 1, value: input.durata,
          oninput: (e) => { durataOut.textContent = `${e.target.value}s`; onChange({ durata: Number(e.target.value) }, true); },
        }),
        durataOut,
      ])),
    ]),

    el('div', { class: 'actions' }, [
      el('button', { type: 'submit', class: 'btn btn-primary', text: 'Proponi 3 strutture →' }),
    ]),
  ]);

  root.append(form);
  paintGradient();
  return { paintGradient };
}
