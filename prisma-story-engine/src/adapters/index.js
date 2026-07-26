// Selezione del provider. Il locale e' sempre disponibile; gli altri si attivano
// solo quando c'e' una configurazione, e in caso di errore ricadono sul locale.

import { localAdapter } from './local.js';
import { makeClaudeAdapter } from './claude.js';
import { makeOpenAIAdapter } from './openai.js';

const STORAGE_KEY = 'prisma.provider.v1';

export function loadProviderConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { provider: 'local' };
  } catch {
    return { provider: 'local' };
  }
}

export function saveProviderConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function getAdapter(cfg = loadProviderConfig()) {
  switch (cfg.provider) {
    case 'claude':
      return makeClaudeAdapter(cfg);
    case 'openai':
      return makeOpenAIAdapter(cfg);
    default:
      return localAdapter;
  }
}

export const PROVIDERS = [
  { id: 'local', label: 'Motore locale — nessuna rete, deterministico' },
  { id: 'claude', label: 'Claude API — riscrive soggetti e funzioni' },
  { id: 'openai', label: 'OpenAI API — riscrive soggetti e funzioni' },
];
