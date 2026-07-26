import { $, el, clear } from './util/dom.js';
import { state, setState, subscribe, restore, resetAll, snapshot, loadSnapshot, persist } from './state.js';
import { getAdapter, loadProviderConfig, saveProviderConfig, PROVIDERS } from './adapters/index.js';
import { renderWizard } from './ui/wizard.js';
import { renderStructures } from './ui/structures.js';
import { renderShotlist } from './ui/shotlist.js';
import { renderTimeline } from './ui/timeline.js';
import { renderAnalysis, renderEditing } from './ui/analysis.js';
import { renderShooting } from './ui/shooting.js';
import { exportCsv, exportJson, importJson, printPlan } from './ui/exports.js';

const view = $('#view');
const toolbar = $('#toolbar');
const toast = $('#toast');
let wizardApi = null;

function notify(msg) {
  toast.textContent = msg;
  toast.classList.add('is-visible');
  clearTimeout(notify._t);
  notify._t = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

// non passa dallo store: evita un re-render (e la perdita del focus) a ogni attesa
async function withBusy(label, fn) {
  document.body.classList.add('is-busy');
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    notify(`Errore: ${err.message}`);
    return null;
  } finally {
    document.body.classList.remove('is-busy');
  }
}

// --- azioni ----------------------------------------------------------------

async function proposeStructures() {
  const adapter = getAdapter();
  const seed = `${Date.now()}`;
  const candidates = await withBusy('strutture', () => adapter.proposeStructures(state.input, seed));
  if (candidates) setState({ candidates, seed, step: 'strutture' });
}

async function buildPlan(structureId) {
  const adapter = getAdapter();
  const plan = await withBusy('piano', () => adapter.generatePlan(state.input, structureId, state.seed));
  if (plan) setState({ plan, step: 'piano', tab: 'shotlist' });
}

async function regenerateShot(index) {
  const adapter = getAdapter();
  const plan = await withBusy('shot', () => adapter.regenerateShot(state.plan, state.input, index));
  if (plan) {
    setState({ plan });
    notify(`Inquadratura ${index + 1} rigenerata`);
    document.getElementById(`shot-${index + 1}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function toggleShot(index) {
  const shots = state.plan.shots.map((s, i) => (i === index ? { ...s, fatto: !s.fatto } : s));
  setState({ plan: { ...state.plan, shots } });
}

function selectShot(n) {
  setState({ tab: 'shotlist' });
  requestAnimationFrame(() => {
    document.getElementById(`shot-${n}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

// --- impostazioni provider --------------------------------------------------

function openSettings() {
  const cfg = loadProviderConfig();
  const dlg = el('dialog', { class: 'modal' }, [
    el('form', { method: 'dialog', onsubmit: (e) => {
      e.preventDefault();
      const data = new FormData(e.target);
      saveProviderConfig({
        provider: data.get('provider'),
        apiKey: String(data.get('apiKey') || '').trim(),
        model: String(data.get('model') || '').trim(),
        baseUrl: String(data.get('baseUrl') || '').trim(),
      });
      dlg.close();
      dlg.remove();
      notify('Provider aggiornato');
      render();
    } }, [
      el('h2', { text: 'Motore di generazione' }),
      el('p', { class: 'muted', text: 'Il motore locale è sempre attivo e definisce la struttura. Un provider esterno riscrive solo soggetti, funzioni e alternative — durate, scale, movimenti e colori restano deterministici. Se la chiamata fallisce, si torna automaticamente al locale.' }),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'Provider' }),
        el('select', { name: 'provider' }, PROVIDERS.map((p) => el('option', { value: p.id, selected: p.id === cfg.provider, text: p.label }))),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'API key' }),
        el('span', { class: 'field-hint', text: 'Resta solo nel tuo browser. Una chiave nel browser è visibile a chi usa questo dispositivo: per un uso condiviso, usa un proxy e lascia il campo vuoto.' }),
        el('input', { type: 'password', name: 'apiKey', value: cfg.apiKey || '', autocomplete: 'off' }),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'Modello (opzionale)' }),
        el('input', { type: 'text', name: 'model', value: cfg.model || '', placeholder: 'claude-sonnet-5' }),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'Endpoint / proxy (opzionale)' }),
        el('input', { type: 'text', name: 'baseUrl', value: cfg.baseUrl || '', placeholder: 'https://tuo-proxy/api/messages' }),
      ]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-ghost', type: 'button', text: 'Annulla', onclick: () => { dlg.close(); dlg.remove(); } }),
        el('button', { class: 'btn btn-primary', type: 'submit', text: 'Salva' }),
      ]),
    ]),
  ]);
  document.body.append(dlg);
  dlg.showModal();
}

// --- render -----------------------------------------------------------------

