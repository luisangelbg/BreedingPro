/* BreedingPro — Block 4 interface: Griffing diallels.
   Takes the adjusted entry means and the error of each environment from Block 3,
   builds the diallel table for the chosen method (a subset of the entries when the
   method drops parents or reciprocals, with its own error), runs the analysis and
   shows the analysis of variance, the effects, the variance components, the best
   parents and crosses, and the comparison of the four methods. */

(function () {
  const B4 = { method: null, recip: 'direct', model: 'I', envMode: 'fixed', F: 1, scale: 'mean', alpha: 0.05, trait: 0, goal: 'high', topN: 20, cache: new Map(), res: null, compare: null, built: false };
  window.B4 = B4;

  const f2 = x => fmtFixed(x, 2), f3 = x => fmtFixed(x, 3), f4 = x => fmtFixed(x, 4);
  const SRC = k => T(Griffing.SOURCES[k] || { es: k, en: k });
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
    if (limit && rows.length > limit) h += `<p class="hint">${T(`Se muestran ${limit} de ${rows.length} filas; la descarga las incluye todas.`, `Showing ${limit} of ${rows.length} rows; the download has them all.`)}</p>`;
    host.innerHTML = h;
  };
  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    Fig.mount(hostId, Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {}));
  }
  const sig = p => (isFinite(p) ? `${fmtP(p)} <span class="sig">${stars(p)}</span>` : '');
  const pname = i => (B4.res ? B4.res.parents[i] : String(i));
  const cross = (i, j) => (i === j ? pname(i) : pname(i) + ' × ' + pname(j));

  /* ================= build the diallel table for a method ================= */
  function buildCells(method, opts) {
    opts = opts || {};
    const D = state.data;
    const M = Griffing.METHODS[method];
    const parents = D.mating.parents;
    const ix = new Map(parents.map((x, k) => [x, k]));
    const ent = new Map();
    D.ds.records.forEach(r => {
      const i = ix.get(r.female), j = ix.get(r.male);
      if (i == null || j == null) return;
      if (!ent.has(r.entry)) ent.set(r.entry, { i, j });
    });
    const count = new Map();
    ent.forEach(v => { if (v.i === v.j) return; const k = Math.min(v.i, v.j) + '|' + Math.max(v.i, v.j); count.set(k, (count.get(k) || 0) + 1); });
    const keep = new Set();
    ent.forEach((v, name) => {
      if (v.i === v.j) { if (M.selfs) keep.add(name); return; }
      const k = Math.min(v.i, v.j) + '|' + Math.max(v.i, v.j);
      if (M.recip || count.get(k) === 1 || opts.reciprocals === 'average' || v.i < v.j) keep.add(name);
    });
    const sub = Object.assign({}, D.ds, { records: D.ds.records.filter(r => keep.has(r.entry)) });
    const t = D.ds.traits[B4.trait];
    const envs = [], cells = [];
    const notes = [];
    D.field.envs.forEach(E => {
      const res = Trial.analyseEnv(sub, E, t, { heritability: false, excluded: D.excluded, externalError: D.external, designs: null });
      if (res.error) { notes.push({ level: 'warning', es: `${E.name}: ${T(res.error)}`, en: `${E.name}: ${T(res.error)}` }); return; }
      const means = res.means || [];
      const hasError = res.mse != null && res.dfe > 0;
      envs.push({ key: E.key, name: res.env, mse: Trial.meansError(res), mseField: hasError ? res.mse : res.mseMeans, dfe: res.dfe, r: hasError ? res.harmonicReps : 1, design: res.design, meansFrom: res.meansFrom, cv: res.cv });
      means.forEach(m => {
        const v = ent.get(m.entry);
        if (!v || !isFinite(m.mean)) return;
        cells.push({ env: E.key, i: v.i, j: v.j, y: m.mean, w: hasError ? (m.n || 1) : 1, entry: m.entry });
      });
    });
    return { parents, cells, envs, notes, entries: keep.size };
  }

  function analyse(method, opts) {
    opts = opts || {};
    const key = [B4.trait, method, opts.reciprocals || B4.recip, B4.F, B4.envMode].join('|');
    if (B4.cache.has(key)) return B4.cache.get(key);
    const b = buildCells(method, { reciprocals: opts.reciprocals || B4.recip });
    const res = Griffing.analyse({
      parents: b.parents, cells: b.cells, envs: b.envs, method,
      F: B4.F, alpha: B4.alpha, envRandom: B4.envMode === 'random', byEnv: b.envs.length > 1,
    });
    res.built = b;
    res.issues = (b.notes || []).concat(res.issues || []);
    B4.cache.set(key, res);
    return res;
  }

  /* ================= availability ================= */
  function status() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Cargue los datos en el Bloque 3: este bloque toma de ahí las medias ajustadas y el error de cada ambiente.', en: 'Load the data in Block 3: this block takes the adjusted means and the error of each environment from there.' };
    if (D.mating.design !== 'griffing') {
      const other = { partial: 6, nc1: 6, nc2: 6, nc3: 6, ttc: 6, lxt: 6, generations: 7, none: D.field.multiEnv ? 9 : 8 }[D.mating.design] || 3;
      return { ok: false, es: `Los datos cargados son de otro diseño (${T(D.mating.reasons[0] || { es: D.mating.design, en: D.mating.design })}). Los dialelos completos de Griffing se analizan aquí; ese diseño se analiza en el Bloque ${other}.`, en: `The data loaded belong to another design (${T(D.mating.reasons[0] || { es: D.mating.design, en: D.mating.design })}). Complete Griffing diallels are analysed here; that design is analysed in Block ${other}.` };
    }
    if (!D.ds.traits.length) return { ok: false, es: 'No hay variables respuesta.', en: 'There are no response traits.' };
    return { ok: true };
  }

  /* ================= 1 · setup ================= */
  function renderSetup() {
    const D = state.data, res = B4.res;
    const M = Griffing.METHODS[B4.method];
    const dataMethod = D.mating.method;
    el('b4Source').innerHTML = T(
      `Datos: <b>${esc(D.fileName || '')}</b> · ${D.mating.p} progenitores · ${D.ds.records.length} registros · reconocido como <b>método ${dataMethod}</b> de Griffing${D.field.multiEnv ? ` · ${D.field.envs.length} ambientes` : ''}.`,
      `Data: <b>${esc(D.fileName || '')}</b> · ${D.mating.p} parents · ${D.ds.records.length} records · recognised as Griffing's <b>Method ${dataMethod}</b>${D.field.multiEnv ? ` · ${D.field.envs.length} environments` : ''}.`);
    el('b4MethodNote').innerHTML = B4.method === dataMethod
      ? T('El método del diseño reconocido.', 'The method of the recognised design.')
      : T(`Se analiza un subconjunto de las entradas, con su propio error (así se compara con un experimento diseñado como método ${B4.method}).`, `A subset of the entries is analysed, with its own error (this compares with an experiment designed as Method ${B4.method}).`);
    el('b4RecipField').style.display = M.recip ? 'none' : (hasReciprocals() ? '' : 'none');
    el('b4EnvField').style.display = D.field.multiEnv ? '' : 'none';
    const main = res.main;
    const r = main.r, sc = B4.scale === 'mean' ? 1 / r : 1;
    const tiles = [
      ['Método y modelo', 'Method and model', T(`Método ${B4.method}`, `Method ${B4.method}`), T(`modelo ${B4.model} · ${T(M).replace(/^Método \d+: /, '')}`, `Model ${B4.model} · ${T(M).replace(/^Method \d+: /, '')}`)],
      ['Entradas analizadas', 'Entries analysed', String(res.cells.length / Math.max(1, res.e)), T(`${res.expected} esperadas · ${res.p} progenitores`, `${res.expected} expected · ${res.p} parents`), res.complete ? 'ok' : 'warn'],
      ['Media general', 'Grand mean', fmtNum(main.effects ? main.effects.mu.est : NaN, 3), T(`EE ${fmtNum(main.effects ? main.effects.mu.se : NaN, 3)}`, `SE ${fmtNum(main.effects ? main.effects.mu.se : NaN, 3)}`)],
      ['Error experimental', 'Experimental error', fmtNum(main.mse * (B4.scale === 'mean' ? 1 / r : 1), 4), T(`${main.dfe} gl · ${B4.scale === 'mean' ? 'escala de medias' : 'escala de parcelas'} · r = ${fmtNum(r, 2)}`, `${main.dfe} df · ${B4.scale === 'mean' ? 'entry-mean scale' : 'plot scale'} · r = ${fmtNum(r, 2)}`)],
    ];
    const gcaRow = main.anova.find(x => x.source === 'gca'), scaRow = main.anova.find(x => x.source === 'sca');
    if (gcaRow && scaRow) {
      const tot = main.entries ? main.entries.ss : gcaRow.ss + scaRow.ss;
      const pg = Math.round(100 * gcaRow.ss / tot), ps = Math.round(100 * scaRow.ss / tot);
      tiles.push(['ACG / ACE', 'GCA / SCA', T(`${pg} % / ${ps} %`, `${pg}% / ${ps}%`), T('de la suma de cuadrados entre entradas', 'of the sum of squares between entries')]);
    }
    if (main.genetic && isFinite(main.genetic.baker)) tiles.push(['Razón de Baker', 'Baker ratio', f2(main.genetic.baker), T('2σ²ACG/(2σ²ACG + σ²ACE)', '2σ²GCA/(2σ²GCA + σ²SCA)'), main.genetic.baker >= 0.5 ? 'ok' : '']);
    statTiles('b4Tiles', tiles);
    msg('b4SetupMsg', res.issues);
  }
  const hasReciprocals = () => {
    const D = state.data;
    if (!D) return false;
    const ix = new Map(D.mating.parents.map((x, k) => [x, k]));
    const seen = new Set();
    let both = false;
    D.ds.records.forEach(r => { const i = ix.get(r.female), j = ix.get(r.male); if (i == null || j == null || i === j) return; const k = i + '>' + j; seen.add(k); if (seen.has(j + '>' + i)) both = true; });
    return both;
  };

  /* ================= 2 · analysis of variance ================= */
  function renderAnova() {
    const res = B4.res, main = res.main, r = main.r;
    const sc = B4.scale === 'mean' ? 1 / r : 1;
    const rows = main.anova.map(x => Object.assign({}, x, { ss: x.ss * sc, ms: x.ms * sc }));
    /* entries and entries × environments, then the error and the total */
    const withSummary = [];
    rows.forEach(x => {
      if (x.source === 'gca' && main.entries) withSummary.push({ source: 'entries', df: main.entries.df, ss: main.entries.ss * sc, ms: main.entries.ms * sc, summary: true });
      if (x.source === 'gcaEnv' && main.entriesEnv) withSummary.push({ source: 'entriesEnv', df: main.entriesEnv.df, ss: main.entriesEnv.ss * sc, ms: main.entriesEnv.ms * sc, summary: true });
      withSummary.push(x);
    });
    withSummary.push({ source: 'error', df: main.dfe, ss: main.mse * main.dfe * sc, ms: main.mse * sc, residual: true });
    const modelI = B4.model === 'I';
    const envRandom = B4.envMode === 'random' && main.multiEnv;
    const key = modelI ? (envRandom ? 'E' : 'I') : 'II';
    const other = modelI ? 'II' : (envRandom ? 'E' : 'I');
    const denLabel = x => {
      const d = x['den' + key];
      if (!d) return '';
      if (d === 'quasi') return T('cuasi-F (Satterthwaite)', 'quasi-F (Satterthwaite)');
      return SRC(d).trim();
    };
    const cols = [
      { label: T('Fuente de variación', 'Source of variation'), get: x => (x.sub ? '&nbsp;&nbsp;' : '') + (x.summary || x.residual ? '<b>' + SRC(x.source).trim() + '</b>' : SRC(x.source).trim()) },
      { label: T('gl', 'df'), num: true, get: x => x.df },
      { label: T('SC', 'SS'), num: true, get: x => fmtNum(x.ss, 4) },
      { label: T('CM', 'MS'), num: true, get: x => fmtNum(x.ms, 4) },
      { label: T(`F · modelo ${modelI ? 'I' : 'II'}`, `F · Model ${modelI ? 'I' : 'II'}`), num: true, get: x => (isFinite(x['F' + key]) ? f2(x['F' + key]) : '') },
      { label: 'p', num: true, get: x => sig(x['p' + key]) },
      { label: T('Denominador', 'Denominator'), get: x => denLabel(x) },
      { label: T(`F · modelo ${modelI ? 'II' : 'I'}`, `F · Model ${modelI ? 'II' : 'I'}`), num: true, get: x => (isFinite(x['F' + other]) ? `${f2(x['F' + other])} ${stars(x['p' + other])}` : '') },
    ];
    withSummary.forEach(x => { x._cls = x.residual ? 'resid-row' : x.summary ? 'total-row' : ''; });
    table('b4AnovaTable', cols, withSummary);
    const notes = [];
    /* incomplete blocks: the error is the variance of the adjusted means, larger than the field mean square */
    const bEnvs = (res.built && res.built.envs) || [];
    const dfSum = bEnvs.reduce((s, e) => s + (e.dfe || 0), 0);
    const ratio = dfSum ? bEnvs.reduce((s, e) => s + e.mse * e.dfe, 0) / bEnvs.reduce((s, e) => s + (e.mseField || e.mse) * e.dfe, 0) : 1;
    const adjusted = ratio > 1.01;
    notes.push(B4.scale === 'mean'
      ? (adjusted
        ? T(`Sumas de cuadrados en la escala de medias de entrada; el error es ${fmtNum(main.mse / r, 4)} con ${main.dfe} gl.`, `Sums of squares on the entry-mean scale; the error is ${fmtNum(main.mse / r, 4)} with ${main.dfe} df.`)
        : T(`Sumas de cuadrados en la escala de medias de entrada; el error es CM<sub>error</sub>/r = ${fmtNum(main.mse / r, 4)} con ${main.dfe} gl.`, `Sums of squares on the entry-mean scale; the error is MS<sub>error</sub>/r = ${fmtNum(main.mse / r, 4)} with ${main.dfe} df.`))
      : (adjusted
        ? T(`Sumas de cuadrados en la escala de parcelas (× r = ${fmtNum(r, 2)}).`, `Sums of squares on the plot scale (× r = ${fmtNum(r, 2)}).`)
        : T(`Sumas de cuadrados en la escala de parcelas (× r = ${fmtNum(r, 2)}); el error es el cuadrado medio del diseño de campo.`, `Sums of squares on the plot scale (× r = ${fmtNum(r, 2)}); the error is the mean square of the field design.`)));
    if (adjusted) notes.push(T(`Las medias vienen de un diseño con bloques incompletos y son menos precisas que CM<sub>error</sub>/r: el error de este análisis es la varianza promedio de las medias ajustadas, ${fmtNum(100 * (ratio - 1), 0)} % mayor que el cuadrado medio intrabloque (Möhring y Piepho 2009).`, `The means come from an incomplete-block design and are less precise than MS<sub>error</sub>/r: the error of this analysis is the average variance of the adjusted means, ${fmtNum(100 * (ratio - 1), 0)}% larger than the intra-block mean square (Möhring & Piepho 2009).`));
    if (main.multiEnv) notes.push(T(`El error es el combinado de los ${res.envs.length} ambientes (${main.dfe} gl); los bloques de cada ambiente ya se descontaron en el Bloque 3.`, `The error is pooled over the ${res.envs.length} environments (${main.dfe} df); the blocks of each environment were already removed in Block 3.`));
    if (B4.method === 1 && !modelI) notes.push(T('En el método 1 la prueba F de la ACG del modelo II es aproximada: los coeficientes de σ²ACE difieren entre los cuadrados medios de ACG y ACE (Griffing 1956).', "In Method 1 the Model II F test of GCA is approximate: the σ²SCA coefficients differ between the GCA and SCA mean squares (Griffing 1956)."));
    if (envRandom) notes.push(T('Con ambientes aleatorios cada efecto genético se prueba contra su interacción con ambientes.', 'With random environments each genetic effect is tested against its interaction with environments.'));
    if (!modelI && main.multiEnv) notes.push(T('La ACG del modelo II se prueba con una cuasi-F (CM<sub>ACG</sub> / [CM<sub>ACG×A</sub> + CM<sub>ACE</sub> − CM<sub>ACE×A</sub>]) y grados de libertad de Satterthwaite.', 'Model II GCA is tested with a quasi-F (MS<sub>GCA</sub> / [MS<sub>GCA×E</sub> + MS<sub>SCA</sub> − MS<sub>SCA×E</sub>]) and Satterthwaite degrees of freedom.'));
    if (!res.complete) notes.push(T('Con entradas faltantes las sumas de cuadrados son secuenciales (tipo I) en el orden ACG → ACE → recíprocos.', 'With missing entries the sums of squares are sequential (type I) in the order GCA → SCA → reciprocals.'));
    el('b4AnovaNote').innerHTML = notes.join(' ');
    /* per environment */
    el('b4EnvBox').style.display = res.envs && res.envs.length > 1 ? '' : 'none';
    if (res.envs && res.envs.length > 1) {
      const per = [];
      res.envs.forEach(e => e.anova.forEach(x => {
        if (x.sub) return;
        per.push({ env: e.env, source: x.source, df: x.df, ss: x.ss / e.r, ms: x.ms / e.r, F: x.FI, p: x.pI });
      }));
      res.envs.forEach(e => per.push({ env: e.env, source: 'error', df: e.dfe, ss: e.mse * e.dfe / e.r, ms: e.mse / e.r, residual: true }));
      table('b4EnvTable', [
        { label: T('Ambiente', 'Environment'), get: x => esc(x.env) },
        { label: T('Fuente', 'Source'), get: x => SRC(x.source).trim() },
        { label: T('gl', 'df'), num: true, get: x => x.df },
        { label: T('SC (medias)', 'SS (means)'), num: true, get: x => fmtNum(x.ss, 4) },
        { label: T('CM', 'MS'), num: true, get: x => fmtNum(x.ms, 4) },
        { label: 'F', num: true, get: x => (isFinite(x.F) ? f2(x.F) : '') },
        { label: 'p', num: true, get: x => sig(x.p) },
      ], per);
    }
  }

  /* ================= 3 · effects ================= */
  function renderEffects() {
    const res = B4.res, main = res.main, eff = main.effects;
    if (!eff) { el('b4GcaTable').innerHTML = `<p class="hint">${T('No se pudieron estimar los efectos (diseño no conectado).', 'Effects could not be estimated (the design is not connected).')}</p>`; return; }
    const dir = B4.goal === 'low' ? -1 : 1;
    const gca = eff.gca.map(g => Object.assign({ name: pname(g.parent) }, g)).sort((a, b) => dir * (b.est - a.est));
    gca.forEach((g, k) => { g.rank = k + 1; });
    table('b4GcaTable', [
      { label: '#', num: true, get: g => g.rank },
      { label: T('Progenitor', 'Parent'), get: g => esc(g.name) },
      { label: 'ĝᵢ', num: true, get: g => fmtNum(g.est, 4) },
      { label: T('EE', 'SE'), num: true, get: g => fmtNum(g.se, 4) },
      { label: 't', num: true, get: g => f2(g.t) },
      { label: 'p', num: true, get: g => sig(g.p) },
    ], gca);
    /* simulated data: how close the estimates are to the effects that were drawn */
    const truth = state.data.truth && state.data.truth.gca;
    const pairs = truth ? eff.gca.filter(g => truth[pname(g.parent)] != null) : [];
    if (pairs.length >= 3) {
      const tv = pairs.map(g => truth[pname(g.parent)]);
      const m = S.mean(tv), v = tv.reduce((s, x) => s + (x - m) ** 2, 0) / (tv.length - 1);
      const rr = S.pearson(pairs.map(g => g.est), tv);
      el('b4TruthNote').innerHTML = T(`Datos simulados: la correlación entre ĝᵢ y la ACG verdadera es ${fmtFixed(rr, 3)} (${pairs.length} progenitores); la varianza de los efectos verdaderos sorteados es ${fmtFixed(v, 3)}.`, `Simulated data: the correlation between ĝᵢ and the true GCA is ${fmtFixed(rr, 3)} (${pairs.length} parents); the variance of the true effects drawn is ${fmtFixed(v, 3)}.`);
    } else el('b4TruthNote').innerHTML = '';
    table('b4DiffTable', [
      { label: T('Diferencia', 'Difference'), get: d => T(d) },
      { label: T('EE', 'SE'), num: true, get: d => fmtNum(d.se, 4) },
      { label: T(`DMS (${B4.alpha})`, `LSD (${B4.alpha})`), num: true, get: d => fmtNum(d.lsd, 4) },
    ], eff.diffs);
    const label = state.data.ds.traits[B4.trait].name;
    mountFig('b4FigGca', {
      title: () => T('Efectos de aptitud combinatoria general', 'General combining ability effects') + ' · ' + label, fileName: 'gca_effects',
      render: c => P4.effects(c, gca, { label, tcrit: eff.tcrit, lsd: eff.diffs[0] ? eff.diffs[0].lsd : NaN }),
      controls: () => [P2.titleControl(), { key: 'style', label: T('Estilo', 'Style'), type: 'select', options: [['points', T('puntos', 'points')], ['bars', T('barras', 'bars')]] }, { key: 'order', label: T('Orden', 'Order'), type: 'select', options: [['mean', T('por efecto', 'by effect')], ['name', T('por nombre', 'by name')]] }, { key: 'showCI', label: T('Intervalos de confianza', 'Confidence intervals'), type: 'checkbox' }, { key: 'showLsd', label: T('Banda de ± DMS/2', 'Band of ± LSD/2'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 900, height: Math.max(360, 140 + gca.length * 22), style: 'points', showCI: true, showLsd: true });
    /* SCA and reciprocal matrix */
    const cells = eff.sca.map(s => ({ i: s.i, j: s.j, est: s.est, se: s.se, p: s.p, kind: 'sca' }));
    if (eff.recip) eff.recip.forEach(x => cells.push({ i: x.i, j: x.j, est: x.est, se: x.se, p: x.p, kind: 'rec' }));
    mountFig('b4FigMatrix', {
      title: () => (eff.recip ? T('ACE (arriba) y efectos recíprocos (abajo)', 'SCA (above) and reciprocal effects (below)') : T('Efectos de aptitud combinatoria específica', 'Specific combining ability effects')) + ' · ' + label,
      fileName: 'sca_matrix',
      render: c => P4.matrix(c, { parents: res.parents, cells, hasRecip: !!eff.recip, label }),
      controls: () => [P2.titleControl(), P3.colormapControl(), { key: 'showValues', label: T('Mostrar valores', 'Show values'), type: 'checkbox' }],
    /* cells are at most 62 px: size the figure to the matrix so no blank band is left around it */
    }, { width: Math.max(480, Math.min(1080, 220 + res.p * 62)), height: Math.max(340, Math.min(1080, 150 + res.p * 62)), colormap: 'rdbu', showValues: true });
    const scas = eff.sca.map(s => Object.assign({ name: cross(s.i, s.j) }, s)).sort((a, b) => dir * (b.est - a.est));
    el('b4ScaCount').textContent = `(${scas.length})`;
    table('b4ScaTable', [
      { label: T('Cruza', 'Cross'), get: s => esc(s.name) + (s.self ? ` <span class="hint">(ŝᵢᵢ)</span>` : '') },
      { label: 'ŝᵢⱼ', num: true, get: s => fmtNum(s.est, 4) },
      { label: T('EE', 'SE'), num: true, get: s => fmtNum(s.se, 4) },
      { label: 't', num: true, get: s => f2(s.t) },
      { label: 'p', num: true, get: s => sig(s.p) },
    ], scas, 200);
    el('b4RecipBox').style.display = eff.recip ? '' : 'none';
    if (eff.recip) {
      table('b4MatTable', [
        { label: T('Progenitor', 'Parent'), get: m => esc(pname(m.parent)) },
        { label: 'm̂ᵢ', num: true, get: m => fmtNum(m.est, 4) },
        { label: T('EE', 'SE'), num: true, get: m => fmtNum(m.se, 4) },
        { label: 't', num: true, get: m => f2(m.t) },
        { label: 'p', num: true, get: m => sig(m.p) },
      ], eff.maternal);
      const recRows = eff.recip.map((x, k) => Object.assign({ name: cross(x.i, x.j), non: eff.nonmaternal[k] }, x));
      table('b4RecTable', [
        { label: T('Pareja (hembra × macho)', 'Pair (female × male)'), get: x => esc(x.name) },
        { label: 'r̂ᵢⱼ', num: true, get: x => fmtNum(x.est, 4) },
        { label: T('EE', 'SE'), num: true, get: x => fmtNum(x.se, 4) },
        { label: 'p', num: true, get: x => sig(x.p) },
        { label: 'n̂ᵢⱼ', num: true, get: x => fmtNum(x.non.est, 4) },
        { label: 'p', num: true, get: x => sig(x.non.p) },
      ], recRows, 200);
    }
    /* GCA in each environment */
    const show = res.envs && res.envs.length > 1 && res.envs.every(e => e.effects);
    el('b4FigEnvWrap').style.display = show ? '' : 'none';
    if (show) {
      const series = res.parents.map((nm, i) => ({ name: nm, values: res.envs.map(e => e.effects.gca[i].est) }));
      mountFig('b4FigGcaEnv', {
        title: () => T('ACG en cada ambiente', 'GCA in each environment') + ' · ' + label, fileName: 'gca_by_environment',
        render: c => P4.gcaEnv(c, series, { envs: res.envs.map(e => e.env), label: T('ĝᵢ', 'ĝᵢ') + ' · ' + label }),
        controls: () => [P2.titleControl(), P2.paletteControl()],
      }, { width: 900, height: 480 });
    }
  }

  /* ================= 4 · components and genetic parameters ================= */
  function renderParams() {
    const main = B4.res.main, comps = main.components, gen = main.genetic;
    const totalGen = comps.filter(c => ['g', 's', 'r'].includes(c.key)).reduce((s, c) => s + Math.max(0, c.value), 0);
    table('b4CompTable', [
      { label: T('Componente', 'Component'), get: c => T(c) },
      { label: T('Estimación', 'Estimate'), num: true, get: c => fmtNum(c.value, 4) + (c.value < 0 ? ' <span class="miss">†</span>' : '') },
      { label: T('EE', 'SE'), num: true, get: c => fmtNum(c.se, 4) },
      { label: '%', num: true, get: c => (['g', 's', 'r'].includes(c.key) && totalGen > 0 ? fmtNum(100 * Math.max(0, c.value) / totalGen, 1) : '') },
    ], comps);
    const rows = [
      ['σ²A', T('varianza aditiva = 4σ²ACG/(1 + F)', 'additive variance = 4σ²GCA/(1 + F)'), gen.s2A],
      ['σ²D', T('varianza de dominancia = 4σ²ACE/(1 + F)²', 'dominance variance = 4σ²SCA/(1 + F)²'), gen.s2D],
      [T('Razón de Baker', 'Baker ratio'), T('2σ²ACG/(2σ²ACG + σ²ACE)', '2σ²GCA/(2σ²GCA + σ²SCA)'), gen.baker],
      [T('Razón de Baker (cuadrados medios)', 'Baker ratio (mean squares)'), T('2CM<sub>ACG</sub>/(2CM<sub>ACG</sub> + CM<sub>ACE</sub>)', '2MS<sub>GCA</sub>/(2MS<sub>GCA</sub> + MS<sub>SCA</sub>)'), gen.bakerMS],
      [T('σ²ACG/σ²ACE', 'σ²GCA/σ²SCA'), T('predominio de efectos aditivos si > 1', 'additive effects predominate if > 1'), gen.ratio],
      [T('Grado medio de dominancia', 'Average degree of dominance'), '√(2σ²D/σ²A)', gen.dominance],
      [T('h² en sentido estrecho (parcela)', 'Narrow-sense h² (plot)'), 'σ²A/(σ²A + σ²D + σ²e)', gen.h2ns],
      [T('H² en sentido amplio (parcela)', 'Broad-sense H² (plot)'), '(σ²A + σ²D)/(σ²A + σ²D + σ²e)', gen.h2bs],
      [T('h² en medias de entrada', 'h² on an entry-mean basis'), T('con σ²e/(r·a)', 'with σ²e/(r·e)'), gen.h2nsMean],
      [T('H² en medias de entrada', 'H² on an entry-mean basis'), T('con σ²e/(r·a)', 'with σ²e/(r·e)'), gen.h2bsMean],
    ];
    table('b4GenTable', [
      { label: T('Parámetro', 'Parameter'), get: r => r[0] },
      { label: T('Definición', 'Definition'), get: r => `<span class="hint">${r[1]}</span>` },
      { label: T('Valor', 'Value'), num: true, get: r => fmtNum(r[2], 4) },
    ], rows);
    statTiles('b4GenTiles', [
      ['Varianza aditiva', 'Additive variance', fmtNum(gen.s2A, 3), T(`F = ${gen.F}`, `F = ${gen.F}`)],
      ['Varianza de dominancia', 'Dominance variance', fmtNum(gen.s2D, 3), gen.s2D < 0 ? T('estimación negativa', 'negative estimate') : ''],
      Number.isFinite(gen.baker)
        ? ['Razón de Baker', 'Baker ratio', f2(gen.baker), gen.baker >= 0.5 ? T('predominio aditivo', 'additive predominance') : T('predominio no aditivo', 'non-additive predominance'), gen.baker >= 0.5 ? 'ok' : 'warn']
        : ['Razón de Baker', 'Baker ratio', '—', T('no se calcula: hay un componente negativo', 'not computed: a component is negative')],
      ['h² (sentido estrecho)', 'h² (narrow sense)', f2(gen.h2ns), T('base parcela', 'plot basis')],
      ['H² (sentido amplio)', 'H² (broad sense)', f2(gen.h2bs), T('base parcela', 'plot basis')],
    ]);
    mountFig('b4FigComp', {
      title: () => T('Componentes de varianza', 'Variance components') + ' · ' + state.data.ds.traits[B4.trait].name, fileName: 'variance_components',
      render: c => P4.components(c, comps, { label: T('varianza', 'variance') }),
      controls: () => [P2.titleControl(), { key: 'withError', label: T('Incluir el error', 'Include the error'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 900, height: 420, withError: false });
    const notes = [];
    if (gen.negative) notes.push({ level: 'warning', es: 'Con componentes negativos las razones y las heredabilidades no se calculan: primero revise si el modelo (o el método elegido) describe estos datos.', en: 'With negative components the ratios and heritabilities are not computed: check first whether the model (or the chosen method) describes these data.' });
    if (comps.some(c => c.value < 0)) notes.push({ level: 'info', es: '† Hay componentes negativos: son estimaciones de momentos y se informan como salen. Un valor negativo indica que el componente es cercano a cero o que el modelo no describe bien los datos.', en: '† Some components are negative: these are moment estimates and are reported as obtained. A negative value means the component is close to zero or the model does not describe the data well.' });
    if (B4.model === 'I') notes.push({ level: 'warning', es: 'Con el modelo I los progenitores se eligieron a propósito: σ²ACG y σ²ACE describen solo a este grupo, y leerlas como σ²A y σ²D de una población exige que los progenitores sean una muestra aleatoria de ella (modelo II).', en: 'Under Model I the parents were chosen on purpose: σ²GCA and σ²SCA describe this set only, and reading them as the σ²A and σ²D of a population requires the parents to be a random sample of it (Model II).' });
    if (B4.method === 1 || B4.method === 2) notes.push({ level: 'info', es: 'Con progenitores incluidos (métodos 1 y 2) los componentes describen la población descendiente; para la población ancestral de la que se muestrearon los progenitores use los métodos 3 o 4 (Wright 1985; Kuehl y col. 1968).', en: 'With parents included (Methods 1 and 2) the components describe the descendant population; for the ancestral population from which the parents were sampled use Methods 3 or 4 (Wright 1985; Kuehl et al. 1968).' });
    notes.push({ level: 'info', es: `σ²A y σ²D suponen ausencia de epistasis, equilibrio de ligamiento y F = ${B4.F} en los progenitores. Con epistasis, σ²ACG y σ²ACE absorben parte de la varianza epistática.`, en: `σ²A and σ²D assume no epistasis, linkage equilibrium and F = ${B4.F} in the parents. With epistasis, σ²GCA and σ²SCA absorb part of the epistatic variance.` });
    msg('b4ParamMsg', notes);
  }

  /* ================= 5 · best parents and crosses ================= */
  function renderBest() {
    const res = B4.res, main = res.main, eff = main.effects, dir = B4.goal === 'low' ? -1 : 1;
    const n = +B4.topN || 0;
    const gca = eff.gca.map(g => Object.assign({ name: pname(g.parent) }, g)).sort((a, b) => dir * (b.est - a.est));
    table('b4RankTable', [
      { label: '#', num: true, get: (g, i) => g.rank },
      { label: T('Progenitor', 'Parent'), get: g => esc(g.name) },
      { label: 'ĝᵢ', num: true, get: g => fmtNum(g.est, 3) },
      { label: 'p', num: true, get: g => sig(g.p) },
      { label: T('Lectura', 'Reading'), get: g => (g.p < 0.05 ? (dir * g.est > 0 ? `<span class="pw ok">${T('favorable', 'favourable')}</span>` : `<span class="pw low">${T('desfavorable', 'unfavourable')}</span>`) : `<span class="pw mid">${T('sin diferencia', 'no difference')}</span>`) },
    ], gca.map((g, k) => Object.assign(g, { rank: k + 1 })));
    const pred = (res.predictions || []).map(x => Object.assign({ name: cross(x.i, x.j) }, x));
    const tested = pred.filter(x => x.tested).sort((a, b) => dir * (b.observed - a.observed));
    table('b4CrossTable', [
      { label: '#', num: true, get: (x, i) => x.rank },
      { label: T('Cruza', 'Cross'), get: x => esc(x.name) + (x.self ? ` <span class="hint">(${T('progenitor', 'parent')})</span>` : '') },
      { label: T('Media', 'Mean'), num: true, get: x => fmtNum(x.observed, 3) },
      { label: T('μ̂ + ĝᵢ + ĝⱼ', 'μ̂ + ĝᵢ + ĝⱼ'), num: true, get: x => fmtNum(x.predictedGca, 3) },
      { label: 'ŝᵢⱼ', num: true, get: x => fmtNum(x.sca, 3) },
      { label: 'p', num: true, get: x => sig(x.scaP) },
    ], tested.map((x, k) => Object.assign(x, { rank: k + 1 })), n || undefined);
    const untested = pred.filter(x => !x.tested && !x.self).sort((a, b) => dir * (b.predictedGca - a.predictedGca));
    el('b4UntestedBox').style.display = untested.length ? '' : 'none';
    if (untested.length) table('b4UntestedTable', [
      { label: '#', num: true, get: (x, i) => x.rank },
      { label: T('Cruza no evaluada', 'Cross not evaluated'), get: x => esc(x.name) },
      { label: T('Predicción', 'Prediction'), num: true, get: x => fmtNum(x.predictedGca, 3) },
      { label: T('EE', 'SE'), num: true, get: x => fmtNum(x.seGca, 3) },
    ], untested.map((x, k) => Object.assign(x, { rank: k + 1 })), n || undefined);
    const label = state.data.ds.traits[B4.trait].name;
    mountFig('b4FigObsPred', {
      title: () => T('Observado contra predicho', 'Observed against predicted') + ' · ' + label, fileName: 'observed_predicted',
      render: c => P4.observedPredicted(c, pred, { label }),
      controls: () => [P2.titleControl(), { key: 'withSca', label: T('Incluir la ACE en la predicción', 'Include SCA in the prediction'), type: 'checkbox' }, { key: 'labels', label: T('Cruzas etiquetadas', 'Labelled crosses'), type: 'number', min: 0, max: 40, step: 1 }, P2.paletteControl()],
    }, { width: 900, height: 520, labels: 6 });
    /* reading */
    /* only effects that are significant in the desired direction are "best" */
    const best = gca.slice(0, 3).filter(g => g.p < 0.05 && dir * g.est > 0);
    const bestCross = tested.slice(0, 3);
    const hi = B4.goal === 'low' ? T('más bajo', 'lowest') : T('más alto', 'highest');
    const parts = [];
    const bestNames = `<b>${best.map(g => esc(g.name)).join(', ')}</b>`;
    if (best.length) parts.push(best.length === 1
      ? T(`El progenitor con mejor aptitud combinatoria general es ${bestNames} (ĝ significativa a ${B4.alpha}).`, `The parent with the best general combining ability is ${bestNames} (ĝ significant at ${B4.alpha}).`)
      : T(`Los progenitores con mejor aptitud combinatoria general son ${bestNames} (ĝ significativa a ${B4.alpha}).`, `The parents with the best general combining ability are ${bestNames} (ĝ significant at ${B4.alpha}).`));
    else parts.push(T('Ningún progenitor tiene una ACG significativa en la dirección buscada.', 'No parent has a GCA that is significant in the desired direction.'));
    if (bestCross.length) parts.push(T(`Las cruzas con el valor ${hi} son <b>${bestCross.map(x => esc(x.name)).join(', ')}</b>.`, `The crosses with the ${hi} value are <b>${bestCross.map(x => esc(x.name)).join(', ')}</b>.`));
    const withSca = tested.filter(x => x.scaP < 0.05 && dir * x.sca > 0).sort((a, b) => dir * (b.sca - a.sca)).slice(0, 3);
    if (withSca.length) parts.push(T(`Combinaciones específicas destacadas (ACE significativa en la dirección buscada): <b>${withSca.map(x => esc(x.name)).join(', ')}</b>. Interesan para híbridos, no para seleccionar progenitores.`, `Outstanding specific combinations (SCA significant in the desired direction): <b>${withSca.map(x => esc(x.name)).join(', ')}</b>. They matter for hybrids, not for choosing parents.`));
    if (untested.length) parts.push(T(`De las ${untested.length} cruzas no evaluadas, la predicción más ${B4.goal === 'low' ? 'baja' : 'alta'} es <b>${esc(untested[0].name)}</b> (${fmtNum(untested[0].predictedGca, 3)} ± ${fmtNum(untested[0].seGca, 3)}).`, `Of the ${untested.length} crosses not evaluated, the ${B4.goal === 'low' ? 'lowest' : 'highest'} prediction is <b>${esc(untested[0].name)}</b> (${fmtNum(untested[0].predictedGca, 3)} ± ${fmtNum(untested[0].seGca, 3)}).`));
    if (eff.recip) {
      const rec = eff.recip.filter(x => x.p < 0.05);
      const mat = eff.maternal.filter(x => x.p < 0.05);
      if (rec.length) parts.push(T(`Hay ${plural(rec.length, 'efecto recíproco significativo', 'efectos recíprocos significativos')}${mat.length ? ` y ${plural(mat.length, 'efecto materno', 'efectos maternos')}` : ''}: conviene cuidar qué progenitor se usa como hembra.`, `There ${rec.length === 1 ? 'is' : 'are'} ${plural(rec.length, 'significant reciprocal effect', 'significant reciprocal effects')}${mat.length ? ` and ${plural(mat.length, 'maternal effect', 'maternal effects')}` : ''}: which parent is used as the female matters.`));
      else parts.push(T('Los efectos recíprocos no son significativos: la dirección de la cruza no cambia el resultado.', 'Reciprocal effects are not significant: the direction of the cross does not change the result.'));
    }
    el('b4Reading').innerHTML = parts.join(' ');
  }

  /* ================= 6 · comparison of the four methods ================= */
  function renderCompare() {
    const D = state.data;
    const avail = [1, 2, 3, 4].filter(m => {
      const M = Griffing.METHODS[m];
      if (M.selfs && !hasSelfs()) return false;
      if (M.recip && !hasReciprocals()) return false;
      return true;
    });
    const rows = [];
    avail.forEach(m => {
      let res;
      try { res = analyse(m); } catch (e) { return; }
      if (!res.main) return;
      const main = res.main, sc = B4.scale === 'mean' ? 1 / main.r : 1;
      const get = k => { const x = main.anova.find(z => z.source === k); return x ? x : null; };
      const comp = k => { const c = main.components.find(z => z.key === k); return c ? c.value : null; };
      const g = get('gca'), s = get('sca'), r = get('rec');
      rows.push({
        method: m, cells: res.cells.length / Math.max(1, res.e), expected: res.expected,
        dfe: main.dfe, mse: main.mse * sc,
        values: { gca: g ? g.ss * sc : null, sca: s ? s.ss * sc : null, rec: r ? r.ss * sc : null, g: comp('g'), s: comp('s'), r: comp('r') },
        gcaP: g ? g.pI : NaN, scaP: s ? s.pI : NaN, recP: r ? r.pI : NaN,
        baker: main.genetic.baker, s2A: main.genetic.s2A, s2D: main.genetic.s2D,
        current: m === B4.method,
      });
    });
    B4.compare = rows;
    const what = {
      1: ['población descendiente; incluye efectos maternos', 'descendant population; includes maternal effects'],
      2: ['población descendiente; sin efectos recíprocos', 'descendant population; no reciprocal effects'],
      3: ['población ancestral; con efectos maternos', 'ancestral population; with maternal effects'],
      4: ['población ancestral; el más eficiente por cruza', 'ancestral population; the most efficient per cross'],
    };
    table('b4CompareTable', [
      { label: T('Método', 'Method'), get: r => (r.current ? '<b>' : '') + T(`Método ${r.method}`, `Method ${r.method}`) + (r.current ? '</b>' : '') },
      { label: T('Entradas', 'Entries'), num: true, get: r => `${r.cells} / ${r.expected}` },
      { label: T('gl error', 'Error df'), num: true, get: r => r.dfe },
      { label: T('CM error', 'Error MS'), num: true, get: r => fmtNum(r.mse, 3) },
      { label: T('SC ACG', 'GCA SS'), num: true, get: r => (r.values.gca == null ? '' : fmtNum(r.values.gca, 2) + ' ' + stars(r.gcaP)) },
      { label: T('SC ACE', 'SCA SS'), num: true, get: r => (r.values.sca == null ? '' : fmtNum(r.values.sca, 2) + ' ' + stars(r.scaP)) },
      { label: T('SC recíprocos', 'Reciprocal SS'), num: true, get: r => (r.values.rec == null ? '' : fmtNum(r.values.rec, 2) + ' ' + stars(r.recP)) },
      { label: 'σ²ACG', num: true, get: r => fmtNum(r.values.g, 3) },
      { label: 'σ²ACE', num: true, get: r => fmtNum(r.values.s, 3) },
      { label: T('Baker', 'Baker'), num: true, get: r => f2(r.baker) },
      { label: T('Qué estima', 'What it estimates'), get: r => `<span class="hint">${T(what[r.method][0], what[r.method][1])}</span>` },
    ], rows);
    mountFig('b4FigMethods', {
      title: () => T('Comparación de los métodos de Griffing', "Comparison of Griffing's methods") + ' · ' + state.data.ds.traits[B4.trait].name, fileName: 'method_comparison',
      render: c => P4.methods(c, rows, { label: el('b4CompareShow').value === 'components' ? T('componente de varianza', 'variance component') : T('suma de cuadrados', 'sum of squares') }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 900, height: 460, show: el('b4CompareShow').value });
  }
  const hasSelfs = () => {
    const D = state.data;
    if (!D) return false;
    const P = new Set(D.mating.parents);
    return D.ds.records.some(r => r.female && r.female === r.male && P.has(r.female));
  };

  function renderNotes() {
    el('b4Notes').innerHTML = T(`
      <ul>
        <li><b>Modelo (Griffing 1956):</b> x̄ᵢⱼ = μ + gᵢ + gⱼ + sᵢⱼ + rᵢⱼ + ēᵢⱼ, con sᵢⱼ = sⱼᵢ y rᵢⱼ = −rⱼᵢ (los efectos recíprocos solo existen en los métodos 1 y 3). Restricciones: Σgᵢ = 0; Σⱼ sᵢⱼ = 0 en el método 1; 2sᵢᵢ + Σ_{j≠i} sᵢⱼ = 0 en el método 2 (sᵢᵢ cuenta dos veces); Σ_{j≠i} sᵢⱼ = 0 en los métodos 3 y 4.</li>
        <li><b>Estimación:</b> mínimos cuadrados ponderados por el número de parcelas de cada entrada, con las restricciones impuestas sobre una base del espacio nulo. Con datos completos y balanceados coincide con las fórmulas cerradas de Griffing y reproduce sus errores estándar; con cruzas faltantes o repeticiones desiguales sigue siendo válida y los errores estándar se ajustan.</li>
        <li><b>Efectos recíprocos:</b> rᵢⱼ = mᵢ − mⱼ + nᵢⱼ separa la parte materna (mᵢ, depende de quién fue la hembra) de la no materna (nᵢⱼ), como en Cockerham (1963) y en el análisis c/d de Hayman (1954).</li>
        <li><b>Modelo I:</b> los progenitores son los que interesan; se prueban efectos contra el error experimental. <b>Modelo II:</b> los progenitores son una muestra de una población; se estiman componentes de varianza con los cuadrados medios esperados de Griffing y la ACG se prueba contra la ACE (en el método 1 esa prueba es aproximada).</li>
        <li><b>Componentes:</b> σ²ACG = ¼(1 + F)σ²A y σ²ACE = [(1 + F)/2]²σ²D, de donde σ²A = 4σ²ACG/(1 + F) y σ²D = 4σ²ACE/(1 + F)² (Wright 1985; Griffing 1956). Razón de Baker (1978) = 2σ²ACG/(2σ²ACG + σ²ACE). Errores estándar de los componentes por la varianza de los cuadrados medios (2CM²/gl).</li>
        <li><b>Varios ambientes:</b> se analiza en dos etapas (medias ajustadas de cada ambiente del Bloque 3 y error combinado). El error de la segunda etapa es la varianza promedio de las medias ajustadas, en la escala de parcela: igual al cuadrado medio del error con bloques completos y mayor con bloques incompletos, cuyas medias son menos precisas (Möhring y Piepho 2009). Con ambientes aleatorios cada efecto se prueba contra su interacción; la ACG del modelo II usa una cuasi-F con grados de libertad de Satterthwaite (Singh 1973).</li>
        <li><b>Escala:</b> las sumas de cuadrados se muestran en la escala de medias de entrada (error = CM<sub>error</sub>/r) o de parcelas (× r); las pruebas F son idénticas.</li>
        <li><b>Referencias:</b> Griffing B (1956) Aust J Biol Sci 9:463–493 y Heredity 10:31–50; Cockerham CC (1963) en Statistical Genetics and Plant Breeding; Baker RJ (1978) Crop Sci 18:533–536; Wright AJ (1985) Theor Appl Genet 71:31–36; Kuehl RO, Rawlings JO, Cockerham CC (1968) Biometrics 24:881–901; Singh D (1973) Indian J Genet 33:469–481; Möhring J, Piepho HP (2009) Crop Sci 49:1977–1988; Möhring J, Melchinger AE, Piepho HP (2011) Crop Sci 51:470–478.</li>
      </ul>`, `
      <ul>
        <li><b>Model (Griffing 1956):</b> x̄ᵢⱼ = μ + gᵢ + gⱼ + sᵢⱼ + rᵢⱼ + ēᵢⱼ, with sᵢⱼ = sⱼᵢ and rᵢⱼ = −rⱼᵢ (reciprocal effects exist only in Methods 1 and 3). Restrictions: Σgᵢ = 0; Σⱼ sᵢⱼ = 0 in Method 1; 2sᵢᵢ + Σ_{j≠i} sᵢⱼ = 0 in Method 2 (sᵢᵢ counts twice); Σ_{j≠i} sᵢⱼ = 0 in Methods 3 and 4.</li>
        <li><b>Estimation:</b> least squares weighted by the number of plots of each entry, with the restrictions imposed on a basis of the null space. With complete balanced data it agrees with Griffing's closed forms and reproduces his standard errors; with missing crosses or unequal replication it stays valid and the standard errors adjust.</li>
        <li><b>Reciprocal effects:</b> rᵢⱼ = mᵢ − mⱼ + nᵢⱼ separates the maternal part (mᵢ, which depends on which parent was the female) from the non-maternal part (nᵢⱼ), as in Cockerham (1963) and Hayman's (1954) c/d analysis.</li>
        <li><b>Model I:</b> the parents themselves are of interest; effects are tested against the experimental error. <b>Model II:</b> the parents are a sample from a population; variance components are estimated from Griffing's expected mean squares and GCA is tested against SCA (in Method 1 that test is approximate).</li>
        <li><b>Components:</b> σ²GCA = ¼(1 + F)σ²A and σ²SCA = [(1 + F)/2]²σ²D, so σ²A = 4σ²GCA/(1 + F) and σ²D = 4σ²SCA/(1 + F)² (Wright 1985; Griffing 1956). Baker's (1978) ratio = 2σ²GCA/(2σ²GCA + σ²SCA). Standard errors of the components from the variance of the mean squares (2MS²/df).</li>
        <li><b>Several environments:</b> analysed in two stages (adjusted means of each environment from Block 3 and pooled error). The second-stage error is the average variance of the adjusted means on the plot scale: equal to the error mean square with complete blocks and larger with incomplete blocks, whose means are less precise (Möhring & Piepho 2009). With random environments each effect is tested against its interaction; Model II GCA uses a quasi-F with Satterthwaite degrees of freedom (Singh 1973).</li>
        <li><b>Scale:</b> sums of squares are shown on the entry-mean scale (error = MS<sub>error</sub>/r) or the plot scale (× r); the F tests are identical.</li>
        <li><b>References:</b> Griffing B (1956) Aust J Biol Sci 9:463–493 and Heredity 10:31–50; Cockerham CC (1963) in Statistical Genetics and Plant Breeding; Baker RJ (1978) Crop Sci 18:533–536; Wright AJ (1985) Theor Appl Genet 71:31–36; Kuehl RO, Rawlings JO, Cockerham CC (1968) Biometrics 24:881–901; Singh D (1973) Indian J Genet 33:469–481; Möhring J, Piepho HP (2009) Crop Sci 49:1977–1988; Möhring J, Melchinger AE, Piepho HP (2011) Crop Sci 51:470–478.</li>
      </ul>`);
  }

  /* ================= downloads ================= */
  function effectRows() {
    const res = B4.res, eff = res.main.effects;
    const rows = [[T('Tipo', 'Kind'), T('Entrada', 'Entry'), T('Estimación', 'Estimate'), T('EE', 'SE'), 't', 'p']];
    rows.push([T('media general', 'grand mean'), 'μ', eff.mu.est, eff.mu.se, eff.mu.t, eff.mu.p]);
    eff.gca.forEach(g => rows.push(['ACG / GCA', pname(g.parent), g.est, g.se, g.t, g.p]));
    eff.sca.forEach(s => rows.push(['ACE / SCA', cross(s.i, s.j), s.est, s.se, s.t, s.p]));
    if (eff.maternal) eff.maternal.forEach(m => rows.push([T('materno', 'maternal'), pname(m.parent), m.est, m.se, m.t, m.p]));
    if (eff.recip) eff.recip.forEach((x, k) => {
      rows.push([T('recíproco', 'reciprocal'), cross(x.i, x.j), x.est, x.se, x.t, x.p]);
      rows.push([T('no materno', 'non-maternal'), cross(x.i, x.j), eff.nonmaternal[k].est, eff.nonmaternal[k].se, eff.nonmaternal[k].t, eff.nonmaternal[k].p]);
    });
    return rows;
  }
  function downloadCsv(rows, name) { download(String.fromCharCode(0xFEFF) + rows.map(r => r.map(v => csvEscape(typeof v === 'number' ? +v.toPrecision(12) : v)).join(',')).join('\r\n'), name, 'text/csv;charset=utf-8'); }
  function downloadXlsx() {
    if (typeof XLSX === 'undefined') return;
    const res = B4.res, main = res.main, sc = B4.scale === 'mean' ? 1 / main.r : 1;
    const wb = XLSX.utils.book_new();
    const sheet = (rows, name) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
    const anova = [[T('Fuente', 'Source'), T('gl', 'df'), T('SC', 'SS'), T('CM', 'MS'), 'F (I)', 'p (I)', 'F (II)', 'p (II)']];
    main.anova.forEach(x => anova.push([SRC(x.source).trim(), x.df, x.ss * sc, x.ms * sc, x.FI, x.pI, x.FII, x.pII]));
    anova.push([SRC('error').trim(), main.dfe, main.mse * main.dfe * sc, main.mse * sc]);
    sheet(anova, T('ANOVA', 'ANOVA'));
    sheet(effectRows(), T('Efectos', 'Effects'));
    sheet([[T('Componente', 'Component'), T('Estimación', 'Estimate'), T('EE', 'SE')]].concat(main.components.map(c => [T(c), c.value, c.se])), T('Componentes', 'Components'));
    const gen = main.genetic;
    sheet([[T('Parámetro', 'Parameter'), T('Valor', 'Value')], ['F', gen.F], ['sigma2A', gen.s2A], ['sigma2D', gen.s2D], ['Baker', gen.baker], ['Baker (MS)', gen.bakerMS], ['sigma2GCA/sigma2SCA', gen.ratio], [T('grado de dominancia', 'degree of dominance'), gen.dominance], ['h2 (plot)', gen.h2ns], ['H2 (plot)', gen.h2bs], ['h2 (means)', gen.h2nsMean], ['H2 (means)', gen.h2bsMean]], T('Parámetros', 'Parameters'));
    const pr = [[T('Cruza', 'Cross'), T('Evaluada', 'Tested'), T('Media', 'Mean'), 'mu+gi+gj', T('EE', 'SE'), 'sca', T('EE ACE', 'SCA SE'), 'p']];
    (res.predictions || []).forEach(x => pr.push([cross(x.i, x.j), x.tested ? 1 : 0, x.observed, x.predictedGca, x.seGca, x.sca, x.scaSe, x.scaP]));
    sheet(pr, T('Cruzas', 'Crosses'));
    if (B4.compare) sheet([[T('Método', 'Method'), T('Entradas', 'Entries'), T('gl error', 'Error df'), T('CM error', 'Error MS'), 'SC ACG', 'SC ACE', 'SC rec', 'sigma2GCA', 'sigma2SCA', 'Baker']]
      .concat(B4.compare.map(r => [r.method, r.cells, r.dfe, r.mse, r.values.gca, r.values.sca, r.values.rec, r.values.g, r.values.s, r.baker])), T('Comparación', 'Comparison'));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('griffing_', 'griffing_') + (state.data.ds.traits[B4.trait].name || '')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderAll() {
    const st = status();
    ['b4Anova', 'b4Effects', 'b4Params', 'b4Best', 'b4Compare'].forEach(id => { el(id).style.display = st.ok ? '' : 'none'; });
    if (!st.ok) { el('b4Source').innerHTML = ''; el('b4Tiles').innerHTML = ''; msg('b4SetupMsg', [{ level: 'warning', es: st.es, en: st.en }]); return; }
    const D = state.data;
    if (B4.trait >= D.ds.traits.length) B4.trait = 0;
    if (!B4.method || !methodPossible(B4.method)) B4.method = D.mating.method;
    renderPickers();
    B4.res = analyse(B4.method);
    state.griffing = { trait: D.ds.traits[B4.trait].name, method: B4.method, model: B4.model, res: B4.res, compare: null };
    renderSetup();
    if (!B4.res.main) { ['b4Anova', 'b4Effects', 'b4Params', 'b4Best', 'b4Compare'].forEach(id => { el(id).style.display = 'none'; }); return; }
    renderAnova();
    renderEffects();
    renderParams();
    renderBest();
    renderCompare();
    state.griffing.compare = B4.compare;
    renderNext();
    document.dispatchEvent(new CustomEvent('griffingchange'));
  }
  function methodPossible(m) {
    const M = Griffing.METHODS[m];
    if (M.selfs && !hasSelfs()) return false;
    if (M.recip && !hasReciprocals()) return false;
    return true;
  }
  function renderPickers() {
    const D = state.data;
    el('b4Trait').innerHTML = D.ds.traits.map((t, i) => `<option value="${i}"${i === B4.trait ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    el('b4Method').innerHTML = [1, 2, 3, 4].filter(methodPossible).map(m => `<option value="${m}"${m === B4.method ? ' selected' : ''}>${T(Griffing.METHODS[m])}${m === D.mating.method ? T(' (diseño reconocido)', ' (recognised design)') : ''}</option>`).join('');
    el('b4Model').value = B4.model;
    el('b4Recip').value = B4.recip;
    el('b4EnvMode').value = B4.envMode;
    el('b4F').value = B4.F;
    el('b4Scale').value = B4.scale;
    el('b4Alpha').value = String(B4.alpha);
    el('b4Goal').value = B4.goal;
    el('b4TopN').value = String(B4.topN);
  }
  function renderNext() {
    const s = STEPS[4];
    el('b4Next').disabled = !s.ready;
    el('b4NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque 5, en construcción)`, `Next: ${s.en} (Block 5, under construction)`);
  }

  function init() {
    if (!el('b4Setup')) return;
    renderNotes();
    const soft = () => { B4.cache.clear(); renderAll(); };
    el('b4Trait').addEventListener('change', () => { B4.trait = +el('b4Trait').value; renderAll(); });
    el('b4Method').addEventListener('change', () => { B4.method = +el('b4Method').value; renderAll(); });
    el('b4Recip').addEventListener('change', () => { B4.recip = el('b4Recip').value; soft(); });
    el('b4Model').addEventListener('change', () => { B4.model = el('b4Model').value; renderAll(); });
    el('b4EnvMode').addEventListener('change', () => { B4.envMode = el('b4EnvMode').value; soft(); });
    el('b4F').addEventListener('change', () => { B4.F = Math.max(0, Math.min(1, parseFloat(el('b4F').value) || 0)); soft(); });
    el('b4Scale').addEventListener('change', () => { B4.scale = el('b4Scale').value; renderAll(); });
    el('b4Alpha').addEventListener('change', () => { B4.alpha = parseFloat(el('b4Alpha').value); soft(); });
    el('b4Goal').addEventListener('change', () => { B4.goal = el('b4Goal').value; renderBest(); renderEffects(); });
    el('b4TopN').addEventListener('change', () => { B4.topN = +el('b4TopN').value; renderBest(); });
    el('b4CompareShow').addEventListener('change', () => { delete Fig.registry.b4FigMethods; renderCompare(); });
    el('b4DlXlsx').addEventListener('click', downloadXlsx);
    el('b4DlEffects').addEventListener('click', () => downloadCsv(effectRows(), slug(T('efectos_griffing', 'griffing_effects')) + '.csv'));
    el('b4Back').addEventListener('click', () => goStep(3));
    el('b4Next').addEventListener('click', () => { if (STEPS[4].ready) goStep(5); });
    document.addEventListener('datachange', () => { B4.cache.clear(); B4.method = null; if (document.getElementById('panel-4').classList.contains('active')) renderAll(); else B4.built = false; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 4) { if (!B4.built || !B4.res) { B4.built = true; renderAll(); } } });
    document.addEventListener('langchange', () => { renderNotes(); if (B4.res && document.getElementById('panel-4')) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
