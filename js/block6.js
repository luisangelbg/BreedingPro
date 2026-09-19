/* BreedingPro — Block 6 interface: the mating designs that are not complete diallels.
   North Carolina I, II and III, the triple test cross, line × tester and partial diallels,
   analysed on the plot values that Block 3 adjusted. */

(function () {
  const B6 = { trait: 0, env: null, F: 0, Fset: false, goal: 'high', alpha: 0.05, l3: null, res: null, cache: new Map(), built: false, hetKind: 'mph' };
  window.B6 = B6;

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
    if (limit && rows.length > limit) h += `<p class="hint">${T(`Se muestran ${limit} de ${rows.length} filas.`, `Showing ${limit} of ${rows.length} rows.`)}</p>`;
    host.innerHTML = h;
  };
  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    Fig.mount(hostId, Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {}));
  }
  const sig = p => (isFinite(p) ? `${fmtP(p)} <span class="sig">${stars(p)}</span>` : '');

  /* the names of the sources of variation, which depend on the design */
  function sources(design) {
    const S1 = {
      env: { es: 'Ambientes', en: 'Environments' },
      set: { es: 'Conjuntos', en: 'Sets' },
      rep: { es: 'Repeticiones (dentro de conjunto y ambiente)', en: 'Replicates (within set and environment)' },
      block: { es: 'Bloques incompletos dentro de repetición', en: 'Incomplete blocks within replicate' },
      error: { es: 'Error experimental', en: 'Experimental error' },
      within: { es: 'Entre plantas dentro de parcela', en: 'Between plants within plot' },
      total: { es: 'Total', en: 'Total' },
    };
    if (design === 'nc1') Object.assign(S1, {
      male: { es: 'Machos', en: 'Males' },
      female: { es: 'Hembras dentro de machos', en: 'Females within males' },
      maleEnv: { es: 'Machos × ambientes', en: 'Males × environments' },
      femaleEnv: { es: 'Hembras dentro de machos × ambientes', en: 'Females within males × environments' },
    });
    if (design === 'nc2') Object.assign(S1, {
      male: { es: 'Machos', en: 'Males' },
      female: { es: 'Hembras', en: 'Females' },
      maleFemale: { es: 'Machos × hembras', en: 'Males × females' },
      maleEnv: { es: 'Machos × ambientes', en: 'Males × environments' },
      femaleEnv: { es: 'Hembras × ambientes', en: 'Females × environments' },
      maleFemaleEnv: { es: 'Machos × hembras × ambientes', en: 'Males × females × environments' },
    });
    if (design === 'lxt') Object.assign(S1, {
      pvc: { es: 'Progenitores contra cruzas', en: 'Parents against crosses' },
      parents: { es: 'Entre progenitores', en: 'Among parents' },
      line: { es: 'Líneas', en: 'Lines' },
      tester: { es: 'Probadores', en: 'Testers' },
      lineTester: { es: 'Líneas × probadores', en: 'Lines × testers' },
      lineEnv: { es: 'Líneas × ambientes', en: 'Lines × environments' },
      testerEnv: { es: 'Probadores × ambientes', en: 'Testers × environments' },
      lineTesterEnv: { es: 'Líneas × probadores × ambientes', en: 'Lines × testers × environments' },
    });
    if (design === 'nc3' || design === 'ttc') Object.assign(S1, {
      plant: { es: design === 'ttc' ? 'Individuos' : 'Plantas F₂', en: design === 'ttc' ? 'Individuals' : 'F₂ plants' },
      testerAdd: { es: 'Probadores: L₁ contra L₂ (aditivo)', en: 'Testers: L₁ against L₂ (additive)' },
      testerEpi: { es: 'Probadores: L₁ + L₂ contra 2L₃ (epistasis global)', en: 'Testers: L₁ + L₂ against 2L₃ (overall epistasis)' },
      plantAdd: { es: 'Individuos × (L₁ − L₂): dominancia', en: 'Individuals × (L₁ − L₂): dominance' },
      plantEpi: { es: 'Individuos × (L₁ + L₂ − 2L₃): epistasis', en: 'Individuals × (L₁ + L₂ − 2L₃): epistasis' },
      tester: { es: 'Probadores', en: 'Testers' },
      testerSet: { es: 'Probadores × conjuntos', en: 'Testers × sets' },
      plantTester: { es: design === 'ttc' ? 'Individuos × probadores' : 'Plantas × probadores', en: design === 'ttc' ? 'Individuals × testers' : 'Plants × testers' },
      plantEnv: { es: 'Individuos × ambientes', en: 'Individuals × environments' },
    });
    if (design === 'partial') Object.assign(S1, {
      gca: { es: 'Aptitud combinatoria general', en: 'General combining ability' },
      sca: { es: 'Aptitud combinatoria específica', en: 'Specific combining ability' },
      gcaEnv: { es: 'ACG × ambientes', en: 'GCA × environments' },
      scaEnv: { es: 'ACE × ambientes', en: 'SCA × environments' },
    });
    return S1;
  }
  const DESIGN_NAME = {
    nc1: { es: 'Carolina del Norte I (jerárquico)', en: 'North Carolina I (hierarchical)' },
    nc2: { es: 'Carolina del Norte II (factorial)', en: 'North Carolina II (factorial)' },
    nc3: { es: 'Carolina del Norte III', en: 'North Carolina III' },
    ttc: { es: 'Cruza triple de prueba', en: 'Triple test cross' },
    lxt: { es: 'Línea × probador', en: 'Line × tester' },
    partial: { es: 'Dialelo parcial', en: 'Partial diallel' },
  };

  /* ================= data ================= */
  function status() {
    const D = state.data;
    if (!D) return { ok: false, es: 'Cargue los datos en el Bloque 3.', en: 'Load the data in Block 3.' };
    if (!DESIGN_NAME[D.mating.design]) return {
      ok: false,
      es: D.mating.design === 'griffing' ? 'Su diseño es un dialelo completo: se analiza en los Bloques 4 y 5.' : 'Este bloque analiza Carolina del Norte I, II y III, la cruza triple de prueba, línea × probador y dialelos parciales.',
      en: D.mating.design === 'griffing' ? 'Your design is a complete diallel: it is analysed in Blocks 4 and 5.' : 'This block analyses North Carolina I, II and III, the triple test cross, line × tester and partial diallels.',
    };
    if (!D.ds.traits.length) return { ok: false, es: 'No hay variables respuesta.', en: 'There are no response traits.' };
    return { ok: true };
  }

  /* the plot values of the chosen environments, with the role of every entry */
  function buildObs() {
    const D = state.data, M = D.mating, design = M.design;
    const t = D.ds.traits[B6.trait];
    const ent = new Map(Data.entryTable(D.ds).map(e => [e.name, e]));
    const envs = D.field.envs;
    const wanted = B6.env === '__all' ? envs : envs.filter(e => e.key === B6.env);
    const obs = [], perEnv = [], designs = new Set();
    let within = null;
    wanted.forEach(E => {
      const res = Trial.analyseEnv(D.ds, E, t, { heritability: false, excluded: D.excluded, externalError: D.external });
      if (res.error || !res.plots) return;
      designs.add(res.design);
      perEnv.push({ key: E.key, name: res.env, design: res.design, mse: res.mse, dfe: res.dfe, r: res.harmonicReps, within: res.within, cv: res.cv, mean: res.mean });
      if (res.within && res.within.df > 0) within = { df: (within ? within.df : 0) + res.within.df, ss: (within ? within.ss : 0) + res.within.ss, plantsPerPlot: res.within.plantsPerPlot };
      res.plots.forEach(pl => {
        const e = ent.get(pl.entry);
        if (!e || e.type === 'check') return;
        const row = { env: E.key, set: pl.set || '', rep: pl.repKey, block: pl.blockKey, y: pl.y, n: pl.n, entry: pl.entry, design: res.design };
        if (design === 'nc1' || design === 'nc2') {
          if (!e.female || !e.male) return;
          row.male = e.male; row.female = e.female;
        } else if (design === 'lxt') {
          if (e.female && e.male && e.female !== e.male) { row.line = e.female; row.tester = e.male; }
          else row.parent = e.female || e.male || e.name;
        } else if (design === 'nc3' || design === 'ttc') {
          if (!e.female || !e.male) return;
          row.tester = M.testerIsFemale ? e.female : e.male;
          row.plant = M.testerIsFemale ? e.male : e.female;
        } else if (design === 'partial') {
          if (!e.female || !e.male || e.female === e.male) return;
          row.female = e.female; row.male = e.male;
        }
        obs.push(row);
      });
    });
    if (!obs.length || !perEnv.length) return null;
    if (within) within.ms = within.ss / within.df;
    const design0 = [...designs][0];
    const strata = {
      rep: !(designs.size === 1 && (design0 === 'crd' || design0 === 'means')),
      block: [...designs].some(d => d === 'alpha' || d === 'ibd' || d === 'augmented'),
    };
    const r = perEnv.reduce((s, x) => s + x.r, 0) / perEnv.length;
    return { obs, perEnv, strata, within, r, e: perEnv.length, designs: [...designs] };
  }

  function analyse() {
    const key = [B6.trait, B6.env, B6.F, B6.goal, B6.alpha, B6.l3].join('|');
    if (B6.cache.has(key)) return B6.cache.get(key);
    const b = buildObs();
    if (!b) return null;
    const D = state.data, M = D.mating;
    /* the triple test cross needs its testers in order: the two parents and then the F₁ */
    const testers = M.testers && M.testers.length
      ? (B6.l3 && M.testers.indexOf(B6.l3) >= 0 ? M.testers.filter(t => t !== B6.l3).concat([B6.l3]) : MD.orderTesters(M.testers))
      : null;
    const res = MD.analyse({
      design: M.design, obs: b.obs, strata: b.strata, parents: M.parents,
      testers, F: B6.F, alpha: B6.alpha, goal: B6.goal, r: b.r, e: b.e,
      within: b.within ? { sigma2w: b.within.ms, sigma2plot: 0 } : null,
    });
    res.built = b;
    /* the plot error keeps the sampling error of the plants inside it; for a plant basis the
       two parts are separated */
    if (b.within && b.within.ms > 0 && res.genetic) {
      const n = b.within.plantsPerPlot || 1;
      const plot = Math.max(0, res.mse - b.within.ms / n);
      MD.finishGenetic(res.genetic, { plotMse: res.mse, r: b.r, e: b.e, within: { sigma2w: b.within.ms, sigma2plot: plot } });
    }
    /* a partial diallel also gets the combining-ability effects of the diallel engine */
    if (M.design === 'partial' && M.parents) {
      const cells = new Map();
      b.obs.forEach(x => {
        const k = x.female + '|' + x.male;
        if (!cells.has(k)) cells.set(k, { env: '', i: M.parents.indexOf(x.female), j: M.parents.indexOf(x.male), sum: 0, n: 0 });
        const c = cells.get(k); c.sum += x.y; c.n++;
      });
      const list = [...cells.values()].filter(c => c.i >= 0 && c.j >= 0).map(c => ({ env: '', i: c.i, j: c.j, y: c.sum / c.n, w: c.n }));
      try {
        res.griffing = Griffing.analyse({
          cells: list, parents: M.parents, method: 4, F: B6.F, alpha: B6.alpha,
          envs: [{ key: '', name: '', mse: res.mse, dfe: res.dfe, r: b.r }],
        });
      } catch (err) { res.griffing = null; }
    }
    B6.cache.set(key, res);
    return res;
  }

  /* ================= 1 · setup and assumptions ================= */
  function renderSetup() {
    const D = state.data, res = B6.res, b = res.built, M = D.mating;
    const design = res.design;
    const parts = [];
    /* the structure of one set, when every set has the same one */
    const dims = res.cells.sets.map(g => g.rows.length + ' × ' + g.cols.length);
    const same = new Set(dims).size === 1;
    const nSets = res.cells.sets.length;
    const per = (es, en) => {
      const d = same ? dims[0] : dims.join(', ');
      return T(nSets > 1 ? `${nSets} conjuntos de ${d} (${es})` : `${d} ${es}`, nSets > 1 ? `${nSets} sets of ${d} (${en})` : `${d} ${en}`);
    };
    if (design === 'nc1') {
      const g0 = res.cells.sets[0], nm = g0.rows.length, nf = nm ? Math.round(g0.cols.length / nm * 10) / 10 : 0;
      parts.push(T(`${nSets > 1 ? nSets + ' conjuntos de ' : ''}${plural(nm, 'macho', 'machos')} con ${plural(nf, 'hembra propia', 'hembras propias')} cada uno`, `${nSets > 1 ? nSets + ' sets of ' : ''}${plural(nm, 'male', 'males')} with ${plural(nf, 'female', 'females')} of their own`));
    }
    if (design === 'nc2') parts.push(per('machos × hembras', 'males × females'));
    if (design === 'lxt') parts.push(T(`${M.lines.length} líneas × ${M.testers.length} probadores${M.parentsEvaluated ? ` + ${M.parentsEvaluated} progenitores` : ''}`, `${M.lines.length} lines × ${M.testers.length} testers${M.parentsEvaluated ? ` + ${M.parentsEvaluated} parents` : ''}`));
    if (design === 'nc3' || design === 'ttc') {
      const nSetsSD = new Set(b.obs.map(x => x.set || '')).size;
      const who = design === 'nc3' ? T('plantas F₂', 'F₂ plants') : T('individuos', 'individuals');
      parts.push(T(`${M.plants.length} ${who} × ${M.testers.length} probadores (${M.testers.join(', ')})${nSetsSD > 1 ? ` en ${nSetsSD} conjuntos` : ''}`, `${M.plants.length} ${who} × ${M.testers.length} testers (${M.testers.join(', ')})${nSetsSD > 1 ? ` in ${nSetsSD} sets` : ''}`));
    }
    if (design === 'partial') parts.push(T(`${M.p} progenitores, ${M.pairs} cruzas${M.s ? `, s = ${M.s}` : ''}${M.circulant ? ', circulante' : ''}`, `${M.p} parents, ${M.pairs} crosses${M.s ? `, s = ${M.s}` : ''}${M.circulant ? ', circulant' : ''}`));
    if (M.sets && M.sets.length > 1 && !['nc1', 'nc2'].includes(design)) parts.push(T(`${M.sets.length} conjuntos`, `${M.sets.length} sets`));
    el('b6Source').innerHTML = T(
      `Datos: <b>${esc(D.fileName || D.ds.fileName || '')}</b> · ${T(DESIGN_NAME[design])} · ${parts.join(' · ')} · ${b.perEnv.length > 1 ? `${b.perEnv.length} ambientes` : (b.perEnv[0].name || '')} · ${b.obs.length} parcelas · CM<sub>error</sub> = ${fmtNum(res.mse, 4)} con ${res.dfe} gl.`,
      `Data: <b>${esc(D.fileName || D.ds.fileName || '')}</b> · ${T(DESIGN_NAME[design])} · ${parts.join(' · ')} · ${b.perEnv.length > 1 ? `${b.perEnv.length} environments` : (b.perEnv[0].name || '')} · ${b.obs.length} plots · MS<sub>error</sub> = ${fmtNum(res.mse, 4)} with ${res.dfe} df.`);
    const G = res.genetic || {};
    const tiles = [];
    if (isFinite(G.s2A)) tiles.push(['σ²A', 'σ²A', fmtNum(G.s2A, 3), isFinite(G.seA) ? `${T('EE', 'SE')} ${fmtNum(G.seA, 3)}` : '']);
    if (isFinite(G.s2D)) tiles.push(['σ²D', 'σ²D', fmtNum(G.s2D, 3), isFinite(G.seD) ? `${T('EE', 'SE')} ${fmtNum(G.seD, 3)}` : '']);
    if (res.sd && isFinite(res.sd.s2A)) {
      tiles.length = 0;
      tiles.push(['σ²A', 'σ²A', fmtNum(res.sd.s2A, 3), `${T('EE', 'SE')} ${fmtNum(res.sd.seA, 3)}`]);
      tiles.push(['σ²D', 'σ²D', fmtNum(res.sd.s2D, 3), `${T('EE', 'SE')} ${fmtNum(res.sd.seD, 3)}`]);
      tiles.push(['Grado de dominancia', 'Degree of dominance', fmtNum(res.sd.dominance, 2), T('√(H/D)', '√(H/D)')]);
    }
    if (!res.sd && isFinite(G.dominance)) tiles.push(['Grado de dominancia', 'Degree of dominance', fmtNum(G.dominance, 2), T('√(2σ²D/σ²A)', '√(2σ²D/σ²A)')]);
    if (isFinite(G.h2ns)) tiles.push(['h² estrecho', 'Narrow-sense h²', fmtNum(G.h2ns, 3), T('base de parcela', 'plot basis')]);
    tiles.push(['Error', 'Error', fmtNum(res.mse, 3), `${res.dfe} ${T('gl', 'df')} · CV ${fmtNum(100 * Math.sqrt(res.mse) / Math.abs(b.perEnv[0].mean || 1), 1)} %`]);
    statTiles('b6Tiles', tiles);
    /* what the design assumes */
    const rows = [];
    const yes = (ok, es, en) => `<span class="pw ${ok === true ? 'ok' : ok === false ? 'low' : 'mid'}">${T(es, en)}</span>`;
    rows.push([T('Progenitores tomados al azar de una población de referencia', 'Parents taken at random from a reference population'),
      design === 'lxt' || design === 'partial' ? yes(null, 'depende del muestreo', 'depends on the sampling') : yes(null, 'se supone', 'assumed'),
      T('Los componentes estiman covarianzas de parentesco solo si los progenitores son una muestra al azar.', 'The components estimate relationship covariances only if the parents are a random sample.')]);
    rows.push([T('Coeficiente de endogamia de los progenitores (F)', 'Coefficient of inbreeding of the parents (F)'), `F = ${fmtNum(B6.F, 2)}`,
      T('Cov(MH) = (1+F)σ²A/4 y Cov(HC) = (1+F)σ²A/2 + ((1+F)/2)²σ²D: F cambia los coeficientes, no las sumas de cuadrados.', 'Cov(HS) = (1+F)σ²A/4 and Cov(FS) = (1+F)σ²A/2 + ((1+F)/2)²σ²D: F changes the coefficients, not the sums of squares.')]);
    rows.push([T('Sin epistasis', 'No epistasis'),
      design === 'ttc' ? (res.sd && res.sd.epistasis ? yes(res.sd.epistasis.among.p >= 0.05 && res.sd.epistasis.pOverall >= 0.05, 'se prueba abajo', 'tested below') : yes(null, '—', '—')) : yes(null, 'no comprobable', 'not testable'),
      design === 'ttc' ? T('La cruza triple de prueba la prueba con el contraste L₁ + L₂ − 2L₃.', 'The triple test cross tests it with the contrast L₁ + L₂ − 2L₃.') : T('Con epistasis, σ²A y σ²D quedan sesgados; solo la cruza triple de prueba la separa.', 'With epistasis σ²A and σ²D are biased; only the triple test cross separates it.')]);
    rows.push([T('Sin ligamiento ni efectos maternos', 'No linkage and no maternal effects'),
      design === 'nc1' ? yes(false, 'los efectos maternos se confunden', 'maternal effects are confounded') : yes(null, 'se supone', 'assumed'),
      design === 'nc1' ? T('En Carolina del Norte I la madre es distinta en cada cruza: σ²D incluye los efectos maternos.', 'In North Carolina I the mother differs in every cross: σ²D includes maternal effects.') : T('El ligamiento en desequilibrio infla la varianza de dominancia.', 'Linkage disequilibrium inflates the dominance variance.')]);
    if (res.built.within) rows.push([T('Datos por planta', 'Plant-level data'), yes(true, `${fmtNum(res.built.within.plantsPerPlot, 1)} ${T('plantas por parcela', 'plants per plot')}`, `${fmtNum(res.built.within.plantsPerPlot, 1)} plants per plot`),
      T('El error de muestreo entre plantas se separa del error experimental; la heredabilidad se da en base de parcela y de planta.', 'The sampling error between plants is kept apart from the experimental error; heritability is given on a plot and on a plant basis.')]);
    table('b6Assump', [
      { label: T('Supuesto', 'Assumption'), get: r => r[0] },
      { label: T('Estado', 'Status'), get: r => r[1] },
      { label: T('Qué implica', 'What it implies'), get: r => `<span class="hint">${r[2]}</span>` },
    ], rows);
    msg('b6SetupMsg', (D.mating.reasons || []).slice(0, 1).map(x => ({ level: 'info', es: x.es, en: x.en })).concat(res.issues || []));
  }

  /* ================= 2 · analysis of variance ================= */
  function renderAnova() {
    const res = B6.res, S1 = sources(res.design);
    const name = k => T(S1[k] || { es: k, en: k });
    const rows = res.rows.map(r => Object.assign({}, r));
    const total = { source: 'total', df: res.built.obs.length - 1, ss: rows.reduce((s, r) => s + r.ss, 0) + res.mse * res.dfe, total: true };
    const err = { source: 'error', df: res.dfe, ss: res.mse * res.dfe, ms: res.mse };
    const shown = rows.concat([err], res.built.within ? [Object.assign({ source: 'within' }, res.built.within)] : [], [total]);
    const coefText = r => {
      const c = res.coef && res.coef[r.source];
      if (!c || r.total) return '';
      const keys = Object.keys(c).filter(k => Math.abs(c[k] / (r.df || 1)) > 1e-8);
      if (!keys.length) return 'σ²e';
      const parts = keys.map(k => {
        const v = c[k] / r.df;
        const pretty = Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : fmtNum(v, 2);
        return `${pretty === '1' ? '' : pretty}σ²<sub>${T(SHORT[k] || { es: k, en: k })}</sub>`;
      });
      return 'σ²e + ' + parts.join(' + ');
    };
    table('b6AnovaTable', [
      { label: T('Fuente de variación', 'Source of variation'), get: r => (r.total ? `<b>${name(r.source)}</b>` : name(r.source)) },
      { label: T('gl', 'df'), num: true, get: r => r.df },
      { label: T('Suma de cuadrados', 'Sum of squares'), num: true, get: r => fmtNum(r.ss, 4) },
      { label: T('Cuadrado medio', 'Mean square'), num: true, get: r => (r.total ? '' : fmtNum(r.ms, 4)) },
      { label: T('CM esperado', 'Expected MS'), get: r => (r.total || r.source === 'error' || r.source === 'within' ? '' : `<span class="hint">${coefText(r)}</span>`) },
      { label: 'F', num: true, get: r => (isFinite(r.F) ? f2(r.F) : '') },
      { label: T('Contra', 'Against'), get: r => (r.denom ? `<span class="hint">${r.denom === 'error' ? T('error', 'error') : r.denom === 'quasi' ? T('cuasi-F', 'quasi-F') : name(r.denom)}${r.denom === 'quasi' ? ` (${fmtNum(r.dfDen, 1)} ${T('gl', 'df')})` : ''}</span>` : '') },
      { label: 'p', num: true, get: r => (isFinite(r.p) ? sig(r.p) : '') },
    ], shown);
    el('b6AnovaNote').innerHTML = T(
      `Los cuadrados medios esperados no vienen de una tabla: el coeficiente de cada efecto aleatorio es la traza tr(A<sub>t</sub>Z<sub>k</sub>Z<sub>k</sub>′)/gl<sub>t</sub> del análisis, así que valen también con celdas faltantes. Cada fuente se prueba contra el cuadrado medio cuya esperanza difiere solo en el término probado${res.rows.some(r => r.denom === 'quasi') ? '; cuando no existe, se usa una combinación con grados de libertad de Satterthwaite' : ''}.`,
      `The expected mean squares do not come from a table: the coefficient of every random effect is the trace tr(A<sub>t</sub>Z<sub>k</sub>Z<sub>k</sub>′)/df<sub>t</sub> of this analysis, so they hold with missing cells too. Every source is tested against the mean square whose expectation differs only by the term being tested${res.rows.some(r => r.denom === 'quasi') ? '; when there is none, a combination with Satterthwaite degrees of freedom is used' : ''}.`);
    mountFig('b6FigContrib', {
      title: () => T('Aporte de cada fuente', 'Contribution of every source') + ' · ' + state.data.ds.traits[B6.trait].name,
      fileName: 'contribution',
      render: c => P6.contribution(c, res.contribution, { names: S1 }),
      controls: () => [P2.titleControl(), { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 620, height: 420, flip: true });
  }
  const SHORT = {
    male: { es: 'm', en: 'm' }, female: { es: 'h', en: 'f' }, maleFemale: { es: 'mh', en: 'mf' },
    line: { es: 'l', en: 'l' }, tester: { es: 'p', en: 't' }, lineTester: { es: 'lp', en: 'lt' },
    plant: { es: 'i', en: 'i' }, plantTester: { es: 'ip', en: 'it' },
    plantAdd: { es: 'i·dom', en: 'i·dom' }, plantEpi: { es: 'i·epi', en: 'i·epi' },
    gca: { es: 'ACG', en: 'GCA' }, sca: { es: 'ACE', en: 'SCA' },
    maleEnv: { es: 'mA', en: 'mE' }, femaleEnv: { es: 'hA', en: 'fE' }, maleFemaleEnv: { es: 'mhA', en: 'mfE' },
    lineEnv: { es: 'lA', en: 'lE' }, testerEnv: { es: 'pA', en: 'tE' }, lineTesterEnv: { es: 'lpA', en: 'ltE' },
    gcaEnv: { es: 'ACG·A', en: 'GCA·E' }, scaEnv: { es: 'ACE·A', en: 'SCA·E' }, plantEnv: { es: 'iA', en: 'iE' },
  };

  /* ================= 3 · effects ================= */
  function renderEffects() {
    const res = B6.res, design = res.design;
    const label = state.data.ds.traits[B6.trait].name;
    const box = el('b6EffBox');
    if (design === 'nc3' || design === 'ttc') {
      box.style.display = 'none';
      el('b6EffPlants').style.display = '';
      const rows = res.sd.plants.slice().sort((a, b) => b.sum - a.sum);
      table('b6PlantTable', [
        { label: T('Individuo', 'Individual'), get: r => esc(r.plant) },
        { label: T('Conjunto', 'Set'), get: r => esc(r.set || '') },
      ].concat(res.sd.testers.map(t => ({ label: esc(t), num: true, get: r => fmtNum(r[t], 3) })))
        .concat([
          { label: T('Suma', 'Sum'), num: true, get: r => fmtNum(r.sum, 3) },
          { label: T('Diferencia', 'Difference'), num: true, get: r => fmtNum(r.diff, 3) },
        ], res.sd.testers.length > 2 ? [{ label: T('L₁+L₂−2L₃', 'L₁+L₂−2L₃'), num: true, get: r => fmtNum(r.epi, 3) }] : []),
        rows, 40);
      return;
    }
    box.style.display = '';
    el('b6EffPlants').style.display = 'none';
    if (design === 'partial') {
      const G = res.griffing && res.griffing.main;
      if (!G) { el('b6RowTable').innerHTML = ''; return; }
      const gca = G.effects.gca.map((g, i) => ({ name: res.built ? state.data.mating.parents[i] : String(i), est: g.est, se: g.se, t: g.t, p: g.p }));
      table('b6RowTable', [
        { label: T('Progenitor', 'Parent'), get: r => esc(r.name) },
        { label: T('ACG', 'GCA'), num: true, get: r => fmtNum(r.est, 4) },
        { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
        { label: 't', num: true, get: r => f2(r.t) },
        { label: 'p', num: true, get: r => sig(r.p) },
      ], gca);
      el('b6RowTitle').innerHTML = T('Aptitud combinatoria general', 'General combining ability');
      el('b6ColBox').style.display = 'none';
      const scaRows = G.effects.sca.map(s => ({ i: s.i, j: s.j, est: s.est, se: s.se, p: s.p, name: state.data.mating.parents[s.i] + ' × ' + state.data.mating.parents[s.j] }));
      table('b6CellTable', [
        { label: T('Cruza', 'Cross'), get: r => esc(r.name) },
        { label: T('ACE', 'SCA'), num: true, get: r => fmtNum(r.est, 4) },
        { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
        { label: 'p', num: true, get: r => sig(r.p) },
      ], scaRows.slice().sort((a, b) => Math.abs(b.est) - Math.abs(a.est)), 30);
      mountFig('b6FigGca', {
        title: () => T('Aptitud combinatoria general', 'General combining ability') + ' · ' + label, fileName: 'gca',
        render: c => P4.effects(c, gca, { tcrit: S.qt(1 - B6.alpha / 2, res.dfe), label }),
        controls: () => [P2.titleControl(), { key: 'order', label: T('Orden', 'Order'), type: 'select', options: [['effect', T('por efecto', 'by effect')], ['name', T('por nombre', 'by name')]] }, { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
      }, { width: 620, height: 440 });
      el('b6FigSca').innerHTML = '';
      return;
    }
    /* factorial designs and the hierarchical one: one group per set */
    const isNc1 = design === 'nc1';
    const rowsAll = [], colsAll = [], cellsAll = [];
    res.cells.sets.forEach((g, k) => {
      const eff = res.effects[k];
      if (!eff) return;
      if (isNc1) {
        eff.males.forEach(m => rowsAll.push({ set: g.set, name: g.rows[m.i], est: m.est, se: m.se, t: m.t, p: m.p }));
        eff.females.forEach(fm => {
          const cell = g.cells[fm.k];
          /* the female code carries its male inside it when the codes repeat: show only its own part */
          const own = String(cell.colName).split('/').pop();
          cellsAll.push({ set: g.set, i: fm.male, j: 0, male: cell.rowName, name: own, est: fm.est, se: fm.se, t: fm.t, p: fm.p });
        });
      } else {
        eff.rows.forEach(m => rowsAll.push({ set: g.set, name: g.rows[m.i], est: m.est, se: m.se, t: m.t, p: m.p }));
        eff.cols.forEach(m => colsAll.push({ set: g.set, name: g.cols[m.j], est: m.est, se: m.se, t: m.t, p: m.p }));
        eff.cells.forEach(c => cellsAll.push({ set: g.set, i: c.i, j: c.j, name: g.rows[c.i] + ' × ' + g.cols[c.j], est: c.est, se: c.se, t: c.t, p: c.p }));
      }
    });
    const withSet = res.cells.sets.length > 1;
    const nameCols = (lab, list) => [{ label: lab, get: r => esc(r.name) }].concat(withSet ? [{ label: T('Conjunto', 'Set'), get: r => esc(r.set) }] : []).concat([
      { label: T('Efecto', 'Effect'), num: true, get: r => fmtNum(r.est, 4) },
      { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
      { label: 't', num: true, get: r => f2(r.t) },
      { label: 'p', num: true, get: r => sig(r.p) },
    ]);
    const rowLabel = design === 'lxt' ? T('Línea', 'Line') : T('Macho', 'Male');
    const colLabel = design === 'lxt' ? T('Probador', 'Tester') : T('Hembra', 'Female');
    el('b6RowTitle').innerHTML = design === 'lxt' ? T('ACG de las líneas', 'GCA of the lines') : T('Efectos de los machos (ACG)', 'Effects of the males (GCA)');
    table('b6RowTable', nameCols(rowLabel, rowsAll), rowsAll, 40);
    el('b6ColBox').style.display = isNc1 ? 'none' : '';
    if (!isNc1) {
      el('b6ColTitle').innerHTML = design === 'lxt' ? T('ACG de los probadores', 'GCA of the testers') : T('Efectos de las hembras (ACG)', 'Effects of the females (GCA)');
      table('b6ColTable', nameCols(colLabel, colsAll), colsAll, 40);
    }
    el('b6CellTitle').innerHTML = isNc1 ? T('Efectos de las hembras dentro de cada macho', 'Effects of the females within every male')
      : design === 'lxt' ? T('ACE de cada cruza', 'SCA of every cross') : T('Efectos de la interacción (ACE)', 'Interaction effects (SCA)');
    const cellCols = isNc1
      ? [{ label: rowLabel, get: r => esc(r.male) }, { label: colLabel, get: r => esc(r.name) }].concat(nameCols(T('Cruza', 'Cross'), cellsAll).slice(1))
      : nameCols(T('Cruza', 'Cross'), cellsAll);
    table('b6CellTable', cellCols, cellsAll.slice().sort((a, b) => (isNc1 ? LM.natCmp(a.male + a.name, b.male + b.name) : Math.abs(b.est) - Math.abs(a.est))), 30);
    mountFig('b6FigGca', {
      title: () => (design === 'lxt' ? T('ACG de líneas y probadores', 'GCA of lines and testers') : T('Efectos de machos y hembras', 'Effects of males and females')) + ' · ' + label,
      fileName: 'gca',
      render: c => P4.effects(c, rowsAll.concat(isNc1 ? [] : colsAll).map(x => ({ name: (withSet ? x.set + '·' : '') + x.name, est: x.est, se: x.se })), { tcrit: S.qt(1 - B6.alpha / 2, res.dfe), label }),
      controls: () => [P2.titleControl(), { key: 'order', label: T('Orden', 'Order'), type: 'select', options: [['effect', T('por efecto', 'by effect')], ['name', T('por nombre', 'by name')]] }, { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 900, height: 460, flip: true });
    if (!isNc1) {
      const g0 = res.cells.sets[0], eff0 = res.effects[0];
      mountFig('b6FigSca', {
        title: () => (design === 'lxt' ? T('ACE de cada cruza', 'SCA of every cross') : T('Efectos de la interacción', 'Interaction effects')) + ' · ' + label + (withSet ? ' · ' + g0.set : ''),
        fileName: 'sca',
        render: c => P6.grid(c, { rows: g0.rows, cols: g0.cols, cells: eff0.cells, label, rowTitle: rowLabel, colTitle: colLabel }),
        controls: () => [P2.titleControl(), { key: 'showValues', label: T('Escribir los valores', 'Write the values'), type: 'checkbox' }, P2.colormapControl ? P2.colormapControl() : P2.paletteControl()],
      /* cells are at most 64 px: the figure is sized to the grid so no blank band is left around it */
      }, { width: Math.max(480, Math.min(1080, 250 + g0.cols.length * 64)), height: Math.max(340, Math.min(1080, 170 + g0.rows.length * 64)), showValues: true, colormap: 'rdbu' });
    } else el('b6FigSca').innerHTML = '';
  }

  /* ================= 4 · components and genetic parameters ================= */
  function renderComponents() {
    const res = B6.res, S1 = sources(res.design), G = res.genetic;
    if (!res.components) { el('b6CompTable').innerHTML = ''; return; }
    const comps = res.components.filter(c => c.key !== 'error');
    const rowOf = k => res.rows.find(r => r.source === k);
    table('b6CompTable', [
      { label: T('Componente', 'Component'), get: r => `σ²<sub>${T(SHORT[r.key] || { es: r.key, en: r.key })}</sub> · <span class="hint">${T(S1[r.key] || { es: r.key, en: r.key })}</span>` },
      { label: T('Estimación', 'Estimate'), num: true, get: r => fmtNum(r.value, 4) },
      { label: T('EE', 'SE'), num: true, get: r => fmtNum(r.se, 4) },
      { label: T('% del total', '% of the total'), num: true, get: r => { const tot = res.components.reduce((s, c) => s + Math.max(0, c.value), 0); return tot > 0 && r.value > 0 ? fmtNum(100 * r.value / tot, 1) : '0'; } },
      { label: T('Prueba F de su fuente', 'F test of its source'), num: true, get: r => { const q = rowOf(r.key); return q && isFinite(q.p) ? sig(q.p) : ''; } },
    ], comps.concat([{ key: 'error', value: res.mse, se: res.mse * Math.sqrt(2 / Math.max(1, res.dfe)) }]));
    el('b6CompNote').innerHTML = T(
      'Los errores estándar son asintóticos: Var(Σc<sub>i</sub>M<sub>i</sub>) = Σc<sub>i</sub>²·2M<sub>i</sub>²/gl<sub>i</sub>. La prueba de que un componente vale cero es la F de su fuente en el análisis de varianza, no el cociente entre la estimación y su error estándar.',
      'The standard errors are asymptotic: Var(Σc<sub>i</sub>M<sub>i</sub>) = Σc<sub>i</sub>²·2M<sub>i</sub>²/df<sub>i</sub>. The test of a component being zero is the F test of its source in the analysis of variance, not the ratio of the estimate to its standard error.');
    const rows = [];
    const add = (es, en, def, value, se, reading) => rows.push({ es, en, def, value, se, reading });
    if (res.sd) {
      const sd = res.sd;
      add('σ²A (base F₂)', 'σ²A (F₂ basis)', 'Var(L₁ + L₂) − 2CM<sub>e</sub>/r', sd.s2A, sd.seA, T('varianza aditiva', 'additive variance'));
      add('σ²D (base F₂)', 'σ²D (F₂ basis)', '½[Var(L₁ − L₂) − 2CM<sub>e</sub>/r]', sd.s2D, sd.seD, T('varianza de dominancia', 'dominance variance'));
      add('D = Σa²', 'D = Σa²', '2σ²A', sd.D, 2 * sd.seA, T('componente aditivo de Mather', "Mather's additive component"));
      add('H = Σd²', 'H = Σd²', '4σ²D', sd.H, 4 * sd.seD, T('componente de dominancia de Mather', "Mather's dominance component"));
      add('Grado medio de dominancia', 'Average degree of dominance', '√(H/D)', sd.dominance, NaN, sd.dominance > 1 ? T('sobredominancia media', 'average overdominance') : sd.dominance > 0 ? T('dominancia parcial', 'partial dominance') : '');
      add('F = Σa·d', 'F = Σa·d', T('−2 Cov(suma, diferencia)', '−2 Cov(sum, difference)'), sd.Fcomp, NaN,
        !isFinite(sd.pCor) || sd.pCor >= 0.05 ? T('sin dirección definida', 'no defined direction')
          : sd.corSD < 0 ? T(`dominancia hacia ${sd.testers[0]}`, `dominance towards ${sd.testers[0]}`) : T(`dominancia hacia ${sd.testers[1]}`, `dominance towards ${sd.testers[1]}`));
    } else if (G) {
      add('Cov(medios hermanos)', 'Cov(half sibs)', '(1+F)σ²A/4', G.covHS, G.seHS, '');
      add('Cov(hermanos completos)', 'Cov(full sibs)', '(1+F)σ²A/2 + ((1+F)/2)²σ²D', G.covFS, G.seFS, '');
      add('σ²A', 'σ²A', '4·Cov(MH)/(1+F)', G.s2A, G.seA, T('varianza aditiva', 'additive variance'));
      add('σ²D', 'σ²D', res.design === 'nc1' ? '4(σ²<sub>h</sub> − σ²<sub>m</sub>)/(1+F)²' : '4σ²<sub>' + (res.design === 'lxt' || res.design === 'partial' ? T('ACE', 'SCA') : T('mh', 'mf')) + '</sub>/(1+F)²', G.s2D, G.seD, T('varianza de dominancia', 'dominance variance'));
      add('Grado medio de dominancia', 'Average degree of dominance', '√(2σ²D/σ²A)', G.dominance, NaN, G.dominance > 1 ? T('sobredominancia media', 'average overdominance') : G.dominance >= 0 ? T('dominancia parcial', 'partial dominance') : '');
      if (isFinite(G.baker)) add('Razón de Baker', "Baker's ratio", '2σ²ACG/(2σ²ACG + σ²ACE)', G.baker, NaN, G.baker > 0.5 ? T('predominan los efectos aditivos', 'additive effects predominate') : T('predomina la dominancia', 'dominance predominates'));
      if (isFinite(G.s2AE)) add('σ²A × ambientes', 'σ²A × environments', '4σ²(ACG×A)/(1+F)', G.s2AE, NaN, '');
      if (isFinite(G.s2DE)) add('σ²D × ambientes', 'σ²D × environments', '4σ²(ACE×A)/(1+F)²', G.s2DE, NaN, '');
    }
    if (G) {
      add('h² en sentido estrecho', 'Narrow-sense h²', 'σ²A/σ²F (base de parcela)', G.h2ns, NaN, '');
      add('H² en sentido amplio', 'Broad-sense H²', '(σ²A + σ²D)/σ²F', G.h2bs, NaN, '');
      if (isFinite(G.h2nsPlant)) add('h² en base de planta', 'h² on a plant basis', 'σ²A/(σ²A + σ²D + σ²e + σ²w)', G.h2nsPlant, NaN, '');
      if (isFinite(G.h2nsMean)) add('h² en base de media de familia', 'h² on a family-mean basis', 'σ²A/(σ²A + σ²D + CM<sub>e</sub>/re)', G.h2nsMean, NaN, '');
    }
    table('b6ParamTable', [
      { label: T('Parámetro', 'Parameter'), get: r => T(r.es, r.en) },
      { label: T('Definición', 'Definition'), get: r => `<span class="hint">${r.def}</span>` },
      { label: T('Valor', 'Value'), num: true, get: r => fmtNum(r.value, 4) },
      { label: T('EE', 'SE'), num: true, get: r => (isFinite(r.se) ? fmtNum(r.se, 4) : '') },
      { label: T('Lectura', 'Reading'), get: r => `<span class="hint">${r.reading || ''}</span>` },
    ], rows);
    const notes = [];
    if (G && G.negative) notes.push({ level: 'warning', es: 'Hay componentes negativos. Una σ²D negativa se toma como cero en el denominador de h² en sentido estrecho, y no se calculan con ella el grado de dominancia ni H²; con σ²A negativa no se calcula ninguna heredabilidad. Un componente negativo suele indicar que la varianza verdadera es cercana a cero o que faltan repeticiones.', en: 'Some components are negative. A negative σ²D is taken as zero in the denominator of narrow-sense h², and neither the degree of dominance nor H² is computed from it; with a negative σ²A no heritability is computed. A negative component usually means the true variance is near zero or that there is too little replication.' });
    (G && G.notes ? G.notes : []).forEach(x => notes.push(x));
    if (res.design === 'nc2' && isFinite(G.sigma2mFromMales)) notes.push({ level: 'info', es: `σ²A de los machos ${fmtNum(G.sigma2mFromMales, 3)} y de las hembras ${fmtNum(G.sigma2mFromFemales, 3)}: si difieren mucho hay efectos maternos o muestras distintas.`, en: `σ²A from males ${fmtNum(G.sigma2mFromMales, 3)} and from females ${fmtNum(G.sigma2mFromFemales, 3)}: a large difference means maternal effects or different samples.` });
    msg('b6CompMsg', notes);
    mountFig('b6FigComp', {
      title: () => T('Componentes de varianza', 'Variance components') + ' · ' + state.data.ds.traits[B6.trait].name,
      fileName: 'components',
      render: c => P4.components(c, comps.map(x => ({ key: x.key, es: T(S1[x.key] || { es: x.key, en: x.key }), en: T(S1[x.key] || { es: x.key, en: x.key }), value: x.value, se: x.se })), { label: T('varianza', 'variance') }),
      controls: () => [P2.titleControl(), { key: 'flip', label: T('Barras horizontales', 'Horizontal bars'), type: 'checkbox' }, P2.paletteControl()],
    }, { width: 620, height: 440, flip: true });
  }

  /* ================= 5 · what each design adds ================= */
  function renderSpecial() {
    const res = B6.res, design = res.design, label = state.data.ds.traits[B6.trait].name;
    const sdBox = el('b6SdBox'), hetBox = el('b6HetBox');
    const isSD = design === 'nc3' || design === 'ttc';
    sdBox.style.display = isSD ? '' : 'none';
    hetBox.style.display = res.heterosis && res.heterosis.length ? '' : 'none';
    el('b6Special').style.display = isSD || (res.heterosis && res.heterosis.length) ? '' : 'none';
    el('b6SpecialTitle').innerHTML = isSD
      ? T('5 · Sumas, diferencias y epistasis', '5 · Sums, differences and epistasis')
      : T('5 · Heterosis de cada cruza', '5 · Heterosis of every cross');
    if (isSD) {
      const sd = res.sd;
      const rows = [
        [T('Varianza de las sumas', 'Variance of the sums'), sd.varSum, `${sd.dfPlants} ${T('gl', 'df')}`, T('σ²A + 2CM/r', 'σ²A + 2MS/r')],
        [T('Varianza de las diferencias', 'Variance of the differences'), sd.varDiff, `${sd.dfPlants} ${T('gl', 'df')}`, T('2σ²D + 2CM/r', '2σ²D + 2MS/r')],
        [T('Error de un par (2CM/r)', 'Error of a pair (2MS/r)'), 2 * sd.mse / sd.r, `${sd.dfe} ${T('gl', 'df')}`, T('se resta de las dos varianzas', 'subtracted from both variances')],
        [T('Media de las diferencias', 'Mean of the differences'), sd.meanDiff, `t = ${f2(sd.tMeanDiff)} · ${pEq(sd.pMeanDiff)}`, T('diferencia aditiva entre los dos probadores', 'additive difference between the two testers')],
        [T('Correlación suma–diferencia', 'Sum–difference correlation'), sd.corSD, `${pEq(sd.pCor)}`,
          !isFinite(sd.pCor) || sd.pCor >= 0.05 ? T('sin dirección definida de la dominancia', 'no defined direction of dominance')
            : sd.corSD < 0 ? T(`dominancia hacia ${sd.testers[0]}`, `dominance towards ${sd.testers[0]}`) : T(`dominancia hacia ${sd.testers[1]}`, `dominance towards ${sd.testers[1]}`)],
      ];
      table('b6SdTable', [
        { label: T('Cantidad', 'Quantity'), get: r => r[0] },
        { label: T('Valor', 'Value'), num: true, get: r => fmtNum(r[1], 4) },
        { label: T('Prueba', 'Test'), get: r => `<span class="hint">${r[2]}</span>` },
        { label: T('Qué mide', 'What it measures'), get: r => `<span class="hint">${r[3]}</span>` },
      ], rows);
      mountFig('b6FigSD', {
        title: () => T('Sumas y diferencias', 'Sums and differences') + ' · ' + label, fileName: 'sums_differences',
        render: c => P6.sumsDiff(c, res.sd, { label }),
        controls: () => [P2.titleControl(), { key: 'showFit', label: T('Recta ajustada', 'Fitted line'), type: 'checkbox' }, { key: 'labels', label: T('Etiquetas', 'Labels'), type: 'select', options: [['0', '0'], ['6', '6'], ['12', '12']] }, P2.paletteControl()],
      }, { width: 900, height: 520, showFit: true });
      const epi = res.sd.epistasis;
      el('b6EpiBox').style.display = epi ? '' : 'none';
      if (epi) {
        table('b6EpiTable', [
          { label: T('Fuente', 'Source'), get: r => r[0] },
          { label: T('gl', 'df'), num: true, get: r => r[1] },
          { label: T('Suma de cuadrados', 'Sum of squares'), num: true, get: r => fmtNum(r[2], 4) },
          { label: T('Cuadrado medio', 'Mean square'), num: true, get: r => fmtNum(r[3], 4) },
          { label: 'F', num: true, get: r => f2(r[4]) },
          { label: 'p', num: true, get: r => sig(r[5]) },
        ], [
          [T('Epistasis total', 'Total epistasis'), epi.total.df, epi.total.ss, epi.total.ms, epi.total.F, epi.total.p],
          [T('· global (i)', '· overall (i)'), epi.overall.df, epi.overall.ss, epi.overall.ms, epi.overall.F, epi.overall.p],
          [T('· entre individuos (j y l)', '· among individuals (j and l)'), epi.among.df, epi.among.ss, epi.among.ms, epi.among.F, epi.among.p],
        ]);
        el('b6EpiNote').innerHTML = T(
          `El contraste L₁ + L₂ − 2L₃ de cada individuo vale cero sin epistasis. Media = ${fmtNum(epi.mean, 4)} ± ${fmtNum(epi.seMean, 4)} (t = ${f2(epi.tOverall)}, ${pEq(epi.pOverall)}): ${epi.pOverall < 0.05 ? 'hay epistasis global' : 'no se detecta epistasis global'}; entre individuos ${pEq(epi.among.p)}: ${epi.among.p < 0.05 ? 'la epistasis cambia entre individuos (tipos j y l)' : 'no cambia entre individuos'}. Con epistasis, σ²A y σ²D quedan sesgados.`,
          `The contrast L₁ + L₂ − 2L₃ of every individual is zero without epistasis. Mean = ${fmtNum(epi.mean, 4)} ± ${fmtNum(epi.seMean, 4)} (t = ${f2(epi.tOverall)}, ${pEq(epi.pOverall)}): ${epi.pOverall < 0.05 ? 'there is overall epistasis' : 'no overall epistasis is detected'}; among individuals ${pEq(epi.among.p)}: ${epi.among.p < 0.05 ? 'epistasis differs between individuals (types j and l)' : 'it does not differ between individuals'}. With epistasis, σ²A and σ²D are biased.`);
        mountFig('b6FigEpi', {
          title: () => T('Epistasis de cada individuo', 'Epistasis of every individual') + ' · ' + label, fileName: 'epistasis',
          render: c => P6.epistasis(c, res.sd, { label, tcrit: S.qt(1 - B6.alpha / 2, res.dfe) }),
          controls: () => [P2.titleControl(), { key: 'order', label: T('Orden', 'Order'), type: 'select', options: [['effect', T('por valor', 'by value')], ['name', T('por nombre', 'by name')]] }, P2.paletteControl()],
        }, { width: 900, height: 480 });
      }
    }
    if (res.heterosis && res.heterosis.length) {
      const goalBest = (a, b) => (B6.goal === 'low' ? a - b : b - a);
      const rows = res.heterosis.slice().sort((a, b) => goalBest(a.mph, b.mph));
      table('b6HetTable', [
        { label: T('Cruza', 'Cross'), get: r => esc(r.row + ' × ' + r.col) },
        { label: T('Media', 'Mean'), num: true, get: r => fmtNum(r.mean, 3) },
        { label: T('Media de progenitores', 'Mid-parent'), num: true, get: r => fmtNum(r.midParent, 3) },
        { label: T('Heterosis', 'Heterosis'), num: true, get: r => fmtNum(r.mph, 3) },
        { label: '%', num: true, get: r => fmtNum(r.mphPct, 1) },
        { label: 'p', num: true, get: r => sig(r.pMph) },
        { label: T('Sobre el mejor progenitor', 'Over the better parent'), num: true, get: r => fmtNum(r.bph, 3) },
        { label: '%', num: true, get: r => fmtNum(r.bphPct, 1) },
        { label: 'p', num: true, get: r => sig(r.pBph) },
      ], rows, 30);
      mountFig('b6FigHet', {
        title: () => (B6.hetKind === 'bph' ? T('Heterosis respecto al mejor progenitor', 'Better-parent heterosis') : T('Heterosis respecto a la media de los progenitores', 'Mid-parent heterosis')) + ' · ' + label,
        fileName: 'heterosis',
        render: c => P5.heterosis(c, res.heterosis, { nameOf: h => h.name }),
        controls: () => [P2.titleControl(), { key: 'maxCrosses', label: T('Máximo de cruzas', 'Maximum crosses'), type: 'number', min: 10, max: 200, step: 5 }, P2.paletteControl()],
      }, { width: 900, height: Math.max(420, 150 + Math.min(res.heterosis.length, 40) * 17), kind: B6.hetKind, maxCrosses: 40 });
    }
  }

  /* ================= 6 · notes, formulas and citations ================= */
  function renderNotes() {
    const host = el('b6Notes');
    if (!host) return;
    const design = state.data && state.data.mating ? state.data.mating.design : null;
    const notes = [
      {
        es: ['Carolina del Norte I (Comstock y Robinson 1948)', 'Cada macho se cruza con hembras propias: machos y hembras dentro de machos. σ²machos = Cov(medios hermanos) = (1+F)σ²A/4 y σ²hembras = Cov(hermanos completos) − Cov(medios hermanos), de donde σ²A = 4σ²machos/(1+F) y σ²D = 4(σ²hembras − σ²machos)/(1+F)². El componente de hembras lleva dentro los efectos maternos.'],
        en: ['North Carolina I (Comstock & Robinson 1948)', 'Every male is crossed to its own females: males, and females within males. σ²males = Cov(half sibs) = (1+F)σ²A/4 and σ²females = Cov(full sibs) − Cov(half sibs), so σ²A = 4σ²males/(1+F) and σ²D = 4(σ²females − σ²males)/(1+F)². The female component carries maternal effects inside it.'],
      },
      {
        es: ['Carolina del Norte II (Comstock y Robinson 1948)', 'Factorial de machos × hembras: σ²machos y σ²hembras estiman la misma Cov(medios hermanos) y su interacción, ¼(1+F)²σ²D. Se promedian las dos estimaciones de Cov(MH) y se comparan: si difieren mucho, hay efectos maternos.'],
        en: ['North Carolina II (Comstock & Robinson 1948)', 'A factorial of males × females: σ²males and σ²females both estimate Cov(half sibs) and their interaction estimates ¼(1+F)²σ²D. The two estimates of Cov(HS) are averaged and compared: a large difference means maternal effects.'],
      },
      {
        es: ['Carolina del Norte III (Comstock y Robinson 1952) y cruza triple de prueba (Kearsey y Jinks 1968)', 'Cada individuo se cruza con los dos progenitores homocigóticos (y con su F₁ en la cruza triple). La varianza de las sumas L₁ + L₂ estima σ²A y la de las diferencias L₁ − L₂ estima 2σ²D, las dos corregidas por 2CM<sub>error</sub>/r (un locus da sumas a+d, d, d−a y diferencias a−d, a, a+d con frecuencias ¼, ½, ¼); D = 2σ²A y H = 4σ²D. El contraste L₁ + L₂ − 2L₃ prueba la epistasis, global (1 gl) y entre individuos (n − 1 gl).'],
        en: ['North Carolina III (Comstock & Robinson 1952) and the triple test cross (Kearsey & Jinks 1968)', 'Every individual is crossed to both homozygous parents (and to their F₁ in the triple test cross). The variance of the sums L₁ + L₂ estimates σ²A and that of the differences L₁ − L₂ estimates 2σ²D, both corrected by 2MS<sub>error</sub>/r (one locus gives sums a+d, d, d−a and differences a−d, a, a+d with frequencies ¼, ½, ¼); D = 2σ²A and H = 4σ²D. The contrast L₁ + L₂ − 2L₃ tests epistasis, overall (1 df) and among individuals (n − 1 df).'],
      },
      {
        es: ['Línea × probador (Kempthorne 1957)', 'Las entradas se parten en progenitores, cruzas y el contraste entre los dos grupos, y las cruzas en líneas, probadores y su interacción. σ²ACG es el promedio de las varianzas de líneas y probadores; σ²A = 4σ²ACG/(1+F) y σ²D = 4σ²ACE/(1+F)². Con progenitores endogámicos (F = 1) eso da σ²A = 2σ²ACG y σ²D = σ²ACE.'],
        en: ['Line × tester (Kempthorne 1957)', 'The entries split into parents, crosses and the contrast between the two groups, and the crosses into lines, testers and their interaction. σ²GCA is the average of the line and tester variances; σ²A = 4σ²GCA/(1+F) and σ²D = 4σ²SCA/(1+F)². With inbred parents (F = 1) this gives σ²A = 2σ²GCA and σ²D = σ²SCA.'],
      },
      {
        es: ['Dialelo parcial (Kempthorne y Curnow 1961)', 'Se ajusta y<sub>ij</sub> = μ + g<sub>i</sub> + g<sub>j</sub> + s<sub>ij</sub> por mínimos cuadrados sobre las cruzas que se hicieron, con Σĝ = 0 y Σ<sub>j</sub>ŝ<sub>ij</sub> = 0, así que sirve para el arreglo circulante y para cualquier conjunto incompleto de cruzas. Los coeficientes de los cuadrados medios esperados se calculan por trazas para ese conjunto exacto.'],
        en: ['Partial diallel (Kempthorne & Curnow 1961)', 'y<sub>ij</sub> = μ + g<sub>i</sub> + g<sub>j</sub> + s<sub>ij</sub> is fitted by least squares on the crosses that were made, with Σĝ = 0 and Σ<sub>j</sub>ŝ<sub>ij</sub> = 0, so it serves the circulant arrangement and any incomplete set of crosses. The coefficients of the expected mean squares are computed by traces for that exact set.'],
      },
      {
        es: ['Errores estándar de los efectos', 'Cada efecto se estima por mínimos cuadrados con las restricciones del modelo (Σĝ = 0 y Σ<sub>j</sub>ŝ<sub>ij</sub> = 0), así que su varianza es la del contraste completo: Var(ĝ<sub>i</sub>) = σ²(1/rt − 1/rlt) para una línea, no σ²/rt. Varios libros imprimen √(CM<sub>e</sub>/rt), que omite el término −1/l y sale un poco más grande.'],
        en: ['Standard errors of the effects', 'Every effect is estimated by least squares under the restrictions of the model (Σĝ = 0 and Σ<sub>j</sub>ŝ<sub>ij</sub> = 0), so its variance is that of the whole contrast: Var(ĝ<sub>i</sub>) = σ²(1/rt − 1/rlt) for a line, not σ²/rt. Several books print √(MS<sub>e</sub>/rt), which omits the −1/l term and comes out slightly larger.'],
      },
      {
        es: ['Errores estándar de los componentes', 'Cada componente es una combinación lineal de cuadrados medios, así que su error estándar es Var(Σc<sub>i</sub>M<sub>i</sub>) = Σc<sub>i</sub>²·2M<sub>i</sub>²/gl<sub>i</sub>. Son errores asintóticos: con pocos grados de libertad, los intervalos de confianza son aproximados.'],
        en: ['Standard errors of the components', 'Every component is a linear combination of mean squares, so its standard error is Var(Σc<sub>i</sub>M<sub>i</sub>) = Σc<sub>i</sub>²·2M<sub>i</sub>²/df<sub>i</sub>. These are asymptotic errors: with few degrees of freedom the confidence intervals are approximate.'],
      },
    ];
    const cites = [
      'Comstock RE, Robinson HF (1948). The components of genetic variance in populations of biparental progenies and their use in estimating the average degree of dominance. Biometrics 4(4): 254–266.',
      'Comstock RE, Robinson HF (1952). Estimation of average dominance of genes. In: Gowen JW (ed.) Heterosis. Iowa State College Press, Ames, pp. 494–516.',
      'Kempthorne O (1957). An Introduction to Genetic Statistics. John Wiley & Sons, New York.',
      'Kempthorne O, Curnow RN (1961). The partial diallel cross. Biometrics 17(2): 229–250.',
      'Kearsey MJ, Jinks JL (1968). A general method of detecting additive, dominance and epistatic variation for metrical traits. I. Theory. Heredity 23: 403–409.',
      'Kearsey MJ, Pooni HS (1996). The Genetical Analysis of Quantitative Traits. Chapman & Hall, London.',
      'Hallauer AR, Carena MJ, Miranda Filho JB (2010). Quantitative Genetics in Maize Breeding. 3rd ed. Springer, New York.',
    ];
    host.innerHTML = notes.map(n => `<div class="method-note"><h4>${T(n.es[0], n.en[0])}</h4><p>${T(n.es[1], n.en[1])}</p></div>`).join('')
      + `<div class="method-note"><h4>${T('Referencias', 'References')}</h4><ul class="ref-list">${cites.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  /* ================= downloads ================= */
  function sheetRows() {
    const res = B6.res, S1 = sources(res.design);
    const rows = [[T('Fuente de variación', 'Source of variation'), T('gl', 'df'), T('Suma de cuadrados', 'Sum of squares'), T('Cuadrado medio', 'Mean square'), 'F', 'p']];
    res.rows.forEach(r => rows.push([T(S1[r.source] || { es: r.source, en: r.source }), r.df, r.ss, r.ms, r.F, r.p]));
    rows.push([T('Error', 'Error'), res.dfe, res.mse * res.dfe, res.mse, '', '']);
    return rows;
  }
  function downloadXlsx() {
    const res = B6.res, S1 = sources(res.design);
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 28));
    add(T('ANOVA', 'ANOVA'), sheetRows());
    if (res.components) add(T('Componentes', 'Components'), [[T('Componente', 'Component'), T('Estimación', 'Estimate'), T('EE', 'SE')]].concat(res.components.map(c => [T(S1[c.key] || { es: c.key, en: c.key }), c.value, c.se])));
    if (res.genetic) {
      const G = res.genetic;
      add(T('Parámetros', 'Parameters'), [[T('Parámetro', 'Parameter'), T('Valor', 'Value')]].concat([
        ['Cov(HS)', G.covHS], ['Cov(FS)', G.covFS], ['sigma2A', G.s2A], ['sigma2D', G.s2D],
        [T('grado de dominancia', 'degree of dominance'), G.dominance], ['h2ns', G.h2ns], ['H2bs', G.h2bs],
      ]));
    }
    if (res.sd) {
      add(T('Sumas y diferencias', 'Sums and differences'), [[T('Individuo', 'Individual'), T('Conjunto', 'Set')].concat(res.sd.testers, [T('Suma', 'Sum'), T('Diferencia', 'Difference'), 'L1+L2-2L3'])]
        .concat(res.sd.plants.map(p => [p.plant, p.set].concat(res.sd.testers.map(t => p[t]), [p.sum, p.diff, p.epi == null ? '' : p.epi]))));
    }
    if (res.effects && res.cells) {
      const rows = [[T('Conjunto', 'Set'), T('Efecto', 'Effect'), T('Nombre', 'Name'), T('Estimación', 'Estimate'), T('EE', 'SE')]];
      res.cells.sets.forEach((g, k) => {
        const eff = res.effects[k];
        if (!eff) return;
        (eff.rows || eff.males || []).forEach(m => rows.push([g.set, T('fila', 'row'), g.rows[m.i], m.est, m.se]));
        (eff.cols || []).forEach(m => rows.push([g.set, T('columna', 'column'), g.cols[m.j], m.est, m.se]));
        (eff.cells || eff.females || []).forEach(c => rows.push([g.set, T('cruza', 'cross'), c.name || (g.rows[c.i] + ' × ' + g.cols[c.j]), c.est, c.se]));
      });
      add(T('Efectos', 'Effects'), rows);
    }
    if (res.heterosis) add(T('Heterosis', 'Heterosis'), [[T('Cruza', 'Cross'), T('Media', 'Mean'), T('Heterosis', 'Heterosis'), '%', 'p']].concat(res.heterosis.map(h => [h.row + ' x ' + h.col, h.mean, h.mph, h.mphPct, h.pMph])));
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('apareamiento_', 'mating_') + (state.data.ds.traits[B6.trait].name || '')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderPickers() {
    const D = state.data;
    el('b6Trait').innerHTML = D.ds.traits.map((t, i) => `<option value="${i}"${i === B6.trait ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const envs = D.field.envs;
    el('b6EnvField').style.display = envs.length > 1 ? '' : 'none';
    el('b6Env').innerHTML = envs.map(e => `<option value="${esc(e.key)}">${esc(e.name)}</option>`).join('') + (envs.length > 1 ? `<option value="__all">${T('todos juntos', 'all together')}</option>` : '');
    if (!B6.env || ![...el('b6Env').options].some(o => o.value === B6.env)) B6.env = envs.length > 1 ? '__all' : envs[0].key;
    el('b6Env').value = B6.env;
    el('b6F').value = String(B6.F);
    el('b6Goal').value = B6.goal;
    el('b6Alpha').value = String(B6.alpha);
    /* which tester is the F₁ of the other two: only the triple test cross needs it */
    const M = D.mating;
    const isTtc = M.design === 'ttc' && M.testers && M.testers.length === 3;
    el('b6L3Field').style.display = isTtc ? '' : 'none';
    if (isTtc) {
      const guess = MD.orderTesters(M.testers)[2];
      if (!B6.l3 || M.testers.indexOf(B6.l3) < 0) B6.l3 = guess;
      el('b6L3').innerHTML = M.testers.map(t => `<option value="${esc(t)}"${t === B6.l3 ? ' selected' : ''}>${esc(t)}</option>`).join('');
      el('b6L3').value = B6.l3;
    }
  }
  /* the inbreeding of the parents unless the user chose it: the value declared by the Block 2
     field book, else 1 for line × tester and partial diallels (inbred lines) and 0 for the North
     Carolina designs and the triple test cross (plants of a random-mating population) */
  function defaultF(D) {
    const meta = D.table && D.table.meta;
    if (meta && meta.F != null && isFinite(+meta.F)) return Math.max(0, Math.min(1, +meta.F));
    return ['lxt', 'partial'].includes(D.mating.design) ? 1 : 0;
  }
  function renderAll() {
    const st = status();
    ['b6Anova', 'b6Effects', 'b6Comp', 'b6Special', 'b6Notes0'].forEach(id => { const n = el(id); if (n) n.style.display = st.ok ? '' : 'none'; });
    if (!st.ok) { el('b6Source').innerHTML = ''; el('b6Tiles').innerHTML = ''; el('b6Assump').innerHTML = ''; msg('b6SetupMsg', [{ level: 'warning', es: st.es, en: st.en }]); return; }
    const D = state.data;
    if (B6.trait >= D.ds.traits.length) B6.trait = 0;
    if (!B6.Fset) B6.F = defaultF(D);
    renderPickers();
    B6.res = analyse();
    if (!B6.res || !B6.res.rows) { msg('b6SetupMsg', [{ level: 'error', es: 'No se pudo analizar el diseño de apareamiento.', en: 'The mating design could not be analysed.' }]); return; }
    state.mating6 = { trait: D.ds.traits[B6.trait].name, res: B6.res };
    renderSetup();
    renderAnova();
    renderEffects();
    renderComponents();
    renderSpecial();
    /* the families of a mating design go on to genetic parameters and selection (Block 8),
       or to G × E with several environments (Block 9); Block 7 is for generations */
    const n = D.field.multiEnv ? 9 : 8, s = STEPS[n - 1];
    el('b6Next').disabled = !s.ready;
    el('b6Next').dataset.step = n;
    el('b6NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque ${n}, en construcción)`, `Next: ${s.en} (Block ${n}, under construction)`);
  }

  function init() {
    if (!el('b6Setup')) return;
    renderNotes();
    const soft = () => { B6.cache.clear(); renderAll(); };
    el('b6Trait').addEventListener('change', () => { B6.trait = +el('b6Trait').value; soft(); });
    el('b6Env').addEventListener('change', () => { B6.env = el('b6Env').value; soft(); });
    el('b6F').addEventListener('change', () => { B6.F = parseFloat(el('b6F').value); B6.Fset = true; soft(); });
    el('b6L3').addEventListener('change', () => { B6.l3 = el('b6L3').value; soft(); });
    el('b6Goal').addEventListener('change', () => { B6.goal = el('b6Goal').value; soft(); });
    el('b6Alpha').addEventListener('change', () => { B6.alpha = parseFloat(el('b6Alpha').value); soft(); });
    el('b6HetKind').addEventListener('change', () => { B6.hetKind = el('b6HetKind').value; delete Fig.registry.b6FigHet; renderSpecial(); });
    el('b6DlXlsx').addEventListener('click', downloadXlsx);
    el('b6Back').addEventListener('click', () => goStep(3));
    el('b6Next').addEventListener('click', () => { const n = +el('b6Next').dataset.step || 8; if (STEPS[n - 1].ready) goStep(n); });
    document.addEventListener('datachange', () => { B6.cache.clear(); B6.env = null; B6.Fset = false; if (document.getElementById('panel-6').classList.contains('active')) renderAll(); else B6.built = false; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 6 && (!B6.built || !B6.res)) { B6.built = true; renderAll(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B6.res) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
