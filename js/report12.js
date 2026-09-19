/* BreedingPro — Block 12 engine: the report and its package.
   The report takes every table, summary tile, note and figure exactly as the blocks show them
   (the tables and notes from the page, the figures as the user left them in their editors),
   adds a methods section drafted from the settings that were actually used (js/methods12.js),
   the references cited there and the citation of the software. The package adds every table
   as CSV, the results workbook of every block, the figures as SVG and as raster images, the
   data as analysed and the methods as plain text. */

(function () {
  const RP = {};
  window.RP = RP;

  RP.VERSION = '1.0.0';
  RP.CITE = {
    author: 'Barrera-Guzmán, L.Á.', year: 2026,
    es: 'BreedingPro: plataforma en el navegador para el análisis de cruzas dialélicas, diseños de apareamiento, parámetros genéticos y predicción en el mejoramiento de plantas y animales',
    en: 'BreedingPro: a browser-based platform for diallel crosses, mating designs, genetic parameters and prediction in plant and animal breeding',
  };
  RP.citation = () => `${RP.CITE.author} (${RP.CITE.year}). ${T(RP.CITE.es, RP.CITE.en)} (${T('versión', 'Version')} ${RP.VERSION}) [${T('software', 'Computer software')}].`;

  /* ---------- what every block contributes ----------
     cards: the result cards of the block, in order; skip: elements inside them that are inputs */
  /* ready: the block holds results of the data now loaded (blocks 4–9 drop theirs when the data
     change while they are not on screen); a card may add its own condition */
  const design = () => (state.data && state.data.mating ? state.data.mating.design : null);
  RP.BLOCKS = [
    { n: 2, es: 'Planeación de cruzas, del ensayo y de su potencia', en: 'Planning of crosses, the trial and its power',
      ready: () => !!(window.B2 && B2.plan && !B2.plan.errors.length), cards: ['b2Design', 'b2SeedCard', { id: 'b2Field', ready: () => !!(B2.field && B2.field.locations) }, 'b2Power'] },
    { n: 3, es: 'Diseño reconocido y análisis del ensayo', en: 'Recognised design and trial analysis',
      ready: () => !!(state.data && state.data.ds && state.data.ds.records.length), cards: ['b3Design', 'b3Quality', 'b3Analysis'] },
    { n: 4, es: 'Dialelo de Griffing', en: 'Griffing diallel',
      ready: () => !!(window.B4 && B4.built && B4.res && B4.res.main && design() === 'griffing'), cards: ['b4Anova', 'b4Effects', 'b4Params', 'b4Best', 'b4Compare'] },
    { n: 5, es: 'Hayman–Jinks y Gardner–Eberhart', en: 'Hayman–Jinks and Gardner–Eberhart',
      ready: () => !!(window.B5 && B5.built && B5.res && B5.res.anova && design() === 'griffing'), cards: ['b5Setup', 'b5Anova', 'b5Comp', 'b5Graph', 'b5GE', 'b5Equiv'] },
    { n: 6, es: 'Diseños de apareamiento', en: 'Mating designs',
      ready: () => !!(window.B6 && B6.built && B6.res && B6.res.rows && B6.res.dfe > 0 && ['nc1', 'nc2', 'nc3', 'ttc', 'lxt', 'partial'].includes(design())), cards: ['b6Anova', 'b6Effects', 'b6Comp', 'b6Special'] },
    { n: 7, es: 'Medias y varianzas generacionales', en: 'Generation means and variances',
      ready: () => !!(window.B7 && B7.built && B7.res && B7.res.models && design() === 'generations'), cards: ['b7Scale', 'b7Means', 'b7Var', 'b7Het'] },
    { n: 8, es: 'Parámetros genéticos y selección', en: 'Genetic parameters and selection',
      ready: () => !!(window.B8 && B8.built && B8.res && B8.res.params && B8.res.params.some(p => !p.missing) && design() && design() !== 'generations'),
      /* the table of recurrent selection starts from Fehr's worked example: it enters when it uses Block 6 or values the user typed */
      cards: ['b8Params', 'b8Corr', 'b8Index', 'b8Sel', { id: 'b8Fehr', ready: () => !!(B8.fehr && (B8.fehr.from === 'b6' || B8.fehr.user)) }] },
    { n: 9, es: 'Interacción genotipo × ambiente y estabilidad', en: 'Genotype × environment interaction and stability',
      ready: () => !!(window.B9 && B9.built && B9.res && !B9.res.error), cards: ['b9Data', 'b9Reg', 'b9Var', 'b9Rank', 'b9Ammi', 'b9Gge', 'b9Sum'] },
    { n: 10, es: 'Modelos mixtos, BLUP y cruzamiento', en: 'Mixed models, BLUP and crossbreeding',
      ready: () => !!(window.B10 && (B10.ped || B10.fit || B10.tRes || (B10.x && B10.x.user && B10.x.preds))),
      /* the crossbreeding example opens by itself on the first visit: it enters when the user ran it */
      cards: [{ id: 'b10Data', ready: () => !!B10.ped }, { id: 'b10Model', ready: () => !!B10.fit }, { id: 'b10Trial', ready: () => !!B10.tRes }, { id: 'b10Cross', ready: () => !!(B10.x && B10.x.user && B10.x.preds) }] },
    { n: 11, es: 'Selección genómica y predicción de híbridos', en: 'Genomic selection and hybrid prediction',
      ready: () => !!(window.B11 && B11.Q), cards: ['b11Markers', 'b11Rel', { id: 'b11Gblup', ready: () => !!B11.fit }, { id: 'b11Cv', ready: () => !!B11.cv }, { id: 'b11Hyb', ready: () => !!B11.hres }] },
  ];
  RP.block = n => RP.BLOCKS.find(b => b.n === n);
  const cardId = c => (typeof c === 'string' ? c : c.id);
  const cardReady = c => typeof c === 'string' || !c.ready || c.ready();

  /* ---------- reading the page ---------- */
  const hiddenInline = n => n.hidden || (n.style && n.style.display === 'none');
  /* a card counts when it is in the page, not hidden, and shows a table, a tile or a figure */
  RP.cardVisible = id => {
    const c = el(id);
    if (!c) return false;
    for (let p = c; p && p !== document.body; p = p.parentElement) { if (p.classList && p.classList.contains('step-panel')) break; if (hiddenInline(p)) return false; }
    return true;
  };
  const cardHasResults = id => {
    const c = el(id);
    if (!RP.cardVisible(id)) return false;
    const items = [...c.querySelectorAll('table, .stat-tile, .fig-block')];
    return items.some(x => { for (let p = x; p && p !== c; p = p.parentElement) if (hiddenInline(p)) return false; return true; });
  };
  /* a card of any block enters the report now (its own condition and something to show) */
  RP.shownCard = id => { for (const b of RP.BLOCKS) { const c = b.cards.find(x => cardId(x) === id); if (c) return cardReady(c) && cardHasResults(id); } return false; };
  RP.available = b => (typeof b.ready === 'function' ? b.ready() : true) && b.cards.some(c => cardReady(c) && cardHasResults(cardId(c)));

  const capFirst = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const stop = s => { s = String(s || '').trim().replace(/[.;:\s]+$/, ''); return s ? s + (/[?!]$/.test(s) ? '' : '.') : ''; };
  const cleanHeading = s => String(s || '').replace(/^\s*\d+\s*·\s*/, '').trim();
  const textOf = n => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');

  let tabN = 0, figN = 0;
  RP.tables = [];            // [{ n, caption, header, rows }] of the last build, for the CSV files
  RP.figures = [];           // [{ n, title, api }] of the last build

  /* the table as text rows (header first) */
  function tableRows(t) {
    const rows = [];
    t.querySelectorAll('tr').forEach(tr => rows.push([...tr.children].map(c => c.textContent.replace(/\s+/g, ' ').trim())));
    return rows;
  }

  /* one card of a block, cleaned for print; o.secondary opens the folded parts */
  RP.card = (id, o) => {
    o = o || {};
    const live = el(id);
    if (!cardHasResults(id)) return '';
    const L = I18N.lang;
    /* mark what is hidden now, clone, unmark */
    const marked = [];
    live.querySelectorAll('*').forEach(n => { if (hiddenInline(n)) { n.setAttribute('data-rp-hide', ''); marked.push(n); } });
    const liveSelects = [...live.querySelectorAll('select')];
    const c = live.cloneNode(true);
    marked.forEach(n => n.removeAttribute('data-rp-hide'));
    c.removeAttribute('id');
    c.querySelectorAll('[data-rp-hide]').forEach(n => n.remove());
    c.querySelectorAll(`[data-l]:not([data-l="${L}"])`).forEach(n => n.remove());
    /* the selectors inside result tables keep their chosen value as text */
    const cloneSelects = [...c.querySelectorAll('select')];
    cloneSelects.forEach((s, i) => { const src = liveSelects[i]; if (s.closest('table')) s.replaceWith(document.createTextNode(src && src.options[src.selectedIndex] ? src.options[src.selectedIndex].text : '')); });
    /* inputs, examples, buttons and editors are not results */
    c.querySelectorAll('.form-grid, .chip-row, .btn-row, .fig-editor, .fig-tools, button, input, select, textarea, label.btn, .method-notes, .messages .msg-info, .messages .msg-success, .next-bar').forEach(n => n.remove());
    /* the captions of those controls go with them */
    c.querySelectorAll('label, .inline-label').forEach(n => n.remove());
    /* instructions written in the page (both languages in the markup) are not results either */
    c.querySelectorAll('p.hint').forEach(p => { if (p.querySelector('[data-l]') || !textOf(p)) p.remove(); });
    /* a table cut to its first rows: the complete one travels in the package */
    c.querySelectorAll('p.hint').forEach(p => {
      const m = textOf(p).match(/^(?:Se muestran|Showing) (\d+) (?:de|of) (\d+) (?:filas|rows)/);
      if (m) p.textContent = T(`Se muestran ${m[1]} de ${m[2]} filas; el libro de resultados del bloque, en el paquete ZIP, las incluye todas.`, `Showing ${m[1]} of ${m[2]} rows; the results workbook of the block, in the ZIP package, has them all.`);
    });
    /* folded parts */
    c.querySelectorAll('details').forEach(d => {
      if (!o.secondary) { d.remove(); return; }
      const s = d.querySelector('summary');
      const h = document.createElement('h4');
      h.textContent = textOf(s);
      if (s) s.remove();
      const frag = document.createDocumentFragment();
      frag.appendChild(h);
      while (d.firstChild) frag.appendChild(d.firstChild);
      d.replaceWith(frag);
    });
    /* figures: the figure as the user left it, numbered, with its title as caption */
    c.querySelectorAll('.fig-block').forEach(fb => {
      const api = Fig.registry[fb.id];
      if (!api || !api.svg) { fb.remove(); return; }
      figN++;
      const svg = api.svg.cloneNode(true);
      svg.removeAttribute('width'); svg.removeAttribute('height');
      svg.setAttribute('style', 'width:100%;height:auto;max-width:' + Math.round(+api.svg.dataset.w || 900) + 'px');
      const sub = api.cfg && api.cfg.subtitle ? stop(capFirst(String(api.cfg.subtitle))) : '';
      const cap = [stop(Fig.subHTML(api.title)), sub].filter(Boolean).join(' ');
      RP.figures.push({ n: figN, title: api.title, api });
      const f = document.createElement('figure');
      f.className = 'nobreak';
      f.innerHTML = new XMLSerializer().serializeToString(svg) + `<figcaption><b>${T('Figura', 'Figure')} ${figN}.</b> ${cap}</figcaption>`;
      fb.replaceWith(f);
    });
    c.querySelectorAll('.fig-grid').forEach(g => { if (!g.querySelector('figure')) g.remove(); else g.className = 'fig-list'; });
    /* tables: numbered, captioned by the heading they sit under */
    const cardTitle = cleanHeading(textOf(c.querySelector('h2')));
    const first = RP.tables.length;
    c.querySelectorAll('table').forEach(t => {
      if (!t.querySelector('tbody tr, tr td')) { t.remove(); return; }
      tabN++;
      let head = '';
      /* the nearest heading before the table, inside the card */
      const all = [...c.querySelectorAll('h3, h4, table')];
      for (let k = all.indexOf(t) - 1; k >= 0; k--) if (/^H[34]$/.test(all[k].tagName)) { head = textOf(all[k]); break; }
      let cap = t.querySelector('caption');
      const capText = cap ? textOf(cap) : (head || cardTitle);
      if (!cap) { cap = document.createElement('caption'); t.insertBefore(cap, t.firstChild); }
      cap.innerHTML = `<b>${T('Tabla', 'Table')} ${tabN}.</b> ${esc(stop(capText))}`;
      const rows = tableRows(t).filter(r => r.length);
      const nHead = t.tHead ? t.tHead.rows.length : 1;
      RP.tables.push({ n: tabN, caption: capText, header: rows.slice(0, nHead).pop(), rows: rows.slice(nHead) });
      if (t.querySelectorAll('tbody tr').length <= 25) t.classList.add('nobreak');
      const wrap = t.closest('.table-scroll');
      if (wrap) wrap.className = 'table-scroll';
      t.dataset.rpN = tabN;
    });
    /* tables of this card that share a caption are told apart */
    const mine = RP.tables.slice(first), byCap = new Map();
    mine.forEach(x => byCap.set(x.caption, (byCap.get(x.caption) || []).concat([x])));
    byCap.forEach(list => {
      if (list.length < 2) return;
      list.forEach((x, k) => {
        x.caption += ` (${T('parte', 'part')} ${k + 1} ${T('de', 'of')} ${list.length})`;
        const cap = c.querySelector(`table[data-rp-n="${x.n}"] caption`);
        if (cap) cap.innerHTML = `<b>${T('Tabla', 'Table')} ${x.n}.</b> ${esc(stop(x.caption))}`;
      });
    });
    c.querySelectorAll('table[data-rp-n]').forEach(t => t.removeAttribute('data-rp-n'));
    /* warnings the block raised stay, as notes */
    c.querySelectorAll('.messages').forEach(m => { if (!m.textContent.trim()) m.remove(); });
    /* the card title becomes a subsection */
    const h2 = c.querySelector('h2');
    if (h2) { const h3 = document.createElement('h3'); h3.textContent = cleanHeading(textOf(h2)); h2.replaceWith(h3); }
    /* drop what is left empty */
    for (let k = 0; k < 3; k++) c.querySelectorAll('div, p').forEach(n => { if (!n.children.length && !n.textContent.trim()) n.remove(); });
    if (!c.querySelector('table, figure, .stat-tile')) return '';
    return `<section class="rp-card">${c.innerHTML}</section>`;
  };

  /* ---------- the data section ---------- */
  RP.dataSection = () => {
    const D = state.data;
    if (!D) return '';
    const src = window.B3 && B3.source ? B3.source : null;
    const ex = window.B3 && B3.example && window.Examples ? Examples.get(B3.example) : null;
    const cites = ex && ex.cite ? (Array.isArray(ex.cite) ? ex.cite : [ex.cite]).map(c => (typeof c === 'string' ? c : T(c))) : [];
    const lines = [];
    lines.push(`<p><b>${T('Archivo', 'File')}:</b> ${esc(state.fileName || (src && src.name) || '—')}${ex ? ` (${T('ejemplo de la app', 'example of the app')})` : ''}.</p>`);
    if (cites.length) lines.push(`<p><b>${T('Origen de los datos', 'Source of the data')}:</b> ${cites.map(esc).join(' ')}</p>`);
    return lines.join('');
  };

  /* ---------- styles of the report ---------- */
  RP.CSS = `
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1d1b24;background:#fff;max-width:1100px;margin:0 auto;padding:28px 36px;line-height:1.5;font-size:14px}
h1{font-size:1.9rem;letter-spacing:-.5px;margin:0 0 4px;color:#3b1c5a}h2{font-size:1.35rem;margin:34px 0 8px;padding-bottom:4px;border-bottom:2px solid #5e2e8c;color:#3b1c5a}h3{font-size:1.08rem;margin:22px 0 6px}h4{font-size:.78rem;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#6b6478}
.meta{color:#6b6478;margin-bottom:22px}.meta b{color:#1d1b24}
table{border-collapse:collapse;width:100%;font-size:12.5px;margin:8px 0 14px}caption{caption-side:top;text-align:left;padding:6px 0;font-weight:600;font-size:12.5px}
th{background:#f0ebf5;text-align:left;padding:6px 9px;border-bottom:1px solid #ddd3e8}td{padding:5px 9px;border-bottom:1px solid #eee;vertical-align:top}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
tr.row-best td{background:#fbf6e6}tr.row-flag td{color:#8a8494}tr.total td{font-weight:700;border-top:2px solid #cfc3dc}
.table-scroll{overflow-x:auto}
.results-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:12px 0}.stat-tile{background:#f5f1f9;border-radius:8px;padding:9px 12px}.stat-label{font-size:.68rem;color:#6b6478;text-transform:uppercase;letter-spacing:.05em;font-weight:600}.stat-value{font-size:1.15rem;font-weight:700}.stat-value.txt{font-size:.98rem}.stat-sub{font-size:.72rem;color:#6b6478}
.stat-tile.ok{box-shadow:inset 3px 0 0 #2f8f4a}.stat-tile.warn{box-shadow:inset 3px 0 0 #c98014}.stat-tile.bad{box-shadow:inset 3px 0 0 #c43a2f}
.nc{text-transform:none}.sig{color:#8a5a00;font-weight:600}
.msg{padding:8px 12px;border-radius:8px;font-size:.86rem;margin-bottom:6px;border:1px solid #ddd3e8}.msg-error{background:#fbeceb}.msg-warning{background:#fdf3e4}
.hint{color:#5d5868;font-size:.86rem}
figure{margin:16px 0}figure svg{display:block;margin:0 auto}figcaption{font-size:.84rem;color:#444;margin-top:4px}
.methods{background:#fcfbfd;border:1px solid #e3dcea;border-radius:10px;padding:14px 18px;font-size:.93rem}.methods p{margin:8px 0}.methods h3{margin-top:12px}
.refs{padding-left:0;list-style:none}.refs li{padding-left:2em;text-indent:-2em;margin-bottom:5px;font-size:.9rem}
.cite{padding-left:2em;text-indent:-2em}pre{background:#f5f1f9;border-radius:8px;padding:10px 12px;font-size:12px;overflow-x:auto}
.toc{list-style:none;padding-left:0;columns:2;font-size:.92rem}.toc li{margin-bottom:2px}.notes{white-space:pre-wrap}
.method-note h4{margin-top:10px}.method-note p{margin:4px 0}
@media print{body{padding:0;max-width:none;font-size:11.5px}h2,h3,h4{page-break-after:avoid;break-after:avoid}table{font-size:10.5px}a{color:inherit;text-decoration:none}.nobreak,.results-summary,.stat-tile,figure{page-break-inside:avoid;break-inside:avoid}figure svg{max-height:4.6in}pre{white-space:pre-wrap;word-break:break-word}.table-scroll{overflow:visible}}`;

  /* ---------- the report ----------
     o: { title, author, notes, blocks: [n…], methods, secondary, cite, notesAppendix, dataAppendix } */
  RP.build = o => {
    tabN = 0; figN = 0; RP.tables = []; RP.figures = [];
    const L = I18N.lang;
    const blocks = RP.BLOCKS.filter(b => o.blocks.includes(b.n) && RP.available(b));
    const sections = blocks.map(b => ({ b, body: b.cards.filter(cardReady).map(c => RP.card(cardId(c), o)).join('') })).filter(s => s.body);
    const methods = o.methods !== false && window.MT ? MT.build(sections.map(s => s.b.n)) : null;
    const data = RP.dataSection();
    const dateTxt = new Date().toLocaleDateString(L === 'es' ? 'es-MX' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    let h = 0;
    const toc = [], body = [];
    const add = (id, title, html) => { h++; toc.push(`<li><a href="#${id}">${h}. ${esc(title)}</a></li>`); body.push(`<h2 id="${id}">${h}. ${esc(title)}</h2>${html}`); };
    if (data || (methods && methods.data)) add('data', T('Datos', 'Data'), (data || '') + (methods && methods.data ? `<div class="methods">${methods.data}</div>` : ''));
    if (methods && methods.html) add('methods', T('Métodos', 'Methods'), `<div class="methods">${methods.html}</div>`);
    sections.forEach(s => add('b' + s.b.n, T(s.b.es, s.b.en), s.body));
    if (methods && methods.refs.length) add('refs', T('Referencias', 'References'), `<ul class="refs">${methods.refs.map(r => `<li>${r}</li>`).join('')}</ul>`);
    if (o.notesAppendix) {
      const notes = sections.map(s => { const n = el(`b${s.b.n}Notes`); if (!n || !n.innerHTML.trim()) return ''; const c = n.cloneNode(true); c.querySelectorAll(`[data-l]:not([data-l="${L}"])`).forEach(x => x.remove()); return `<h3>${esc(T(s.b.es, s.b.en))}</h3>${c.innerHTML}`; }).join('');
      if (notes) add('notes', T('Fundamentos de los métodos', 'Background of the methods'), notes);
    }
    if (o.cite !== false) add('cite', T('Cómo citar', 'How to cite'), RP.citeSection());
    if (o.dataAppendix && state.data) add('appendix', T('Apéndice: datos analizados', 'Appendix: data as analysed'), RP.dataTable());
    const counts = `${RP.tables.length} ${T('tablas', 'tables')} · ${RP.figures.length} ${T('figuras', 'figures')}`;
    return `<!DOCTYPE html><html lang="${L}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(o.title)}</title><style>${RP.CSS}</style></head><body>
<h1>${esc(o.title)}</h1>
<div class="meta">${o.author ? `<b>${esc(o.author)}</b> · ` : ''}${dateTxt}${state.fileName ? ` · ${T('datos', 'data')}: <b>${esc(state.fileName)}</b>` : ''} · ${counts}</div>
${o.notes ? `<p class="notes">${esc(o.notes)}</p>` : ''}
<ul class="toc">${toc.join('')}</ul>
${body.join('\n')}
<p class="hint" style="margin-top:40px">${T(`Generado con BreedingPro ${RP.VERSION} el ${new Date().toISOString().slice(0, 16).replace('T', ' ')}. Las figuras van como gráficos vectoriales y se imprimen a resolución completa.`, `Generated with BreedingPro ${RP.VERSION} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')}. Figures are embedded as vector graphics and print at full resolution.`)}</p>
</body></html>`;
  };

  RP.citeSection = () => {
    const c = RP.CITE;
    return `<div class="methods"><p>${T('Si el análisis se publica, cite el programa y los artículos originales de los métodos que se nombran en la sección de métodos:', 'If the analysis is published, please cite the software and the original papers of the methods named in the methods section:')}</p>
<p class="cite">${esc(c.author)} (${c.year}). <i>${esc(T(c.es, c.en))}</i> (${T('versión', 'Version')} ${RP.VERSION}) [${T('software', 'Computer software')}].</p>
<p class="hint">${T('El DOI se añadirá al archivar la versión 1.0. Licencia GPL-3.0-or-later.', 'The DOI will be added when version 1.0 is archived. License GPL-3.0-or-later.')}</p>
<pre>@software{barrera_guzman_breedingpro_${c.year},
  author  = {Barrera-Guzmán, Luis Ángel},
  title   = {${T(c.es, c.en)}},
  year    = {${c.year}},
  version = {${RP.VERSION}}
}</pre></div>`;
  };

  /* the data of Block 3 as analysed (columns as read, with the excluded plots marked) */
  RP.dataTable = () => {
    const tab = window.B3 && B3.table;
    if (!tab) return '';
    const ex = B3.excluded || new Set();
    tabN++;
    RP.tables.push({ n: tabN, caption: T('Datos analizados', 'Data as analysed'), rows: tab.rows.map(r => r.map(v => (v == null ? '' : String(v)))), header: tab.header });
    return `<div class="table-scroll"><table><caption><b>${T('Tabla', 'Table')} ${tabN}.</b> ${T('Datos analizados', 'Data as analysed')} (${tab.rows.length} ${T('filas', 'rows')}${ex.size ? `; ${ex.size} ${T('excluidas del análisis, en gris', 'excluded from the analysis, in grey')}` : ''}).</caption><thead><tr>${tab.header.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${tab.rows.map((r, i) => `<tr${ex.has(i) ? ' class="row-flag"' : ''}>${r.map(v => `<td>${esc(v == null ? '' : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };

  /* ---------- the package ---------- */
  /* cells that are plain numbers are written the way spreadsheets read them: ASCII minus, no thousands separator */
  const plainNumber = v => {
    const s = String(v == null ? '' : v).trim();
    return /^[−-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) || /^[−-]\d*\.?\d+(e[+-]?\d+)?$/i.test(s) ? s.replace('−', '-').replace(/,/g, '') : v;
  };
  const csv = rows => rows.map(r => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';
  /* only the result tables, which carry display formatting; the user's data are written untouched */
  const csvTable = rows => rows.map(r => r.map(v => csvEscape(plainNumber(v))).join(',')).join('\r\n') + '\r\n';
  /* the results workbook of a block, taken from its own download button without downloading */
  RP.captureDownloads = fn => {
    const got = [], orig = window.download;
    window.download = (content, filename, mime) => { got.push({ content, filename, mime }); };
    try { fn(); } finally { window.download = orig; }
    return got;
  };
  RP.workbooks = blocks => {
    const out = [];
    blocks.forEach(n => {
      const b = el(`b${n}DlXlsx`);
      if (!b || b.disabled) return;
      try { RP.captureDownloads(() => b.click()).forEach(g => out.push({ name: `${T('resultados', 'results')}/${T('bloque', 'block')}${String(n).padStart(2, '0')}_${g.filename}`, data: g.content instanceof Blob ? g.content : new Blob([g.content], { type: g.mime || 'application/octet-stream' }) })); } catch (e) { console.error(e); }
    });
    return out;
  };

  /* o: report options + { raster: 'png'|'tiff'|'none', scale, workbooks, data } */
  RP.zip = async (o, html, progress) => {
    const files = [{ name: T('informe.html', 'report.html'), data: html }];
    const pad = k => String(k).padStart(2, '0');
    RP.tables.forEach(t => files.push({ name: `${T('tablas', 'tables')}/${T('tabla', 'table')}_${pad(t.n)}_${slug(t.caption).slice(0, 40)}.csv`, data: '﻿' + csvTable((t.header ? [t.header] : []).concat(t.rows)) }));
    if (o.workbooks !== false) RP.workbooks(o.blocks).forEach(f => files.push(f));
    if (window.MT && o.methods !== false) { const m = MT.last; if (m && m.text) files.push({ name: T('metodos.txt', 'methods.txt'), data: m.text }); }
    if (o.data !== false && window.B3 && B3.table) files.push({ name: `${T('datos', 'data')}/${slug(state.fileName || 'datos')}.csv`, data: '﻿' + csv([B3.table.header].concat(B3.table.rows.map(r => r.map(v => (v == null ? '' : v))))) });
    const used = new Set(), scale = +o.scale || 4, dpi = Math.round(scale * 75);
    for (let k = 0; k < RP.figures.length; k++) {
      const f = RP.figures[k];
      let nm = `${T('figura', 'figure')}_${pad(f.n)}_${f.api.fileName || slug(f.title)}`;
      while (used.has(nm)) nm += '_b';
      used.add(nm);
      files.push({ name: `${T('figuras', 'figures')}/svg/${nm}.svg`, data: Fig.serialize(f.api.svg) });
      if (o.raster && o.raster !== 'none') {
        try { const blob = await Fig.toRaster(f.api.svg, { format: o.raster, scale, dpi, background: '#ffffff' }); files.push({ name: `${T('figuras', 'figures')}/${o.raster}/${nm}.${o.raster === 'tiff' ? 'tif' : o.raster}`, data: blob }); } catch (e) { console.error(e); }
      }
      if (progress) await progress((k + 1) / RP.figures.length);
    }
    files.push({ name: T('LEAME.txt', 'README.txt'), data: RP.readme(o) });
    return Zip.build(files);
  };
  RP.readme = o => T(
    `${o.title}\r\n\r\nGenerado con BreedingPro ${RP.VERSION} el ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.\r\n\r\ninforme.html: el informe completo; se abre en cualquier navegador y se imprime como PDF desde el navegador.\r\nmetodos.txt: la sección de métodos en texto simple, para pegarla en un manuscrito.\r\ntablas/: cada tabla del informe en CSV (UTF-8), con su número.\r\nresultados/: el libro de resultados (.xlsx) de cada bloque incluido, con todas las filas.\r\nfiguras/: cada figura del informe en SVG (vectorial, editable) y en ${o.raster === 'none' ? 'ningún formato de mapa de bits' : (o.raster || 'png').toUpperCase() + ` a ${Math.round((+o.scale || 4) * 75)} ppp`}.\r\ndatos/: los datos del Bloque 3 tal como se analizaron.\r\n\r\nCite el programa y los métodos: ${RP.citation()}\r\n`,
    `${o.title}\r\n\r\nGenerated with BreedingPro ${RP.VERSION} on ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.\r\n\r\nreport.html: the full report; opens in any browser and prints to PDF from the browser.\r\nmethods.txt: the methods section as plain text, ready to paste into a manuscript.\r\ntables/: every table of the report as CSV (UTF-8), numbered.\r\nresults/: the results workbook (.xlsx) of every block included, with every row.\r\nfigures/: every figure of the report as SVG (vector, editable) and as ${o.raster === 'none' ? 'no raster format' : (o.raster || 'png').toUpperCase() + ` at ${Math.round((+o.scale || 4) * 75)} dpi`}.\r\ndata/: the data of Block 3 as analysed.\r\n\r\nPlease cite the software and the methods: ${RP.citation()}\r\n`);
})();
