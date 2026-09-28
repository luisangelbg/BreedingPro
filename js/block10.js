/* BreedingPro — Block 10 interface: mixed models, BLUP and crossbreeding. Records and pedigree
   (inbreeding, relationships), the animal or sire model with breeding values, their reliability
   and REML components, the BLUP of the genotypes of a Block 3 trial with a pedigree, and the
   crossbreeding parameters of Dickerson with predictions of crosses and systems. */

(function () {
  const B10 = {
    src: null, ped: null, pedIssues: [], selfing: false,
    trait: 0, model: 'animal', pe: false, mat: false, varMode: 'reml', given: {}, fit: null, prep: null, lrt: null,
    topN: 25, sortBy: 'ebvDesc', trendBy: '__gen', ebvShow: 'rank',
    tTrait: 0, tGen: 'A', tRes: null,
    x: { mode: 'estimate', res: null, preds: null },
    built: false,
  };
  window.B10 = B10;

  const msg = (host, list) => { clearMessages(host); (list || []).forEach(x => showMessage(host, x.level === 'error' ? 'error' : x.level === 'warning' ? 'warning' : 'info', T(x))); };
  const table = (host, cols, rows, limit) => {
    host = typeof host === 'string' ? el(host) : host;
    const shown = limit ? rows.slice(0, limit) : rows;
    let h = '<table><thead><tr>' + cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('') + '</tr></thead><tbody>';
    shown.forEach(r => { h += `<tr class="${r._cls || ''}">` + cols.map(c => { const v = c.get(r); return `<td class="${c.num ? 'num' : ''}">${v == null || v === '' ? '—' : v}</td>`; }).join('') + '</tr>'; });
    h += '</tbody></table>';
    if (limit && rows.length > limit) h += `<p class="hint">${T(`Se muestran ${limit} de ${rows.length} filas.`, `Showing ${limit} of ${rows.length} rows.`)}</p>`;
    host.innerHTML = h;
  };
  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    Fig.mount(hostId, Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {}));
  }
  const sig = p => (isFinite(p) ? `${fmtP(p)} <span class="sig">${stars(p)}</span>` : '');
  const f4 = x => fmtFixed(x, 4);
  const pm = (v, se, d) => (isFinite(v) ? `${fmtNum(v, d || 4)}${isFinite(se) ? ` <span class="hint">± ${fmtNum(se, d || 4)}</span>` : ''}` : '—');
  const tiles = (host, items) => { el(host).innerHTML = items.map(([es, en, v, sub]) => `<div class="stat-tile"><div class="stat-label">${keepGreek(T(es, en))}</div><div class="stat-value">${v}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`).join(''); };
  const yieldUI = () => new Promise(r => setTimeout(r, 30));

  /* ================= 1 · data and pedigree ================= */
  const ROLES10 = [
    ['ignore', 'Ignorar', 'Ignore'], ['animal', 'Individuo', 'Individual'], ['sire', 'Padre (o progenitor 1)', 'Sire (or parent 1)'], ['dam', 'Madre (o progenitor 2)', 'Dam (or parent 2)'],
    ['trait', 'Variable respuesta', 'Response trait'], ['fixed', 'Efecto fijo (factor)', 'Fixed effect (factor)'], ['cov', 'Covariable', 'Covariate'], ['random', 'Efecto aleatorio (factor)', 'Random effect (factor)'],
    ['t', 'Generaciones de autofecundación', 'Generations of selfing'], ['F0', 'Consanguinidad del fundador', 'Founder inbreeding'], ['year', 'Año de nacimiento (tendencia)', 'Birth year (trend)'],
  ];
  const guessRole = (name, values) => {
    const n = Data.norm(name);
    if (/^(animal|animales|id|ident|individuo|individual|ind|calf|becerro|ternero|cow|vaca|piglet|lechon|lamb|cordero|oveja|genotipo|genotype|clon|clone|planta|plant|arbol|tree|linea|line)$/.test(n)) return 'animal';
    if (/^(sire|sires|padre|father|toro|semental|macho|male|progenitor1|parent1|p1|pollenparent|polen)$/.test(n)) return 'sire';
    if (/^(dam|dams|madre|mother|hembra|female|progenitor2|parent2|p2|seedparent)$/.test(n)) return 'dam';
    if (/^(t|selfing|selfings|autofecundacion|autofecundaciones|autof|generacionesdeautofecundacion)$/.test(n)) return 't';
    if (/^(f0|foundersf|founderf|finicial|consanguinidadfundador)$/.test(n)) return 'F0';
    if (/^(cg|litter|camada|grupocontemporaneo|contemporarygroup|gc|grupo|group)$/.test(n)) return 'random';
    const vals = values.filter(v => !Data.isMissing(v));
    const dec = Data.decimalOf(vals);
    const nums = vals.map(v => Data.toNumber(v, dec)).filter(isFinite);
    if (nums.length === vals.length && vals.length) {
      const distinct = new Set(nums).size;
      if (nums.every(Number.isInteger) && distinct <= Math.max(2, Math.min(20, vals.length / 2))) return 'fixed';
      return 'trait';
    }
    return 'fixed';
  };
  const EX10 = [
    { id: 'mrode31', es: 'Mrode: modelo animal (ej. 3.1)', en: 'Mrode: animal model (Ex. 3.1)', data: () => EXDATA10.mrode31, roles: { Calf: 'animal', Sire: 'sire', Dam: 'dam', Sex: 'fixed', WWG: 'trait' }, varMode: 'given', given: { animal: 20, e: 40 },
      cite: 'Mrode RA (2014). Linear Models for the Prediction of Animal Breeding Values, 3rd ed. CABI, Wallingford (Example 3.1).' },
    { id: 'mrode32', es: 'Mrode: modelo de padres (ej. 3.2)', en: 'Mrode: sire model (Ex. 3.2)', data: () => EXDATA10.mrode31, roles: { Calf: 'animal', Sire: 'sire', Dam: 'dam', Sex: 'fixed', WWG: 'trait' }, model: 'sire', varMode: 'given', given: { sire: 5, e: 55 },
      cite: 'Mrode RA (2014). Linear Models for the Prediction of Animal Breeding Values, 3rd ed. CABI, Wallingford (Example 3.2).' },
    { id: 'schaeffer31', es: 'Schaeffer: grupos contemporáneos aleatorios', en: 'Schaeffer: random contemporary groups', data: () => EXDATA10.schaeffer31, roles: { Animal: 'animal', Sire: 'sire', Dam: 'dam', Herd: 'ignore', Year: 'fixed', CG: 'random', y: 'trait' }, varMode: 'given', given: { animal: 64, 'r:CG': 36, e: 144 },
      cite: 'Schaeffer LR (2019). Animal Models. University of Guelph (Table 3.1).' },
    { id: 'schaeffer61', es: 'Schaeffer: registros repetidos', en: 'Schaeffer: repeated records', data: () => EXDATA10.schaeffer61, roles: { Herd: 'ignore', Animal: 'animal', Sire: 'sire', Dam: 'dam', Year: 'fixed', CG: 'random', y: 'trait' }, pe: true, varMode: 'given', given: { animal: 36, pe: 16, 'r:CG': 20, e: 100 },
      cite: 'Schaeffer LR (2019). Animal Models. University of Guelph (Tables 6.1–6.2).' },
    { id: 'mrode52', es: 'Mrode: efecto de camada (ej. 5.2)', en: 'Mrode: litter effect (Ex. 5.2)', data: () => EXDATA10.mrode52, roles: { Piglet: 'animal', Sire: 'sire', Dam: 'dam', Sex: 'fixed', Litter: 'random', WW: 'trait' }, varMode: 'given', given: { animal: 20, 'r:Litter': 15, e: 65 },
      cite: 'Mrode RA (2014). Linear Models for the Prediction of Animal Breeding Values, 3rd ed. CABI, Wallingford (common litter environment example).' },
    { id: 'simFlock', es: 'Simulado: rebaño ovino, h² = 0.3', en: 'Simulated: sheep flock, h² = 0.3', sim: () => Examples.simFlock(), roles: { Animal: 'animal', Padre: 'sire', Madre: 'dam', Sexo: 'fixed', 'Año': 'fixed', Peso: 'trait' }, varMode: 'reml',
      cite: { es: 'Datos simulados por BreedingPro con semilla fija: σ²a = 30, σ²e = 70, efectos de sexo y año.', en: 'Data simulated by BreedingPro with a fixed seed: σ²a = 30, σ²e = 70, sex and year effects.' } },
    { id: 'simLinesPed', es: 'Simulado: pedigrí de líneas endogámicas', en: 'Simulated: pedigree of inbred lines', sim: () => ({ rows: Examples.simLines().pedigree }), roles: { Genotipo: 'animal', Progenitor1: 'sire', Progenitor2: 'dam', Autofecundaciones: 't', F0: 'F0' }, selfing: true,
      cite: { es: 'El pedigrí del ensayo simulado de líneas del Bloque 3: 8 progenitores endogámicos y 60 líneas F₆ de 12 cruzas.', en: 'The pedigree of the simulated line trial of Block 3: 8 inbred parents and 60 F₆ lines from 12 crosses.' } },
  ];

  function loadSource(src) {
    B10.src = src;
    B10.fit = null; B10.prep = null; B10.lrt = null;
    B10.trait = 0;
    if (src.model) B10.model = src.model; else B10.model = 'animal';
    B10.pe = !!src.pe; B10.mat = false;
    B10.varMode = src.varMode || 'reml';
    B10.given = Object.assign({}, src.given || {});
    B10.selfing = !!src.selfing || src.roles.includes('t');
    buildPedigree();
    renderAll();
  }
  function srcFromRows(rows, name, spec) {
    const tab = Data.table(rows);
    const roles = tab.header.map((h, j) => (spec && spec.roles && spec.roles[h]) || guessRole(h, tab.rows.map(r => r[j])));
    return Object.assign({ name, header: tab.header, rows: tab.rows, roles }, spec || {}, { roles });
  }
  const colOf = (src, role) => src.roles.indexOf(role);
  const colsOf = (src, role) => src.roles.map((r, j) => (r === role ? j : -1)).filter(j => j >= 0);
  function numCol(src, j) {
    const vals = src.rows.map(r => r[j]);
    const dec = Data.decimalOf(vals.filter(v => !Data.isMissing(v)));
    return vals.map(v => (Data.isMissing(v) ? NaN : Data.toNumber(v, dec)));
  }
  function pedRowsOf(src) {
    const ja = colOf(src, 'animal'), js = colOf(src, 'sire'), jd = colOf(src, 'dam'), jt = colOf(src, 't'), jf = colOf(src, 'F0'), jy = colOf(src, 'year');
    if (ja < 0) return null;
    const tv = jt >= 0 ? numCol(src, jt) : null, fv = jf >= 0 ? numCol(src, jf) : null;
    const rows = src.rows.map((r, i) => ({ id: r[ja], sire: js >= 0 ? r[js] : null, dam: jd >= 0 ? r[jd] : null, t: tv ? tv[i] : 0, F0: fv ? fv[i] : 0, year: jy >= 0 ? r[jy] : null }));
    if (B10.pedExtra) B10.pedExtra.forEach(p => rows.push(p));
    /* several records of one individual: one pedigree row */
    const seen = new Map();
    rows.forEach(r => { const k = String(r.id).trim(); if (!seen.has(k)) seen.set(k, r); });
    return [...seen.values()];
  }
  function buildPedigree() {
    B10.ped = null; B10.pedIssues = [];
    const src = B10.src;
    if (!src) return;
    const rows = pedRowsOf(src);
    if (!rows) { B10.pedIssues = [{ level: 'error', es: 'Falta la columna del individuo.', en: 'The individual column is missing.' }]; return; }
    const built = PED.build(rows, { selfing: B10.selfing });
    B10.pedIssues = built.issues;
    if (built.ok) B10.ped = built.ped;
  }

  function renderSourcePicker() {
    el('b10ExRow').innerHTML = EX10.map(e => `<button type="button" class="btn btn-secondary btn-sm${B10.src && B10.src.id === e.id ? ' active' : ''}" data-ex10="${e.id}">${T(e.es, e.en)}</button>`).join('');
    el('b10ExRow').querySelectorAll('[data-ex10]').forEach(b => b.addEventListener('click', () => {
      const e = EX10.find(x => x.id === b.dataset.ex10);
      const got = e.sim ? e.sim() : { rows: Data.parseDelimited(e.data()) };
      B10.pedExtra = null;
      loadSource(srcFromRows(got.rows, T(e.es, e.en), { id: e.id, roles: e.roles, model: e.model, pe: e.pe, varMode: e.varMode, given: e.given, selfing: e.selfing, cite: e.cite, truth: got.truth }));
    }));
  }
  function renderRoles() {
    const src = B10.src, host = el('b10Roles');
    if (!src) { host.innerHTML = ''; return; }
    host.innerHTML = '<table><thead><tr><th>' + T('Columna', 'Column') + '</th><th>' + T('Papel', 'Role') + '</th><th>' + T('Primeros valores', 'First values') + '</th></tr></thead><tbody>'
      + src.header.map((h, j) => `<tr><td>${esc(h)}</td><td><select aria-label="${esc(T('Papel de ', 'Role of ') + h)}" data-col="${j}">${ROLES10.map(([k, es, en]) => `<option value="${k}"${src.roles[j] === k ? ' selected' : ''}>${T(es, en)}</option>`).join('')}</select></td><td class="hint">${src.rows.slice(0, 4).map(r => esc(r[j])).join(' · ')}</td></tr>`).join('') + '</tbody></table>';
    host.querySelectorAll('select[data-col]').forEach(s => s.addEventListener('change', () => { src.roles[+s.dataset.col] = s.value; B10.fit = null; if (s.value === 't') B10.selfing = true; buildPedigree(); renderAll(); }));
    el('b10Selfing').checked = B10.selfing;
  }
  function renderPedigree() {
    const src = B10.src;
    el('b10Source').innerHTML = src ? `<b>${esc(src.name)}</b>: ${src.rows.length} ${T('filas', 'rows')}${src.cite ? ` · <span class="hint">${esc(typeof src.cite === 'string' ? src.cite : T(src.cite))}</span>` : ''}` : T('Elija un ejemplo o cargue un archivo con una fila por registro y las columnas del individuo, su padre y su madre.', 'Pick an example or load a file with one row per record and the columns of the individual, its sire and its dam.');
    msg('b10DataMsg', B10.pedIssues);
    const box = el('b10PedBox');
    if (!B10.ped) { box.style.display = 'none'; return; }
    box.style.display = '';
    const ped = B10.ped, st = PED.stats(ped);
    tiles('b10PedTiles', [
      ['Individuos', 'Individuals', st.n], ['Fundadores', 'Founders', st.founders], ['Generaciones', 'Generations', st.generations],
      ['Padres / madres', 'Sires / dams', `${st.sires} / ${st.dams}`], ['Consanguíneos', 'Inbred', st.inbred], ['F media', 'Mean F', fmtFixed(st.meanF, 4)], ['F máxima', 'Largest F', fmtFixed(st.maxF, 4)],
    ]);
    table('b10PedGen', [
      { label: T('Generación', 'Generation'), get: r => r.g },
      { label: 'n', num: true, get: r => r.n },
      { label: T('F media', 'Mean F'), num: true, get: r => fmtFixed(r.meanF, 4) },
      { label: T('F máxima', 'Largest F'), num: true, get: r => fmtFixed(r.maxF, 4) },
    ], st.byGen);
    const rows = ped.ids.map((id, k) => ({ id, sire: ped.sire[k] >= 0 ? ped.ids[ped.sire[k]] : '', dam: ped.dam[k] >= 0 ? ped.ids[ped.dam[k]] : '', gen: ped.generation[k], t: ped.t[k], F: ped.F[k], b: ped.b[k], added: ped.added.has(id) }));
    table('b10PedTable', [
      { label: T('Individuo', 'Individual'), get: r => esc(r.id) + (r.added ? ' <span class="hint">*</span>' : '') },
      { label: T('Padre', 'Sire'), get: r => esc(r.sire) },
      { label: T('Madre', 'Dam'), get: r => esc(r.dam) },
      { label: T('Generación', 'Generation'), num: true, get: r => r.gen },
      { label: T('Autofecund.', 'Selfings'), num: true, get: r => (r.t ? r.t : '') },
      { label: 'F', num: true, get: r => fmtFixed(r.F, 5) },
      { label: 'b', num: true, get: r => fmtFixed(r.b, 5) },
    ], rows, 300);
    mountFig('b10FigPed', {
      title: () => T('Consanguinidad por generación', 'Inbreeding by generation'), fileName: 'inbreeding',
      render: c => P10.inbreeding(c, st.byGen),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 760, height: 420 });
    const small = ped.n <= 60;
    el('b10AMatBox').style.display = small ? '' : 'none';
    if (small) {
      const A = PED.A(ped);
      mountFig('b10FigA', {
        title: () => T('Matriz de parentesco A', 'Relationship matrix A'), fileName: 'relationship_A',
        render: c => P10.relationship(c, A, ped.ids),
        controls: () => [P2.titleControl(), { key: 'colormap', label: T('Colores', 'Colours'), type: 'select', options: Object.entries(Fig.colormapNames) }],
      }, { width: 760, height: 760, colormap: 'heat' });
    }
    el('b10PedNote').innerHTML = T(
      `Orden: los progenitores antes que su descendencia (orden topológico), por generación. * = progenitor sin fila propia, agregado como fundador. F por los vectores de trayectoria de Meuwissen y Luo (1992); b = varianza del muestreo mendeliano relativa a σ²a (½ − ¼(F<sub>s</sub> + F<sub>d</sub>) con los dos padres conocidos). ${B10.selfing ? 'Se permite autofecundación; una línea con t generaciones de autofecundación desde la cruza de sus progenitores tiene F = 1 − (½)<sup>t</sup>(1 − f<sub>sd</sub>) y el parentesco con los demás de su F₁.' : ''} log|A| = Σ log b = ${fmtNum(ped.logdetA, 6)}.`,
      `Order: parents before their offspring (topological order), by generation. * = parent without a row of its own, added as a founder. F by the path vectors of Meuwissen & Luo (1992); b = Mendelian-sampling variance relative to σ²a (½ − ¼(F<sub>s</sub> + F<sub>d</sub>) with both parents known). ${B10.selfing ? 'Selfing is allowed; a line with t generations of selfing from the cross of its parents has F = 1 − (½)<sup>t</sup>(1 − f<sub>sd</sub>) and the relationship to the others of its F₁.' : ''} log|A| = Σ log b = ${fmtNum(ped.logdetA, 6)}.`);
  }

  /* ================= 2 · animal model ================= */
  const compName = key => ({
    animal: T('genético aditivo σ²a', 'additive genetic σ²a'), sire: T('padre σ²s = ¼σ²a', 'sire σ²s = ¼σ²a'), pe: T('ambiente permanente σ²ep', 'permanent environment σ²pe'),
    maternal: T('genético materno σ²m', 'maternal genetic σ²m'), e: T('residual σ²e', 'residual σ²e'),
  }[key] || (key.startsWith('r:') ? key.slice(2) : key));
  function recordsOf(traitCol) {
    const src = B10.src;
    const ja = colOf(src, 'animal');
    const y = numCol(src, traitCol);
    const fixedCols = colsOf(src, 'fixed'), covCols = colsOf(src, 'cov'), randCols = colsOf(src, 'random');
    const covVals = covCols.map(j => numCol(src, j));
    return src.rows.map((r, i) => ({
      animal: String(r[ja]).trim(), y: y[i],
      fixed: Object.fromEntries(fixedCols.map(j => [src.header[j], Data.isMissing(r[j]) ? '' : String(r[j])])),
      covs: Object.fromEntries(covCols.map((j, q) => [src.header[j], covVals[q][i]])),
      random: Object.fromEntries(randCols.map(j => [src.header[j], Data.isMissing(r[j]) ? '' : String(r[j])])),
    }));
  }
  function modelSpec() {
    const src = B10.src;
    return { fixed: colsOf(src, 'fixed').map(j => src.header[j]), covs: colsOf(src, 'cov').map(j => src.header[j]), random: colsOf(src, 'random').map(j => src.header[j]), model: B10.model, pe: B10.pe, maternal: B10.mat };
  }
  function renderModelForm() {
    const src = B10.src, ok = src && B10.ped && colsOf(src, 'trait').length;
    el('b10ModelBox').style.display = ok ? '' : 'none';
    if (!ok) { msg('b10ModelMsg', src && B10.ped ? [{ level: 'info', es: 'Estos datos solo traen pedigrí: no hay una variable respuesta para el modelo animal. El pedigrí sí sirve para el BLUP de los genotipos del ensayo (tarjeta 3).', en: 'These data carry a pedigree only: there is no response trait for the animal model. The pedigree does serve the BLUP of the trial genotypes (card 3).' }] : []); return; }
    clearMessages('b10ModelMsg');
    const traits = colsOf(src, 'trait');
    if (B10.trait >= traits.length) B10.trait = 0;
    el('b10Trait').innerHTML = traits.map((j, q) => `<option value="${q}">${esc(src.header[j])}</option>`).join('');
    el('b10Trait').value = String(B10.trait);
    el('b10ModelKind').value = B10.model;
    el('b10PE').checked = B10.pe; el('b10Mat').checked = B10.mat;
    el('b10VarMode').value = B10.varMode;
    const spec = modelSpec();
    el('b10Spec').innerHTML = T(
      `Efectos fijos: ${spec.fixed.length ? spec.fixed.map(esc).join(', ') : 'solo la media'}${spec.covs.length ? '; covariables: ' + spec.covs.map(esc).join(', ') : ''}. Aleatorios: ${B10.model === 'sire' ? 'padre (con el parentesco de los padres)' : 'individuo (con A)'}${B10.pe ? ', ambiente permanente' : ''}${B10.mat ? ', genético materno' : ''}${spec.random.length ? ', ' + spec.random.map(esc).join(', ') : ''} y residual. Los papeles se cambian en la tabla de columnas.`,
      `Fixed effects: ${spec.fixed.length ? spec.fixed.map(esc).join(', ') : 'the mean only'}${spec.covs.length ? '; covariates: ' + spec.covs.map(esc).join(', ') : ''}. Random: ${B10.model === 'sire' ? 'sire (with the relationships of the sires)' : 'individual (with A)'}${B10.pe ? ', permanent environment' : ''}${B10.mat ? ', maternal genetic' : ''}${spec.random.length ? ', ' + spec.random.map(esc).join(', ') : ''} and residual. Roles are changed in the column table.`);
    /* inputs for given variances */
    const keys = [B10.model === 'sire' ? 'sire' : 'animal'].concat(B10.pe ? ['pe'] : [], B10.mat ? ['maternal'] : [], spec.random.map(nm => 'r:' + nm), ['e']);
    el('b10VarInputs').style.display = B10.varMode === 'given' ? '' : 'none';
    el('b10VarInputs').innerHTML = keys.map(k => `<div class="field"><label>${keepGreek(esc(compName(k)))}</label><input type="number" step="any" min="0" data-var="${k}" value="${B10.given[k] != null ? B10.given[k] : ''}"></div>`).join('');
    el('b10VarInputs').querySelectorAll('[data-var]').forEach(inp => inp.addEventListener('change', () => { B10.given[inp.dataset.var] = parseFloat(inp.value); }));
    B10.varKeys = keys;
  }
  async function runModel() {
    const src = B10.src;
    const traits = colsOf(src, 'trait');
    const recs = recordsOf(traits[B10.trait]);
    const prep = AM.prepare(recs, B10.ped, modelSpec());
    const notes = prep.issues.slice();
    if (prep.size > 2600) { msg('b10RunMsg', notes.concat([{ level: 'error', es: `El sistema de ecuaciones tiene ${prep.size} incógnitas; este bloque resuelve de forma exacta (matrices densas) hasta 2600. Reduzca el pedigrí a los ancestros de los individuos con registros o analice por partes.`, en: `The system of equations has ${prep.size} unknowns; this block solves exactly (dense matrices) up to 2600. Reduce the pedigree to the ancestors of the individuals with records or analyse in parts.` }])); return; }
    let theta = null;
    if (B10.varMode === 'given') {
      theta = prep.random.map(r => B10.given[r.key]).concat([B10.given.e]);
      if (theta.some(v => !(v > 0))) { msg('b10RunMsg', notes.concat([{ level: 'error', es: 'Escriba todas las varianzas (mayores que cero) o elija estimarlas por REML.', en: 'Type every variance (greater than zero) or choose to estimate them by REML.' }])); return; }
    }
    msg('b10RunMsg', [{ level: 'info', es: `Calculando: ${prep.n} registros, ${prep.size} ecuaciones…`, en: `Computing: ${prep.n} records, ${prep.size} equations…` }]);
    el('b10Run').disabled = true;
    await yieldUI();
    try {
      const fit = AM.fit(prep, { theta });
      if (fit.error) { msg('b10RunMsg', [{ level: 'error', es: 'El modelo no se pudo ajustar (ecuaciones singulares).', en: 'The model could not be fitted (singular equations).' }]); return; }
      B10.fit = fit; B10.prep = prep;
      B10.lrt = !theta && prep.size <= 900 ? AM.lrt(prep, fit) : null;
      if (!theta) { prep.random.forEach((r, k) => { B10.given[r.key] = +fit.res.theta[k].toPrecision(6); }); B10.given.e = +fit.res.theta[prep.random.length].toPrecision(6); }
      if (!theta && !fit.res.converged) notes.push({ level: 'warning', es: 'REML no convergió en el número máximo de iteraciones; los valores son los de la última.', en: 'REML did not converge within the maximum number of iterations; the values are those of the last one.' });
      if (fit.comp.some(c => c.boundary)) notes.push({ level: 'info', es: 'Algún componente quedó en el límite (cero): los datos no lo distinguen del error. Su error estándar no se informa.', en: 'Some component ended at the boundary (zero): the data do not tell it apart from error. Its standard error is not reported.' });
      notes.push({ level: 'info', es: `Listo en ${fmtNum(fit.time / 1000, 2)} s${theta ? '' : ` (${fit.res.iterations} iteraciones de REML)`}.`, en: `Done in ${fmtNum(fit.time / 1000, 2)} s${theta ? '' : ` (${fit.res.iterations} REML iterations)`}.` });
      msg('b10RunMsg', notes);
      renderModelForm();
      renderResults();
    } finally { el('b10Run').disabled = false; }
  }
  function renderResults() {
    const fit = B10.fit, host = el('b10Results');
    if (!fit) { host.style.display = 'none'; return; }
    host.style.display = '';
    const src = B10.src, prep = B10.prep;
    const withRec = fit.ebv.filter(e => e.nrec).length;
    const items = [['Registros', 'Records', fit.n], ['Individuos con valor genético', 'Individuals with a breeding value', fit.ebv.length, (fit.model === 'sire' ? T(`${withRec} con progenie con registros`, `${withRec} with progeny records`) : T(`${withRec} con registros`, `${withRec} with records`))]];
    if (fit.h2) items.push(['h²', 'h²', pm(fit.h2.v, fit.h2.se, 3)]);
    if (fit.rep) items.push(['Repetibilidad', 'Repeatability', pm(fit.rep.v, fit.rep.se, 3)]);
    if (fit.m2) items.push(['m²', 'm²', pm(fit.m2.v, fit.m2.se, 3)]);
    if (fit.h2T) items.push(['h² total', 'total h²', fmtNum(fit.h2T.v, 3)]);
    (fit.ratios || []).forEach(r => items.push([`${r.name} / σ²P`, `${r.name} / σ²P`, pm(r.v, r.se, 3)]));
    tiles('b10Tiles', items);
    table('b10Comp', [
      { label: T('Componente', 'Component'), get: r => keepGreek(esc(compName(r.key))) },
      { label: T('Varianza', 'Variance'), num: true, get: r => (r.boundary ? '0 <span class="hint">(' + T('límite', 'boundary') + ')</span>' : fmtNum(r.sigma2, 5)) },
      ...(fit.given ? [] : [{ label: T('EE', 'SE'), num: true, get: r => (r.boundary ? '' : fmtFixed(r.se, 4)) }]),
      { label: T('% de σ²P', '% of σ²P'), num: true, get: r => fmtFixed(100 * r.sigma2 / fit.total, 1) },
    ], fit.comp);
    el('b10CompNote').innerHTML = (fit.given ? T('Varianzas dadas: las soluciones son las de las ecuaciones del modelo mixto con esos valores.', 'Given variances: the solutions are those of the mixed-model equations with those values.') : T(`REML por información promedio; log L restringida = ${fmtNum(fit.res.logLikREML, 6)}. Errores estándar: raíz de la diagonal de la inversa de la información promedio; los de las razones, por el método delta. En muestras pequeñas los intervalos de ±1.96 EE de una varianza cubren menos que lo nominal (en simulaciones con unos 150 registros, 90 % en lugar de 95 %).`, `REML by average information; restricted log L = ${fmtNum(fit.res.logLikREML, 6)}. Standard errors: square root of the diagonal of the inverse average information; those of the ratios, by the delta method. In small samples ±1.96 SE intervals of a variance cover less than nominal (in simulations with about 150 records, 90 % instead of 95 %).`))
      + (fit.model === 'sire' ? ' ' + T('En el modelo de padres σ²s = ¼σ²a, así que h² = 4σ²s/σ²P y el valor genético es el doble de la habilidad de transmisión.', 'In the sire model σ²s = ¼σ²a, so h² = 4σ²s/σ²P and the breeding value is twice the transmitting ability.') : '')
      + (B10.mat ? ' ' + T('El efecto materno se ajusta sin covarianza con el directo (σ<sub>am</sub> = 0); si esa covarianza existe, h² total = (σ²a + 1.5σ<sub>am</sub> + 0.5σ²m)/σ²P (Willham 1972) no es la que se muestra.', 'The maternal effect is fitted without covariance with the direct one (σ<sub>am</sub> = 0); if that covariance exists, total h² = (σ²a + 1.5σ<sub>am</sub> + 0.5σ²m)/σ²P (Willham 1972) is not the one shown.') : '');
    el('b10LrtBox').style.display = B10.lrt && B10.lrt.length ? '' : 'none';
    if (B10.lrt) table('b10Lrt', [
      { label: T('Efecto aleatorio', 'Random effect'), get: r => keepGreek(esc(compName(r.key))) },
      { label: T('Razón de verosimilitudes', 'Likelihood ratio'), num: true, get: r => fmtFixed(r.lr, 4) },
      { label: 'p', num: true, get: r => sig(r.p) },
    ], B10.lrt);
    /* fixed effects */
    el('b10Fixed').innerHTML = fit.lsm.map(L => `<h4>${esc(L.name)}</h4>` + (() => {
      let h = `<table><thead><tr><th>${T('Nivel', 'Level')}</th><th class="num">${T('Media MC', 'LS mean')}</th><th class="num">${T('EE', 'SE')}</th></tr></thead><tbody>`;
      L.means.forEach(m => { if (m) h += `<tr><td>${esc(m.level)}</td><td class="num">${f4(m.mean)}</td><td class="num">${m.estimable === false ? '—' : f4(m.se)}</td></tr>`; });
      return h + '</tbody></table>';
    })()).join('') || `<p class="hint">${T('Solo la media general.', 'The grand mean only.')}</p>`;
    /* breeding values */
    const trendCol = B10.trendBy;
    const valOf = new Map();
    if (trendCol !== '__gen') { const j = src.header.indexOf(trendCol), ja = colOf(src, 'animal'); if (j >= 0) src.rows.forEach(r => { const a = String(r[ja]).trim(); if (!valOf.has(a)) valOf.set(a, String(r[j])); }); }
    const mat = fit.mat ? new Map(fit.mat.map(m => [m.id, m])) : null, pe = fit.pe ? new Map(fit.pe.map(p => [p.id, p])) : null;
    let rows = fit.ebv.slice();
    const sorters = { ebvDesc: (a, b) => b.ebv - a.ebv, ebvAsc: (a, b) => a.ebv - b.ebv, rel: (a, b) => b.rel - a.rel, id: (a, b) => LM.natCmp(a.id, b.id) };
    rows.sort(sorters[B10.sortBy] || sorters.ebvDesc);
    const byEbv = fit.ebv.slice().sort((a, b) => b.ebv - a.ebv);
    const rank = new Map(byEbv.map((e, i) => [e.id, i + 1]));
    /* own means with the decimals of the records (two more when some individual has several) */
    const decOf = x => { const s = String(+(+x).toFixed(6)), k = s.indexOf('.'); return k < 0 ? 0 : s.length - k - 1; };
    const ownDec = Math.min(4, Math.max(0, ...fit.ebv.filter(r => r.nrec === 1).map(r => decOf(r.own))) + (fit.ebv.some(r => r.nrec > 1) ? 2 : 0));
    const cols = [
      { label: T('Lugar', 'Rank'), num: true, get: r => rank.get(r.id) },
      { label: T('Individuo', 'Individual'), get: r => esc(r.id) },
      { label: T('Padre', 'Sire'), get: r => esc(r.sire) },
      { label: T('Madre', 'Dam'), get: r => esc(r.dam) },
      { label: 'F', num: true, get: r => fmtFixed(r.F, 4) },
      { label: fit.model === 'sire' ? T('Registros de la progenie', 'Progeny records') : T('Registros', 'Records'), num: true, get: r => r.nrec },
      { label: fit.model === 'sire' ? T('Media de la progenie', 'Progeny mean') : T('Media propia', 'Own mean'), num: true, get: r => (r.nrec ? fmtFixed(r.own, ownDec) : '') },
      { label: fit.model === 'sire' ? T('VG (2 × HT)', 'EBV (2 × TA)') : T('Valor genético', 'Breeding value'), num: true, get: r => `<b>${f4(r.ebv)}</b>` },
      { label: T('EEP', 'SEP'), num: true, get: r => f4(r.sep) },
      { label: T('Confiabilidad r²', 'Reliability r²'), num: true, get: r => fmtFixed(r.rel, 3) },
      { label: T('Exactitud r', 'Accuracy r'), num: true, get: r => fmtFixed(r.acc, 3) },
    ];
    if (mat) cols.push({ label: T('Valor materno', 'Maternal value'), num: true, get: r => (mat.has(r.id) ? f4(mat.get(r.id).u) : '') });
    if (pe) cols.push({ label: T('Ambiente permanente', 'Permanent environment'), num: true, get: r => (pe.has(r.id) ? f4(pe.get(r.id).u) : '') });
    const lim = B10.topN === 'all' ? null : +B10.topN;
    table('b10Ebv', cols, rows, lim);
    el('b10EbvNote').innerHTML = T(
      `Valor genético estimado (BLUP) de todos los individuos del pedigrí, con o sin registros. EEP = √PEV; confiabilidad r² = 1 − PEV/[(1 + F)σ²a] (se incluye 1 + F: la fórmula de varios textos, 1 − PEV/σ²a, la sobrestima en individuos consanguíneos); exactitud r = √r². Los valores son desviaciones respecto de la base genética del pedigrí (fundadores con media esperada 0).`,
      `Estimated breeding value (BLUP) of every individual of the pedigree, with or without records. SEP = √PEV; reliability r² = 1 − PEV/[(1 + F)σ²a] (1 + F is included: the formula of several textbooks, 1 − PEV/σ²a, overstates it in inbred individuals); accuracy r = √r². Values are deviations from the genetic base of the pedigree (founders with expected mean 0).`);
    /* trend */
    let trend;
    if (trendCol === '__gen') trend = fit.trendGen;
    else {
      const m = new Map();
      fit.ebv.forEach(e => { const g = valOf.get(e.id); if (g == null) return; if (!m.has(g)) m.set(g, []); m.get(g).push(e.ebv); });
      trend = [...m.entries()].map(([g, v]) => ({ g, n: v.length, mean: v.reduce((s, x) => s + x, 0) / v.length })).sort((a, b) => LM.natCmp(a.g, b.g));
    }
    const trait = src.header[colsOf(src, 'trait')[B10.trait]];
    mountFig('b10FigEbv', {
      title: () => T('Valores genéticos', 'Breeding values'), fileName: 'breeding_values',
      render: c => P10.ebv(c, fit.ebv, { label: T(`valor genético · ${trait}`, `breeding value · ${trait}`) }),
      controls: () => [P2.titleControl(), { key: 'show', label: T('Mostrar', 'Show'), type: 'select', options: [['rank', T('los mejores con ± EEP', 'the best with ± SEP')], ['scatter', T('valor contra exactitud', 'value against accuracy')]] }, { key: 'topN', label: T('Cuántos', 'How many'), type: 'number', min: 5, max: 60, step: 1 }, P2.paletteControl()],
    }, { width: 880, height: 520, show: 'rank', topN: 25 });
    el('b10TrendBox').style.display = trend && trend.length > 1 ? '' : 'none';
    if (trend && trend.length > 1) mountFig('b10FigTrend', {
      title: () => T('Tendencia genética', 'Genetic trend'), fileName: 'genetic_trend',
      render: c => P10.trend(c, trend, { label: T('valor genético medio', 'mean breeding value'), xlab: trendCol === '__gen' ? T('generación del pedigrí', 'pedigree generation') : trendCol }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 760, height: 420 });
    el('b10TrendBy').innerHTML = `<option value="__gen">${T('generación del pedigrí', 'pedigree generation')}</option>` + src.header.filter((h, j) => ['fixed', 'year', 'random'].includes(src.roles[j])).map(h => `<option value="${esc(h)}">${esc(h)}</option>`).join('');
    el('b10TrendBy').value = trendCol;
    if (src.truth && src.truth.a && fit.model === 'animal') {
      const pairs = fit.ebv.filter(e => src.truth.a[e.id] != null);
      const r = S.pearson(pairs.map(e => e.ebv), pairs.map(e => src.truth.a[e.id]));
      el('b10TruthNote').innerHTML = T(`Datos simulados: la correlación entre el valor genético estimado y el verdadero es ${fmtFixed(r, 3)} (${pairs.length} individuos); los valores verdaderos son σ²a = ${src.truth.sigma2a} y σ²e = ${src.truth.sigma2e}.`, `Simulated data: the correlation between estimated and true breeding value is ${fmtFixed(r, 3)} (${pairs.length} individuals); the true values are σ²a = ${src.truth.sigma2a} and σ²e = ${src.truth.sigma2e}.`);
    } else el('b10TruthNote').innerHTML = '';
  }

  /* ================= 3 · genotypes of the Block 3 trial ================= */
  function trialStatus() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Para esta tarjeta cargue en el Bloque 3 un ensayo de genotipos.', en: 'For this card load a genotype trial in Block 3.' };
    if (D.mating.design === 'generations') return { ok: false, es: 'Los datos del Bloque 3 son de generaciones, no de genotipos.', en: 'The Block 3 data are generations, not genotypes.' };
    return { ok: true };
  }
  function renderTrialForm() {
    const st = trialStatus();
    el('b10TBox').style.display = st.ok ? '' : 'none';
    if (!st.ok) { msg('b10TMsg', [{ level: 'info', es: st.es, en: st.en }]); return; }
    const D = state.data;
    const notes = [];
    const pedOK = !!(B10.ped && B10.src);
    const entries = new Set(Data.entryTable(D.ds).map(e => e.name));
    const matched = pedOK ? B10.ped.ids.filter(id => entries.has(id)).length : 0;
    if (!pedOK) notes.push({ level: 'info', es: 'Sin pedigrí (tarjeta 1) los genotipos se tratan como no emparentados (K = I).', en: 'Without a pedigree (card 1) the genotypes are treated as unrelated (K = I).' });
    else if (!matched) notes.push({ level: 'warning', es: 'Ningún nombre del pedigrí coincide con las entradas del ensayo.', en: 'No name of the pedigree matches the entries of the trial.' });
    else notes.push({ level: 'info', es: `${matched} de ${entries.size} entradas del ensayo están en el pedigrí.`, en: `${matched} of ${entries.size} entries of the trial are in the pedigree.` });
    if (D.example === 'simLines' && !(B10.src && B10.src.id === 'simLinesPed')) notes.push({ level: 'info', es: 'El ejemplo cargado en el Bloque 3 trae su pedigrí: elíjalo arriba, «Simulado: pedigrí de líneas endogámicas».', en: 'The example loaded in Block 3 comes with its pedigree: choose it above, "Simulated: pedigree of inbred lines".' });
    msg('b10TMsg', notes);
    el('b10TTrait').innerHTML = D.ds.traits.map((t, j) => `<option value="${j}">${esc(t.name)}</option>`).join('');
    if (B10.tTrait >= D.ds.traits.length) B10.tTrait = 0;
    el('b10TTrait').value = String(B10.tTrait);
    const gOpt = el('b10TGen');
    [...gOpt.options].forEach(o => { o.disabled = o.value !== 'I' && !(pedOK && matched); });
    if (!(pedOK && matched)) B10.tGen = 'I';
    gOpt.value = B10.tGen;
  }
  async function runTrial() {
    const D = state.data;
    msg('b10TRunMsg', [{ level: 'info', es: 'Calculando…', en: 'Computing…' }]);
    el('b10TRun').disabled = true;
    await yieldUI();
    try {
      const pedRows = B10.ped ? pedRowsOf(B10.src) : null;
      const res = AM.trial(D.ds, D.field, D.ds.traits[B10.tTrait], { excluded: D.excluded, genetic: B10.tGen, pedRows });
      if (res.error) { msg('b10TRunMsg', (res.issues || []).concat([{ level: 'error', es: res.error, en: res.error }])); return; }
      B10.tRes = res;
      const notes = res.issues.slice();
      if (!res.res.converged) notes.push({ level: 'warning', es: 'REML no convergió; los valores son los de la última iteración.', en: 'REML did not converge; the values are those of the last iteration.' });
      msg('b10TRunMsg', notes);
      renderTrialResults();
    } finally { el('b10TRun').disabled = false; }
  }
  function renderTrialResults() {
    const R = B10.tRes, host = el('b10TResults');
    if (!R) { host.style.display = 'none'; return; }
    host.style.display = '';
    const cName = k => ({ add: T('genético aditivo σ²a (con A)', 'additive genetic σ²a (with A)'), gen: R.model === 'AI' ? T('genético no aditivo σ²i', 'non-additive genetic σ²i') : T('genotípico σ²G', 'genotypic σ²G'), ge: T('genotipo × ambiente σ²GA', 'genotype × environment σ²GE'), block: T('bloques incompletos', 'incomplete blocks'), e: T('residual σ²e', 'residual σ²e') }[k] || k);
    const items = [['Entradas', 'Entries', R.nEntries], ['Parcelas', 'Plots', R.n], ['H² de Cullis', 'Cullis H²', fmtFixed(R.H2cullis, 3)], ['σ²G entre entradas', 'σ²G among entries', fmtNum(R.sigmaG, 4)]];
    if (R.altLogLik != null) {
      const d = 2 * (R.logLik - R.altLogLik);
      if (R.model === 'AI') items.push(['Prueba de A', 'Test of A', `χ² = ${fmtNum(Math.max(0, d), 3)}`, T(`${pEq(0.5 * (1 - S.pchisq(Math.max(0, d), 1)))}`, `${pEq(0.5 * (1 - S.pchisq(Math.max(0, d), 1)))}`)]);
      else items.push(['log L: A contra I', 'log L: A against I', fmtNum(d / 2, 3), T('mayor = A ajusta mejor', 'larger = A fits better')]);
    }
    tiles('b10TTiles', items);
    table('b10TComp', [
      { label: T('Componente', 'Component'), get: r => keepGreek(esc(cName(r.key))) },
      { label: T('Varianza', 'Variance'), num: true, get: r => (r.boundary ? '0 <span class="hint">(' + T('límite', 'boundary') + ')</span>' : fmtNum(r.sigma2, 5)) },
      { label: T('EE', 'SE'), num: true, get: r => (r.boundary ? '' : fmtFixed(r.se, 4)) },
    ], R.comp);
    const rows = R.rows.slice().sort((a, b) => b.pred - a.pred);
    rows.forEach((r, i) => { r.rank = i + 1; });
    const cols = [
      { label: T('Lugar', 'Rank'), num: true, get: r => r.rank },
      { label: T('Entrada', 'Entry'), get: r => esc(r.entry) },
    ];
    if (R.ped) cols.push({ label: T('Progenitores', 'Parents'), get: r => (r.sire || r.dam ? esc(r.sire + ' × ' + r.dam) : '') }, { label: 'F', num: true, get: r => fmtFixed(r.F, 4) });
    cols.push({ label: T('Parcelas', 'Plots'), num: true, get: r => r.n }, { label: T('Media observada', 'Observed mean'), num: true, get: r => f4(r.raw) });
    if (R.model !== 'I') cols.push({ label: T('Aditivo', 'Additive'), num: true, get: r => f4(r.a) });
    if (R.model === 'AI') cols.push({ label: T('No aditivo', 'Non-additive'), num: true, get: r => f4(r.i) });
    cols.push({ label: T('Valor predicho', 'Predicted value'), num: true, get: r => `<b>${f4(r.pred)}</b>` }, { label: T('EEP', 'SEP'), num: true, get: r => f4(r.sep) }, { label: T('Confiabilidad', 'Reliability'), num: true, get: r => fmtFixed(r.rel, 3) });
    table('b10TTable', cols, rows);
    el('b10TNote').innerHTML = T(
      `Modelo: ${R.multi ? 'ambientes y repeticiones dentro de ambientes fijos, genotipo × ambiente aleatorio' : 'repeticiones fijas'}${R.model === 'I' ? ', genotipos aleatorios independientes' : R.model === 'A' ? ', genotipos aleatorios con el parentesco A del pedigrí' : ', genotipos con una parte aditiva (A) y otra no aditiva (I), como en Oakey y col. (2006)'}. Valor predicho = media de los efectos fijos (${fmtNum(R.fixedMean, 4)}) + BLUP genotípico. H² generalizada de Cullis, Smith y Coombes (2006) = 1 − v̄/(2σ²G) con v̄ = ${fmtNum(R.vbar, 5)}, la PEV media de una diferencia${R.ped ? `; σ²G = (1 + F̄)σ²a${R.model === 'AI' ? ' + σ²i' : ''} con F̄ = ${fmtFixed(R.Fbar, 4)}` : ''}.${R.model === 'AI' ? ' Separar la parte aditiva de la no aditiva en un solo ensayo exige muchas familias con parentescos variados; con pocas familias las dos se confunden y conviene mirar también el modelo solo aditivo.' : ''}`,
      `Model: ${R.multi ? 'environments and replicates within environments fixed, genotype × environment random' : 'replicates fixed'}${R.model === 'I' ? ', genotypes random and independent' : R.model === 'A' ? ', genotypes random with the relationships A of the pedigree' : ', genotypes with an additive (A) and a non-additive (I) part, as in Oakey et al. (2006)'}. Predicted value = mean of the fixed effects (${fmtNum(R.fixedMean, 4)}) + genotypic BLUP. Generalized H² of Cullis, Smith & Coombes (2006) = 1 − v̄/(2σ²G) with v̄ = ${fmtNum(R.vbar, 5)}, the mean PEV of a difference${R.ped ? `; σ²G = (1 + F̄)σ²a${R.model === 'AI' ? ' + σ²i' : ''} with F̄ = ${fmtFixed(R.Fbar, 4)}` : ''}.${R.model === 'AI' ? ' Separating the additive from the non-additive part in a single trial needs many families with varied relationships; with few families the two are confounded and the additive-only model is worth a look too.' : ''}`);
    const D = state.data;
    if (D && D.truth && D.truth.a) {
      const tv = e => (D.truth.a[e] || 0) + (D.truth.nonAdd ? D.truth.nonAdd[e] || 0 : 0);
      const rB = S.pearson(R.rows.map(r => r.g), R.rows.map(r => tv(r.entry)));
      const rM = S.pearson(R.rows.map(r => r.raw), R.rows.map(r => tv(r.entry)));
      el('b10TTruth').innerHTML = T(`Datos simulados: correlación con el valor genotípico verdadero ${fmtFixed(rB, 3)} del BLUP y ${fmtFixed(rM, 3)} de la media observada.`, `Simulated data: correlation with the true genotypic value ${fmtFixed(rB, 3)} for the BLUP and ${fmtFixed(rM, 3)} for the observed mean.`);
    } else el('b10TTruth').innerHTML = '';
    mountFig('b10FigShrink', {
      title: () => T('Media observada y BLUP', 'Observed mean and BLUP'), fileName: 'blup_shrinkage',
      render: c => P10.shrink(c, R.rows, { mean: R.fixedMean }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 760, height: 560 });
  }

  /* ================= 4 · crossbreeding ================= */
  const simCross = kind => XB.simulate(kind);
  const XEX = {
    vdw: () => ({ mode: 'estimate', breeds: '1, 2', groups: '1, , 294\n1×2, , 309\n2×1, , 304\n2, , 279', opts: { maternal: true, hM: false, rI: false, pairs: false }, pred: '1\n2\n1×2\n2×1\n1×(1×2)', cite: T('van der Werf J. Crossbreeding (notas de clase GENE251/351, lección 20). University of New England: dialelo de dos razas, peso al año.', 'van der Werf J. Crossbreeding (GENE251/351 lecture notes, lecture 20). University of New England: two-breed diallel, yearling weight.') }),
    sim3: () => Object.assign({ mode: 'estimate', opts: { maternal: true, hM: true, rI: true, pairs: false }, pred: 'A\nB\nC\nA×B\nC×(A×B)\nA×(B×C)\nrot(A,B)\nrot(A,B,C)\ncomp(A,B,C)', cite: T('Simulado con semilla fija: μ = 100; g<sup>I</sup> = 6, −2, −4; g<sup>M</sup> = −3, 2, 1; h<sup>I</sup> = 8; h<sup>M</sup> = 5; r<sup>I</sup> = −4; 30 individuos por grupo, DE 10.', 'Simulated with a fixed seed: μ = 100; g<sup>I</sup> = 6, −2, −4; g<sup>M</sup> = −3, 2, 1; h<sup>I</sup> = 8; h<sup>M</sup> = 5; r<sup>I</sup> = −4; 30 individuals per group, SD 10.') }, simCross('sim3')),
    dial4: () => Object.assign({ mode: 'estimate', opts: { maternal: true, hM: false, rI: false, pairs: true }, pred: 'A×B\nA×C\nC×D\nrot(A,C)\ncomp(A,B,C,D)', cite: T('Dialelo de cuatro razas simulado (razas puras y las 12 F₁ recíprocas): heterosis propia de cada par 4, 6, 2, 3, 5 y 4.', 'Simulated four-breed diallel (purebreds and the 12 reciprocal F₁): heterosis of every pair 4, 6, 2, 3, 5 and 4.') }, simCross('dial4')),
    tesema: () => ({ mode: 'given', breeds: 'B, CH', params: 'mu, 14.3\ngI:B, -3.18\nhI, -0.04\nrI, -6.20', pred: 'CH\nB×CH\nB×(B×CH)\n(B×CH)×CH\n(B×CH)×(B×CH)', cite: T('Tesema Z et al. (2023). PLOS ONE 18: e0291996 (cabras Boer × Central Highland; peso al destete de la camada, cuadros 3 y 4). CC BY 4.0.', 'Tesema Z et al. (2023). PLOS ONE 18: e0291996 (Boer × Central Highland goats; litter weaning weight, Tables 3 and 4). CC BY 4.0.') }),
    buchanan: () => ({ mode: 'percent', breeds: 'A, B, C', means: 'A, 460\nB, 480\nC, 500', HI: 4.7, HM: 4.2, R: 0, pred: 'A×B\nC×(A×B)\nrot(A,B)\nrot(A,B,C)', cite: T('Buchanan DS, Northcutt SL. Genetic principles of crossbreeding. Beef Cattle Handbook BCH-1400 (ejemplo 2: heterosis individual 4.7 % y materna 4.2 %).', 'Buchanan DS, Northcutt SL. Genetic principles of crossbreeding. Beef Cattle Handbook BCH-1400 (example 2: individual heterosis 4.7 % and maternal 4.2 %).') }),
  };
  function loadCrossExample(id) {
    const e = XEX[id]();
    B10.x.mode = e.mode;
    el('b10XMode').value = e.mode;
    el('b10XBreeds').value = e.breeds || '';
    if (e.groups != null) el('b10XGroups').value = e.groups;
    if (e.params != null) el('b10XParams').value = e.params;
    if (e.means != null) el('b10XMeans').value = e.means;
    if (e.HI != null) el('b10XHI').value = e.HI;
    if (e.HM != null) el('b10XHMp').value = e.HM;
    if (e.R != null) el('b10XR').value = e.R;
    el('b10XPredict').value = e.pred || '';
    if (e.opts) { el('b10XOptMat').checked = e.opts.maternal; el('b10XOptHM').checked = e.opts.hM; el('b10XOptRI').checked = e.opts.rI; el('b10XOptPairs').checked = e.opts.pairs; }
    B10.x.cite = e.cite; B10.x.truth = e.truth || null;
    showCrossMode();
    runCross();
  }
  function showCrossMode() {
    const m = el('b10XMode').value;
    B10.x.mode = m;
    el('b10XEst').style.display = m === 'estimate' ? '' : 'none';
    el('b10XGiven').style.display = m === 'given' ? '' : 'none';
    el('b10XPct').style.display = m === 'percent' ? '' : 'none';
  }
  const splitLines = txt => String(txt || '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const cells = l => l.split(/[,;\t]/).map(s => s.trim());
  function runCross() {
    const breeds = el('b10XBreeds').value.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const o = { recomb: el('b10XRecomb').value };
    const preds = splitLines(el('b10XPredict').value);
    const notes = [];
    B10.x.res = null; B10.x.preds = null; B10.x.pct = null;
    if (breeds.length < 2) { msg('b10XMsg', [{ level: 'error', es: 'Escriba al menos dos razas.', en: 'Type at least two breeds.' }]); renderCross(); return; }
    try {
      if (B10.x.mode === 'estimate') {
        const groups = splitLines(el('b10XGroups').value).map(l => { const c = cells(l); return { expr: c[0], n: parseFloat(c[1]), mean: parseFloat(c[2]), se: parseFloat(c[3]) }; }).filter(g => g.expr && isFinite(g.mean));
        Object.assign(o, { maternal: el('b10XOptMat').checked, hM: el('b10XOptHM').checked, rI: el('b10XOptRI').checked, pairs: el('b10XOptPairs').checked });
        const res = XB.estimate(groups, breeds, o);
        if (res.error) throw new Error(res.error);
        B10.x.res = res;
        B10.x.preds = preds.map(p => { try { return res.predict(p); } catch (e) { notes.push({ level: 'warning', es: e.message, en: e.message }); return null; } }).filter(Boolean);
        const ne = res.par.filter(p => !p.estimable);
        if (ne.length) notes.push({ level: 'warning', es: `No estimables con estos grupos: ${ne.map(p => T(p.es, p.en)).join(', ')}. Hacen falta más tipos de cruza (retrocruzas, F₂, cruzas de tres razas) para separarlos.`, en: `Not estimable with these groups: ${ne.map(p => T(p.es, p.en)).join(', ')}. More kinds of cross (backcrosses, F₂, three-breed crosses) are needed to separate them.` });
      } else if (B10.x.mode === 'given') {
        const params = {};
        splitLines(el('b10XParams').value).forEach(l => { const c = cells(l); if (c[0] && isFinite(parseFloat(c[1]))) params[c[0]] = parseFloat(c[1]); });
        B10.x.preds = XB.predictGiven(params, preds, breeds, o).map(p => Object.assign(p, { se: NaN }));
        B10.x.params = params;
      } else {
        const means = {};
        splitLines(el('b10XMeans').value).forEach(l => { const c = cells(l); if (c[0] && isFinite(parseFloat(c[1]))) means[c[0]] = parseFloat(c[1]); });
        const miss = breeds.filter(b => !(b in means));
        if (miss.length) notes.push({ level: 'warning', es: `Falta la media de raza pura de: ${miss.join(', ')}.`, en: `The purebred mean is missing for: ${miss.join(', ')}.` });
        B10.x.pct = XB.predictPercent({ means, HI: parseFloat(el('b10XHI').value) || 0, HM: parseFloat(el('b10XHMp').value) || 0, R: parseFloat(el('b10XR').value) || 0, recomb: o.recomb }, preds, breeds);
        B10.x.preds = B10.x.pct.map(p => ({ expr: p.expr, c: p.c, est: p.final, se: NaN }));
      }
    } catch (e) { notes.push({ level: 'error', es: e.message, en: e.message }); }
    if (B10.x.cite) notes.unshift({ level: 'info', es: B10.x.cite, en: B10.x.cite });
    msg('b10XMsg', notes);
    B10.x.breeds = breeds;
    renderCross();
  }
  function renderCross() {
    const X = B10.x, host = el('b10XResults');
    if (!X.preds) { host.style.display = 'none'; return; }
    host.style.display = '';
    const breeds = X.breeds;
    /* coefficients of the groups and predictions */
    const coefRows = (X.res ? X.res.rows.map(r => ({ name: r.expr, c: r.c, y: r.y, fitted: r.fitted, resid: r.resid })) : []).concat(X.preds.filter(p => !X.res || !X.res.rows.some(r => r.expr === p.expr)).map(p => ({ name: p.expr, c: p.c })));
    table('b10XCoef', [
      { label: T('Grupo o sistema', 'Group or system'), get: r => esc(r.name) },
      { label: T('Composición', 'Composition'), get: r => breeds.map((b, j) => (r.c.p[j] ? `${b} ${fmtNum(r.c.p[j], 3)}` : '')).filter(Boolean).join(' · ') },
      { label: T('Madre', 'Dam'), get: r => breeds.map((b, j) => (r.c.pd[j] ? `${b} ${fmtNum(r.c.pd[j], 3)}` : '')).filter(Boolean).join(' · ') },
      { label: 'h<sup>I</sup>', num: true, get: r => fmtNum(r.c.hI, 4) },
      { label: 'h<sup>M</sup>', num: true, get: r => fmtNum(r.c.hM, 4) },
      { label: 'r<sup>I</sup>', num: true, get: r => fmtNum(r.c.rI, 4) },
      { label: T('Observado', 'Observed'), num: true, get: r => (r.y != null ? f4(r.y) : '') },
      { label: T('Ajustado', 'Fitted'), num: true, get: r => (r.fitted != null ? f4(r.fitted) : '') },
    ], coefRows);
    el('b10XParBox').style.display = X.res ? '' : 'none';
    if (X.res) {
      const R = X.res;
      table('b10XPar', [
        { label: T('Parámetro', 'Parameter'), get: r => T(r.es, r.en) },
        { label: T('Estimación', 'Estimate'), num: true, get: r => (r.estimable ? `<b>${f4(r.est)}</b>` : `<span class="hint">${T('no estimable', 'not estimable')}</span>`) },
        { label: T('EE', 'SE'), num: true, get: r => (r.estimable ? f4(r.se) : '') },
        { label: R.withSE ? 'z' : 't', num: true, get: r => (r.estimable && r.kind ? fmtFixed(r.t, 2) : '') },
        { label: 'p', num: true, get: r => (r.estimable && r.kind ? sig(r.p) : '') },
        { label: T('Verdadero', 'True'), num: true, get: r => (X.truth ? truthOf(X.truth, r) : '') },
      ], R.par);
      el('b10XParNote').innerHTML = T(
        `Mínimos cuadrados ponderados sobre las medias de grupo ${{ se: 'con pesos 1/EE²', n: 'con pesos n', mixed: 'con pesos n (1 donde falta n)', equal: 'con pesos iguales' }[R.wKind]} y las restricciones Σg<sup>I</sup> = Σg<sup>M</sup> = 0 (los efectos de raza son desviaciones del promedio de las razas). ${R.df > 0 ? (R.withSE ? `Falta de ajuste: χ² = ${fmtNum(R.Q, 4)} con ${R.df} gl, ${pEq(R.pLof)}.` : `Varianza residual ${fmtNum(R.sigma2, 4)} con ${R.df} gl.`) : 'Tantos parámetros estimables como grupos: el ajuste es exacto y sin prueba de falta de ajuste.'} Pérdida por recombinación con la convención ${el('b10XRecomb').value === 'half' ? '(h<sub>padre</sub> + h<sub>madre</sub>)/2 (F₂ = 1)' : '(h<sub>padre</sub> + h<sub>madre</sub>)/4 (F₂ = ½)'}.`,
        `Weighted least squares on the group means ${{ se: 'with weights 1/SE²', n: 'with weights n', mixed: 'with weights n (1 where n is missing)', equal: 'with equal weights' }[R.wKind]} and the constraints Σg<sup>I</sup> = Σg<sup>M</sup> = 0 (breed effects are deviations from the average of the breeds). ${R.df > 0 ? (R.withSE ? `Lack of fit: χ² = ${fmtNum(R.Q, 4)} with ${R.df} df, ${pEq(R.pLof)}.` : `Residual variance ${fmtNum(R.sigma2, 4)} with ${R.df} df.`) : 'As many estimable parameters as groups: the fit is exact and has no lack-of-fit test.'} Recombination loss with the convention ${el('b10XRecomb').value === 'half' ? '(h<sub>sire</sub> + h<sub>dam</sub>)/2 (F₂ = 1)' : '(h<sub>sire</sub> + h<sub>dam</sub>)/4 (F₂ = ½)'}.`);
      el('b10XDialBox').style.display = R.diallel ? '' : 'none';
      if (R.diallel) {
        const D = R.diallel;
        const rows = [{ name: T('heterosis media ' + HBAR + '', 'average heterosis ' + HBAR + ''), v: D.mean }].concat(D.breed.map(b => ({ name: T(`heterosis de raza h<sub>${b.breed}</sub>`, `breed heterosis h<sub>${b.breed}</sub>`), v: b })), D.specific.map(s => ({ name: T(`heterosis específica s<sub>${s.pair}</sub>`, `specific heterosis s<sub>${s.pair}</sub>`), v: s })));
        table('b10XDial', [
          { label: T('Componente', 'Component'), get: r => r.name },
          { label: T('Estimación', 'Estimate'), num: true, get: r => (r.v.estimable ? f4(r.v.est) : T('no estimable', 'not estimable')) },
          { label: T('EE', 'SE'), num: true, get: r => (r.v.estimable ? f4(r.v.se) : '') },
        ], rows);
      }
    }
    table('b10XPred', [
      { label: T('Cruza o sistema', 'Cross or system'), get: r => esc(r.expr) },
      { label: T('Predicho', 'Predicted'), num: true, get: r => (isFinite(r.est) ? `<b>${f4(r.est)}</b>` : `<span class="hint">${T('no estimable', 'not estimable')}</span>`) },
      ...(X.preds.some(r => isFinite(r.se)) ? [{ label: T('EE', 'SE'), num: true, get: r => (isFinite(r.se) ? f4(r.se) : '') }] : []),
      { label: 'h<sup>I</sup>', num: true, get: r => fmtNum(r.c.hI, 4) },
      { label: 'h<sup>M</sup>', num: true, get: r => fmtNum(r.c.hM, 4) },
      { label: 'r<sup>I</sup>', num: true, get: r => fmtNum(r.c.rI, 4) },
    ].concat(X.pct ? [{ label: T('Promedio de razas', 'Breed average'), num: true, get: r => f4(X.pct.find(p => p.expr === r.expr).base) }, { label: T('Con heterosis individual', 'With individual heterosis'), num: true, get: r => f4(X.pct.find(p => p.expr === r.expr).afterI) }] : []), X.preds);
    el('b10XPredNote').innerHTML = X.mode === 'percent'
      ? T('Heterosis multiplicativa: promedio de razas × (1 + H<sub>I</sub>h<sup>I</sup>) × (1 + H<sub>M</sub>h<sup>M</sup>) × (1 − R·r<sup>I</sup>), con los porcentajes escritos arriba.', 'Multiplicative heterosis: breed average × (1 + H<sub>I</sub>h<sup>I</sup>) × (1 + H<sub>M</sub>h<sup>M</sup>) × (1 − R·r<sup>I</sup>), with the percentages typed above.')
      : T('rot(A,B) y rot(A,B,C) son rotaciones de dos y tres razas en equilibrio, promediadas sobre el ciclo (h<sup>I</sup> = h<sup>M</sup> = ⅔ y 6/7); comp(A,B,C) es una compuesta con partes iguales después de apareamiento al azar (h = 1 − Σp²); comp(A:0.5,B:0.25,C:0.25) acepta proporciones. Un predicho «no estimable» depende de un parámetro que estos grupos no separan.', 'rot(A,B) and rot(A,B,C) are two- and three-breed rotations at equilibrium, averaged over the cycle (h<sup>I</sup> = h<sup>M</sup> = ⅔ and 6/7); comp(A,B,C) is a composite with equal shares after random mating (h = 1 − Σp²); comp(A:0.5,B:0.25,C:0.25) takes proportions. A "not estimable" prediction depends on a parameter these groups do not separate.');
    mountFig('b10FigX', {
      title: () => T('Desempeño predicho', 'Predicted performance'), fileName: 'crossbreeding',
      render: c => P10.crosses(c, X.preds, { label: T('predicho', 'predicted') }),
      controls: () => [P2.titleControl(), { key: 'fromZero', label: T('Eje desde cero', 'Axis from zero'), type: 'checkbox' }, { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 820, height: 480, flip: true });
  }
  function truthOf(t, p) {
    if (p.key === 'mu') { const gi = Object.values(t.gI || {}), gm = Object.values(t.gM || {}); return fmtNum(t.mu + (gi.length ? gi.reduce((a, b) => a + b, 0) / gi.length : 0) + (gm.length ? gm.reduce((a, b) => a + b, 0) / gm.length : 0), 4); }
    if (p.kind === 'gI') { const v = Object.values(t.gI); return fmtNum(t.gI[p.breed] - v.reduce((a, b) => a + b, 0) / v.length, 4); }
    if (p.kind === 'gM') { const v = Object.values(t.gM); return fmtNum(t.gM[p.breed] - v.reduce((a, b) => a + b, 0) / v.length, 4); }
    if (p.kind === 'hPair' && t.pair) { const k = p.key.split(':')[1]; return fmtNum(t.pair[k], 4); }
    if (t[p.key] != null) return fmtNum(t[p.key], 4);
    return '';
  }

  /* ================= 5 · notes ================= */
  function renderNotes() {
    const host = el('b10Notes');
    if (!host) return;
    const notes = [
      { es: ['Pedigrí y parentesco', 'A por el método tabular (Henderson 1976); A⁻¹ directamente por las reglas de Henderson (1976) y Quaas (1976): a cada individuo con varianza de muestreo mendeliano b se le suman 1/b en su diagonal, −1/(2b) en las celdas con sus padres y 1/(4b) en las de los padres entre sí. La consanguinidad sale de los vectores de trayectoria A = LDL′ (Meuwissen y Luo 1992). Con autofecundación, el padre puede ser la madre; una línea derivada por t generaciones de autofecundación hereda el parentesco de su F₁ y tiene F = 1 − (½)ᵗ(1 − f<sub>sd</sub>); un fundador puede declararse consanguíneo (F₀ = 1 para una línea pura).'],
        en: ['Pedigree and relationships', 'A by the tabular method (Henderson 1976); A⁻¹ directly by the rules of Henderson (1976) and Quaas (1976): an individual with Mendelian-sampling variance b adds 1/b to its diagonal, −1/(2b) to the cells with its parents and 1/(4b) to those of the parents with each other. Inbreeding comes from the path vectors A = LDL′ (Meuwissen & Luo 1992). With selfing the sire may be the dam; a line derived by t generations of selfing keeps the relationships of its F₁ and has F = 1 − (½)ᵗ(1 − f<sub>sd</sub>); a founder may be declared inbred (F₀ = 1 for a pure line).'] },
      { es: ['BLUP y REML', 'Ecuaciones del modelo mixto de Henderson (1975): [X′X X′Z; Z′X Z′Z + A⁻¹σ²e/σ²a][b̂; â] = [X′y; Z′y], resueltas de forma exacta (Cholesky denso); PEV = σ²e·C<sup>aa</sup>. Componentes por REML (Patterson y Thompson 1971) con iteraciones de información promedio (Gilmour, Thompson y Cullis 1995), pasos EM al inicio y límites en cero; la razón de verosimilitudes de un componente se compara con ½χ²₀ + ½χ²₁ (Self y Liang 1987). La comparación de verosimilitudes restringidas solo vale con los mismos efectos fijos.'],
        en: ['BLUP and REML', 'Henderson\'s (1975) mixed-model equations: [X′X X′Z; Z′X Z′Z + A⁻¹σ²e/σ²a][b̂; â] = [X′y; Z′y], solved exactly (dense Cholesky); PEV = σ²e·C<sup>aa</sup>. Components by REML (Patterson & Thompson 1971) with average-information iterations (Gilmour, Thompson & Cullis 1995), EM steps to start and bounds at zero; the likelihood ratio of a component is compared with ½χ²₀ + ½χ²₁ (Self & Liang 1987). Restricted likelihoods are comparable only with the same fixed effects.'] },
      { es: ['Modelos', 'Modelo animal: todos los individuos del pedigrí tienen valor genético. Modelo de padres: el efecto es la habilidad de transmisión de los padres (½ del valor genético) con el parentesco de los padres y sus ancestros; σ²s = ¼σ²a. Repetibilidad: ambiente permanente del individuo, t = (σ²a + σ²ep)/σ²P. Efecto genético materno con A y sin covarianza con el directo (Willham 1963); camada o grupo contemporáneo como factores aleatorios independientes.'],
        en: ['Models', 'Animal model: every individual of the pedigree gets a breeding value. Sire model: the effect is the transmitting ability of the sires (½ of the breeding value) with the relationships of the sires and their ancestors; σ²s = ¼σ²a. Repeatability: permanent environment of the individual, t = (σ²a + σ²pe)/σ²P. Maternal genetic effect with A and without covariance with the direct one (Willham 1963); litter or contemporary group as independent random factors.'] },
      { es: ['Cruzamiento', 'Modelo de Dickerson (1969, 1973): media de un grupo = μ + Σ p<sub>k</sub>g<sup>I</sup><sub>k</sub> + Σ p<sub>madre,k</sub>g<sup>M</sup><sub>k</sub> + h<sup>I</sup>H<sup>I</sup> + h<sup>M</sup>H<sup>M</sup> + r<sup>I</sup>R<sup>I</sup>. Coeficientes: h<sup>I</sup> = 1 − Σ p<sub>padre,k</sub>p<sub>madre,k</sub>, h<sup>M</sup> = h<sup>I</sup> de la madre, r<sup>I</sup> = (h<sub>padre</sub> + h<sub>madre</sub>)/4 (Kinghorn 1980; la opción «/2» es la de Dickerson 1973 y solo cambia la escala del parámetro). Con heterosis por par de razas, un dialelo de razas se descompone en heterosis media, de raza y específica (Eisen y col. 1983).'],
        en: ['Crossbreeding', 'Dickerson\'s (1969, 1973) model: mean of a group = μ + Σ p<sub>k</sub>g<sup>I</sup><sub>k</sub> + Σ p<sub>dam,k</sub>g<sup>M</sup><sub>k</sub> + h<sup>I</sup>H<sup>I</sup> + h<sup>M</sup>H<sup>M</sup> + r<sup>I</sup>R<sup>I</sup>. Coefficients: h<sup>I</sup> = 1 − Σ p<sub>sire,k</sub>p<sub>dam,k</sub>, h<sup>M</sup> = h<sup>I</sup> of the dam, r<sup>I</sup> = (h<sub>sire</sub> + h<sub>dam</sub>)/4 (Kinghorn 1980; the "/2" option is Dickerson\'s 1973 and only changes the scale of the parameter). With heterosis per pair of breeds, a breed diallel is split into average, breed and specific heterosis (Eisen et al. 1983).'] },
    ];
    const cites = [
      'Willham RL (1963). The covariance between relatives for characters composed of components contributed by related individuals. Biometrics 19: 18–27.',
      'Dickerson GE (1969). Experimental approaches in utilising breed resources. Animal Breeding Abstracts 37: 191–202.',
      'Patterson HD, Thompson R (1971). Recovery of inter-block information when block sizes are unequal. Biometrika 58: 545–554.',
      'Dickerson GE (1973). Inbreeding and heterosis in animals. In: Proceedings of the Animal Breeding and Genetics Symposium in Honor of Dr. J. L. Lush. ASAS and ADSA, Champaign, pp. 54–77.',
      'Henderson CR (1975). Best linear unbiased estimation and prediction under a selection model. Biometrics 31: 423–447.',
      'Henderson CR (1976). A simple method for computing the inverse of a numerator relationship matrix used in prediction of breeding values. Biometrics 32: 69–83.',
      'Quaas RL (1976). Computing the diagonal elements and inverse of a large numerator relationship matrix. Biometrics 32: 949–953.',
      'Kinghorn B (1980). The expression of "recombination loss" in quantitative traits. Zeitschrift für Tierzüchtung und Züchtungsbiologie 97: 138–143.',
      'Eisen EJ, Hörstgen-Schwark G, Saxton AM, Bandy TR (1983). Genetic interpretation and analysis of diallel crosses with animals. Theoretical and Applied Genetics 65: 17–23.',
      'Self SG, Liang KY (1987). Asymptotic properties of maximum likelihood estimators and likelihood ratio tests under nonstandard conditions. Journal of the American Statistical Association 82: 605–610.',
      'Meuwissen THE, Luo Z (1992). Computing inbreeding coefficients in large populations. Genetics Selection Evolution 24: 305–313.',
      'Gilmour AR, Thompson R, Cullis BR (1995). Average information REML: an efficient algorithm for variance parameter estimation in linear mixed models. Biometrics 51: 1440–1450.',
      'Oakey H, Verbyla A, Pitchford W, Cullis B, Kuchel H (2006). Joint modeling of additive and non-additive genetic line effects in single field trials. Theoretical and Applied Genetics 113: 809–819.',
      'Cullis BR, Smith AB, Coombes NE (2006). On the design of early generation variety trials with correlated data. Journal of Agricultural, Biological and Environmental Statistics 11: 381–393.',
      'Mrode RA (2014). Linear Models for the Prediction of Animal Breeding Values, 3rd ed. CABI, Wallingford.',
      'Schaeffer LR (2019). Animal Models. University of Guelph, Guelph.',
    ];
    host.innerHTML = notes.map(n => `<div class="method-note"><h4>${T(n.es[0], n.en[0])}</h4><p>${T(n.es[1], n.en[1])}</p></div>`).join('')
      + `<div class="method-note"><h4>${T('Referencias', 'References')}</h4><ul class="ref-list">${cites.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  /* ================= downloads ================= */
  function downloadXlsx() {
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 28));
    if (B10.ped) { const p = B10.ped; add(T('Pedigrí', 'Pedigree'), [['id', 'sire', 'dam', 'generation', 'selfings', 'F', 'b']].concat(p.ids.map((id, k) => [id, p.sire[k] >= 0 ? p.ids[p.sire[k]] : '', p.dam[k] >= 0 ? p.ids[p.dam[k]] : '', p.generation[k], p.t[k], p.F[k], p.b[k]]))); }
    if (B10.fit) {
      const f = B10.fit;
      add(T('Componentes', 'Components'), [['component', 'variance', 'SE']].concat(f.comp.map(c => [c.key, c.sigma2, c.se])).concat([[], ['h2', f.h2 ? f.h2.v : '', f.h2 ? f.h2.se : '']]));
      add(T('Valores genéticos', 'Breeding values'), [['id', 'sire', 'dam', 'F', f.model === 'sire' ? 'progeny records' : 'records', f.model === 'sire' ? 'progeny mean' : 'own mean', 'EBV', 'SEP', 'reliability', 'accuracy']].concat(f.ebv.map(e => [e.id, e.sire, e.dam, e.F, e.nrec, e.nrec ? e.own : '', e.ebv, e.sep, e.rel, e.acc])));
      f.lsm.forEach(L => add(T('Fijo ', 'Fixed ') + L.name, [['level', 'LS mean', 'SE']].concat(L.means.filter(Boolean).map(m => [m.level, m.mean, m.se]))));
    }
    if (B10.tRes) add(T('Ensayo BLUP', 'Trial BLUP'), [['entry', 'sire', 'dam', 'F', 'plots', 'observed mean', 'additive', 'non-additive', 'predicted', 'SEP', 'reliability']].concat(B10.tRes.rows.map(r => [r.entry, r.sire, r.dam, r.F, r.n, r.raw, r.a, r.i, r.pred, r.sep, r.rel])));
    if (B10.x.res) add(T('Dickerson', 'Dickerson'), [['parameter', 'estimate', 'SE', 'estimable']].concat(B10.x.res.par.map(p => [p.key, p.est, p.se, p.estimable ? 1 : 0])));
    if (B10.x.res && B10.x.res.diallel) {
      const D = B10.x.res.diallel, v = x => (x.estimable ? [x.est, x.se] : ['not estimable', '']);
      add(T('Dialelo de razas', 'Breed diallel'), [['component', 'estimate', 'SE'], ['average heterosis'].concat(v(D.mean))].concat(D.breed.map(b => ['breed heterosis ' + b.breed].concat(v(b))), D.specific.map(s => ['specific heterosis ' + s.pair].concat(v(s)))));
    }
    if (B10.x.preds) add(T('Predicciones', 'Predictions'), [['cross or system', 'predicted', 'SE', 'hI', 'hM', 'rI']].concat(B10.x.preds.map(p => [p.expr, p.est, p.se, p.c.hI, p.c.hM, p.c.rI])));
    if (wb.SheetNames.length === 0) return;
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('blup_y_cruzamiento', 'blup_and_crossbreeding')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderAll() {
    renderSourcePicker();
    renderRoles();
    renderPedigree();
    renderModelForm();
    renderResults();
    renderTrialForm();
    renderTrialResults();
    showCrossMode();
    renderCross();
    /* back to G×E when the Block 3 data have several environments, to Selection otherwise */
    const D = state.data, back = D && D.field && D.field.multiEnv && D.field.envs.length > 1 ? 9 : 8;
    el('b10Back').dataset.step = back;
    el('b10BackLabel').innerHTML = T(`← ${STEPS[back - 1].es}`, `← ${STEPS[back - 1].en}`);
    const s = STEPS[10];
    el('b10Next').disabled = !s.ready;
    el('b10NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque 11, en construcción)`, `Next: ${s.en} (Block 11, under construction)`);
  }
  async function readInto(file, target) {
    const got = await Data.readFile(file);
    const rows = got.kind === 'workbook' ? Data.sheetRows(got.workbook, got.sheets[0]) : Data.parseDelimited(got.text);
    if (target === 'rec') { B10.pedExtra = null; loadSource(srcFromRows(rows, file.name, { id: 'file' })); }
    else {
      const tab = Data.table(rows);
      const roles = tab.header.map((h, j) => guessRole(h, tab.rows.map(r => r[j])));
      const ja = roles.indexOf('animal'), js = roles.indexOf('sire'), jd = roles.indexOf('dam'), jt = roles.indexOf('t'), jf = roles.indexOf('F0');
      if (ja < 0) { msg('b10DataMsg', [{ level: 'error', es: 'El archivo de pedigrí necesita columnas de individuo, padre y madre.', en: 'The pedigree file needs individual, sire and dam columns.' }]); return; }
      B10.pedExtra = tab.rows.map(r => ({ id: r[ja], sire: js >= 0 ? r[js] : null, dam: jd >= 0 ? r[jd] : null, t: jt >= 0 ? +r[jt] || 0 : 0, F0: jf >= 0 ? +r[jf] || 0 : 0 }));
      buildPedigree(); renderAll();
    }
  }

  function init() {
    if (!el('b10Data')) return;
    renderNotes();
    el('b10FileRec').addEventListener('change', e => { const f = e.target.files[0]; if (f) readInto(f, 'rec').catch(err => msg('b10DataMsg', [{ level: 'error', es: String(err.message || err), en: String(err.message || err) }])); e.target.value = ''; });
    el('b10FilePed').addEventListener('change', e => { const f = e.target.files[0]; if (f) readInto(f, 'ped').catch(err => msg('b10DataMsg', [{ level: 'error', es: String(err.message || err), en: String(err.message || err) }])); e.target.value = ''; });
    el('b10Selfing').addEventListener('change', () => { B10.selfing = el('b10Selfing').checked; buildPedigree(); renderAll(); });
    el('b10Trait').addEventListener('change', () => { B10.trait = +el('b10Trait').value; B10.fit = null; renderResults(); });
    el('b10ModelKind').addEventListener('change', () => { B10.model = el('b10ModelKind').value; B10.fit = null; renderModelForm(); renderResults(); });
    el('b10PE').addEventListener('change', () => { B10.pe = el('b10PE').checked; B10.fit = null; renderModelForm(); renderResults(); });
    el('b10Mat').addEventListener('change', () => { B10.mat = el('b10Mat').checked; B10.fit = null; renderModelForm(); renderResults(); });
    el('b10VarMode').addEventListener('change', () => { B10.varMode = el('b10VarMode').value; renderModelForm(); });
    el('b10Run').addEventListener('click', runModel);
    el('b10TopN').addEventListener('change', () => { B10.topN = el('b10TopN').value; renderResults(); });
    el('b10SortBy').addEventListener('change', () => { B10.sortBy = el('b10SortBy').value; renderResults(); });
    el('b10TrendBy').addEventListener('change', () => { B10.trendBy = el('b10TrendBy').value; delete Fig.registry.b10FigTrend; renderResults(); });
    el('b10TTrait').addEventListener('change', () => { B10.tTrait = +el('b10TTrait').value; });
    el('b10TGen').addEventListener('change', () => { B10.tGen = el('b10TGen').value; });
    el('b10TRun').addEventListener('click', runTrial);
    el('b10XMode').addEventListener('change', showCrossMode);
    el('b10XRun').addEventListener('click', () => { B10.x.user = true; runCross(); });
    el('b10XExRow').querySelectorAll('[data-xex]').forEach(b => b.addEventListener('click', () => { B10.x.user = true; loadCrossExample(b.dataset.xex); }));
    el('b10DlXlsx').addEventListener('click', downloadXlsx);
    el('b10Back').addEventListener('click', () => goStep(+el('b10Back').dataset.step || 9));
    el('b10Next').addEventListener('click', () => { if (STEPS[10].ready) goStep(11); });
    document.addEventListener('datachange', () => { B10.tRes = null; if (document.getElementById('panel-10').classList.contains('active')) { renderTrialForm(); renderTrialResults(); } });
    document.addEventListener('stepchange', e => { if (e.detail.step === 10 && !B10.built) { B10.built = true; if (!el('b10XGroups').value) { loadCrossExample('sim3'); B10.x.user = false; } renderAll(); } else if (e.detail.step === 10) { renderTrialForm(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B10.built) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
