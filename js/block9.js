/* BreedingPro — Block 9 interface: genotype × environment interaction and stability. The
   table of genotype means in every environment with its analysis of variance and a two-stage
   analysis with an error variance per environment; regressions on the environmental index;
   stability variances, superiority and reliability; rank statistics and Kang's yield–stability;
   AMMI with ASV and WAAS; the views of the GGE biplot; and a summary of every statistic. */

(function () {
  const B9 = {
    trait: 0, lower: false, seMode: 'own', annAlpha: 0.25, alphaLSD: 0.05, axesRule: 'FR', waasAxes: 0,
    wY: 50, imputeAxes: 1, scaling: 'none', view: 'www', svp: 'auto', ga: 0, gb: 1,
    res: null, cache: new Map(), built: false,
  };
  window.B9 = B9;

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
  const f3 = x => fmtNum(x, 3), f4 = x => fmtNum(x, 4);
  const tile = (es, en, v, sub) => `<div class="stat-tile"><div class="stat-label">${keepGreek(T(es, en))}</div><div class="stat-value">${v}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
  const rankOf = (v, asc) => GXE.ranks(v.map(x => (asc ? x : -x)));

  /* ================= data ================= */
  function status() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Cargue los datos en el Bloque 3.', en: 'Load the data in Block 3.' };
    if (D.mating.design === 'generations') return { ok: false, es: 'Las generaciones se analizan en el Bloque 7; aquí se necesitan genotipos evaluados en varios ambientes.', en: 'Generations are analysed in Block 7; this block needs genotypes evaluated in several environments.' };
    if (!D.ds.traits.length) return { ok: false, es: 'No hay variables respuesta.', en: 'There are no response traits.' };
    if (!D.field.multiEnv || D.field.envs.length < 2) return { ok: false, es: 'La interacción genotipo × ambiente necesita los mismos genotipos evaluados en dos o más ambientes (localidades, años o fechas). Los datos cargados tienen un solo ambiente; en el Bloque 3 asigne el papel «ambiente» a la columna que los distingue, o cargue un ejemplo multiambiente.', en: 'Genotype × environment interaction needs the same genotypes evaluated in two or more environments (locations, years or dates). The data loaded have one environment only; in Block 3 give the "environment" role to the column that tells them apart, or load a multi-environment example.' };
    return { ok: true };
  }

  function tableOf(j) {
    const k = 'tab|' + j + '|' + B9.imputeAxes;
    if (B9.cache.has(k)) return B9.cache.get(k);
    const D = state.data;
    const tab = GXE.prune(GXE.fromTrial(D.ds, D.field, D.ds.traits[j], { excluded: D.excluded, external: D.external }));
    B9.cache.set(k, tab);
    return tab;
  }
  function analyse() {
    const key = [B9.trait, B9.lower, B9.seMode, B9.annAlpha, B9.alphaLSD, B9.axesRule, B9.waasAxes, B9.wY, B9.imputeAxes].join('|');
    if (B9.cache.has(key)) return B9.cache.get(key);
    const tab = tableOf(B9.trait);
    let res;
    if (tab.genos.length < 3 || tab.envs.length < 2) res = { error: { es: 'Se necesitan al menos 3 genotipos y 2 ambientes con datos.', en: 'At least 3 genotypes and 2 environments with data are needed.' }, tab };
    else res = GXE.run(tab, { lower: B9.lower, seMode: B9.seMode, annAlpha: B9.annAlpha, alphaLSD: B9.alphaLSD, axesRule: B9.axesRule, waasAxes: B9.waasAxes || undefined, wY: B9.wY, wS: 100 - B9.wY, imputeAxes: B9.imputeAxes });
    B9.cache.set(key, res);
    return res;
  }

  /* ================= 1 · the table ================= */
  function renderTable(res) {
    const tab = res.tab, A = res.anova;
    const name = tab.trait;
    el('b9Source').innerHTML = T(
      `<b>${esc(name)}</b>: ${res.g} genotipos × ${res.e} ambientes. Error combinado en escala de parcela: CM = ${f4(tab.mse)} con ${isFinite(tab.dfe) ? tab.dfe : '—'} gl, r = ${fmtNum(tab.r, 3)}${tab.meansOnly ? (tab.external ? ' (dado con el ejemplo o en el Bloque 3)' : '') : ' (media armónica)'}.`,
      `<b>${esc(name)}</b>: ${res.g} genotypes × ${res.e} environments. Pooled error on the plot scale: MS = ${f4(tab.mse)} with ${isFinite(tab.dfe) ? tab.dfe : '—'} df, r = ${fmtNum(tab.r, 3)}${tab.meansOnly ? (tab.external ? ' (given with the example or in Block 3)' : '') : ' (harmonic mean)'}.`);
    const notes = [];
    if (!(tab.mse > 0)) notes.push({ level: 'warning', es: 'No hay error experimental: con solo medias, escriba en el Bloque 3 el cuadrado medio del error y sus grados de libertad. Sin él no hay pruebas de S²d, de la varianza de Shukla, de los ejes AMMI ni el índice de Kang.', en: 'There is no experimental error: with means only, type the error mean square and its degrees of freedom in Block 3. Without it there are no tests of S²d, of Shukla\'s variance or of the AMMI axes, and no Kang index.' });
    if (tab.dropped && (tab.dropped.genos.length || tab.dropped.envs.length)) notes.push({ level: 'warning', es: `Se omitieron por tener muy pocos datos: ${plural(tab.dropped.genos.length, 'genotipo', 'genotipos')} (${tab.dropped.genos.slice(0, 8).map(esc).join(', ')}${tab.dropped.genos.length > 8 ? '…' : ''}) y ${plural(tab.dropped.envs.length, 'ambiente', 'ambientes')}.`, en: `Left out for having too few data: ${plural(tab.dropped.genos.length, 'genotype', 'genotypes')} (${tab.dropped.genos.slice(0, 8).map(esc).join(', ')}${tab.dropped.genos.length > 8 ? '…' : ''}) and ${plural(tab.dropped.envs.length, 'environment', 'environments')}.` });
    if (res.imp.n) notes.push({ level: 'info', es: `${plural(res.imp.n, 'celda vacía de la tabla se estimó', 'celdas vacías de la tabla se estimaron')} por EM-AMMI con ${plural(res.imp.axes, 'eje', 'ejes')} (Gauch y Zobel 1990; ${res.imp.iter} iteraciones). En el análisis de varianza la interacción pierde un grado de libertad por celda estimada; las demás estadísticas tratan esas celdas como datos. El análisis en dos etapas (abajo) usa solo las celdas observadas.`, en: `${plural(res.imp.n, 'empty cell of the table was', 'empty cells of the table were')} imputed by EM-AMMI with ${plural(res.imp.axes, 'axis', 'axes')} (Gauch & Zobel 1990; ${res.imp.iter} iterations). In the analysis of variance the interaction loses one degree of freedom per imputed cell; the other statistics take those cells as data. The two-stage analysis (below) uses the observed cells only.` });
    msg('b9TableMsg', notes);
    const row = k => A.rows.find(r => r.key === k);
    el('b9Tiles').innerHTML = [
      tile('Genotipos', 'Genotypes', res.g), tile('Ambientes', 'Environments', res.e),
      tile('SC de ambientes', 'SS of environments', fmtFixed(row('env').pct, 1) + ' %'),
      tile('SC de genotipos', 'SS of genotypes', fmtFixed(row('geno').pct, 1) + ' %'),
      tile('SC de G × A', 'SS of G × E', fmtFixed(row('ge').pct, 1) + ' %'),
      tile('CV', 'CV', isFinite(A.cv) ? fmtNum(A.cv, 2) + ' %' : '—'),
    ].join('');
    const lab = {
      env: T('Ambientes', 'Environments'), rep: T('Repeticiones dentro de ambientes', 'Replicates within environments'),
      geno: T('Genotipos', 'Genotypes'), ge: T('Genotipos × ambientes', 'Genotypes × environments'), error: T('Error combinado', 'Pooled error'),
    };
    table('b9Anova', [
      { label: T('Fuente', 'Source'), get: r => lab[r.key] },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: T('SC', 'SS'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: T('CM', 'MS'), num: true, get: r => fmtNum(r.ms, 4) },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? fmtFixed(r.F, 3) + (r.against ? ` <span class="hint">/ ${r.against === 'ge' ? 'G×A' : 'rep'}</span>` : '') : '') },
      { label: 'p', num: true, get: r => sig(r.p) },
      { label: T('F contra el error', 'F against error'), num: true, get: r => (isFinite(r.F2) ? `${fmtFixed(r.F2, 3)} · ${sig(r.p2)}` : '') },
      { label: T('% de la SC', '% of the SS'), num: true, get: r => (isFinite(r.pct) ? fmtNum(r.pct, 1) : '') },
    ], A.rows);
    el('b9AnovaNote').innerHTML = T(
      'Análisis de la tabla de medias multiplicado por r (escala de parcela). Los genotipos se prueban contra la interacción si los ambientes son una muestra de la región objetivo, y contra el error combinado si son los únicos que interesan; los ambientes, contra las repeticiones dentro de ambientes.',
      'Analysis of the table of means multiplied by r (plot scale). Genotypes are tested against the interaction when the environments sample the target region, and against the pooled error when they are the only ones of interest; environments, against replicates within environments.');
    mountFig('b9FigHeat', {
      title: () => T('Tabla genotipo × ambiente', 'Genotype × environment table'), fileName: 'gxe_table',
      render: c => P9.heat(c, { Y: res.Y, Z: GXE.additive(res.Y).Z, genos: tab.genos, envs: tab.envs, gm: A.gm, em: A.em, imputed: res.imp.imputed, nImputed: res.imp.n }),
      controls: () => [P2.titleControl(), { key: 'show', label: T('Mostrar', 'Show'), type: 'select', options: [['means', T('medias', 'means')], ['ge', T('interacción (residuos del modelo aditivo)', 'interaction (residuals of the additive model)')]] }, { key: 'colormap', label: T('Colores', 'Colours'), type: 'select', options: Object.entries(Fig.colormapNames) }, { key: 'showValues', label: T('Valores en las celdas', 'Values in the cells'), type: 'checkbox' }],
    }, { width: 900, height: Math.max(420, Math.min(1000, 150 + 18 * res.g)), show: 'means', showValues: true });
    /* the table itself */
    const envs = tab.envs;
    el('b9Means').innerHTML = '<table><thead><tr><th>' + T('Genotipo', 'Genotype') + '</th>' + envs.map(e => `<th class="num">${esc(e)}</th>`).join('') + `<th class="num">${T('Media', 'Mean')}</th></tr></thead><tbody>`
      + tab.genos.map((gname, i) => `<tr><td>${esc(gname)}</td>` + envs.map((_, j) => `<td class="num">${res.imp.imputed[i][j] ? `<i>${f3(res.Y[i][j])}*</i>` : f3(res.Y[i][j])}</td>`).join('') + `<td class="num"><b>${f3(A.gm[i])}</b></td></tr>`).join('')
      + `<tr class="total-row"><td>${T('Media', 'Mean')}</td>` + A.em.map(v => `<td class="num">${f3(v)}</td>`).join('') + `<td class="num"><b>${f3(A.grand)}</b></td></tr></tbody></table>`
      + (res.imp.n ? `<p class="hint">* ${T('estimada por EM-AMMI', 'imputed by EM-AMMI')}</p>` : '');
    renderStageTwo(res);
  }

  function renderStageTwo(res) {
    const tab = res.tab, box = el('b9Het');
    if (!tab.envErr) { box.style.display = 'none'; return; }
    box.style.display = '';
    table('b9EnvErr', [
      { label: T('Ambiente', 'Environment'), get: r => esc(r.env) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: T('CM del error', 'Error MS'), num: true, get: r => f4(r.mse) },
      { label: T('gl', 'df'), num: true, get: r => r.dfe },
      { label: 'r', num: true, get: r => fmtNum(r.r, 2) },
      { label: 'CV %', num: true, get: r => fmtNum(r.cv, 2) },
    ], tab.envErr);
    const b = tab.bartlett, s = res.stage2;
    let note = b ? T(`Prueba de Bartlett de igualdad de varianzas del error: χ² = ${fmtNum(b.K2, 3)} con ${b.df} gl, ${pEq(b.p)}; cociente mayor/menor = ${fmtNum(b.fmax, 2)}.`, `Bartlett's test of equal error variances: χ² = ${fmtNum(b.K2, 3)} with ${b.df} df, ${pEq(b.p)}; largest/smallest ratio = ${fmtNum(b.fmax, 2)}.`) : '';
    if (!s) { el('b9HetNote').innerHTML = note; el('b9Stage2').innerHTML = ''; return; }
    note += ' ' + T(
      `Modelo en dos etapas: la media de cada genotipo en cada ambiente lleva la varianza de su propio ambiente (conocida por la primera etapa) y la interacción es aleatoria. σ²GA (REML) = ${f4(s.s2GE)}; razón de verosimilitudes para σ²GA = 0: ${fmtNum(s.lrt, 3)}, ${pEq(s.pLrt)} (mezcla ½χ²₀ + ½χ²₁). Prueba de Wald de medias iguales: F = ${fmtNum(s.F, 3)} con ${s.df1} y ${s.df2} gl (aproximados), ${pEq(s.p)}. Error estándar medio de una diferencia: ${f4(s.sed)}.`,
      `Two-stage model: the mean of every genotype in every environment carries the variance of its own environment (known from stage one) and the interaction is random. σ²GE (REML) = ${f4(s.s2GE)}; likelihood ratio for σ²GE = 0: ${fmtNum(s.lrt, 3)}, ${pEq(s.pLrt)} (mixture ½χ²₀ + ½χ²₁). Wald test of equal means: F = ${fmtNum(s.F, 3)} with ${s.df1} and ${s.df2} df (approximate), ${pEq(s.p)}. Mean standard error of a difference: ${f4(s.sed)}.`);
    el('b9HetNote').innerHTML = note;
    const simple = tab.Y.map(r => { const v = r.filter(isFinite); return v.reduce((a, x) => a + x, 0) / v.length; });
    const rw = rankOf(s.means, B9.lower), rs = rankOf(simple, B9.lower);
    const rows = tab.genos.map((gname, i) => ({ gname, simple: simple[i], m: s.means[i], se: s.se[i], rw: rw[i], rs: rs[i] })).sort((a, b) => a.rw - b.rw);
    table('b9Stage2', [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.gname) },
      { label: T('Media simple', 'Plain mean'), num: true, get: r => f4(r.simple) },
      { label: T('Media en dos etapas', 'Two-stage mean'), num: true, get: r => `<b>${f4(r.m)}</b>` },
      { label: T('EE', 'SE'), num: true, get: r => f4(r.se) },
      { label: T('Lugar', 'Rank'), num: true, get: r => fmtNum(r.rw, 1) },
      { label: T('Lugar por la media simple', 'Rank by the plain mean'), num: true, get: r => (r.rs !== r.rw ? `<b>${fmtNum(r.rs, 1)}</b>` : fmtNum(r.rs, 1)) },
    ], rows);
  }

  /* ================= 2 · regression on the environmental index ================= */
  function interpretB(x, e) {
    const out = [];
    if (x.p < 0.05) out.push(x.b > 1 ? T('responde más que el promedio a los buenos ambientes', 'responds more than average to good environments') : T('responde menos que el promedio: adaptado a ambientes pobres', 'responds less than average: adapted to poor environments'));
    if (x.pDev < 0.05) out.push(T('desviaciones significativas: respuesta poco predecible', 'significant deviations: unpredictable response'));
    return out.join('; ') || T('estable en el sentido de Eberhart y Russell', 'stable in the sense of Eberhart & Russell');
  }
  function renderRegression(res) {
    const R = res.reg, host = el('b9Reg');
    if (!R) { host.style.display = 'none'; return; }
    host.style.display = '';
    const names = res.tab.genos;
    const rows = R.geno.map(x => Object.assign({ name: names[x.i] }, x)).sort((a, b) => (B9.lower ? a.mean - b.mean : b.mean - a.mean));
    rows.forEach(r => { r._cls = r.p < 0.05 || r.pDev < 0.05 ? 'row-flag' : ''; });
    table('b9RegTable', [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: 'b ± EE', num: true, get: r => `${fmtFixed(r.b, 3)} <span class="hint">± ${fmtFixed(r.seB, 3)}</span>` },
      { label: 't (b = 1)', num: true, get: r => fmtFixed(r.t, 2) },
      { label: 'p', num: true, get: r => sig(r.p) },
      { label: 'S²d', num: true, get: r => (isFinite(r.s2d) ? fmtNum(r.s2d, 4) : '') },
      { label: 'F (S²d = 0)', num: true, get: r => (isFinite(r.Fdev) ? fmtFixed(r.Fdev, 2) : '') },
      { label: 'p', num: true, get: r => sig(r.pDev) },
      { label: 'R²', num: true, get: r => fmtFixed(r.r2, 3) },
      { label: T('Lectura', 'Reading'), get: r => `<span class="hint">${interpretB(r, res.e)}</span>` },
    ], rows);
    const mode = { own: T(`las desviaciones del propio genotipo (${res.e - 2} gl)`, `the genotype's own deviations (${res.e - 2} df)`), pooled: T(`las desviaciones combinadas (${R.dfPool} gl)`, `the pooled deviations (${R.dfPool} df)`), error: T('el error experimental combinado', 'the pooled experimental error') }[R.seMode];
    el('b9RegNote').innerHTML = T(
      `Índice ambiental I<sub>j</sub> = media del ambiente − media general. b = Σ Y<sub>ij</sub>I<sub>j</sub>/Σ I<sub>j</sub>² (Finlay y Wilkinson 1963); β = b − 1 es el parámetro de Perkins y Jinks (1968). El error estándar de b viene de ${mode}. S²d = CM de desviaciones − CM<sub>e</sub>/r (Eberhart y Russell 1966), probada con F = CM<sub>desv</sub>/(CM<sub>e</sub>/r) con ${res.e - 2} y ${res.tab.dfe} gl. Como el índice contiene al propio genotipo, esa F tiene esperanza (g − 1)/g sin interacción y la prueba es algo conservadora con pocos genotipos.`,
      `Environmental index I<sub>j</sub> = environment mean − grand mean. b = Σ Y<sub>ij</sub>I<sub>j</sub>/Σ I<sub>j</sub>² (Finlay & Wilkinson 1963); β = b − 1 is the parameter of Perkins & Jinks (1968). The standard error of b comes from ${mode}. S²d = deviation MS − MS<sub>e</sub>/r (Eberhart & Russell 1966), tested with F = MS<sub>dev</sub>/(MS<sub>e</sub>/r) with ${res.e - 2} and ${res.tab.dfe} df. Because the index contains the genotype itself, that F has expectation (g − 1)/g without interaction and the test is somewhat conservative with few genotypes.`);
    if (res.e < 4) msg('b9RegMsg', [{ level: 'warning', es: 'Con 3 ambientes cada regresión tiene un solo grado de libertad para las desviaciones: sus pruebas tienen muy poca potencia.', en: 'With 3 environments every regression has one degree of freedom for deviations: its tests have very little power.' }]);
    else clearMessages('b9RegMsg');
    const lab = { total: T('Total', 'Total'), geno: T('Genotipos', 'Genotypes'), envGe: T('Ambientes + G × A', 'Environments + G × E'), envLin: T('Ambientes (lineal)', 'Environments (linear)'), geLin: T('G × A (lineal): heterogeneidad de pendientes', 'G × E (linear): heterogeneity of slopes'), pooledDev: T('Desviaciones combinadas', 'Pooled deviations'), error: T('Error combinado', 'Pooled error') };
    table('b9RegAnova', [
      { label: T('Fuente', 'Source'), get: r => (r.key === 'dev' ? `<span class="hint">&nbsp;&nbsp;&nbsp;&nbsp;${esc(names[r.i])}</span>` : r.sub ? `&nbsp;&nbsp;${lab[r.key]}` : lab[r.key]) },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: T('SC', 'SS'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: T('CM', 'MS'), num: true, get: r => (isFinite(r.ms) ? fmtNum(r.ms, 4) : '') },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? fmtFixed(r.F, 3) : '') },
      { label: 'p', num: true, get: r => sig(r.p) },
    ], R.rows);
    el('b9RegAnovaNote').innerHTML = T(
      `Escala de parcela (× r). Las desviaciones combinadas tienen (g − 1)(e − 2) = ${R.dfPool} gl: las desviaciones de todos los genotipos suman cero en cada ambiente. Eberhart y Russell (1966) contaban g(e − 2) = ${R.dfPoolER}; con esa cuenta su CM sería ${fmtNum(R.msPoolER * res.tab.r, 4)}.`,
      `Plot scale (× r). The pooled deviations have (g − 1)(e − 2) = ${R.dfPool} df: the deviations of all genotypes add to zero in every environment. Eberhart & Russell (1966) counted g(e − 2) = ${R.dfPoolER}; with that count their MS would be ${fmtNum(R.msPoolER * res.tab.r, 4)}.`);
    const byMean = R.geno.map(x => x.i).sort((a, b) => (B9.lower ? R.geno[a].mean - R.geno[b].mean : R.geno[b].mean - R.geno[a].mean));
    const hl = () => {
      const c = (Fig.registry.b9FigNorms && Fig.registry.b9FigNorms.cfg) || {};
      if (c.highlight === 'extremes') { const s = R.geno.map(x => x.i).sort((a, b) => R.geno[a].b - R.geno[b].b); return [...new Set([s[0], s[1], s[s.length - 1], s[s.length - 2], byMean[0]])]; }
      if (c.highlight === 'none') return [];
      return byMean.slice(0, 5);
    };
    mountFig('b9FigNorms', {
      title: () => T('Respuesta al índice ambiental', 'Response to the environmental index'), fileName: 'gxe_regression',
      render: c => P9.norms(c, { I: R.I, Y: res.Y, geno: R.geno, names, grand: res.anova.grand, trait: res.tab.trait, highlight: hl() }),
      controls: () => [P2.titleControl(), { key: 'highlight', label: T('Resaltar', 'Highlight'), type: 'select', options: [['top', T('las 5 mejores medias', 'the 5 best means')], ['extremes', T('pendientes extremas', 'extreme slopes')], ['none', T('ninguno', 'none')]] }, { key: 'showPoints', label: T('Medias observadas', 'Observed means'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 880, height: 540, highlight: 'top', showPoints: true });
    mountFig('b9FigMeanB', {
      title: () => T('Media y coeficiente de regresión', 'Mean and regression coefficient'), fileName: 'gxe_mean_b',
      render: c => P9.vsMean(c, {
        titleEs: 'Media y coeficiente de regresión', titleEn: 'Mean and regression coefficient',
        x: R.geno.map(x => x.mean), y: R.geno.map(x => x.b), names, xRef: res.anova.grand, yRef: 1,
        xlab: res.tab.trait, ylab: 'b', flag: R.geno.map(x => x.pDev < 0.05),
        flagLabel: T('S²d significativa', 'significant S²d'), otherLabel: T('S²d no significativa', 'S²d not significant'),
        quadrants: B9.lower
          ? [T('menor media · responde a buenos', 'lower mean · responds to good'), T('mayor valor · responde a buenos', 'higher value · responds to good'), T('menor media · adaptado a pobres', 'lower mean · adapted to poor'), T('mayor valor · adaptado a pobres', 'higher value · adapted to poor')]
          : [T('baja media · responde a buenos ambientes', 'low mean · responds to good environments'), T('alta media · adaptación específica a buenos', 'high mean · specific adaptation to good'), T('baja media · pobre adaptación', 'low mean · poor adaptation'), T('alta media · adaptado a ambientes pobres', 'high mean · adapted to poor environments')],
      }),
      controls: () => [P2.titleControl(), { key: 'showQuadrants', label: T('Nombres de los cuadrantes', 'Quadrant names'), type: 'checkbox' }, { key: 'showLabels', label: T('Nombres de los genotipos', 'Genotype names'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 820, height: 540, showQuadrants: true, showLabels: true });
  }

  /* ================= 3 · stability variances, superiority, reliability ================= */
  function renderVariances(res) {
    const host = el('b9Var');
    if (!res.vars) { host.style.display = 'none'; return; }
    host.style.display = '';
    const names = res.tab.genos;
    const rows = res.vars.map((v, i) => Object.assign({ name: names[i], mean: res.anova.gm[i], sup: res.sup.rows[i], ann: res.ann ? res.ann.rows[i] : null }, v)).sort((a, b) => a.sigma2 - b.sigma2);
    table('b9VarTable', [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: 'W<sub>i</sub>', num: true, get: r => fmtNum(r.W, 4) },
      { label: 'W<sub>i</sub> %', num: true, get: r => fmtNum(r.Wpct, 2) },
      { label: 'σ²<sub>i</sub>', num: true, get: r => fmtNum(r.sigma2, 4) },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? fmtFixed(r.F, 2) : '') },
      { label: 'p', num: true, get: r => sig(r.p) },
      { label: 's²<sub>i</sub>', num: true, get: r => fmtNum(r.s2, 4) },
      { label: 'p', num: true, get: r => sig(r.ps) },
    ], rows);
    el('b9VarNote').innerHTML = T(
      `Ecovalencia de Wricke (1962) W<sub>i</sub> = r Σ<sub>j</sub> (Y<sub>ij</sub> − Ȳ<sub>i·</sub> − Ȳ<sub>·j</sub> + Ȳ<sub>··</sub>)², y su porcentaje del total. Varianza de estabilidad de Shukla (1972) σ²<sub>i</sub> = [g(g − 1)W<sub>i</sub> − ΣW]/[(g − 1)(g − 2)(e − 1)]: estima la varianza de la interacción más el error de ese genotipo (su promedio es el CM de la interacción) y se prueba con F = σ²<sub>i</sub>/CM<sub>e</sub> con ${res.e - 1} y ${res.tab.dfe} gl. s²<sub>i</sub> es la misma varianza después de quitar la regresión sobre el índice ambiental (${res.e - 2} gl). Escala de parcela; en escala de medias divida entre r.`,
      `Wricke's (1962) ecovalence W<sub>i</sub> = r Σ<sub>j</sub> (Y<sub>ij</sub> − Ȳ<sub>i·</sub> − Ȳ<sub>·j</sub> + Ȳ<sub>··</sub>)², and its percentage of the total. Shukla's (1972) stability variance σ²<sub>i</sub> = [g(g − 1)W<sub>i</sub> − ΣW]/[(g − 1)(g − 2)(e − 1)]: it estimates the interaction plus error variance of that genotype (its average is the interaction MS) and is tested with F = σ²<sub>i</sub>/MS<sub>e</sub> with ${res.e - 1} and ${res.tab.dfe} df. s²<sub>i</sub> is the same variance after removing the regression on the environmental index (${res.e - 2} df). Plot scale; divide by r for the means scale.`);
    const nf = res.sup.fav.filter(Boolean).length;
    const sRows = rows.slice().sort((a, b) => a.sup.P - b.sup.P);
    const cols = [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: 'P<sub>i</sub>', num: true, get: r => `<b>${fmtNum(r.sup.P, 4)}</b>` },
      { label: T('parte genética %', 'genetic part %'), num: true, get: r => fmtNum(100 * r.sup.Pgen / r.sup.P, 1) },
      { label: T('P<sub>i</sub> favorables', 'P<sub>i</sub> favourable'), num: true, get: r => fmtNum(r.sup.Pfav, 4) },
      { label: T('P<sub>i</sub> desfavorables', 'P<sub>i</sub> unfavourable'), num: true, get: r => fmtNum(r.sup.Punf, 4) },
    ];
    if (res.ann) cols.push(
      { label: T('W<sub>i</sub> (Annicchiarico)', 'W<sub>i</sub> (Annicchiarico)'), num: true, get: r => `<b>${fmtNum(r.ann.all.W, 2)}</b>` },
      { label: T('favorables', 'favourable'), num: true, get: r => fmtNum(r.ann.fav.W, 2) },
      { label: T('desfavorables', 'unfavourable'), num: true, get: r => fmtNum(r.ann.unf.W, 2) });
    table('b9SupTable', cols, sRows);
    el('b9SupNote').innerHTML = T(
      `Superioridad de Lin y Binns (1988): P<sub>i</sub> = Σ<sub>j</sub> (Y<sub>ij</sub> − M<sub>j</sub>)²/(2e), con M<sub>j</sub> la ${B9.lower ? 'menor' : 'mayor'} media del ambiente j; se parte en una fracción genética, e(Ȳ<sub>i·</sub> − M̄)²/(2e), y otra de interacción, y se calcula aparte en los ${nf} ambientes favorables (índice ≥ 0) y los ${res.e - nf} desfavorables. ${res.ann ? `Confiabilidad de Annicchiarico (1992): W<sub>i</sub> = media − z<sub>1−α</sub>·DE del desempeño relativo 100·Y<sub>ij</sub>/Ȳ<sub>·j</sub>, con α = ${B9.annAlpha} (z = ${fmtFixed(res.ann.z, 4)}): el desempeño relativo que el genotipo supera con probabilidad 1 − α.` : 'La confiabilidad de Annicchiarico solo se da para variables en que el mayor valor es el mejor.'}`,
      `Superiority of Lin & Binns (1988): P<sub>i</sub> = Σ<sub>j</sub> (Y<sub>ij</sub> − M<sub>j</sub>)²/(2e), with M<sub>j</sub> the ${B9.lower ? 'lowest' : 'highest'} mean of environment j; it is split into a genetic fraction, e(Ȳ<sub>i·</sub> − M̄)²/(2e), and an interaction one, and computed apart in the ${nf} favourable environments (index ≥ 0) and the ${res.e - nf} unfavourable ones. ${res.ann ? `Reliability of Annicchiarico (1992): W<sub>i</sub> = mean − z<sub>1−α</sub>·SD of the relative performance 100·Y<sub>ij</sub>/Ȳ<sub>·j</sub>, with α = ${B9.annAlpha} (z = ${fmtFixed(res.ann.z, 4)}): the relative performance the genotype exceeds with probability 1 − α.` : 'Annicchiarico\'s reliability is given only for traits where the highest value is the best.'}`);
    el('b9AnnField').style.display = res.ann ? '' : 'none';
  }

  /* ================= 4 · rank statistics and Kang ================= */
  function renderRanks(res) {
    const host = el('b9Rank');
    if (!res.huehn) { host.style.display = 'none'; return; }
    host.style.display = '';
    const names = res.tab.genos, H = res.huehn;
    const rows = H.rows.map(x => Object.assign({ name: names[x.i], mean: res.anova.gm[x.i] }, x)).sort((a, b) => a.S1 - b.S1);
    table('b9HuehnTable', [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: 'S⁽¹⁾', num: true, get: r => fmtNum(r.S1, 4) },
      { label: 'Z⁽¹⁾', num: true, get: r => `${fmtFixed(r.Z1, 3)}${r.p1 < 0.05 ? ' <span class="sig">*</span>' : ''}` },
      { label: 'S⁽²⁾', num: true, get: r => fmtNum(r.S2, 4) },
      { label: 'Z⁽²⁾', num: true, get: r => `${fmtFixed(r.Z2, 3)}${r.p2 < 0.05 ? ' <span class="sig">*</span>' : ''}` },
      { label: 'S⁽³⁾', num: true, get: r => fmtNum(r.S3, 3) },
      { label: 'S⁽⁶⁾', num: true, get: r => fmtNum(r.S6, 3) },
    ], rows);
    el('b9HuehnNote').innerHTML = T(
      `Rangos de Huehn (1979, 1990): S⁽¹⁾ es la diferencia absoluta media entre los rangos del genotipo en cada par de ambientes y S⁽²⁾ su varianza, con datos corregidos por el efecto del genotipo (Y<sub>ij</sub> − Ȳ<sub>i·</sub> + Ȳ<sub>··</sub>); S⁽³⁾ y S⁽⁶⁾ usan los datos sin corregir, divididos entre el rango medio, y combinan rendimiento y estabilidad. Rango 1 = ${B9.lower ? 'mayor' : 'menor'} valor. Pruebas de Nassar y Huehn (1987): Z = (S − E)²/V ~ χ²₁ con E(S⁽¹⁾) = ${fmtFixed(H.E1, 3)}, V = ${fmtFixed(H.V1, 4)}, E(S⁽²⁾) = ${fmtFixed(H.E2, 3)}, V = ${fmtFixed(H.V2, 4)}; * = inestable (p < 0.05). Suma de Z⁽¹⁾ = ${fmtFixed(H.sumZ1, 3)} (${pEq(H.pSum1)}) y de Z⁽²⁾ = ${fmtFixed(H.sumZ2, 3)} (${pEq(H.pSum2)}), χ² con ${res.g} gl: prueban si hay diferencias de estabilidad entre los genotipos.`,
      `Huehn's (1979, 1990) ranks: S⁽¹⁾ is the mean absolute difference between the ranks of the genotype in every pair of environments and S⁽²⁾ their variance, with data corrected for the genotype effect (Y<sub>ij</sub> − Ȳ<sub>i·</sub> + Ȳ<sub>··</sub>); S⁽³⁾ and S⁽⁶⁾ use the uncorrected data, divided by the mean rank, and combine yield and stability. Rank 1 = ${B9.lower ? 'highest' : 'lowest'} value. Tests of Nassar & Huehn (1987): Z = (S − E)²/V ~ χ²₁ with E(S⁽¹⁾) = ${fmtFixed(H.E1, 3)}, V = ${fmtFixed(H.V1, 4)}, E(S⁽²⁾) = ${fmtFixed(H.E2, 3)}, V = ${fmtFixed(H.V2, 4)}; * = unstable (p < 0.05). Sum of Z⁽¹⁾ = ${fmtFixed(H.sumZ1, 3)} (${pEq(H.pSum1)}) and of Z⁽²⁾ = ${fmtFixed(H.sumZ2, 3)} (${pEq(H.pSum2)}), χ² with ${res.g} df: they test whether the genotypes differ in stability.`);
    const K = res.kang, kb = el('b9KangBox');
    if (!K) { kb.style.display = 'none'; return; }
    kb.style.display = '';
    const kr = K.rows.map(x => Object.assign({ name: names[x.i] }, x)).sort((a, b) => b.ysi - a.ysi);
    kr.forEach(r => { r._cls = r.selected ? 'row-best' : ''; });
    table('b9KangTable', [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: T('Rango', 'Rank'), num: true, get: r => r.rank },
      { label: T('Ajuste por la DMS', 'LSD adjustment'), num: true, get: r => (r.adj > 0 ? '+' : '') + fmtNum(r.adj) },
      { label: 'σ²<sub>i</sub>', num: true, get: r => fmtNum(r.sigma2, 4) },
      { label: T('Calificación de estabilidad', 'Stability rating'), num: true, get: r => fmtNum(r.stab) },
      { label: 'YS<sub>i</sub>', num: true, get: r => `<b>${fmtNum(r.ysi)}</b>` },
      { label: T('Seleccionado', 'Selected'), get: r => (r.selected ? '✔' : '') },
    ], kr);
    el('b9KangNote').innerHTML = T(
      `Kang (1993): el rango por la media (1 = ${B9.lower ? 'mayor' : 'menor'}) se ajusta con la DMS = t<sub>${1 - B9.alphaLSD}</sub>·√(2CM<sub>e</sub>/re) = ${f4(K.lsd)} (+1, +2 o +3 si la media supera la media general en 0, 1 o 2 DMS; −1, −2 o −3 si queda abajo) y se castiga la inestabilidad de Shukla: −2, −4 u −8 si su F es significativa al 10, 5 o 1 %. Se seleccionan los genotipos con YS<sub>i</sub> mayor que su promedio (${fmtNum(K.meanYsi, 2)}).`,
      `Kang (1993): the rank by the mean (1 = ${B9.lower ? 'highest' : 'lowest'}) is adjusted with the LSD = t<sub>${1 - B9.alphaLSD}</sub>·√(2MS<sub>e</sub>/re) = ${f4(K.lsd)} (+1, +2 or +3 when the mean exceeds the grand mean by 0, 1 or 2 LSD; −1, −2 or −3 when below) and Shukla's instability is penalised: −2, −4 or −8 when its F is significant at 10, 5 or 1 %. The genotypes with YS<sub>i</sub> above its average (${fmtNum(K.meanYsi, 2)}) are selected.`);
  }

  /* ================= 5 · AMMI ================= */
  function renderAmmi(res) {
    const A = res.ammi, host = el('b9Ammi');
    if (!A) { host.style.display = 'none'; return; }
    host.style.display = '';
    const sel = el('b9WaasAxes');
    const opts = [['0', T('según la prueba elegida', 'by the chosen test')]].concat(A.axes.map(a => [String(a.k), String(a.k)]));
    sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    sel.value = String(B9.waasAxes || 0);
    const noErr = !(res.tab.mse > 0);
    table('b9AxesTable', [
      { label: T('Eje', 'Axis'), get: r => (r.resid ? T('Residuo', 'Residual') : 'IPCA' + r.k) },
      { label: T('Valor singular', 'Singular value'), num: true, get: r => (r.sv != null ? f4(r.sv) : '') },
      { label: T('SC', 'SS'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: '%', num: true, get: r => (r.pct != null ? fmtNum(r.pct, 2) : '') },
      { label: T('% acumulado', 'cumulative %'), num: true, get: r => (r.cum != null ? fmtNum(r.cum, 2) : '') },
      { label: T('gl (Gollob)', 'df (Gollob)'), num: true, get: r => r.df },
      { label: T('CM', 'MS'), num: true, get: r => (isFinite(r.ms) ? fmtNum(r.ms, 4) : '') },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? fmtFixed(r.F, 3) : '') },
      { label: 'p', num: true, get: r => sig(r.p) },
    ], A.axes.filter(a => a.df > 0).concat(A.resid.df > 0 ? [Object.assign({ resid: true }, A.resid)] : []));
    table('b9FRTable', [
      { label: T('Modelo', 'Model'), get: r => `AMMI${r.n}` },
      { label: T('SC que queda', 'SS left'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: T('CM', 'MS'), num: true, get: r => fmtNum(r.ms, 4) },
      { label: 'F<sub>R</sub>', num: true, get: r => (isFinite(r.F) ? fmtFixed(r.F, 3) : '') },
      { label: 'p', num: true, get: r => sig(r.p) },
    ], A.FR);
    el('b9AxesNote').innerHTML = noErr ? T('Sin error experimental no hay pruebas de los ejes; WAAS usa dos ejes o los que se elijan.', 'Without experimental error the axes cannot be tested; WAAS uses two axes or the number chosen.') : T(
      `Gollob (1968): ${plural(A.nGollob, 'eje significativo', 'ejes significativos')} al 5 %. F<sub>R</sub> de Cornelius y col. (1992) prueba lo que queda de la interacción después de n ejes: basta AMMI${A.nFR}. La prueba de Gollob es liberal —en simulaciones sin interacción declara significativo el primer eje en más de la tercera parte de los casos—, por eso F<sub>R</sub> es la regla por omisión (Piepho 1995). WAAS y WAASY usan ${plural(A.p, 'eje', 'ejes')}.`,
      `Gollob (1968): ${plural(A.nGollob, 'axis', 'axes')} significant at 5 %. The F<sub>R</sub> of Cornelius et al. (1992) tests what is left of the interaction after n axes: AMMI${A.nFR} is enough. Gollob's test is liberal —in simulations without interaction it declares the first axis significant in more than a third of the cases—, which is why F<sub>R</sub> is the default rule (Piepho 1995). WAAS and WAASY use ${plural(A.p, 'axis', 'axes')}.`);
    const names = res.tab.genos;
    const rW = rankOf(A.waas, true), rWY = rankOf(A.waasy, false);
    const rows = names.map((n, i) => ({ name: n, i, mean: A.gm[i], pc1: A.G[i][0], pc2: A.m > 1 ? A.G[i][1] : NaN, asv: A.asv ? A.asv[i] : NaN, rAsv: A.rankAsv ? A.rankAsv[i] : NaN, ysi: A.ysi ? A.ysi[i] : NaN, waas: A.waas[i], rW: rW[i], waasy: A.waasy[i], rWY: rWY[i] })).sort((a, b) => a.rWY - b.rWY);
    table('b9AmmiTable', [
      { label: T('Genotipo', 'Genotype'), get: r => esc(r.name) },
      { label: T('Media', 'Mean'), num: true, get: r => f3(r.mean) },
      { label: 'IPCA1', num: true, get: r => fmtFixed(r.pc1, 4) },
      { label: 'IPCA2', num: true, get: r => (isFinite(r.pc2) ? fmtFixed(r.pc2, 4) : '') },
      { label: 'ASV', num: true, get: r => (isFinite(r.asv) ? fmtFixed(r.asv, 4) : '') },
      { label: 'YSI', num: true, get: r => (isFinite(r.ysi) ? fmtNum(r.ysi, 1) : '') },
      { label: 'WAAS', num: true, get: r => fmtFixed(r.waas, 4) },
      { label: T('Rango WAAS', 'WAAS rank'), num: true, get: r => fmtNum(r.rW, 1) },
      { label: 'WAASY', num: true, get: r => `<b>${fmtFixed(r.waasy, 2)}</b>` },
      { label: T('Rango WAASY', 'WAASY rank'), num: true, get: r => fmtNum(r.rWY, 1) },
    ], rows);
    el('b9AmmiNote').innerHTML = T(
      `Puntuaciones simétricas: genotipos U<sub>k</sub>√λ<sub>k</sub> y ambientes V<sub>k</sub>√λ<sub>k</sub>, de la descomposición en valores singulares de la interacción; SC del eje k = rλ<sub>k</sub>². ASV = √[(SC₁/SC₂·IPCA1)² + IPCA2²] (Purchase y col. 2000); YSI = rango de ASV + rango de la media (Farshadfar 2008). WAAS = Σ|IPCA<sub>ik</sub>|·%<sub>k</sub>/Σ%<sub>k</sub> sobre los ejes usados (Olivoto y col. 2019), con los porcentajes exactos; WAASY reescala media y WAAS a 0–100 (100 = mejor) y los pondera ${B9.wY}/${100 - B9.wY}.`,
      `Symmetric scores: genotypes U<sub>k</sub>√λ<sub>k</sub> and environments V<sub>k</sub>√λ<sub>k</sub>, from the singular value decomposition of the interaction; SS of axis k = rλ<sub>k</sub>². ASV = √[(SS₁/SS₂·IPCA1)² + IPCA2²] (Purchase et al. 2000); YSI = rank of ASV + rank of the mean (Farshadfar 2008). WAAS = Σ|IPCA<sub>ik</sub>|·%<sub>k</sub>/Σ%<sub>k</sub> over the axes used (Olivoto et al. 2019), with the exact percentages; WAASY rescales mean and WAAS to 0–100 (100 = best) and weights them ${B9.wY}/${100 - B9.wY}.`);
    /* the winner of every environment under AMMI-p */
    const W = A.winners(A.p, 3);
    table('b9WinTable', [
      { label: T('Ambiente', 'Environment'), get: r => esc(r.env) },
      { label: T('Índice', 'Index'), num: true, get: r => fmtFixed(r.idx, 3) },
      { label: T('1.º', '1st'), get: r => `<b>${esc(names[r.w[0].i])}</b> <span class="hint">${f3(r.w[0].y)}</span>` },
      { label: T('2.º', '2nd'), get: r => (r.w[1] ? `${esc(names[r.w[1].i])} <span class="hint">${f3(r.w[1].y)}</span>` : '') },
      { label: T('3.º', '3rd'), get: r => (r.w[2] ? `${esc(names[r.w[2].i])} <span class="hint">${f3(r.w[2].y)}</span>` : '') },
    ], res.tab.envs.map((env, j) => ({ env, idx: A.em[j] - A.grand, w: W[j] })).sort((a, b) => a.idx - b.idx));
    el('b9WinNote').innerHTML = T(`Valores predichos por AMMI${A.p}: los efectos principales más ${plural(A.p, 'eje', 'ejes')} de interacción; ambientes de menor a mayor índice.`, `Values predicted by AMMI${A.p}: the main effects plus ${plural(A.p, 'interaction axis', 'interaction axes')}; environments from lowest to highest index.`);
    mountFig('b9FigAmmi1', {
      title: () => T('AMMI1', 'AMMI1'), fileName: 'ammi1',
      render: c => P9.ammi1(c, { G: A.G, E: A.E, gm: A.gm, em: A.em, grand: A.grand, genos: names, envs: res.tab.envs, pct1: A.axes[0].pct, trait: res.tab.trait }),
      controls: () => [P2.titleControl(), { key: 'showLabels', label: T('Nombres', 'Names'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 860, height: 560, showLabels: true });
    if (A.m >= 2) {
      mountFig('b9FigAmmi2', {
        title: () => T('AMMI2', 'AMMI2'), fileName: 'ammi2',
        render: c => P9.biplot(c, { titleEs: 'AMMI2: primeros dos ejes de la interacción', titleEn: 'AMMI2: first two interaction axes', G: A.G.map(s => [s[0], s[1]]), E: A.E.map(s => [s[0], s[1]]), genos: names, envs: res.tab.envs, pct: [A.axes[0].pct, A.axes[1].pct], axisNames: ['IPCA1', 'IPCA2'], view: 'basic' }),
        controls: () => [P2.titleControl(), { key: 'showLabels', label: T('Nombres', 'Names'), type: 'checkbox' }, P2.paletteControl()],
      }, { width: 860, height: 640, showLabels: true });
    }
    mountFig('b9FigWaas', {
      title: () => T('WAAS y media', 'WAAS and mean'), fileName: 'waas',
      render: c => P9.vsMean(c, {
        titleEs: 'Estabilidad (WAAS) y media', titleEn: 'Stability (WAAS) and mean',
        x: A.gm, y: A.waas, names, xRef: A.grand, yRef: A.waas.reduce((s, v) => s + v, 0) / A.waas.length, zeroY: true,
        xlab: res.tab.trait, ylab: 'WAAS',
        quadrants: B9.lower
          ? [T('I · inestable', 'I · unstable'), T('II · inestable', 'II · unstable'), T('III · estable', 'III · stable'), T('IV · estable', 'IV · stable')]
          : [T('I · baja media, inestable', 'I · low mean, unstable'), T('II · alta media, inestable', 'II · high mean, unstable'), T('III · baja media, estable', 'III · low mean, stable'), T('IV · alta media, estable', 'IV · high mean, stable')],
      }),
      controls: () => [P2.titleControl(), { key: 'showQuadrants', label: T('Nombres de los cuadrantes', 'Quadrant names'), type: 'checkbox' }, { key: 'showLabels', label: T('Nombres', 'Names'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 820, height: 540, showQuadrants: true, showLabels: true });
  }

  /* ================= 6 · GGE biplot ================= */
  const VIEWS = {
    basic: { svp: 'symmetric', es: 'Biplot GGE', en: 'GGE biplot' },
    www: { svp: 'symmetric', es: 'Quién ganó dónde', en: 'Which won where' },
    aec: { svp: 'genotype', es: 'Media contra estabilidad', en: 'Mean vs stability' },
    idealG: { svp: 'genotype', es: 'Genotipos comparados con el ideal', en: 'Genotypes against the ideal one' },
    discr: { svp: 'environment', es: 'Discriminación y representatividad', en: 'Discriminativeness vs representativeness' },
    idealE: { svp: 'environment', es: 'Ambientes comparados con el ideal', en: 'Environments against the ideal one' },
    compare: { svp: 'symmetric', es: 'Comparación de dos genotipos', en: 'Comparison of two genotypes' },
  };
  function renderGge(res) {
    const host = el('b9Gge');
    if (!res.gge) { host.style.display = 'none'; return; }
    host.style.display = '';
    const names = res.tab.genos, envs = res.tab.envs;
    const gg = GXE.gge(res.Y, { scaling: B9.scaling, lower: B9.lower });
    if (gg.sv.d.length < 2) { msg('b9GgeMsg', [{ level: 'warning', es: 'La tabla centrada por ambientes tiene un solo componente: no hay biplot.', en: 'The environment-centred table has one component only: there is no biplot.' }]); return; }
    const V = VIEWS[B9.view] || VIEWS.www;
    const svp = B9.svp === 'auto' ? V.svp : B9.svp;
    const C = gg.coords(svp);
    const G2 = C.G.map(s => [s[0], s[1]]), E2 = C.E.map(s => [s[0], s[1]]);
    el('b9GgePair').style.display = B9.view === 'compare' ? '' : 'none';
    const pickers = [el('b9GA'), el('b9GB')];
    pickers.forEach((s, q) => { s.innerHTML = names.map((n, i) => `<option value="${i}">${esc(n)}</option>`).join(''); s.value = String(q ? Math.min(B9.gb, names.length - 1) : Math.min(B9.ga, names.length - 1)); });
    const two = gg.pct[0] + gg.pct[1];
    const notes = [];
    if (two < 60) notes.push({ level: 'warning', es: `Los dos primeros componentes explican solo ${fmtNum(two, 1)} % de G + G×A: el biplot deja fuera buena parte del patrón y conviene leerlo con cautela.`, en: `The first two components explain only ${fmtNum(two, 1)} % of G + G×E: the biplot leaves out much of the pattern and should be read with caution.` });
    if (B9.svp !== 'auto' && svp !== V.svp) notes.push({ level: 'info', es: 'Esta vista se lee mejor con la partición de valores singulares que le corresponde (automática).', en: 'This view reads best with its own singular-value partition (automatic).' });
    msg('b9GgeMsg', notes);
    const spec = { titleEs: V.es, titleEn: V.en, G: G2, E: E2, genos: names, envs, pct: [gg.pct[0], gg.pct[1]], view: B9.view };
    const out = el('b9GgeTable');
    let note = T(`PC1 y PC2 explican ${fmtNum(gg.pct[0], 1)} % y ${fmtNum(gg.pct[1], 1)} % de G + G×A (datos centrados por ambiente${B9.scaling === 'sd' ? ' y divididos entre su desviación estándar' : ''}); partición de los valores singulares centrada en ${{ genotype: 'los genotipos', environment: 'los ambientes', symmetric: 'ambos (simétrica)' }[svp]}.`, `PC1 and PC2 explain ${fmtNum(gg.pct[0], 1)} % and ${fmtNum(gg.pct[1], 1)} % of G + G×E (environment-centred data${B9.scaling === 'sd' ? ' divided by their standard deviation' : ''}); singular-value partition focused on ${{ genotype: 'the genotypes', environment: 'the environments', symmetric: 'both (symmetric)' }[svp]}.`);
    if (B9.lower) note += ' ' + T('Como el menor valor es el mejor, la tabla se multiplicó por −1: «ganar» es tener el menor valor.', 'Because the lowest value is the best, the table was multiplied by −1: "winning" means having the lowest value.');
    if (B9.view === 'www') {
      const w = GXE.whichWon(G2, E2);
      spec.www = w;
      table(out, [
        { label: T('Ganador (vértice)', 'Winner (vertex)'), get: r => `<b>${esc(names[r.winner])}</b>` },
        { label: T('Ambientes de su sector', 'Environments in its sector'), get: r => r.envs.map(j => esc(envs[j])).join(', ') },
        { label: T('Número', 'Number'), num: true, get: r => r.envs.length },
      ], w.mega.sort((a, b) => b.envs.length - a.envs.length));
      note += ' ' + T(`Polígono: la envolvente convexa de los genotipos; las rectas punteadas, perpendiculares a sus lados, dividen el plano en sectores y el genotipo del vértice gana en los ambientes de su sector (Yan y col. 2000). ${plural(w.mega.length, 'grupo', 'grupos')} de ambientes con ganador distinto: posibles megaambientes si el patrón se repite en años.`, `Polygon: the convex hull of the genotypes; the dashed lines, perpendicular to its sides, cut the plane into sectors and the genotype at the vertex wins in the environments of its sector (Yan et al. 2000). ${plural(w.mega.length, 'group', 'groups')} of environments with a different winner: possible mega-environments if the pattern repeats across years.`);
    } else if (B9.view === 'aec' || B9.view === 'idealG') {
      const a = GXE.aec(G2, E2);
      spec.aec = { u: a.u, ideal: a.idealG, dist: a.distG };
      const rows = names.map((n, i) => ({ n, proj: a.proj[i], perp: a.perp[i], dist: a.distG[i] }));
      const rk = rankOf(rows.map(r => r.dist), true);
      rows.forEach((r, i) => { r.rank = rk[i]; });
      table(out, [
        { label: T('Genotipo', 'Genotype'), get: r => esc(r.n) },
        { label: T('Proyección en el eje medio', 'Projection on the mean axis'), num: true, get: r => fmtFixed(r.proj, 4) },
        { label: T('Distancia al eje (inestabilidad)', 'Distance from the axis (instability)'), num: true, get: r => fmtFixed(r.perp, 4) },
        { label: T('Distancia al ideal', 'Distance to the ideal'), num: true, get: r => fmtFixed(r.dist, 4) },
        { label: T('Lugar', 'Rank'), num: true, get: r => fmtNum(r.rank, 1) },
      ], rows.sort((x, y) => x.rank - y.rank));
      note += ' ' + T('La flecha es el eje del ambiente promedio: la proyección de cada genotipo sobre ella aproxima su media, y su distancia a ella, su inestabilidad. El genotipo ideal está sobre ese eje con la longitud del vector más largo; los círculos miden la distancia a él (Yan 2001; Yan y Kang 2003).', 'The arrow is the average-environment axis: the projection of every genotype on it approximates its mean, and its distance from it, its instability. The ideal genotype lies on that axis with the length of the longest vector; the circles measure the distance to it (Yan 2001; Yan & Kang 2003).');
    } else if (B9.view === 'discr' || B9.view === 'idealE') {
      const a = GXE.aec(G2, E2);
      spec.aec = { u: a.u, ideal: a.idealE, dist: a.distE };
      const rows = envs.map((n, j) => ({ n, len: a.eLen[j], cos: a.cosE[j], ang: Math.acos(Math.max(-1, Math.min(1, a.cosE[j]))) * 180 / Math.PI, dist: a.distE[j] }));
      const rk = rankOf(rows.map(r => r.dist), true);
      rows.forEach((r, j) => { r.rank = rk[j]; });
      table(out, [
        { label: T('Ambiente', 'Environment'), get: r => esc(r.n) },
        { label: T('Longitud (discriminación)', 'Length (discriminativeness)'), num: true, get: r => fmtFixed(r.len, 4) },
        { label: T('Ángulo con el eje medio (°)', 'Angle with the mean axis (°)'), num: true, get: r => fmtNum(r.ang, 1) },
        { label: T('cos (representatividad)', 'cos (representativeness)'), num: true, get: r => fmtFixed(r.cos, 3) },
        { label: T('Distancia al ideal', 'Distance to the ideal'), num: true, get: r => fmtFixed(r.dist, 4) },
        { label: T('Lugar', 'Rank'), num: true, get: r => fmtNum(r.rank, 1) },
      ], rows.sort((x, y) => x.rank - y.rank));
      note += ' ' + T('Un vector largo discrimina bien entre genotipos; un ángulo pequeño con el eje del ambiente promedio indica que el ambiente representa a los demás. Un ambiente largo y con ángulo grande sirve para descartar genotipos inestables, no para elegir los de adaptación amplia.', 'A long vector discriminates well among genotypes; a small angle with the average-environment axis means the environment represents the others. A long environment at a wide angle helps to discard unstable genotypes, not to pick broadly adapted ones.');
    } else if (B9.view === 'compare') {
      const a = Math.min(B9.ga, names.length - 1), b = Math.min(B9.gb, names.length - 1);
      spec.cmp = { a, b };
      const side = GXE.compare(G2, E2, a, b);
      const obs = envs.map((n, j) => ({ n, win: side[j], ya: res.Y[a][j], yb: res.Y[b][j] }));
      table(out, [
        { label: T('Ambiente', 'Environment'), get: r => esc(r.n) },
        { label: T('Favorece según el biplot', 'Favoured by the biplot'), get: r => `<b>${esc(names[r.win])}</b>` },
        { label: esc(names[a]), num: true, get: r => f3(r.ya) },
        { label: esc(names[b]), num: true, get: r => f3(r.yb) },
        { label: T('Coincide con los datos', 'Agrees with the data'), get: r => ((B9.lower ? r.ya < r.yb : r.ya > r.yb) === (r.win === a) ? '✔' : '✘') },
      ], obs);
      note += ' ' + T('La recta punteada pasa por el origen y es perpendicular a la que une los dos genotipos: cada uno es mejor en los ambientes de su lado. La última columna compara con las medias observadas; los desacuerdos vienen de la parte del patrón que el biplot no representa.', 'The dashed line goes through the origin, perpendicular to the one joining the two genotypes: each is better in the environments on its side. The last column checks against the observed means; disagreements come from the part of the pattern the biplot does not show.');
    } else {
      out.innerHTML = '';
      note += ' ' + T('Genotipos como puntos y ambientes como vectores: el producto interno de un genotipo con un ambiente aproxima el valor del genotipo en ese ambiente, relativo a la media del ambiente; el coseno del ángulo entre dos ambientes aproxima su correlación.', 'Genotypes as points and environments as vectors: the inner product of a genotype with an environment approximates the value of the genotype in that environment, relative to the environment mean; the cosine of the angle between two environments approximates their correlation.');
    }
    el('b9GgeNote').innerHTML = note;
    mountFig('b9FigGge', {
      title: () => T(V.es, V.en), fileName: 'gge_' + B9.view,
      render: c => P9.biplot(c, spec),
      controls: () => [P2.titleControl(), { key: 'showLabels', label: T('Nombres', 'Names'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 880, height: 700, showLabels: true });
  }

  /* ================= 7 · summary ================= */
  function renderSummary(res) {
    const names = res.tab.genos;
    const cols = GXE.statColumns(res);
    /* ranks: 1 = best; the direction of every statistic */
    const better = { mean: B9.lower ? 'low' : 'high', b: 'one', s2d: 'low', r2: 'high', W: 'low', sigma2: 'low', P: 'low', ann: 'high', S1: 'low', S2: 'low', S3: 'low', S6: 'low', ysi: 'high', asv: 'low', waas: 'low', waasy: 'high' };
    const ranks = cols.map(c => {
      const dir = better[c.key];
      const v = dir === 'one' ? c.v.map(x => Math.abs(x - 1)) : c.v;
      return rankOf(v, dir !== 'high');
    });
    const mr = names.map((_, i) => ranks.reduce((s, r) => s + r[i], 0) / ranks.length);
    const order = names.map((_, i) => i).sort((a, b) => mr[a] - mr[b]);
    el('b9Summary').innerHTML = '<table><thead><tr><th>' + T('Genotipo', 'Genotype') + '</th>' + cols.map(c => `<th class="num">${keepGreek(esc(c.name))}</th>`).join('') + `<th class="num">${T('Rango medio', 'Mean rank')}</th></tr></thead><tbody>`
      + order.map(i => `<tr><td>${esc(names[i])}</td>` + cols.map((c, k) => `<td class="num">${fmtNum(c.v[i], 3)} <span class="hint">(${fmtNum(ranks[k][i], 1)})</span></td>`).join('') + `<td class="num"><b>${fmtNum(mr[i], 2)}</b></td></tr>`).join('') + '</tbody></table>';
    el('b9SummaryNote').innerHTML = T(
      'Entre paréntesis, el lugar de cada genotipo por cada estadística (1 = mejor: mayor media' + (B9.lower ? ' —aquí, menor—' : '') + ', b más cercano a 1, menor inestabilidad, mayor W<sub>i</sub> de Annicchiarico, YS<sub>i</sub> y WAASY). El rango medio resume, sin pesos, estadísticas que miden cosas distintas: sirve para ordenar la discusión, no para decidir por sí solo.',
      'In brackets, the rank of every genotype by every statistic (1 = best: highest mean' + (B9.lower ? ' —here, lowest—' : '') + ', b closest to 1, least instability, highest Annicchiarico W<sub>i</sub>, YS<sub>i</sub> and WAASY). The mean rank summarises, without weights, statistics that measure different things: it orders the discussion, it does not decide by itself.');
    const R = GXE.spearman(cols);
    mountFig('b9FigCorr', {
      title: () => T('Correlaciones de rangos entre estadísticas', 'Rank correlations between statistics'), fileName: 'gxe_spearman',
      render: c => P8.corr(Object.assign({}, c, { title: c.title || T('Correlaciones de rangos entre estadísticas', 'Rank correlations between statistics') }), cols.map(x => x.name), R, { note: T('Correlación de Spearman entre los valores de los genotipos', 'Spearman correlation between the values of the genotypes') }),
      controls: () => [P2.titleControl(), { key: 'colormap', label: T('Colores', 'Colours'), type: 'select', options: Object.entries(Fig.colormapNames) }],
    }, { width: 820, height: 700, colormap: 'rdbu' });
    el('b9CorrNote').innerHTML = T(
      'Las estadísticas se agrupan en dos familias (Lin y col. 1986; Becker y Léon 1988): las de estabilidad estática o biológica (la respuesta del genotipo no cambia entre ambientes) y las dinámicas o agronómicas (sigue el patrón promedio de los ambientes), con las que combinan media y estabilidad (P<sub>i</sub>, YS<sub>i</sub>, WAASY, S⁽³⁾, S⁽⁶⁾) por su lado. Una correlación alta indica que dos estadísticas ordenan casi igual a los genotipos; W<sub>i</sub> y σ²<sub>i</sub> ordenan siempre igual, porque σ²<sub>i</sub> es una función lineal de W<sub>i</sub>.',
      'The statistics fall into two families (Lin et al. 1986; Becker & Léon 1988): those of static or biological stability (the response of the genotype does not change across environments) and the dynamic or agronomic ones (it follows the average pattern of the environments), with those that combine mean and stability (P<sub>i</sub>, YS<sub>i</sub>, WAASY, S⁽³⁾, S⁽⁶⁾) on their own. A high correlation means two statistics rank the genotypes almost alike; W<sub>i</sub> and σ²<sub>i</sub> always rank them alike, because σ²<sub>i</sub> is a linear function of W<sub>i</sub>.');
  }

  /* ================= 8 · notes ================= */
  function renderNotes() {
    const host = el('b9Notes');
    if (!host) return;
    const notes = [
      { es: ['Tabla y error', 'Cada celda es la media ajustada del genotipo en el ambiente, del análisis de ese ambiente en el Bloque 3 (bloques completos, incompletos o filas y columnas). El error combinado es el promedio de los CM del error ponderado por sus grados de libertad y r la media armónica de las repeticiones; con solo medias se usa el error que se escriba. Las celdas vacías se estiman por EM-AMMI (Gauch y Zobel 1990): se alternan el ajuste del modelo aditivo más k ejes y la sustitución de las celdas vacías hasta que no cambian.'],
        en: ['Table and error', 'Every cell is the adjusted mean of the genotype in the environment, from the analysis of that environment in Block 3 (complete or incomplete blocks, or rows and columns). The pooled error is the average of the error MS weighted by their degrees of freedom and r the harmonic mean of the replicates; with means only, the error typed in is used. Empty cells are imputed by EM-AMMI (Gauch & Zobel 1990): fitting the additive model plus k axes and replacing the empty cells alternate until they no longer change.'] },
      { es: ['Varianzas del error distintas', 'El modelo en dos etapas (Smith, Cullis y Thompson 2005; Möhring y Piepho 2009) da a la media de cada celda la varianza de su ambiente, v<sub>ij</sub> = EE², y trata la interacción como aleatoria: Y<sub>ij</sub> = μ + g<sub>i</sub> + a<sub>j</sub> + ga<sub>ij</sub> + ε<sub>ij</sub>, ga ~ N(0, σ²GA), ε ~ N(0, v<sub>ij</sub>). σ²GA se estima por REML resolviendo la ecuación de puntaje ½[y′PPy − tr P] = 0; las medias de los genotipos son las de mínimos cuadrados generalizados y su prueba de Wald usa gl aproximados.'],
        en: ['Unequal error variances', 'The two-stage model (Smith, Cullis & Thompson 2005; Möhring & Piepho 2009) gives the mean of every cell the variance of its environment, v<sub>ij</sub> = SE², and takes the interaction as random: Y<sub>ij</sub> = μ + g<sub>i</sub> + a<sub>j</sub> + ga<sub>ij</sub> + ε<sub>ij</sub>, ga ~ N(0, σ²GE), ε ~ N(0, v<sub>ij</sub>). σ²GE is estimated by REML solving the score equation ½[y′PPy − tr P] = 0; the genotype means are generalised least-squares means and their Wald test uses approximate df.'] },
      { es: ['Regresión y varianzas de estabilidad', 'Finlay y Wilkinson (1963) usaron logaritmos del rendimiento; aquí la escala es la de los datos (transforme en el Bloque 3 si hace falta). Un genotipo estable en el sentido de Eberhart y Russell (1966) tiene b = 1 y S²d = 0; en el de Shukla (1972) y Wricke (1962), poca interacción. La estabilidad «estática» (b = 0) rara vez conviene en rendimiento: significa no aprovechar los buenos ambientes (Becker y Léon 1988).'],
        en: ['Regression and stability variances', 'Finlay & Wilkinson (1963) used logarithms of yield; here the scale is that of the data (transform in Block 3 if needed). A stable genotype in the sense of Eberhart & Russell (1966) has b = 1 and S²d = 0; in that of Shukla (1972) and Wricke (1962), little interaction. "Static" stability (b = 0) is seldom desirable for yield: it means not taking advantage of good environments (Becker & Léon 1988).'] },
      { es: ['AMMI', 'Modelo de efectos principales aditivos e interacción multiplicativa (Gollob 1968; Gauch 1988): Y<sub>ij</sub> = μ + g<sub>i</sub> + a<sub>j</sub> + Σ<sub>k</sub> λ<sub>k</sub>u<sub>ik</sub>v<sub>jk</sub> + ρ<sub>ij</sub>. Grados de libertad de Gollob g + e − 1 − 2k; F<sub>R</sub> de Cornelius, Seyedsadr y Crossa (1992) con (g − 1 − n)(e − 1 − n) gl para el residuo después de n ejes. El signo de cada eje es arbitrario: se fija para que el ambiente de mayor carga absoluta sea positivo.'],
        en: ['AMMI', 'Additive main effects and multiplicative interaction model (Gollob 1968; Gauch 1988): Y<sub>ij</sub> = μ + g<sub>i</sub> + a<sub>j</sub> + Σ<sub>k</sub> λ<sub>k</sub>u<sub>ik</sub>v<sub>jk</sub> + ρ<sub>ij</sub>. Gollob\'s degrees of freedom g + e − 1 − 2k; F<sub>R</sub> of Cornelius, Seyedsadr & Crossa (1992) with (g − 1 − n)(e − 1 − n) df for the residual after n axes. The sign of every axis is arbitrary: it is set so that the environment with the largest absolute loading is positive.'] },
      { es: ['Biplot GGE', 'Descomposición en valores singulares de la tabla centrada por ambientes (G + G×A), opcionalmente dividida entre la desviación estándar de cada ambiente (Yan y Kang 2003; Yan y Tinker 2006). Partición de los valores singulares: centrada en genotipos (U·Λ, V) para comparar genotipos, en ambientes (U, V·Λ) para comparar ambientes, simétrica (U·Λ<sup>½</sup>, V·Λ<sup>½</sup>) para quién ganó dónde. Ambos ejes tienen la misma escala. El primer componente se orienta para que la media de los ambientes sea positiva.'],
        en: ['GGE biplot', 'Singular value decomposition of the environment-centred table (G + G×E), optionally divided by the standard deviation of every environment (Yan & Kang 2003; Yan & Tinker 2006). Singular-value partition: genotype-focused (U·Λ, V) to compare genotypes, environment-focused (U, V·Λ) to compare environments, symmetric (U·Λ<sup>½</sup>, V·Λ<sup>½</sup>) for which won where. Both axes have the same scale. The first component is oriented so that the mean of the environments is positive.'] },
    ];
    const cites = [
      'Finlay KW, Wilkinson GN (1963). The analysis of adaptation in a plant-breeding programme. Australian Journal of Agricultural Research 14: 742–754.',
      'Wricke G (1962). Über eine Methode zur Erfassung der ökologischen Streubreite in Feldversuchen. Zeitschrift für Pflanzenzüchtung 47: 92–96.',
      'Eberhart SA, Russell WA (1966). Stability parameters for comparing varieties. Crop Science 6: 36–40.',
      'Gollob HF (1968). A statistical model which combines features of factor analytic and analysis of variance techniques. Psychometrika 33: 73–115.',
      'Perkins JM, Jinks JL (1968). Environmental and genotype-environmental components of variability. III. Multiple lines and crosses. Heredity 23: 339–356.',
      'Shukla GK (1972). Some statistical aspects of partitioning genotype-environmental components of variability. Heredity 29: 237–245.',
      'Huehn M (1979). Beiträge zur Erfassung der phänotypischen Stabilität. EDV in Medizin und Biologie 10: 112–117.',
      'Lin CS, Binns MR, Lefkovitch LP (1986). Stability analysis: where do we stand? Crop Science 26: 894–900.',
      'Nassar R, Huehn M (1987). Studies on estimation of phenotypic stability: tests of significance for nonparametric measures of phenotypic stability. Biometrics 43: 45–53.',
      'Becker HC, Léon J (1988). Stability analysis in plant breeding. Plant Breeding 101: 1–23.',
      'Gauch HG (1988). Model selection and validation for yield trials with interaction. Biometrics 44: 705–715.',
      'Lin CS, Binns MR (1988). A superiority measure of cultivar performance for cultivar × location data. Canadian Journal of Plant Science 68: 193–198.',
      'Gauch HG, Zobel RW (1990). Imputing missing yield trial data. Theoretical and Applied Genetics 79: 753–761.',
      'Huehn M (1990). Nonparametric measures of phenotypic stability. Part 1: Theory. Euphytica 47: 189–194.',
      'Annicchiarico P (1992). Cultivar adaptation and recommendation from alfalfa trials in Northern Italy. Journal of Genetics and Breeding 46: 269–278.',
      'Cornelius PL, Seyedsadr M, Crossa J (1992). Using the shifted multiplicative model to search for "separability" in crop cultivar trials. Theoretical and Applied Genetics 84: 161–172.',
      'Kang MS (1993). Simultaneous selection for yield and stability in crop performance trials: consequences for growers. Agronomy Journal 85: 754–757.',
      'Piepho HP (1995). Robustness of statistical tests for multiplicative terms in the additive main effects and multiplicative interaction model for cultivar trials. Theoretical and Applied Genetics 90: 438–443.',
      'Purchase JL, Hatting H, van Deventer CS (2000). Genotype × environment interaction of winter wheat in South Africa: II. Stability analysis of yield performance. South African Journal of Plant and Soil 17: 101–107.',
      'Yan W, Hunt LA, Sheng Q, Szlavnics Z (2000). Cultivar evaluation and mega-environment investigation based on the GGE biplot. Crop Science 40: 597–605.',
      'Yan W, Kang MS (2003). GGE Biplot Analysis: A Graphical Tool for Breeders, Geneticists, and Agronomists. CRC Press, Boca Raton.',
      'Smith AB, Cullis BR, Thompson R (2005). The analysis of crop cultivar breeding and evaluation trials: an overview of current mixed model approaches. Journal of Agricultural Science 143: 449–462.',
      'Yan W, Tinker NA (2006). Biplot analysis of multi-environment trial data: principles and applications. Canadian Journal of Plant Science 86: 623–645.',
      'Farshadfar E (2008). Incorporation of AMMI stability value and grain yield in a single non-parametric index (GSI) in bread wheat. Pakistan Journal of Biological Sciences 11: 1791–1796.',
      'Möhring J, Piepho HP (2009). Comparison of weighting in two-stage analysis of plant breeding trials. Crop Science 49: 1977–1988.',
      'Olivoto T, Lúcio AD, da Silva JAG, Marchioro VS, de Souza VQ, Jost E (2019). Mean performance and stability in multi-environment trials I: combining features of AMMI and BLUP techniques. Agronomy Journal 111: 2949–2960.',
    ];
    host.innerHTML = notes.map(n => `<div class="method-note"><h4>${T(n.es[0], n.en[0])}</h4><p>${T(n.es[1], n.en[1])}</p></div>`).join('')
      + `<div class="method-note"><h4>${T('Referencias', 'References')}</h4><ul class="ref-list">${cites.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  /* ================= downloads ================= */
  function downloadXlsx() {
    const res = B9.res;
    if (!res || res.error) return;
    const names = res.tab.genos, envs = res.tab.envs;
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 28));
    add(T('Tabla GxA', 'GxE table'), [[T('Genotipo', 'Genotype')].concat(envs, [T('Media', 'Mean')])].concat(names.map((n, i) => [n].concat(res.Y[i], [res.anova.gm[i]]))).concat(res.imp.n ? [[], [T('Celdas estimadas', 'Imputed cells')]].concat(names.flatMap((n, i) => envs.filter((_, j) => res.imp.imputed[i][j]).map(e => [n, e]))) : []));
    add('ANOVA', [[T('Fuente', 'Source'), 'df', 'SS', 'MS', 'F', 'p', 'F vs error', 'p']].concat(res.anova.rows.map(r => [r.key, r.df, r.ss, r.ms, r.F, r.p, r.F2, r.p2])));
    if (res.reg) add(T('Regresión', 'Regression'), [[T('Genotipo', 'Genotype'), 'mean', 'b', 'SE b', 't(b=1)', 'p', 'S2d', 'F', 'p', 'R2']].concat(res.reg.geno.map(x => [names[x.i], x.mean, x.b, x.seB, x.t, x.p, x.s2d, x.Fdev, x.pDev, x.r2])));
    if (res.vars) add(T('Varianzas', 'Variances'), [[T('Genotipo', 'Genotype'), 'W', 'W%', 'sigma2', 'F', 'p', 's2', 'F', 'p', 'Pi', 'Pi fav', 'Pi unf', 'Wi Annicchiarico']].concat(res.vars.map((v, i) => [names[i], v.W, v.Wpct, v.sigma2, v.F, v.p, v.s2, v.Fs, v.ps, res.sup.rows[i].P, res.sup.rows[i].Pfav, res.sup.rows[i].Punf, res.ann ? res.ann.rows[i].all.W : ''])));
    if (res.huehn) add(T('Rangos', 'Ranks'), [[T('Genotipo', 'Genotype'), 'S1', 'Z1', 'S2', 'Z2', 'S3', 'S6', 'YSi', 'selected']].concat(res.huehn.rows.map((x, i) => [names[i], x.S1, x.Z1, x.S2, x.Z2, x.S3, x.S6, res.kang ? res.kang.rows[i].ysi : '', res.kang ? (res.kang.rows[i].selected ? 1 : 0) : ''])));
    if (res.ammi) {
      const A = res.ammi;
      add(T('AMMI ejes', 'AMMI axes'), [['axis', 'singular value', 'SS', '%', 'df', 'MS', 'F', 'p']].concat(A.axes.map(a => [a.k, a.sv, a.ss, a.pct, a.df, a.ms, a.F, a.p])).concat([[], ['F_R: n', 'SS', 'df', 'MS', 'F', 'p']]).concat(A.FR.map(x => [x.n, x.ss, x.df, x.ms, x.F, x.p])));
      add(T('AMMI genotipos', 'AMMI genotypes'), [[T('Genotipo', 'Genotype'), 'mean'].concat(A.axes.map(a => 'IPCA' + a.k), ['ASV', 'YSI', 'WAAS', 'WAASY'])].concat(names.map((n, i) => [n, A.gm[i]].concat(A.G[i], [A.asv ? A.asv[i] : '', A.ysi ? A.ysi[i] : '', A.waas[i], A.waasy[i]]))));
      add(T('AMMI ambientes', 'AMMI environments'), [[T('Ambiente', 'Environment'), 'mean'].concat(A.axes.map(a => 'IPCA' + a.k), ['WAAS'])].concat(envs.map((n, j) => [n, A.em[j]].concat(A.E[j], [A.waasEnv[j]]))));
    }
    if (res.gge) {
      const gg = GXE.gge(res.Y, { scaling: B9.scaling, lower: B9.lower }), C = gg.coords('symmetric');
      add('GGE', [['', 'PC1', 'PC2', '', '% PC1', gg.pct[0], '% PC2', gg.pct[1]]].concat(names.map((n, i) => [n, C.G[i][0], C.G[i][1]]), envs.map((n, j) => [n, C.E[j][0], C.E[j][1]])));
    }
    if (res.stage2) add(T('Dos etapas', 'Two stages'), [[T('Genotipo', 'Genotype'), 'mean', 'SE'], ['sigma2 GE', res.stage2.s2GE], ['LRT', res.stage2.lrt, res.stage2.pLrt]].concat(names.map((n, i) => [n, res.stage2.means[i], res.stage2.se[i]])));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('interaccion_gxa', 'gxe_interaction') + '_' + res.tab.trait) + '.xlsx');
  }

  /* ================= run ================= */
  function renderPickers() {
    const D = state.data;
    el('b9Trait').innerHTML = D.ds.traits.map((t, j) => `<option value="${j}">${esc(t.name)}</option>`).join('');
    if (B9.trait >= D.ds.traits.length) B9.trait = 0;
    el('b9Trait').value = String(B9.trait);
    el('b9Lower').value = B9.lower ? '1' : '0';
    el('b9Impute').value = String(B9.imputeAxes);
    el('b9SeMode').value = B9.seMode;
    el('b9AnnAlpha').value = String(B9.annAlpha);
    el('b9LsdAlpha').value = String(B9.alphaLSD);
    el('b9AxesRule').value = B9.axesRule;
    el('b9WY').value = String(B9.wY);
    el('b9View').value = B9.view;
    el('b9Scaling').value = B9.scaling;
    el('b9Svp').value = B9.svp;
  }
  const CARDS = ['b9Reg', 'b9Var', 'b9Rank', 'b9Ammi', 'b9Gge', 'b9Sum', 'b9Notes0'];
  function renderAll() {
    const st = status();
    CARDS.concat(['b9TableBox']).forEach(id => { const n = el(id); if (n) n.style.display = st.ok ? '' : 'none'; });
    if (!st.ok) { el('b9Source').innerHTML = ''; el('b9Tiles').innerHTML = ''; msg('b9TableMsg', [{ level: 'warning', es: st.es, en: st.en }]); B9.res = null; state.gxe = null; return; }
    renderPickers();
    const res = analyse();
    B9.res = res;
    if (res.error) { CARDS.forEach(id => { el(id).style.display = 'none'; }); el('b9TableBox').style.display = 'none'; msg('b9TableMsg', [Object.assign({ level: 'warning' }, res.error)]); return; }
    state.gxe = { res };
    renderTable(res);
    renderRegression(res);
    renderVariances(res);
    renderRanks(res);
    renderAmmi(res);
    renderGge(res);
    renderSummary(res);
    const s = STEPS[9];
    el('b9Next').disabled = !s.ready;
    el('b9NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque 10, en construcción)`, `Next: ${s.en} (Block 10, under construction)`);
  }

  function init() {
    if (!el('b9Data')) return;
    renderNotes();
    const soft = () => renderAll();
    const on = (id, fn) => el(id).addEventListener('change', () => { fn(el(id).value); soft(); });
    on('b9Trait', v => { B9.trait = +v; });
    on('b9Lower', v => { B9.lower = v === '1'; });
    on('b9Impute', v => { B9.imputeAxes = +v; });
    on('b9SeMode', v => { B9.seMode = v; });
    on('b9AnnAlpha', v => { B9.annAlpha = parseFloat(v); });
    on('b9LsdAlpha', v => { B9.alphaLSD = parseFloat(v); });
    on('b9AxesRule', v => { B9.axesRule = v; });
    on('b9WaasAxes', v => { B9.waasAxes = +v; });
    on('b9WY', v => { B9.wY = Math.max(0, Math.min(100, parseFloat(v) || 50)); });
    const gge = (id, fn) => el(id).addEventListener('change', () => { fn(el(id).value); delete Fig.registry.b9FigGge; if (B9.res && !B9.res.error) renderGge(B9.res); });
    gge('b9View', v => { B9.view = v; });
    gge('b9Scaling', v => { B9.scaling = v; });
    gge('b9Svp', v => { B9.svp = v; });
    gge('b9GA', v => { B9.ga = +v; });
    gge('b9GB', v => { B9.gb = +v; });
    el('b9DlXlsx').addEventListener('click', downloadXlsx);
    el('b9Back').addEventListener('click', () => goStep(8));
    el('b9Next').addEventListener('click', () => { if (STEPS[9].ready) goStep(10); });
    document.addEventListener('datachange', () => { B9.cache.clear(); B9.trait = 0; B9.ga = 0; B9.gb = 1; if (document.getElementById('panel-9').classList.contains('active')) renderAll(); else B9.built = false; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 9 && (!B9.built || !B9.res)) { B9.built = true; renderAll(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B9.res) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
