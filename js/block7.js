/* BreedingPro — Block 7 interface: generations and heterosis. The scaling tests, the joint
   scaling test with its sequence of models, the second-degree statistics D, H, F and E, the
   minimum number of effective factors, and heterosis with inbreeding depression. */

(function () {
  const B7 = { trait: 0, env: null, metric: 'MJ', weights: 'auto', alpha: 0.05, goal: 'high', model: 'chosen', res: null, cache: new Map(), built: false };
  window.B7 = B7;

  const f2 = x => fmtFixed(x, 2), f3 = x => fmtFixed(x, 3);
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
    host.innerHTML = h;
  };
  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    Fig.mount(hostId, Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {}));
  }
  const sig = p => (isFinite(p) ? `${fmtP(p)} <span class="sig">${stars(p)}</span>` : '');
  /* Satterthwaite degrees of freedom are not whole numbers */
  const fdf = d => (!isFinite(d) ? '' : Math.abs(d - Math.round(d)) < 1e-9 ? String(Math.round(d)) : fmtFixed(d, 1));
  const gname = g => (GEN.isCheck(g) ? (/testigo|check|control/i.test(g) ? esc(g.slice(3)) : T(`${esc(g.slice(3))} (testigo)`, `${esc(g.slice(3))} (check)`)) : T(GEN.NAMES[g] || { es: g, en: g }));
  const plab = k => GEN.PARAM_LABEL[B7.metric][k];

  /* ================= data ================= */
  function status() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Cargue los datos en el Bloque 3.', en: 'Load the data in Block 3.' };
    if (D.mating.design !== 'generations') return { ok: false, es: 'Este bloque analiza generaciones (P₁, P₂, F₁, F₂, F₃, retrocruzas). Su diseño se analiza en otro bloque.', en: 'This block analyses generations (P₁, P₂, F₁, F₂, F₃, backcrosses). Your design is analysed in another block.' };
    if (!D.ds.traits.length) return { ok: false, es: 'No hay variables respuesta.', en: 'There are no response traits.' };
    return { ok: true };
  }

  function buildRows() {
    const D = state.data;
    const t = D.ds.traits[B7.trait];
    const ent = new Map(Data.entryTable(D.ds).map(e => [e.name, e]));
    const checks = new Set(D.mating.checks || []);
    const envs = D.field.envs;
    const wanted = B7.env === '__all' ? envs : envs.filter(e => e.key === B7.env);
    const rows = [];
    const perEnv = [];
    wanted.forEach(E => {
      const { plots } = Trial.plots(D.ds, E.key, t, { excluded: D.excluded });
      if (!plots.length) return;
      perEnv.push({ key: E.key, name: E.name, plots: plots.length });
      plots.forEach(p => {
        const e = ent.get(p.entry);
        /* the checks (entries that are not a generation) only enter the standard heterosis */
        const gen = e && (e.generation || (checks.has(e.name) ? 'CK:' + e.name : null));
        if (!gen) return;
        const block = (E.blockAsRep ? p.block : p.rep) || '';
        p.vals.forEach(v => { if (isFinite(v)) rows.push({ gen, env: E.key, block: (wanted.length > 1 ? E.key + '·' : '') + block, plot: E.key + '|' + p.key, y: v }); });
      });
    });
    if (!rows.length) return null;
    const plantLevel = rows.length > new Set(rows.map(r => r.plot)).size;
    return { rows, perEnv, plantLevel };
  }

  function analyse() {
    const key = [B7.trait, B7.env, B7.metric, B7.weights, B7.alpha, B7.goal].join('|');
    if (B7.cache.has(key)) return B7.cache.get(key);
    const b = buildRows();
    if (!b) return null;
    const res = GEN.analyse({
      rows: b.rows, metric: B7.metric, alpha: B7.alpha, goal: B7.goal,
      weights: B7.weights === 'auto' ? null : B7.weights,
      order: Data.GEN_ORDER,
    });
    res.built = b;
    B7.cache.set(key, res);
    return res;
  }

  /* ================= 1 · generations ================= */
  function renderSetup() {
    const D = state.data, res = B7.res, b = res.built;
    /* short names with subscripts: P₁, F₂, RC₁ (BC₁ in English) */
    const sub = s => s.replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[+d]);
    const names = res.stats.map(s => sub(T(s.gen.replace(/^BC/, 'RC'), s.gen))).join(', ');
    const ck = res.checks || [];
    el('b7Source').innerHTML = T(
      `Datos: <b>${esc(D.fileName || D.ds.fileName || '')}</b> · ${res.stats.length} generaciones (${names})${ck.length ? ` + ${plural(ck.length, 'testigo', 'testigos')} (${ck.map(s => esc(s.gen.slice(3))).join(', ')}; solo para la heterosis estándar)` : ''} · ${b.rows.length} ${b.plantLevel ? 'plantas' : 'parcelas'} · ${b.perEnv.length > 1 ? `${b.perEnv.length} ambientes` : (b.perEnv[0].name || '')} · métrica ${B7.metric === 'MJ' ? 'F∞ de Mather y Jinks' : 'F₂ de Hayman'}.`,
      `Data: <b>${esc(D.fileName || D.ds.fileName || '')}</b> · ${res.stats.length} generations (${names})${ck.length ? ` + ${plural(ck.length, 'check', 'checks')} (${ck.map(s => esc(s.gen.slice(3))).join(', ')}; for the standard heterosis only)` : ''} · ${b.rows.length} ${b.plantLevel ? 'plants' : 'plots'} · ${b.perEnv.length > 1 ? `${b.perEnv.length} environments` : (b.perEnv[0].name || '')} · ${B7.metric === 'MJ' ? "Mather & Jinks's F∞" : "Hayman's F₂"} metric.`);
    table('b7StatTable', [
      { label: T('Generación', 'Generation'), get: s => gname(s.gen) },
      { label: 'n', num: true, get: s => s.n },
      { label: T('Media', 'Mean'), num: true, get: s => fmtNum(s.mean, 4) },
      { label: T('EE de la media', 'SE of the mean'), num: true, get: s => fmtNum(s.seMean, 4) },
      { label: T('gl de la media', 'df of the mean'), num: true, get: s => fdf(s.dfMean) },
      { label: T('Varianza entre individuos', 'Variance among individuals'), num: true, get: s => fmtNum(s.varWithin, 4) },
      { label: T('gl', 'df'), num: true, get: s => s.dfWithin },
      { label: T('Peso 1/V(media)', 'Weight 1/V(mean)'), num: true, get: s => fmtNum(1 / s.varMean, 3) },
      { label: T('Base', 'Basis'), get: s => `<span class="hint">${s.basis === 'plots' ? T(`medias de ${s.nPlots} parcelas`, `means of ${s.nPlots} plots`) : T('individuos', 'individuals')}</span>` },
    ], res.stats.concat(ck));
    const H = res.heterosis, V = res.variances, ch = res.models.chosen;
    const tiles = [];
    if (H && H.list.length) {
      const mph = H.list.find(x => x.key === 'mph');
      if (mph) tiles.push(['Heterosis sobre la media de progenitores', 'Mid-parent heterosis', fmtNum(mph.pct, 1) + ' %', `${fmtNum(mph.value, 3)} ± ${fmtNum(mph.se, 3)}`]);
      const sh = H.list.find(x => x.check);
      if (sh) tiles.push(['Heterosis estándar', 'Standard heterosis', fmtNum(sh.pct, 1) + ' %', `${fmtNum(sh.value, 3)} ± ${fmtNum(sh.se, 3)} · ${T(`contra ${esc(sh.check)}`, `against ${esc(sh.check)}`)}`]);
    }
    if (ch) {
      const hh = ch.est.find(e => e.key === 'h'), dd = ch.est.find(e => e.key === 'd');
      if (dd) tiles.push([`${plab('d')} (aditivo)`, `${plab('d')} (additive)`, fmtNum(dd.value, 3), `${T('EE', 'SE')} ${fmtNum(dd.se, 3)}`]);
      if (hh) tiles.push([`${plab('h')} (dominancia)`, `${plab('h')} (dominance)`, fmtNum(hh.value, 3), `${T('EE', 'SE')} ${fmtNum(hh.se, 3)}`]);
    }
    if (V) {
      /* a tile with nothing to show is left out: negative components give no ratio */
      if (isFinite(V.dominance)) tiles.push(['Grado medio de dominancia', 'Average degree of dominance', fmtNum(V.dominance, 2), '√(H/D)']);
      if (isFinite(V.h2n)) tiles.push(['h² estrecho', 'Narrow-sense h²', fmtNum(V.h2n, 3), T('½D/(½D + ¼H + E)', '½D/(½D + ¼H + E)')]);
      else if (isFinite(V.D) && V.D <= 0) tiles.push(['D (aditivo)', 'D (additive)', fmtNum(V.D, 3), T('negativo: sin h² a partir de D', 'negative: no h² from D')]);
    }
    if (res.factors && res.factors.list.length) tiles.push(['Factores efectivos', 'Effective factors', fmtNum(res.factors.list[0].n, 1), T('mínimo (Castle–Wright)', 'minimum (Castle–Wright)')]);
    statTiles('b7Tiles', tiles);
    msg('b7SetupMsg', res.issues);
  }

  /* ================= 2 · scaling tests ================= */
  function renderScaling() {
    const res = B7.res;
    const tests = res.scaling;
    el('b7ScaleBox').style.display = tests.length ? '' : 'none';
    if (!tests.length) return;
    table('b7ScaleTable', [
      { label: T('Prueba', 'Test'), get: r => T(r.es, r.en) },
      { label: T('Valor', 'Value'), num: true, get: r => fmtNum(r.value, 4) },
      { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
      { label: 't', num: true, get: r => f2(r.t) },
      { label: T('gl', 'df'), num: true, get: r => fdf(r.df) },
      { label: 'p', num: true, get: r => sig(r.p) },
      { label: T('Qué estima', 'What it estimates'), get: r => `<span class="hint">${T(r.meaning)}</span>` },
    ], tests);
    const bad = tests.filter(t => isFinite(t.p) && t.p < B7.alpha);
    el('b7ScaleNote').innerHTML = bad.length
      ? T(`${bad.length} de ${tests.length} pruebas ${bad.length === 1 ? 'se aparta' : 'se apartan'} de cero (${bad.map(t => t.key === 'Dp' ? 'D′' : t.key).join(', ')}): el modelo aditivo–dominante no basta y hay que incluir epistasis. D prueba [i] sola, C − 4D estima −[l] y A − B prueba [j].`,
        `${bad.length} of ${tests.length} tests ${bad.length === 1 ? 'departs' : 'depart'} from zero (${bad.map(t => t.key === 'Dp' ? 'D′' : t.key).join(', ')}): the additive–dominance model is not enough and epistasis has to be included. D tests [i] alone, C − 4D estimates −[l] and A − B tests [j].`)
      : T('Ninguna prueba se aparta de cero: el modelo aditivo–dominante describe las medias. Las pruebas tienen poca potencia con pocas plantas, así que conviene mirar también la prueba conjunta.',
        'No test departs from zero: the additive–dominance model describes the means. These tests have little power with few plants, so the joint test below is worth looking at too.');
    mountFig('b7FigScale', {
      title: () => T('Pruebas de escala', 'Scaling tests') + ' · ' + state.data.ds.traits[B7.trait].name,
      fileName: 'scaling_tests',
      render: c => P7.scaling(c, tests, { label: state.data.ds.traits[B7.trait].name, alpha: B7.alpha, tcrit: S.qt(1 - B7.alpha / 2, Math.max(1, tests[0].df)) }),
      controls: () => [P2.titleControl(), { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 620, height: 420, flip: true });
  }

  /* ================= 3 · generation means ================= */
  function renderMeans() {
    const res = B7.res, label = state.data.ds.traits[B7.trait].name;
    const list = res.models.list, chosen = res.models.chosen;
    table('b7ModelTable', [
      { label: T('Modelo', 'Model'), get: r => r.params.map(k => plab(k)).join(', ') + (r.reduced ? ` <span class="hint">${T('(sin los parámetros no significativos)', '(without the non-significant parameters)')}</span>` : '') + (r === chosen ? ` <span class="pw ok">${T('elegido', 'chosen')}</span>` : '') },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: 'χ²', num: true, get: r => (r.df > 0 ? fmtNum(r.chi2, 3) : T('ajuste perfecto', 'perfect fit')) },
      { label: 'p', num: true, get: r => (r.df > 0 ? sig(r.p) : '') },
      { label: T('¿Ajusta?', 'Fits?'), get: r => (r.df > 0 ? `<span class="pw ${r.fits ? 'ok' : 'low'}">${r.fits ? T('sí', 'yes') : T('no', 'no')}</span>` : '—') },
      { label: T('Parámetros significativos', 'Parameters significant'), get: r => `<span class="pw ${r.allSignificant ? 'ok' : 'mid'}">${r.allSignificant ? T('todos', 'all') : T('no todos', 'not all')}</span>` },
    ], list);
    const show = B7.model === 'perfect' ? res.perfect : chosen;
    el('b7EstTitle').innerHTML = B7.model === 'perfect'
      ? T('Solución de ajuste perfecto (seis parámetros)', 'Perfect-fit solution (six parameters)')
      : T('Modelo elegido', 'Chosen model');
    if (show) {
      const rows = show.est.slice();
      table('b7EstTable', [
        { label: T('Parámetro', 'Parameter'), get: r => plab(r.key) },
        { label: T('Significado', 'Meaning'), get: r => `<span class="hint">${T(MEANING[r.key])}</span>` },
        { label: T('Estimación', 'Estimate'), num: true, get: r => fmtNum(r.value, 4) },
        { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
        { label: 't', num: true, get: r => f2(r.t) },
        { label: 'p', num: true, get: r => sig(r.p) },
      ], rows);
      const parts = [];
      const via = show.test === 'WJ' ? T(`; p de Welch–James, F con ${fmtFixed(show.nu, 1)} gl en el denominador`, `; Welch–James p, F with ${fmtFixed(show.nu, 1)} denominator df`) : show.test === 'F' ? T(`; p de F = χ²/${show.df} con ${show.nu} gl del error de parcelas`, `; p from F = χ²/${show.df} with the ${show.nu} df of the plot error`) : '';
      if (show.df > 0) parts.push(T(`χ² = ${fmtNum(show.chi2, 4)} con ${show.df} gl (${pEq(show.p)}${via}): ${show.p < B7.alpha ? 'el modelo no describe las medias' : 'el modelo describe las medias'}.`,
        `χ² = ${fmtNum(show.chi2, 4)} with ${show.df} df (${pEq(show.p)}${via}): ${show.p < B7.alpha ? 'the model does not describe the means' : 'the model describes the means'}.`));
      else parts.push(T('Con seis parámetros y seis generaciones el ajuste es perfecto (0 gl): no hay χ², solo las pruebas t de cada parámetro.',
        'With six parameters and six generations the fit is perfect (0 df): there is no χ², only the t tests of each parameter.'));
      if (show.test === 'WJ') parts.push(T('Con medias de parcela, las varianzas de las medias se estiman con pocos grados de libertad y el χ² de Cavalli rechaza de más; la p de cada modelo viene de la aproximación de Welch–James (Johansen 1980).', 'With plot means the variances of the means have few degrees of freedom and the χ² of Cavalli rejects too often; the p of every model comes from the Welch–James approximation (Johansen 1980).'));
      const hh = show.est.find(e => e.key === 'h'), ll = show.est.find(e => e.key === 'l');
      if (hh && ll && isFinite(hh.value) && isFinite(ll.value)) {
        const same = hh.value * ll.value > 0;
        parts.push(T(`${plab('h')} y ${plab('l')} tienen ${same ? 'el mismo signo' : 'signos opuestos'}: epistasis <b>${same ? 'complementaria' : 'duplicada'}</b> (Jinks y Jones 1958). La regla se aplica a la métrica que se está usando.`,
          `${plab('h')} and ${plab('l')} have ${same ? 'the same sign' : 'opposite signs'}: <b>${same ? 'complementary' : 'duplicate'}</b> epistasis (Jinks & Jones 1958). The rule applies to the metric in use.`));
      }
      if (B7.metric === 'H' && res.jinksJones) {
        parts.push(T(`En la convención de Jinks y Jones (la que muchos artículos citan como «Hayman 1958») [j] = 2j = ${fmtNum(res.jinksJones.j, 4)} ± ${fmtNum(res.jinksJones.seJ, 4)}; el resto de los parámetros no cambia.`,
          `In the Jinks & Jones convention (the one many papers cite as "Hayman 1958") [j] = 2j = ${fmtNum(res.jinksJones.j, 4)} ± ${fmtNum(res.jinksJones.seJ, 4)}; the other parameters are unchanged.`));
        parts.push(T(`Equivalencia con la métrica F∞ de Mather y Jinks: m = ${fmtNum(res.jinksJones.m, 4)}, [d] = ${fmtNum(res.jinksJones.d, 4)}, [h] = ${fmtNum(res.jinksJones.h, 4)}, [i] = ${fmtNum(res.jinksJones.i, 4)}, [l] = ${fmtNum(res.jinksJones.l, 4)}.`,
          `Equivalence with Mather & Jinks's F∞ metric: m = ${fmtNum(res.jinksJones.m, 4)}, [d] = ${fmtNum(res.jinksJones.d, 4)}, [h] = ${fmtNum(res.jinksJones.h, 4)}, [i] = ${fmtNum(res.jinksJones.i, 4)}, [l] = ${fmtNum(res.jinksJones.l, 4)}.`));
      }
      el('b7EstNote').innerHTML = parts.join(' ');
      /* observed against expected */
      table('b7FitTable', [
        { label: T('Generación', 'Generation'), get: r => gname(r.gen) },
        { label: T('Media observada', 'Observed mean'), num: true, get: r => fmtNum(r.obs, 4) },
        { label: T('Esperada por el modelo', 'Expected by the model'), num: true, get: r => fmtNum(r.fit, 4) },
        { label: T('Diferencia', 'Difference'), num: true, get: r => fmtNum(r.obs - r.fit, 4) },
        { label: T('Aporte a χ²', 'Contribution to χ²'), num: true, get: r => fmtNum(r.w * (r.obs - r.fit) * (r.obs - r.fit), 4) },
      ], show.generations.map((g, k) => ({ gen: g, obs: show.observed[k], fit: show.fitted[k], w: show.weights[k] })));
    }
    mountFig('b7FigMeans', {
      title: () => T('Medias de las generaciones', 'Means of the generations') + ' · ' + label,
      fileName: 'generation_means',
      render: c => P7.means(c, res, { label, tcrit: S.qt(1 - B7.alpha / 2, Math.max(1, res.stats[0].dfMean || 1)) }),
      controls: () => [P2.titleControl(), { key: 'model', label: T('Modelo dibujado', 'Model drawn'), type: 'select', options: [['chosen', T('elegido', 'chosen')], ['perfect', T('ajuste perfecto', 'perfect fit')]] }, { key: 'showMidParent', label: T('Línea de la media de progenitores', 'Mid-parent line'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 900, height: 480, showMidParent: true, model: B7.model });
  }
  const MEANING = {
    m: { es: 'media de todas las líneas puras derivables de la cruza', en: 'mean of all the pure lines the cross can give' },
    d: { es: 'efectos aditivos (½ de la diferencia entre progenitores)', en: 'additive effects (½ of the difference between parents)' },
    h: { es: 'efectos de dominancia', en: 'dominance effects' },
    i: { es: 'epistasis aditiva × aditiva', en: 'additive × additive epistasis' },
    j: { es: 'epistasis aditiva × dominancia', en: 'additive × dominance epistasis' },
    l: { es: 'epistasis dominancia × dominancia', en: 'dominance × dominance epistasis' },
  };

  /* ================= 4 · variances ================= */
  function renderVariances() {
    const res = B7.res, V = res.variances, label = state.data.ds.traits[B7.trait].name;
    el('b7VarBox').style.display = V ? '' : 'none';
    if (!V && res.plotLevel) { msg('b7VarMsg', [{ level: 'info', es: 'Hay un solo valor por parcela: las medias se comparan con el error de parcelas, pero D, H, F, E, las heredabilidades y los factores efectivos necesitan los valores de cada planta.', en: 'There is one value per plot: the means are compared with the plot error, but D, H, F, E, the heritabilities and the effective factors need the value of every plant.' }]); return; }
    if (!V) { msg('b7VarMsg', [{ level: 'warning', es: 'No hay suficientes generaciones segregantes con varianza para estimar D, H, F y E.', en: 'There are not enough segregating generations with a variance to estimate D, H, F and E.' }]); return; }
    table('b7CompTable', [
      { label: T('Componente', 'Component'), get: r => r.key },
      { label: T('Significado', 'Meaning'), get: r => `<span class="hint">${T(VMEAN[r.key])}</span>` },
      { label: T('Estimación', 'Estimate'), num: true, get: r => fmtNum(r.value, 4) },
      { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
      { label: 't', num: true, get: r => f2(r.t) },
    ], V.list);
    const rows = [];
    const add = (es, en, def, value, reading) => rows.push({ es, en, def, value, reading });
    add('σ²A (base F₂)', 'σ²A (F₂ basis)', '½D', V.sigma2A, '');
    add('σ²D (base F₂)', 'σ²D (F₂ basis)', '¼H', V.sigma2D, '');
    add('Grado medio de dominancia', 'Average degree of dominance', '√(H/D)', V.dominance, V.dominance > 1 ? T('sobredominancia media', 'average overdominance') : V.dominance >= 0 ? T('dominancia parcial', 'partial dominance') : '');
    add('h² en sentido estrecho', 'Narrow-sense h²', '½D/(½D + ¼H + E)', V.h2n, '');
    add('H² en sentido amplio', 'Broad-sense H²', '(½D + ¼H)/(½D + ¼H + E)', V.h2b, '');
    add('h² estrecho de Warner (1952)', "Warner's (1952) narrow-sense h²", T('[2V(F₂) − V(RC₁) − V(RC₂)]/V(F₂)', '[2V(F₂) − V(BC₁) − V(BC₂)]/V(F₂)'), V.warner, T('usa solo tres varianzas', 'uses three variances only'));
    add('H² amplio desde F₂', 'Broad-sense H² from F₂', '[V(F₂) − E]/V(F₂)', V.h2bF2, '');
    table('b7VarParamTable', [
      { label: T('Parámetro', 'Parameter'), get: r => T(r.es, r.en) },
      { label: T('Definición', 'Definition'), get: r => `<span class="hint">${r.def}</span>` },
      { label: T('Valor', 'Value'), num: true, get: r => fmtNum(r.value, 4) },
      { label: T('Lectura', 'Reading'), get: r => `<span class="hint">${r.reading || ''}</span>` },
    ], rows);
    const notes = [];
    if (V.df > 0) notes.push({ level: V.p < B7.alpha ? 'warning' : 'info', es: `Ajuste de las varianzas: χ² = ${fmtNum(V.chi2, 3)} con ${V.df} gl (${pEq(V.p)}).${V.p < B7.alpha ? ' El modelo sin epistasis ni ligamiento no describe las varianzas.' : ''}`, en: `Fit of the variances: χ² = ${fmtNum(V.chi2, 3)} with ${V.df} df (${pEq(V.p)}).${V.p < B7.alpha ? ' The model without epistasis and without linkage does not describe the variances.' : ''}` });
    if (V.D <= 0 || V.H < 0) notes.push({ level: 'warning', es: 'Hay componentes negativos: el grado de dominancia y las heredabilidades que usan D y H no se calculan con ellos. La h² de Warner y la H² desde la F₂ usan directamente las varianzas y sí se calculan (y pueden salir negativas).', en: 'Some components are negative: the degree of dominance and the heritabilities that use D and H are not computed from them. The h² of Warner and the H² from the F₂ use the variances directly and are computed (and can come out negative).' });
    notes.push({ level: 'info', es: 'Cada varianza pesa gl/(2V̂²), con los pesos recalculados sobre los valores ajustados hasta que no cambian (práctica de Mather y Jinks): las varianzas con más grados de libertad y más pequeñas pesan más.', en: 'Every variance is weighted by df/(2V̂²), with the weights recomputed on the fitted values until they no longer change (Mather & Jinks practice): variances with more degrees of freedom and smaller values weigh more.' });
    msg('b7VarMsg', notes);
    mountFig('b7FigVar', {
      title: () => T('Varianzas observadas y esperadas', 'Observed and expected variances') + ' · ' + label,
      fileName: 'generation_variances',
      render: c => P7.variances(c, V, { label: T('varianza', 'variance') }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 760, height: 440 });
  }
  const VMEAN = {
    D: { es: 'varianza aditiva (Σd²); σ²A = ½D en F₂', en: 'additive variance (Σd²); σ²A = ½D in an F₂' },
    H: { es: 'varianza de dominancia (Σh²); σ²D = ¼H en F₂', en: 'dominance variance (Σh²); σ²D = ¼H in an F₂' },
    F: { es: 'asociación entre efectos aditivos y de dominancia (Σdh)', en: 'association between additive and dominance effects (Σdh)' },
    E: { es: 'varianza ambiental entre individuos', en: 'environmental variance among individuals' },
  };

  /* ================= 5 · heterosis and effective factors ================= */
  function renderHeterosis() {
    const res = B7.res, H = res.heterosis, label = state.data.ds.traits[B7.trait].name;
    el('b7HetBox').style.display = H && H.list.length ? '' : 'none';
    if (H && H.list.length) {
      table('b7HetTable', [
        { label: T('Medida', 'Measure'), get: r => T(r.es, r.en) },
        { label: T('Diferencia', 'Difference'), num: true, get: r => fmtNum(r.value, 4) },
        { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
        { label: '%', num: true, get: r => fmtNum(r.pct, 1) },
        { label: 't', num: true, get: r => f2(r.t) },
        { label: T('gl', 'df'), num: true, get: r => fdf(r.df) },
        { label: 'p', num: true, get: r => sig(r.p) },
      ], H.list);
      const parts = [];
      if (H.potence) parts.push(T(`Relación de potencia (F₁ − media de progenitores)/(½|P₁ − P₂|) = ${fmtNum(H.potence.value, 3)} ± ${fmtNum(H.potence.se, 3)}: ${Math.abs(H.potence.value) > 1 ? 'sobredominancia aparente' : Math.abs(H.potence.value) > 0.5 ? 'dominancia parcial a completa' : 'dominancia débil'} hacia ${H.potence.value >= 0 ? 'el progenitor de valor más alto' : 'el de valor más bajo'}.`,
        `Potence ratio (F₁ − mid-parent)/(½|P₁ − P₂|) = ${fmtNum(H.potence.value, 3)} ± ${fmtNum(H.potence.se, 3)}: ${Math.abs(H.potence.value) > 1 ? 'apparent overdominance' : Math.abs(H.potence.value) > 0.5 ? 'partial to complete dominance' : 'weak dominance'} towards ${H.potence.value >= 0 ? 'the higher parent' : 'the lower parent'}.`));
      if (isFinite(H.expectedF2)) parts.push(T(`Sin epistasis la F₂ debería quedar a la mitad del camino de la heterosis de la F₁: se esperaba ${fmtNum(H.expectedF2, 3)} y se observó ${fmtNum(H.observedF2, 3)}.`,
        `Without epistasis the F₂ should keep half of the F₁ heterosis: ${fmtNum(H.expectedF2, 3)} was expected and ${fmtNum(H.observedF2, 3)} observed.`));
      const ch = res.models.chosen;
      /* in terms of the model only when the model has a dominance term to speak of */
      if (ch && ch.params.includes('h')) {
        const g = k => { const e = ch.est.find(x => x.key === k); return e ? e.value : 0; };
        const has = k => ch.params.includes(k);
        const hh = g('h'), ii = g('i'), ll = g('l');
        const mph = B7.metric === 'MJ' ? hh + ll - ii : hh - ii;
        parts.push(T(`En términos del modelo, la heterosis de la F₁ es ${B7.metric === 'MJ' ? '[h] + [l] − [i]' : 'h − i'} = ${fmtNum(mph, 3)}${has('i') || has('l') ? '' : ' (sin términos epistáticos en el modelo elegido)'}.`,
          `In terms of the model, the F₁ heterosis is ${B7.metric === 'MJ' ? '[h] + [l] − [i]' : 'h − i'} = ${fmtNum(mph, 3)}${has('i') || has('l') ? '' : ' (no epistatic terms in the chosen model)'}.`));
      }
      const shs = H.list.filter(x => x.check);
      if (shs.length) parts.push(T(`La heterosis estándar compara la F₁ con ${shs.length === 1 ? 'el testigo' : 'cada testigo'} (${shs.map(x => `${esc(x.check)}: ${fmtNum(x.base, 4)}`).join('; ')}) en porcentaje de su media; usa el error de parcela de todo el ensayo, testigos incluidos, y los testigos no entran en las pruebas de escala ni en los modelos.`,
        `Standard heterosis compares the F₁ with ${shs.length === 1 ? 'the check' : 'every check'} (${shs.map(x => `${esc(x.check)}: ${fmtNum(x.base, 4)}`).join('; ')}) as a percentage of its mean; it uses the plot error of the whole trial, checks included, and the checks do not enter the scaling tests or the models.`));
      else parts.push(T('Con un testigo en los datos (una entrada que no es generación, como la variedad comercial que se quiere reemplazar), la tabla agrega la heterosis estándar.',
        'With a check in the data (an entry that is not a generation, such as the commercial variety to be replaced), the table adds the standard heterosis.'));
      el('b7HetNote').innerHTML = parts.join(' ');
      mountFig('b7FigHet', {
        title: () => T('Heterosis y depresión endogámica', 'Heterosis and inbreeding depression') + ' · ' + label,
        fileName: 'heterosis',
        render: c => P7.heterosis(c, H, { label, alpha: B7.alpha, tcrit: S.qt(1 - B7.alpha / 2, Math.max(1, H.list[0].df)) }),
        controls: () => [P2.titleControl(), { key: 'show', label: T('Escala', 'Scale'), type: 'select', options: [['abs', T('diferencia', 'difference')], ['pct', T('porcentaje', 'percentage')]] }, { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
      }, { width: 700, height: 420, flip: true });
    }
    /* effective factors */
    const F = res.factors;
    el('b7FactBox').style.display = F && F.list.length ? '' : 'none';
    if (F && F.list.length) {
      table('b7FactTable', [
        { label: T('Varianza de segregación', 'Segregation variance'), get: r => T(r.es, r.en) },
        { label: 'σ²s', num: true, get: r => fmtNum(r.sigma2s, 4) },
        { label: T('Factores efectivos', 'Effective factors'), num: true, get: r => fmtNum(r.n, 2) },
        { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 2) },
      ], F.list);
      const parts = [T(`n<sub>E</sub> = (P̄₂ − P̄₁)²/(8σ²s) con la diferencia entre progenitores ${fmtNum(F.delta, 3)} (Castle y Wright, corregido por Lande 1981 con su error estándar).`,
        `n<sub>E</sub> = (P̄₂ − P̄₁)²/(8σ²s) with a parental difference of ${fmtNum(F.delta, 3)} (Castle–Wright, as corrected by Lande 1981 with its standard error).`)];
      if (F.cockerham && isFinite(F.cockerham.n)) parts.push(T(`Corrección de Cockerham (1986), que quita del numerador el error de muestreo de las medias y usa una sola σ²s de todas las varianzas: σ²s = ${fmtNum(F.cockerham.sigma2s, 4)}, E = ${fmtNum(F.cockerham.E, 4)} y n<sub>E</sub> = ${fmtNum(F.cockerham.n, 2)}.`,
        `Cockerham's (1986) correction, which removes the sampling error of the means from the numerator and uses one σ²s from all the variances: σ²s = ${fmtNum(F.cockerham.sigma2s, 4)}, E = ${fmtNum(F.cockerham.E, 4)} and n<sub>E</sub> = ${fmtNum(F.cockerham.n, 2)}.`));
      parts.push(T('Es un mínimo: la dominancia, la epistasis, el ligamiento y los efectos desiguales entre loci lo hacen menor que el número verdadero de genes. El factor de mayor efecto no puede explicar más de 1/√n<sub>E</sub> de la diferencia.',
        'It is a minimum: dominance, epistasis, linkage and unequal effects between loci all make it smaller than the true number of genes. The leading factor cannot account for more than 1/√n<sub>E</sub> of the difference.'));
      el('b7FactNote').innerHTML = parts.join(' ');
    }
  }

  /* ================= 6 · notes ================= */
  function renderNotes() {
    const host = el('b7Notes');
    if (!host) return;
    const notes = [
      {
        es: ['Pruebas de escala (Mather 1949)', 'A = 2RC₁ − P₁ − F₁, B = 2RC₂ − P₂ − F₁, C = 4F₂ − 2F₁ − P₁ − P₂ y D = 2F₂ − RC₁ − RC₂ valen cero cuando el modelo aditivo–dominante basta. Sus varianzas son Σc²V(media), con la varianza de cada media según el diseño. En la métrica F∞: A = −½[i] + ½[j] − ½[l], B = −½[i] − ½[j] − ½[l], C = −2[i] − [l] y D = −½[i], así que D prueba [i] sola, C − 4D estima −[l] y A − B prueba [j].'],
        en: ['Scaling tests (Mather 1949)', 'A = 2BC₁ − P₁ − F₁, B = 2BC₂ − P₂ − F₁, C = 4F₂ − 2F₁ − P₁ − P₂ and D = 2F₂ − BC₁ − BC₂ are zero when the additive–dominance model is enough. Their variances are Σc²V(mean), with the variance of every mean taken from the design. In the F∞ metric: A = −½[i] + ½[j] − ½[l], B = −½[i] − ½[j] − ½[l], C = −2[i] − [l] and D = −½[i], so D tests [i] alone, C − 4D estimates −[l] and A − B tests [j].'],
      },
      {
        es: ['Prueba conjunta de escala (Cavalli 1952)', 'Mínimos cuadrados ponderados sobre las medias con w = 1/V(media): β̂ = (X′WX)⁻¹X′Wy, V(β̂) = (X′WX)⁻¹ y χ² = Σw(ȳ − x′β̂)² con (generaciones − parámetros) grados de libertad. El χ² es aproximado porque los pesos se estiman; con 10 a 40 individuos por generación la aproximación ya sirve (Gale, Mather y Jinks 1977). Con medias de parcela los pesos tienen pocos grados de libertad y el χ² rechaza de más (9 % de las veces al 5 % en simulaciones con tres bloques); entonces la p es la de Welch–James (Johansen 1980): χ²/c contra F(q, ν), con A = Σ(1 − h<sub>ii</sub>)²/f<sub>i</sub>, c = q + 2A − 6A/(q + 2) y ν = q(q + 2)/(3A), donde h<sub>ii</sub> son los apalancamientos del ajuste ponderado y f<sub>i</sub> los grados de libertad de la varianza de cada media. Con un valor por parcela todos los pesos son múltiplos del mismo cuadrado medio y χ²/q sigue exactamente una F. Se prueban modelos de complejidad creciente y se elige el primero que no se rechaza y tiene todos sus parámetros significativos; si ninguno lo logra, al primero que no se rechaza se le quitan uno a uno los parámetros no significativos, el menos significativo primero, mientras el ajuste se mantenga (Jayasekara y Jinks 1976).'],
        en: ['Joint scaling test (Cavalli 1952)', 'Weighted least squares on the means with w = 1/V(mean): β̂ = (X′WX)⁻¹X′Wy, V(β̂) = (X′WX)⁻¹ and χ² = Σw(ȳ − x′β̂)² with (generations − parameters) degrees of freedom. The χ² is approximate because the weights are estimated; with 10 to 40 individuals per generation the approximation already serves (Gale, Mather & Jinks 1977). With plot means the weights have few degrees of freedom and the χ² rejects too often (9 % of the time at 5 % in simulations with three blocks); the p is then the Welch–James one (Johansen 1980): χ²/c against F(q, ν), with A = Σ(1 − h<sub>ii</sub>)²/f<sub>i</sub>, c = q + 2A − 6A/(q + 2) and ν = q(q + 2)/(3A), where h<sub>ii</sub> are the leverages of the weighted fit and f<sub>i</sub> the degrees of freedom of the variance of every mean. With one value per plot every weight is a multiple of the same mean square and χ²/q follows an F exactly. Models of increasing complexity are fitted and the first one that is not rejected and has every parameter significant is chosen; if none qualifies, the non-significant parameters of the first model that is not rejected are dropped one at a time, the least significant first, while the fit holds (Jayasekara & Jinks 1976).'],
      },
      {
        es: ['Dos métricas que no son lo mismo', 'Con α = f(AA) − f(aa) y β = f(Aa): la métrica F∞ de Mather y Jinks escribe μ = m + α[d] + β[h] + α²[i] + αβ[j] + β²[l], y la F₂ de Hayman μ = m + αd + (β−½)h + α²i + 2α(β−½)j + (β−½)²l. Se relacionan por m_F∞ = m_H − ½h + ¼l, [d] = d − j, [h] = h − l, [i] = i, [j] = 2j, [l] = l. El χ² es el mismo en las dos (es una reparametrización), pero los signos de h pueden cambiar, y la clasificación de la epistasis (complementaria si [h] y [l] tienen el mismo signo, duplicada si no) debe leerse en la métrica que se informa. Muchos artículos que citan «Hayman (1958)» usan en realidad la convención de Jinks y Jones (1958), que es la de Hayman con [j] = 2j.'],
        en: ['Two metrics that are not the same', 'With α = f(AA) − f(aa) and β = f(Aa): Mather & Jinks\'s F∞ metric writes μ = m + α[d] + β[h] + α²[i] + αβ[j] + β²[l] and Hayman\'s F₂ metric μ = m + αd + (β−½)h + α²i + 2α(β−½)j + (β−½)²l. They are related by m_F∞ = m_H − ½h + ¼l, [d] = d − j, [h] = h − l, [i] = i, [j] = 2j, [l] = l. The χ² is the same in both (it is a reparametrisation), but the signs of h can change, and the classification of epistasis (complementary when [h] and [l] share their sign, duplicate otherwise) has to be read in the metric being reported. Many papers that cite "Hayman (1958)" in fact use the Jinks & Jones (1958) convention, which is Hayman\'s with [j] = 2j.'],
      },
      {
        es: ['Varianzas de las generaciones', 'Con D = Σd², H = Σh², F = Σdh y E ambiental: V(F₂) = ½D + ¼H + E, V(RC₁) = ¼D + ¼H − ½F + E, V(RC₂) = ¼D + ¼H + ½F + E, V(F₃) = ¾D + 3/16H + E y V(RC autofecundada) = ½D + 3/16H ∓ ¼F + E (las dos últimas deducidas de las frecuencias genotípicas y comprobadas por simulación). Los progenitores y la F₁ estiman E. Con ligamiento, epistasis o interacción con el ambiente, D y H quedan sesgados.'],
        en: ['Variances of the generations', 'With D = Σd², H = Σh², F = Σdh and E environmental: V(F₂) = ½D + ¼H + E, V(BC₁) = ¼D + ¼H − ½F + E, V(BC₂) = ¼D + ¼H + ½F + E, V(F₃) = ¾D + 3/16H + E and V(selfed BC) = ½D + 3/16H ∓ ¼F + E (the last two derived from the genotype frequencies and checked by simulation). The parents and the F₁ estimate E. With linkage, epistasis or interaction with the environment, D and H are biased.'],
      },
      {
        es: ['Número mínimo de factores efectivos', 'n_E = (P̄₂ − P̄₁)²/(8σ²s) de Castle y Wright, con las cuatro varianzas de segregación de Lande (1981) y sus errores estándar, y con la corrección de Cockerham (1986), que resta del numerador el error de muestreo de las medias parentales y estima una sola σ²s con todas las varianzas. Supone aditividad en la escala usada, todos los alelos que aumentan en un progenitor y loci no ligados.'],
        en: ['Minimum number of effective factors', 'n_E = (P̄₂ − P̄₁)²/(8σ²s) of Castle and Wright, with the four segregation variances of Lande (1981) and their standard errors, and with Cockerham\'s (1986) correction, which subtracts the sampling error of the parental means from the numerator and estimates one σ²s from all the variances. It assumes additivity on the scale used, all increasing alleles in one parent and unlinked loci.'],
      },
      {
        es: ['Heterosis y depresión endogámica', 'Se prueba la diferencia, no el porcentaje: SE(F₁ − MP) = √[V(F̄₁) + ¼V(P̄₁) + ¼V(P̄₂)] y SE(F₁ − mejor progenitor) = √[V(F̄₁) + V(P̄mejor)]. Sin epistasis, F₂ − MP = ½(F₁ − MP) y la depresión endogámica F₁ − F₂ es también la mitad de la heterosis; en términos del modelo, F₁ − MP = [h] + [l] − [i]. La relación de potencia se da con su error estándar por el método delta. La heterosis estándar, F₁ − testigo en porcentaje del testigo, mide la ventaja práctica de la F₁ sobre la variedad que se quiere reemplazar, con SE = √[V(F̄₁) + V(testigo)] y el error de parcela de todo el ensayo.'],
        en: ['Heterosis and inbreeding depression', 'The difference is tested, not the percentage: SE(F₁ − MP) = √[V(F̄₁) + ¼V(P̄₁) + ¼V(P̄₂)] and SE(F₁ − better parent) = √[V(F̄₁) + V(P̄better)]. Without epistasis, F₂ − MP = ½(F₁ − MP) and the inbreeding depression F₁ − F₂ is half of the heterosis as well; in terms of the model, F₁ − MP = [h] + [l] − [i]. The potence ratio is given with its standard error by the delta method. Standard heterosis, F₁ − check as a percentage of the check, measures the practical advantage of the F₁ over the variety it should replace, with SE = √[V(F̄₁) + V(check)] and the plot error of the whole trial.'],
      },
      {
        es: ['Supuestos', 'Progenitores homocigóticos, herencia diploide, sin efectos maternos ni recíprocos (compárese F₁ con su recíproca si están las dos), sin ligamiento entre genes que interactúan, escala adecuada (si las pruebas de escala fallan, conviene transformar la variable antes de añadir epistasis) y sin selección diferencial de plantas. Las varianzas de las medias deben venir del error que corresponde al diseño: entre plantas cuando están individualmente aleatorizadas y del error de parcela cuando hay parcelas repetidas (Hayman 1958). En ese caso la varianza de una media de parcela de la generación g es σ²p + s²g/k: el error de parcela, común a todas las generaciones, más la varianza entre las plantas de g dividida entre las plantas por parcela. σ²p sale del cuadrado medio residual de las medias de parcela una vez quitados los bloques (que son comunes a todas las generaciones y no afectan las comparaciones entre ellas), menos su parte debida a las plantas. Los grados de libertad de las pruebas t son los de Satterthwaite (1946).'],
        en: ['Assumptions', 'Homozygous parents, diploid inheritance, no maternal or reciprocal effects (compare the F₁ with its reciprocal when both are there), no linkage between interacting genes, an adequate scale (when the scaling tests fail, transforming the trait is worth trying before adding epistasis) and no differential survival of plants. The variances of the means must come from the error the design provides: among plants when they are individually randomised and from the plot error when there are replicated plots (Hayman 1958). Then the variance of one plot mean of generation g is σ²p + s²g/k: the plot error, shared by every generation, plus the variance among the plants of g over the plants per plot. σ²p comes from the residual mean square of the plot means once the blocks are taken out (they are shared by every generation and do not affect the comparisons among them), minus its plant part. The t tests use Satterthwaite (1946) degrees of freedom.'],
      },
    ];
    const cites = [
      'Mather K (1949). Biometrical Genetics: The Study of Continuous Variation. Methuen, London.',
      'Cavalli LL (1952). An analysis of linkage in quantitative inheritance. In: Reeve ECR, Waddington CH (eds.) Quantitative Inheritance. HMSO, London, pp. 135–144.',
      'Warner JN (1952). A method for estimating heritability. Agronomy Journal 44: 427–430.',
      'Hayman BI (1958). The separation of epistatic from additive and dominance variation in generation means. Heredity 12: 371–390.',
      'Jinks JL, Jones RM (1958). Estimation of the components of heterosis. Genetics 43: 223–234.',
      'Jayasekara NEM, Jinks JL (1976). Effect of gene dispersion on estimates of components of generation means and variances. Heredity 36: 31–40.',
      'Gale JS, Mather K, Jinks JL (1977). Joint scaling tests. Heredity 38: 47–51.',
      'Lande R (1981). The minimum number of genes contributing to quantitative variation between and within populations. Genetics 99: 541–553.',
      'Cockerham CC (1986). Modifications in estimating the number of genes for a quantitative character. Genetics 114: 659–664.',
      'Johansen S (1980). The Welch–James approximation to the distribution of the residual sum of squares in a weighted linear regression. Biometrika 67: 85–92.',
      'Satterthwaite FE (1946). An approximate distribution of estimates of variance components. Biometrics Bulletin 2: 110–114.',
      'Kearsey MJ, Pooni HS (1996). The Genetical Analysis of Quantitative Traits. Chapman & Hall, London.',
    ];
    host.innerHTML = notes.map(n => `<div class="method-note"><h4>${T(n.es[0], n.en[0])}</h4><p>${T(n.es[1], n.en[1])}</p></div>`).join('')
      + `<div class="method-note"><h4>${T('Referencias', 'References')}</h4><ul class="ref-list">${cites.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  /* ================= downloads ================= */
  function downloadXlsx() {
    const res = B7.res;
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 28));
    add(T('Generaciones', 'Generations'), [[T('Generación', 'Generation'), 'n', T('Media', 'Mean'), T('EE', 'SE'), T('Varianza', 'Variance'), T('gl', 'df')]]
      .concat(res.stats.concat(res.checks || []).map(s => [s.gen, s.n, s.mean, s.seMean, s.varWithin, s.dfWithin])));
    add(T('Escala', 'Scaling'), [[T('Prueba', 'Test'), T('Valor', 'Value'), T('EE', 'SE'), 't', 'p']]
      .concat(res.scaling.map(x => [x.key, x.value, x.se, x.t, x.p])));
    add(T('Modelos', 'Models'), [[T('Modelo', 'Model'), T('gl', 'df'), 'chi2', 'p']]
      .concat(res.models.list.map(m => [m.params.join('+'), m.df, m.chi2, m.p])));
    if (res.models.chosen) add(T('Parámetros', 'Parameters'), [[T('Parámetro', 'Parameter'), T('Estimación', 'Estimate'), T('EE', 'SE'), 't', 'p']]
      .concat(res.models.chosen.est.map(e => [e.key, e.value, e.se, e.t, e.p])));
    if (res.perfect) add(T('Ajuste perfecto', 'Perfect fit'), [[T('Parámetro', 'Parameter'), T('Estimación', 'Estimate'), T('EE', 'SE')]]
      .concat(res.perfect.est.map(e => [e.key, e.value, e.se])));
    if (res.variances) add(T('Varianzas', 'Variances'), [[T('Componente', 'Component'), T('Estimación', 'Estimate'), T('EE', 'SE')]]
      .concat(res.variances.list.map(c => [c.key, c.value, c.se]))
      .concat([[], ['sigma2A', res.variances.sigma2A], ['sigma2D', res.variances.sigma2D], ['h2n', res.variances.h2n], ['h2b', res.variances.h2b], ['warner', res.variances.warner]]));
    if (res.factors && res.factors.list.length) add(T('Factores', 'Factors'), [[T('Varianza de segregación', 'Segregation variance'), 'sigma2s', 'n', T('EE', 'SE')]]
      .concat(res.factors.list.map(x => [x.key, x.sigma2s, x.n, x.se])));
    if (res.heterosis && res.heterosis.list.length) add(T('Heterosis', 'Heterosis'), [[T('Medida', 'Measure'), T('Valor', 'Value'), T('EE', 'SE'), '%', 'p']]
      .concat(res.heterosis.list.map(x => [x.key, x.value, x.se, x.pct, x.p])));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('generaciones_', 'generations_') + (state.data.ds.traits[B7.trait].name || '')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderPickers() {
    const D = state.data;
    el('b7Trait').innerHTML = D.ds.traits.map((t, i) => `<option value="${i}"${i === B7.trait ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const envs = D.field.envs;
    el('b7EnvField').style.display = envs.length > 1 ? '' : 'none';
    el('b7Env').innerHTML = envs.map(e => `<option value="${esc(e.key)}">${esc(e.name)}</option>`).join('') + (envs.length > 1 ? `<option value="__all">${T('todos juntos', 'all together')}</option>` : '');
    if (!B7.env || ![...el('b7Env').options].some(o => o.value === B7.env)) B7.env = envs.length > 1 ? '__all' : envs[0].key;
    el('b7Env').value = B7.env;
    el('b7Metric').value = B7.metric;
    el('b7Weights').value = B7.weights;
    el('b7Alpha').value = String(B7.alpha);
    el('b7Goal').value = B7.goal;
    el('b7Model').value = B7.model;
  }
  function renderAll() {
    const st = status();
    ['b7Scale', 'b7Means', 'b7Var', 'b7Het', 'b7Notes0'].forEach(id => { const n = el(id); if (n) n.style.display = st.ok ? '' : 'none'; });
    if (!st.ok) { el('b7Source').innerHTML = ''; el('b7Tiles').innerHTML = ''; el('b7StatTable').innerHTML = ''; msg('b7SetupMsg', [{ level: 'warning', es: st.es, en: st.en }]); return; }
    const D = state.data;
    if (B7.trait >= D.ds.traits.length) B7.trait = 0;
    renderPickers();
    B7.res = analyse();
    if (!B7.res || !B7.res.stats.length) { msg('b7SetupMsg', [{ level: 'error', es: 'No se pudieron calcular las estadísticas de las generaciones.', en: 'The statistics of the generations could not be computed.' }]); return; }
    state.generations = { trait: D.ds.traits[B7.trait].name, res: B7.res };
    renderSetup();
    renderScaling();
    renderMeans();
    renderVariances();
    renderHeterosis();
    /* generations are not analysed by Blocks 8 to 11 (they need genotypes): the next step is the report */
    const s = STEPS[11];
    el('b7Next').disabled = !s.ready;
    el('b7NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque 12, en construcción)`, `Next: ${s.en} (Block 12, under construction)`);
  }

  function init() {
    if (!el('b7Setup')) return;
    renderNotes();
    const soft = () => { B7.cache.clear(); renderAll(); };
    el('b7Trait').addEventListener('change', () => { B7.trait = +el('b7Trait').value; soft(); });
    el('b7Env').addEventListener('change', () => { B7.env = el('b7Env').value; soft(); });
    el('b7Metric').addEventListener('change', () => { B7.metric = el('b7Metric').value; soft(); });
    el('b7Weights').addEventListener('change', () => { B7.weights = el('b7Weights').value; soft(); });
    el('b7Alpha').addEventListener('change', () => { B7.alpha = parseFloat(el('b7Alpha').value); soft(); });
    el('b7Goal').addEventListener('change', () => { B7.goal = el('b7Goal').value; soft(); });
    el('b7Model').addEventListener('change', () => { B7.model = el('b7Model').value; delete Fig.registry.b7FigMeans; renderMeans(); });
    el('b7DlXlsx').addEventListener('click', downloadXlsx);
    el('b7Back').addEventListener('click', () => goStep(3));
    el('b7Next').addEventListener('click', () => { if (STEPS[11].ready) goStep(12); });
    document.addEventListener('datachange', () => { B7.cache.clear(); B7.env = null; if (document.getElementById('panel-7').classList.contains('active')) renderAll(); else B7.built = false; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 7 && (!B7.built || !B7.res)) { B7.built = true; renderAll(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B7.res) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
