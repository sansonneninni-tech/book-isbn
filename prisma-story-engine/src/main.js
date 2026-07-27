import { $, el, clear } from './util/dom.js';
import { state, setState, subscribe, restore, resetAll, snapshot, loadSnapshot, persist } from './state.js';
import { getAdapter, loadProviderConfig, saveProviderConfig, PROVIDERS, PROVIDER_LABELS } from './adapters/index.js';
import { renderRoots } from './ui/roots.js';
import { renderWizard } from './ui/wizard.js';
import { renderStructures } from './ui/structures.js';
import { renderShotlist } from './ui/shotlist.js';
import { renderTimeline } from './ui/timeline.js';
import { renderAnalysis, renderEditing } from './ui/analysis.js';
import { renderShooting } from './ui/shooting.js';
import { openExportDialog } from './ui/exports.js';
import { openBridge, bridgeReportBox } from './ui/bridge.js';
import { askConfirm } from './ui/dialogs.js';

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

// il ponte copia-incolla ha bisogno di aprire un modale: gliela passiamo qui
const adapter = () => getAdapter(loadProviderConfig(), { requestPaste: openBridge });

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
  const seed = `${Date.now()}`;
  const candidates = await withBusy('strutture', () => adapter().proposeStructures(state.input, seed));
  if (candidates) setState({ candidates, seed, step: 'strutture' });
}

async function buildPlan(structureId) {
  const plan = await withBusy('piano', () => adapter().generatePlan(state.input, structureId, state.seed));
  if (plan) setState({ plan, step: 'piano', tab: 'shotlist' });
}

async function regenerateShot(index) {
  const plan = await withBusy('shot', () => adapter().regenerateShot(state.plan, state.input, index));
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

  // i campi API servono solo ai provider automatici: restano nascosti per locale e ponte
  const keyFields = el('div', { class: 'key-fields' }, [
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label', text: 'API key' }),
      el('span', { class: 'field-hint', text: 'Resta solo nel tuo browser ed è leggibile da chi usa questo dispositivo. Per un uso condiviso, metti un tuo proxy nel campo endpoint e lascia vuota la chiave.' }),
      el('input', { type: 'password', name: 'apiKey', value: cfg.apiKey || '', autocomplete: 'off' }),
    ]),
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label', text: 'Modello (opzionale)' }),
      el('input', { type: 'text', name: 'model', value: cfg.model || '', placeholder: 'gpt-4o-mini · claude-opus-5' }),
    ]),
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label', text: 'Endpoint / proxy (opzionale)' }),
      el('input', { type: 'text', name: 'baseUrl', value: cfg.baseUrl || '', placeholder: 'https://tuo-proxy/api' }),
    ]),
  ]);
  const bridgeNote = el('p', { class: 'field-hint', text: 'Col ponte non serve nessuna chiave: l’app prepara il prompt, tu lo porti nella chat che già usi e riporti indietro la risposta.' });
  const syncKeys = (provider) => {
    const needsKey = provider === 'claude' || provider === 'openai';
    keyFields.style.display = needsKey ? '' : 'none';
    bridgeNote.style.display = provider === 'manual' ? '' : 'none';
  };

  // niente <form>: in sandbox il submit non arriva all'handler (vedi ui/roots.js)
  const val = (name) => String(dlg.querySelector(`[name="${name}"]`)?.value || '').trim();
  const save = () => {
    saveProviderConfig({
      provider: val('provider'),
      apiKey: val('apiKey'),
      model: val('model'),
      baseUrl: val('baseUrl'),
    });
    dlg.close();
    dlg.remove();
    notify('Provider aggiornato');
    render();
  };

  const dlg = el('dialog', { class: 'modal' }, [
    el('div', {}, [
      el('h2', { text: 'Motore di generazione' }),
      el('p', { class: 'muted', text: 'Qualunque sia il provider, i vincoli di ripresa restano del motore locale: durate, varietà di scale, alternanza dei movimenti e raccordi vengono ricalcolati e riparati qui. Il modello propone, il motore verifica.' }),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label', text: 'Provider' }),
        el('select', { name: 'provider', onchange: (e) => syncKeys(e.target.value) },
          PROVIDERS.map((p) => el('option', { value: p.id, selected: p.id === cfg.provider, text: p.label }))),
      ]),
      keyFields,
      bridgeNote,
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-ghost', type: 'button', text: 'Annulla', onclick: () => { dlg.close(); dlg.remove(); } }),
        el('button', { class: 'btn btn-primary', type: 'button', text: 'Salva', onclick: save }),
      ]),
    ]),
  ]);
  document.body.append(dlg);
  syncKeys(cfg.provider);
  dlg.showModal();
}

