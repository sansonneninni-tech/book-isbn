// Export: CSV per il set, JSON per riaprire il progetto, stampa (che il browser
// converte in PDF).
//
// Ogni via ha un ripiego, perche' la stessa app gira in tre contesti molto diversi:
// da file locale, da server locale, e dentro un iframe con sandbox (la versione
// pubblicata online). Li' download, finestre nuove e window.print() possono essere
// bloccati senza dire niente: se il pulsante non ha effetto, si apre il testo.

import { el } from '../util/dom.js';
import { editingNotes } from '../engine/analysis.js';
import { showTextFile, copyText } from './dialogs.js';

const CSV_HEADERS = [
  'n', 'atto', 'ruolo', 'funzione narrativa', 'soggetto', 'materiale', 'piano/scala',
  'movimento', 'durata (s)', 'inizio (s)', 'luce', 'colore', 'hex', 'intensita',
  'raccordo con precedente', 'raccordo con successivo', 'alternativa', 'girata',
];

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function planToCsv(plan, input) {
  const rows = [
    [`# ${input.titolo || 'Reel'} — ${plan.meta.strutturaNome} — ${plan.meta.durata}s — ${plan.meta.formato}`],
    [`# perché: ${input.movente || '—'}`],
    [`# cosa deve restare: ${input.lascito || '—'}`],
    [`# da evitare: ${input.rifiuto || '—'}`],
    [],
    CSV_HEADERS,
    ...plan.shots.map((s) => [
      s.n, s.act, s.role, s.funzione, s.soggetto, s.materiale, s.scala.label,
      s.movimento.label, s.durata, s.start, s.luce, s.colore.nome, s.colore.hex,
      Math.round(s.intensita * 100) + '%',
      `${s.linkPrev.tipo}: ${s.linkPrev.testo}`,
      `${s.linkNext.tipo}: ${s.linkNext.testo}`,
      s.alternativa, s.fatto ? 'si' : 'no',
    ]),
    [],
    ['# note di montaggio'],
    ...editingNotes(plan).map((n) => [n]),
  ];
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
}

// ---------------------------------------------------------------------------
// Documento di stampa autonomo
// ---------------------------------------------------------------------------

const h = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * HTML completo e indipendente dall'app: si stampa da solo, si salva, si manda
 * per mail. Non dipende dal CSS della pagina, quindi resta leggibile ovunque.
 */
