// Prima schermata: tre domande che non riguardano la tecnica.
// Non servono al motore per calcolare: servono a te per sapere cosa stai facendo,
// e finiscono per intero dentro ogni prompt mandato al modello.

import { el, clear } from '../util/dom.js';

const DOMANDE = [
  {
    key: 'movente',
    n: '1',
    q: 'Perché questo lavoro, e perché adesso?',
    hint: 'La spinta vera: un ricordo, un’ossessione, una cosa vista per strada, una mancanza. Scrivila come la diresti a voce a un amico, senza farla suonare bene.',
    ph: 'Es. da mesi guardo la stessa luce sul muro della cucina alle sette di sera e mi fa una malinconia che non so spiegare',
  },
  {
    key: 'lascito',
    n: '2',
    q: 'Che cosa vuoi che resti a chi lo guarda?',
    hint: 'Non quello che deve capire: quello che deve sentire dieci secondi dopo la fine, quando il telefono è già in tasca.',
    ph: 'Es. la sensazione di aver trattenuto il respiro senza accorgersene',
  },
  {
    key: 'rifiuto',
    n: '3',
    q: 'Che cosa non deve esserci?',
    hint: 'Il cliché, il tono, l’immagine che escluderesti. Sapere cosa togliere definisce il lavoro quanto sapere cosa metterci — e questa risposta diventa un divieto esplicito nei prompt.',
    ph: 'Es. niente estetica da pubblicità, niente slow motion sull’acqua, niente inquadrature che spiegano',
  },
];

export function renderRoots(root, { input, onChange, onNext }) {
  clear(root);

  const set = (k) => (e) => onChange({ [k]: e.target.value });

  // niente <form>: dentro un iframe con sandbox l'invio viene bloccato dal
  // browser prima ancora che l'handler parta, e il pulsante sembra morto
  root.append(el('div', { class: 'wizard roots' }, [
    el('section', { class: 'section-head' }, [
      el('h2', { text: 'Prima di tutto: di che cosa si tratta davvero' }),
      el('p', { class: 'muted', text: 'Tre domande, nessuna obbligatoria. Sono la parte che il programma non può inventare: i parametri tecnici vengono dopo, e da soli fanno un reel corretto di chiunque. Queste risposte entrano per intero in ogni richiesta all’IA.' }),
    ]),

    el('label', { class: 'field card' }, [
      el('span', { class: 'field-label', text: 'Titolo di lavoro' }),
      el('input', { type: 'text', value: input.titolo, oninput: set('titolo') }),
    ]),

    ...DOMANDE.map((d) => el('section', { class: 'card question' }, [
      el('span', { class: 'question-n', text: d.n }),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label question-q', text: d.q }),
        el('span', { class: 'field-hint', text: d.hint }),
        el('textarea', { rows: 3, placeholder: d.ph, oninput: set(d.key) }, input[d.key] || ''),
      ]),
    ])),

    el('div', { class: 'actions' }, [
      el('button', { type: 'button', class: 'btn btn-primary', text: 'Passa alla parte tecnica →', onclick: onNext }),
    ]),
  ]));
}