// --- render -----------------------------------------------------------------

function goHome() {
  setState({ step: 'radici', shooting: false });
}

async function newProject() {
  const ok = await askConfirm({
    title: 'Ricominciare da capo?',
    message: 'Il progetto corrente e il salvataggio nel browser vengono cancellati. Se vuoi tenerlo, esci da qui e salvalo prima con “Salva / Stampa”.',
    confirmLabel: 'Sì, azzera tutto',
    cancelLabel: 'No, torno indietro',
    danger: true,
  });
  if (!ok) return;
  resetAll();
  notify('Progetto azzerato');
}

function openExports() {
  openExportDialog({
    plan: state.plan,
    input: state.input,
    snapshot,
    notify,
    onImport: (obj) => {
      try {
        loadSnapshot(obj);
        notify('Progetto caricato');
      } catch (err) {
        notify(`File non valido: ${err.message}`);
      }
    },
  });
}

function renderToolbar() {
  clear(toolbar);
  const has = !!state.plan;
  const cfg = loadProviderConfig();
  const atHome = state.step === 'radici' && !state.shooting;

  toolbar.append(
    // il marchio e' anche la via di ritorno: e' il primo posto dove si clicca
    el('button', { class: 'brand', type: 'button', title: 'Torna alla prima schermata', onclick: goHome }, [
      el('span', { class: 'logo' }),
      el('div', {}, [
        el('strong', { text: 'PRISMA Story Engine' }),
        el('span', { class: 'muted', text: state.input.titolo || 'Reel senza titolo' }),
      ]),
    ]),
    el('div', { class: 'toolbar-actions no-print' }, [
      el('button', { class: 'btn btn-sm', type: 'button', text: '⌂ Inizio', disabled: atHome, onclick: goHome }),
      has && (state.step !== 'piano' || state.shooting)
        ? el('button', { class: 'btn btn-sm', type: 'button', text: 'Piano →', onclick: () => setState({ step: 'piano', shooting: false }) })
        : null,
      has && !state.shooting ? el('button', { class: 'btn btn-sm', type: 'button', text: '📱 Shooting', onclick: () => setState({ shooting: true }) }) : null,
      el('button', { class: 'btn btn-sm', type: 'button', text: '⤓ Salva / Stampa', onclick: openExports }),
      el('button', { class: 'btn btn-sm', type: 'button', text: `⚙ ${PROVIDER_LABELS[cfg.provider] || cfg.provider}`, onclick: openSettings }),
      el('button', { class: 'btn btn-sm btn-danger', type: 'button', text: 'Nuovo', onclick: newProject }),
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
      el('h2', {}, [
        state.plan.meta.strutturaNome,
        state.plan.meta.origine === 'ponte'
          ? el('span', { class: 'badge-inline', text: 'da ChatGPT' })
          : null,
      ]),
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
  view.append(head);

  // esito del ponte: si vede una volta, poi si chiude
  const report = bridgeReportBox(state.plan.meta.bridgeReport);
  if (report) {
    report.append(el('button', {
      class: 'btn btn-ghost btn-sm no-print', type: 'button', text: 'Ho capito, chiudi',
      onclick: () => setState({ plan: { ...state.plan, meta: { ...state.plan.meta, bridgeReport: null } } }),
    }));
    view.append(report);
  }

  view.append(tabBar, panel);

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

  if (state.step === 'radici') {
    renderRoots(view, {
      input: state.input,
      onChange: (patch) => {
        Object.assign(state.input, patch);
        persist();
        if ('titolo' in patch) renderToolbar();
      },
      onNext: () => setState({ step: 'wizard' }),
    });
    return;
  }

  if (state.step === 'wizard') {
    wizardApi = renderWizard(view, {
      input: state.input,
      onBack: () => setState({ step: 'radici' }),
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
  else setState({ step: 'radici' });
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