function renderToolbar() {
  clear(toolbar);
  const has = !!state.plan;
  const cfg = loadProviderConfig();
  toolbar.append(
    el('div', { class: 'brand' }, [
      el('span', { class: 'logo' }),
      el('div', {}, [
        el('strong', { text: 'PRISMA Story Engine' }),
        el('span', { class: 'muted', text: state.input.titolo || 'Reel senza titolo' }),
      ]),
    ]),
    el('div', { class: 'toolbar-actions no-print' }, [
      has ? el('button', { class: 'btn btn-sm', type: 'button', text: state.shooting ? '← Piano' : '📱 Shooting', onclick: () => setState({ shooting: !state.shooting }) }) : null,
      has ? el('button', { class: 'btn btn-sm', type: 'button', text: 'CSV', onclick: () => exportCsv(state.plan, state.input) }) : null,
      has ? el('button', { class: 'btn btn-sm', type: 'button', text: 'Stampa / PDF', onclick: printPlan }) : null,
      el('button', { class: 'btn btn-sm', type: 'button', text: 'Salva file', onclick: () => exportJson(snapshot(), state.input) }),
      el('button', { class: 'btn btn-sm', type: 'button', text: 'Apri file', onclick: () => importJson((obj) => { loadSnapshot(obj); notify('Progetto caricato'); }) }),
      el('button', { class: 'btn btn-sm', type: 'button', text: `⚙ ${cfg.provider === 'local' ? 'Locale' : cfg.provider}`, onclick: openSettings }),
      el('button', { class: 'btn btn-sm btn-danger', type: 'button', text: 'Nuovo', onclick: () => {
        if (confirm('Azzerare il progetto corrente? Il salvataggio locale verrà cancellato.')) { resetAll(); notify('Progetto azzerato'); }
      } }),
    ]),
  );
}

function renderPlan() {
  const tabs = [
    ['shotlist', 'Shot list'],
    ['timeline', 'Timeline'],
    ['analisi', 'Analisi'],
    ['montaggio', 'Montaggio'],
  ];

  const head = el('div', { class: 'plan-head' }, [
    el('div', {}, [
      el('h2', { text: state.plan.meta.strutturaNome }),
      el('p', { class: 'muted', text: `${state.plan.meta.tagline} · ${state.plan.meta.nShot} inquadrature · ${state.plan.meta.durata}s · ritmo ${state.plan.meta.ritmo.toLowerCase()} · ${state.plan.meta.formato}` }),
    ]),
    el('div', { class: 'plan-head-actions no-print' }, [
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '↻ Rigenera tutto', onclick: () => buildPlan(state.plan.meta.struttura) }),
      el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: '← Cambia struttura', onclick: () => setState({ step: 'strutture' }) }),
    ]),
  ]);

  const tabBar = el('nav', { class: 'tabs no-print' }, tabs.map(([id, label]) => el('button', {
    class: `tab ${state.tab === id ? 'is-active' : ''}`, type: 'button', text: label,
    onclick: () => setState({ tab: id }),
  })));

  const panel = el('div', { class: 'panel' });
  view.append(head, tabBar, panel);

  if (state.tab === 'shotlist') renderShotlist(panel, { plan: state.plan, onRegenerate: regenerateShot });
  else if (state.tab === 'timeline') renderTimeline(panel, { plan: state.plan, onSelect: selectShot });
  else if (state.tab === 'analisi') renderAnalysis(panel, { plan: state.plan, onSelect: selectShot });
  else renderEditing(panel, { plan: state.plan });

  // in stampa esce sempre il piano completo
  const printOnly = el('div', { class: 'print-only' });
  view.append(printOnly);
  renderShotlist(printOnly, { plan: state.plan, onRegenerate: () => {} });
}

let lastView = '';

function render() {
  renderToolbar();
  clear(view);

  // cambiando schermata si riparte dall'alto: la toolbar e' sticky e coprirebbe il titolo
  const key = `${state.step}|${state.shooting}`;
  if (key !== lastView) {
    lastView = key;
    window.scrollTo({ top: 0 });
  }

  if (state.plan && state.shooting) {
    renderShooting(view, {
      plan: state.plan,
      onToggle: toggleShot,
      onExit: () => setState({ shooting: false }),
    });
    return;
  }

  if (state.step === 'wizard') {
    wizardApi = renderWizard(view, {
      input: state.input,
      onChange: (patch, silent = false) => {
        Object.assign(state.input, patch);
        persist();
        if (!silent && ('paletteIniziale' in patch || 'paletteFinale' in patch || 'viaggioLungo' in patch)) {
          wizardApi?.paintGradient();
        }
        if ('titolo' in patch) renderToolbar();
      },
      onSubmit: proposeStructures,
    });
    return;
  }

  if (state.step === 'strutture') {
    renderStructures(view, {
      candidates: state.candidates,
      input: state.input,
      onPick: buildPlan,
      onBack: () => setState({ step: 'wizard' }),
    });
    return;
  }

  if (state.plan) renderPlan();
  else setState({ step: 'wizard' });
}

subscribe(render);
restore();
render();

// scorciatoie utili sul set
window.addEventListener('keydown', (e) => {
  if (e.key === 'p' && (e.metaKey || e.ctrlKey)) return; // lascia stampare
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 's' && state.plan) setState({ shooting: !state.shooting });
});
