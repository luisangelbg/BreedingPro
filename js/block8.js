/* BreedingPro — Block 8 interface: genetic parameters and selection. Heritability with its
   interval, coefficients of variation and genetic advance for every trait; genotypic,
   phenotypic and environmental correlations with path analysis; selection indices and the
   genotypes they choose; and the expected gain of the recurrent-selection methods. */

(function () {
  const B8 = {
    env: null, p: 0.05, alpha: 0.05, intensity: 'infinite', traits: null,
    corrKind: 'G', pathY: null, pathBasis: 'G', ridge: 0,
    setup: {}, rankIndex: 'sh', res: null, cache: new Map(), built: false,
    fehr: null,
  };
  window.B8 = B8;

  const f2 = x => fmtFixed(x, 2), f3 = x => fmtFixed(x, 3);
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
  const pm = (v, se, d) => (isFinite(v) ? `${fmtNum(v, d || 3)}${isFinite(se) ? ` <span class="hint">± ${fmtNum(se, d || 3)}</span>` : ''}` : '');

  /* ================= data ================= */
  function status() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Cargue los datos en el Bloque 3.', en: 'Load the data in Block 3.' };
    if (D.mating.design === 'generations') return { ok: false, es: 'Las generaciones se analizan en el Bloque 7; aquí se necesitan genotipos (líneas, híbridos, familias, clones) evaluados en un ensayo.', en: 'Generations are analysed in Block 7; this block needs genotypes (lines, hybrids, families, clones) evaluated in a trial.' };
    if (!D.ds.traits.length) return { ok: false, es: 'No hay variables respuesta.', en: 'There are no response traits.' };
    return { ok: true };
  }

  /* the analysis of one trait (a real one or the sum of two) on the chosen environments,
     reduced to the mean squares that the parameters need */
  function analysisOf(t, synthetic) {
    const D = state.data, rec = { field: D.field };
    const envs = D.field.envs;
    const all = B8.env === '__all' && envs.length > 1;
    const wanted = all ? envs : envs.filter(e => e.key === B8.env);
    const per = wanted.map(E => Trial.analyseEnv(D.ds, E, t, { heritability: !synthetic, excluded: D.excluded, externalError: D.external }));
    const out = { design: per[0] && per[0].design, per };
    if (all) {
      const comb = Trial.combined(D.ds, rec.field, t, per, {});
      if (!comb || !comb.anova) return null;
      const row = k => comb.anova.find(r => r.source === k);
      const g = row('entry') || row('entryAdj'), ge = row('entryEnv'), er = row('pooled');
      if (!g || !ge || !er) return null;
      const ok = per.filter(r => !r.error);
      out.ms = { G: g.ms, GE: ge.ms, E: er.ms };
      out.df = { G: g.df, GE: ge.df, E: er.df };
      out.e = ok.length;
      out.r = ok.reduce((s, r) => s + r.harmonicReps, 0) / ok.length;
      out.mean = comb.mean;
      out.means = comb.means;
      out.adjusted = !!row('entryAdj');
      return out;
    }
    const res = per[0];
    if (!res || res.error) return null;
    if (res.design === 'means' || res.design === 'unreplicated') {
      /* only means with an external error: the variance among means plays the role of M_G */
      if (!(res.mseMeans > 0)) return null;
      const m = res.means.map(x => x.mean).filter(isFinite);
      const mm = m.reduce((s, v) => s + v, 0) / m.length;
      out.ms = { G: m.reduce((s, v) => s + (v - mm) * (v - mm), 0) / (m.length - 1), E: res.mseMeans };
      out.df = { G: m.length - 1, E: res.dfe };
      out.r = 1; out.e = 1; out.mean = mm; out.means = res.means; out.meansOnly = true;
      return out;
    }
    const g = res.anova.find(r => r.source === 'entry' || r.source === 'entryAdj');
    const er = res.anova.find(r => r.source === 'residual');
    if (!g || !er) return null;
    out.ms = { G: g.ms, E: er.ms }; out.df = { G: g.df, E: er.df };
    out.r = res.harmonicReps; out.e = 1;
    out.mean = res.mean; out.means = res.means;
    out.adjusted = g.source === 'entryAdj';
    out.reml = res.h2 || null;
    return out;
  }

  const checkSet = () => new Set(Data.entryTable(state.data.ds).filter(e => e.type === 'check').map(e => e.name));
  const intensityNow = nGen => {
    if (B8.intensity === 'finite' && nGen > 1) {
      const N = Math.max(1, Math.round(B8.p * nGen));
      const fi = SEL.intensityFinite(N, nGen);
      return { k: isFinite(fi.exact) ? fi.exact : fi.burrows, finite: fi, N, M: nGen };
    }
    return { k: SEL.intensity(B8.p) };
  };

  function analyse() {
    const key = [B8.env, B8.p, B8.alpha, B8.intensity].join('|');
    if (B8.cache.has(key)) return B8.cache.get(key);
    const D = state.data;
    const traits = D.ds.traits;
    const res = { params: [], issues: [] };
    const checks = checkSet();
    let nGen = 0;
    traits.forEach((t, j) => {
      const a = analysisOf(t, false);
      if (!a || !a.ms || !(a.ms.G > 0)) { res.params.push({ j, name: t.name, missing: true }); return; }
      nGen = Math.max(nGen, (a.means || []).filter(m => !checks.has(m.entry)).length);
      const par = SEL.parameters({ ms: a.ms, df: a.df, r: a.r, e: a.e, mean: a.mean, p: B8.p, alpha: B8.alpha });
      res.params.push(Object.assign({ j, name: t.name, a, mean: a.mean }, par));
    });
    res.nGen = nGen;
    res.intensity = intensityNow(nGen);
    /* genetic advance with the intensity actually chosen */
    res.params.forEach(p => { if (!p.missing) { p.i = res.intensity.k; p.ga = p.i * Math.sqrt(p.s2pMean) * Math.max(0, p.h2mean); p.gaPct = 100 * p.ga / Math.abs(p.mean); } });
    if (res.params.some(p => p.a && p.a.adjusted)) res.issues.push({ level: 'info', es: 'Con bloques incompletos el cuadrado medio de entradas está ajustado por bloques: los componentes por momentos son aproximados; la heredabilidad de Cullis por REML (columna aparte) es la recomendable.', en: 'With incomplete blocks the entry mean square is adjusted for blocks: the moment components are approximate; the REML heritability of Cullis (separate column) is the recommended one.' });
    B8.cache.set(key, res);
    return res;
  }

  /* the covariance matrices of the chosen traits, on the plots where all of them were measured */
  function multiTrait() {
    const D = state.data;
    const idx = B8.traits.filter(j => D.ds.traits[j]);
    const key = ['mt', B8.env, idx.join(',')].join('|');
    if (B8.cache.has(key)) return B8.cache.get(key);
    if (idx.length < 2) return null;
    const n = D.ds.records.length;
    const keep = new Uint8Array(n);
    for (let k = 0; k < n; k++) keep[k] = idx.every(j => isFinite(D.ds.traits[j].y[k])) ? 1 : 0;
    const tr = idx.map(j => ({ name: D.ds.traits[j].name, y: Float64Array.from(D.ds.traits[j].y, (v, k) => (keep[k] ? v : NaN)) }));
    const A = tr.map(t => analysisOf(t, true));
    if (A.some(a => !a || !a.ms)) return null;
    const multi = A[0].ms.GE != null;
    const t = tr.length;
    const mk = () => Array.from({ length: t }, () => new Array(t).fill(0));
    const MG = mk(), MD = mk(), ME = mk();
    for (let x = 0; x < t; x++) {
      MG[x][x] = A[x].ms.G; ME[x][x] = A[x].ms.E; MD[x][x] = multi ? A[x].ms.GE : A[x].ms.E;
      for (let y = x + 1; y < t; y++) {
        const s = { name: tr[x].name + '+' + tr[y].name, y: Float64Array.from(tr[x].y, (v, k) => v + tr[y].y[k]) };
        const as = analysisOf(s, true);
        if (!as || !as.ms) return null;
        const cp = src => (as.ms[src] - A[x].ms[src] - A[y].ms[src]) / 2;
        MG[x][y] = MG[y][x] = cp('G');
        ME[x][y] = ME[y][x] = cp('E');
        MD[x][y] = MD[y][x] = multi ? cp('GE') : cp('E');
      }
    }
    const a0 = A[0];
    const kk = a0.r * a0.e;
    const C = SEL.correlations({ G: { m: MG, df: a0.df.G }, D: { m: MD, df: multi ? a0.df.GE : a0.df.E }, E: { m: ME, df: a0.df.E } }, kk);
    /* entry means of every genotype for the chosen traits */
    const checks = checkSet();
    const byEntry = new Map();
    A.forEach((a, q) => (a.means || []).forEach(m => {
      if (checks.has(m.entry) || !isFinite(m.mean)) return;
      if (!byEntry.has(m.entry)) byEntry.set(m.entry, new Array(t).fill(NaN));
      byEntry.get(m.entry)[q] = m.mean;
    }));
    const names = [...byEntry.keys()].filter(e => byEntry.get(e).every(isFinite)).sort(LM.natCmp);
    const X = names.map(e => byEntry.get(e));
    const h2 = A.map(a => 1 - (multi ? a.ms.GE : a.ms.E) / a.ms.G);
    const out = { idx, names: tr.map(x => x.name), C, A, multi, genotypes: names, X, h2, dropped: n - keep.reduce((s, v) => s + v, 0) };
    B8.cache.set(key, out);
    return out;
  }

  /* ================= 1 · genetic parameters ================= */
  function renderParams() {
    const res = B8.res, D = state.data;
    const envTxt = B8.env === '__all' ? T(`${D.field.envs.length} ambientes combinados`, `${D.field.envs.length} environments combined`) : (D.field.envs.find(e => e.key === B8.env) || {}).name || '';
    el('b8Source').innerHTML = T(
      `Datos: <b>${esc(D.fileName || D.ds.fileName || '')}</b> · ${res.nGen} genotipos · ${D.ds.traits.length} variables · ${esc(envTxt)} · proporción seleccionada ${fmtNum(100 * B8.p, 1)} % → intensidad ${fmtNum(res.intensity.k, 4)}${res.intensity.N ? ` (${res.intensity.N} de ${res.intensity.M}, finita)` : ''}.`,
      `Data: <b>${esc(D.fileName || D.ds.fileName || '')}</b> · ${res.nGen} genotypes · ${D.ds.traits.length} traits · ${esc(envTxt)} · proportion selected ${fmtNum(100 * B8.p, 1)} % → intensity ${fmtNum(res.intensity.k, 4)}${res.intensity.N ? ` (${res.intensity.N} of ${res.intensity.M}, finite)` : ''}.`);
    const multi = res.params.some(p => p.multi);
    const cols = [
      { label: T('Variable', 'Trait'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => (r.missing ? '' : fmtNum(r.mean, 4)) },
      { label: 'σ²G', num: true, get: r => (r.missing ? '' : pm(r.s2g, r.seS2g, 4)) },
    ];
    if (multi) cols.push({ label: 'σ²GA', num: true, get: r => (r.missing ? '' : pm(r.s2ge, r.seS2ge, 4)) });
    cols.push(
      { label: 'σ²e', num: true, get: r => (r.missing ? '' : fmtNum(r.s2e, 4)) },
      { label: T('H² parcela', 'H² plot'), num: true, get: r => (r.missing ? '' : f3(r.h2plot)) },
      { label: T('H² medias', 'H² means'), num: true, get: r => (r.missing ? '' : pm(r.h2mean, r.seH2mean)) },
      { label: T(`IC ${fmtNum(100 * (1 - B8.alpha), 0)} % (Knapp)`, `${fmtNum(100 * (1 - B8.alpha), 0)} % CI (Knapp)`), num: true, get: r => (r.missing || !isFinite(r.knapp.lo) ? '' : `${f3(r.knapp.lo)} – ${f3(r.knapp.hi)}`) },
    );
    if (res.params.some(p => p.a && p.a.reml)) cols.push({ label: T('H² Cullis (REML)', 'H² Cullis (REML)'), num: true, get: r => (r.a && r.a.reml ? f3(r.a.reml.cullis) : '') });
    cols.push(
      { label: 'CVg %', num: true, get: r => (r.missing ? '' : f2(r.gcv)) },
      { label: 'CVf %', num: true, get: r => (r.missing ? '' : f2(r.pcv)) },
      { label: 'CVe %', num: true, get: r => (r.missing ? '' : f2(r.ecv)) },
      { label: T('AG', 'GA'), num: true, get: r => (r.missing ? '' : fmtNum(r.ga, 4)) },
      { label: T('AG %', 'GA %'), num: true, get: r => (r.missing ? '' : f2(r.gaPct)) },
      { label: T('p (F de genotipos)', 'p (F of genotypes)'), num: true, get: r => (r.missing ? '' : sig(r.pF)) },
    );
    table('b8ParamTable', cols, res.params);
    const notes = res.issues.slice();
    const neg = res.params.filter(p => p.negative && !p.missing);
    if (neg.length) notes.push({ level: 'warning', es: `σ²G negativo en ${neg.map(p => p.name).join(', ')}: la heredabilidad se informa pero la ganancia genética se toma como cero.`, en: `Negative σ²G in ${neg.map(p => p.name).join(', ')}: heritability is reported but the genetic advance is taken as zero.` });
    if (res.params.some(p => !p.missing && p.knapp.lo < 0)) notes.push({ level: 'info', es: 'Algún límite inferior del intervalo de Knapp es negativo: se muestra tal cual, porque truncarlo en cero cambiaría su cobertura.', en: 'Some lower limits of the Knapp interval are negative: they are shown as they are, because truncating them at zero would change their coverage.' });
    msg('b8ParamMsg', notes);
    el('b8ParamNote').innerHTML = T(
      `H² medias = σ²G/σ²F̄ = 1 − ${multi ? 'CM<sub>GA</sub>' : 'CM<sub>e</sub>'}/CM<sub>G</sub>, con σ²F̄ = CM<sub>G</sub>/${multi ? 're' : 'r'}; su error estándar por el método delta y el intervalo exacto de Knapp, Stroup y Ross (1985). CVg, CVf y CVe según Burton y DeVane (1953), con CVf en base de medias. Avance genético AG = i·σF̄·H² (Johnson, Robinson y Comstock 1955) en la misma base que H², con i = ${fmtNum(res.intensity.k, 4)}.`,
      `H² means = σ²G/σ²P̄ = 1 − ${multi ? 'MS<sub>GE</sub>' : 'MS<sub>e</sub>'}/MS<sub>G</sub>, with σ²P̄ = MS<sub>G</sub>/${multi ? 're' : 'r'}; its standard error by the delta method and the exact interval of Knapp, Stroup & Ross (1985). CVg, CVp and CVe after Burton & DeVane (1953), with CVp on the entry-mean basis. Genetic advance GA = i·σP̄·H² (Johnson, Robinson & Comstock 1955) on the same basis as H², with i = ${fmtNum(res.intensity.k, 4)}.`);
    mountFig('b8FigH2', {
      title: () => T('Heredabilidad en base de medias', 'Entry-mean heritability'), fileName: 'heritability',
      render: c => P8.h2(c, res.params.filter(p => !p.missing).map(p => ({ name: p.name, h2: p.h2mean, lo: p.knapp.lo, hi: p.knapp.hi })), {}),
      controls: () => [P2.titleControl(), { key: 'showClasses', label: T('Clases 0.3 y 0.6', 'Classes 0.3 and 0.6'), type: 'checkbox' }, { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 760, height: Math.max(360, 120 + 26 * res.params.length), flip: true, showClasses: true });
    /* the intensity: exact, finite and the table the literature prints */
    const fi = res.nGen > 1 ? SEL.intensityFinite(Math.max(1, Math.round(B8.p * res.nGen)), res.nGen) : null;
    const rows = [0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5].map(p => ({ p, i: SEL.intensity(p) }));
    table('b8IntensityTable', [
      { label: T('Proporción seleccionada', 'Proportion selected'), num: true, get: r => fmtNum(100 * r.p, 0) + ' %' },
      { label: T('Intensidad i (población infinita)', 'Intensity i (infinite population)'), num: true, get: r => fmtNum(r.i, 4) },
    ], rows);
    el('b8IntensityNote').innerHTML = fi ? T(
      `Con ${res.nGen} genotipos y ${plural(Math.max(1, Math.round(B8.p * res.nGen)), 'seleccionado', 'seleccionados')} la intensidad exacta es ${fmtNum(fi.exact, 4)} (media esperada de los mejores de ${res.nGen} normales), la aproximación de Burrows (1972) ${fmtNum(fi.burrows, 4)} y la de Bulmer (1980) ${fmtNum(fi.bulmer, 4)}, contra ${fmtNum(fi.i, 4)} de una población infinita.`,
      `With ${res.nGen} genotypes and ${Math.max(1, Math.round(B8.p * res.nGen))} selected the exact intensity is ${fmtNum(fi.exact, 4)} (the expected mean of the best of ${res.nGen} normals), Burrows's (1972) approximation ${fmtNum(fi.burrows, 4)} and Bulmer's (1980) ${fmtNum(fi.bulmer, 4)}, against ${fmtNum(fi.i, 4)} for an infinite population.`) : '';
  }

  /* ================= 2 · correlations and path analysis ================= */
  function traitPicker(host, sel, onChange) {
    const D = state.data;
    el(host).innerHTML = D.ds.traits.map((t, j) => `<label class="chip-check"><input type="checkbox" data-j="${j}"${sel.includes(j) ? ' checked' : ''}> ${esc(t.name)}</label>`).join('');
    el(host).querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
      const js = [...el(host).querySelectorAll('input:checked')].map(i => +i.dataset.j);
      onChange(js);
    }));
  }
  function renderCorr() {
    const D = state.data;
    traitPicker('b8TraitPick', B8.traits, js => { B8.traits = js; renderCorr(); renderIndices(); });
    const mt = multiTrait();
    el('b8CorrBox').style.display = mt ? '' : 'none';
    if (!mt) { msg('b8CorrMsg', [{ level: 'info', es: 'Elija al menos dos variables.', en: 'Choose at least two traits.' }]); return; }
    const C = mt.C, names = mt.names, t = names.length;
    /* one table: genotypic above the diagonal, phenotypic below */
    const rows = names.map((nm, x) => ({ nm, x }));
    table('b8CorrTable', [{ label: '', get: r => `<b>${esc(r.nm)}</b>` }].concat(names.map((nm, y) => ({
      label: esc(nm), num: true,
      get: r => {
        if (r.x === y) return '1';
        if (y > r.x) { const v = C.rG[r.x][y]; return isFinite(v) ? `${Math.abs(v) > 1 ? '<span class="pw low">' : ''}${f2(v)}${Math.abs(v) > 1 ? '</span>' : ''}<span class="hint"> ±${f2(C.seG[r.x][y])}</span>` : '—'; }
        const v = C.rP[r.x][y]; return `<i>${f2(v)}</i><span class="hint"> ±${f2(C.seP[r.x][y])}</span>`;
      },
    }))), rows);
    table('b8CorrETable', [{ label: '', get: r => `<b>${esc(r.nm)}</b>` }].concat(names.map((nm, y) => ({
      label: esc(nm), num: true, get: r => (r.x === y ? '1' : `${f2(C.rE[r.x][y])}<span class="hint"> ±${f2(C.seE[r.x][y])}</span>`),
    }))), rows);
    const notes = [];
    if (C.outOfBounds.length) notes.push({ level: 'warning', es: `${plural(C.outOfBounds.length, 'correlación genotípica', 'correlaciones genotípicas')} fuera de [−1, 1]: es un resultado conocido de los estimadores de momentos cuando σ²G es pequeña; no se trunca.`, en: `${plural(C.outOfBounds.length, 'genotypic correlation', 'genotypic correlations')} outside [−1, 1]: a known outcome of the moment estimators when σ²G is small; it is not truncated.` });
    if (mt.dropped) notes.push({ level: 'info', es: `${plural(mt.dropped, 'registro sin todas las variables elegidas queda fuera', 'registros sin todas las variables elegidas quedan fuera')}, para que todas las covarianzas usen las mismas parcelas.`, en: `${plural(mt.dropped, 'record without every chosen trait is left out', 'records without every chosen trait are left out')}, so that every covariance uses the same plots.` });
    notes.push({ level: 'info', es: `Arriba de la diagonal, correlación genotípica r<sub>G</sub> = σ<sub>G,xy</sub>/√(σ²<sub>G,x</sub>σ²<sub>G,y</sub>); abajo, fenotípica en base de medias r<sub>F</sub> = PCM<sub>G</sub>/√(CM<sub>G,x</sub>CM<sub>G,y</sub>). Los productos cruzados medios salen del análisis de la suma de las dos variables: PCM = (CM<sub>x+y</sub> − CM<sub>x</sub> − CM<sub>y</sub>)/2. Errores estándar por el método delta con los momentos de Wishart de cuadrados medios y productos cruzados.`, en: `Above the diagonal, genotypic correlation r<sub>G</sub> = σ<sub>G,xy</sub>/√(σ²<sub>G,x</sub>σ²<sub>G,y</sub>); below, phenotypic on the entry-mean basis r<sub>P</sub> = MCP<sub>G</sub>/√(MS<sub>G,x</sub>MS<sub>G,y</sub>). The mean cross-products come from the analysis of the sum of the two traits: MCP = (MS<sub>x+y</sub> − MS<sub>x</sub> − MS<sub>y</sub>)/2. Standard errors by the delta method with the Wishart moments of mean squares and cross-products.` });
    msg('b8CorrMsg', notes);
    const R = B8.corrKind === 'P' ? C.rP : B8.corrKind === 'E' ? C.rE : C.rG;
    const SE = B8.corrKind === 'P' ? C.seP : B8.corrKind === 'E' ? C.seE : C.seG;
    mountFig('b8FigCorr', {
      title: () => (B8.corrKind === 'P' ? T('Correlaciones fenotípicas', 'Phenotypic correlations') : B8.corrKind === 'E' ? T('Correlaciones ambientales', 'Environmental correlations') : T('Correlaciones genotípicas', 'Genotypic correlations')),
      fileName: 'correlations',
      render: c => P8.corr(c, names, R, { se: SE, kind: B8.corrKind }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: Math.max(460, 200 + 64 * names.length), height: Math.max(360, 140 + 64 * names.length), colormap: 'rdbu' });
    renderPath(mt);
  }
  function renderPath(mt) {
    const names = mt.names, t = names.length;
    if (B8.pathY == null || B8.pathY >= t) B8.pathY = t - 1;
    el('b8PathY').innerHTML = names.map((nm, q) => `<option value="${q}"${q === B8.pathY ? ' selected' : ''}>${esc(nm)}</option>`).join('');
    el('b8PathBasis').value = B8.pathBasis;
    el('b8Ridge').value = String(B8.ridge);
    const Rfull = B8.pathBasis === 'P' ? mt.C.rP : mt.C.rG;
    const xs = names.map((_, q) => q).filter(q => q !== B8.pathY);
    if (xs.length < 1) { el('b8PathTable').innerHTML = ''; return; }
    const R = xs.map(a => xs.map(b => Rfull[a][b]));
    const ry = xs.map(a => Rfull[a][B8.pathY]);
    const P = R.every(r => r.every(isFinite)) && ry.every(isFinite) ? SEL.path(R, ry, { ridge: B8.ridge }) : null;
    el('b8PathBox').style.display = P ? '' : 'none';
    if (!P) { msg('b8PathMsg', [{ level: 'warning', es: 'Faltan correlaciones (σ²G ≤ 0 en alguna variable): el análisis de sendas genotípico no se puede hacer; pruebe con las fenotípicas.', en: 'Some correlations are missing (σ²G ≤ 0 in a trait): the genotypic path analysis cannot be done; try the phenotypic ones.' }]); return; }
    const rows = xs.map((a, q) => ({ q, name: names[a] }));
    table('b8PathTable', [
      { label: T('Variable explicativa', 'Explanatory trait'), get: r => esc(r.name) },
      { label: T('Efecto directo', 'Direct effect'), num: true, get: r => `<b>${fmtNum(P.direct[r.q], 4)}</b>` },
    ].concat(xs.map((a, qq) => ({ label: T(`vía ${esc(names[a])}`, `via ${esc(names[a])}`), num: true, get: r => (r.q === qq ? '' : fmtNum(P.indirect[r.q][qq], 4)) })), [
      { label: T(`r con ${esc(names[B8.pathY])}`, `r with ${esc(names[B8.pathY])}`), num: true, get: r => fmtNum(ry[r.q], 4) },
      { label: 'VIF', num: true, get: r => (P.vif ? fmtNum(P.vif[r.q], 2) : '') },
    ]), rows);
    const cn = P.condition;
    if (!P.pd || P.r2 > 1 + 1e-9) {
      /* R + kI is not positive definite: correlations outside [−1, 1] or mutually impossible;
         the direct effects then solve nothing meaningful and R² can exceed one */
      el('b8PathBox').style.display = 'none';
      msg('b8PathMsg', [{ level: 'error',
        es: (P.pd ? `R² = ${fmtNum(P.r2, 3)} es mayor que 1: las correlaciones ${B8.pathBasis === 'P' ? 'fenotípicas' : 'genotípicas'} de ${esc(names[B8.pathY])} con las variables explicativas no son compatibles con las que hay entre ellas (la matriz completa no es definida positiva), y los efectos directos no tienen sentido.` : `La matriz de correlaciones ${B8.pathBasis === 'P' ? 'fenotípicas' : 'genotípicas'} entre las variables explicativas no es definida positiva (su menor valor propio es ${fmtNum(P.minEigen, 3)}${B8.ridge > 0 ? `, ya con la cresta k = ${B8.ridge}` : ''}): tiene correlaciones imposibles, como las que salen de [−1, 1]. Con ella los efectos directos no tienen sentido (R² saldría ${fmtNum(P.r2, 3)}).`) + ' Use las correlaciones fenotípicas, quite las variables con σ²G pequeña o aumente la constante de cresta.',
        en: (P.pd ? `R² = ${fmtNum(P.r2, 3)} is above 1: the ${B8.pathBasis === 'P' ? 'phenotypic' : 'genotypic'} correlations of ${esc(names[B8.pathY])} with the explanatory traits are not compatible with those among them (the full matrix is not positive definite), and the direct effects are meaningless.` : `The ${B8.pathBasis === 'P' ? 'phenotypic' : 'genotypic'} correlation matrix among the explanatory traits is not positive definite (its smallest eigenvalue is ${fmtNum(P.minEigen, 3)}${B8.ridge > 0 ? `, already with ridge k = ${B8.ridge}` : ''}): it holds impossible correlations, such as those outside [−1, 1]. The direct effects are then meaningless (R² would be ${fmtNum(P.r2, 3)}).`) + ' Use the phenotypic correlations, drop the traits with a small σ²G or increase the ridge constant.' }]);
      return;
    }
    const notes = [{ level: cn > 100 ? 'warning' : 'info', es: `R² = ${fmtNum(P.r2, 4)}, efecto residual √(1 − R²) = ${fmtNum(P.residual, 4)}. Número de condición de la matriz de correlaciones${B8.ridge > 0 ? ' con la cresta' : ''} ${fmtNum(cn, 1)} (${cn < 100 ? 'colinealidad débil' : cn < 1000 ? 'colinealidad moderada a fuerte' : 'colinealidad severa'})${B8.ridge > 0 ? `; con cresta k = ${B8.ridge}` : ''}. Cada correlación se descompone como r<sub>iy</sub> = p<sub>i</sub> + Σ r<sub>ij</sub>p<sub>j</sub>.`, en: `R² = ${fmtNum(P.r2, 4)}, residual effect √(1 − R²) = ${fmtNum(P.residual, 4)}. Condition number of the correlation matrix${B8.ridge > 0 ? ' with the ridge' : ''} ${fmtNum(cn, 1)} (${cn < 100 ? 'weak collinearity' : cn < 1000 ? 'moderate to strong collinearity' : 'severe collinearity'})${B8.ridge > 0 ? `; with ridge k = ${B8.ridge}` : ''}. Every correlation splits as r<sub>iy</sub> = p<sub>i</sub> + Σ r<sub>ij</sub>p<sub>j</sub>.` }];
    msg('b8PathMsg', notes);
  }

  /* ================= 3 · selection indices ================= */
  function setupRows(mt) {
    return mt.idx.map((j, q) => {
      const s = B8.setup[j] || (B8.setup[j] = { dir: 1, w: null, restrict: false, d: '' });
      const sdP = Math.sqrt(mt.C.P[q][q]);
      if (s.w == null) s.w = +(s.dir / sdP).toPrecision(4);
      return { j, q, name: mt.names[q], s, sdP };
    });
  }
  function renderIndices() {
    const mt = multiTrait();
    el('b8IndexBox').style.display = mt ? '' : 'none';
    if (!mt) return;
    const rows = setupRows(mt);
    el('b8SetupTable').innerHTML = `<table><thead><tr><th>${T('Variable', 'Trait')}</th><th>${T('Dirección', 'Direction')}</th><th class="num">${T('Peso económico', 'Economic weight')}</th><th>${T('Restringir (cambio 0)', 'Restrict (no change)')}</th><th class="num">${T('Ganancia deseada', 'Desired gain')}</th><th class="num">σF̄</th></tr></thead><tbody>`
      + rows.map(r => `<tr><td>${esc(r.name)}</td>
        <td><select data-j="${r.j}" data-k="dir"><option value="1"${r.s.dir > 0 ? ' selected' : ''}>${T('aumentar', 'increase')}</option><option value="-1"${r.s.dir < 0 ? ' selected' : ''}>${T('disminuir', 'decrease')}</option></select></td>
        <td class="num"><input type="number" step="any" data-j="${r.j}" data-k="w" value="${r.s.w}"></td>
        <td><input type="checkbox" data-j="${r.j}" data-k="restrict"${r.s.restrict ? ' checked' : ''}></td>
        <td class="num"><input type="number" step="any" data-j="${r.j}" data-k="d" value="${r.s.d}" placeholder="—"></td>
        <td class="num">${fmtNum(r.sdP, 4)}</td></tr>`).join('') + '</tbody></table>';
    el('b8SetupTable').querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('change', () => {
      const s = B8.setup[+inp.dataset.j], k = inp.dataset.k;
      if (k === 'dir') { const old = s.dir; s.dir = +inp.value; if (Math.sign(s.w) !== Math.sign(s.dir)) s.w = -s.w; if (old === s.dir) return; }
      else if (k === 'w') s.w = parseFloat(inp.value);
      else if (k === 'restrict') s.restrict = inp.checked;
      else s.d = inp.value;
      renderIndices();
    }));
    const k = B8.res.intensity.k;
    let P = mt.C.P, G = mt.C.Gm.map(r => r.slice());
    const notes = [];
    /* a trait without genetic variance cannot respond: its genetic row and column are set to
       zero, so it only helps the index through its phenotypic correlations */
    const noVar = rows.filter(r => !(G[r.q][r.q] > 0));
    if (noVar.length) {
      noVar.forEach(r => { for (let q = 0; q < G.length; q++) { G[r.q][q] = 0; G[q][r.q] = 0; } });
      notes.push({ level: 'warning', es: `σ²G ≤ 0 en ${noVar.map(r => r.name).join(', ')}: su varianza y sus covarianzas genotípicas se toman como cero; la variable solo aporta información por sus correlaciones fenotípicas.`, en: `σ²G ≤ 0 in ${noVar.map(r => r.name).join(', ')}: its genotypic variance and covariances are taken as zero; the trait only contributes information through its phenotypic correlations.` });
    }
    if (!SEL.isPD(P)) { const b = SEL.bend(P); P = b.matrix; notes.push({ level: 'warning', es: 'La matriz fenotípica P no es definida positiva: se dobló con el método de Schaeffer (2014) antes de calcular los índices.', en: 'The phenotypic matrix P is not positive definite: it was bent with Schaeffer\'s (2014) method before computing the indices.' }); }
    /* G has to be positive semidefinite and smaller than P in every direction */
    const bc = SEL.bendCanonical(P, G);
    if (bc && bc.changed) {
      G = bc.matrix;
      notes.push({ level: 'warning', es: `G no era compatible con P: ${bc.changed} de ${G.length} heredabilidades canónicas (valores propios de G en la escala donde P = I) estaban fuera de [0, 1] (${bc.values.filter((v, k) => Math.abs(v - bc.newValues[k]) > 1e-12).map(v => fmtNum(v, 3)).join(', ')}) y se llevaron a ese intervalo antes de calcular los índices. Suele pasar con pocos genotipos o con variables casi redundantes (por ejemplo una razón de otras dos).`, en: `G was not compatible with P: ${bc.changed} of ${G.length} canonical heritabilities (eigenvalues of G on the scale where P = I) were outside [0, 1] (${bc.values.filter((v, k) => Math.abs(v - bc.newValues[k]) > 1e-12).map(v => fmtNum(v, 3)).join(', ')}) and were brought into that range before computing the indices. It usually happens with few genotypes or with nearly redundant traits (a ratio of two others, for instance).` });
    }
    const w = rows.map(r => (isFinite(r.s.w) ? r.s.w : 0));
    const U = rows.filter(r => r.s.restrict).map(r => r.q);
    const Ud = rows.filter(r => r.s.d !== '' && isFinite(parseFloat(r.s.d))).map(r => r.q);
    const d = Ud.map(q => parseFloat(rows[q].s.d));
    const list = [];
    const sh = SEL.smithHazel(P, G, w, k);
    if (sh) list.push(Object.assign({ key: 'sh', name: T('Smith–Hazel', 'Smith–Hazel') }, sh));
    const base = SEL.baseIndex(P, G, w, k);
    if (base) list.push(Object.assign({ key: 'base', name: T('Índice base', 'Base index') }, base));
    if (U.length && U.length < rows.length) { const x = SEL.restricted(P, G, w, U, k); if (x) list.push(Object.assign({ key: 'restricted', name: T('Restringido', 'Restricted') }, x)); }
    if (Ud.length >= 1) {
      const x = SEL.ppg(P, G, w, Ud, d, k);
      if (x) list.push(Object.assign({ key: 'ppg', name: T('Ganancias proporcionales', 'Proportional gains') }, x));
      const y = SEL.desiredGains(P, G, Ud, d, k);
      if (y) list.push(Object.assign({ key: 'desired', name: T('Ganancias deseadas', 'Desired gains') }, y));
      if (x && isFinite(x.theta) && x.theta <= 0) notes.push({ level: 'warning', es: `θ = ${fmtNum(x.theta, 3)} ≤ 0: el índice de ganancias proporcionales mueve las variables en sentido contrario a las proporciones pedidas (Itoh y Yamada 1987).`, en: `θ = ${fmtNum(x.theta, 3)} ≤ 0: the proportional-gains index moves the traits against the requested proportions (Itoh & Yamada 1987).` });
    }
    const es = SEL.esim(P, G, k);
    if (es) list.push(Object.assign({ key: 'esim', name: T('Índice propio (ESIM)', 'Eigen index (ESIM)') }, es));
    /* the desired-gains and eigen indices ignore w; their accuracy and response are still
       measured against the same aggregate genotype H = w′g as the others, so that the
       comparison with Smith–Hazel is fair (ESIM keeps its own accuracy λ as lambda) */
    const Gw = G.map(r => r.reduce((s, v, j) => s + v * w[j], 0));
    const sH = Math.sqrt(Math.max(0, w.reduce((s, v, j) => s + v * Gw[j], 0)));
    list.filter(ix => ix.key === 'desired' || ix.key === 'esim').forEach(ix => {
      if (ix.key === 'esim') {
        ix.lambda = ix.rho;
        /* the sign of an eigenvector is arbitrary: the one with a positive response in H is kept */
        if (w.reduce((s, v, j) => s + v * ix.E[j], 0) < 0) { ix.b = ix.b.map(v => -v); ix.E = ix.E.map(v => -v); }
      }
      const Gb = G.map(r => r.reduce((s, v, j) => s + v * ix.b[j], 0));
      ix.rho = sH > 0 && ix.sI > 0 ? w.reduce((s, v, j) => s + v * Gb[j], 0) / (sH * ix.sI) : NaN;
      ix.dH = w.reduce((s, v, j) => s + v * ix.E[j], 0);
    });
    /* an accuracy above one means that G is not compatible with P (G − P has a positive
       direction): the gains of such an index are not trustworthy */
    list.forEach(ix => { ix.invalid = (isFinite(ix.rho) && ix.rho > 1 + 1e-9) || (isFinite(ix.h2I) && ix.h2I > 1 + 1e-9); });
    if (list.some(ix => ix.invalid)) notes.push({ level: 'error', es: 'Algún índice tiene precisión o heredabilidad mayor que 1: la matriz G estimada no es compatible con P (varianzas genotípicas mayores que las fenotípicas en alguna dirección). Sus ganancias no son confiables; quite las variables con σ²G muy pequeña o use un solo ambiente.', en: 'Some index has an accuracy or heritability above 1: the estimated G is not compatible with P (genotypic variance above the phenotypic one in some direction). Its gains are not reliable; remove the traits with very small σ²G or use a single environment.' });
    const shR = sh && !sh.invalid ? sh.rho : NaN;
    /* gains of traits without genetic variance are zero up to rounding (1e-18): shown as 0 */
    list.forEach(ix => { const top = Math.max(1e-300, ...ix.E.map(Math.abs)); ix.E = ix.E.map(v => (Math.abs(v) < 1e-10 * top ? 0 : v)); });
    list.forEach(ix => { ix.eff = isFinite(ix.rho) && isFinite(shR) ? ix.rho / shR : NaN; ix.pct = ix.E.map((v, q) => 100 * v / Math.abs(mt.X.length ? mt.X.reduce((s, r) => s + r[q], 0) / mt.X.length : 1)); });
    B8.indices = { list, rows, P, G, mt, w };
    table('b8IndexTable', [
      { label: T('Índice', 'Index'), get: r => `<b>${r.name}</b>${r.invalid ? ` <span class="pw low">${T('no confiable', 'not reliable')}</span>` : ''}` },
      { label: 'σ<sub>I</sub>', num: true, get: r => fmtNum(r.sI, 4) },
      { label: T('Respuesta en H', 'Response in H'), num: true, get: r => (isFinite(r.dH) ? fmtNum(r.dH, 4) : '—') },
      { label: 'ρ<sub>HI</sub>', num: true, get: r => (isFinite(r.rho) ? f3(r.rho) : '—') },
      { label: T('h² del índice', 'Index h²'), num: true, get: r => f3(r.h2I) },
      { label: T('Eficiencia frente a Smith–Hazel', 'Efficiency against Smith–Hazel'), num: true, get: r => (isFinite(r.eff) ? f3(r.eff) : '—') },
    ].concat(rows.map(r => ({ label: T(`ΔG ${esc(r.name)}`, `ΔG ${esc(r.name)}`), num: true, get: ix => fmtNum(ix.E[r.q], 4) }))), list);
    table('b8CoefTable', [{ label: T('Índice', 'Index'), get: r => r.name }].concat(rows.map(r => ({ label: T(`b ${esc(r.name)}`, `b ${esc(r.name)}`), num: true, get: ix => fmtNum(ix.b[r.q], 4) }))), list);
    if (sh) {
      table('b8ShTable', [
        { label: T('Variable', 'Trait'), get: r => esc(r.name) },
        { label: T('Peso w', 'Weight w'), num: true, get: r => fmtNum(w[r.q], 4) },
        { label: T('Coeficiente b', 'Coefficient b'), num: true, get: r => fmtNum(sh.b[r.q], 4) },
        { label: T('Ganancia esperada', 'Expected gain'), num: true, get: r => fmtNum(sh.E[r.q], 4) },
        { label: T('% del valor económico', '% of the economic value'), num: true, get: r => f2(sh.contribution[r.q]) },
        { label: T('% perdido si se quita', '% lost if dropped'), num: true, get: r => f2(sh.loss[r.q]) },
      ], rows);
    }
    notes.push({ level: 'info', es: `Matrices en base de medias: P = PCM<sub>G</sub>/${mt.multi ? 're' : 'r'} y G = σ<sub>G</sub>. Smith–Hazel b = P⁻¹Gw; respuesta R = i·σ<sub>I</sub> y ganancia por variable ΔG = i·Gb/σ<sub>I</sub> con i = ${fmtNum(k, 4)}. Para el índice base la respuesta en H es i·w′Gw/√(w′Pw). Los pesos por omisión valen ±1/σF̄ (misma importancia por desviación estándar fenotípica) y se pueden cambiar.`, en: `Entry-mean matrices: P = MCP<sub>G</sub>/${mt.multi ? 're' : 'r'} and G = σ<sub>G</sub>. Smith–Hazel b = P⁻¹Gw; response R = i·σ<sub>I</sub> and gain per trait ΔG = i·Gb/σ<sub>I</sub> with i = ${fmtNum(k, 4)}. For the base index the response in H is i·w′Gw/√(w′Pw). The default weights are ±1/σP̄ (equal importance per phenotypic standard deviation) and can be changed.` });
    if (list.some(x => x.key === 'esim')) notes.push({ level: 'info', es: `El índice propio (ESIM) resuelve Gb = λ²Pb con el mayor λ² por la factorización de Cholesky de P; no usa pesos económicos: su precisión respecto a su propio objetivo es λ = ${f3(list.find(x => x.key === 'esim').lambda)}, y la tabla da su correlación con el mismo H que los demás índices.`, en: `The eigen index (ESIM) solves Gb = λ²Pb for the largest λ² through the Cholesky factor of P; it uses no economic weights: its accuracy for its own target is λ = ${f3(list.find(x => x.key === 'esim').lambda)}, and the table gives its correlation with the same H as the other indices.` });
    msg('b8IndexMsg', notes);
    mountFig('b8FigIndex', {
      title: () => T('Ganancia esperada por variable', 'Expected gain per trait'), fileName: 'index_gains',
      render: c => P8.indexGains(c, list, rows.map(r => r.name), {}),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 900, height: 460 });
    renderSelection();
  }

  /* ================= 4 · genotypes chosen ================= */
  function renderSelection() {
    const I = B8.indices;
    if (!I || !I.mt.X.length) { el('b8SelBox').style.display = 'none'; return; }
    el('b8SelBox').style.display = '';
    const mt = I.mt, X = mt.X, t = mt.names.length;
    const choices = I.list.map(ix => [ix.key, ix.name]).concat([['rank', T('Suma de rangos (Mulamba y Mock)', 'Rank sum (Mulamba & Mock)')], ['elston', T('Multiplicativo de Elston', "Elston's multiplicative")]]);
    if (!choices.some(c => c[0] === B8.rankIndex)) B8.rankIndex = 'sh';
    el('b8RankIndex').innerHTML = choices.map(([k, n]) => `<option value="${k}"${k === B8.rankIndex ? ' selected' : ''}>${n}</option>`).join('');
    const means = Array.from({ length: t }, (_, q) => X.reduce((s, r) => s + r[q], 0) / X.length);
    const dirs = I.rows.map(r => r.s.dir);
    let scores;
    if (B8.rankIndex === 'rank') scores = SEL.rankSum(X, dirs);
    else if (B8.rankIndex === 'elston') scores = SEL.elston(X, dirs);
    else {
      const ix = I.list.find(x => x.key === B8.rankIndex) || I.list[0];
      scores = X.map(r => ix.b.reduce((s, b, q) => s + b * (r[q] - means[q]), 0));
    }
    const sel = SEL.selectBy(mt.genotypes, scores, X, mt.h2, B8.p < 1 / X.length ? 1 / X.length : B8.p);
    table('b8RankTable', [
      { label: '#', num: true, get: r => r.rank },
      { label: T('Genotipo', 'Genotype'), get: r => (r.selected ? `<b>${esc(r.name)}</b> <span class="pw ok">${T('seleccionado', 'selected')}</span>` : esc(r.name)) },
      { label: T('Valor del índice', 'Index value'), num: true, get: r => fmtNum(r.score, 4) },
    ].concat(mt.names.map((nm, q) => ({ label: esc(nm), num: true, get: r => fmtNum(X[mt.genotypes.indexOf(r.name)][q], 4) }))), sel.ranks, 40);
    table('b8GainTable', [
      { label: T('Variable', 'Trait'), get: r => esc(r.name) },
      { label: T('Media general', 'Overall mean'), num: true, get: r => fmtNum(r.x0, 4) },
      { label: T('Media seleccionados', 'Mean of the selected'), num: true, get: r => fmtNum(r.xs, 4) },
      { label: T('Diferencial DS', 'Differential DS'), num: true, get: r => fmtNum(r.ds, 4) },
      { label: 'DS %', num: true, get: r => f2(r.dsPct) },
      { label: 'H²', num: true, get: r => f3(r.h2) },
      { label: T('Ganancia DS·H²', 'Gain DS·H²'), num: true, get: r => fmtNum(r.gs, 4) },
      { label: T('Ganancia %', 'Gain %'), num: true, get: r => f2(r.gsPct) },
    ], sel.trait.map((x, q) => Object.assign({ name: mt.names[q], h2: mt.h2[q] }, x)));
    el('b8SelNote').innerHTML = T(
      `${sel.nSel === 1 ? 'Se selecciona 1' : `Se seleccionan ${sel.nSel}`} de ${X.length} genotipos. Estas ganancias son empíricas (diferencial de selección realizado por la heredabilidad en base de medias), no las predicciones del índice de la tarjeta anterior; los testigos no entran en la selección.`,
      `${sel.nSel} of ${X.length} genotypes ${sel.nSel === 1 ? 'is' : 'are'} selected. These gains are empirical (realized selection differential times the entry-mean heritability), not the predictions of the index in the previous card; checks do not enter the selection.`);
    B8.selection = sel;
  }

  /* ================= 5 · recurrent selection methods ================= */
  function fehrDefaults() {
    /* values from Blocks 4 and 6 when they exist; otherwise Fehr's (1987) worked example */
    const v = { s2A: 68, s2D: 42, s2AE: 70, s2DE: 42, s2e: 96, s2plot: 46, s2w: 700, n: 14, r: 2, t: 3, F: 0.875, recomb: 3, grid: true };
    const G6 = state.mating6 && state.mating6.res && state.mating6.res.genetic;
    if (G6 && isFinite(G6.s2A) && G6.s2A > 0) { v.s2A = +G6.s2A.toPrecision(4); v.s2D = Math.max(0, +G6.s2D.toPrecision(4)); v.from = 'b6'; }
    return v;
  }
  const FEHR_FIELDS = [
    ['s2A', 'σ²A'], ['s2D', 'σ²D'], ['s2AE', 'σ²AA (aditiva × ambiente)', 'σ²AE (additive × environment)'], ['s2DE', 'σ²DA (dominancia × ambiente)', 'σ²DE (dominance × environment)'],
    ['s2e', 'σ²e (error de parcela)', 'σ²e (plot error)'], ['s2plot', 'σ² (entre parcelas, fenotípica)', 'σ² (between plots, phenotypic)'], ['s2w', 'σ²w (entre plantas dentro de parcela)', 'σ²w (between plants within plots)'],
    ['r', 'repeticiones r', 'replicates r'], ['t', 'ambientes t', 'environments t'], ['F', 'F de los progenitores de las líneas', 'F of the parents of the lines'], ['recomb', 'estaciones de recombinación', 'recombination seasons'],
  ];
  function renderFehr() {
    if (!B8.fehr) B8.fehr = fehrDefaults();
    const v = B8.fehr;
    el('b8FehrInputs').innerHTML = FEHR_FIELDS.map(([k, es, en]) => `<div class="field"><label class="keep-case">${T(es, en || es)}</label><input type="number" step="any" data-f="${k}" value="${v[k]}"></div>`).join('')
      + `<div class="field"><label>${T('Selección fenotípica en cuadrículas', 'Phenotypic selection in grids')}</label><select data-f="grid"><option value="1"${v.grid ? ' selected' : ''}>${T('sí (sin σ² entre parcelas)', 'yes (no σ² between plots)')}</option><option value="0"${!v.grid ? ' selected' : ''}>${T('no', 'no')}</option></select></div>`;
    el('b8FehrInputs').querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('change', () => {
      const k = inp.dataset.f;
      v[k] = k === 'grid' ? inp.value === '1' : parseFloat(inp.value);
      v.user = true;
      renderFehr();
    }));
    const k = B8.res ? B8.res.intensity.k : SEL.intensity(B8.p);
    const vv = Object.assign({}, v, { k });
    const rows = SEL.METHODS.map(m => {
      const seq = SEL.sequenceOf(m.key, { F: v.F, recomb: v.recomb });
      const gc = SEL.gainPerCycle(vv, m.key, { F: v.F, grid: v.grid });
      const yrs = {}; Object.keys(SEL.CALENDARS).forEach(cal => { yrs[cal] = SEL.yearsPerCycle(seq, cal); });
      return { key: m.key, name: T(m.es, m.en) + (m.key === 'sLines' ? ` (F = ${fmtNum(v.F, 3)})` : ''), short: T(m.shortEs, m.shortEn) + (m.key === 'sLines' ? ` ${fmtNum(v.F, 3)}` : ''), c: m.c, seasons: seq.length, seq, gc, yrs, gy: gc / yrs.twoDifferent };
    });
    table('b8FehrTable', [
      { label: T('Método', 'Method'), get: r => r.name },
      { label: 'c', num: true, get: r => fmtNum(r.c, 1) },
      { label: T('Estaciones por ciclo', 'Seasons per cycle'), num: true, get: r => `${r.seasons} <span class="hint">${r.seq}</span>` },
      { label: T('Ganancia por ciclo', 'Gain per cycle'), num: true, get: r => `<b>${fmtNum(r.gc, 3)}</b>` },
      { label: T('Por año: 1 estación', 'Per year: 1 season'), num: true, get: r => fmtNum(r.gc / r.yrs.one, 3) },
      { label: T('2 estaciones iguales', '2 similar seasons'), num: true, get: r => fmtNum(r.gc / r.yrs.twoSimilar, 3) },
      { label: T('2 estaciones distintas', '2 different seasons'), num: true, get: r => fmtNum(r.gc / r.yrs.twoDifferent, 3) },
      { label: T('3 estaciones', '3 seasons'), num: true, get: r => fmtNum(r.gc / r.yrs.three, 3) },
    ], rows);
    el('b8FehrNote').innerHTML = T(
      `Ganancia por ciclo G<sub>c</sub> = i·c·Cov/σ<sub>F</sub> (Sprague y Eberhart 1977; Fehr 1987, cuadros 17-1 y 17-2) con i = ${fmtNum(k, 4)}: c es el control parental (½ si solo se selecciona la hembra, 2 si se recombina semilla autofecundada de los seleccionados). Cada método es una secuencia de estaciones: M necesita el ambiente de evaluación y A puede ir en contraestación; la ganancia por año resulta de acomodar la secuencia, ciclo tras ciclo, en el calendario. ${v.from === 'b6' ? 'σ²A y σ²D vienen del Bloque 6; los demás valores son los del ejemplo de Fehr y conviene reemplazarlos por los propios.' : 'Los valores iniciales son los del ejemplo de Fehr (1987, cuadro 17-9, rendimiento de maíz en q/ha) y conviene reemplazarlos por los propios.'}`,
      `Gain per cycle G<sub>c</sub> = i·c·Cov/σ<sub>P</sub> (Sprague & Eberhart 1977; Fehr 1987, Tables 17-1 and 17-2) with i = ${fmtNum(k, 4)}: c is the parental control (½ when only the female is selected, 2 when selfed seed of the selected plants is recombined). Every method is a sequence of seasons: M needs the evaluation environment and A can go in an off-season; the gain per year comes from laying the sequence, cycle after cycle, on the calendar. ${v.from === 'b6' ? 'σ²A and σ²D come from Block 6; the other values are those of Fehr\'s example and should be replaced by your own.' : 'The starting values are those of Fehr\'s example (1987, Table 17-9, maize yield in q/ha) and should be replaced by your own.'}`);
    mountFig('b8FigFehr', {
      title: () => T('Ganancia esperada por método', 'Expected gain by method'), fileName: 'recurrent_selection',
      render: c => P8.gains(c, rows, {}),
      controls: () => [P2.titleControl(), { key: 'show', label: T('Escala', 'Scale'), type: 'select', options: [['year', T('por año (2 estaciones distintas)', 'per year (2 different seasons)')], ['cycle', T('por ciclo', 'per cycle')]] }, { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 820, height: 440, flip: true, show: 'year' });
    B8.fehrRows = rows;
  }

  /* ================= 6 · notes ================= */
  function renderNotes() {
    const host = el('b8Notes');
    if (!host) return;
    const notes = [
      { es: ['Heredabilidad', 'En base de parcela H² = σ²G/(σ²G + σ²GA + σ²e) y en base de medias H² = σ²G/(σ²G + σ²GA/e + σ²e/re) = 1 − CM<sub>GA</sub>/CM<sub>G</sub> (una localidad: 1 − CM<sub>e</sub>/CM<sub>G</sub>). Intervalo exacto de Knapp, Stroup y Ross (1985): (1 − q<sub>F</sub>(1 − α/2)/F, 1 − q<sub>F</sub>(α/2)/F) con F = CM<sub>G</sub>/CM<sub>denominador</sub>. Con bloques incompletos se muestra además la heredabilidad de Cullis, Smith y Coombes (2006) por REML, calculada en el Bloque 3 con el promedio exacto de las varianzas de las diferencias.'],
        en: ['Heritability', 'On a plot basis H² = σ²G/(σ²G + σ²GE + σ²e) and on an entry-mean basis H² = σ²G/(σ²G + σ²GE/e + σ²e/re) = 1 − MS<sub>GE</sub>/MS<sub>G</sub> (one location: 1 − MS<sub>e</sub>/MS<sub>G</sub>). Exact interval of Knapp, Stroup & Ross (1985): (1 − q<sub>F</sub>(1 − α/2)/F, 1 − q<sub>F</sub>(α/2)/F) with F = MS<sub>G</sub>/MS<sub>denominator</sub>. With incomplete blocks the heritability of Cullis, Smith & Coombes (2006) by REML is also shown, computed in Block 3 with the exact mean variance of differences.'] },
      { es: ['Intensidad de selección', 'i = φ(x<sub>p</sub>)/p para la fracción superior p de una población infinita. Cuando se eligen N de M genotipos, la intensidad esperada es la media de los N mayores de M normales, (M/N)∫xφ(x)Pr[Bin(M − 1, 1 − Φ(x)) ≤ N − 1]dx; también se dan las aproximaciones de Burrows (1972) y Bulmer (1980). Varios libros llaman k a la misma cantidad y «intensidad» al porcentaje seleccionado.'],
        en: ['Selection intensity', 'i = φ(x<sub>p</sub>)/p for the upper fraction p of an infinite population. When N of M genotypes are chosen, the expected intensity is the mean of the N largest of M normals, (M/N)∫xφ(x)Pr[Bin(M − 1, 1 − Φ(x)) ≤ N − 1]dx; the approximations of Burrows (1972) and Bulmer (1980) are given too. Several books call the same quantity k and call the percentage selected the "intensity".'] },
      { es: ['Correlaciones y análisis de sendas', 'Productos cruzados medios por el análisis de la suma de cada par de variables, en el mismo diseño que las variables. Errores estándar por el método delta con los momentos de Wishart; no se usa la aproximación de Robertson, pensada para análisis de hermanos. Sendas: efectos directos p = R⁻¹r, indirectos r<sub>ij</sub>p<sub>j</sub>, R² = p′r y residuo √(1 − R²), con factores de inflación de la varianza, número de condición y regresión en cresta opcional (Carvalho y Cruz 1996).'],
        en: ['Correlations and path analysis', 'Mean cross-products from the analysis of the sum of every pair of traits, in the same design as the traits. Standard errors by the delta method with Wishart moments; Robertson\'s approximation, meant for sib analyses, is not used. Paths: direct effects p = R⁻¹r, indirect r<sub>ij</sub>p<sub>j</sub>, R² = p′r and residual √(1 − R²), with variance-inflation factors, the condition number and optional ridge regression (Carvalho & Cruz 1996).'] },
      { es: ['Índices de selección', 'Smith (1936)–Hazel (1943) b = P⁻¹Gw; índice base b = w (Williams 1962); restringido b<sub>R</sub> = [I − P⁻¹C(C′P⁻¹C)⁻¹C′]b con C = G de las variables restringidas (Kempthorne y Nordskog 1959); ganancias proporcionales de Mallard (1972) y Tallis (1985) con su θ; ganancias deseadas b = P⁻¹G(G′P⁻¹G)⁻¹d (Pesek y Baker 1969); índice propio ESIM (Cerón-Rojas y col. 2006) por el problema propio generalizado; suma de rangos de Mulamba y Mock (1978) y multiplicativo de Elston (1963). Si P no es definida positiva se dobla con el método de Schaeffer (2014); si G no es compatible con P, sus heredabilidades canónicas (valores propios en la escala donde P = I) se llevan al intervalo [0, 1], la idea de Hayes y Hill (1981).'],
        en: ['Selection indices', 'Smith (1936)–Hazel (1943) b = P⁻¹Gw; base index b = w (Williams 1962); restricted b<sub>R</sub> = [I − P⁻¹C(C′P⁻¹C)⁻¹C′]b with C = G of the restricted traits (Kempthorne & Nordskog 1959); proportional gains of Mallard (1972) and Tallis (1985) with their θ; desired gains b = P⁻¹G(G′P⁻¹G)⁻¹d (Pesek & Baker 1969); eigen index ESIM (Cerón-Rojas et al. 2006) through the generalized eigenproblem; rank sum of Mulamba & Mock (1978) and Elston\'s (1963) multiplicative index. When P is not positive definite it is bent with Schaeffer\'s (2014) method; when G is not compatible with P, its canonical heritabilities (eigenvalues on the scale where P = I) are brought into [0, 1], the idea of Hayes & Hill (1981).'] },
      { es: ['Respuesta de los métodos de selección recurrente', 'G<sub>c</sub> = i·c·Cov(unidad de selección, unidad de recombinación)/σ<sub>F</sub> con los coeficientes de σ²A y σ²D de Sprague y Eberhart (1977) tabulados por Fehr (1987): fenotípica, mazorca por surco, medios hermanos (semilla remanente o autofecundada), hermanos completos, líneas S₀:₁ y líneas de progenitores con endogamia F. La respuesta real es menor si hay epistasis, efecto Bulmer, deriva o interacción con el ambiente que no se estimó.'],
        en: ['Response of the recurrent-selection methods', 'G<sub>c</sub> = i·c·Cov(selection unit, recombination unit)/σ<sub>P</sub> with the coefficients of σ²A and σ²D of Sprague & Eberhart (1977) tabulated by Fehr (1987): phenotypic, ear-to-row, half-sib (remnant or selfed seed), full-sib, S₀:₁ lines and lines from parents with inbreeding F. The real response is smaller when there is epistasis, the Bulmer effect, drift or interaction with the environment that was not estimated.'] },
    ];
    const cites = [
      'Smith HF (1936). A discriminant function for plant selection. Annals of Eugenics 7: 240–250.',
      'Hazel LN (1943). The genetic basis for constructing selection indexes. Genetics 28: 476–490.',
      'Burton GW, DeVane EH (1953). Estimating heritability in tall fescue from replicated clonal material. Agronomy Journal 45: 478–481.',
      'Johnson HW, Robinson HF, Comstock RE (1955). Estimates of genetic and environmental variability in soybeans. Agronomy Journal 47: 314–318.',
      'Kempthorne O, Nordskog AW (1959). Restricted selection indices. Biometrics 15: 10–19.',
      'Williams JS (1962). The evaluation of a selection index. Biometrics 18: 375–393.',
      'Elston RC (1963). A weight-free index for the purpose of ranking or selection with respect to several traits at a time. Biometrics 19: 85–97.',
      'Pesek J, Baker RJ (1969). Desired improvement in relation to selection indices. Canadian Journal of Plant Science 49: 803–804.',
      'Burrows PM (1972). Expected selection differentials for directional selection. Biometrics 28: 1091–1100.',
      'Mallard J (1972). The theory and computation of selection indices with constraints: a critical synthesis. Biometrics 28: 713–735.',
      'Sprague GF, Eberhart SA (1977). Corn breeding. In: Sprague GF (ed.) Corn and Corn Improvement. ASA, Madison, pp. 305–362.',
      'Mulamba NN, Mock JJ (1978). Improvement of yield potential of the Eto Blanco maize population by breeding for plant traits. Egyptian Journal of Genetics and Cytology 7: 40–51.',
      'Bulmer MG (1980). The Mathematical Theory of Quantitative Genetics. Clarendon Press, Oxford.',
      'Hayes JF, Hill WG (1981). Modification of estimates of parameters in the construction of genetic selection indices (‘bending’). Biometrics 37: 483–493.',
      'Knapp SJ, Stroup WW, Ross WM (1985). Exact confidence intervals for heritability on a progeny mean basis. Crop Science 25: 192–194.',
      'Tallis GM (1985). Constrained selection. Japanese Journal of Genetics 60: 151–155.',
      'Fehr WR (1987). Principles of Cultivar Development, vol. 1. Macmillan, New York (chapter 17).',
      'Itoh Y, Yamada Y (1987). Comparisons of selection indices achieving predetermined proportional gains. Genetics Selection Evolution 19: 69–82.',
      'Carvalho SP, Cruz CD (1996). Diagnosis of multicollinearity: assessment of the condition of correlation matrices used in genetic studies. Brazilian Journal of Genetics 19: 479–484.',
      'Holland JB, Nyquist WE, Cervantes-Martínez CT (2003). Estimating and interpreting heritability for plant breeding: an update. Plant Breeding Reviews 22: 9–112.',
      'Cerón-Rojas JJ, Crossa J, Sahagún-Castellanos J, Castillo-González F, Santacruz-Varela A (2006). A selection index method based on eigenanalysis. Crop Science 46: 1711–1721.',
      'Cullis BR, Smith AB, Coombes NE (2006). On the design of early generation variety trials with correlated data. Journal of Agricultural, Biological and Environmental Statistics 11: 381–393.',
      'Schaeffer LR (2014). Making covariance matrices positive definite. Centre for Genetic Improvement of Livestock, University of Guelph, Guelph.',
      'Cerón-Rojas JJ, Crossa J (2018). Linear Selection Indices in Modern Plant Breeding. Springer, Cham.',
    ];
    host.innerHTML = notes.map(n => `<div class="method-note"><h4>${T(n.es[0], n.en[0])}</h4><p>${T(n.es[1], n.en[1])}</p></div>`).join('')
      + `<div class="method-note"><h4>${T('Referencias', 'References')}</h4><ul class="ref-list">${cites.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  /* ================= downloads ================= */
  function downloadXlsx() {
    const res = B8.res;
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 28));
    add(T('Parámetros', 'Parameters'), [[T('Variable', 'Trait'), T('Media', 'Mean'), 'sigma2G', 'SE', 'sigma2GE', 'sigma2e', 'H2 plot', 'H2 means', 'SE', 'Knapp lo', 'Knapp hi', 'CVg', 'CVp', 'CVe', 'GA', 'GA%']]
      .concat(res.params.filter(p => !p.missing).map(p => [p.name, p.mean, p.s2g, p.seS2g, p.s2ge, p.s2e, p.h2plot, p.h2mean, p.seH2mean, p.knapp.lo, p.knapp.hi, p.gcv, p.pcv, p.ecv, p.ga, p.gaPct])));
    const mt = multiTrait();
    if (mt) {
      const m = (M) => [[''].concat(mt.names)].concat(mt.names.map((n, i) => [n].concat(M[i])));
      add('rG', m(mt.C.rG)); add('rP', m(mt.C.rP)); add('rE', m(mt.C.rE)); add('P', m(mt.C.P)); add('G', m(mt.C.Gm));
    }
    if (B8.indices) add(T('Índices', 'Indices'), [[T('Índice', 'Index'), 'sigmaI', 'rho', 'h2I'].concat(B8.indices.rows.map(r => 'b ' + r.name), B8.indices.rows.map(r => 'dG ' + r.name))]
      .concat(B8.indices.list.map(ix => [ix.name, ix.sI, ix.rho, ix.h2I].concat(ix.b, ix.E))));
    if (B8.selection) add(T('Selección', 'Selection'), [['rank', T('Genotipo', 'Genotype'), 'score', 'selected']].concat(B8.selection.ranks.map(r => [r.rank, r.name, r.score, r.selected ? 1 : 0])));
    if (B8.fehrRows) add(T('Métodos', 'Methods'), [[T('Método', 'Method'), 'c', 'seasons', 'Gc', 'Gy one', 'Gy two similar', 'Gy two different', 'Gy three']]
      .concat(B8.fehrRows.map(r => [r.name, r.c, r.seasons, r.gc, r.gc / r.yrs.one, r.gc / r.yrs.twoSimilar, r.gc / r.yrs.twoDifferent, r.gc / r.yrs.three])));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('seleccion', 'selection')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderPickers() {
    const D = state.data;
    const envs = D.field.envs;
    el('b8EnvField').style.display = envs.length > 1 ? '' : 'none';
    el('b8Env').innerHTML = envs.map(e => `<option value="${esc(e.key)}">${esc(e.name)}</option>`).join('') + (envs.length > 1 ? `<option value="__all">${T('todos combinados', 'all combined')}</option>` : '');
    if (!B8.env || ![...el('b8Env').options].some(o => o.value === B8.env)) B8.env = envs.length > 1 ? '__all' : envs[0].key;
    el('b8Env').value = B8.env;
    el('b8P').value = String(B8.p);
    el('b8Alpha').value = String(B8.alpha);
    el('b8Intensity').value = B8.intensity;
    el('b8CorrKind').value = B8.corrKind;
  }
  /* back to the block that analysed the design; forward to G×E with several environments, to
     BLUP with one (Block 9 needs two environments or more) */
  function navigation() {
    const D = state.data, d = D ? D.mating.design : 'none';
    const back = d === 'griffing' ? 5 : ['nc1', 'nc2', 'nc3', 'ttc', 'lxt', 'partial'].includes(d) ? 6 : 3;
    el('b8Back').dataset.step = back;
    el('b8BackLabel').innerHTML = T(`← ${STEPS[back - 1].es}`, `← ${STEPS[back - 1].en}`);
    const n = D && D.field.multiEnv && D.field.envs.length > 1 ? 9 : 10;
    const s = STEPS[n - 1];
    el('b8Next').dataset.step = n;
    el('b8Next').disabled = !s.ready;
    el('b8NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque ${n}, en construcción)`, `Next: ${s.en} (Block ${n}, under construction)`);
  }
  function renderAll() {
    const st = status();
    ['b8Corr', 'b8Index', 'b8Sel', 'b8Fehr', 'b8Notes0'].forEach(id => { const n = el(id); if (n) n.style.display = st.ok ? '' : 'none'; });
    if (!st.ok) { el('b8Source').innerHTML = ''; el('b8ParamTable').innerHTML = ''; msg('b8ParamMsg', [{ level: 'warning', es: st.es, en: st.en }]); renderFehr(); return; }
    const D = state.data;
    if (!B8.traits || B8.traits.some(j => j >= D.ds.traits.length)) B8.traits = D.ds.traits.map((_, j) => j).slice(0, Math.min(6, D.ds.traits.length));
    renderPickers();
    B8.res = analyse();
    state.selection = { res: B8.res };
    renderParams();
    renderCorr();
    renderIndices();
    renderFehr();
    navigation();
  }

  function init() {
    if (!el('b8Params')) return;
    renderNotes();
    const soft = () => { B8.cache.clear(); renderAll(); };
    el('b8Env').addEventListener('change', () => { B8.env = el('b8Env').value; soft(); });
    el('b8P').addEventListener('change', () => { B8.p = parseFloat(el('b8P').value); soft(); });
    el('b8Alpha').addEventListener('change', () => { B8.alpha = parseFloat(el('b8Alpha').value); soft(); });
    el('b8Intensity').addEventListener('change', () => { B8.intensity = el('b8Intensity').value; soft(); });
    el('b8CorrKind').addEventListener('change', () => { B8.corrKind = el('b8CorrKind').value; delete Fig.registry.b8FigCorr; renderCorr(); });
    el('b8PathY').addEventListener('change', () => { B8.pathY = +el('b8PathY').value; renderCorr(); });
    el('b8PathBasis').addEventListener('change', () => { B8.pathBasis = el('b8PathBasis').value; renderCorr(); });
    el('b8Ridge').addEventListener('change', () => { B8.ridge = parseFloat(el('b8Ridge').value) || 0; renderCorr(); });
    el('b8RankIndex').addEventListener('change', () => { B8.rankIndex = el('b8RankIndex').value; renderSelection(); });
    el('b8FehrReset').addEventListener('click', () => { B8.fehr = null; renderFehr(); });
    el('b8DlXlsx').addEventListener('click', downloadXlsx);
    el('b8Back').addEventListener('click', () => goStep(+el('b8Back').dataset.step || 3));
    el('b8Next').addEventListener('click', () => { const n = +el('b8Next').dataset.step || 9; if (STEPS[n - 1].ready) goStep(n); });
    document.addEventListener('datachange', () => { B8.cache.clear(); B8.env = null; B8.traits = null; B8.setup = {}; B8.fehr = null; if (document.getElementById('panel-8').classList.contains('active')) renderAll(); else B8.built = false; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 8 && (!B8.built || !B8.res)) { B8.built = true; renderAll(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B8.res) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
