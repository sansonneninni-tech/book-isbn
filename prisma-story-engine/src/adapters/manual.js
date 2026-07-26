// Adapter "ponte": stessa interfaccia degli altri, ma al posto della rete c'e' un
// passaggio manuale. Il modello propone la beat map, il motore locale applica
// comunque durate, colori, scale, movimenti, raccordi e riparazione dei vincoli.

import { localAdapter } from './local.js';
import { generatePlan } from '../engine/generator.js';
import { buildBridgePrompt, extractJson, normalizeAiPlan, suggestedShotCount } from '../engine/ai-plan.js';
import { getStructure } from '../engine/structures.js';

/**
 * @param {{requestPaste: (ctx:Object)=>Promise<string|null>}} deps
 */
export function makeManualAdapter(deps = {}) {
  return {
    id: 'manual',
    label: 'ChatGPT / Claude via copia-incolla',
    requiresKey: false,
    configured: true,

    async proposeStructures(input, seed) {
      return localAdapter.proposeStructures(input, seed);
    },

    async generatePlan(input, structureId, seed) {
      if (typeof deps.requestPaste !== 'function') {
        return localAdapter.generatePlan(input, structureId, seed);
      }

      const prompt = buildBridgePrompt(input, structureId);
      const pasted = await deps.requestPaste({
        prompt,
        shotCount: suggestedShotCount(input),
        structureName: getStructure(structureId).name,
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

    // la rigenerazione del singolo shot resta locale: sul set non si aspetta
    async regenerateShot(plan, input, index) {
      return localAdapter.regenerateShot(plan, input, index);
    },
  };
}
