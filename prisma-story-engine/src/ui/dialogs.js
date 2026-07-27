// Dialoghi propri, non quelli del browser.
// window.confirm e window.alert vengono ignorati quando la pagina gira dentro un
// iframe con sandbox (per esempio pubblicata online): il pulsante sembra rotto
// mentre in realta' la domanda non e' mai apparsa. Un <dialog> funziona ovunque.

import { el } from '../util/dom.js';

/** @returns {Promise<boolean>} */
export function askConfirm({ title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.remove();
      resolve(v);
    };

    const dlg = el('dialog', { class: 'modal' }, [
      el('h2', { text: title }),
      message ? el('p', { class: 'muted', text: message }) : null,
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-ghost', type: 'button', text: cancelLabel, onclick: () => finish(false) }),
        el('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, type: 'button', text: confirmLabel, onclick: () => finish(true) }),
      ]),
    ]);

    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(false); });
    document.body.append(dlg);
    dlg.showModal();
  });
}

/** Messaggio senza scelte, al posto di alert(). */
export function showMessage({ title, message }) {
  return askConfirm({ title, message, confirmLabel: 'Ho capito', cancelLabel: 'Chiudi' });
}

/**
 * Copia negli appunti, con ripiego sulla selezione manuale quando l'API non c'e'
 * (succede fuori da https, o in un iframe senza permessi).
 * @returns {Promise<boolean>} true se gli appunti hanno funzionato
 */
export async function copyText(text, fallbackField = null) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackField) {
      fallbackField.focus();
      fallbackField.select();
    }
    return false;
  }
}

/**
 * Ultima spiaggia per un file: se il download non parte (iframe senza permesso di
 * scaricare), il contenuto resta comunque raggiungibile — selezionabile e copiabile.
 */
export function showTextFile({ title, note, name, content, onDownload }) {
  const box = el('textarea', { class: 'bridge-prompt', rows: 8, readonly: true, spellcheck: 'false' }, content);
  const hint = el('p', { class: 'field-hint', text: note || '' });

  const dlg = el('dialog', { class: 'modal modal-wide' }, [
    el('h2', { text: title }),
    hint,
    box,
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn btn-ghost', type: 'button', text: 'Copia tutto',
        onclick: async (e) => {
          const ok = await copyText(content, box);
          e.target.textContent = ok ? '✓ Copiato' : 'Selezionato: ⌘C';
        },
      }),
      onDownload ? el('button', {
        class: 'btn btn-ghost', type: 'button', text: `Riprova a scaricare ${name}`,
        onclick: () => onDownload(),
      }) : null,
      el('button', { class: 'btn btn-primary', type: 'button', text: 'Chiudi', onclick: () => { dlg.close(); dlg.remove(); } }),
    ]),
  ]);

  dlg.addEventListener('cancel', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}
