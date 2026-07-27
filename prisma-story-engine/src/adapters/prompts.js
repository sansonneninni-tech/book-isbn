// Prompt condivisi dagli adapter LLM.
// Principio: il modello NON inventa la struttura. La grammatica (durate, scale,
// movimenti, arco cromatico, raccordi) resta deterministica; al modello si chiede
// solo di rendere concreti soggetto, funzione e alternativa sul materiale reale.

export const SYSTEM = `Sei un direttore della fotografia e story editor specializzato in reel verticali 9:16 di natura artistica e astratta.
Lavori su una struttura gia' decisa: NON puoi cambiare numero di inquadrature, durate, scale, movimenti macchina, colori o atti.
Il tuo compito e' rendere ogni inquadratura girabile davvero, con i materiali che l'autore ha a disposizione.
Scrivi in italiano, concreto e asciutto, senza aggettivi decorativi. Niente riferimenti a persone se l'autore ha indicato che non ce ne sono.
Rispondi SOLO con JSON valido, senza testo attorno e senza blocchi di codice.`;

export function enrichPrompt(input, plan) {
  const shots = plan.shots.map((s) => ({
    n: s.n,
    funzione: s.funzione,
    scala: s.scala.label,
    movimento: s.movimento.label,
    durata: s.durata,
    luce: s.luce,
    colore: s.colore.nome,
    materiale: s.materiale,
  }));

  return `IDEA: ${input.idea || '(non specificata)'}
EMOZIONE: da "${input.emozioneIniziale}" a "${input.emozioneFinale}"
MATERIALI DISPONIBILI: ${input.materiali || '(nessuno indicato)'}
PERSONE IN CAMPO: ${input.persone ? 'si' : 'no'}
STRUTTURA SCELTA: ${plan.meta.strutturaNome} — ${plan.meta.tagline}
DURATA TOTALE: ${plan.meta.durata}s, ritmo ${plan.meta.ritmo}

Per ognuna delle ${shots.length} inquadrature qui sotto, riscrivi:
- "soggetto": cosa inquadri esattamente, con i materiali disponibili (una frase, massimo 18 parole)
- "funzione": a cosa serve narrativamente QUESTA inquadratura in QUESTA struttura (una frase, massimo 16 parole)
- "alternativa": un modo diverso di riprendere lo stesso beat se sul posto non funziona (una frase)

Rispetta scala, movimento, durata, luce e colore indicati: sono vincoli, non suggerimenti.

INQUADRATURE:
${JSON.stringify(shots, null, 1)}

Formato di risposta:
{"shots":[{"n":1,"soggetto":"...","funzione":"...","alternativa":"..."}]}`;
}

export function structuresPrompt(input, candidates) {
  return `IDEA: ${input.idea || '(non specificata)'}
EMOZIONE: da "${input.emozioneIniziale}" a "${input.emozioneFinale}"
MATERIALI: ${input.materiali || '(nessuno)'}
PALETTE: da ${input.paletteIniziale} a ${input.paletteFinale}
LUCE: ${input.lightArc}
RITMO: ${input.ritmo}, DURATA: ${input.durata}s, PERSONE: ${input.persone ? 'si' : 'no'}

Queste tre strutture narrative sono state preselezionate:
${candidates.map((c) => `- ${c.id}: ${c.name} — ${c.tagline}`).join('\n')}

Per ognuna scrivi 2 motivi specifici e concreti per cui funziona con QUESTA idea e QUESTI materiali.
Cita elementi reali dell'idea. Vietato generico ("crea atmosfera", "coinvolge lo spettatore").

Formato: {"strutture":[{"id":"...","reasons":["...","..."]}]}`;
}

/** Applica la riscrittura del modello al piano, ignorando campi non previsti. */
export function mergeEnrichment(plan, data) {
  if (!data || !Array.isArray(data.shots)) return plan;
  const byN = new Map(data.shots.map((s) => [Number(s.n), s]));
  return {
    ...plan,
    shots: plan.shots.map((s) => {
      const patch = byN.get(s.n);
      if (!patch) return s;
      return {
        ...s,
        soggetto: typeof patch.soggetto === 'string' && patch.soggetto.trim() ? patch.soggetto.trim() : s.soggetto,
        funzione: typeof patch.funzione === 'string' && patch.funzione.trim() ? patch.funzione.trim() : s.funzione,
        alternativa: typeof patch.alternativa === 'string' && patch.alternativa.trim() ? patch.alternativa.trim() : s.alternativa,
      };
    }),
  };
}

export function parseJson(text) {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
  }
}
