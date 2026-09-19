/* BreedingPro — Block 12 interface: the report (preview, print to PDF, HTML) and the ZIP package. */

(function () {
  const B12 = { html: null, built: false, lastOpts: null, sel: null };
  window.B12 = B12;

  const msg = (host, list) => { clearMessages(host); (list || []).forEach(x => showMessage(host, x.level === 'error' ? 'error' : x.level === 'warning' ? 'warning' : x.level === 'success' ? 'success' : 'info', T(x))); };
  const tiles = (host, items) => { el(host).innerHTML = items.map(([es, en, v, sub]) => `<div class="stat-tile"><div class="stat-label">${T(es, en)}</div><div class="stat-value">${v}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`).join(''); };

  /* ---------- 1 · content ---------- */
  function renderBlocks() {
    const avail = RP.BLOCKS.map(b => ({ b, ok: RP.available(b) }));
    if (!B12.sel) B12.sel = new Set(avail.filter(x => x.ok).map(x => x.b.n));
    el('b12Blocks').innerHTML = avail.map(({ b, ok }) => `<label class="b12-block${ok ? '' : ' off'}"><input type="checkbox" data-b12="${b.n}"${ok ? '' : ' disabled'}${ok && B12.sel.has(b.n) ? ' checked' : ''}>
      <span class="b12-num">${b.n}</span><span class="b12-name">${T(b.es, b.en)}</span><span class="b12-state">${ok ? T('con resultados', 'with results') : T('sin resultados: abra el bloque y analice', 'no results: open the block and run it')}</span></label>`).join('');
    el('b12Blocks').querySelectorAll('[data-b12]').forEach(c => c.addEventListener('change', () => { const n = +c.dataset.b12; if (c.checked) B12.sel.add(n); else B12.sel.delete(n); }));
    const nOk = avail.filter(x => x.ok).length;
    el('b12Build').disabled = !nOk;
    if (!nOk) msg('b12Msg', [{ level: 'info', es: 'Todavía no hay resultados. Cargue datos en el Bloque 3 (o un ejemplo) y analícelos en los bloques que correspondan; el Bloque 2 también aporta al informe el plan de cruzas y del ensayo.', en: 'There are no results yet. Load data in Block 3 (or an example) and analyse them in the blocks that apply; Block 2 also adds the crossing and trial plan to the report.' }]);
    else clearMessages('b12Msg');
  }
  const opts = () => ({
    title: el('b12Title').value.trim() || T('Informe de análisis genético', 'Genetic analysis report'),
    author: el('b12Author').value.trim(),
    notes: el('b12Notes').value.trim(),
    blocks: [...B12.sel].filter(n => RP.available(RP.block(n))).sort((a, b) => a - b),
    methods: el('b12OptMethods').checked,
    secondary: el('b12OptSecondary').checked,
    notesAppendix: el('b12OptNotes').checked,
    cite: el('b12OptCite').checked,
    dataAppendix: el('b12OptData').checked,
    raster: el('b12Raster').value, scale: +el('b12Scale').value,
    workbooks: el('b12ZipBooks').checked, data: el('b12ZipData').checked,
  });

  /* ---------- 2 · preview ---------- */
  function build() {
    const o = opts();
    if (!o.blocks.length) { msg('b12Msg', [{ level: 'warning', es: 'Elija al menos un bloque con resultados.', en: 'Choose at least one block with results.' }]); return null; }
    const t0 = performance.now();
    B12.html = RP.build(o);
    B12.lastOpts = o;
    B12.lang = I18N.lang;
    const ms = performance.now() - t0;
    el('b12Preview').style.display = '';
    el('b12Zip').style.display = '';
    const m = window.MT && MT.last;
    tiles('b12Tiles', [
      ['Bloques', 'Blocks', o.blocks.length, o.blocks.join(', ')],
      ['Tablas', 'Tables', RP.tables.length],
      ['Figuras', 'Figures', RP.figures.length],
      ['Referencias', 'References', m ? m.refs.length : 0],
      ['Tamaño', 'Size', `${fmtNum(new Blob([B12.html]).size / 1024, 0)} kB`, `${fmtNum(ms / 1000, 2)} s`],
    ]);
    el('b12Frame').srcdoc = B12.html;
    const notes = [];
    if (m && m.missing && m.missing.length) notes.push({ level: 'warning', es: `Sin párrafo de métodos para: ${m.missing.join(', ')}.`, en: `No methods paragraph for: ${m.missing.join(', ')}.` });
    notes.push({ level: 'success', es: `Informe listo: ${RP.tables.length} tablas y ${RP.figures.length} figuras de ${o.blocks.length} ${o.blocks.length === 1 ? "bloque" : "bloques"}.`, en: `Report ready: ${RP.tables.length} tables and ${RP.figures.length} figures from ${o.blocks.length} ${o.blocks.length === 1 ? "block" : "blocks"}.` });
    msg('b12PrevMsg', notes);
    renderZipNote();
    return B12.html;
  }
  const ensure = () => (B12.html && B12.lang === I18N.lang ? B12.html : build());
  function printReport() {
    const html = ensure();
    if (!html) return;
    const f = document.createElement('iframe');
    f.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0');
    document.body.appendChild(f);
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } finally { setTimeout(() => f.remove(), 60000); } };
    f.srcdoc = html;
  }
  const fileBase = () => slug(B12.lastOpts ? B12.lastOpts.title : 'informe');

  /* ---------- 3 · package ---------- */
  function renderZipNote() {
    const n = RP.figures.length, s = +el('b12Scale').value, r = el('b12Raster').value;
    let px = 0;
    RP.figures.forEach(f => { px += (+f.api.svg.dataset.w || 900) * (+f.api.svg.dataset.h || 600) * Fig.safeScale(f.api.svg, s) ** 2; });
    el('b12ZipNote').innerHTML = r === 'none'
      ? T(`${n} figuras en SVG, ${RP.tables.length} tablas en CSV.`, `${n} figures as SVG, ${RP.tables.length} tables as CSV.`)
      : T(`${n} figuras en SVG y en ${r.toUpperCase()} a ${s * 75} ppp (${fmtNum(px / 1e6, 0)} millones de píxeles en total${r === 'tiff' ? '; el TIFF va sin compresión y pesa unos 3 bytes por píxel' : ''}), ${RP.tables.length} tablas en CSV. Las figuras demasiado grandes para esa resolución se guardan a la mayor que el navegador permite.`,
        `${n} figures as SVG and as ${r.toUpperCase()} at ${s * 75} dpi (${fmtNum(px / 1e6, 0)} million pixels in all${r === 'tiff' ? '; TIFF is uncompressed, about 3 bytes per pixel' : ''}), ${RP.tables.length} tables as CSV. Figures too large for that resolution are saved at the largest one the browser allows.`);
  }
  async function zip() {
    const html = ensure();
    if (!html) return;
    const o = Object.assign({}, B12.lastOpts, { raster: el('b12Raster').value, scale: +el('b12Scale').value, workbooks: el('b12ZipBooks').checked, data: el('b12ZipData').checked });
    el('b12ZipBtn').disabled = true;
    try {
      const t0 = performance.now();
      const blob = await RP.zip(o, html, async p => { msg('b12ZipMsg', [{ level: 'info', es: `Convirtiendo figuras: ${fmtNum(100 * p, 0)} %…`, en: `Converting figures: ${fmtNum(100 * p, 0)} %…` }]); await new Promise(r => setTimeout(r, 0)); });
      download(blob, fileBase() + '.zip');
      msg('b12ZipMsg', [{ level: 'success', es: `Paquete listo: ${fmtNum(blob.size / 1048576, 1)} MB en ${fmtNum((performance.now() - t0) / 1000, 1)} s.`, en: `Package ready: ${fmtNum(blob.size / 1048576, 1)} MB in ${fmtNum((performance.now() - t0) / 1000, 1)} s.` }]);
    } catch (e) {
      msg('b12ZipMsg', [{ level: 'error', es: 'No se pudo armar el paquete: ' + e.message, en: 'The package could not be built: ' + e.message }]);
    } finally { el('b12ZipBtn').disabled = false; }
  }

  /* ---------- 4 · cite ---------- */
  const renderCite = () => { el('b12CiteText').textContent = RP.citation(); };
  const copy = (text, host) => {
    const done = () => msg(host, [{ level: 'success', es: 'Copiado al portapapeles.', en: 'Copied to the clipboard.' }]);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const t = mk('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } t.remove(); }
  };

  function renderAll() {
    renderBlocks();
    renderCite();
    if (!el('b12Title').value) el('b12Title').placeholder = T('Informe de análisis genético', 'Genetic analysis report');
    const has = !!B12.html;
    el('b12Preview').style.display = has ? '' : 'none';
    el('b12Zip').style.display = has ? '' : 'none';
    if (has && B12.lang !== I18N.lang) msg('b12PrevMsg', [{ level: 'warning', es: 'El informe se armó en inglés; ármelo otra vez para tenerlo en español.', en: 'The report was built in Spanish; build it again to get it in English.' }]);
  }

  function init() {
    if (!el('b12Content')) return;
    el('b12Build').addEventListener('click', () => { build(); el('b12Preview').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    el('b12Print').addEventListener('click', printReport);
    el('b12Html').addEventListener('click', () => { const h = ensure(); if (h) download(new Blob([h], { type: 'text/html;charset=utf-8' }), fileBase() + '.html'); });
    el('b12Open').addEventListener('click', () => { const h = ensure(); if (!h) return; const u = URL.createObjectURL(new Blob([h], { type: 'text/html;charset=utf-8' })); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 120000); });
    el('b12CopyMethods').addEventListener('click', () => { ensure(); const m = window.MT && MT.last; if (m && m.text) copy(m.text, 'b12PrevMsg'); });
    el('b12CopyCite').addEventListener('click', () => copy(RP.citation(), 'b12PrevMsg'));
    el('b12ZipBtn').addEventListener('click', zip);
    ['b12Raster', 'b12Scale'].forEach(id => el(id).addEventListener('change', renderZipNote));
    el('b12Back').addEventListener('click', () => goStep(11));
    el('b12Home').addEventListener('click', () => goStep(1));
    document.addEventListener('stepchange', e => { if (e.detail.step === 12) { B12.built = true; B12.sel = null; renderAll(); } });
    document.addEventListener('langchange', () => { if (B12.built) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
