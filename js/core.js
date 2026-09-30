/* BreedingPro — global state and shared utilities.
   No ES modules: everything hangs from window so the app also works when
   index.html is opened with a double click (file://). */

const state = {
  /* --- Block 3: data --- */
  fileName: null,
  data: null,        // analysis-ready dataset, read by every analysis block
  /* --- results, one slot per block --- */
  plan: null,        // Block 2: crossing plan and field layout
  griffing: null,    // Block 4
  hayman: null,      // Block 5
  mating: null,      // Block 6
  generations: null, // Block 7
  selection: null,   // Block 8
  gxe: null,         // Block 9
  mixed: null,       // Block 10
  genomic: null,     // Block 11
  figures: {},       // every figure registered for the report and the ZIP
};
window.state = state;

/* the twelve blocks of the app, in navigation order */
const STEPS = [
  { n: 1, es: 'Inicio', en: 'Home', ready: true },
  { n: 2, es: 'Planear', en: 'Plan', ready: true },
  { n: 3, es: 'Datos', en: 'Data', ready: true },
  { n: 4, es: 'Griffing', en: 'Griffing', ready: true },
  { n: 5, es: 'Hayman–Jinks', en: 'Hayman–Jinks', ready: true },
  { n: 6, es: 'Apareamiento', en: 'Mating designs', ready: true },
  { n: 7, es: 'Generaciones', en: 'Generations', ready: true },
  { n: 8, es: 'Selección', en: 'Selection', ready: true },
  { n: 9, es: 'G×A', en: 'G×E', ready: true },
  { n: 10, es: 'BLUP', en: 'BLUP', ready: true },
  { n: 11, es: 'Genómica', en: 'Genomics', ready: true },
  { n: 12, es: 'Informe', en: 'Report', ready: true },
];

/* ---------------- DOM ---------------- */
function el(id) { return document.getElementById(id); }
function els(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function mk(tag, attrs, html) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.setAttribute('style', attrs[k]);
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* bilingual inline HTML: both spans are written, CSS shows the active one */
function L2(es, en) { return `<span data-l="es">${es}</span><span data-l="en">${en}</span>`; }
/* Labels shown in capitals would turn σ into Σ (a sum) and h² into H² (another heritability):
   Greek letters, symbols with a superscript or subscript and bracketed parameters keep their
   own case inside an uppercase label. */
function keepGreek(s) {
  return String(s).replace(/([Ͱ-Ͽ][²³₀-₉]*[A-Za-z]{0,3}|[A-Za-z][²³₀-₉]+|\[[a-z]\])/g, '<span class="nc">$1</span>');
}
function svgEl(tag, attrs, text) {
  const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}
/* Waiting window of the LABG Suite: bpWork opens it (it only shows up when the
   wait lasts more than 300 ms) and bpAfterPaint lets it paint, runs the task
   (synchronous or async) and closes it with the check mark, or quietly when the
   task failed. The tests load core.js without labg-core.js: everything is
   guarded with window.LABG. */
function bpWork(es, en) { if (!window.LABG || !LABG.work) return null; const w = LABG.work({ title: LABG.t(es, en || es), delay: 300 }); bpWork.current = w; return w; }
bpWork.current = null;
function bpAfterPaint(f, w) {
  const done = () => { if (bpWork.current === w) bpWork.current = null; if (w && !w.ended) { if (w._failed) w.close(); else w.done(); } };
  return (window.LABG ? LABG.nextPaint() : new Promise(r => setTimeout(r, 30))).then(f).then(done, e => { console.error(e); if (w) w._failed = true; done(); });
}
function showMessage(container, type, text) {
  if (type === 'error' && bpWork.current) bpWork.current._failed = true;
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  const div = mk('div', { class: 'msg msg-' + type }, text);
  /* errors and warnings are announced to screen readers */
  if (window.LABG) LABG.messageRole(div, type);
  container.appendChild(div);
  return div;
}
function clearMessages(container) {
  if (typeof container === 'string') container = el(container);
  if (container) container.innerHTML = '';
}

/* ---------------- numbers ----------------
   Numbers use the decimal point in both languages (the convention of the
   scientific literature in Mexico and in English). */
function fmtNum(v, d) {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 1e-4 || abs >= 1e7) { const e = n.toExponential(d != null ? d : 2); return e.startsWith('-') ? '−' + e.slice(1) : e; }
  const s = n.toLocaleString('en-US', { maximumFractionDigits: d != null ? d : 3 });
  if (/^-0(\.0*)?$/.test(s)) return s.slice(1);   /* a negative value that rounds to zero loses its sign */
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}
function fmtFixed(v, d) {
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  if (v == null || !isFinite(v)) return '—';
  const s = Number(v).toFixed(d == null ? 3 : d);
  if (/^-0(\.0*)?$/.test(s)) return s.slice(1);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}
function fmtP(p) {
  if (p == null || !isFinite(p)) return '—';
  if (p < 0.0001) return '< 0.0001';
  return Number(p).toFixed(4);
}
/* "p = 0.0123" or "p < 0.0001": the sign that goes with the value */
function pEq(p) { const s = fmtP(p); return s.startsWith('<') ? 'p ' + s : 'p = ' + s; }
function stars(p) {
  if (p == null || !isFinite(p)) return '';
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'ns';
}
/* "1 localidad", "2 localidades" */
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
/* h with a bar (Gardner & Eberhart's average heterosis): fonts draw a combining macron across the ascender of h,
   so it is an overline in HTML; the hidden combining macron keeps "h̄" in copied text and exported tables */
