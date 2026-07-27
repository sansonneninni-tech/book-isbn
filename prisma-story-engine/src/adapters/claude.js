// Adapter Claude API. Disattivato finche' non viene configurata una chiave.
// La struttura resta deterministica: il modello arricchisce solo il linguaggio.

import { localAdapter } from './local.js';
import { SYSTEM, enrichPrompt, structuresPrompt, mergeEnrichment, parseJson } from './prompts.js';

const DEFAULT_MODEL = 'claude-sonnet-5';

async function callClaude(config, prompt) {
  const endpoint = config.baseUrl || 'https://api.anthropic.com/v1/messages';
  const headers = { 'content-type': 'application/json' };
  // Se punti a un tuo proxy, la chiave resta sul server e questi header non servono.
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model || DEFAULT_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return parseJson(text);
}

export function makeClaudeAdapter(config = {}) {
  return {
    id: 'claude',
    label: 'Claude API (arricchisce la struttura locale)',
    requiresKey: true,
    configured: !!(config.apiKey || config.baseUrl),

    async proposeStructures(input, seed) {
      const base = await localAdapter.proposeStructures(input, seed);
      try {
        const data = await callClaude(config, structuresPrompt(input, base));
        if (!data || !Array.isArray(data.strutture)) return base;
        const byId = new Map(data.strutture.map((s) => [s.id, s]));
        return base.map((b) => {
          const patch = byId.get(b.id);
          const reasons = patch && Array.isArray(patch.reasons) ? patch.reasons.filter((r) => typeof r === 'string') : null;
          return reasons && reasons.length ? { ...b, reasons } : b;
        });
      } catch (err) {
        console.warn('[claude] fallback al motore locale:', err.message);
        return base;
      }
    },

    async generatePlan(input, structureId, seed) {
      const plan = await localAdapter.generatePlan(input, structureId, seed);
      try {
        return mergeEnrichment(plan, await callClaude(config, enrichPrompt(input, plan)));
      } catch (err) {
        console.warn('[claude] fallback al motore locale:', err.message);
        return plan;
      }
    },

    async regenerateShot(plan, input, index) {
      return localAdapter.regenerateShot(plan, input, index);
    },
  };
}
