// Adapter "ponte": stessa interfaccia degli altri, ma al posto della rete c'e' un
// passaggio manuale. Il modello propone la beat map, il motore locale applica
// comunque durate, colori, scale, movimenti, raccordi e riparazione dei vincoli.

import { localAdapter } from './local.js';
import { generatePlan, regenerateShot } from '../engine/generator.js';
import { buildBridgePrompt, buildShotPrompt, extractJson, normalizeAiPlan, normalizeAiShot, suggestedShotCount } from '../engine/ai-plan.js';
import { getStructure } from '../engine/structures.js';

/**
 * @param {{requestPaste: (ctx:Object)=>Promise<string|null>}} deps
 */
export function makeManualAdapter(deps = {}) {
  const canAsk = () => typeof deps.requestPaste === 'function';

  return {
    id: 'manual',
    label: 'ChatGPT / Claude via copia-incolla',
    requiresKey: false,
    configured: true,

    async proposeStructures(input, seed) {
      return localAdapter.proposeStructures(input, seed);
    },

    async generatePlan(input, structureId, seed) {
      if (!canAsk()) return localAdapter.generatePlan(input, structureId, seed);

      const n = suggestedShotCount(input);
      const pasted = await deps.requestPaste({
        prompt: buildBridgePrompt(input, structureId),
        title: 'Ponte copia-incolla — piano completo',
        subtitle: `Struttura “${getStructure(structureId).name}” · ${n} inquadrature richieste. Nessun dato esce da qui: sei tu a portare il prompt nella chat.`,
        applyLabel: '2 · Applica al piano',
        validate: (text) => {
          const data = extractJson(text);
          const shots = Array.isArray(data?.shots) ? data.shots : Array.isArray(data) ? data : null;
          if (!shots) return { ok: false, msg: 'Non trovo un JSON valido. Copia tutta la risposta, comprese le parentesi graffe.' };
          return {
            ok: true,
            msg: `Trovate ${shots.length} inquadrature${shots.length === n ? '' : ` (ne erano state chieste ${n})`}. Puoi applicare.`,
          };
        },
      });

      // annullato: si procede col motore locale, senza penalizzare l'utente
      if (pasted == null) return localAdapter.generatePlan(input, structureId, seed);

      const normalized = normalizeAiPlan(extractJson(pasted), input, structureId);
      if (!normalized) {
        const plan = await localAdapter.generatePlan(input, structureId, seed);
        plan.meta.origine = 'locale';
        plan.meta.bridgeReport = [{
          level: 'warn',
          msg: 'La risposta non conteneva una beat map leggibile: il piano è stato costruito dal motore locale.',
        }];
        return plan;
      }

      const plan = generatePlan(input, structureId, seed, {
        beats: normalized.beats,
        texts: normalized.texts,
      });
      plan.meta.origine = 'ponte';
      plan.meta.bridgeReport = normalized.report;
      return plan;
    },

    /**
     * Anche la singola inquadratura passa dal ponte: e' il punto in cui si sente
     * di piu' la differenza fra "un'altra combinazione" e "un'altra idea".
     * Chi ha fretta annulla e ottiene la rigenerazione locale, istantanea.
     */
    async regenerateShot(plan, input, index) {
      if (!canAsk()) return localAdapter.regenerateShot(plan, input, index);

      const shot = plan.shots[index];
      const pasted = await deps.requestPaste({
        prompt: buildShotPrompt(input, plan, index),
        title: `Ponte copia-incolla — inquadratura ${shot.n}`,
        subtitle: `Solo questa inquadratura. Durata (${shot.durata}s), colore e posizione nel racconto restano come sono: cambia il modo di riprenderla.`,
        applyLabel: 'Applica a questa inquadratura',
        cancelLabel: 'Annulla e rigenera in locale',
        validate: (text) => {
          const res = normalizeAiShot(extractJson(text), plan, index);
          if (!res) return { ok: false, msg: 'Non trovo un JSON valido. Copia tutta la risposta, comprese le parentesi graffe.' };
          return {
            ok: true,
            msg: res.soggetto ? `Trovato: «${res.soggetto}». Puoi applicare.` : 'Risposta leggibile, ma senza soggetto: il resto lo completa il motore.',
          };
        },
      });

      if (pasted == null) return localAdapter.regenerateShot(plan, input, index);

      const ai = normalizeAiShot(extractJson(pasted), plan, index);
      if (!ai) {
        const fallback = regenerateShot(plan, input, index, Date.now());
        fallback.meta = {
          ...fallback.meta,
          bridgeReport: [{ level: 'warn', msg: `Inquadratura ${shot.n}: risposta illeggibile, rigenerata dal motore locale.` }],
        };
        return fallback;
      }

      const next = regenerateShot(plan, input, index, Date.now(), ai);
      next.meta = {
        ...next.meta,
        bridgeReport: [
          { level: 'ok', msg: `Inquadratura ${shot.n} riscritta da ChatGPT. Durata, colore e funzione nel racconto sono rimasti quelli del piano.` },
          ...(ai.report || []),
        ],
      };
      return next;
    },
  };
}
