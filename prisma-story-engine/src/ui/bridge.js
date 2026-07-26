// Ponte copia-incolla verso ChatGPT (o qualunque altra chat).
// Nessuna rete: il prompt esce dagli appunti, la risposta rientra da una textarea.

import { el, clear } from '../util/dom.js';
import { extractJson } from '../engine/ai-plan.js';

/**
 * Apre il modale e risolve con il testo incollato, o con null se si annulla.
 * @returns {Promise<string|null>}
 */
export function openBridge({ prompt, shotCount, structureName }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.remove();
      resolve(value);
    };

    const promptBox = el('textarea', { class: 'bridge-prompt', rows: 6, readonly: true, spellcheck: 'false' }, prompt);
    const copyBtn = el('button', { class: 'btn btn-primary', type: 'button', text: '1 · Copia il prompt' });
    const copyHint = el('p', { class: 'field-hint' });

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(prompt);
        copyBtn.textContent = '✓ Copiato';
        copyHint.textContent = 'Incollalo in ChatGPT, poi torna qui con la risposta.';
        setTimeout(() => { copyBtn.textContent = '1 · Copia il prompt'; }, 2500);
      } catch {
        promptBox.focus();
        promptBox.select();
        copyHint.textContent = 'Gli appunti non sono accessibili qui: il testo è selezionato, copialo con Ctrl+C (o ⌘C).';
      }
    });

    const answer = el('textarea', {
      class: 'bridge-answer', rows: 5, spellcheck: 'false',
      placeholder: 'Incolla qui la risposta di ChatGPT (il JSON, anche con del testo attorno)',
    });
    const status = el('p', { class: 'bridge-status', text: 'In attesa della risposta…' });
    const applyBtn = el('button', { class: 'btn btn-primary', type: 'button', text: '2 · Applica al piano', disabled: true });

    answer.addEventListener('input', () => {
      const text = answer.value.trim();
      if (!text) {
        status.className = 'bridge-status';
        status.textContent = 'In attesa della risposta…';
        applyBtn.disabled = true;
        return;
      }
      const data = extractJson(text);
      const shots = Array.isArray(data?.shots) ? data.shots : Array.isArray(data) ? data : null;
      if (!shots) {
        status.className = 'bridge-status is-bad';
        status.textContent = 'Non trovo un JSON valido. Copia tutta la risposta, comprese le parentesi graffe.';
        applyBtn.disabled = true;
        return;
      }
      status.className = 'bridge-status is-good';
      status.textContent = `Trovate ${shots.length} inquadrature${shots.length === shotCount ? '' : ` (ne erano state chieste ${shotCount})`}. Puoi applicare.`;
      applyBtn.disabled = false;
    });

    applyBtn.addEventListener('click', () => finish(answer.value));

    const dlg = el('dialog', { class: 'modal modal-wide bridge' }, [
      el('header', { class: 'bridge-head' }, [
        el('h2', { text: 'Ponte copia-incolla' }),
        el('p', { class: 'muted', text: `Struttura “${structureName}” · ${shotCount} inquadrature richieste. Nessun dato esce da qui: sei tu a portare il prompt nella chat.` }),
      ]),

      el('section', { class: 'bridge-step' }, [
        el('h3', { text: 'Porta il prompt in ChatGPT' }),
        promptBox,
        el('div', { class: 'bridge-actions' }, [
          copyBtn,
          el('a', { class: 'btn btn-ghost', href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer', text: 'Apri ChatGPT ↗' }),
        ]),
        copyHint,
      ]),

      el('section', { class: 'bridge-step' }, [
        el('h3', { text: 'Riporta indietro la risposta' }),
        answer,
        status,
      ]),

      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-ghost', type: 'button', text: 'Annulla e usa il motore locale', onclick: () => finish(null) }),
        applyBtn,
      ]),
    ]);

    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); });
    document.body.append(dlg);
    dlg.showModal();
    answer.focus();
  });
}

/** Riquadro che riassume cosa è stato accettato, corretto o ignorato. */
export function bridgeReportBox(report) {
  if (!report || !report.length) return null;
  return el('div', { class: 'card bridge-report' }, [
    el('h3', { text: 'Cosa ho fatto della risposta di ChatGPT' }),
    el('ul', {}, report.map((r) => el('li', { class: `report-${r.level}`, text: r.msg }))),
  ]);
}