const HBAR = '<span class="ovl">h</span><span class="sr-only">̄</span>';

function fmtPct(x, d) {
  if (x == null || !isFinite(x)) return '—';
  const s = (x * 100).toLocaleString('en-US', { maximumFractionDigits: d == null ? 1 : d }) + '%';
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

/* ---------------- CSV / downloads ---------------- */
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slug(s) {
  return String(s || 'breedingpro').replace(/\.[a-z0-9]{1,5}$/i, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'breedingpro';
}

/* ---------------- step navigation ---------------- */
function goStep(n) {
  n = String(n);
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === n));
  document.body.classList.toggle('on-home', n === '1');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const btn = document.querySelector('.step-btn[data-step="' + n + '"]');
  if (window.LABG) {
    /* active block (aria-current), brought into view, and said aloud */
    LABG.setCurrentStep(n);
    if (btn) LABG.announce(T('Bloque ', 'Block ') + n + ': ' + stepName(n));
  } else if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  document.dispatchEvent(new CustomEvent('stepchange', { detail: { step: Number(n) } }));
  refreshStepMarks();
}
function enableStep(n, on) {
  const b = document.querySelector('.step-btn[data-step="' + n + '"]');
  if (b) b.disabled = (on === false);
  refreshStepMarks();
}
/* name of a block in the active language */
function stepName(n) {
  const s = STEPS.find(x => String(x.n) === String(n));
  return s ? T(s.es, s.en) : '';
}

/* A block is marked «done» when it already holds results. Every block of
   BreedingPro is open from the start, so the rule "enabled and followed by an
   enabled block" would tick them all; what tells them apart is their result. */
function stepHasResults(n) {
  const w = window;
  switch (Number(n)) {
    case 2: return !!(state.plan && state.plan.field);
    case 3: return !!state.data;
    case 4: return !!state.griffing;
    case 5: return !!state.hayman;
    case 6: return !!(w.B6 && w.B6.res);
    case 7: return !!state.generations;
    case 8: return !!state.selection;
    case 9: return !!state.gxe;
    case 10: return !!(w.B10 && (w.B10.fit || w.B10.tRes || (w.B10.x && w.B10.x.res)));
    case 11: return !!(w.B11 && (w.B11.fit || w.B11.hres || w.B11.cv));
    case 12: return !!(w.B12 && w.B12.html);
    default: return false;
  }
}
function refreshStepMarks() {
  if (!window.LABG) return;
  STEPS.forEach(s => {
    if (s.n === 1) return;
    const b = document.querySelector('.step-btn[data-step="' + s.n + '"]');
    LABG.markStep(s.n, b && !b.disabled && stepHasResults(s.n) ? 'done' : null);
  });
}

/* Common bar of the LABG Suite: help panel, keyboard, warning before closing
   and block marks. Called by home.js once the block bar exists. Only in the
   app: the tests load core.js without labg-core.js. */
function initSuiteBar() {
  if (!window.LABG) return;
  if (LABG.work) {
    LABG.work.scene = 'grow';
    LABG.work.tips = [
      ['Cada figura trae su panel de edición: títulos, paletas, fuentes y tamaños, con su barra de exportación.', 'Every figure has its own editor: titles, palettes, fonts and sizes, with its export bar.'],
      ['La validación cruzada genómica repite los pliegues con una semilla fija: el mismo archivo da la misma exactitud.', 'Genomic cross-validation repeats the folds with a fixed seed: the same file gives the same accuracy.'],
      ['El Bloque 12 reúne todo en un informe con los métodos redactados y un paquete .zip.', 'Block 12 gathers everything into a report with written methods and a .zip package.']
    ];
  }
  const hb = el('helpBtn');
  if (hb) hb.addEventListener('click', () => LABG.showShortcuts());
  const nb = el('b1Next');
  if (nb) nb.addEventListener('click', () => goStep(2));
  LABG.shortcuts([]);
  LABG.bindStepKeys(goStep);
  LABG.guardUnload(() => !!state.fileName);
  const nav = el('stepper');
  const navLabel = () => { if (nav) nav.setAttribute('aria-label', T('Bloques', 'Blocks')); };
  navLabel();
  LABG.setCurrentStep((document.querySelector('.step-btn.active') || {}).dataset?.step || '1');
  refreshStepMarks();
  /* results appear after a click, a change or a file read: check again then */
  let pending = null;
  const later = () => { clearTimeout(pending); pending = setTimeout(refreshStepMarks, 120); };
  document.addEventListener('click', later);
  document.addEventListener('change', later);
  document.addEventListener('langchange', () => { navLabel(); refreshStepMarks(); });
}

/* Persisted preferences (figure style, last settings) */
const Prefs = {
  get(k, d) { try { const v = localStorage.getItem('breedingpro:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('breedingpro:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};

/* ---------------- random numbers ----------------
   Everything stochastic (simulators, permutation tests, cross-validation,
   randomisation of field plans) draws from a seeded generator, so a run is
   reproducible and its seed can be reported. sfc32 passes the usual
   statistical batteries, unlike a 32-bit linear congruential generator. */
function rng(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = (seed >>> 0) ^ 0xdeadbeef;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 15; i++) next();
  return next;
}
function randn(r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback || '#5e2e8c';
}

Object.assign(window, {
  STEPS, el, els, mk, esc, L2, svgEl, showMessage, clearMessages,
  fmtNum, fmtFixed, fmtP, pEq, fmtPct, stars, csvEscape, download, slug,
  goStep, enableStep, initSuiteBar, refreshStepMarks, Prefs, rng, randn, shuffle, cssVar,
});
