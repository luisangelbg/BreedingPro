/* BreedingPro — Block 2 interface: plan crosses and field.
   Reads the forms, calls Mating, Field and Precision, and draws the results.
   Everything re-renders when the language changes. */

(function () {
  const B2 = { tile: 'g2', plan: null, budget: null, seasons: null, field: null, loc: 0, power: null };
  window.B2 = B2;

  const TILES = [
    { id: 'g1', design: 'griffing', method: 1, art: 'griffing1', es: 'Griffing 1', en: 'Griffing 1', sub: ['progenitores, F₁ y recíprocas', 'parents, F₁ and reciprocals'] },
    { id: 'g2', design: 'griffing', method: 2, art: 'griffing2', es: 'Griffing 2', en: 'Griffing 2', sub: ['progenitores y F₁', 'parents and F₁'] },
    { id: 'g3', design: 'griffing', method: 3, art: 'griffing3', es: 'Griffing 3', en: 'Griffing 3', sub: ['F₁ y recíprocas', 'F₁ and reciprocals'] },
    { id: 'g4', design: 'griffing', method: 4, art: 'griffing4', es: 'Griffing 4', en: 'Griffing 4', sub: ['solo F₁', 'F₁ only'] },
    { id: 'partial', design: 'partial', art: 'partialDiallel', es: 'Dialelo parcial', en: 'Partial diallel', sub: ['circulante', 'circulant'] },
    { id: 'nc1', design: 'nc1', art: 'nc1', es: 'Carolina del Norte I', en: 'North Carolina I', sub: ['hembras anidadas', 'nested females'] },
    { id: 'nc2', design: 'nc2', art: 'nc2', es: 'Carolina del Norte II', en: 'North Carolina II', sub: ['factorial', 'factorial'] },
    { id: 'nc3', design: 'nc3', art: 'nc3', es: 'Carolina del Norte III', en: 'North Carolina III', sub: ['F₂ × P₁ y P₂', 'F₂ × P₁ and P₂'] },
    { id: 'ttc', design: 'ttc', art: 'ttc', es: 'Cruza triple de prueba', en: 'Triple test cross', sub: ['× P₁, P₂ y F₁', '× P₁, P₂ and F₁'] },
    { id: 'lxt', design: 'lxt', art: 'lineTester', es: 'Línea × probador', en: 'Line × tester', sub: ['líneas × probadores', 'lines × testers'] },
    { id: 'generations', design: 'generations', art: 'generationMeans', es: 'Generaciones', en: 'Generations', sub: ['P₁, P₂, F₁, F₂, BC₁, BC₂', 'P₁, P₂, F₁, F₂, BC₁, BC₂'] },
  ];
  /* orientative crossing yields; the user adjusts them */
  const CROPS = [
    { key: 'maize', es: 'Maíz', en: 'Maize', poll: 250, fem: 1, male: 4, plot: 40 },
    { key: 'sorghum', es: 'Sorgo', en: 'Sorghum', poll: 400, fem: 1, male: 3, plot: 80 },
    { key: 'wheat', es: 'Trigo', en: 'Wheat', poll: 30, fem: 3, male: 5, plot: 300 },
    { key: 'rice', es: 'Arroz', en: 'Rice', poll: 20, fem: 3, male: 6, plot: 200 },
    { key: 'bean', es: 'Frijol', en: 'Common bean', poll: 4, fem: 10, male: 10, plot: 40 },
    { key: 'tomato', es: 'Jitomate', en: 'Tomato', poll: 60, fem: 8, male: 10, plot: 20 },
    { key: 'pepper', es: 'Chile', en: 'Pepper', poll: 40, fem: 8, male: 10, plot: 20 },
    { key: 'squash', es: 'Calabaza', en: 'Squash', poll: 200, fem: 2, male: 3, plot: 10 },
    { key: 'sunflower', es: 'Girasol', en: 'Sunflower', poll: 300, fem: 1, male: 3, plot: 30 },
    { key: 'cotton', es: 'Algodón', en: 'Cotton', poll: 25, fem: 10, male: 10, plot: 40 },
    { key: 'other', es: 'Otro (valores propios)', en: 'Other (own values)' },
  ];
  const GEN_KEYS = ['P1', 'P2', 'F1', 'RF1', 'F2', 'BC1', 'BC2', 'F3', 'BC1S', 'BC2S'];
  const GEN_DEFAULT = ['P1', 'P2', 'F1', 'F2', 'BC1', 'BC2'];

  const num = (id, d) => { const v = parseFloat((el(id) || {}).value); return isFinite(v) ? v : d; };
  const int = (id, d) => Math.round(num(id, d));
  const tile = () => TILES.find(t => t.id === B2.tile);
  const msg = (host, list) => { clearMessages(host); list.forEach(x => showMessage(host, x.level === 'warning' ? 'warning' : x.level === 'info' ? 'info' : 'error', T(x))); };
  const statTiles = (host, items) => {
    host = el(host); host.innerHTML = '';
    items.forEach(([es, en, value, sub, level]) => host.appendChild(mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') },
      `<div class="stat-label">${keepGreek(T(es, en))}</div><div class="stat-value">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}`)));
  };
  const table = (host, cols, rows, limit) => {
    host = el(host);
    const shown = limit ? rows.slice(0, limit) : rows;
    let h = '<table><thead><tr>' + cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('') + '</tr></thead><tbody>';
    shown.forEach(r => { h += '<tr>' + cols.map(c => { const v = c.get(r); return `<td class="${c.num ? 'num' : ''}${c.cls ? ' ' + c.cls(r) : ''}">${v == null || v === '' ? '—' : v}</td>`; }).join('') + '</tr>'; });
    h += '</tbody></table>';
    if (limit && rows.length > limit) h += `<p class="hint" style="padding:6px 10px;margin:0">${T(`Se muestran ${limit} de ${rows.length} filas; la descarga las incluye todas.`, `Showing ${limit} of ${rows.length} rows; the download has them all.`)}</p>`;
    host.innerHTML = h;
  };
  const f2 = x => fmtFixed(x, 2), f3 = x => fmtFixed(x, 3);
  const pct = x => isFinite(x) ? Math.round(x * 100) + '%' : '—';

  /* ================= 1 · mating design ================= */
  function renderTiles() {
    const host = el('b2Tiles');
    host.innerHTML = TILES.map(t => `<button class="design-tile${t.id === B2.tile ? ' on' : ''}" data-tile="${t.id}" type="button">${Art[t.art]()}<b>${L2(t.es, t.en)}</b><small>${L2(t.sub[0], t.sub[1])}</small></button>`).join('');
  }
  function showFields() {
    const d = tile().design;
    els('#b2Design [data-show]').forEach(n => { n.style.display = n.dataset.show.split(' ').includes(d) ? '' : 'none'; });
  }
  function partialOptions() {
    const p = parentsList().length;
    const opts = Mating.partialOptions(p);
    const sel = el('b2S'), prev = +sel.value;
    sel.innerHTML = opts.map(s => `<option value="${s}">${s} → ${p * s / 2} ${T('cruzas', 'crosses')}</option>`).join('') || `<option value="0">${T('sin opciones', 'no options')}</option>`;
    sel.value = opts.includes(prev) ? prev : (opts.find(s => s >= Math.round(p / 2)) || opts[0] || 0);
  }
  function parentsList() {
    const r = Mating.parseNames(el('b2Parents').value, 'P', int('b2NParents', 6));
    return r.names;
  }
  function renderGenInputs() {
    const checks = el('b2Gens'), plants = el('b2GenPlants');
    if (!checks.dataset.built) {
      checks.dataset.built = '1';
      checks.innerHTML = GEN_KEYS.map(g => `<label class="checkbox-label gen-check"><input type="checkbox" value="${g}"${GEN_DEFAULT.includes(g) ? ' checked' : ''}> <b>${g}</b> <small>${L2(Mating.GENERATIONS[g].es, Mating.GENERATIONS[g].en)}</small></label>`).join('');
      plants.innerHTML = GEN_KEYS.map(g => `<label class="gen-plant" data-gen="${g}"><b>${g}</b><input type="number" min="5" max="10000" value="${Mating.GENERATIONS[g].seg ? 100 : 30}"></label>`).join('');
      checks.addEventListener('change', () => { syncGenPlants(); rebuild(); });
      plants.addEventListener('input', debounce(rebuild, 300));
    }
    syncGenPlants();
  }
  function syncGenPlants() {
    const on = els('#b2Gens input:checked').map(i => i.value);
    els('#b2GenPlants .gen-plant').forEach(l => { l.style.display = on.includes(l.dataset.gen) ? '' : 'none'; });
  }
  function allocateGenerations() {
    const gens = els('#b2Gens input:checked').map(i => i.value);
    const res = Precision.generationAllocation({ gens, total: int('b2GenTotal', 600), h2F2: num('b2GenH2', 0.5), dominanceRatio: num('b2GenDom', 0.8), minPlants: 20 });
    Object.entries(res.plants).forEach(([g, n]) => { const inp = document.querySelector(`#b2GenPlants [data-gen="${g}"] input`); if (inp) inp.value = n; });
    rebuild();
  }

  function readDesign() {
    const t = tile();
    const cfg = { design: t.design, method: t.method, F: num('b2Fcoef', 1) };
    cfg.checks = Mating.parseNames(el('b2Checks').value, '', 0).names;
    if (t.design === 'griffing' || t.design === 'partial') {
      const r = Mating.parseNames(el('b2Parents').value, 'P', int('b2NParents', 6));
      cfg.parents = r.names; cfg.duplicates = r.duplicates;
      cfg.s = int('b2S', 0); cfg.includeParents = el('b2PartialParents').checked; cfg.reciprocals = el('b2PartialRecip').checked;
    } else if (t.design === 'nc1' || t.design === 'nc2') {
      cfg.m = int('b2M', 4); cfg.f = t.design === 'nc1' ? int('b2F1', 4) : int('b2F2', 4); cfg.sets = Math.max(1, int('b2Sets', 1));
      cfg.population = el('b2Population').checked;
    } else if (t.design === 'nc3' || t.design === 'ttc') {
      cfg.p1 = el('b2P1').value.trim() || 'P1'; cfg.p2 = el('b2P2').value.trim() || 'P2'; cfg.f1 = `${cfg.p1} × ${cfg.p2}`;
      cfg.n = int('b2N', 30); cfg.source = t.design === 'ttc' ? el('b2Source').value : 'F2';
      cfg.haveF2 = el('b2HaveF2').checked; cfg.includeParents = el('b2BcParents').checked;
    } else if (t.design === 'lxt') {
      const l = Mating.parseNames(el('b2Lines').value, 'L', int('b2NLines', 10)), tt = Mating.parseNames(el('b2Testers').value, 'T', int('b2NTesters', 3));
      cfg.lines = l.names; cfg.testers = tt.names; cfg.duplicates = l.duplicates.concat(tt.duplicates);
      cfg.includeParents = el('b2LxtParents').checked;
    } else {
      cfg.p1 = el('b2P1').value.trim() || 'P1'; cfg.p2 = el('b2P2').value.trim() || 'P2';
      cfg.gens = els('#b2Gens input:checked').map(i => i.value);
      cfg.plants = {};
      els('#b2GenPlants .gen-plant').forEach(l => { cfg.plants[l.dataset.gen] = Math.max(1, Math.round(+l.querySelector('input').value || 0)); });
    }
    return cfg;
  }

  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    const s = Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {});
    Fig.mount(hostId, s);
  }

  function renderDesign() {
    const plan = B2.plan, cfg = plan.cfg;
    const issues = plan.issues.slice();
    if (cfg.duplicates && cfg.duplicates.length) issues.push({ es: `Nombres repetidos que se ignoraron: ${cfg.duplicates.join(', ')}.`, en: `Repeated names that were ignored: ${cfg.duplicates.join(', ')}.`, level: 'warning' });
    msg('b2DesignMsg', issues);
    const counts = {};
    plan.entries.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
    const parents = cfg.parents ? cfg.parents.length : cfg.lines ? cfg.lines.length + cfg.testers.length : cfg.design === 'nc1' ? cfg.m * cfg.sets * (1 + cfg.f) : cfg.design === 'nc2' ? cfg.sets * (cfg.m + cfg.f) : cfg.design === 'generations' ? 2 : 2 + cfg.n;
    statTiles('b2DesignTiles', [
      ['Progenitores o individuos', 'Parents or individuals', String(parents)],
      ['Cruzas por hacer', 'Crosses to make', String(plan.crosses.length)],
      ['Entradas a evaluar', 'Entries to evaluate', String(plan.entries.length), plan.cfg.checks.length ? T(`incluye ${plural(plan.cfg.checks.length, 'testigo', 'testigos')}`, `includes ${plural(plan.cfg.checks.length, 'check', 'checks')}`) : ''],
      ['Ciclos hasta la evaluación', 'Seasons to evaluation', String(B2.seasons.length)],
    ]);
    if (plan.errors.length) { el('b2FigMatrix').innerHTML = ''; el('b2FigCalendar').innerHTML = ''; }
    else {
      if (plan.matrix) {
        const nr = plan.matrix.rows.length, nc = plan.matrix.cols.length;
        const cell = Math.max(14, Math.min(40, 620 / Math.max(nr, nc)));
        mountFig('b2FigMatrix', { title: () => T('Plan de cruzamientos', 'Crossing plan'), fileName: 'crossing_plan', render: c => P2.crossMatrix(c, B2.plan), controls: () => [P2.titleControl(), P2.paletteControl(), { key: 'showSymbols', label: T('Símbolos en las celdas', 'Symbols in cells'), type: 'checkbox' }] },
          { width: Math.round(Math.max(520, 260 + nc * cell)), height: Math.round(Math.max(420, 250 + nr * cell)) });
      } else {
        mountFig('b2FigMatrix', { title: () => T('Generaciones y su origen', 'Generations and their origin'), fileName: 'generations', render: c => P2.pedigree(c, B2.plan), controls: () => [P2.titleControl(), P2.paletteControl(), { key: 'showPlants', label: T('Mostrar plantas', 'Show plants'), type: 'checkbox' }] }, { width: 720, height: 520 });
      }
      mountFig('b2FigCalendar', { title: () => T('Calendario por ciclos', 'Season calendar'), fileName: 'season_calendar', render: c => P2.timeline(c, B2.seasons), controls: () => [P2.titleControl(), P2.paletteControl()] },
        { width: Math.max(640, 290 * B2.seasons.length), height: Math.max(300, 130 + 23 * Math.max(...B2.seasons.map(s => s.tasks.reduce((n, t) => n + Math.ceil(T(t).length / 26) + 0.4, 0)))) });
    }
    el('b2ListCount').textContent = `· ${plan.entries.length} ${T('entradas', 'entries')}`;
    table('b2EntryTable', [
      { label: '#', num: true, get: e => e.entry },
      { label: T('Entrada', 'Entry'), get: e => esc(e.code) },
      { label: T('Hembra', 'Female'), get: e => esc(e.female) },
      { label: T('Macho', 'Male'), get: e => esc(e.male) },
      { label: T('Tipo', 'Type'), get: e => `<span class="type-dot" style="background:${P2.typeColor({ palette: 'breeding' }, e)}"></span>${esc(P2.typeName(e))}` },
      cfg.design === 'generations' ? { label: T('Plantas', 'Plants'), num: true, get: e => e.plants } : null,
    ].filter(Boolean), plan.entries, 300);
  }

  /* ================= 2 · seed ================= */
  function readSeed() {
    return { seedsPerPlot: num('b2SeedsPlot', 40), reps: Math.max(1, int('b2Reps', 3)), locations: Math.max(1, int('b2NLoc', 1)), safety: num('b2Safety', 30) / 100,
      seedsPerPollination: num('b2SeedsPoll', 250), success: num('b2Success', 70) / 100, femaleUnitsPerPlant: Math.max(1, int('b2FemUnits', 1)), pollinationsPerMale: Math.max(1, int('b2MaleUses', 4)) };
  }
  function renderSeed() {
    if (!B2.plan || B2.plan.errors.length) { el('b2SeedTiles').innerHTML = ''; el('b2ParentTable').innerHTML = ''; clearMessages('b2SeedMsg'); return; }
    const o = readSeed(), b = Mating.budget(B2.plan, o);
    B2.budget = b;
    msg('b2SeedMsg', b.warnings.map(w => Object.assign({ level: 'warning' }, w)));
    const perPlot = B2.plan.design === 'generations' ? T('según plantas por generación', 'from plants per generation') : T(`${o.seedsPerPlot} × ${o.reps} rep. × ${o.locations} loc. + ${Math.round(o.safety * 100)}%`, `${o.seedsPerPlot} × ${o.reps} reps × ${o.locations} loc. + ${Math.round(o.safety * 100)}%`);
    statTiles('b2SeedTiles', [
      ['Semilla por entrada', 'Seed per entry', fmtNum(b.perEntry.find(x => x.kind !== 'check') ? Math.max(...b.perEntry.map(x => x.seed)) : 0, 0), perPlot],
      ['Polinizaciones de cruza', 'Cross pollinations', fmtNum(b.totals.crossPollinations, 0), T(`${B2.plan.crosses.length} cruzas`, `${B2.plan.crosses.length} crosses`)],
      ['Autofecundaciones', 'Self-pollinations', fmtNum(b.totals.selfPollinations, 0), b.totals.selfPollinations ? T('semilla de los progenitores que se evalúan', 'seed of the parents that are evaluated') : T('no se evalúan progenitores', 'no parents are evaluated')],
      ['Plantas hembra', 'Female plants', fmtNum(b.totals.femalePlants, 0)],
      ['Plantas macho', 'Male plants', fmtNum(b.totals.malePlants, 0)],
    ]);
    table('b2ParentTable', [
      { label: T('Progenitor', 'Parent'), get: p => esc(p.name) },
      { label: T('Polinizaciones como hembra', 'Pollinations as female'), num: true, get: p => p.asFemale || '' },
      { label: T('Como macho', 'As male'), num: true, get: p => p.asMale || '' },
      { label: T('Autofecundaciones', 'Selfs'), num: true, get: p => p.selfs || '' },
      { label: T('Plantas hembra', 'Female plants'), num: true, get: p => p.femalePlants || '' },
      { label: T('Plantas macho', 'Male plants'), num: true, get: p => p.malePlants || '' },
    ], b.parents, 200);
  }

  /* ================= 3 · field ================= */
  function locationNames() {
    const n = Math.max(1, int('b2NLoc', 1));
    const given = el('b2LocNames').value.split(',').map(s => s.trim()).filter(Boolean);
    return Array.from({ length: n }, (_, i) => given[i] || T(`Localidad ${i + 1}`, `Location ${i + 1}`));
  }
  function suggestK(v) {
    let best = null;
    for (let k = 3; k <= Math.min(20, Math.floor(v / 2)); k++) {
      const score = Math.abs(k - Math.sqrt(v)) + (v % k === 0 ? 0 : 2);
      if (!best || score < best.score) best = { k, score };
    }
    return best ? best.k : 2;
  }
  function readField() {
    const design = el('b2FieldDesign').value;
    return { design, reps: Math.max(1, int('b2Reps', 3)), k: int('b2K', 5), blocks: int('b2AugBlocks', 6), locations: locationNames(), seed: int('b2Seed', 2026) >>> 0,
      plotsPerRow: int('b2PlotsRow', 0), arrangement: el('b2Arrange').value, numbering: el('b2Numbering').value };
  }
  function fieldVisibility() {
    const d = el('b2FieldDesign').value;
    els('#b2Field [data-field]').forEach(n => { n.style.display = n.dataset.field === d ? '' : 'none'; });
  }
  function generateField() {
    if (!B2.plan || B2.plan.errors.length) { msg('b2FieldMsg', [{ es: 'Corrija primero el plan de cruzamientos.', en: 'Fix the crossing plan first.' }]); return; }
    const o = readField();
    const t0 = performance.now();
    B2.field = Field.generate(B2.plan.entries, o);
    B2.field.ms = performance.now() - t0;
    B2.loc = 0;
    renderField();
    state.plan = { plan: B2.plan, budget: B2.budget, field: B2.field };
  }
  /* from a click or a change: the alpha-lattice search can take a while, so the LABG
     waiting window shows up if it lasts (same seed, same map) */
  function fieldWork() { const w = bpWork('Generando el croquis de campo', 'Generating the field map'); bpAfterPaint(generateField, w); }
  function renderField() {
    const F = B2.field;
    if (!F) return;
    msg('b2FieldMsg', F.issues);
    if (!F.locations) { el('b2FieldTiles').innerHTML = ''; el('b2FigField').innerHTML = ''; el('b2BookWrap').style.display = 'none'; el('b2LocPick').style.display = 'none'; return; }
    const o = F.options, L = F.locations.length;
    const area = F.plotsPerLocation * num('b2RowsPlot', 2) * num('b2RowLen', 5) * num('b2RowSp', 0.8);
    const items = [
      ['Parcelas por localidad', 'Plots per location', fmtNum(F.plotsPerLocation, 0), T(`${plural(L, 'localidad', 'localidades')} · ${fmtNum(F.plotsPerLocation * L, 0)} en total`, `${plural(L, 'location', 'locations')} · ${fmtNum(F.plotsPerLocation * L, 0)} in total`)],
      ['Superficie por localidad', 'Area per location', area >= 10000 ? f2(area / 10000) + ' ha' : fmtNum(area, 0) + ' m²', T('sin calles ni bordos', 'without alleys or borders')],
      ['Grados de libertad del error', 'Error degrees of freedom', String(F.errorDf), T('por localidad', 'per location'), F.errorDf < 12 ? 'warn' : 'ok'],
    ];
    if (F.design === 'alpha') {
      const st = F.structure;
      items.push(['Factor de eficiencia E', 'Efficiency factor E', f3(st.efficiency), isFinite(st.upperBound) ? T(`cota superior ${f3(st.upperBound)}`, `upper bound ${f3(st.upperBound)}`) : T('bloques de dos tamaños', 'two block sizes'), st.efficiency >= 0.98 * st.upperBound ? 'ok' : '']);
      items.push(['Encuentros máximos', 'Maximum concurrence', String(st.maxConcurrence), T(`${st.s} bloques por repetición${st.cyclic ? ' · construcción cíclica α(0,1)' : ''}`, `${st.s} blocks per replicate${st.cyclic ? ' · cyclic α(0,1) construction' : ''}`), st.maxConcurrence <= 1 ? 'ok' : '']);
    }
    statTiles('b2FieldTiles', items);
    /* location picker */
    const sel = el('b2LocSelect');
    sel.innerHTML = F.locations.map((l, i) => `<option value="${i}">${esc(l.name)}</option>`).join('');
    sel.value = B2.loc; el('b2LocPick').style.display = L > 1 ? '' : 'none';
    const lay = F.locations[B2.loc];
    const cw = Math.max(26, Math.min(80, 1100 / lay.nCols)), ch = Math.max(18, Math.min(40, cw * 0.55));
    mountFig('b2FigField', {
      title: () => T(`Croquis de campo · ${B2.field.locations[B2.loc].name}`, `Field map · ${B2.field.locations[B2.loc].name}`), fileName: 'field_map',
      render: c => P2.fieldMap(c, B2.field, B2.loc),
      controls: () => [P2.titleControl(), P2.paletteControl(),
        { key: 'colorBy', label: T('Color según', 'Colour by'), type: 'select', options: [['type', T('tipo de entrada', 'entry type')], ['rep', T('repetición', 'replicate')], ['none', T('sin color', 'no colour')]] },
        { key: 'showEntry', label: T('Mostrar entradas', 'Show entries'), type: 'checkbox' }, { key: 'showPlot', label: T('Mostrar número de parcela', 'Show plot numbers'), type: 'checkbox' }],
    }, { width: Math.round(Math.min(2400, 110 + lay.nCols * cw)), height: Math.round(Math.min(2000, 190 + lay.nRows * ch)) });
    renderBook();
  }
  function traits() { return el('b2Traits').value.split(',').map(s => s.trim()).filter(Boolean); }
  function renderBook() {
    const F = B2.field; if (!F || !F.locations) return;
    const book = Field.book(B2.plan, F, { lang: I18N.lang, traits: traits(), typeName: P2.typeName });
    B2.book = book;
    el('b2BookWrap').style.display = '';
    el('b2BookCount').textContent = `· ${book.rows.length} ${T('parcelas', 'plots')}`;
    const cols = book.header.map((h, i) => ({ label: esc(h), num: [1, 2, 3, 4, 5, 6].includes(i), get: r => esc(r[i]) }));
    table('b2BookTable', cols, book.rows, 60);
  }
  function downloadCsv() {
    const book = B2.book; if (!book) return;
    const lines = [];
    if (el('b2MetaLine').checked) lines.push(csvEscape(book.meta));
    lines.push(book.header.map(csvEscape).join(','));
    book.rows.forEach(r => lines.push(r.map(csvEscape).join(',')));
    download('﻿' + lines.join('\r\n'), `${T('libreta_de_campo', 'field_book')}.csv`, 'text/csv;charset=utf-8');
  }
  function downloadXlsx() {
    const book = B2.book; if (!book || typeof XLSX === 'undefined') return;
    const wb = XLSX.utils.book_new();
    const aoa = (el('b2MetaLine').checked ? [[book.meta]] : []).concat([book.header], book.rows);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), T('Libreta', 'FieldBook'));
    const entries = [[ '#', T('Entrada', 'Entry'), T('Hembra', 'Female'), T('Macho', 'Male'), T('Tipo', 'Type'), T('Semilla necesaria', 'Seed needed'), T('Polinizaciones', 'Pollinations')]];
    B2.plan.entries.forEach((e, i) => { const b = B2.budget ? B2.budget.perEntry[i] : {}; entries.push([e.entry, e.code, e.female, e.male, P2.typeName(e), b.seed, b.pollinations]); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(entries), T('Entradas', 'Entries'));
    if (B2.budget) {
      const par = [[T('Progenitor', 'Parent'), T('Como hembra', 'As female'), T('Como macho', 'As male'), T('Autofecundaciones', 'Selfs'), T('Plantas hembra', 'Female plants'), T('Plantas macho', 'Male plants')]];
      B2.budget.parents.forEach(p => par.push([p.name, p.asFemale, p.asMale, p.selfs, p.femalePlants, p.malePlants]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(par), T('Cruzamiento', 'CrossingBlock'));
    }
    const o = B2.field.options, st = B2.field.structure;
    const design = [[T('Parámetro', 'Parameter'), T('Valor', 'Value')],
      [T('Diseño de apareamiento', 'Mating design'), T(tile())], [T('Diseño de campo', 'Field design'), el('b2FieldDesign').selectedOptions[0].textContent],
      [T('Repeticiones', 'Replicates'), o.reps], [T('Localidades', 'Locations'), o.locations.join(', ')], [T('Semilla aleatoria', 'Random seed'), o.seed],
      [T('Grados de libertad del error', 'Error degrees of freedom'), B2.field.errorDf]];
    if (st) design.push([T('Parcelas por bloque', 'Plots per block'), o.k], [T('Factor de eficiencia', 'Efficiency factor'), +st.efficiency.toFixed(4)], [T('Cota superior', 'Upper bound'), isFinite(st.upperBound) ? +st.upperBound.toFixed(4) : '']);
    design.push([T('Generado con', 'Generated with'), 'BreedingPro'], [T('Fecha', 'Date'), new Date().toISOString().slice(0, 10)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(design), T('Diseño', 'Design'));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${T('libreta_de_campo', 'field_book')}.xlsx`);
  }

  /* ================= 4 · precision and power ================= */
  function readPower() {
    const mean = num('b2Mean', 8), sq = x => x * x;
    const F = num('b2Fcoef', 1);
    const s2A = sq(num('b2CVA', 10) * mean / 100), s2D = sq(num('b2CVD', 8) * mean / 100);
    return { mean, sigma2e: sq(num('b2CV', 12) * mean / 100), s2A, s2D, F, s2g: 0.25 * (1 + F) * s2A, s2s: 0.25 * Math.pow(1 + F, 2) * s2D,
      alpha: num('b2Alpha', 0.05), power: num('b2TargetPower', 0.8), r: Math.max(2, int('b2Reps', 3)), L: Math.max(1, int('b2NLoc', 1)), vary: el('b2Vary').value };
  }
  function powerCell(p, target) { return `<span class="pw ${p >= target ? 'ok' : p >= 0.5 ? 'mid' : 'low'}">${pct(p)}</span>`; }

  function renderPower() {
    const host = { se: 'b2SeTable', pw: 'b2PowerTable', comp: 'b2CompTable' };
    const plan = B2.plan;
    const clear = () => { el(host.se).innerHTML = ''; el(host.pw).innerHTML = ''; el(host.comp).innerHTML = ''; el('b2PowerText').innerHTML = ''; el('b2FigPower').innerHTML = ''; };
    if (!plan || plan.errors.length) { clear(); return; }
    const o = readPower(), cfg = plan.cfg, d = plan.design;
    const checks = cfg.checks.length;
    const notes = [];
    if (o.L > 1) notes.push({ es: 'Se supone que no hay interacción de los efectos genéticos con las localidades; si la hay, la potencia real será menor.', en: 'No interaction of the genetic effects with locations is assumed; if there is one, real power will be lower.', level: 'info' });
    let res, pts = [], series = [], xes = 'Número de progenitores', xen = 'Number of parents', current = null;
    const seCols = [
      { label: T('Estimación', 'Estimate'), get: x => T(x) },
      { label: T('Error estándar', 'Standard error'), num: true, get: x => f3(x.se) },
      { label: 'DMS', num: true, get: x => x.lsd != null ? f3(x.lsd) : '' },
      { label: T('Diferencia detectable', 'Detectable difference'), num: true, get: x => x.detectable != null ? `${f3(x.detectable)} <small>(${fmtNum(100 * x.detectable / o.mean, 1)}%)</small>` : '' },
    ];
    const powCols = [
      { label: T('Prueba', 'Test'), get: x => T(x) },
      { label: T('Modelo', 'Model'), get: x => x.model },
      { label: 'gl', num: true, get: x => `${fmtNum(x.df1, 0)}, ${fmtNum(x.df2, 0)}` },
      { label: T('Potencia', 'Power'), num: true, get: x => powerCell(x.power, o.power) },
    ];
    const tagModel = (list, es, en) => list.map(x => Object.assign({}, x, { model: T(es, en) }));

    if (d === 'griffing') {
      const q = { p: cfg.parents.length, method: cfg.method, r: o.r, L: o.L, sigma2e: o.sigma2e, alpha: o.alpha, power: o.power, sdG: Math.sqrt(o.s2g), sdS: Math.sqrt(o.s2s), s2g: o.s2g, s2s: o.s2s, F: o.F, extraEntries: checks };
      res = Precision.griffing(q);
      table(host.se, seCols, res.effects.map(e => Object.assign({}, e, { lsd: null, detectable: null })).concat(res.diffs));
      table(host.pw, powCols, tagModel(res.fixed, 'I · fijo', 'I · fixed').concat(tagModel(res.random, cfg.method === 1 ? 'II · aleatorio (aprox.)' : 'II · aleatorio', cfg.method === 1 ? 'II · random (approx.)' : 'II · random')));
      if (cfg.method === 1) notes.push({ es: 'En el método 1 el cuadrado medio de la ACE mezcla celdas diagonales y no diagonales; la potencia del modelo II es una aproximación (difiere de la simulación en unas 0.01).', en: 'In Method 1 the SCA mean square mixes diagonal and off-diagonal cells; Model II power is an approximation (it differs from simulation by about 0.01).', level: 'info' });
      const c = res.components;
      table(host.comp, [
        { label: T('Componente', 'Component'), get: x => x.n },
        { label: T('Supuesto', 'Assumed'), num: true, get: x => f3(x.v) },
        { label: T('Error estándar', 'Standard error'), num: true, get: x => f3(x.se) },
        { label: 'CV', num: true, get: x => x.v > 0 ? `<span class="pw ${x.se / x.v <= 0.5 ? 'ok' : x.se / x.v <= 1 ? 'mid' : 'low'}">${fmtNum(100 * x.se / x.v, 0)}%</span>` : '' },
      ], [{ n: T('σ²ACG', 'σ²GCA'), v: c.s2g, se: c.seS2g }, { n: T('σ²ACE', 'σ²SCA'), v: c.s2s, se: c.seS2s }, { n: 'σ²A', v: c.s2A, se: c.seS2A }, { n: 'σ²D', v: c.s2D, se: c.seS2D }]);
      if (o.vary === 'n') { pts = Precision.griffingCurve(q, 'p', cfg.method >= 3 ? 5 : 4, 24); current = q.p; }
      else { pts = Precision.griffingCurve(q, 'r', 2, 8); current = q.r; xes = 'Repeticiones por localidad'; xen = 'Replicates per location'; }
      series = [{ key: 'fixedG', es: 'ACG · modelo I', en: 'GCA · Model I', color: 0 }, { key: 'fixedS', es: 'ACE · modelo I', en: 'SCA · Model I', color: 3 },
        { key: 'randomG', es: 'σ²ACG · modelo II', en: 'σ²GCA · Model II', color: 0, dash: '6 4' }, { key: 'randomS', es: 'σ²ACE · modelo II', en: 'σ²SCA · Model II', color: 3, dash: '6 4' }];
      /* how many parents for a random-model GCA test with the target power */
      let need = null;
      for (let p = Math.max(4, cfg.method >= 3 ? 5 : 4); p <= 80; p++) { const rr = Precision.griffing(Object.assign({}, q, { p })); const g = rr.random.find(x => x.key === 'gca'); if (g && g.power >= o.power) { need = p; break; } }
      const g1 = res.fixed.find(x => x.key === 'gca'), g2 = res.random.find(x => x.key === 'gca');
      el('b2PowerText').innerHTML = T(
        `Con <b>${q.p} progenitores</b>, método ${cfg.method}, ${plural(o.r, 'repetición', 'repeticiones')} y ${plural(o.L, 'localidad', 'localidades')}: la probabilidad de detectar diferencias de <b>ACG entre estos progenitores</b> (modelo I) es <b>${pct(g1 && g1.power)}</b>, y la de concluir que <b>σ²ACG > 0 en la población</b> (modelo II) es <b>${pct(g2 && g2.power)}</b>. ` +
        (need ? (need > q.p ? `Para esa inferencia poblacional con ${pct(o.power)} de potencia se necesitan unos <b>${need} progenitores</b>: la precisión de las varianzas depende sobre todo del número de progenitores, no de las repeticiones.` : 'El número de progenitores basta para la inferencia poblacional.') : 'Ni con 80 progenitores se alcanza esa potencia en el modelo II con estos supuestos.'),
        `With <b>${q.p} parents</b>, Method ${cfg.method}, ${plural(o.r, 'replicate', 'replicates')} and ${plural(o.L, 'location', 'locations')}: the probability of detecting <b>GCA differences among these parents</b> (Model I) is <b>${pct(g1 && g1.power)}</b>, and that of concluding <b>σ²GCA > 0 in the population</b> (Model II) is <b>${pct(g2 && g2.power)}</b>. ` +
        (need ? (need > q.p ? `For that population-level inference with ${pct(o.power)} power about <b>${need} parents</b> are needed: the precision of variances depends mainly on the number of parents, not on replication.` : 'The number of parents suffices for population-level inference.') : 'Not even 80 parents reach that power in Model II under these assumptions.'));
    } else if (d === 'partial') {
      const q = { p: cfg.parents.length, s: cfg.s, r: o.r, L: o.L, sigma2e: o.sigma2e, alpha: o.alpha, sdG: Math.sqrt(o.s2g), sdS: Math.sqrt(o.s2s), s2g: o.s2g, s2s: o.s2s, includeParents: cfg.includeParents, extraEntries: checks };
      res = Precision.partial(q);
      table(host.se, [{ label: T('ĝᵢ − ĝⱼ a distancia circulante', 'ĝᵢ − ĝⱼ at circulant distance'), get: x => x.distance }, { label: T('Error estándar', 'Standard error'), num: true, get: x => f3(x.se) }, { label: 'DMS', num: true, get: x => f3(x.lsd) }], res.distances);
      table(host.pw, powCols, tagModel(res.fixed, 'I · fijo', 'I · fixed').concat(tagModel(res.random, 'II · aleatorio', 'II · random')));
      el(host.comp).innerHTML = `<p class="hint">${T('En el dialelo parcial la precisión de ĝᵢ − ĝⱼ depende de qué tan lejos están los progenitores en el esquema circulante.', 'In the partial diallel the precision of ĝᵢ − ĝⱼ depends on how far apart the parents are in the circulant scheme.')}</p>`;
      const valid = [];
      for (let p = q.s + 2; p <= 40; p++) if (Mating.partialOptions(p).includes(q.s)) valid.push(p);
      pts = (o.vary === 'n' ? valid : [2, 3, 4, 5, 6, 7, 8]).map(x => { const rr = Precision.partial(Object.assign({}, q, o.vary === 'n' ? { p: x } : { r: x })); const pk = (l, k) => { const it = l.find(z => z.key === k); return it ? it.power : NaN; }; return { x, fixedG: pk(rr.fixed, 'gca'), fixedS: pk(rr.fixed, 'sca'), randomG: pk(rr.random, 'gca'), randomS: pk(rr.random, 'sca') }; });
      current = o.vary === 'n' ? q.p : q.r; if (o.vary !== 'n') { xes = 'Repeticiones por localidad'; xen = 'Replicates per location'; }
      series = [{ key: 'fixedG', es: 'ACG · modelo I', en: 'GCA · Model I', color: 0 }, { key: 'fixedS', es: 'ACE · modelo I', en: 'SCA · Model I', color: 3 }, { key: 'randomG', es: 'σ²ACG · modelo II', en: 'σ²GCA · Model II', color: 0, dash: '6 4' }, { key: 'randomS', es: 'σ²ACE · modelo II', en: 'σ²SCA · Model II', color: 3, dash: '6 4' }];
      el('b2PowerText').innerHTML = T(`El dialelo parcial evalúa ${res.N} cruzas en lugar de ${q.p * (q.p - 1) / 2}; la ACG de cada progenitor se estima con ${q.s} cruzas.`, `The partial diallel tests ${res.N} crosses instead of ${q.p * (q.p - 1) / 2}; each parent's GCA is estimated from ${q.s} crosses.`);
    } else if (d === 'lxt') {
      const q = { l: cfg.lines.length, t: cfg.testers.length, r: o.r, L: o.L, sigma2e: o.sigma2e, alpha: o.alpha, power: o.power, sdGl: Math.sqrt(o.s2g), sdGt: Math.sqrt(o.s2g), sdS: Math.sqrt(o.s2s), s2gl: o.s2g, s2gt: o.s2g, s2s: o.s2s, includeParents: cfg.includeParents, extraEntries: checks };
      res = Precision.lxt(q);
      table(host.se, seCols.concat([{ label: T('EE convencional', 'Conventional SE'), num: true, get: x => f3(x.seConventional) }]), res.effects);
      table(host.pw, powCols, tagModel(res.fixed, 'I · fijo', 'I · fixed').concat(tagModel(res.random, 'II · aleatorio', 'II · random')));
      el(host.comp).innerHTML = `<p class="hint">${T('El error estándar convencional ignora los factores (l − 1)/l y (t − 1)/t y sobrestima la incertidumbre; aquí se usan los exactos.', 'The conventional standard error ignores the factors (l − 1)/l and (t − 1)/t and overstates the uncertainty; the exact ones are used here.')}</p>`;
      const xs = o.vary === 'n' ? [4, 6, 8, 10, 12, 16, 20, 25, 30, 40, 50] : [2, 3, 4, 5, 6, 7, 8];
      pts = xs.map(x => { const rr = Precision.lxt(Object.assign({}, q, o.vary === 'n' ? { l: x } : { r: x })); const pk = (l, k) => { const it = l.find(z => z.key === k); return it ? it.power : NaN; }; return { x, fixedG: pk(rr.fixed, 'lines'), fixedS: pk(rr.fixed, 'lxt'), randomG: pk(rr.random, 'lines'), randomS: pk(rr.random, 'lxt') }; });
      current = o.vary === 'n' ? q.l : q.r; xes = o.vary === 'n' ? 'Número de líneas' : 'Repeticiones por localidad'; xen = o.vary === 'n' ? 'Number of lines' : 'Replicates per location';
      series = [{ key: 'fixedG', es: 'ACG líneas · modelo I', en: 'Line GCA · Model I', color: 4 }, { key: 'fixedS', es: 'ACE · modelo I', en: 'SCA · Model I', color: 3 }, { key: 'randomG', es: 'σ²ACG líneas · modelo II', en: 'σ²GCA lines · Model II', color: 4, dash: '6 4' }, { key: 'randomS', es: 'σ²ACE · modelo II', en: 'σ²SCA · Model II', color: 3, dash: '6 4' }];
      el('b2PowerText').innerHTML = T(`Con ${plural(q.t, 'probador', 'probadores')}, la ACG de cada línea se promedia sobre ${q.t} cruzas; más probadores de base genética distinta dan una ACG más general.`, `With ${plural(q.t, 'tester', 'testers')}, each line's GCA is averaged over ${q.t} crosses; more testers of different genetic background give a more general GCA.`);
    } else if (d === 'nc1' || d === 'nc2' || d === 'nc3' || d === 'ttc') {
      const design = d === 'ttc' ? 'nc3' : d;
      const q = { design, m: cfg.m, f: cfg.f, n: cfg.n, sets: cfg.sets, r: o.r * o.L, sigma2e: o.sigma2e, s2A: o.s2A, s2D: o.s2D, F: design === 'nc3' ? 0 : o.F, alpha: o.alpha };
      res = Precision.nc(q);
      el(host.se).innerHTML = `<p class="hint">${T('En estos diseños el objetivo son las varianzas σ²A y σ²D de la población, no efectos individuales; vea las tablas de la derecha.', 'In these designs the goal is the population variances σ²A and σ²D, not individual effects; see the tables on the right.')}</p>` +
        (design === 'nc3' ? `<p class="hint">${T('Base F₂ (p = q = ½), parametrización de Comstock y Robinson: σ²m = ¼σ²A y σ²ml = σ²D. La cruza triple de prueba usa las mismas sumas y diferencias, más la prueba de epistasis L₁ + L₂ − 2L₃.', 'F₂ base (p = q = ½), Comstock and Robinson parametrisation: σ²m = ¼σ²A and σ²ml = σ²D. The triple test cross uses the same sums and differences, plus the epistasis test L₁ + L₂ − 2L₃.')}</p>` : '');
      table(host.pw, powCols, tagModel(res.tests, 'aleatorio', 'random'));
      table(host.comp, [
        { label: T('Componente', 'Component'), get: x => T(x) },
        { label: T('Supuesto', 'Assumed'), num: true, get: x => f3(x.value) },
        { label: T('Error estándar', 'Standard error'), num: true, get: x => f3(x.se) },
        { label: 'CV', num: true, get: x => x.value > 0 ? `<span class="pw ${x.se / x.value <= 0.5 ? 'ok' : x.se / x.value <= 1 ? 'mid' : 'low'}">${fmtNum(100 * x.se / x.value, 0)}%</span>` : '' },
      ], res.comps);
      const xs = o.vary === 'n' ? (design === 'nc3' ? [10, 15, 20, 25, 30, 40, 50, 60, 80, 100] : [2, 3, 4, 5, 6, 8, 10, 12, 16, 20]) : [2, 3, 4, 5, 6, 7, 8];
      const key0 = res.tests[0].key, key1 = res.tests[res.tests.length - 1].key;
      pts = xs.map(x => { const rr = Precision.nc(Object.assign({}, q, o.vary === 'n' ? (design === 'nc3' ? { n: x } : { m: x }) : { r: x * o.L })); return { x, a: rr.tests.find(z => z.key === key0).power, b: rr.tests.find(z => z.key === key1).power }; });
      current = o.vary === 'n' ? (design === 'nc3' ? q.n : q.m) : o.r;
      xes = o.vary === 'n' ? (design === 'nc3' ? 'Plantas F₂ probadas' : 'Machos por conjunto') : 'Repeticiones por localidad';
      xen = o.vary === 'n' ? (design === 'nc3' ? 'F₂ plants tested' : 'Males per set') : 'Replicates per location';
      series = [{ key: 'a', es: T(res.tests[0]), en: T(res.tests[0]), color: 0 }, { key: 'b', es: T(res.tests[res.tests.length - 1]), en: T(res.tests[res.tests.length - 1]), color: 3 }];
      notes.push({ es: 'Las varianzas de estos diseños se estiman en un solo ambiente; si se promedian localidades sin modelar la interacción, σ²A y σ²D quedan infladas por σ²GA.', en: 'These variances are estimated in a single environment; averaging locations without modelling the interaction inflates σ²A and σ²D by σ²GE.', level: 'info' });
      /* the message follows the actual coefficients of variation: Design III estimates dominance well */
      const cvA = 100 * res.comps[0].se / res.comps[0].value, cvD = 100 * res.comps[1].se / res.comps[1].value, pc = x => fmtNum(x, 0) + '%';
      el('b2PowerText').innerHTML = cvD > 1.3 * cvA
        ? T(`La dominancia se estima con mucha menos precisión que la varianza aditiva (CV de σ²D ${pc(cvD)} contra ${pc(cvA)} de σ²A): fíjese en el CV de σ²D antes de decidir el tamaño del experimento.`, `Dominance is estimated far less precisely than additive variance (CV of σ²D ${pc(cvD)} against ${pc(cvA)} for σ²A): check the CV of σ²D before deciding the size of the experiment.`)
        : T(`σ²A y σ²D se estiman con una precisión parecida (CV de ${pc(cvA)} y ${pc(cvD)})${design === 'nc3' ? ': por eso el diseño III es el más eficiente para estimar el grado medio de dominancia' : ''}.`, `σ²A and σ²D are estimated with similar precision (CV of ${pc(cvA)} and ${pc(cvD)})${design === 'nc3' ? ': that is why Design III is the most efficient for the average degree of dominance' : ''}.`);
    } else {
      /* generations: standard error of every generation mean */
      const gens = plan.entries.filter(e => e.type === 'generation');
      const alloc = Precision.generationAllocation({ gens: gens.map(e => e.generation), total: 1, h2F2: num('b2GenH2', 0.5), dominanceRatio: num('b2GenDom', 0.8) });
      const E = o.sigma2e;
      table(host.se, [
        { label: T('Generación', 'Generation'), get: x => x.g },
        { label: T('Plantas', 'Plants'), num: true, get: x => x.n },
        { label: T('Varianza esperada', 'Expected variance'), num: true, get: x => f3(x.v) },
        { label: T('EE de la media', 'SE of the mean'), num: true, get: x => f3(x.se) },
      ], gens.map(e => { const v = alloc.variances[e.generation] * E; return { g: e.generation, n: e.plants * o.L, v, se: Math.sqrt(v / (e.plants * o.L)) }; }));
      el(host.pw).innerHTML = `<p class="hint">${T('Las pruebas de escala comparan combinaciones de medias; su precisión mejora cuando los errores estándar de todas las generaciones son parecidos (botón «Repartir» de la tarjeta 1).', 'The scaling tests compare combinations of means; their precision improves when every generation has a similar standard error (the "Share out" button in card 1).')}</p>`;
      el(host.comp).innerHTML = ''; el('b2FigPower').innerHTML = ''; el('b2PowerText').innerHTML = '';
      msg('b2PowerMsg', notes);
      return;
    }
    msg('b2PowerMsg', notes);
    B2.powerPts = pts; B2.powerOpt = { target: o.power, series, xes, xen, current };
    if (pts.length > 1) mountFig('b2FigPower', { title: () => T('Potencia según el tamaño del experimento', 'Power by experiment size'), fileName: 'power_curve', render: c => P2.powerCurve(c, B2.powerPts, B2.powerOpt), controls: () => [P2.titleControl(), P2.paletteControl()] }, { width: 900, height: 470 });
  }

  /* ================= wiring ================= */
  function debounce(fn, ms) { let t = null; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* when names are typed, the "or number of …" box shows their count and is locked */
  function syncCounts() {
    [['b2Parents', 'b2NParents'], ['b2Lines', 'b2NLines'], ['b2Testers', 'b2NTesters']].forEach(([txt, box]) => {
      const k = Mating.parseNames(el(txt).value, '', 0).names.length, b = el(box);
      if (k) b.value = k;
      b.disabled = k > 0;
    });
  }

  function rebuild() {
    const t = tile();
    syncCounts();
    if (t.design === 'partial') partialOptions();
    const cfg = readDesign();
    B2.plan = Mating.build(cfg);
    B2.seasons = Mating.seasons(B2.plan, readSeed());
    renderDesign();
    renderSeed();
    /* the field plan belongs to the previous entries: regenerate it when it is cheap, otherwise ask */
    const o = readField();
    const small = B2.plan.entries.length * o.reps * o.locations.length <= 2500 && !(o.design === 'alpha' && B2.plan.entries.length > 200);
    if (!B2.plan.errors.length && small) generateField();
    else if (B2.field) { B2.field = null; el('b2FigField').innerHTML = ''; el('b2BookWrap').style.display = 'none'; el('b2FieldTiles').innerHTML = ''; msg('b2FieldMsg', [{ es: 'El plan cambió: pulse «Generar croquis y libreta».', en: 'The plan changed: press "Generate map and field book".', level: 'info' }]); }
    renderPower();
    state.plan = { plan: B2.plan, budget: B2.budget, field: B2.field };
  }

  function init() {
    if (!el('b2Tiles')) return;
    renderTiles(); showFields(); renderGenInputs(); fieldVisibility();
    el('b2Crop').innerHTML = CROPS.map(c => `<option value="${c.key}" data-es="${c.es}" data-en="${c.en}">${T(c.es, c.en)}</option>`).join('');
    el('b2Tiles').addEventListener('click', e => {
      const b = e.target.closest('.design-tile'); if (!b) return;
      B2.tile = b.dataset.tile;
      els('.design-tile', el('b2Tiles')).forEach(x => x.classList.toggle('on', x === b));
      showFields();
      if (tile().design === 'nc3' || tile().design === 'ttc' || tile().design === 'nc1' || (tile().design === 'nc2' && el('b2Population').checked)) el('b2Fcoef').value = '0';
      else if (tile().design !== 'generations') el('b2Fcoef').value = '1';
      rebuild();
    });
    const soft = debounce(rebuild, 350);
    ['b2Parents', 'b2NParents', 'b2M', 'b2F1', 'b2F2', 'b2Sets', 'b2P1', 'b2P2', 'b2N', 'b2Lines', 'b2NLines', 'b2Testers', 'b2NTesters', 'b2Checks']
      .forEach(id => el(id).addEventListener('input', soft));
    ['b2S', 'b2PartialParents', 'b2PartialRecip', 'b2Population', 'b2Source', 'b2HaveF2', 'b2BcParents', 'b2LxtParents'].forEach(id => el(id).addEventListener('change', rebuild));
    el('b2GenAlloc').addEventListener('click', allocateGenerations);
    el('b2Crop').addEventListener('change', () => {
      const c = CROPS.find(x => x.key === el('b2Crop').value);
      if (c && c.poll) { el('b2SeedsPoll').value = c.poll; el('b2FemUnits').value = c.fem; el('b2MaleUses').value = c.male; el('b2SeedsPlot').value = c.plot; }
      rebuild();
    });
    ['b2SeedsPlot', 'b2Safety', 'b2SeedsPoll', 'b2Success', 'b2FemUnits', 'b2MaleUses'].forEach(id => el(id).addEventListener('input', debounce(() => { renderSeed(); state.plan.budget = B2.budget; }, 250)));
    ['b2Reps', 'b2NLoc'].forEach(id => el(id).addEventListener('input', soft));
    el('b2FieldDesign').addEventListener('change', () => {
      fieldVisibility();
      if (el('b2FieldDesign').value === 'alpha' && B2.plan) el('b2K').value = suggestK(B2.plan.entries.length);
      if (el('b2FieldDesign').value === 'augmented' && B2.plan && !B2.plan.cfg.checks.length) msg('b2FieldMsg', [{ es: 'El diseño aumentado necesita testigos: escríbalos en la tarjeta 1.', en: 'The augmented design needs checks: type them in card 1.', level: 'info' }]);
      fieldWork();
    });
    ['b2K', 'b2AugBlocks', 'b2PlotsRow', 'b2Arrange', 'b2Numbering', 'b2Seed', 'b2LocNames'].forEach(id => el(id).addEventListener('change', fieldWork));
    ['b2RowsPlot', 'b2RowLen', 'b2RowSp'].forEach(id => el(id).addEventListener('input', debounce(renderField, 250)));
    el('b2Traits').addEventListener('input', debounce(renderBook, 300));
    el('b2NewSeed').addEventListener('click', () => { el('b2Seed').value = Math.floor(Math.random() * 90000) + 10000; fieldWork(); });
    el('b2Generate').addEventListener('click', fieldWork);
    el('b2LocSelect').addEventListener('change', () => { B2.loc = +el('b2LocSelect').value; renderField(); });
    el('b2DlCsv').addEventListener('click', downloadCsv);
    el('b2DlXlsx').addEventListener('click', downloadXlsx);
    el('b2DlEntries').addEventListener('click', () => {
      const rows = [['#', T('Entrada', 'Entry'), T('Hembra', 'Female'), T('Macho', 'Male'), T('Tipo', 'Type')]].concat(B2.plan.entries.map(e => [e.entry, e.code, e.female, e.male, P2.typeName(e)]));
      download('﻿' + rows.map(r => r.map(csvEscape).join(',')).join('\r\n'), `${T('entradas', 'entries')}.csv`, 'text/csv;charset=utf-8');
    });
    ['b2Mean', 'b2CV', 'b2CVA', 'b2CVD'].forEach(id => el(id).addEventListener('input', debounce(renderPower, 300)));
    ['b2Fcoef', 'b2Alpha', 'b2TargetPower', 'b2Vary'].forEach(id => el(id).addEventListener('change', renderPower));
    el('b2Back').addEventListener('click', () => goStep(1));
    el('b2Next').addEventListener('click', () => goStep(3));
    document.addEventListener('langchange', () => {
      if (!B2.plan) return;
      renderTiles(); partialOptions();
      B2.seasons = Mating.seasons(B2.plan, readSeed());
      renderDesign(); renderSeed();
      if (B2.field && B2.field.locations) { B2.field.locations.forEach((l, i) => { if (/^(Localidad|Location) \d+$/.test(l.name)) l.name = locationNames()[i]; }); renderField(); }
      renderPower();
    });
    let built = false;
    document.addEventListener('stepchange', e => { if (e.detail.step === 2 && !built) { built = true; rebuild(); } });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
