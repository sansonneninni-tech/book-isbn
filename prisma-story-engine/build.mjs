// Build single-file: impacchetta moduli ES e CSS in un unico .html apribile
// senza server (utile per il telefono sul set, o per un deploy statico).
//
//   node build.mjs [dist/prisma-story-engine.html]
//
// Non e' un bundler generico: gestisce le sole forme usate in questo progetto
// (import nominali su una riga, export di function/const, nessun default).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ENTRY = resolve(ROOT, 'src/main.js');
const OUT = resolve(ROOT, process.argv[2] || 'dist/prisma-story-engine.html');

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm;

const modules = new Map(); // path assoluto -> { id, code, exports, deps }
const order = [];

function idOf(path) {
  return relative(ROOT, path).replace(/\\/g, '/');
}

function load(path) {
  if (modules.has(path)) return;
  const src = readFileSync(path, 'utf8');
  const deps = [];

  let code = src.replace(IMPORT_RE, (_, names, spec) => {
    const dep = resolve(dirname(path), spec);
    deps.push(dep);
    return `const { ${names.trim().replace(/\s+/g, ' ')} } = __req(${JSON.stringify(idOf(dep))});`;
  });

  const exports = [];
  code = code.replace(/^export\s+(async\s+)?function\s+([\w$]+)/gm, (_, asy, name) => {
    exports.push(name);
    return `${asy || ''}function ${name}`;
  });
  code = code.replace(/^export\s+(const|let|var)\s+([\w$]+)/gm, (_, kind, name) => {
    exports.push(name);
    return `${kind} ${name}`;
  });
  if (/^export\s/m.test(code)) {
    throw new Error(`Forma di export non gestita in ${idOf(path)}`);
  }

  modules.set(path, { id: idOf(path), code, exports, deps });
  deps.forEach(load);
  order.push(path); // post-order: le dipendenze vengono definite prima
}

load(ENTRY);

const registry = order.map((path) => {
  const m = modules.get(path);
  return `__def(${JSON.stringify(m.id)}, function (__req) {\n${m.code}\nreturn { ${m.exports.join(', ')} };\n});`;
}).join('\n\n');

// Foglio di stile del solo messaggio di avvio fallito: non sta nei css del
// progetto perche' deve funzionare anche quando non funziona nient'altro.
const bootCss = `
#boot {
  position: relative; z-index: 2;
  max-width: 620px; margin: 12vh auto; padding: 26px 24px;
  border: 1px solid #262c3d; border-radius: 14px; background: #161a26;
  font: 16px/1.55 ui-sans-serif, -apple-system, "Segoe UI", sans-serif; color: #eceef5;
}
#boot h1 { font-size: 1.2rem; margin: 0 0 12px; color: #e0a24a; }
#boot p { margin: 0 0 10px; color: #c6cbdb; }
#boot #boot-err:empty { display: none; }
#boot #boot-err { font-family: ui-monospace, Menlo, monospace; font-size: .82rem; color: #e8b84b; }
`;

const css = ['styles/base.css', 'styles/components.css']
  .map((f) => readFileSync(resolve(ROOT, f), 'utf8'))
  .join('\n');
const printCss = readFileSync(resolve(ROOT, 'styles/print.css'), 'utf8');

// Il charset va dichiarato dentro il file: aperto con un doppio clic (file://)
// non c'e' nessun header HTTP a dirlo, e senza questa riga gli accenti e le
// virgolette italiane diventano "Ã¨" e "â€™".
const html = `<!doctype html>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="color-scheme" content="dark light" />
<title>PRISMA Story Engine</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><polygon points='16,3 29,27 3,27' fill='none' stroke='%23e0a24a' stroke-width='2.5'/></svg>" />
<style>
${css}
${bootCss}
@media print {
${printCss}
}
</style>

<header id="toolbar" class="toolbar"></header>
<main id="view" class="view"></main>
<div id="toast" class="toast" role="status" aria-live="polite"></div>

<!-- Se il programma non parte, la pagina resterebbe nera e muta: questo blocco
     e' visibile finche' l'avvio non riesce, e viene rimosso appena riesce. -->
<div id="boot">
  <h1>PRISMA Story Engine</h1>
  <p>Il file si è aperto, ma il programma dentro non è partito.</p>
  <p>Quasi sempre è perché il download si è interrotto e il file è arrivato incompleto: <strong>riscaricalo</strong> e riapri. Se non basta, apri la versione online, che è identica.</p>
  <p id="boot-err"></p>
</div>

<script>
(function () {
  var __mods = {}, __cache = {};
  function __def(id, factory) { __mods[id] = factory; }
  function __req(id) {
    if (!(id in __cache)) {
      if (!__mods[id]) throw new Error('Modulo non trovato: ' + id);
      __cache[id] = __mods[id](__req);
    }
    return __cache[id];
  }

${registry}

  try {
    __req(${JSON.stringify(idOf(ENTRY))});
    var boot = document.getElementById('boot');
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
  } catch (err) {
    var out = document.getElementById('boot-err');
    if (out) out.textContent = 'Dettaglio tecnico: ' + ((err && err.message) || err);
    throw err;
  }
})();
</script>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`${idOf(OUT)} — ${modules.size} moduli, ${(html.length / 1024).toFixed(1)} kB`);
