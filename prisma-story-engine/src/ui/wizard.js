import { el, clear } from '../util/dom.js';
import { LIGHT_ARCS, LIGHT_FIXED, RHYTHMS } from '../engine/vocabulary.js';
import { makeColorArc, colorName, paletteEnds, VARIAZIONI } from '../engine/color.js';

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

export function renderWizard(root, { input, onChange, onSubmit, onBack }) {
  clear(root);
  const set = (k) => (e) => {
    const t = e.target;
    onChange({ [k]: t.type === 'checkbox' ? t.checked : t.value });
  };

  const datalist = el('datalist', { id: 'emozioni' }, EMOZIONI.map((e) => el('option', { value: e })));

  const gradient = el('div', { class: 'gradient-preview' });
  const gradientLabel = el('p', { class: 'field-hint gradient-label' });
  const paintGradient = () => {
    const p = paletteEnds(input);
    const arc = makeColorArc(p.from, p.to, 'linear', !p.flat && input.viaggioLungo);
    const stops = Array.from({ length: 9 }, (_, i) => arc(i / 8));
    gradient.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    gradientLabel.textContent = p.flat
      ? `Palette omogenea: tutto il reel resta su ${colorName(p.base)}, cambiano solo luminosità e saturazione.`
      : `Arco cromatico: da ${colorName(p.from)} a ${colorName(p.to)}${input.viaggioLungo ? ' — passando dal lato lungo della ruota' : ''}`;
  };

  // --- palette: transizione o omogenea ---------------------------------------
  const paletteModes = [
    ['transizione', 'Transizione', 'Il colore viaggia da un capo all’altro: è il primo motore narrativo.'],
    ['omogenea', 'Palette omogenea', 'Un solo colore per tutto il reel. La narrazione la portano scala, luce e ritmo.'],
  ];

  const colorFinale = field('Colore finale', null,
    el('input', { type: 'color', value: input.paletteFinale, oninput: (e) => { onChange({ paletteFinale: e.target.value }); } }));
  const lungoToggle = el('label', { class: 'toggle' }, [
    el('input', { type: 'checkbox', checked: input.viaggioLungo, onchange: (e) => { onChange({ viaggioLungo: e.target.checked }); } }),
    el('span', { text: 'Viaggio lungo sulla ruota dei colori (più trasformazione, meno eleganza)' }),
  ]);
  const variazione = field('Quanto può variare', 'Anche una palette omogenea non è un colore piatto: respira in luminosità e saturazione.',
    el('select', { onchange: (e) => { onChange({ paletteVariazione: e.target.value }); paintGradient(); } },
      VARIAZIONI.map((v) => el('option', { value: v.id, selected: v.id === input.paletteVariazione, text: v.label }))));

  const syncPalette = () => {
    const flat = input.paletteMode === 'omogenea';
    colorFinale.style.display = flat ? 'none' : '';
    lungoToggle.style.display = flat ? 'none' : '';
    variazione.style.display = flat ? '' : 'none';
    paintGradient();
  };

  const paletteChoice = el('div', { class: 'choice-grid' }, paletteModes.map(([id, label, note]) => el('label', {
    class: 'choice',
  }, [
    el('input', {
      type: 'radio', name: 'paletteMode', value: id, checked: (input.paletteMode || 'transizione') === id,
      onchange: () => { onChange({ paletteMode: id }, true); syncPalette(); },
    }),
    el('strong', { text: label }),
    el('span', { text: note }),
  ])));

  // --- luce: costante o in evoluzione ----------------------------------------
  const lightSelect = el('select', { onchange: set('lightArc') }, [
    el('optgroup', { label: 'La luce non cambia mai' },
      LIGHT_FIXED.map((l) => el('option', { value: l.id, selected: l.id === input.lightArc, text: l.label }))),
    el('optgroup', { label: 'La luce evolve durante il reel' },
      LIGHT_ARCS.map((a) => el('option', { value: a.id, selected: a.id === input.lightArc, text: a.label }))),
  ]);

  const durataOut = el('output', { class: 'range-out', text: `${input.durata}s` });

  // niente <form>: vedi roots.js — in sandbox il submit non arriva mai all'handler
  const form = el('div', { class: 'wizard' }, [
    datalist,

    el('section', { class: 'card' }, [
      el('h2', { text: '1 · L’idea' }),
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
      paletteChoice,
      el('div', { class: 'row' }, [
        field('Colore iniziale', null,
          el('input', { type: 'color', value: input.paletteIniziale, oninput: (e) => { onChange({ paletteIniziale: e.target.value }); } })),
        colorFinale,
      ]),
      variazione,
      lungoToggle,
      gradient,
      gradientLabel,
    ]),

    el('section', { class: 'card' }, [
      el('h2', { text: '5 · Luce' }),
      field('Come si comporta durante il reel', 'La luce può essere il secondo motore narrativo — oppure restare identica per tutto, e allora a muoversi sono scala e ritmo. Sono due scelte diverse, nessuna delle due è un ripiego.',
        lightSelect),
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
      onBack ? el('button', { type: 'button', class: 'btn btn-ghost', text: '← Torna alle tre domande', onclick: onBack }) : null,
      el('button', { type: 'button', class: 'btn btn-primary', text: 'Proponi 3 strutture →', onclick: onSubmit }),
    ]),
  ]);

  root.append(form);
  syncPalette();
  return { paintGradient };
}
