// Adapter locale: il motore deterministico. E' il default e non richiede rete.
// Definisce l'interfaccia che ogni altro provider deve rispettare.

import { proposeStructures, generatePlan, regenerateShot } from '../engine/generator.js';

export const localAdapter = {
  id: 'local',
  label: 'Motore locale (deterministico)',
  requiresKey: false,

  async proposeStructures(input, seed) {
    return proposeStructures(input, seed);
  },

  async generatePlan(input, structureId, seed) {
    return generatePlan(input, structureId, seed);
  },

  async regenerateShot(plan, input, index) {
    return regenerateShot(plan, input, index, Date.now());
  },
};
