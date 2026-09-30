/* BreedingPro — Block 3 interface: data and experimental design.
   Loads a file, the data sheet, the Block 2 field book or an example; lets the
   user confirm the role of every column; shows the recognised designs, data
   quality and the field-design analysis; and leaves in state.data everything the
   genetic blocks need. */

(function () {
  const B3 = { table: null, original: null, roles: null, ds: null, rec: null, ov: {}, excluded: new Set(), external: {}, results: new Map(), trait: 0, env: '', filter: 'all', source: null, example: null, wb: null };
  window.B3 = B3;

  const NC = ['nc1', 'nc2', 'nc3', 'ttc', 'lxt'];
  const ROLE_GROUP = { env: 'field', year: 'field', rep: 'field', block: 'field', plot: 'field', row: 'field', col: 'field', set: 'field', plant: 'field', entry: 'gen', female: 'gen', male: 'gen', generation: 'gen', type: 'gen', trait: 'trait', ignore: 'ignore' };
  const MATING = {
    griffing: { es: 'Dialelo de Griffing', en: 'Griffing diallel' }, partial: { es: 'Dialelo parcial', en: 'Partial diallel' },
    nc1: { es: 'Carolina del Norte I', en: 'North Carolina I' }, nc2: { es: 'Carolina del Norte II', en: 'North Carolina II' },
    nc3: { es: 'Carolina del Norte III', en: 'North Carolina III' }, ttc: { es: 'Cruza triple de prueba', en: 'Triple test cross' },
    lxt: { es: 'Línea × probador', en: 'Line × tester' }, generations: { es: 'Medias generacionales', en: 'Generation means' },
    none: { es: 'Ensayo de genotipos', en: 'Genotype trial' },
  };
  const TYPE_NAMES = Object.assign({}, P2.TYPES, { entry: { es: 'entrada', en: 'entry' }, generation: { es: 'generación', en: 'generation' } });
  const typeName = tp => T(TYPE_NAMES[tp] || { es: tp, en: tp });
  const f3 = x => fmtFixed(x, 3), f2 = x => fmtFixed(x, 2);
  const msg = (host, list) => { clearMessages(host); (list || []).forEach(x => showMessage(host, x.level === 'error' ? 'error' : x.level === 'warning' ? 'warning' : x.level === 'success' ? 'success' : 'info', T(x))); };
  const statTiles = (host, items) => {
    host = el(host); host.innerHTML = '';
    items.forEach(([es, en, value, sub, level]) => host.appendChild(mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') }, `<div class="stat-label">${keepGreek(T(es, en))}</div><div class="stat-value${/^[-−+]?[0-9.,]+ ?%?$/.test(String(value).trim()) ? "" : " txt"}">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}`)));
  };
  const table = (host, cols, rows, limit) => {
    host = typeof host === 'string' ? el(host) : host;
    const shown = limit ? rows.slice(0, limit) : rows;
    let h = '<table><thead><tr>' + cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('') + '</tr></thead><tbody>';
    shown.forEach(r => { h += `<tr class="${r._cls || ''}">` + cols.map(c => { const v = c.get(r); return `<td class="${c.num ? 'num' : ''}${c.cls ? ' ' + c.cls(r) : ''}">${v == null || v === '' ? '—' : v}</td>`; }).join('') + '</tr>'; });
    h += '</tbody></table>';
    if (limit && rows.length > limit) h += `<p class="hint">${T(`Se muestran ${limit} de ${rows.length} filas; la descarga las incluye todas.`, `Showing ${limit} of ${rows.length} rows; the download has them all.`)}</p>`;
    host.innerHTML = h;
  };
  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    Fig.mount(hostId, Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {}));
  }
  const busy = (host, on) => { const h = el(host); if (h) h.classList.toggle('is-busy', !!on); };

  /* ================= 1 · sources ================= */
  function renderExamples() {
    const fams = [['all', 'Todos', 'All'], ['diallel', 'Dialelos', 'Diallels'], ['partial', 'Parciales', 'Partial'], ['nc', 'Carolina del Norte', 'North Carolina'], ['lxt', 'Línea × probador', 'Line × tester'], ['generations', 'Generaciones', 'Generations'], ['traits', 'Genotipos y variables', 'Genotypes and traits'], ['met', 'Multiambiente', 'Multi-environment']];
    el('b3ExFilter').innerHTML = fams.map(([k, es, en]) => `<button class="chip${B3.filter === k ? ' on' : ''}" data-fam="${k}" type="button">${L2(es, en)}</button>`).join('');
    el('b3Examples').innerHTML = Examples.LIST.filter(ex => B3.filter === 'all' || ex.family === B3.filter || (B3.filter === 'met' && ex.id === 'dial2env')).map(ex => `
      <div class="ex-card${B3.example === ex.id ? ' on' : ''}">
        <div class="ex-art">${Art[ex.art] ? Art[ex.art]() : ''}</div>
        <div class="ex-body">
          <b>${L2(ex.title.es, ex.title.en)}</b>
          <small>${L2(ex.sub.es, ex.sub.en)}</small>
          <p class="ex-cite">${esc(ex.cite[0])}</p>
          <span class="ex-lic${ex.simulated ? ' sim' : ''}" title="${esc(T(ex.license))}">${ex.simulated ? L2('simulado', 'simulated') : ex.license === Examples.LIST[0].license ? 'CC BY-NC 4.0' : L2('datos publicados', 'published data')}</span>
        </div>
        <button class="btn btn-secondary btn-sm" data-ex="${ex.id}" type="button">${L2('Cargar', 'Load')}</button>
      </div>`).join('');
  }
  function planNote() {
    const p = state.plan;
    const ok = p && p.field && p.field.locations;
    el('b3FromPlan').disabled = !ok;
    el('b3PlanNote').innerHTML = ok ? T(`${plural(p.field.locations.length, 'localidad', 'localidades')} · ${p.field.plotsPerLocation * p.field.locations.length} parcelas · ${MATING[p.plan.design] ? T(MATING[p.plan.design]) : p.plan.design}`, `${plural(p.field.locations.length, 'location', 'locations')} · ${p.field.plotsPerLocation * p.field.locations.length} plots · ${MATING[p.plan.design] ? T(MATING[p.plan.design]) : p.plan.design}`) : T('Genere primero el croquis en el Bloque 2', 'Generate the field map in Block 2 first');
  }

  async function readFile(file) {
    clearMessages('b3LoadMsg');
    try {
      const f = await Data.readFile(file);
      B3.wb = null;
      if (f.kind === 'workbook') {
        B3.wb = f.workbook;
        const size = new Map(f.sheets.map(s => { const r = Data.sheetRows(f.workbook, s); return [s, r.length > 1 ? r.length * (r[0] || []).length : 0]; }));
        const sheets = f.sheets.filter(s => size.get(s) > 0);
        if (!sheets.length) throw new Error(T('El libro no tiene hojas con datos.', 'The workbook has no sheets with data.'));
        /* the largest sheet is proposed first; the others stay in the list */
        const first = sheets.slice().sort((a, b) => size.get(b) - size.get(a))[0];
        el('b3SheetPick').style.display = sheets.length > 1 ? '' : 'none';
        el('b3SheetSelect').innerHTML = sheets.map(s => `<option${s === first ? ' selected' : ''}>${esc(s)}</option>`).join('');
        loadRows(Data.sheetRows(f.workbook, first), f.name, { kind: 'file', sheet: first });
      } else {
        el('b3SheetPick').style.display = 'none';
        loadRows(Data.parseDelimited(f.text), f.name, { kind: 'file' });
      }
    } catch (e) {
      showMessage('b3LoadMsg', 'error', T('No se pudo leer el archivo: ', 'The file could not be read: ') + esc(e.message || e));
    }
  }

  function loadRows(rows, name, source) {
    source = source || {};
    const table = Data.table(rows);
    if (!table.header.length || !table.rows.length) { showMessage('b3LoadMsg', 'error', T('No se encontraron datos: se necesita una fila de nombres y al menos una fila de datos.', 'No data found: a row of names and at least one data row are needed.')); return; }
    B3.source = Object.assign({ name }, source);
    B3.rawRows = rows;
    B3.original = table; B3.table = table;
    B3.example = source.example || null;
    const ex = source.example ? Examples.get(source.example) : null;
    B3.roles = Data.guessRoles(table).roles;
    if (ex && ex.roles) Object.entries(ex.roles).forEach(([h, r]) => { const j = table.header.indexOf(h); if (j >= 0) B3.roles[j] = r; });
    B3.ov = {};
    if (ex && ex.override) Object.assign(B3.ov, ex.override);
    if (table.meta) {
      if (table.meta.mating && !B3.ov.mating) B3.ov.mating = table.meta.mating;
      if (table.meta.method && !B3.ov.method) B3.ov.method = +table.meta.method;
      if (table.meta.field && !B3.ov.field) B3.ov.field = table.meta.field;
    }
    B3.declared = !!B3.ov.mating;
    B3.external = ex && ex.external ? JSON.parse(JSON.stringify(ex.external)) : {};
    B3.excluded = new Set();
    B3.trait = 0; B3.env = '';
    el('b3Decimal').value = 'auto';
    state.fileName = name;
    const src = source.kind === 'example' ? T('ejemplo', 'example') : source.kind === 'sheet' ? T('hoja de datos', 'data sheet') : source.kind === 'plan' ? T('libreta del Bloque 2', 'Block 2 field book') : T('archivo', 'file');
    el('b3SourceLine').innerHTML = `<span class="src-badge">${src}</span> <b>${esc(name)}</b>${source.sheet ? ' · ' + esc(source.sheet) : ''} · ${table.rows.length} ${T('filas', 'rows')} × ${table.header.length} ${T('columnas', 'columns')}${table.meta ? ' · ' + T('declaración de diseño leída', 'design declaration read') : ''}`;
    ['b3Columns', 'b3Design', 'b3Quality', 'b3Analysis'].forEach(id => { el(id).style.display = ''; });
    rebuild();
    exampleNote();
    renderExamples();
    if (source.scroll !== false) setTimeout(() => el('b3Columns').scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
  B3.loadRows = loadRows;

  /* what the loaded example is: its published results or its true values, and all its sources */
  function exampleNote() {
    clearMessages('b3LoadMsg');
    const ex = B3.example ? Examples.get(B3.example) : null;
    if (!ex) return;
    const parts = [];
    if (ex.note) parts.push(esc(T(ex.note)));
    if (ex.cite && ex.cite.length) parts.push(T('Fuente: ', 'Source: ') + ex.cite.map(esc).join(' · '));
    showMessage('b3LoadMsg', 'info', `<b>${T('Sobre este ejemplo', 'About this example')}.</b> ${parts.join(' ')}`);
  }

  function loadExample(id) {
    const ex = Examples.get(id);
    const src = Examples.rows(id);
    if (!src) { showMessage('b3LoadMsg', 'error', T('No se encontró el ejemplo.', 'The example was not found.')); return; }
    B3.truth = src.truth || null;
    loadRows(src.rows, T(ex.title), { kind: 'example', example: id });
  }

  /* the Block 2 field book, optionally filled with simulated values */
  function fromPlan() {
    const p = state.plan;
    if (!p || !p.field || !p.field.locations) return;
    const traits = [T('Rendimiento', 'Yield')];
    const book = Field.book(p.plan, p.field, { lang: I18N.lang, traits, typeName: e => P2.typeName(e) });
    if (el('b3PlanSim').checked) {
      const r = rng(p.field.options.seed + 17);
      const g = new Map(), s = new Map(), locE = new Map(), repE = new Map(), blk = new Map();
      const eff = (map, key, sd) => { if (!map.has(key)) map.set(key, sd * randn(r)); return map.get(key); };
      const ci = book.header.length - 1;
      book.rows.forEach(row => {
        const [loc, , rep, block, , , , code, female, male, type] = row;
        const e = p.plan.entries.find(x => x.code === code) || {};
        let y = 6;
        if (e.type === 'check') y += eff(g, 'chk' + code, 0.8);
        else if (e.type === 'generation') y += eff(g, 'gen' + code, 1.2);
        else {
          y += eff(g, female, 0.45) + eff(g, male, 0.45);
          if (female !== male) y += 1.8 + eff(s, code, 0.3); else y -= 1.5;
        }
        y += eff(locE, loc, 0.8) + eff(repE, loc + rep, 0.25) + eff(blk, loc + rep + '|' + block, 0.35) + 0.55 * randn(r);
        row[ci] = +Math.max(0.1, y).toFixed(2);
      });
    }
    const rows = [[book.meta], book.header].concat(book.rows);
    loadRows(rows, T('Libreta del Bloque 2', 'Block 2 field book'), { kind: 'plan' });
  }

  /* ================= 2 · columns ================= */
  function effectiveOverride() {
    const ov = {};
    if (B3.ov.mating) ov.mating = B3.ov.mating;
    if (B3.ov.method) ov.method = B3.ov.method;
    if (B3.ov.field) ov.field = B3.ov.field;
    return ov;
  }
  function rebuild() {
    const ov = effectiveOverride();
    const sep = ov.mating ? NC.includes(ov.mating) : undefined;
    B3.ds = Data.build(B3.table, B3.roles, { decimal: el('b3Decimal').value, separateSexes: sep, nestFemales: ov.mating === 'nc1' });
    if (!B3.ds.records.length) {
      /* nothing usable yet: keep the column card so the roles can be fixed */
      B3.rec = null; B3.results.clear();
      ['b3Design', 'b3Quality', 'b3Analysis'].forEach(id => { el(id).style.display = 'none'; });
      renderColumns();
      showMessage('b3ColMsg', 'error', T('Ninguna fila tiene una entrada identificable: indique qué columna es el genotipo, la cruza o los progenitores.', 'No row has an identifiable entry: indicate which column is the genotype, the cross or the parents.'));
      state.data = null;
      return;
    }
    ['b3Design', 'b3Quality', 'b3Analysis'].forEach(id => { el(id).style.display = ''; });
    B3.rec = Data.recognize(B3.ds, ov);
    B3.results.clear();
    if (B3.trait >= B3.ds.traits.length) B3.trait = 0;
    publish();
    renderColumns();
    renderDesign();
    renderNext();
    renderTraitPickers();
    analyseCurrent();
  }

  function renderColumns() {
    const t = B3.table;
    const prof = t.header.map((_, j) => Data.columnProfile(t, j));
    const opts = Data.ROLES.map(R => `<option value="${R.key}">${T(R)}</option>`).join('');
    let h = '<table class="roles"><thead><tr>';
    t.header.forEach((name, j) => {
      const role = B3.roles[j];
      h += `<th class="rg-${ROLE_GROUP[role] || 'ignore'}"><select data-col="${j}" aria-label="${esc(name)}">${opts.replace(`value="${role}"`, `value="${role}" selected`)}</select><div class="col-name">${esc(name)}</div><div class="col-prof">${prof[j].numericShare >= 0.9 ? T('numérica', 'numeric') : T('texto', 'text')} · ${prof[j].distinct} ${T('valores', 'values')}${prof[j].missing ? ` · <span class="miss">${prof[j].missing} ${T('vacías', 'empty')}</span>` : ''}${prof[j].decimal === 'comma' ? ' · ' + T('coma decimal', 'decimal comma') : ''}</div></th>`;
    });
    h += '</tr></thead><tbody>';
    t.rows.slice(0, 8).forEach(row => { h += '<tr>' + row.map((v, j) => `<td class="rg-${ROLE_GROUP[B3.roles[j]] || 'ignore'}">${esc(v)}</td>`).join('') + '</tr>'; });
    h += '</tbody></table>';
    if (t.rows.length > 8) h += `<p class="hint">${T(`Primeras 8 de ${t.rows.length} filas.`, `First 8 of ${t.rows.length} rows.`)}</p>`;
    el('b3RolesTable').innerHTML = h;
    el('b3RoleLegend').innerHTML = [['field', 'diseño de campo', 'field design'], ['gen', 'genotipo y pedigrí', 'genotype and pedigree'], ['trait', 'variable respuesta', 'response trait'], ['ignore', 'se ignora', 'ignored']].map(([k, es, en]) => `<span class="rl rg-${k}">${L2(es, en)}</span>`).join('');
    const issues = B3.ds.issues.slice();
    const need = ['entry', 'female', 'male', 'generation'];
    if (!B3.roles.some(r => need.includes(r))) issues.push({ level: 'error', es: 'Falta la columna de entradas (genotipo, cruza o progenitores).', en: 'The entries column (genotype, cross or parents) is missing.' });
    if (B3.ds.splitUsed) issues.push({ level: 'info', es: 'Los nombres de las cruzas se separaron en hembra y macho (p. ej., «1x3» → 1 y 3).', en: 'Cross names were split into female and male (e.g., "1x3" → 1 and 3).' });
    if (B3.ds.separate && B3.ds.records.some(r => /^[♀♂]/.test(r.female || ''))) issues.push({ level: 'info', es: 'Hembras y machos comparten códigos pero son plantas distintas: se marcan con ♀ y ♂.', en: 'Females and males share codes but are different plants: they are marked ♀ and ♂.' });
    msg('b3ColMsg', issues);
    el('b3MatrixBtn').style.display = Data.isDiallelMatrix(B3.table) ? '' : 'none';
    el('b3UndoReshape').style.display = B3.table !== B3.original ? '' : 'none';
    /* wide → long helper */
    const numericCols = prof.filter(p => p.numericShare >= 0.9).map(p => p.j);
    el('b3WideCols').innerHTML = numericCols.map(j => `<label class="checkbox-label"><input type="checkbox" value="${j}"${/^(r|rep|bloque|block|b|e|env|loc)[\s_.-]*\d+/i.test(t.header[j]) ? ' checked' : ''}> ${esc(t.header[j])}</label>`).join('') || `<span class="hint">${T('No hay columnas numéricas.', 'There are no numeric columns.')}</span>`;
    if (!el('b3WideKey').value) el('b3WideKey').value = T('Repetición', 'Replicate');
    if (!el('b3WideValue').value) el('b3WideValue').value = T('Rendimiento', 'Yield');
  }

  /* ================= 3 · design ================= */
  function renderDesign() {
    const { mating: m, field } = B3.rec;
    const ds = B3.ds;
    const conf = { high: ['alta', 'high', 'ok'], medium: ['media', 'medium', 'warn'], low: ['baja', 'low', 'bad'] }[m.confidence] || ['—', '—', ''];
    const matingLabel = T(MATING[m.design] || { es: m.design, en: m.design }) + (m.design === 'griffing' ? ' · ' + T('método ', 'Method ') + m.method : m.design === 'partial' && m.s ? ` · s = ${m.s}` : '');
    const entries = m.entries.length;
    const env0 = field.envs[0];
    const reps = field.envs.map(e => e.reps.length || (e.blockAsRep ? e.reps.length : 0));
    const items = [
      ['Diseño de apareamiento', 'Mating design', matingLabel, T('confianza ', 'confidence ') + T(conf[0], conf[1]) + (B3.ov.mating ? ' · ' + (B3.declared ? T('declarado', 'declared') : T('elegido', 'chosen')) : ''), conf[2]],
      ['Entradas', 'Entries', String(entries), m.parents ? T(`${m.p} progenitores`, `${m.p} parents`) + (m.checks.length ? T(` · ${m.checks.length} testigos`, ` · ${m.checks.length} checks`) : '') : m.checks.length ? T(`${m.checks.length} testigos`, `${m.checks.length} checks`) : ''],
      ['Diseño de campo', 'Field design', T(Trial.DESIGNS[field.design] || { es: field.design, en: field.design }), field.mixed ? T('distinto entre ambientes', 'differs between environments') : env0.blockSize ? T(`bloques de ${env0.blockSize} parcelas`, `blocks of ${env0.blockSize} plots`) : '', field.design === 'unreplicated' ? 'bad' : ''],
      ['Ambientes', 'Environments', String(field.envs.length), field.envs.slice(0, 3).map(e => esc(e.name)).join(', ') + (field.envs.length > 3 ? '…' : '')],
      field.envs.every(e => e.plantUnits)
        ? ['Repeticiones', 'Replicates', String(env0.medianReps), T(`plantas por entrada (mediana) · ${fmtNum(S.mean(field.envs.map(e => e.plots)), 0)} plantas, cada una es una unidad`, `plants per entry (median) · ${fmtNum(S.mean(field.envs.map(e => e.plots)), 0)} plants, each one a unit`)]
        : ['Repeticiones', 'Replicates', reps.every(v => v === reps[0]) ? String(reps[0] || 1) : `${Math.min(...reps)}–${Math.max(...reps)}`, (field.envs.every(e => e.design === 'means') ? T(`${fmtNum(S.mean(field.envs.map(e => e.plots)), 0)} medias por ambiente`, `${fmtNum(S.mean(field.envs.map(e => e.plots)), 0)} means per environment`) : T(`${fmtNum(S.mean(field.envs.map(e => e.plots)), 0)} parcelas por ambiente`, `${fmtNum(S.mean(field.envs.map(e => e.plots)), 0)} plots per environment`)) + (field.plantLevel ? T(' · datos por planta', ' · plant-level data') : '')],
      ['Variables', 'Traits', String(ds.traits.length), ds.traits.slice(0, 4).map(t => esc(t.name)).join(', ') + (ds.traits.length > 4 ? '…' : '')],
    ];
    statTiles('b3DesignTiles', items);
    el('b3Reasons').innerHTML = m.reasons.map(r => `<li>${T(r)}</li>`).join('') + field.envs.flatMap(e => e.issues.map(i => `<li class="lvl-${i.level}">${field.multiEnv ? '<b>' + esc(e.name) + ':</b> ' : ''}${T(i)}</li>`)).join('');
    /* overrides */
    const mo = [['', T('Automático', 'Automatic') + ' (' + matingLabel + ')'], ['griffing:1', T('Griffing, método 1', 'Griffing, Method 1')], ['griffing:2', T('Griffing, método 2', 'Griffing, Method 2')], ['griffing:3', T('Griffing, método 3', 'Griffing, Method 3')], ['griffing:4', T('Griffing, método 4', 'Griffing, Method 4')],
      ['partial', T(MATING.partial)], ['nc1', T(MATING.nc1)], ['nc2', T(MATING.nc2)], ['nc3', T(MATING.nc3)], ['ttc', T(MATING.ttc)], ['lxt', T(MATING.lxt)], ['generations', T(MATING.generations)], ['none', T(MATING.none)]];
    const curM = B3.ov.mating ? (B3.ov.mating === 'griffing' ? 'griffing:' + (B3.ov.method || m.method) : B3.ov.mating) : '';
    el('b3MatingOv').innerHTML = mo.map(([v, l]) => `<option value="${v}"${v === curM ? ' selected' : ''}>${l}</option>`).join('');
    const fo = [['', T('Automático', 'Automatic') + ' (' + T(Trial.DESIGNS[field.envs[0].detected] || { es: '—', en: '—' }) + ')']].concat(['crd', 'rcbd', 'alpha', 'ibd', 'augmented', 'rowcol', 'means'].map(k => [k, T(Trial.DESIGNS[k])]));
    el('b3FieldOv').innerHTML = fo.map(([v, l]) => `<option value="${v}"${v === (B3.ov.field || '') ? ' selected' : ''}>${l}</option>`).join('');
    /* external error for entry means */
    const meansEnv = field.envs.some(e => e.design === 'means');
    el('b3External').style.display = meansEnv ? '' : 'none';
    if (meansEnv) {
      el('b3ExternalTable').innerHTML = '<table><thead><tr>' + [T('Variable', 'Trait'), T('Cuadrado medio del error', 'Error mean square'), T('Grados de libertad', 'Degrees of freedom'), T('Escala', 'Scale'), T('Repeticiones', 'Replicates')].map(x => `<th>${x}</th>`).join('') + '</tr></thead><tbody>' +
        ds.traits.map(t => { const e = B3.external[t.name] || {}; return `<tr data-trait="${esc(t.name)}"><td>${esc(t.name)}</td><td><input type="number" step="any" min="0" aria-label="${esc(t.name + ' · ' + T('cuadrado medio del error', 'error mean square'))}" data-k="ms" value="${e.ms != null ? e.ms : ''}" style="width:110px"></td><td><input type="number" min="1" aria-label="${esc(t.name + ' · ' + T('grados de libertad', 'degrees of freedom'))}" data-k="df" value="${e.df != null ? e.df : ''}" style="width:90px"></td><td><select aria-label="${esc(t.name + ' · ' + T('escala', 'scale'))}" data-k="scale"><option value="means"${e.scale !== 'plot' ? ' selected' : ''}>${T('de medias', 'of means')}</option><option value="plot"${e.scale === 'plot' ? ' selected' : ''}>${T('de parcelas', 'of plots')}</option></select></td><td><input type="number" min="1" aria-label="${esc(t.name + ' · ' + T('repeticiones', 'replicates'))}" data-k="r" value="${e.r != null ? e.r : 1}" style="width:70px"></td></tr>`; }).join('') + '</tbody></table>';
    }
    const dmsg = [];
    if (m.design === 'none' && ds.records.some(r => r.female)) dmsg.push({ level: 'info', es: 'Hay progenitores pero ninguna cruza reconocible.', en: 'There are parents but no recognisable cross.' });
    msg('b3DesignMsg', dmsg);
    renderPresence();
    /* missing entries */
    const miss = m.missing || {};
    const parts = [];
    if (miss.pairs && miss.pairs.length) parts.push(`<p><b>${T('Cruzas', 'Crosses')} (${miss.pairs.length}):</b> ${miss.pairs.slice(0, 60).map(esc).join(', ')}${miss.pairs.length > 60 ? '…' : ''}</p>`);
    if (miss.selfs && miss.selfs.length) parts.push(`<p><b>${T('Progenitores', 'Parents')} (${miss.selfs.length}):</b> ${miss.selfs.map(esc).join(', ')}</p>`);
    if (miss.recips && miss.recips.length) parts.push(`<p><b>${T('Recíprocas', 'Reciprocals')} (${miss.recips.length}):</b> ${miss.recips.slice(0, 60).map(esc).join(', ')}${miss.recips.length > 60 ? '…' : ''}</p>`);
    if (Array.isArray(miss) && miss.length) parts.push(`<p><b>${T('Generaciones', 'Generations')}:</b> ${miss.join(', ')}</p>`);
    el('b3MissingBox').style.display = parts.length ? '' : 'none';
    el('b3Missing').innerHTML = parts.join('');
    /* entries */
    const ents = m.entries.slice().sort((a, b) => LM.natCmp(a.name, b.name));
    el('b3EntryCount').textContent = `(${ents.length})`;
    table('b3EntryTable', [
      { label: T('Entrada', 'Entry'), get: e => esc(e.name) },
      { label: T('Hembra', 'Female'), get: e => esc(e.female || '') },
      { label: T('Macho', 'Male'), get: e => esc(e.male || '') },
      { label: T('Tipo', 'Type'), get: e => typeName(e.dtype || e.type) },
      { label: T('Registros', 'Records'), num: true, get: e => e.n },
    ], ents, 400);
  }

  function renderPresence() {
    const m = B3.rec.mating;
    const host = el('b3FigPresence');
    if (!m.matrix) { host.innerHTML = ''; delete Fig.registry.b3FigPresence; return; }
    const t = B3.ds.traits[B3.trait];
    const cells = new Map();
    const plotsSeen = new Set();
    B3.ds.records.forEach(r => {
      if (!r.female || !r.male) return;
      const key = r.female + '|' + r.male;
      let c = cells.get(key);
      if (!c) cells.set(key, c = { name: r.entry, n: 0, sum: 0, k: 0, parent: r.female === r.male });
      const pk = [r.env, r.rep, r.block, r.plot, r.set, r.entry].join('|');
      if (!plotsSeen.has(pk)) { plotsSeen.add(pk); c.n++; }
      if (t && isFinite(t.y[r.k]) && !B3.excluded.has(r.k)) { c.sum += t.y[r.k]; c.k++; }
    });
    cells.forEach(c => { c.mean = c.k ? c.sum / c.k : NaN; });
    let expected = null;
    if (m.design === 'griffing') {
      const ix = new Map(m.parents.map((p, i) => [p, i]));
      /* a cross written in either orientation counts; reciprocals only in Methods 1 and 3 */
      expected = (a, b) => { const i = ix.get(a), j = ix.get(b); return i === j ? m.method <= 2 : i < j ? !cells.has(b + '|' + a) : m.method === 1 || m.method === 3; };
    } else if (m.design === 'partial' && m.circulant) {
      const ix = new Map(m.parents.map((p, i) => [p, i]));
      const inCirculant = (i, j) => { const d = (j - i + m.p) % m.p; return d >= m.k && d < m.k + m.s; };
      expected = (a, b) => { const i = ix.get(a), j = ix.get(b); return i < j && (inCirculant(i, j) || inCirculant(j, i)) && !cells.has(b + '|' + a); };
    } else if (m.design === 'nc2' || m.design === 'lxt') {
      const setOf = s => (String(s).match(/^[♀♂]?S(\d+)·/) || [])[1] || '';
      expected = (a, b) => setOf(a) === setOf(b);
    } else if (m.design === 'nc3' || m.design === 'ttc') expected = () => true;
    const M = m.matrix;
    const nr = M.rows.length, nc = M.cols.length;
    const size = { width: Math.max(620, Math.min(1100, 260 + nc * 34)), height: Math.max(360, Math.min(1200, 230 + nr * 34)) };
    mountFig('b3FigPresence', {
      title: () => T('Cruzas presentes en los datos', 'Crosses present in the data'), fileName: 'crosses_present',
      render: c => P3.presence(c, M, cells, { expected }),
      controls: () => [P2.titleControl(), { key: 'colorBy', label: T('Color según', 'Colour by'), type: 'select', options: [['count', T('número de parcelas', 'number of plots')], ['mean', T('media de la variable', 'trait mean')]] }, P3.colormapControl(), { key: 'showValues', label: T('Mostrar valores', 'Show values'), type: 'checkbox' }, P2.paletteControl()],
    }, Object.assign({ colormap: 'ylgn', showValues: true }, size));
  }

  /* ================= analysis ================= */
  function renderTraitPickers() {
    el('b3Trait').innerHTML = B3.ds.traits.map((t, i) => `<option value="${i}"${i === B3.trait ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const envs = B3.rec.field.envs;
    const opts = envs.map(e => `<option value="${esc(e.key)}">${esc(e.name)}</option>`).join('') + (B3.rec.field.multiEnv ? `<option value="__combined">${T('Análisis combinado', 'Combined analysis')}</option>` : '');
    el('b3Env').innerHTML = opts;
    if (![...el('b3Env').options].some(o => o.value === B3.env)) B3.env = B3.rec.field.multiEnv ? '__combined' : envs[0].key;
    el('b3Env').value = B3.env;
    el('b3MapEnv').innerHTML = envs.map(e => `<option value="${esc(e.key)}">${esc(e.name)}</option>`).join('');
    if (!envs.some(e => e.key === el('b3MapEnv').dataset.cur)) el('b3MapEnv').dataset.cur = envs[0].key;
    el('b3MapEnv').value = el('b3MapEnv').dataset.cur;
  }
  function runTrait(i) {
    if (B3.results.has(i)) return B3.results.get(i);
    const ext = {};
    Object.entries(B3.external).forEach(([k, v]) => { if (v && v.ms > 0) ext[k] = v; });
    const res = Trial.run(B3.ds, B3.rec, i, { excluded: B3.excluded, externalError: ext });
    B3.results.set(i, res);
    return res;
  }
  let pending = null, pendingW = null;
  function analyseCurrent() {
    if (!B3.ds.traits.length) { el('b3Quality').style.display = 'none'; el('b3Analysis').style.display = 'none'; publish(); return; }
    el('b3Quality').style.display = ''; el('b3Analysis').style.display = '';
    busy('b3Analysis', true); busy('b3Quality', true);
    clearTimeout(pending);
    /* a change that arrives before the previous one ran replaces its window */
    if (pendingW && !pendingW.ended) pendingW.close();
    const w = pendingW = bpWork('Analizando el ensayo', 'Analysing the trial');
    pending = setTimeout(() => bpAfterPaint(() => {
      if (pendingW === w) pendingW = null;
      try {
        runTrait(B3.trait);
        renderQuality();
        renderAnalysis();
      } catch (e) {
        console.error(e);
        showMessage('b3AnaMsg', 'error', T('Error en el análisis: ', 'Analysis error: ') + esc(e.message));
      }
      busy('b3Analysis', false); busy('b3Quality', false);
      publish();
    }, w), 30);
  }

  /* ================= 4 · quality ================= */
  function renderQuality() {
    const t = B3.ds.traits[B3.trait];
    const res = B3.results.get(B3.trait);
    const envs = B3.rec.field.envs;
    const rows = envs.map(E => {
      const recs = B3.ds.records.filter(r => (r.env || '') === E.key);
      const vals = recs.filter(r => !B3.excluded.has(r.k)).map(r => t.y[r.k]);
      const d = Data.describe(vals);
      return Object.assign({ env: E.name, records: recs.length, missing: vals.filter(v => !isFinite(v)).length, excluded: recs.filter(r => B3.excluded.has(r.k)).length }, d);
    });
    if (envs.length > 1) {
      const vals = B3.ds.records.filter(r => !B3.excluded.has(r.k)).map(r => t.y[r.k]);
      rows.push(Object.assign({ env: T('Todos', 'All'), records: B3.ds.records.length, missing: vals.filter(v => !isFinite(v)).length, excluded: B3.excluded.size, _cls: 'total-row' }, Data.describe(vals)));
    }
    table('b3Summary', [
      { label: T('Ambiente', 'Environment'), get: r => esc(r.env) },
      { label: T('Registros', 'Records'), num: true, get: r => r.records },
      { label: T('Faltantes', 'Missing'), num: true, get: r => r.missing ? `<span class="miss">${r.missing}</span>` : '0' },
      { label: T('Excluidos', 'Excluded'), num: true, get: r => r.excluded || '0' },
      { label: T('Media', 'Mean'), num: true, get: r => fmtNum(r.mean, 3) },
      { label: T('D. E.', 'SD'), num: true, get: r => fmtNum(r.sd, 3) },
      { label: 'CV %', num: true, get: r => fmtNum(r.cv, 1) },
      { label: T('Mínimo', 'Minimum'), num: true, get: r => fmtNum(r.min, 3) },
      { label: T('Máximo', 'Maximum'), num: true, get: r => fmtNum(r.max, 3) },
      { label: T('Asimetría', 'Skewness'), num: true, get: r => fmtNum(r.skew, 2) },
    ], rows);
    /* distribution */
    const flagged = new Set();
    res.envs.forEach(e => (e.outliers || []).forEach(o => o.ks.forEach(k => flagged.add(k))));
    const groups = envs.map(E => {
      const items = B3.ds.records.filter(r => (r.env || '') === E.key && !B3.excluded.has(r.k) && isFinite(t.y[r.k])).map(r => ({ value: t.y[r.k], entry: r.entry, k: r.k }));
      return { name: E.name, items, values: items.map(i => i.value), mean: items.length ? S.mean(items.map(i => i.value)) : NaN };
    }).filter(g => g.values.length);
    if (groups.length) mountFig('b3FigDist', {
      title: () => T('Distribución por ambiente', 'Distribution by environment'), fileName: 'distribution',
      render: c => P3.distribution(c, groups, { label: t.name, flag: it => flagged.has(it.k) }),
      controls: () => [P2.titleControl(), { key: 'points', label: T('Mostrar observaciones', 'Show observations'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 600, height: 440, points: true });
    renderFieldMap();
    /* outliers */
    const out = [];
    res.envs.forEach(e => (e.outliers || []).forEach(o => out.push(Object.assign({ env: e.env }, o))));
    const excludedRows = [];
    if (B3.excluded.size) {
      const byPlot = new Map();
      B3.ds.records.filter(r => B3.excluded.has(r.k)).forEach(r => { const key = r.env + '|' + r.rep + '|' + r.block + '|' + r.entry; if (!byPlot.has(key)) byPlot.set(key, { env: r.env || T('Única', 'Single'), entry: r.entry, rep: r.rep || r.block, y: t.y[r.k], ks: [], lines: [], level: 'excluded' }); const p = byPlot.get(key); p.ks.push(r.k); p.lines.push(r.line); });
      byPlot.forEach(v => excludedRows.push(v));
    }
    const all = out.concat(excludedRows);
    if (!all.length) el('b3Outliers').innerHTML = `<p class="hint ok-note">✓ ${T('No se detectaron valores atípicos en esta variable.', 'No outliers were found in this trait.')}</p>`;
    else table('b3Outliers', [
      { label: T('Excluir', 'Exclude'), get: o => `<input type="checkbox" aria-label="${esc(T('Excluir ', 'Exclude ') + [o.entry, o.env, o.rep].filter(v => v != null && v !== '').join(' · '))}" data-ks="${o.ks.join(',')}"${o.ks.every(k => B3.excluded.has(k)) ? ' checked' : ''}>` },
      { label: T('Nivel', 'Level'), get: o => o.level === 'outlier' ? `<span class="pw low">${T('atípico', 'outlier')}</span>` : o.level === 'excluded' ? `<span class="pw mid">${T('excluido', 'excluded')}</span>` : `<span class="pw mid">${T('revisar', 'check')}</span>` },
      { label: T('Ambiente', 'Environment'), get: o => esc(o.env) },
      { label: T('Entrada', 'Entry'), get: o => esc(o.entry) },
      { label: T('Rep./bloque', 'Rep/block'), get: o => esc(o.rep) },
      { label: T('Valor', 'Value'), num: true, get: o => fmtNum(o.y, 3) },
      { label: T('Ajustado', 'Fitted'), num: true, get: o => o.fitted != null ? fmtNum(o.fitted, 3) : '' },
      { label: 't', num: true, get: o => o.t != null ? f2(o.t) : '' },
      { label: T('p (Bonferroni)', 'p (Bonferroni)'), num: true, get: o => o.pBonf != null ? fmtP(o.pBonf) : '' },
      { label: T('Filas', 'Rows'), get: o => o.lines.slice(0, 6).join(', ') + (o.lines.length > 6 ? '…' : '') },
    ], all);
    el('b3RestoreAll').style.display = B3.excluded.size ? '' : 'none';
    el('b3ExcludedNote').textContent = B3.excluded.size ? T(`${B3.excluded.size === 1 ? '1 observación excluida' : B3.excluded.size + ' observaciones excluidas'} de todos los análisis.`, `${plural(B3.excluded.size, 'observation', 'observations')} excluded from every analysis.`) : '';
    if (window.Sheet && el('cardSheet').style.display !== 'none' && Sheet.markLines) Sheet.markLines(all.flatMap(o => o.lines), T('valor atípico o excluido', 'outlier or excluded value'));
  }

  function renderFieldMap() {
    const res = B3.results.get(B3.trait);
    const key = el('b3MapEnv').dataset.cur;
    const e = res.envs.find(x => x.key === key) || res.envs[0];
    if (!e || !e.plots) { el('b3FigField').innerHTML = ''; return; }
    const mode = el('b3MapValue').value;
    const residOf = new Map((e.residuals || []).map((r, i) => [e.plots[i], r]));
    const t = B3.ds.traits[B3.trait];
    const hasRC = e.plots.every(p => p.row !== '' && p.col !== '');
    const nRows = hasRC ? new Set(e.plots.map(p => p.row)).size : new Set(e.plots.map(p => p.repKey || p.block)).size;
    mountFig('b3FigField', {
      title: () => T('Mapa de campo', 'Field map') + (B3.rec.field.multiEnv ? ' · ' + e.env : ''), fileName: 'field_map',
      render: c => P3.fieldMap(c, e.plots, { value: p => (mode === 'resid' ? (residOf.get(p) ? residOf.get(p).r : NaN) : p.y), label: mode === 'resid' ? T('residual est.', 'std. residual') : t.name, diverging: mode === 'resid', flag: p => { const r = residOf.get(p); return r && (r.pBonf < 0.05 || Math.abs(r.t) >= 3.5); } }),
      controls: () => [P2.titleControl(), P3.colormapControl(), { key: 'showEntry', label: T('Nombres de las entradas', 'Entry names'), type: 'checkbox' }],
    }, { width: 600, height: Math.max(360, Math.min(900, 130 + nRows * 26)), colormap: mode === 'resid' ? 'rdbu' : 'ylgn' });
  }

  /* ================= 5 · analysis ================= */
  const SRC = s => T(Trial.SOURCES[s] || { es: s, en: s });
  function anovaTable(rows, combined) {
    const cols = [
      { label: T('Fuente de variación', 'Source of variation'), get: r => (r.sub ? '&nbsp;&nbsp;' : '') + SRC(r.source).trim() },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: T('SC', 'SS'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: T('CM', 'MS'), num: true, get: r => (r.total ? '' : fmtNum(r.ms, 4)) },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? f2(r.F) : '') },
      { label: 'p', num: true, get: r => (isFinite(r.p) ? `${fmtP(r.p)} <span class="sig">${stars(r.p)}</span>` : '') },
    ];
    if (combined) cols.push({ label: T('F contra el error', 'F against error'), num: true, get: r => (isFinite(r.F2) ? `${f2(r.F2)} <span class="sig">${stars(r.p2)}</span>` : '') });
    rows.forEach(r => { r._cls = r.residual ? 'resid-row' : r.total ? 'total-row' : ''; });
    table('b3Anova', cols, rows);
  }
  const verdict = (ok, es, en) => `<span class="pw ${ok === true ? 'ok' : ok === false ? 'low' : 'mid'}">${T(es, en)}</span>`;

  function renderAnalysis() {
    const res = B3.results.get(B3.trait);
    const t = B3.ds.traits[B3.trait];
    const combined = B3.env === '__combined';
    const e = combined ? res.combined : res.envs.find(x => x.key === B3.env) || res.envs[0];
    const notes = [];
    if (!e) { msg('b3AnaMsg', [{ level: 'warning', es: 'El análisis combinado necesita al menos dos ambientes con error estimado.', en: 'The combined analysis needs at least two environments with an estimated error.' }]); return; }
    if (e.error) { msg('b3AnaMsg', [Object.assign({ level: 'error' }, e.error)]); el('b3Anova').innerHTML = ''; el('b3Assump').innerHTML = ''; return; }
    (e.notes || []).forEach(n => notes.push(n));
    if (!combined) {
      const design = T(Trial.DESIGNS[e.design] || { es: e.design, en: e.design });
      const tiles = [
        ['Modelo', 'Model', design, e.meansFrom === 'reml' ? T('medias por REML, bloques aleatorios', 'means by REML, random blocks') : e.meansFrom === 'intrablock' ? T('análisis intrabloque', 'intra-block analysis') : e.anova ? T('mínimos cuadrados', 'least squares') : T('medias observadas', 'observed means')],
        ['Media general', 'Grand mean', fmtNum(e.mean, 3), `${e.nPlots} ${e.plantUnits ? T('plantas', 'plants') : e.design === 'means' ? T('medias', 'means') : T('parcelas', 'plots')}`],
      ];
      if (e.anova) {
        tiles.push(['Coeficiente de variación', 'Coefficient of variation', fmtNum(e.cv, 1) + ' %', T(`CME = ${fmtNum(e.mse, 4)} con ${e.dfe} gl`, `MSE = ${fmtNum(e.mse, 4)} with ${e.dfe} df`), e.cv <= 12 ? 'ok' : e.cv <= 20 ? 'warn' : 'bad']);
        tiles.push(['DMS (5 %)', 'LSD (5%)', fmtNum(e.lsd, 3), T(`EE de una diferencia: ${fmtNum(e.sed, 4)}`, `SE of a difference: ${fmtNum(e.sed, 4)}`)]);
        if (e.h2) tiles.push(['Heredabilidad del ensayo', 'Trial heritability', f2(e.h2.cullis), T(`Cullis y col. 2006 · estándar ${f2(e.h2.standard)}`, `Cullis et al. 2006 · standard ${f2(e.h2.standard)}`), e.h2.cullis >= 0.5 ? 'ok' : e.h2.cullis >= 0.3 ? 'warn' : 'bad']);
        if (e.efficiency) tiles.push(['Eficiencia vs. bloques completos', 'Efficiency vs complete blocks', fmtNum(100 * e.efficiency.reml, 0) + ' %', T(`intrabloque ${fmtNum(100 * e.efficiency.intra, 0)} %`, `intra-block ${fmtNum(100 * e.efficiency.intra, 0)}%`), e.efficiency.reml >= 1.05 ? 'ok' : '']);
        if (e.reml) e.reml.components.forEach(c => tiles.push([c.name === 'block' ? '<span class="nc">σ²</span> de bloques' : c.name === 'row' ? '<span class="nc">σ²</span> de filas' : '<span class="nc">σ²</span> de columnas', c.name === 'block' ? 'Block <span class="nc">σ²</span>' : c.name === 'row' ? 'Row <span class="nc">σ²</span>' : 'Column <span class="nc">σ²</span>', fmtNum(c.sigma2, 4), c.boundary ? T('en el límite (cero)', 'at the boundary (zero)') : T(`σ²e = ${fmtNum(e.reml.sigma2e, 4)}`, `σ²e = ${fmtNum(e.reml.sigma2e, 4)}`)]));
      } else if (e.external) {
        tiles.push(['Error externo', 'External error', fmtNum(e.mseMeans, 4), T(`escala de medias · ${e.dfe} gl`, `means scale · ${e.dfe} df`)]);
        tiles.push(['DMS (5 %)', 'LSD (5%)', fmtNum(e.lsd, 3), '']);
      } else notes.push({ level: 'info', es: 'Medias sin repeticiones: escriba el error del experimento original en la tarjeta 3 para obtener errores estándar.', en: 'Unreplicated means: type the error of the original experiment in card 3 to get standard errors.' });
      statTiles('b3AnaTiles', tiles);
      if (e.anova) {
        const rows = e.anova.slice();
        if (e.within) rows.splice(rows.length - 1, 0, { source: 'within', df: e.within.df, ss: e.within.ss, ms: e.within.ms, sub: false });
        anovaTable(rows, false);
        const parts = [];
        if (e.within) parts.push(T(`Las parcelas se analizan con la media de ${fmtNum(e.within.plantsPerPlot, 1)} plantas: sus sumas de cuadrados están en la escala de medias de parcela (multiplíquelas por ${fmtNum(e.within.plantsPerPlot, 1)} para la escala de plantas) y la fila entre plantas, en la escala de plantas. Error experimental contra error de muestreo: F = ${f2(e.within.F)}, ${pEq(e.within.p)}.`, `Plots are analysed as the mean of ${fmtNum(e.within.plantsPerPlot, 1)} plants: their sums of squares are on the plot-mean scale (multiply by ${fmtNum(e.within.plantsPerPlot, 1)} for the plant scale) and the between-plants line is on the plant scale. Experimental against sampling error: F = ${f2(e.within.F)}, ${pEq(e.within.p)}.`));
        if (e.blocksAdjusted) parts.push(T(`Bloques eliminando entradas: SC = ${fmtNum(e.blocksAdjusted.ss, 4)}, F = ${f2(e.blocksAdjusted.F)}, ${pEq(e.blocksAdjusted.p)}.`, `Blocks eliminating entries: SS = ${fmtNum(e.blocksAdjusted.ss, 4)}, F = ${f2(e.blocksAdjusted.F)}, ${pEq(e.blocksAdjusted.p)}.`));
        if (e.design === 'alpha' || e.design === 'ibd') parts.push(T('Sumas de cuadrados secuenciales: las entradas están ajustadas por bloques.', 'Sequential sums of squares: entries are adjusted for blocks.'));
        el('b3AnovaNote').innerHTML = parts.join(' ');
      } else { el('b3Anova').innerHTML = `<p class="hint">${T('Sin análisis de varianza: una observación por entrada.', 'No analysis of variance: one observation per entry.')}</p>`; el('b3AnovaNote').innerHTML = ''; }
      /* assumptions */
      const A = [];
      if (e.shapiro) A.push({ what: T('Normalidad de los residuales (Shapiro–Wilk)', 'Normality of residuals (Shapiro–Wilk)'), stat: `W = ${fmtFixed(e.shapiro.W, 4)}`, p: e.shapiro.p, v: e.shapiro.p >= 0.05 ? verdict(true, 'se cumple', 'holds') : verdict(null, 'revisar el gráfico Q–Q', 'check the Q–Q plot') });
      if (e.tukey) A.push({ what: T('Aditividad repetición × entrada (Tukey, 1 gl)', 'Replicate × entry additivity (Tukey, 1 df)'), stat: `F = ${f2(e.tukey.F)}`, p: e.tukey.p, v: e.tukey.p >= 0.05 ? verdict(true, 'aditivo', 'additive') : verdict(null, 'no aditivo: pruebe una transformación', 'non-additive: try a transformation') });
      if (e.outliers) { const n = e.outliers.filter(o => o.level === 'outlier').length; A.push({ what: T('Valores atípicos (Bonferroni)', 'Outliers (Bonferroni)'), stat: `${n} / ${e.nPlots}`, p: NaN, v: n ? verdict(false, 'revisar en la tarjeta 4', 'review in card 4') : verdict(true, 'ninguno', 'none') }); }
      if (e.h2) A.push({ what: T('Repetibilidad (heredabilidad en medias)', 'Repeatability (heritability on means)'), stat: `H²c = ${f2(e.h2.cullis)} · H² = ${f2(e.h2.standard)}`, p: NaN, v: e.h2.cullis >= 0.5 ? verdict(true, 'ensayo informativo', 'informative trial') : e.h2.cullis >= 0.3 ? verdict(null, 'moderada', 'moderate') : verdict(false, 'baja: poca discriminación', 'low: little discrimination') });
      if (e.anova) A.push({ what: T('Precisión (CV)', 'Precision (CV)'), stat: fmtNum(e.cv, 1) + ' %', p: NaN, v: e.cv <= 12 ? verdict(true, 'buena', 'good') : e.cv <= 20 ? verdict(null, 'aceptable', 'acceptable') : verdict(false, 'baja', 'low') });
      if (e.efficiency) A.push({ what: T('Ganancia por bloques incompletos', 'Gain from incomplete blocks'), stat: fmtNum(100 * (e.efficiency.reml - 1), 0) + ' %', p: NaN, v: e.efficiency.reml >= 1.05 ? verdict(true, 'los bloques ayudaron', 'blocks helped') : verdict(null, 'poca ganancia', 'little gain') });
      el('b3AssumpH').textContent = T('Supuestos y calidad del ensayo', 'Assumptions and trial quality');
      table('b3Assump', [{ label: T('Prueba', 'Check'), get: a => a.what }, { label: T('Estadístico', 'Statistic'), num: true, get: a => a.stat }, { label: 'p', num: true, get: a => (isFinite(a.p) ? fmtP(a.p) : '') }, { label: T('Lectura', 'Reading'), get: a => a.v }], A);
      if (e.residuals) mountFig('b3FigResid', {
        title: () => T('Diagnóstico de residuales', 'Residual diagnostics') + (B3.rec.field.multiEnv ? ' · ' + e.env : ''), fileName: 'residuals',
        render: c => P3.residuals(c, e.residuals, { shapiro: e.shapiro }), controls: () => [P2.titleControl(), P2.paletteControl()],
      }, { width: 980, height: 440 });
      else { el('b3FigResid').innerHTML = ''; delete Fig.registry.b3FigResid; }
    } else {
      const b = e.bartlett;
      statTiles('b3AnaTiles', [
        ['Ambientes', 'Environments', String(e.envs.length), e.twoStage ? T('análisis en dos etapas', 'two-stage analysis') : T('análisis en una etapa', 'one-stage analysis')],
        ['Media general', 'Grand mean', fmtNum(e.mean, 3), ''],
        ['CME combinado', 'Pooled MSE', fmtNum(e.mse, 4), T(`${e.dfe} gl`, `${e.dfe} df`) + (e.cv ? ` · CV ${fmtNum(e.cv, 1)} %` : '')],
        ['Homogeneidad del error', 'Error homogeneity', b ? fmtP(b.p) : '—', b ? T(`Bartlett · cociente máx./mín. ${fmtNum(b.fmax, 2)}`, `Bartlett · max/min ratio ${fmtNum(b.fmax, 2)}`) : '', b ? (b.p >= 0.05 ? 'ok' : 'warn') : ''],
        ['DMS (5 %)', 'LSD (5%)', fmtNum(e.lsd, 3), T('entre medias de todos los ambientes', 'between means over environments')],
      ]);
      anovaTable(e.anova.slice(), true);
      el('b3AssumpH').textContent = T('Error y heredabilidad por ambiente', 'Error and heritability by environment');
      el('b3AnovaNote').innerHTML = T('Las entradas se prueban contra la interacción entradas × ambientes (ambientes aleatorios) y contra el error combinado (ambientes fijos).', 'Entries are tested against the entries × environments interaction (random environments) and against the pooled error (fixed environments).');
      table('b3Assump', [
        { label: T('Ambiente', 'Environment'), get: x => esc(x.env) },
        { label: T('CME', 'MSE'), num: true, get: x => fmtNum(x.mse, 4) },
        { label: T('gl', 'df'), num: true, get: x => x.dfe },
        { label: 'CV %', num: true, get: x => fmtNum(x.cv, 1) },
        { label: 'H²c', num: true, get: x => f2(x.h2) },
      ], e.envs);
      el('b3FigResid').innerHTML = ''; delete Fig.registry.b3FigResid;
    }
    msg('b3AnaMsg', notes);
    /* means */
    const typeOf = new Map(B3.rec.mating.entries.map(x => [x.name, x.dtype || x.type]));
    const means = (e.means || []).map(m => Object.assign({ type: typeOf.get(m.entry) || 'entry' }, m)).sort((a, b) => b.mean - a.mean);
    means.forEach((m, i) => { m.rank = i + 1; });
    table('b3Means', [
      { label: '#', num: true, get: m => m.rank },
      { label: T('Entrada', 'Entry'), get: m => esc(m.entry) + (m.estimable === false ? ' <span class="miss">†</span>' : '') },
      { label: T('Tipo', 'Type'), get: m => typeName(m.type) },
      { label: T('Parcelas', 'Plots'), num: true, get: m => m.n != null ? m.n : '' },
      { label: T('Media ajustada', 'Adjusted mean'), num: true, get: m => fmtNum(m.mean, 4) },
      { label: T('Error estándar', 'Standard error'), num: true, get: m => fmtNum(m.se, 4) },
    ], means, 300);
    if (means.length) mountFig('b3FigMeans', {
      title: () => T('Medias ajustadas', 'Adjusted means') + ' · ' + t.name + (B3.rec.field.multiEnv ? ' · ' + (combined ? T('combinado', 'combined') : e.env) : ''), fileName: 'adjusted_means',
      render: c => P3.means(c, means, { label: t.name, df: e.dfe, grand: e.mean, typeName }),
      controls: () => [P2.titleControl(), { key: 'order', label: T('Orden', 'Order'), type: 'select', options: [['mean', T('por media', 'by mean')], ['name', T('por nombre', 'by name')]] }, { key: 'maxEntries', label: T('Máximo de entradas', 'Maximum entries'), type: 'number', min: 10, max: 400, step: 10 }, { key: 'showCI', label: T('Intervalos de confianza de 95 %', '95% confidence intervals'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 980, height: Math.max(420, Math.min(1400, 150 + Math.min(means.length, 60) * 17)), flip: true, maxEntries: 60, showCI: true });
    renderNext();
  }

  function renderMethodNotes() {
    el('b3MethodNotes').innerHTML = T(`
      <ul>
        <li><b>Bloques completos al azar:</b> y = μ + repetición + entrada + e. Prueba de no aditividad de Tukey (1949) con un grado de libertad.</li>
        <li><b>Látice α y bloques incompletos resolubles</b> (Patterson y Williams 1976): el análisis de varianza es intrabloque (entradas ajustadas por bloques dentro de repeticiones); las medias se estiman con bloques aleatorios por máxima verosimilitud restringida (REML; Patterson y Thompson 1971), que recupera la información entre bloques. Los componentes de varianza se obtienen con iteraciones de información promedio (Gilmour, Thompson y Cullis 1995). La eficiencia compara el cuadrado del error estándar promedio de una diferencia con el del análisis en bloques completos.</li>
        <li><b>Bloques aumentados</b> (Federer 1956): bloques fijos estimados con los testigos repetidos; las entradas nuevas se ajustan por el efecto de su bloque. La suma de cuadrados de las entradas se divide en testigos y en entradas nuevas más su contraste con los testigos.</li>
        <li><b>Filas y columnas:</b> filas y columnas dentro de repeticiones como efectos aleatorios (REML).</li>
        <li><b>Datos por planta:</b> cada parcela se resume con la media de sus plantas y el error de muestreo entre plantas se informa aparte (Steel, Torrie y Dickey 1997).</li>
        <li><b>Valores atípicos:</b> residuales estudentizados externamente y corrección de Bonferroni (Cook y Weisberg 1982).</li>
        <li><b>Heredabilidad del ensayo:</b> entradas aleatorias y testigos fijos; H² estándar = σ²g / (σ²g + σ²e/r) y H² de Cullis, Smith y Coombes (2006) = 1 − v̄Δ/(2σ²g), con v̄Δ la varianza promedio del error de predicción de las diferencias.</li>
        <li><b>Análisis combinado:</b> en una etapa con ambientes, repeticiones dentro de ambientes, entradas y su interacción, o en dos etapas (medias ajustadas de cada ambiente y error combinado; Möhring y Piepho 2009) cuando el modelo es muy grande. Homogeneidad del error con la prueba de Bartlett (1937).</li>
        <li>Los errores estándar de las medias REML son los del modelo, sin el ajuste de Kenward y Roger (1997).</li>
      </ul>`, `
      <ul>
        <li><b>Randomised complete blocks:</b> y = μ + replicate + entry + e. Tukey's (1949) one-degree-of-freedom test for non-additivity.</li>
        <li><b>α-lattice and resolvable incomplete blocks</b> (Patterson &amp; Williams 1976): the analysis of variance is intra-block (entries adjusted for blocks within replicates); means are estimated with random blocks by restricted maximum likelihood (REML; Patterson &amp; Thompson 1971), which recovers inter-block information. Variance components come from average-information iterations (Gilmour, Thompson &amp; Cullis 1995). Efficiency compares the squared average standard error of a difference with that of the complete-block analysis.</li>
        <li><b>Augmented blocks</b> (Federer 1956): fixed blocks estimated from the repeated checks; new entries are adjusted for the effect of their block. The entries sum of squares is split into checks and new entries plus their contrast with the checks.</li>
        <li><b>Rows and columns:</b> rows and columns within replicates as random effects (REML).</li>
        <li><b>Plant-level data:</b> each plot is summarised by the mean of its plants and the sampling error between plants is reported separately (Steel, Torrie &amp; Dickey 1997).</li>
        <li><b>Outliers:</b> externally studentised residuals with a Bonferroni correction (Cook &amp; Weisberg 1982).</li>
        <li><b>Trial heritability:</b> random entries and fixed checks; standard H² = σ²g / (σ²g + σ²e/r) and Cullis, Smith &amp; Coombes (2006) H² = 1 − v̄Δ/(2σ²g), where v̄Δ is the average prediction error variance of differences.</li>
        <li><b>Combined analysis:</b> one stage with environments, replicates within environments, entries and their interaction, or two stages (adjusted means of each environment and pooled error; Möhring &amp; Piepho 2009) when the model is too large. Homogeneity of error by Bartlett's (1937) test.</li>
        <li>Standard errors of REML means are model-based, without the Kenward &amp; Roger (1997) adjustment.</li>
      </ul>`);
  }

  function renderNext() {
    const d = B3.rec.mating.design;
    /* partial diallels are analysed with the other mating designs in Block 6 */
    const n = d === 'griffing' ? 4 : NC.includes(d) || d === 'partial' ? 6 : d === 'generations' ? 7 : B3.rec.field.multiEnv ? 9 : 8;
    const s = STEPS[n - 1];
    el('b3Next').disabled = !s.ready;
    el('b3Next').dataset.step = n;
    el('b3NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque ${n}, en construcción)`, `Next: ${s.en} (Block ${n}, under construction)`);
  }

  /* ================= state for the other blocks ================= */
  function publish() {
    if (!B3.ds || !B3.rec) { state.data = null; return; }
    state.data = {
      fileName: state.fileName, source: B3.source, example: B3.example, truth: B3.truth,
      table: B3.table, roles: B3.roles, ds: B3.ds, rec: B3.rec, mating: B3.rec.mating, field: B3.rec.field,
      traits: B3.ds.traits.map(t => t.name), excluded: B3.excluded, external: B3.external,
      analysis: i => runTrait(i), results: B3.results,
    };
    document.dispatchEvent(new CustomEvent('datachange'));
  }

  /* ================= downloads ================= */
  function allResults() { return B3.ds.traits.map((_, i) => runTrait(i)); }
  function meansRows() {
    const typeOf = new Map(B3.rec.mating.entries.map(x => [x.name, x.dtype || x.type]));
    const rows = [];
    allResults().forEach(res => {
      res.envs.forEach(e => (e.means || []).forEach(m => rows.push([res.trait, e.env, m.entry, typeName(typeOf.get(m.entry) || 'entry'), m.n, m.mean, m.se])));
      if (res.combined) res.combined.means.forEach(m => rows.push([res.trait, T('Combinado', 'Combined'), m.entry, typeName(typeOf.get(m.entry) || 'entry'), '', m.mean, m.se]));
    });
    return [[T('Variable', 'Trait'), T('Ambiente', 'Environment'), T('Entrada', 'Entry'), T('Tipo', 'Type'), T('Parcelas', 'Plots'), T('Media ajustada', 'Adjusted mean'), T('Error estándar', 'Standard error')]].concat(rows);
  }
  function cleanRows() {
    const keep = new Map(B3.ds.records.map(r => [r.i, r]));
    const header = B3.table.header.concat([T('Excluido', 'Excluded')]);
    return [header].concat(B3.table.rows.map((row, i) => { const r = keep.get(i); return row.concat([r && B3.excluded.has(r.k) ? 1 : 0]); }));
  }
  function downloadCsv(rows, name) { download(String.fromCharCode(0xFEFF) + rows.map(r => r.map(v => csvEscape(typeof v === 'number' ? +v.toPrecision(12) : v)).join(',')).join('\r\n'), name, 'text/csv;charset=utf-8'); }
  function downloadXlsx() {
    if (typeof XLSX === 'undefined') return;
    const wb = XLSX.utils.book_new();
    const anova = [[T('Variable', 'Trait'), T('Ambiente', 'Environment'), T('Fuente', 'Source'), T('gl', 'df'), T('SC', 'SS'), T('CM', 'MS'), 'F', 'p']];
    const quality = [[T('Variable', 'Trait'), T('Ambiente', 'Environment'), T('Diseño', 'Design'), T('Parcelas', 'Plots'), T('Media', 'Mean'), 'CV %', T('CME', 'MSE'), T('gl error', 'Error df'), T('DMS 5 %', 'LSD 5%'), 'H² Cullis', T('H² estándar', 'Standard H²'), 'σ²g', T('σ² bloques', 'Block σ²'), 'Shapiro–Wilk p', T('Tukey p', 'Tukey p'), T('Atípicos', 'Outliers')]];
    allResults().forEach(res => {
      res.envs.concat(res.combined ? [Object.assign({ env: T('Combinado', 'Combined'), combinedRow: true }, res.combined)] : []).forEach(e => {
        (e.anova || []).forEach(r => anova.push([res.trait, e.env, SRC(r.source).trim(), r.df, r.ss, r.total ? '' : r.ms, isFinite(r.F) ? r.F : '', isFinite(r.p) ? r.p : '']));
        if (!e.combinedRow) quality.push([res.trait, e.env, T(Trial.DESIGNS[e.design] || { es: e.design, en: e.design }), e.nPlots, e.mean, e.cv, e.mse, e.dfe, e.lsd, e.h2 ? e.h2.cullis : '', e.h2 ? e.h2.standard : '', e.h2 ? e.h2.sigma2g : '', e.reml && e.reml.components[0] ? e.reml.components[0].sigma2 : '', e.shapiro ? e.shapiro.p : '', e.tukey ? e.tukey.p : '', e.outliers ? e.outliers.filter(o => o.level === 'outlier').length : '']);
      });
    });
    const sheet = (rows, name) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    sheet(meansRows(), T('Medias', 'Means'));
    sheet(anova, T('ANOVA', 'ANOVA'));
    sheet(quality, T('Calidad', 'Quality'));
    sheet(cleanRows(), T('Datos', 'Data'));
    const m = B3.rec.mating;
    sheet([[T('Diseño de apareamiento', 'Mating design'), T(MATING[m.design] || { es: m.design, en: m.design })], [T('Método', 'Method'), m.method || ''], [T('Progenitores', 'Parents'), (m.parents || []).join(', ')], [T('Diseño de campo', 'Field design'), T(Trial.DESIGNS[B3.rec.field.design] || { es: '', en: '' })], [T('Ambientes', 'Environments'), B3.rec.field.envs.map(e => e.name).join(', ')], [T('Fuente de los datos', 'Data source'), B3.source ? B3.source.name : '']], T('Diseño', 'Design'));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('datos_y_diseno_', 'data_and_design_') + (state.fileName || '')) + '.xlsx');
  }

  /* ================= wiring ================= */
  function debounce(fn, ms) { let tm = null; return (...a) => { clearTimeout(tm); tm = setTimeout(() => fn(...a), ms); }; }
  function init() {
    if (!el('b3Load')) return;
    el('b3ArtFile').innerHTML = Art.dataSheet();
    el('b3ArtSheet').innerHTML = Art.fieldPlan();
    el('b3ArtPlan').innerHTML = Art.report ? Art.report() : '';
    renderExamples(); renderMethodNotes(); planNote();
    el('b3File').addEventListener('change', e => { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ''; });
    const drop = el('b3Drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) readFile(f); });
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el('b3File').click(); } });
    el('b3SheetSelect').addEventListener('change', () => { if (B3.wb) loadRows(Data.sheetRows(B3.wb, el('b3SheetSelect').value), B3.source.name, { kind: 'file', sheet: el('b3SheetSelect').value }); });
    el('b3OpenSheet').addEventListener('click', () => Sheet.open());
    el('b3FromPlan').addEventListener('click', fromPlan);
    el('b3ExFilter').addEventListener('click', e => { const b = e.target.closest('[data-fam]'); if (!b) return; B3.filter = b.dataset.fam; renderExamples(); });
    el('b3Examples').addEventListener('click', e => { const b = e.target.closest('[data-ex]'); if (b) loadExample(b.dataset.ex); });
    el('b3EditInSheet').addEventListener('click', () => { if (B3.rawRows) Sheet.open({ rows: B3.rawRows.map(r => r.map(v => (v == null ? '' : String(v)))), name: slug(B3.source.name), force: true }); });
    el('b3RolesTable').addEventListener('change', e => { const s = e.target.closest('select[data-col]'); if (!s) return; B3.roles[+s.dataset.col] = s.value; rebuild(); });
    el('b3Decimal').addEventListener('change', rebuild);
    el('b3WideBtn').addEventListener('click', () => { const b = el('b3WideBox'); b.style.display = b.style.display === 'none' ? '' : 'none'; });
    el('b3WideApply').addEventListener('click', () => {
      const cols = els('#b3WideCols input:checked').map(i => +i.value);
      if (cols.length < 2) { showMessage('b3ColMsg', 'warning', T('Marque al menos dos columnas.', 'Tick at least two columns.')); return; }
      B3.table = Data.reshapeLong(B3.table, cols, { keyName: el('b3WideKey').value.trim() || undefined, valueName: el('b3WideValue').value.trim() || undefined });
      B3.roles = Data.guessRoles(B3.table).roles;
      el('b3WideBox').style.display = 'none';
      rebuild();
    });
    el('b3MatrixBtn').addEventListener('click', () => { B3.table = Data.matrixToLong(B3.table, { valueName: el('b3WideValue').value.trim() || undefined }); B3.roles = Data.guessRoles(B3.table).roles; rebuild(); });
    el('b3UndoReshape').addEventListener('click', () => { B3.table = B3.original; B3.roles = Data.guessRoles(B3.table).roles; rebuild(); });
    el('b3MatingOv').addEventListener('change', () => {
      const v = el('b3MatingOv').value;
      delete B3.ov.mating; delete B3.ov.method;
      B3.declared = false;
      if (v.startsWith('griffing:')) { B3.ov.mating = 'griffing'; B3.ov.method = +v.split(':')[1]; }
      else if (v) B3.ov.mating = v;
      rebuild();
    });
    el('b3FieldOv').addEventListener('change', () => { const v = el('b3FieldOv').value; if (v) B3.ov.field = v; else delete B3.ov.field; rebuild(); });
    el('b3ExternalTable').addEventListener('change', e => {
      const tr = e.target.closest('tr[data-trait]'); if (!tr) return;
      const o = {};
      els('[data-k]', tr).forEach(x => { o[x.dataset.k] = x.dataset.k === 'scale' ? x.value : parseFloat(x.value); });
      B3.external[tr.dataset.trait] = o;
      B3.results.clear(); analyseCurrent();
    });
    el('b3Trait').addEventListener('change', () => { B3.trait = +el('b3Trait').value; renderPresence(); analyseCurrent(); });
    el('b3Env').addEventListener('change', () => { B3.env = el('b3Env').value; renderAnalysis(); });
    el('b3MapEnv').addEventListener('change', () => { el('b3MapEnv').dataset.cur = el('b3MapEnv').value; renderFieldMap(); });
    el('b3MapValue').addEventListener('change', () => { delete Fig.registry.b3FigField; renderFieldMap(); });
    el('b3Outliers').addEventListener('change', e => {
      const c = e.target.closest('input[data-ks]'); if (!c) return;
      c.dataset.ks.split(',').map(Number).forEach(k => { if (c.checked) B3.excluded.add(k); else B3.excluded.delete(k); });
      B3.results.clear(); analyseCurrent();
    });
    el('b3RestoreAll').addEventListener('click', () => { B3.excluded.clear(); B3.results.clear(); analyseCurrent(); });
    el('b3DlXlsx').addEventListener('click', downloadXlsx);
    el('b3DlMeans').addEventListener('click', () => downloadCsv(meansRows(), slug(T('medias_ajustadas', 'adjusted_means')) + '.csv'));
    el('b3DlClean').addEventListener('click', () => downloadCsv(cleanRows(), slug(T('datos_depurados', 'cleaned_data')) + '.csv'));
    el('b3Back').addEventListener('click', () => goStep(2));
    el('b3Next').addEventListener('click', () => { const n = +el('b3Next').dataset.step; if (STEPS[n - 1].ready) goStep(n); });
    document.addEventListener('stepchange', e => { if (e.detail.step === 3) planNote(); });
    document.addEventListener('langchange', () => {
      renderExamples(); renderMethodNotes(); planNote();
      if (B3.example) exampleNote();
      if (!B3.ds || !B3.rec) return;
      /* names of single environments and the book's type names depend on the language */
      const single = T('Única', 'Single');
      B3.rec.field.envs.forEach(e => { if (!e.key) e.name = single; });
      B3.results.forEach(res => res.envs.forEach(e => { if (!e.key) e.env = single; }));
      renderColumns(); renderDesign(); renderTraitPickers();
      if (B3.results.has(B3.trait)) { renderQuality(); renderAnalysis(); }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
