/* BreedingPro — Block 5 interface: Hayman's partition, the Hayman–Jinks
   components with the Wr–Vr graph, Morley Jones's half diallel, Gardner &
   Eberhart's Analyses II and III with heterosis, and the equivalences with
   Griffing's methods, all on the diallel table that Block 3 adjusted. */

(function () {
  const B5 = { trait: 0, env: null, table: 'auto', error: 'pooled', corr: 'derived', goal: 'high', alpha: 0.05, res: null, cache: new Map(), built: false };
  window.B5 = B5;

  const f2 = x => fmtFixed(x, 2), f3 = x => fmtFixed(x, 3);
  const ITEMS = {
    a: { es: 'a · efectos aditivos', en: 'a · additive effects' },
    b: { es: 'b · dominancia (total)', en: 'b · dominance (total)' },
    b1: { es: 'b₁ · dominancia media (F₁ vs progenitores)', en: 'b₁ · mean dominance (F₁ vs parents)' },
    b2: { es: 'b₂ · dominancia que difiere entre arreglos', en: 'b₂ · dominance differing between arrays' },
    b3: { es: 'b₃ · dominancia específica', en: 'b₃ · specific dominance' },
    c: { es: 'c · efectos maternos', en: 'c · maternal effects' },
    d: { es: 'd · diferencias recíprocas restantes', en: 'd · remaining reciprocal differences' },
    genic: { es: 'Entre progenitores (efectos génicos, Walters y Gale 1977)', en: 'Among parents (genic effects, Walters & Gale 1977)' },
  };
  const msg = (host, list) => { clearMessages(host); (list || []).forEach(x => showMessage(host, x.level === 'error' ? 'error' : x.level === 'warning' ? 'warning' : 'info', T(x))); };
  const statTiles = (host, items) => {
    host = el(host); host.innerHTML = '';
    items.forEach(([es, en, value, sub, level]) => host.appendChild(mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') },
      `<div class="stat-label">${keepGreek(T(es, en))}</div><div class="stat-value${/^[-−+]?[0-9.,]+ ?%?$/.test(String(value).trim()) ? '' : ' txt'}">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}`)));
  };
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
  const verdict = (ok, es, en) => `<span class="pw ${ok === true ? 'ok' : ok === false ? 'low' : 'mid'}">${T(es, en)}</span>`;
  const pname = i => (B5.res ? B5.res.parents[i] : String(i));

  /* ================= data ================= */
  function status() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Cargue los datos en el Bloque 3.', en: 'Load the data in Block 3.' };
    if (D.mating.design !== 'griffing') return { ok: false, es: 'Estos análisis son para dialelos completos entre progenitores. Su diseño se analiza en otro bloque.', en: 'These analyses are for complete diallels between parents. Your design is analysed in another block.' };
    if (!D.ds.traits.length) return { ok: false, es: 'No hay variables respuesta.', en: 'There are no response traits.' };
    return { ok: true };
  }

  function buildCells() {
    const D = state.data;
    const parents = D.mating.parents, ix = new Map(parents.map((x, k) => [x, k]));
    const ent = new Map();
    D.ds.records.forEach(r => { const i = ix.get(r.female), j = ix.get(r.male); if (i == null || j == null) return; if (!ent.has(r.entry)) ent.set(r.entry, { i, j }); });
    const t = D.ds.traits[B5.trait];
    const envs = D.field.envs;
    const wanted = B5.env === '__mean' ? envs : envs.filter(e => e.key === B5.env);
    const perEnv = [], blocks = [];
    let cells = [];
    let mse = 0, dfe = 0, r = 0, designs = new Set();
    wanted.forEach(E => {
      const res = Trial.analyseEnv(D.ds, E, t, { heritability: false, excluded: D.excluded, externalError: D.external });
      if (res.error) return;
      const hasError = res.mse != null && res.dfe > 0;
      perEnv.push({ key: E.key, name: res.env, mse: Trial.meansError(res), mseField: hasError ? res.mse : res.mseMeans, dfe: res.dfe, r: hasError ? res.harmonicReps : 1, design: res.design });
      designs.add(res.design);
      res.means.forEach(m => { const v = ent.get(m.entry); if (v && isFinite(m.mean)) cells.push({ env: E.key, i: v.i, j: v.j, y: m.mean, w: hasError ? (m.n || 1) : 1 }); });
    });
    if (!perEnv.length) return null;
    /* one table: a single environment, or the mean over environments */
    const byCell = new Map();
    cells.forEach(c => {
      const k = c.i + '|' + c.j;
      const prev = byCell.get(k);
      if (!prev) byCell.set(k, { i: c.i, j: c.j, y: c.y, w: c.w });
      else { const w = prev.w + c.w; prev.y = (prev.y * prev.w + c.y * c.w) / w; prev.w = w; }
    });
    const flat = [...byCell.values()];
    const e = perEnv.length;
    mse = perEnv.reduce((s, x) => s + x.mse * x.dfe, 0) / perEnv.reduce((s, x) => s + x.dfe, 0);
    dfe = perEnv.reduce((s, x) => s + x.dfe, 0);
    r = flat.length / flat.reduce((s, c) => s + 1 / c.w, 0);
    /* per-block tables (only for complete-block designs of a single environment) */
    if (wanted.length === 1 && ['rcbd', 'crd'].includes(perEnv[0].design)) {
      const E = wanted[0], byRep = new Map();
      D.ds.records.forEach(rec => {
        if ((rec.env || '') !== E.key || D.excluded.has(rec.k)) return;
        const v = ent.get(rec.entry);
        if (!v) return;
        const y = t.y[rec.k];
        if (!isFinite(y)) return;
        const key = (E.blockAsRep ? rec.block : rec.rep) || '1';
        if (!byRep.has(key)) byRep.set(key, new Map());
        const m = byRep.get(key), ck = v.i + '|' + v.j;
        const prev = m.get(ck);
        if (!prev) m.set(ck, { i: v.i, j: v.j, y, w: 1 });
        else { prev.y = (prev.y * prev.w + y) / (prev.w + 1); prev.w++; }
      });
      byRep.forEach((m, key) => blocks.push({ key, cells: [...m.values()] }));
      blocks.sort((a, b) => LM.natCmp(a.key, b.key));
    }
    return { parents, cells: flat, perEnv, blocks, mse, dfe, r, e, design: [...designs][0] };
  }

  function analyse() {
    const key = [B5.trait, B5.env, B5.table, B5.error, B5.corr, B5.goal, B5.alpha].join('|');
    if (B5.cache.has(key)) return B5.cache.get(key);
    const b = buildCells();
    if (!b) return null;
    const res = HJ.analyse({
      cells: b.cells, parents: b.parents, mse: b.mse, dfe: b.dfe, r: b.r, blocks: b.blocks,
      alpha: B5.alpha, goal: B5.goal, error: B5.error,
      half: B5.table === 'auto' ? undefined : B5.table === 'half',
      classic: B5.corr === 'classic',
    });
    res.built = b;
    /* the same table analysed with Griffing's methods, for the equivalences */
    res.griffing = {};
    const gcells = b.cells.map(c => Object.assign({}, c, { env: '' }));
    const gopt = { parents: b.parents, envs: [{ key: '', name: '', mse: b.mse, dfe: b.dfe, r: b.r }], F: 1, alpha: B5.alpha };
    const methods = res.matrix.hasSelfs ? (res.matrix.hasRecip ? [1, 3] : []) : (res.matrix.hasRecip ? [3] : []);
    methods.forEach(m => {
      try {
        const sub = Griffing.subset(gcells, m, { reciprocals: 'direct' });
        res.griffing[m] = Griffing.analyse(Object.assign({}, gopt, { cells: sub, method: m }));
      } catch (err) { /* ignore */ }
    });
    /* Methods 2 and 4 on the same reciprocal-averaged half table that Gardner and
       Eberhart use, with equal weights, so every identity is on one scale */
    if (res.geCells) {
      const half = res.geCells.map(c => ({ env: '', i: c.i, j: c.j, y: c.y, w: 1 }));
      const hopt = { parents: b.parents, envs: [{ key: '', name: '', mse: res.E, dfe: b.dfe, r: 1 }], F: 1, alpha: B5.alpha };
      [2, 4].forEach(m => { try { res.griffing[m] = Griffing.analyse(Object.assign({}, hopt, { cells: half, method: m })); } catch (err) { /* ignore */ } });
    }
    B5.cache.set(key, res);
    return res;
  }

  /* ================= 1 · setup and assumptions ================= */
  function renderSetup() {
    const D = state.data, res = B5.res, b = res.built;
    el('b5Source').innerHTML = T(
      `Datos: <b>${esc(D.fileName || '')}</b> · ${res.p} progenitores · tabla ${res.half ? 'de medio dialelo' : 'completa'}${res.matrix.hasSelfs ? ' con progenitores' : ' sin progenitores'} · ${b.e > 1 && B5.env === '__mean' ? `media de ${b.e} ambientes` : (b.perEnv[0].name || '')} · E (varianza de una media de entrada) = ${fmtNum(res.E, 4)} con ${b.dfe} gl.`,
      `Data: <b>${esc(D.fileName || '')}</b> · ${res.p} parents · ${res.half ? 'half-diallel' : 'full'} table${res.matrix.hasSelfs ? ' with parents' : ' without parents'} · ${b.e > 1 && B5.env === '__mean' ? `mean of ${b.e} environments` : (b.perEnv[0].name || '')} · E (variance of an entry mean) = ${fmtNum(res.E, 4)} with ${b.dfe} df.`);
    el('b5CorrField').style.display = res.half ? '' : 'none';
    const tiles = [];
    const A = res.anova, items = A.items, df = A.df;
    const totalItems = A.rows.reduce((s, x) => s + x.ss, 0);
    tiles.push(['Aditivo (a)', 'Additive (a)', fmtNum(100 * items.a / totalItems, 0) + ' %', T(`SC ${fmtNum(items.a, 2)} · ${sig(A.rows[0].p).replace(/<[^>]+>/g, '')}`, `SS ${fmtNum(items.a, 2)} · ${sig(A.rows[0].p).replace(/<[^>]+>/g, '')}`)]);
    tiles.push(['Dominancia (b)', 'Dominance (b)', fmtNum(100 * items.b / totalItems, 0) + ' %', T(`b₁ ${fmtNum(100 * items.b1 / totalItems, 0)} % · b₂ ${fmtNum(100 * items.b2 / totalItems, 0)} % · b₃ ${fmtNum(100 * items.b3 / totalItems, 0)} %`, `b₁ ${fmtNum(100 * items.b1 / totalItems, 0)}% · b₂ ${fmtNum(100 * items.b2 / totalItems, 0)}% · b₃ ${fmtNum(100 * items.b3 / totalItems, 0)}%`)]);
    if (!res.half) tiles.push(['Recíprocos (c + d)', 'Reciprocal (c + d)', fmtNum(100 * (items.c + items.d) / totalItems, 0) + ' %', T(`c ${fmtNum(100 * items.c / totalItems, 0)} % · d ${fmtNum(100 * items.d / totalItems, 0)} %`, `c ${fmtNum(100 * items.c / totalItems, 0)}% · d ${fmtNum(100 * items.d / totalItems, 0)}%`)]);
    if (res.components) {
      const C = res.components, R = C.ratios;
      tiles.push(['Grado medio de dominancia', 'Average degree of dominance', f2(R.dominance), '√(H₁/D)', isFinite(R.dominance) ? (R.dominance > 1 ? 'warn' : 'ok') : '']);
      tiles.push(['Asimetría de frecuencias', 'Asymmetry of frequencies', fmtNum(R.asymmetry, 3), T('H₂/4H₁ · 0.25 = frecuencias iguales', 'H₂/4H₁ · 0.25 = equal frequencies')]);
      tiles.push(['h² sentido estrecho', 'Narrow-sense h²', fmtNum(R.h2ns, 2), T(`H² amplio ${fmtNum(R.H2bs, 2)}`, `broad-sense H² ${fmtNum(R.H2bs, 2)}`)]);
    }
    if (res.regression) tiles.push(['Regresión Wr sobre Vr', 'Regression of Wr on Vr', fmtNum(res.regression.b, 3), T(`EE ${fmtNum(res.regression.seb, 3)} · t(b = 1) ${pEq(res.regression.p1)}`, `SE ${fmtNum(res.regression.seb, 3)} · t(b = 1) ${pEq(res.regression.p1)}`), res.regression.p1 >= 0.05 ? 'ok' : 'warn']);
    statTiles('b5Tiles', tiles);
    msg('b5SetupMsg', res.issues);
    renderAssumptions();
  }

  function renderAssumptions() {
    const res = B5.res, A = res.anova, reg = res.regression, rows = [];
    const item = k => A.rows.find(x => x.item === k);
    if (!res.half) {
      const c = item('c'), d = item('d');
      const ok = c && d && c.p >= 0.05 && d.p >= 0.05;
      rows.push({ what: T('Sin efectos recíprocos (ítems c y d)', 'No reciprocal effects (items c and d)'), stat: c ? `F(c) = ${f2(c.F)} · F(d) = ${f2(d.F)}` : '', p: c ? Math.min(c.p, d.p) : NaN,
        v: ok ? verdict(true, 'se cumple', 'holds') : verdict(false, 'hay efectos recíprocos: promediarlos sesga los componentes', 'reciprocal effects exist: averaging them biases the components') });
    } else rows.push({ what: T('Sin efectos recíprocos', 'No reciprocal effects'), stat: T('no hay recíprocas en los datos', 'no reciprocals in the data'), p: NaN, v: verdict(null, 'no se puede probar', 'cannot be tested') });
    if (reg) {
      rows.push({ what: T('Modelo aditivo–dominante: pendiente b = 1', 'Additive–dominance model: slope b = 1'), stat: `b = ${f3(reg.b)} ± ${f3(reg.seb)}, t = ${f2(reg.t1)}`, p: reg.p1,
        v: reg.p1 >= 0.05 ? verdict(true, 'no se rechaza b = 1', 'b = 1 is not rejected') : verdict(false, 'b ≠ 1: epistasis o genes correlacionados', 'b ≠ 1: epistasis or correlated genes') });
      rows.push({ what: T('Uniformidad de Wr y Vr (prueba t² de Hayman)', 'Uniformity of Wr and Vr (Hayman\'s t² test)'), stat: `t² = ${f3(reg.t2)}`, p: reg.pt2,
        v: reg.pt2 >= 0.05 ? verdict(true, 'se cumple', 'holds') : verdict(false, 'los supuestos fallan', 'the assumptions fail') });
      rows.push({ what: T('Pendiente distinta de cero (hay dominancia)', 'Slope different from zero (dominance present)'), stat: `t = ${f2(reg.t0)}`, p: reg.p0,
        v: reg.p0 < 0.05 ? verdict(true, 'sí', 'yes') : verdict(null, 'no significativa', 'not significant') });
    }
    const b2 = item('b2');
    if (b2) rows.push({ what: T('Distribución independiente de genes (ítem b₂)', 'Independent distribution of genes (item b₂)'), stat: `F = ${f2(b2.F)}`, p: b2.p,
      v: b2.p >= 0.05 ? verdict(true, 'se cumple', 'holds') : verdict(false, 'la dominancia difiere entre arreglos', 'dominance differs between arrays') });
    const b1 = item('b1');
    if (b1) rows.push({ what: T('Dominancia media distinta de cero (ítem b₁)', 'Mean dominance different from zero (item b₁)'), stat: `F = ${f2(b1.F)}`, p: b1.p,
      v: b1.p < 0.05 ? verdict(true, 'hay dominancia', 'dominance present') : verdict(null, 'no significativa', 'not significant') });
    if (res.blockWrVr) {
      const dif = res.blockWrVr.diff.rows.find(r => r.source === 'array');
      const sum = res.blockWrVr.sum.rows.find(r => r.source === 'array');
      rows.push({ what: T('Arreglos en Wr − Vr entre bloques', 'Arrays for Wr − Vr over blocks'), stat: `F = ${f2(dif.F)}`, p: dif.p,
        v: dif.p >= 0.05 ? verdict(true, 'modelo adecuado', 'model adequate') : verdict(false, 'indica epistasis', 'suggests epistasis') });
      rows.push({ what: T('Arreglos en Wr + Vr entre bloques', 'Arrays for Wr + Vr over blocks'), stat: `F = ${f2(sum.F)}`, p: sum.p,
        v: sum.p < 0.05 ? verdict(true, 'hay dominancia', 'dominance present') : verdict(null, 'no significativa', 'not significant') });
    }
    rows.push({ what: T('Progenitores homocigóticos y segregación diploide', 'Homozygous parents and diploid segregation'), stat: '', p: NaN, v: verdict(null, 'no se prueba con estos datos', 'not tested with these data') });
    rows.push({ what: T('Sin alelos múltiples', 'No multiple alleles'), stat: '', p: NaN, v: verdict(null, 'requiere F₂ o retrocruzas', 'needs F₂ or backcrosses') });
    table('b5Assump', [
      { label: T('Supuesto o prueba', 'Assumption or test'), get: r => r.what },
      { label: T('Estadístico', 'Statistic'), num: true, get: r => r.stat },
      { label: 'p', num: true, get: r => (isFinite(r.p) ? sig(r.p) : '') },
      { label: T('Lectura', 'Reading'), get: r => r.v },
    ], rows);
  }

  /* ================= 2 · analysis of variance ================= */
  function renderAnova() {
    const res = B5.res, A = res.anova, r = res.built.r;
    const scale = 1;
    el('b5AnovaIntro').innerHTML = res.half
      ? T(`Medio dialelo: partición de Morley Jones (1965) en a, b₁, b₂ y b₃, equivalente a la de Gardner y Eberhart. Sumas de cuadrados en la escala de medias de entrada (multiplique por r = ${fmtNum(r, 2)} para la escala de parcelas).`,
        `Half diallel: Morley Jones's (1965) partition into a, b₁, b₂ and b₃, equivalent to Gardner &amp; Eberhart's. Sums of squares on the entry-mean scale (multiply by r = ${fmtNum(r, 2)} for the plot scale).`)
      : T(`Tabla completa: partición de Hayman (1954) en a, b₁, b₂, b₃, c y d. Sumas de cuadrados en la escala de medias de entrada (multiplique por r = ${fmtNum(r, 2)} para la escala de parcelas).`,
        `Full table: Hayman's (1954) partition into a, b₁, b₂, b₃, c and d. Sums of squares on the entry-mean scale (multiply by r = ${fmtNum(r, 2)} for the plot scale).`);
    const rows = [];
    A.rows.forEach(x => {
      if (x.item === 'b2') rows.push(Object.assign({}, A.bTotal));
      rows.push(x);
    });
    rows.push(Object.assign({ residual: true }, A.genic));
    const hasB = !!A.blockRows;
    const cols = [
      { label: T('Ítem', 'Item'), get: x => (x.summary ? '<b>' + T(ITEMS[x.item]) + '</b>' : T(ITEMS[x.item])) },
      { label: T('gl', 'df'), num: true, get: x => x.df },
      { label: T('SC', 'SS'), num: true, get: x => fmtNum(x.ss, 4) },
      { label: T('CM', 'MS'), num: true, get: x => fmtNum(x.ms, 4) },
      { label: 'F', num: true, get: x => (isFinite(x.F) ? f2(x.F) : '') },
      { label: 'p', num: true, get: x => sig(x.p) },
    ];
    if (hasB) {
      cols.push({ label: T('CM del ítem × bloques', 'MS of item × blocks'), num: true, get: x => { const b = A.blockRows.find(z => z.item === x.item); return b ? fmtNum(b.ms, 4) : ''; } });
      cols.push({ label: T('F contra bloques', 'F against blocks'), num: true, get: x => (isFinite(x.FB) ? `${f2(x.FB)} <span class="sig">${stars(x.pB)}</span>` : '') });
    }
    rows.forEach(x => { x._cls = x.summary ? 'total-row' : x.residual ? 'resid-row' : ''; });
    table('b5AnovaTable', cols, rows);
    const notes = [];
    notes.push(B5.error === 'blocks' && hasB
      ? T('Cada ítem se prueba contra su propia interacción con bloques (Hayman 1954; Mather y Jinks 1982).', 'Each item is tested against its own interaction with blocks (Hayman 1954; Mather & Jinks 1982).')
      : T(`Las pruebas F usan el error experimental combinado (${A.pooled.df} gl).`, `The F tests use the pooled experimental error (${A.pooled.df} df).`));
    if (hasB) notes.push(T('La suma de las interacciones ítem × bloques es el error de bloques × entradas del diseño.', 'The sum of the item × blocks interactions is the blocks × entries error of the design.'));
    else if (!res.half) notes.push(T('Sin tablas por bloque (el diseño no es de bloques completos o hay una sola repetición) no se pueden calcular las interacciones ítem × bloques.', 'Without per-block tables (the design is not in complete blocks, or there is a single replicate) the item × blocks interactions cannot be computed.'));
    notes.push(T('La última fila es la suma de cuadrados entre progenitores, que Walters y Gale (1977) proponen para probar los efectos génicos cuando hay efectos recíprocos: el ítem a solo prueba efectos génicos si no hay dominancia.', 'The last row is the sum of squares among parents, which Walters & Gale (1977) propose for testing the genic effects when reciprocal effects exist: item a tests genic effects only if there is no dominance.'));
    el('b5AnovaNote').innerHTML = notes.join(' ');
    mountFig('b5FigItems', {
      title: () => T('Partición de la variación entre entradas', 'Partition of the variation between entries') + ' · ' + state.data.ds.traits[B5.trait].name, fileName: 'hayman_items',
      render: c => P5.items(c, A.rows, { names: ITEMS }),
      controls: () => [P2.titleControl(), { key: 'show', label: T('Mostrar', 'Show'), type: 'select', options: [['share', T('% de la suma de cuadrados', '% of the sum of squares')], ['ms', T('cuadrados medios', 'mean squares')]] }, P2.paletteControl()],
    }, { width: 900, height: 420, show: 'share' });
  }

  /* ================= 3 · components ================= */
  function renderComponents() {
    const res = B5.res;
    ['b5Comp', 'b5Graph'].forEach(id => { el(id).style.display = res.components ? '' : 'none'; });
    if (!res.components) return;
    const C = res.components, R = C.ratios;
    table('b5CompTable', [
      { label: T('Componente', 'Component'), get: c => T(c) },
      { label: T('Estimación', 'Estimate'), num: true, get: c => fmtNum(c.value, 4) },
      { label: T('EE', 'SE'), num: true, get: c => fmtNum(c.se, 4) },
      { label: 't', num: true, get: c => f2(c.t) },
      { label: 'p', num: true, get: c => sig(c.p) },
    ], C.list);
    const rows = [
      [T('Grado medio de dominancia', 'Average degree of dominance'), '√(H₁/D)', R.dominance, T(isFinite(R.dominance) ? (R.dominance > 1 ? 'sobredominancia' : R.dominance > 0.5 ? 'dominancia parcial a completa' : 'dominancia parcial baja') : '', isFinite(R.dominance) ? (R.dominance > 1 ? 'overdominance' : R.dominance > 0.5 ? 'partial to complete dominance' : 'low partial dominance') : '')],
      [T('Asimetría de frecuencias en loci dominantes', 'Asymmetry of frequencies at dominant loci'), 'H₂/4H₁', R.asymmetry, T(isFinite(R.asymmetry) ? (Math.abs(R.asymmetry - 0.25) < 0.03 ? 'frecuencias casi iguales' : 'frecuencias desiguales') : '', isFinite(R.asymmetry) ? (Math.abs(R.asymmetry - 0.25) < 0.03 ? 'nearly equal frequencies' : 'unequal frequencies') : '')],
      [T('Alelos dominantes / recesivos', 'Dominant / recessive alleles'), 'KD/KR', R.kdkr, T(isFinite(R.kdkr) ? (R.kdkr > 1 ? 'exceso de alelos dominantes' : 'exceso de alelos recesivos') : '', isFinite(R.kdkr) ? (R.kdkr > 1 ? 'excess of dominant alleles' : 'excess of recessive alleles') : '')],
      [T('Grupos de genes con dominancia', 'Groups of genes showing dominance'), 'h²/H₂', R.genes, ''],
      ['σ²A', '½(D + H₁ − H₂ − F)', R.sigma2A, ''],
      ['σ²D', '¼H₂', R.sigma2D, ''],
      [T('h² en sentido estrecho', 'Narrow-sense h²'), T('forma de Mather y Jinks', 'Mather & Jinks form'), R.h2ns, ''],
      [T('H² en sentido amplio', 'Broad-sense H²'), T('forma de Mather y Jinks', 'Mather & Jinks form'), R.H2bs, ''],
    ];
    table('b5RatioTable', [
      { label: T('Razón o parámetro', 'Ratio or parameter'), get: r => r[0] },
      { label: T('Definición', 'Definition'), get: r => `<span class="hint">${r[1]}</span>` },
      { label: T('Valor', 'Value'), num: true, get: r => fmtNum(r[2], 4) },
      { label: T('Lectura', 'Reading'), get: r => (r[3] ? `<span class="hint">${r[3]}</span>` : '') },
    ], rows);
    statTiles('b5CompTiles', [
      ['D (aditivo)', 'D (additive)', fmtNum(C.D, 3), T(`EE ${fmtNum(C.list[1].se, 3)} · ${stars(C.list[1].p)}`, `SE ${fmtNum(C.list[1].se, 3)} · ${stars(C.list[1].p)}`)],
      ['H₁ (dominancia)', 'H₁ (dominance)', fmtNum(C.H1, 3), T(`EE ${fmtNum(C.list[3].se, 3)} · ${stars(C.list[3].p)}`, `SE ${fmtNum(C.list[3].se, 3)} · ${stars(C.list[3].p)}`)],
      ['F', 'F', fmtNum(C.F, 3), C.F > 0 ? T('más alelos dominantes', 'more dominant alleles') : T('más alelos recesivos', 'more recessive alleles')],
      ['h²/H₂', 'h²/H₂', fmtNum(R.genes, 2), T('grupos de genes con dominancia', 'groups of genes showing dominance')],
      ['E', 'E', fmtNum(C.E, 3), T('varianza de una media de entrada', 'variance of an entry mean')],
    ]);
    const parts = [];
    parts.push(T(`D = ${fmtNum(C.D, 3)} y H₁ = ${fmtNum(C.H1, 3)}: ${C.H1 > C.D ? 'la dominancia supera a la parte aditiva' : 'la parte aditiva supera a la dominancia'}, con un grado medio de dominancia de ${f2(R.dominance)}.`,
      `D = ${fmtNum(C.D, 3)} and H₁ = ${fmtNum(C.H1, 3)}: ${C.H1 > C.D ? 'dominance exceeds the additive part' : 'the additive part exceeds dominance'}, with an average degree of dominance of ${f2(R.dominance)}.`));
    if (isFinite(R.asymmetry)) parts.push(T(`H₂/4H₁ = ${fmtNum(R.asymmetry, 3)} (0.25 cuando las frecuencias de los alelos son iguales).`, `H₂/4H₁ = ${fmtNum(R.asymmetry, 3)} (0.25 when allele frequencies are equal).`));
    if (isFinite(R.kdkr)) parts.push(T(`KD/KR = ${fmtNum(R.kdkr, 2)}: ${R.kdkr > 1 ? 'predominan los alelos dominantes' : 'predominan los alelos recesivos'} entre los progenitores.`, `KD/KR = ${fmtNum(R.kdkr, 2)}: ${R.kdkr > 1 ? 'dominant alleles predominate' : 'recessive alleles predominate'} among the parents.`));
    if (isFinite(R.genes) && R.genes > 0) parts.push(T(`h²/H₂ = ${fmtNum(R.genes, 2)}: al menos ${plural(Math.max(1, Math.round(R.genes)), 'grupo', 'grupos')} de genes con dominancia en la misma dirección.`, `h²/H₂ = ${fmtNum(R.genes, 2)}: at least ${plural(Math.max(1, Math.round(R.genes)), 'group', 'groups')} of genes with dominance in the same direction.`));
    parts.push(T(`Heredabilidad: h² estrecho ${fmtNum(R.h2ns, 2)} y H² amplio ${fmtNum(R.H2bs, 2)} (forma de Mather y Jinks, base de medias de entrada).`, `Heritability: narrow-sense h² ${fmtNum(R.h2ns, 2)} and broad-sense H² ${fmtNum(R.H2bs, 2)} (Mather & Jinks form, entry-mean basis).`));
    el('b5CompReading').innerHTML = parts.join(' ');
    const notes = [];
    if (C.list.some(c => c.value < 0 && ['D', 'H1', 'H2', 'h2'].includes(c.key))) notes.push({ level: 'warning', es: 'Hay componentes negativos que deberían ser positivos (D, H₁, H₂ o h²): suele indicar que el modelo aditivo–dominante no describe los datos, o muy pocos progenitores.', en: 'Some components that should be positive are negative (D, H₁, H₂ or h²): this usually means the additive–dominance model does not describe the data, or that there are too few parents.' });
    notes.push({ level: 'info', es: `Correcciones por error usadas: H₁ − ${fmtNum(C.corrections.H1, 3)}E, H₂ − ${fmtNum(C.corrections.H2, 3)}E, h² − ${fmtNum(C.corrections.h2, 4)}E${res.half ? (C.classic ? ' (clásicas)' : ' (deducidas para medio dialelo)') : ''}.`, en: `Error corrections used: H₁ − ${fmtNum(C.corrections.H1, 3)}E, H₂ − ${fmtNum(C.corrections.H2, 3)}E, h² − ${fmtNum(C.corrections.h2, 4)}E${res.half ? (C.classic ? ' (classical)' : ' (derived for a half diallel)') : ''}.` });
    if (res.p < 6) notes.push({ level: 'warning', es: `Con ${res.p} progenitores la regresión Wr–Vr tiene ${res.p - 2} grados de libertad: las pruebas tienen poca potencia y los componentes poca precisión.`, en: `With ${res.p} parents the Wr–Vr regression has ${res.p - 2} degrees of freedom: the tests have little power and the components little precision.` });
    msg('b5CompMsg', notes);
  }

  /* ================= 4 · graph ================= */
  function renderGraph() {
    const res = B5.res;
    if (!res.components) return;
    const names = res.parents, label = state.data.ds.traits[B5.trait].name;
    mountFig('b5FigWrVr', {
      title: () => T('Gráfico Wr–Vr', 'Wr–Vr graph') + ' · ' + label, fileName: 'wr_vr',
      render: c => P5.wrvr(c, res.stats, res.regression, { names }),
      controls: () => [P2.titleControl(), { key: 'showParabola', label: T('Parábola límite', 'Limiting parabola'), type: 'checkbox' }, { key: 'showUnit', label: T('Recta de pendiente 1', 'Line of unit slope'), type: 'checkbox' }, { key: 'showFit', label: T('Recta ajustada', 'Fitted line'), type: 'checkbox' }, { key: 'showEnds', label: T('Extremos dominante y recesivo', 'Dominant and recessive ends'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 900, height: 560, showParabola: true, showUnit: true, showFit: true, showEnds: true });
    mountFig('b5FigDom', {
      title: () => T('Orden de dominancia', 'Order of dominance') + ' · ' + label, fileName: 'dominance_order',
      render: c => P5.dominance(c, res.stats, res.regression, { names, label }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 900, height: 520 });
    const reg = res.regression;
    table('b5RegTable', [
      { label: T('Estadístico', 'Statistic'), get: r => r[0] },
      { label: T('Valor', 'Value'), num: true, get: r => r[1] },
      { label: T('Lectura', 'Reading'), get: r => (r[2] ? `<span class="hint">${r[2]}</span>` : '') },
    ], [
      [T('Pendiente b', 'Slope b'), `${f3(reg.b)} ± ${f3(reg.seb)}`, ''],
      [T('t (b = 0)', 't (b = 0)'), `${f2(reg.t0)} · ${pEq(reg.p0)}`, reg.p0 < 0.05 ? T('hay dominancia', 'dominance present') : T('sin dominancia detectable', 'no detectable dominance')],
      [T('t (b = 1)', 't (b = 1)'), `${f2(reg.t1)} · ${pEq(reg.p1)}`, reg.p1 >= 0.05 ? T('modelo aditivo–dominante adecuado', 'additive–dominance model adequate') : T('epistasis o genes correlacionados', 'epistasis or correlated genes')],
      [T('Intercepto', 'Intercept'), fmtNum(reg.a, 4), reg.a > 0 ? T('dominancia parcial', 'partial dominance') : T('sobredominancia', 'overdominance')],
      [T('Prueba t² (uniformidad de Wr y Vr)', 't² test (uniformity of Wr and Vr)'), `${f3(reg.t2)} · ${pEq(reg.pt2)}`, reg.pt2 >= 0.05 ? T('se cumple', 'holds') : T('los supuestos fallan', 'the assumptions fail')],
      [T('r (valor del progenitor, Wr + Vr)', 'r (parent value, Wr + Vr)'), `${f3(reg.corrYr)} · r² = ${f3(reg.r2)}`, reg.corrYr < 0 ? T('los genes dominantes aumentan el valor', 'dominant genes increase the value') : T('los genes dominantes disminuyen el valor', 'dominant genes decrease the value')],
      [T('Progenitor completamente dominante (predicción)', 'Completely dominant parent (prediction)'), fmtNum(reg.predictDominant, 3), ''],
      [T('Progenitor completamente recesivo (predicción)', 'Completely recessive parent (prediction)'), fmtNum(reg.predictRecessive, 3), ''],
    ]);
    const order = new Map(reg.order.map((i, k) => [i, k + 1]));
    table('b5ArrayTable', [
      { label: T('Progenitor', 'Parent'), get: a => esc(names[a.i]) },
      { label: T('Valor propio', 'Own value'), num: true, get: a => fmtNum(a.parent, 3) },
      { label: 'Vr', num: true, get: a => fmtNum(a.Vr, 3) },
      { label: 'Wr', num: true, get: a => fmtNum(a.Wr, 3) },
      { label: 'Wr + Vr', num: true, get: a => fmtNum(a.sum, 3) },
      { label: 'Wr − Vr', num: true, get: a => fmtNum(a.diff, 3) },
      { label: T('Orden de dominancia', 'Order of dominance'), num: true, get: a => order.get(a.i) },
    ], res.stats.arrays);
    el('b5BlockBox').style.display = res.blockWrVr ? '' : 'none';
    if (res.blockWrVr) {
      const rows = [];
      [['diff', 'Wr − Vr'], ['sum', 'Wr + Vr']].forEach(([k, lab]) => res.blockWrVr[k].rows.forEach(r => rows.push({ what: lab, source: r.source, df: r.df, ss: r.ss, ms: r.ms, F: r.F, p: r.p })));
      table('b5BlockTable', [
        { label: T('Variable', 'Variable'), get: r => r.what },
        { label: T('Fuente', 'Source'), get: r => T({ array: { es: 'Arreglos', en: 'Arrays' }, block: { es: 'Bloques', en: 'Blocks' }, residual: { es: 'Residual', en: 'Residual' } }[r.source] || { es: r.source, en: r.source }) },
        { label: T('gl', 'df'), num: true, get: r => r.df },
        { label: T('SC', 'SS'), num: true, get: r => fmtNum(r.ss, 3) },
        { label: T('CM', 'MS'), num: true, get: r => fmtNum(r.ms, 3) },
        { label: 'F', num: true, get: r => (isFinite(r.F) ? f2(r.F) : '') },
        { label: 'p', num: true, get: r => sig(r.p) },
      ], rows);
    }
  }

  /* ================= 5 · Gardner and Eberhart ================= */
  function renderGE() {
    const res = B5.res;
    el('b5GE').style.display = res.ge2 ? '' : 'none';
    if (!res.ge2) return;
    const names = res.parents, label = state.data.ds.traits[B5.trait].name;
    const src = k => T(GE.SOURCES[k] || { es: k, en: k });
    const anovaCols = [
      { label: T('Fuente', 'Source'), get: r => src(r.source) },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: T('SC', 'SS'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: T('CM', 'MS'), num: true, get: r => fmtNum(r.ms, 4) },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? f2(r.F) : '') },
      { label: 'p', num: true, get: r => sig(r.p) },
    ];
    const withF = rows => rows.map(r => { const F = r.ms / res.E, pv = 1 - S.pf(F, r.df, res.built.dfe); return Object.assign({}, r, { F, p: pv }); });
    table('b5Ge2Anova', anovaCols, withF(res.ge2Anova));
    table('b5Ge3Anova', anovaCols, withF(res.ge3Anova));
    const rows2 = [{ what: 'μ<sub>v</sub>', e: res.ge2.mu }, { what: HBAR, e: res.ge2.hbar }]
      .concat(res.ge2.v.map((x, i) => ({ what: `v (${esc(names[i])})`, e: x })))
      .concat(res.ge2.h.map((x, i) => ({ what: `h (${esc(names[i])})`, e: x })))
      .concat(res.ge2.s.filter(s => isFinite(s.est)).map(s => ({ what: `s (${esc(names[s.i])} × ${esc(names[s.j])})`, e: s })));
    const estCols = [
      { label: T('Parámetro', 'Parameter'), get: r => r.what },
      { label: T('Estimación', 'Estimate'), num: true, get: r => fmtNum(r.e.est, 4) },
      { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.e.se, 4) },
      { label: 't', num: true, get: r => f2(r.e.t) },
      { label: 'p', num: true, get: r => sig(r.e.p) },
    ];
    table('b5Ge2Table', estCols, rows2, 60);
    const rows3 = [{ what: 'μ<sub>v</sub>', e: res.ge3.muv }, { what: 'μ<sub>c</sub>', e: res.ge3.muc }]
      .concat(res.ge3.sp.map((x, i) => ({ what: `sp (${esc(names[i])})`, e: x })))
      .concat(res.ge3.g.map((x, i) => ({ what: `g (${esc(names[i])})`, e: x })));
    table('b5Ge3Table', estCols, rows3, 60);
    el('b5GeIdentity').innerHTML = res.geIdentity != null
      ? T(`Identidad ĝⱼ = ½v̂ⱼ + ĥⱼ: diferencia máxima ${res.geIdentity.toExponential(1)} (se cumple exactamente).`, `Identity ĝⱼ = ½v̂ⱼ + ĥⱼ: largest difference ${res.geIdentity.toExponential(1)} (it holds exactly).`)
      : '';
    mountFig('b5FigGe', {
      title: () => T('Efectos de variedad y de heterosis', 'Variety and heterosis effects') + ' · ' + label, fileName: 'ge_effects',
      render: c => P5.geEffects(c, res.ge2, { names, label, tcrit: S.qt(1 - B5.alpha / 2, res.built.dfe) }),
      controls: () => [P2.titleControl(), { key: 'order', label: T('Orden', 'Order'), type: 'select', options: [['effect', T('por efecto de variedad', 'by variety effect')], ['name', T('por nombre', 'by name')]] }, { key: 'showCI', label: T('Intervalos de confianza', 'Confidence intervals'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 900, height: Math.max(400, 150 + res.p * 26), showCI: true });
    const het = res.heterosis.slice().sort((a, b) => (B5.goal === 'low' ? a.mphPct - b.mphPct : b.mphPct - a.mphPct));
    table('b5HetTable', [
      { label: T('Cruza', 'Cross'), get: h => `${esc(names[h.i])} × ${esc(names[h.j])}` },
      { label: T('Cruza', 'Cross') + ' F₁', num: true, get: h => fmtNum(h.cross, 3) },
      { label: T('Media de progenitores', 'Mid-parent'), num: true, get: h => fmtNum(h.mid, 3) },
      { label: T('Heterosis', 'Heterosis'), num: true, get: h => fmtNum(h.mph, 3) },
      { label: '%', num: true, get: h => fmtNum(h.mphPct, 1) },
      { label: T('EE', 'SE'), num: true, get: h => fmtNum(h.seMph, 3) },
      { label: 'p', num: true, get: h => sig(h.pMph) },
      { label: T('Mejor progenitor', 'Better parent'), num: true, get: h => fmtNum(h.better, 3) },
      { label: T('Heterosis', 'Heterosis') + ' (%)', num: true, get: h => fmtNum(h.bphPct, 1) },
      { label: 'p', num: true, get: h => sig(h.pBph) },
    ], het, 200);
    mountFig('b5FigHet', {
      title: () => (el('b5HetKind').value === 'bph' ? T('Heterosis respecto al mejor progenitor', 'Better-parent heterosis') : T('Heterosis respecto a la media de los progenitores', 'Mid-parent heterosis')) + ' · ' + label,
      fileName: 'heterosis',
      render: c => P5.heterosis(c, res.heterosis, { names }),
      controls: () => [P2.titleControl(), { key: 'maxCrosses', label: T('Máximo de cruzas', 'Maximum crosses'), type: 'number', min: 10, max: 200, step: 5 }, P2.paletteControl()],
    }, { width: 900, height: Math.max(420, 150 + Math.min(res.heterosis.length, 40) * 17), kind: el('b5HetKind').value, maxCrosses: 40 });
  }

  /* ================= 6 · equivalences ================= */
  function renderEquiv() {
    const res = B5.res, r = res.built.r;
    const G = res.griffing;
    const ss = (m, src) => { const g = G[m]; if (!g || !g.main) return NaN; const x = g.main.anova.find(z => z.source === src); return x ? x.ss / g.main.r : NaN; };
    const items = res.anova.items, J = res.jones || (res.half ? res.anova.items : null);
    const ge2 = res.ge2Anova ? Object.fromEntries(res.ge2Anova.map(x => [x.source, x.ss])) : {};
    const ge3 = res.ge3Anova ? Object.fromEntries(res.ge3Anova.map(x => [x.source, x.ss])) : {};
    const rows = [];
    const add = (what, hj, hjLabel, gr, grLabel, ge, geLabel) => {
      const vals = [hj, gr, ge].filter(v => isFinite(v));
      if (vals.length < 2) return;
      const diff = Math.max(...vals) - Math.min(...vals);
      const rel = diff / Math.max(1e-12, Math.max(...vals.map(Math.abs)));
      rows.push({ what, hj, hjLabel, gr, grLabel, ge, geLabel, same: rel < 1e-6 });
    };
    if (!res.half) {
      rows.push({ section: T('Tabla completa (con recíprocas)', 'Full table (with reciprocals)') });
      add(T('Efectos aditivos', 'Additive effects'), items.a, 'a', ss(1, 'gca'), T('ACG método 1', 'Method 1 GCA'), NaN, '');
      add(T('Dominancia total', 'Total dominance'), items.b, 'b = b₁ + b₂ + b₃', ss(1, 'sca'), T('ACE método 1', 'Method 1 SCA'), NaN, '');
      add(T('Efectos maternos', 'Maternal effects'), items.c, 'c', ss(1, 'mat'), T('maternos método 1', 'Method 1 maternal'), NaN, '');
      add(T('Diferencias recíprocas restantes', 'Remaining reciprocal differences'), items.d, 'd', ss(1, 'nonmat'), T('no maternos método 1', 'Method 1 non-maternal'), NaN, '');
      add(T('Dominancia específica', 'Specific dominance'), items.b3, 'b₃', ss(3, 'sca'), T('ACE método 3', 'Method 3 SCA'), NaN, '');
    }
    if (J) {
      rows.push({ section: res.half ? T('Medio dialelo', 'Half diallel') : T('Tabla con recíprocas promediadas (medio dialelo)', 'Reciprocal-averaged table (half diallel)') });
      add(T('Efectos aditivos / variedades', 'Additive effects / varieties'), J.a, 'a', ss(2, 'gca'), T('ACG método 2', 'Method 2 GCA'), ge2.v, T('variedades (vⱼ)', 'varieties (vⱼ)'));
      add(T('Dominancia total / heterosis', 'Total dominance / heterosis'), J.b, 'b', ss(2, 'sca'), T('ACE método 2', 'Method 2 SCA'), (ge2.hbar || 0) + (ge2.h || 0) + (ge2.s || 0), T(HBAR + ' + hⱼ + s', HBAR + ' + hⱼ + s'));
      add(T('Heterosis promedio', 'Average heterosis'), J.b1, 'b₁', NaN, '', ge2.hbar, HBAR);
      add(T('Heterosis de variedad', 'Variety heterosis'), J.b2, 'b₂', NaN, '', ge2.h, 'hⱼ');
      add(T('Heterosis específica', 'Specific heterosis'), J.b3, 'b₃', ss(4, 'sca'), T('ACE método 4', 'Method 4 SCA'), ge2.s, 's');
      add(T('ACG entre cruzas', 'GCA among crosses'), NaN, '', ss(4, 'gca'), T('ACG método 4', 'Method 4 GCA'), ge3.g, T('gⱼ del análisis III', 'Analysis III gⱼ'));
      add(T('Progenitores por sí mismos', 'Parents per se'), J.genic, T('entre progenitores', 'among parents'), NaN, '', ge3.sp, 'spⱼ');
    }
    /* the identity b2 = SS parents + GCA(M4) − GCA(M2) */
    let extra = '';
    if (J && isFinite(ss(4, 'gca')) && isFinite(ss(2, 'gca'))) {
      const lhs = J.b2, rhs = J.genic + ss(4, 'gca') - ss(2, 'gca');
      extra = T(`Identidad de Gardner y Eberhart: b₂ = SC(progenitores) + ACG(método 4) − ACG(método 2) = ${fmtNum(rhs, 4)} contra b₂ = ${fmtNum(lhs, 4)}${Math.abs(lhs - rhs) < 1e-6 * Math.max(1, Math.abs(lhs)) ? ' ✓' : ''}.`,
        `Gardner &amp; Eberhart identity: b₂ = SS(parents) + GCA(Method 4) − GCA(Method 2) = ${fmtNum(rhs, 4)} against b₂ = ${fmtNum(lhs, 4)}${Math.abs(lhs - rhs) < 1e-6 * Math.max(1, Math.abs(lhs)) ? ' ✓' : ''}.`);
    }
    rows.forEach(r2 => { if (r2.section) r2._cls = 'total-row'; });
    table('b5EquivTable', [
      { label: T('Fuente de variación', 'Source of variation'), get: r2 => (r2.section ? `<b>${r2.section}</b>` : r2.what) },
      { label: T('Hayman / Morley Jones', 'Hayman / Morley Jones'), get: r2 => (r2.hjLabel ? `${r2.hjLabel}: <b>${fmtNum(r2.hj, 4)}</b>` : '') },
      { label: 'Griffing', get: r2 => (r2.grLabel ? `${r2.grLabel}: <b>${fmtNum(r2.gr, 4)}</b>` : '') },
      { label: T('Gardner y Eberhart', 'Gardner &amp; Eberhart'), get: r2 => (r2.geLabel ? `${r2.geLabel}: <b>${fmtNum(r2.ge, 4)}</b>` : '') },
      { label: T('¿Coinciden?', 'Do they match?'), get: r2 => (r2.section ? '' : r2.same ? `<span class="pw ok">${T('sí', 'yes')}</span>` : `<span class="pw low">${T('no', 'no')}</span>`) },
    ], rows);
    el('b5EquivTable').insertAdjacentHTML('beforeend', `<p class="hint">${extra} ${T('Las sumas de cuadrados están en la escala de medias de entrada. Los efectos no coinciden entre metodologías aunque las sumas de cuadrados sí: el método 2 de Griffing incluye a los progenitores en la ACG, el análisis III de Gardner y Eberhart no.', 'Sums of squares are on the entry-mean scale. The effects do not coincide between methodologies even when the sums of squares do: Griffing\'s Method 2 includes the parents in GCA, Gardner &amp; Eberhart\'s Analysis III does not.')}</p>`);
  }

  function renderNotes() {
    el('b5Notes').innerHTML = T(`
      <ul>
        <li><b>Partición de Hayman (1954, Biometrics 10:235–244):</b> a (aditivo, = ACG del método 1 de Griffing), b₁ (dominancia media, contraste F₁ contra progenitores), b₂ (dominancia que difiere entre arreglos: genes con un alelo concentrado en pocos progenitores), b₃ (dominancia específica, = ACE del método 3), c (efectos maternos, = maternos del método 1) y d (resto de las diferencias recíprocas). Cada ítem se puede probar contra su interacción con bloques (Hayman; Mather y Jinks 1982) o contra el error combinado.</li>
        <li><b>Medio dialelo (Morley Jones 1965, Heredity 20:117–121):</b> a, b₁, b₂ y b₃ calculados con los totales u_r = y_r. + y_rr y t_r = 2y_r. − p·y_rr; la partición coincide con la de Gardner y Eberhart.</li>
        <li><b>Componentes (Hayman 1954, Genetics 39:789–809; Jinks 1954):</b> D̂ = V0L0 − E; F̂ = 2V0L0 − 4W0L01 − 2(p − 2)E/p; Ĥ₁ = V0L0 − 4W0L01 + 4V1L1 − (3p − 2)E/p; Ĥ₂ = 4V1L1 − 4V0L1 − 2E; ĥ² = 4(ML1 − ML0)² − 4(p − 1)E/p². En <b>medio dialelo</b> las cruzas se evaluaron una sola vez, así que las correcciones cambian a (5p − 4)E/p, 4E − 4(p − 1)E/p² y 4(p² − 1)E/p³ (deducción propia de BreedingPro, comprobada por simulación); D y F no cambian.</li>
        <li><b>Errores estándar:</b> S² = ½·Var(Wr − Vr) y los coeficientes de Hayman: E 1/p, D (p⁵ + p⁴)/p⁵, F (4p⁵ + 20p⁴ − 16p³ + 16p²)/p⁵, H₁ (p⁵ + 41p⁴ − 12p³ + 4p²)/p⁵, H₂ 36/p, h² (16p⁴ + 16p² − 32p + 16)/p⁵.</li>
        <li><b>Gráfico Wr–Vr:</b> parábola límite Wr² = Vr·V0L0; recta de pendiente 1; prueba t² de uniformidad de Wr y Vr (equivale a la prueba de Pitman y Morgan para dos varianzas correlacionadas, con p − 2 grados de libertad).</li>
        <li><b>Gardner y Eberhart (1966, Biometrics 22:439–452):</b> análisis II con μ_v, vⱼ, ${HBAR}, hⱼ y sⱼⱼ′; análisis III con progenitores por sí mismos y ACG entre cruzas; se cumple ĝⱼ = ½v̂ⱼ + ĥⱼ y b₂ = SC(progenitores) + ACG(método 4) − ACG(método 2).</li>
        <li><b>Heterosis:</b> respecto a la media de los progenitores y al mejor progenitor, con la varianza exacta de cada contraste de medias; el Bloque 7 añade generaciones, depresión endogámica y comparación con testigos.</li>
        <li><b>Referencias adicionales:</b> Walters DE, Gale JS (1977) Heredity 38:401–407; Wright AJ (1985) Theor Appl Genet 71:31–36; Jinks JL (1956) Heredity 10:1–30 (dialelos F₂); Mather K, Jinks JL (1982) Biometrical Genetics, 3ª ed.</li>
      </ul>`, `
      <ul>
        <li><b>Hayman's partition (1954, Biometrics 10:235–244):</b> a (additive, = Griffing Method 1 GCA), b₁ (mean dominance, the F₁ against parents contrast), b₂ (dominance differing between arrays: genes with one allele concentrated in few parents), b₃ (specific dominance, = Method 3 SCA), c (maternal effects, = Method 1 maternal) and d (the rest of the reciprocal differences). Each item can be tested against its interaction with blocks (Hayman; Mather &amp; Jinks 1982) or against the pooled error.</li>
        <li><b>Half diallel (Morley Jones 1965, Heredity 20:117–121):</b> a, b₁, b₂ and b₃ computed from the totals u_r = y_r. + y_rr and t_r = 2y_r. − p·y_rr; the partition coincides with Gardner &amp; Eberhart's.</li>
        <li><b>Components (Hayman 1954, Genetics 39:789–809; Jinks 1954):</b> D̂ = V0L0 − E; F̂ = 2V0L0 − 4W0L01 − 2(p − 2)E/p; Ĥ₁ = V0L0 − 4W0L01 + 4V1L1 − (3p − 2)E/p; Ĥ₂ = 4V1L1 − 4V0L1 − 2E; ĥ² = 4(ML1 − ML0)² − 4(p − 1)E/p². In a <b>half diallel</b> the crosses were grown once, so the corrections become (5p − 4)E/p, 4E − 4(p − 1)E/p² and 4(p² − 1)E/p³ (derived for BreedingPro and checked by simulation); D and F do not change.</li>
        <li><b>Standard errors:</b> S² = ½·Var(Wr − Vr) with Hayman's coefficients: E 1/p, D (p⁵ + p⁴)/p⁵, F (4p⁵ + 20p⁴ − 16p³ + 16p²)/p⁵, H₁ (p⁵ + 41p⁴ − 12p³ + 4p²)/p⁵, H₂ 36/p, h² (16p⁴ + 16p² − 32p + 16)/p⁵.</li>
        <li><b>Wr–Vr graph:</b> limiting parabola Wr² = Vr·V0L0; line of unit slope; t² test of the uniformity of Wr and Vr (equivalent to the Pitman–Morgan test for two correlated variances, with p − 2 degrees of freedom).</li>
        <li><b>Gardner &amp; Eberhart (1966, Biometrics 22:439–452):</b> Analysis II with μ_v, vⱼ, ${HBAR}, hⱼ and sⱼⱼ′; Analysis III with the parents per se and GCA among crosses; the identities ĝⱼ = ½v̂ⱼ + ĥⱼ and b₂ = SS(parents) + GCA(Method 4) − GCA(Method 2) hold.</li>
        <li><b>Heterosis:</b> against the mid-parent and the better parent, with the exact variance of each contrast of means; Block 7 adds generations, inbreeding depression and comparison with checks.</li>
        <li><b>Further references:</b> Walters DE, Gale JS (1977) Heredity 38:401–407; Wright AJ (1985) Theor Appl Genet 71:31–36; Jinks JL (1956) Heredity 10:1–30 (F₂ diallels); Mather K, Jinks JL (1982) Biometrical Genetics, 3rd ed.</li>
      </ul>`);
  }

  /* ================= downloads ================= */
  function tableRows() {
    const res = B5.res, p = res.p, names = res.parents;
    const rows = [[''].concat(names)];
    for (let i = 0; i < p; i++) {
      const row = [names[i]];
      for (let j = 0; j < p; j++) row.push(res.matrix.sym[i * p + j]);
      rows.push(row);
    }
    return rows;
  }
  function downloadCsv(rows, name) { download(String.fromCharCode(0xFEFF) + rows.map(r => r.map(v => csvEscape(typeof v === 'number' ? +v.toPrecision(12) : v)).join(',')).join('\r\n'), name, 'text/csv;charset=utf-8'); }
  function downloadXlsx() {
    if (typeof XLSX === 'undefined') return;
    const res = B5.res;
    const wb = XLSX.utils.book_new();
    const sheet = (rows, name) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    const an = [[T('Ítem', 'Item'), T('gl', 'df'), T('SC', 'SS'), T('CM', 'MS'), 'F', 'p', T('CM ítem × bloques', 'MS item × blocks')]];
    res.anova.rows.forEach(x => { const b = res.anova.blockRows ? res.anova.blockRows.find(z => z.item === x.item) : null; an.push([T(ITEMS[x.item]), x.df, x.ss, x.ms, x.F, x.p, b ? b.ms : '']); });
    an.push([T(ITEMS.genic), res.anova.genic.df, res.anova.genic.ss, res.anova.genic.ms, res.anova.genic.F, res.anova.genic.p, '']);
    sheet(an, T('Hayman', 'Hayman'));
    if (res.components) {
      sheet([[T('Componente', 'Component'), T('Estimación', 'Estimate'), T('EE', 'SE'), 't', 'p']].concat(res.components.list.map(c => [T(c), c.value, c.se, c.t, c.p]))
        .concat([[], [T('Razón', 'Ratio'), T('Valor', 'Value')]], Object.entries(res.components.ratios).map(([k, v]) => [k, v])), T('Componentes', 'Components'));
      sheet([[T('Progenitor', 'Parent'), T('Valor', 'Value'), 'Vr', 'Wr', 'Wr+Vr', 'Wr-Vr']].concat(res.stats.arrays.map(a => [res.parents[a.i], a.parent, a.Vr, a.Wr, a.sum, a.diff])), T('Arreglos', 'Arrays'));
    }
    if (res.ge2) {
      const ge = [[T('Análisis', 'Analysis'), T('Parámetro', 'Parameter'), T('Estimación', 'Estimate'), T('EE', 'SE'), 't', 'p']];
      ge.push(['II', 'mu_v', res.ge2.mu.est, res.ge2.mu.se, res.ge2.mu.t, res.ge2.mu.p]);
      ge.push(['II', 'h_bar', res.ge2.hbar.est, res.ge2.hbar.se, res.ge2.hbar.t, res.ge2.hbar.p]);
      res.ge2.v.forEach((x, i) => ge.push(['II', 'v_' + res.parents[i], x.est, x.se, x.t, x.p]));
      res.ge2.h.forEach((x, i) => ge.push(['II', 'h_' + res.parents[i], x.est, x.se, x.t, x.p]));
      res.ge2.s.forEach(s => ge.push(['II', 's_' + res.parents[s.i] + '_' + res.parents[s.j], s.est, s.se, s.t, s.p]));
      res.ge3.sp.forEach((x, i) => ge.push(['III', 'sp_' + res.parents[i], x.est, x.se, x.t, x.p]));
      res.ge3.g.forEach((x, i) => ge.push(['III', 'g_' + res.parents[i], x.est, x.se, x.t, x.p]));
      sheet(ge, T('Gardner-Eberhart', 'Gardner-Eberhart'));
      sheet([[T('Cruza', 'Cross'), 'F1', T('Media de progenitores', 'Mid-parent'), T('Heterosis', 'Heterosis'), '%', T('EE', 'SE'), 'p', T('Mejor progenitor', 'Better parent'), T('Heterosis', 'Heterosis'), '%', T('EE', 'SE'), 'p']]
        .concat(res.heterosis.map(h => [res.parents[h.i] + ' x ' + res.parents[h.j], h.cross, h.mid, h.mph, h.mphPct, h.seMph, h.pMph, h.better, h.bph, h.bphPct, h.seBph, h.pBph])), T('Heterosis', 'Heterosis'));
    }
    sheet(tableRows(), T('Tabla dialélica', 'Diallel table'));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('hayman_gardner_', 'hayman_gardner_') + (state.data.ds.traits[B5.trait].name || '')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderPickers() {
    const D = state.data;
    el('b5Trait').innerHTML = D.ds.traits.map((t, i) => `<option value="${i}"${i === B5.trait ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const envs = D.field.envs;
    el('b5EnvField').style.display = envs.length > 1 ? '' : 'none';
    el('b5Env').innerHTML = envs.map(e => `<option value="${esc(e.key)}">${esc(e.name)}</option>`).join('') + (envs.length > 1 ? `<option value="__mean">${T('media de todos', 'mean of all')}</option>` : '');
    if (!B5.env || ![...el('b5Env').options].some(o => o.value === B5.env)) B5.env = envs.length > 1 ? '__mean' : envs[0].key;
    el('b5Env').value = B5.env;
    el('b5Table').value = B5.table; el('b5Error').value = B5.error; el('b5Corr').value = B5.corr;
    el('b5Goal').value = B5.goal; el('b5Alpha').value = String(B5.alpha);
  }
  function renderAll() {
    const st = status();
    ['b5Anova', 'b5Comp', 'b5Graph', 'b5GE', 'b5Equiv'].forEach(id => { el(id).style.display = st.ok ? '' : 'none'; });
    if (!st.ok) { el('b5Source').innerHTML = ''; el('b5Tiles').innerHTML = ''; el('b5Assump').innerHTML = ''; msg('b5SetupMsg', [{ level: 'warning', es: st.es, en: st.en }]); return; }
    const D = state.data;
    if (B5.trait >= D.ds.traits.length) B5.trait = 0;
    renderPickers();
    B5.res = analyse();
    if (!B5.res) { msg('b5SetupMsg', [{ level: 'error', es: 'No se pudo construir la tabla dialélica.', en: 'The diallel table could not be built.' }]); return; }
    state.hayman = { trait: D.ds.traits[B5.trait].name, res: B5.res };
    renderSetup();
    renderAnova();
    renderComponents();
    renderGraph();
    renderGE();
    renderEquiv();
    /* a diallel goes on to genetic parameters and selection (Block 8), or to G × E with several environments (Block 9);
       Block 6 is for the other mating designs */
    const n = D.field.multiEnv ? 9 : 8, s = STEPS[n - 1];
    el('b5Next').disabled = !s.ready;
    el('b5Next').dataset.step = n;
    el('b5NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque ${n}, en construcción)`, `Next: ${s.en} (Block ${n}, under construction)`);
  }

  function init() {
    if (!el('b5Setup')) return;
    renderNotes();
    const soft = () => { B5.cache.clear(); renderAll(); };
    el('b5Trait').addEventListener('change', () => { B5.trait = +el('b5Trait').value; renderAll(); });
    el('b5Env').addEventListener('change', () => { B5.env = el('b5Env').value; soft(); });
    el('b5Table').addEventListener('change', () => { B5.table = el('b5Table').value; soft(); });
    el('b5Error').addEventListener('change', () => { B5.error = el('b5Error').value; soft(); });
    el('b5Corr').addEventListener('change', () => { B5.corr = el('b5Corr').value; soft(); });
    el('b5Goal').addEventListener('change', () => { B5.goal = el('b5Goal').value; soft(); });
    el('b5Alpha').addEventListener('change', () => { B5.alpha = parseFloat(el('b5Alpha').value); soft(); });
    el('b5HetKind').addEventListener('change', () => { delete Fig.registry.b5FigHet; renderGE(); });
    el('b5DlXlsx').addEventListener('click', downloadXlsx);
    el('b5DlTable').addEventListener('click', () => downloadCsv(tableRows(), slug(T('tabla_dialelica', 'diallel_table')) + '.csv'));
    el('b5Back').addEventListener('click', () => goStep(4));
    el('b5Next').addEventListener('click', () => { const n = +el('b5Next').dataset.step || 8; if (STEPS[n - 1].ready) goStep(n); });
    document.addEventListener('datachange', () => { B5.cache.clear(); B5.env = null; if (document.getElementById('panel-5').classList.contains('active')) renderAll(); else B5.built = false; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 5 && (!B5.built || !B5.res)) { B5.built = true; renderAll(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B5.res) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
