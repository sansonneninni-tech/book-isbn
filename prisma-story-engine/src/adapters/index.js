// Selezione del provider. Il locale e' sempre disponibile; il ponte copia-incolla
// non richiede ne' rete ne' chiave; gli adapter API si attivano solo quando c'e'
// una configurazione, e in caso di errore ricadono sul locale.

import { localAdapter } from './local.js';
import { makeManualAdapter } from './manual.js';
import { makeClaudeAdapter } from './claude.js';
import { makeOpenAIAdapter } from './openai.js';

const STORAGE_KEY = 'prisma.provider.v1';

export function loadProviderConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || memoryConfig || { provider: 'local' };
  } catch {
    return memoryConfig || { provider: 'local' };
  }
}

let memoryConfig = null;

export function saveProviderConfig(cfg) {
  memoryConfig = cfg;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.warn('Provider non salvato in locale:', err.message);
  }
}

/**
 * @param {Object} cfg configurazione salvata
 * @param {Object} deps dipendenze UI (requestPaste per il ponte)
 */
export function getAdapter(cfg = loadProviderConfig(), deps = {}) {
  switch (cfg.provider) {
    case 'manual':
      return makeManualAdapter(deps);
    case 'claude':
      return makeClaudeAdapter(cfg);
    case 'openai':
      return makeOpenAIAdapter(cfg);
    default:
      return localAdapter;
  }
}

export const PROVIDERS = [
  { id: 'local', label: 'Motore locale — istantaneo, offline, gratis' },
  { id: 'manual', label: 'ChatGPT via copia-incolla — gratis, due passaggi manuali' },
  { id: 'openai', label: 'OpenAI API — automatico, a consumo' },
  { id: 'claude', label: 'Claude API — automatico, a consumo' },
];

export const PROVIDER_LABELS = {
  local: 'Locale',
  manual: 'Ponte',
  openai: 'OpenAI',
  claude: 'Claude',
};
