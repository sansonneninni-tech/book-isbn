// Adapter OpenAI, stessa interfaccia dell'adapter Claude.

import { localAdapter } from './local.js';
import { SYSTEM, enrichPrompt, structuresPrompt, mergeEnrichment, parseJson } from './prompts.js';

const DEFAULT_MODEL = 'gpt-4o-mini';

async function callOpenAI(config, prompt) {
  const endpoint = config.baseUrl || 'https://api.openai.com/v1/chat/completions';
  const headers = { 'content-type': 'application/json' };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parseJson(data.choices?.[0]?.message?.content);
}

export function makeOpenAIAdapter(config = {}) {
  return {
    id: 'openai',
    label: 'OpenAI API (arricchisce la struttura locale)',
    requiresKey: true,
    configured: !!(config.apiKey || config.baseUrl),

    async proposeStructures(input, seed) {
      const base = await localAdapter.proposeStructures(input, seed);
      try {
        const data = await callOpenAI(config, structuresPrompt(input, base));
        if (!data || !Array.isArray(data.strutture)) return base;
        const byId = new Map(data.strutture.map((s) => [s.id, s]));
        return base.map((b) => {
          const patch = byId.get(b.id);
          const reasons = patch && Array.isArray(patch.reasons) ? patch.reasons.filter((r) => typeof r === 'string') : null;
          return reasons && reasons.length ? { ...b, reasons } : b;
        });
      } catch (err) {
        console.warn('[openai] fallback al motore locale:', err.message);
        return base;
      }
    },

    async generatePlan(input, structureId, seed) {
      const plan = await localAdapter.generatePlan(input, structureId, seed);
      try {
        return mergeEnrichment(plan, await callOpenAI(config, enrichPrompt(input, plan)));
      } catch (err) {
        console.warn('[openai] fallback al motore locale:', err.message);
        return plan;
      }
    },

    async regenerateShot(plan, input, index) {
      return localAdapter.regenerateShot(plan, input, index);
    },
  };
}