export function buildPrintDocument(plan, input) {
  const brief = [
    ['Perché', input.movente],
    ['Cosa deve restare', input.lascito],
    ['Da evitare', input.rifiuto],
    ['Idea', input.idea],
    ['Materiali', input.materiali],
  ].filter(([, v]) => String(v || '').trim());

  const shots = plan.shots.map((s) => `
    <article class="shot">
      <div class="sw" style="background:${h(s.colore.hex)}"></div>
      <div class="body">
        <h3>${s.n}. ${h(s.soggetto)}</h3>
        <p class="fn">${h(s.funzione)} · atto ${s.act} · ${h(s.role)}</p>
        <table>
          <tr><th>Piano</th><td>${h(s.scala.label)}</td><th>Movimento</th><td>${h(s.movimento.label)}</td></tr>
          <tr><th>Durata</th><td>${s.durata}s (da ${s.start}s)</td><th>Colore</th><td>${h(s.colore.nome)} ${h(s.colore.hex)}</td></tr>
          <tr><th>Luce</th><td colspan="3">${h(s.luce)}</td></tr>
        </table>
        <p class="link"><b>← ${h(s.linkPrev.tipo)}</b> ${h(s.linkPrev.testo)}</p>
        <p class="link"><b>${h(s.linkNext.tipo)} →</b> ${h(s.linkNext.testo)}</p>
        <p class="alt"><b>Alternativa</b> ${h(s.alternativa)}</p>
      </div>
    </article>`).join('');

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8" />
<title>${h(input.titolo || 'Reel')} — shot list</title>
<style>
  @page { margin: 14mm; }
  body { font: 11pt/1.45 -apple-system, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; }
  h1 { font-size: 17pt; margin: 0 0 2px; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .08em; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 3px; }
  h3 { font-size: 11.5pt; margin: 0 0 2px; }
  .sub { color: #555; margin: 0 0 10px; }
  .brief { border: 1px solid #ddd; padding: 8px 10px; margin-bottom: 6px; }
  .brief p { margin: 0 0 3px; font-size: 10pt; }
  .brief b { color: #000; }
  .shot { display: flex; gap: 10px; border: 1px solid #ccc; padding: 8px 10px; margin-bottom: 6px; break-inside: avoid; page-break-inside: avoid; }
  .sw { width: 26px; flex: none; border: 1px solid #0002; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .body { flex: 1; }
  .fn { color: #555; font-size: 9.5pt; margin: 0 0 5px; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin-bottom: 5px; }
  th { text-align: left; color: #666; font-weight: 600; width: 62px; padding: 1px 6px 1px 0; vertical-align: top; }
  td { padding: 1px 10px 1px 0; }
  .link, .alt { font-size: 9.5pt; color: #444; margin: 1px 0; }
  .link b, .alt b { color: #000; text-transform: uppercase; font-size: 8pt; letter-spacing: .04em; }
  ol { font-size: 10pt; padding-left: 18px; }
  li { margin-bottom: 4px; }
  @media screen { body { max-width: 780px; margin: 24px auto; padding: 0 18px; } }
</style></head>
<body>
  <h1>${h(input.titolo || 'Reel senza titolo')}</h1>
  <p class="sub">${h(plan.meta.strutturaNome)} — ${h(plan.meta.tagline)}<br />
  ${plan.meta.nShot} inquadrature · ${plan.meta.durata}s · ritmo ${h(plan.meta.ritmo.toLowerCase())} · ${h(plan.meta.formato)}</p>
  ${brief.length ? `<div class="brief">${brief.map(([k, v]) => `<p><b>${h(k)}:</b> ${h(v)}</p>`).join('')}</div>` : ''}
  <h2>Shot list</h2>
  ${shots}
  <h2>Note di montaggio</h2>
  <ol>${editingNotes(plan).map((n) => `<li>${h(n)}</li>`).join('')}</ol>
  <script>try { window.print(); } catch (e) {}<\/script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Consegna dei file
// ---------------------------------------------------------------------------

function tryDownload(filename, content, type) {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (err) {
    console.warn('Download non riuscito:', err.message);
    return false;
  }
}

const slug = (s) => (s || 'reel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'reel';

/**
 * Prova a scaricare; se non parte offre comunque il contenuto a schermo.
 * In un iframe con sandbox il click su un link download viene ignorato in
 * silenzio, quindi il ripiego non e' un lusso.
 */
export function deliverFile(name, content, type, note) {
  const ok = tryDownload(name, content, type);
  return {
    ok,
    fallback: () => showTextFile({
      title: `Se il download non è partito: ${name}`,
      note: note || 'Copia questo testo e incollalo in un file di testo con questo nome.',
      name,
      content,
      onDownload: () => tryDownload(name, content, type),
    }),
  };
}

export function exportCsv(plan, input) {
  return deliverFile(`${slug(input.titolo)}-shotlist.csv`, planToCsv(plan, input), 'text/csv;charset=utf-8');
}

export function exportJson(snapshot, input) {
  return deliverFile(`${slug(input.titolo)}-prisma.json`, JSON.stringify(snapshot, null, 2), 'application/json');
}

export function importJson(onLoad, onError) {
  const inputEl = document.createElement('input');
  inputEl.type = 'file';
  inputEl.accept = 'application/json,.json';
  inputEl.onchange = () => {
    const file = inputEl.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onLoad(JSON.parse(String(reader.result)));
      } catch (err) {
        if (onError) onError(err);
      }
    };
    reader.readAsText(file);
  };
  inputEl.click();
}

/**
 * Stampa. Tre strade, in ordine di qualita' del risultato:
 * 1. pagina intera (foglio di stile di stampa gia' pronto) quando siamo la finestra principale;
 * 2. documento autonomo in una scheda nuova, che si stampa da solo;
 * 3. niente da fare: si restituisce 'testo' e il chiamante mostra il contenuto.
 * @returns {'pagina'|'scheda'|'testo'}
 */
export function printPlan(plan, input) {
  if (window.self === window.top) {
    window.print();
    return 'pagina';
  }
  const html = buildPrintDocument(plan, input);
  try {
    const w = window.open('', '_blank');
    if (w && w.document) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      return 'scheda';
    }
  } catch (err) {
    console.warn('Apertura scheda non riuscita:', err.message);
  }
  return 'testo';
}

// ---------------------------------------------------------------------------
// Pannello unico "Esporta"
// ---------------------------------------------------------------------------

function row(titolo, descrizione, buttons) {
  return el('div', { class: 'export-row' }, [
    el('div', {}, [
      el('strong', { text: titolo }),
      el('p', { class: 'field-hint', text: descrizione }),
    ]),
    el('div', { class: 'export-actions' }, buttons),
  ]);
}

/**
 * Un solo posto per salvare, stampare e riaprire: cosi' se una strada e' bloccata
 * dall'ambiente, l'alternativa e' li' accanto e non va cercata.
 */
export function openExportDialog({ plan, input, snapshot, onImport, notify }) {
  const close = () => { dlg.close(); dlg.remove(); };
  // dentro un iframe il download puo' essere ignorato in silenzio: non c'e' modo
  // di saperlo, quindi si avvisa dove cercare e qual e' l'alternativa
  const inFrame = window.self !== window.top;
  const saved = (etichetta) => (inFrame
    ? `${etichetta}: se non lo trovi nei Download, usa “Copia” o “Mostra”`
    : etichetta);

  const csvBtns = plan ? [
    el('button', {
      class: 'btn btn-sm', type: 'button', text: 'Scarica .csv',
      onclick: () => { const r = exportCsv(plan, input); notify(r.ok ? saved('CSV scaricato') : 'Download bloccato'); if (!r.ok) r.fallback(); },
    }),
    el('button', {
      class: 'btn btn-sm btn-ghost', type: 'button', text: 'Copia',
      onclick: async (e) => { const ok = await copyText(planToCsv(plan, input)); e.target.textContent = ok ? '✓ Copiato' : 'Non riesco'; },
    }),
    el('button', {
      class: 'btn btn-sm btn-ghost', type: 'button', text: 'Mostra',
      onclick: () => exportCsv(plan, input).fallback(),
    }),
  ] : [];

  const jsonBtns = [
    el('button', {
      class: 'btn btn-sm', type: 'button', text: 'Salva .json',
      onclick: () => { const r = exportJson(snapshot(), input); notify(r.ok ? saved('Progetto salvato') : 'Download bloccato'); if (!r.ok) r.fallback(); },
    }),
    el('button', {
      class: 'btn btn-sm btn-ghost', type: 'button', text: 'Copia',
      onclick: async (e) => { const ok = await copyText(JSON.stringify(snapshot(), null, 2)); e.target.textContent = ok ? '✓ Copiato' : 'Non riesco'; },
    }),
    el('button', {
      class: 'btn btn-sm btn-ghost', type: 'button', text: 'Mostra',
      onclick: () => deliverFile(`${slug(input.titolo)}-prisma.json`, JSON.stringify(snapshot(), null, 2), 'application/json').fallback(),
    }),
  ];

  const printBtns = plan ? [
    el('button', {
      class: 'btn btn-sm', type: 'button', text: 'Stampa / PDF',
      onclick: () => {
        const via = printPlan(plan, input);
        if (via === 'testo') {
          const html = buildPrintDocument(plan, input);
          deliverFile(`${slug(input.titolo)}-piano.html`, html, 'text/html',
            'Qui la stampa diretta è bloccata. Salva questo testo come file .html, aprilo con un doppio clic e stampa da lì (⌘P → Salva come PDF).').fallback();
        } else {
          close();
        }
      },
    }),
  ] : [];

  const importBtns = [
    el('button', {
      class: 'btn btn-sm btn-ghost', type: 'button', text: 'Scegli un file .json',
      onclick: () => importJson((obj) => { onImport(obj); close(); }, (err) => notify(`File non leggibile: ${err.message}`)),
    }),
    el('button', {
      class: 'btn btn-sm btn-ghost', type: 'button', text: 'Incolla il testo',
      onclick: () => { pasteBox.hidden = false; pasteBox.querySelector('textarea').focus(); },
    }),
  ];

  const pasteArea = el('textarea', { rows: 4, class: 'bridge-answer', placeholder: 'Incolla qui il contenuto del file .json' });
  const pasteBox = el('div', { class: 'export-paste', hidden: true }, [
    pasteArea,
    el('div', { class: 'export-actions' }, [
      el('button', {
        class: 'btn btn-sm btn-primary', type: 'button', text: 'Carica',
        onclick: () => {
          try {
            onImport(JSON.parse(pasteArea.value));
            close();
          } catch (err) {
            notify(`Testo non leggibile: ${err.message}`);
          }
        },
      }),
    ]),
  ]);

  const dlg = el('dialog', { class: 'modal modal-wide' }, [
    el('h2', { text: 'Salva, stampa, riapri' }),
    el('p', { class: 'muted', text: 'Se un pulsante non sembra fare niente, è il browser che sta bloccando i download: usa “Copia” o “Mostra”, il contenuto è lo stesso.' }),
    el('div', { class: 'export-list' }, [
      plan ? row('Shot list (CSV)', 'Foglio di lavoro per il set: si apre in Numbers, Excel o Fogli Google.', csvBtns) : null,
      row('Progetto (JSON)', 'Il file per riaprire tutto com’è, anche su un altro computer.', jsonBtns),
      plan ? row('Stampa / PDF', 'Piano completo su carta, o “Salva come PDF” dalla finestra di stampa.', printBtns) : null,
      row('Apri un progetto salvato', 'Sostituisce quello corrente con un file .json esportato da qui.', importBtns),
      pasteBox,
    ]),
    el('div', { class: 'actions' }, [
      el('button', { class: 'btn btn-primary', type: 'button', text: 'Chiudi', onclick: close }),
    ]),
  ]);

  dlg.addEventListener('cancel', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}
