// Export: CSV per il set / foglio di lavoro, JSON per riaprire il progetto,
// stampa (che il browser converte in PDF).

import { editingNotes } from '../engine/analysis.js';

const CSV_HEADERS = [
  'n', 'atto', 'ruolo', 'funzione narrativa', 'soggetto', 'materiale', 'piano/scala',
  'movimento', 'durata (s)', 'inizio (s)', 'luce', 'colore', 'hex', 'intensita',
  'raccordo con precedente', 'raccordo con successivo', 'alternativa', 'girata',
];

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function planToCsv(plan, input) {
  const rows = [
    [`# ${input.titolo || 'Reel'} — ${plan.meta.strutturaNome} — ${plan.meta.durata}s — ${plan.meta.formato}`],
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

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s) => (s || 'reel').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'reel';

export function exportCsv(plan, input) {
  download(`${slug(input.titolo)}-shotlist.csv`, planToCsv(plan, input), 'text/csv;charset=utf-8');
}

export function exportJson(snapshot, input) {
  download(`${slug(input.titolo)}-prisma.json`, JSON.stringify(snapshot, null, 2), 'application/json');
}

export function importJson(onLoad) {
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
        alert(`File non leggibile: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };
  inputEl.click();
}

export function printPlan() {
  window.print();
}
