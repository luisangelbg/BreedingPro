/* BreedingPro — Block 3 engine, part 2: analysis of the field design.

   For every environment and trait: plot values (plants averaged, with the
   sampling error between plants kept apart), the analysis of variance that
   matches the field design, adjusted entry means with standard errors, the
   average standard error of a difference and the LSD, externally studentised
   residuals with the Bonferroni outlier test, normality of residuals, Tukey's
   test for non-additivity, the efficiency of incomplete blocks over complete
   blocks, and the repeatability of the trial (heritability on an entry-mean
   basis, standard and after Cullis et al. 2006).
   Across environments: the combined analysis in one stage (or in two stages
   when the model would be too large), Bartlett's test of the error variances
   and the entry means over environments.

   Field designs and models (y = plot value):
     crd        μ + entry
     rcbd       μ + replicate + entry
     alpha      μ + replicate + block(replicate) + entry; means from REML with
                blocks random (recovery of inter-block information,
                Patterson & Thompson 1971)
     ibd        μ + block + entry; means from REML with blocks random
     augmented  μ + block + entry (Federer 1956), blocks fixed
     rowcol     μ + replicate + entry, rows and columns (within replicates) random
     means      one value per entry: descriptive, error from outside */

const Trial = {};

Trial.DESIGNS = {
  crd: { es: 'Completamente al azar', en: 'Completely randomised' },
  rcbd: { es: 'Bloques completos al azar', en: 'Randomised complete blocks' },
  alpha: { es: 'Látice α (bloques incompletos resolubles)', en: 'α-lattice (resolvable incomplete blocks)' },
  ibd: { es: 'Bloques incompletos', en: 'Incomplete blocks' },
  augmented: { es: 'Bloques aumentados', en: 'Augmented blocks' },
  rowcol: { es: 'Filas y columnas', en: 'Rows and columns' },
  means: { es: 'Medias por entrada', en: 'Entry means' },
  unreplicated: { es: 'Sin repeticiones', en: 'Unreplicated' },
};
Trial.SOURCES = {
  env: { es: 'Ambientes', en: 'Environments' },
  rep: { es: 'Repeticiones', en: 'Replicates' },
  set: { es: 'Conjuntos', en: 'Sets' },
  repSet: { es: 'Repeticiones (conjuntos)', en: 'Replicates (sets)' },
  repEnv: { es: 'Repeticiones (ambientes)', en: 'Replicates (environments)' },
  block: { es: 'Bloques (repeticiones)', en: 'Blocks (replicates)' },
  blockOnly: { es: 'Bloques', en: 'Blocks' },
  row: { es: 'Filas (repeticiones)', en: 'Rows (replicates)' },
  col: { es: 'Columnas (repeticiones)', en: 'Columns (replicates)' },
  entry: { es: 'Entradas', en: 'Entries' },
  entryAdj: { es: 'Entradas (ajustadas por bloques)', en: 'Entries (adjusted for blocks)' },
  checks: { es: '  Testigos', en: '  Checks' },
  tests: { es: '  Nuevas y nuevas vs. testigos', en: '  New entries and new vs. checks' },
  entryEnv: { es: 'Entradas × ambientes', en: 'Entries × environments' },
  residual: { es: 'Error experimental', en: 'Experimental error' },
  pooled: { es: 'Error combinado', en: 'Pooled error' },
  within: { es: 'Entre plantas dentro de parcelas', en: 'Between plants within plots' },
  total: { es: 'Total', en: 'Total' },
};

/* plots of one environment for one trait */
Trial.plots = (ds, envKey, t, o) => {
  o = o || {};
  const ex = o.excluded || new Set();
  const hasPlot = ds.roles.includes('plot');
  const map = new Map();
  ds.records.forEach(r => {
    if ((r.env || '') !== envKey || ex.has(r.k)) return;
    const y = t.y[r.k];
    if (!isFinite(y)) return;
    const k = o.plantUnits ? 'r' + r.k : hasPlot && r.plot ? 'p' + r.plot : [r.rep, r.block, r.row, r.col, r.set, r.entry].join('|');
    let p = map.get(k);
    if (!p) map.set(k, p = { key: k, env: envKey, rep: r.rep, set: r.set, block: r.block, row: r.row, col: r.col, entry: r.entry, type: r.type, female: r.female, male: r.male, sum: 0, n: 0, vals: [], lines: [], ks: [] });
    p.sum += y; p.n++; p.vals.push(y); p.lines.push(r.line); p.ks.push(r.k);
  });
  const plots = [...map.values()];
  let withinSS = 0, withinDf = 0;
  plots.forEach(p => {
    p.y = p.sum / p.n;
    p.repKey = p.rep ? (ds.hasSet ? p.set + '·' : '') + p.rep : '';
    p.blockKey = p.repKey + '|' + p.block;
    p.rowKey = p.repKey + '|' + p.row; p.colKey = p.repKey + '|' + p.col;
    if (p.n > 1) { p.vals.forEach(v => { withinSS += (v - p.y) ** 2; }); withinDf += p.n - 1; }
  });
  return { plots, withinSS, withinDf };
};

const icpt = { kind: 'intercept', name: '(intercept)' };
const avgPairs = (k, fn, max) => {
  let s = 0, c = 0;
  const step = k * (k - 1) / 2 > (max || 8000) ? Math.ceil(k * (k - 1) / 2 / (max || 8000)) : 1;
  let pair = 0;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) { if (pair++ % step) continue; const v = fn(i, j); if (isFinite(v)) { s += v; c++; } }
  return c ? s / c : NaN;
};

/* the terms of each design, for the least-squares ANOVA */
function lsTerms(design, F, P) {
  const sets = F.set && F.set.levels.length > 1;
  if (sets && design === 'crd') return { terms: [icpt, { kind: 'main', f: F.set, name: 'set' }, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'set', 'entry'] };
  if (sets && design === 'rcbd') return { terms: [icpt, { kind: 'main', f: F.set, name: 'set' }, { kind: 'nested', f: F.rep, g: F.set, name: 'rep' }, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'set', 'repSet', 'entry'] };
  if (design === 'crd' || design === 'means') return { terms: [icpt, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'entry'] };
  if (design === 'rcbd') return { terms: [icpt, { kind: 'main', f: F.rep, name: 'rep' }, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'rep', 'entry'] };
  if (design === 'alpha') return { terms: [icpt, { kind: 'main', f: F.rep, name: 'rep' }, { kind: 'nested', f: F.block, g: F.rep, name: 'block' }, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'rep', 'block', 'entryAdj'] };
  if (design === 'ibd') return { terms: [icpt, { kind: 'main', f: F.block, name: 'block' }, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'blockOnly', 'entryAdj'] };
  if (design === 'augmented') return { terms: [icpt, { kind: 'main', f: F.group, name: 'block' }, { kind: 'main', f: F.entry, name: 'entry' }], labels: [null, 'blockOnly', 'entryAdj'] };
  if (design === 'rowcol') {
    const t = [icpt];
    const lab = [null];
    if (F.rep.levels.length > 1) { t.push({ kind: 'main', f: F.rep, name: 'rep' }); lab.push('rep'); }
    t.push({ kind: 'main', f: F.row, name: 'row' }, { kind: 'main', f: F.col, name: 'col' }, { kind: 'main', f: F.entry, name: 'entry' });
    lab.push('row', 'col', 'entryAdj');
    return { terms: t, labels: lab };
  }
  return null;
}

/* one environment, one trait */
Trial.analyseEnv = (ds, E, t, o) => {
  o = o || {};
  let design = (o.designs && o.designs[E.key]) || E.design;
  const { plots, withinSS, withinDf } = Trial.plots(ds, E.key, t, Object.assign({}, o, { plantUnits: !!E.plantUnits }));
  const out = { env: E.name, key: E.key, design, trait: t.name, nPlots: plots.length, plantUnits: !!E.plantUnits, notes: [] };
  /* a design the data cannot support falls back to complete blocks */
  const distinct = f => new Set(plots.map(f)).size;
  if ((design === 'alpha' || design === 'ibd') && distinct(p => p.blockKey) <= Math.max(1, distinct(p => p.repKey))) { design = distinct(p => p.repKey) > 1 ? 'rcbd' : 'crd'; out.notes.push({ level: 'warning', es: 'No hay bloques incompletos en los datos: se usa el análisis sin ellos.', en: 'There are no incomplete blocks in the data: the analysis without them is used.' }); }
  if (design === 'rowcol' && (distinct(p => p.row) < 2 || distinct(p => p.col) < 2)) { design = distinct(p => p.repKey) > 1 ? 'rcbd' : 'crd'; out.notes.push({ level: 'warning', es: 'Faltan las columnas de fila y columna: se usa el análisis sin ellas.', en: 'Row and column columns are missing: the analysis without them is used.' }); }
  if (design === 'rcbd' && distinct(p => (E.blockAsRep ? p.block : p.repKey)) < 2) { design = 'crd'; }
  out.design = design;
  if (plots.length < 3) { out.error = { es: 'Hay muy pocas parcelas con dato.', en: 'Too few plots have data.' }; return out; }
  const y = Float64Array.from(plots, p => p.y);
  out.describe = Data.describe(y);
  out.plots = plots;
  const F = {
    entry: LM.factor(plots.map(p => p.entry)),
    rep: LM.factor(plots.map(p => (E.blockAsRep ? p.block : p.repKey))),
    block: LM.factor(plots.map(p => p.blockKey)),
    row: LM.factor(plots.map(p => p.rowKey)),
    col: LM.factor(plots.map(p => p.colKey)),
  };
  F.group = E.groupBy === 'block' ? LM.factor(plots.map(p => p.block)) : F.rep;
  if (ds.hasSet) F.set = LM.factor(plots.map(p => p.set));
  if (design === 'ibd') F.block = LM.factor(plots.map(p => p.block));
  const isCheck = new Set(design === 'augmented' ? (E.checks || []) : plots.filter(p => p.type === 'check').map(p => p.entry));
  out.checks = [...isCheck];
  out.mean = S.mean(Array.from(y));
  const counts = new Map(); plots.forEach(p => counts.set(p.entry, (counts.get(p.entry) || 0) + 1));
  const repsOf = [...counts.values()];
  out.harmonicReps = repsOf.length / repsOf.reduce((s, v) => s + 1 / v, 0);

  if (design === 'means' || design === 'unreplicated') {
    out.means = F.entry.levels.map(l => { const p = plots.filter(q => q.entry === l); return { entry: l, mean: S.mean(p.map(q => q.y)), se: NaN, n: p.length, estimable: true }; });
    const ext = o.externalError && o.externalError[t.name];
    if (ext && ext.ms > 0) {
      out.external = ext;
      const msMeans = ext.scale === 'plot' ? ext.ms / (ext.r || 1) : ext.ms;
      out.means.forEach(m => { m.se = Math.sqrt(msMeans); });
      out.sed = Math.sqrt(2 * msMeans);
      out.dfe = ext.df;
      out.lsd = S.qt(0.975, ext.df) * out.sed;
      out.mseMeans = msMeans;
    }
    return out;
  }

  const spec = lsTerms(design, F, plots);
  const fit = LM.fit(spec.terms, y);
  out.fit = fit;
  out.dfe = fit.dfe; out.mse = fit.mse;
  if (!(fit.dfe > 0)) { out.error = { es: 'No quedan grados de libertad para el error: el diseño no tiene repeticiones suficientes.', en: 'No degrees of freedom are left for error: the design lacks replication.' }; return out; }
  out.cv = 100 * Math.sqrt(fit.mse) / Math.abs(out.mean);
  const rows = LM.anovaTable(fit, spec.labels);
  /* augmented: split entries into checks and new entries (checks alone are orthogonal to blocks) */
  if (design === 'augmented' && isCheck.size >= 2) {
    const ci = plots.map((p, i) => (isCheck.has(p.entry) ? i : -1)).filter(i => i >= 0);
    const yc = Float64Array.from(ci, i => y[i]);
    const fc = LM.fit([icpt, { kind: 'main', f: LM.factor(ci.map(i => (E.groupBy === 'block' ? plots[i].block : plots[i].repKey))), name: 'b' }, { kind: 'main', f: LM.factor(ci.map(i => plots[i].entry)), name: 'c' }], yc);
    const chk = fc.lines[2];
    const ent = rows.find(r => r.source === 'entryAdj');
    const idx = rows.indexOf(ent);
    const sub = [
      { source: 'checks', df: chk.df, ss: chk.ss, ms: chk.ss / chk.df },
      { source: 'tests', df: ent.df - chk.df, ss: Math.max(0, ent.ss - chk.ss), ms: Math.max(0, ent.ss - chk.ss) / (ent.df - chk.df) },
    ];
    sub.forEach(s => { s.F = s.ms / fit.mse; s.p = 1 - S.pf(s.F, s.df, fit.dfe); s.sub = true; });
    rows.splice(idx + 1, 0, ...sub);
    /* blocks eliminating entries, for the record */
    const fb = LM.fit([icpt, { kind: 'main', f: F.entry, name: 'entry' }, { kind: 'main', f: F.group, name: 'block' }], y);
    out.blocksAdjusted = { df: fb.lines[2].df, ss: fb.lines[2].ss, ms: fb.lines[2].ss / fb.lines[2].df, F: fb.lines[2].ss / fb.lines[2].df / fit.mse, p: 1 - S.pf(fb.lines[2].ss / fb.lines[2].df / fit.mse, fb.lines[2].df, fit.dfe) };
  }
  if (withinDf > 0) {
    out.within = { df: withinDf, ss: withinSS, ms: withinSS / withinDf };
    const harmonicPlants = plots.length / plots.reduce((s, p) => s + 1 / p.n, 0);
    out.within.plantsPerPlot = harmonicPlants;
    /* the experimental error of plot means is σ²e + σ²w/n: its F against the sampling error */
    out.within.F = fit.mse * harmonicPlants / out.within.ms;
    out.within.p = 1 - S.pf(out.within.F, fit.dfe, withinDf);
  }
  const ssTotal = rows.reduce((s, r) => s + (isFinite(r.ss) && !r.sub ? r.ss : 0), 0);
  rows.push({ source: 'total', df: plots.length - 1, ss: ssTotal, total: true });
  out.anova = rows;

  /* adjusted means */
  const entryTerm = spec.terms.length - 1;
  let means, sedAvg;
  const nestedIn = spec.labels[1] === 'set' ? { restrict: spec.labels.map((l, k) => (l === 'set' || l === 'repSet' ? k : -1)).filter(k => k >= 0) } : {};
  const fixedMeans = () => LM.lsmeans(fit, entryTerm, nestedIn);
  if (design === 'alpha' || design === 'ibd' || design === 'rowcol') {
    const fixed = design === 'ibd' ? [icpt, { kind: 'main', f: F.entry, name: 'entry' }]
      : F.rep.levels.length > 1 ? [icpt, { kind: 'main', f: F.rep, name: 'rep' }, { kind: 'main', f: F.entry, name: 'entry' }] : [icpt, { kind: 'main', f: F.entry, name: 'entry' }];
    const random = design === 'rowcol' ? [{ name: 'row', f: F.row }, { name: 'col', f: F.col }] : [{ name: 'block', f: F.block }];
    let rem = null;
    try { rem = fixed.length + F.entry.levels.length + random.reduce((s, r) => s + r.f.levels.length, 0) <= (o.maxDim || 1500) ? LM.reml(fixed, random, y) : null; } catch (e) { rem = null; }
    if (rem && !rem.error) {
      out.reml = { components: rem.components, sigma2e: rem.sigma2e, converged: rem.converged, iterations: rem.iterations, logLik: rem.logLikREML };
      means = LM.lsmeans(rem.fit, fixed.length - 1, { V: rem.V, vScale: rem.vScale });
      sedAvg = LM.averageSed(rem.fit, means, { V: rem.V, vScale: rem.vScale });
      out.meansFrom = 'reml';
      /* efficiency over complete blocks: squared SED of the RCBD analysis over that of this one */
      if (F.rep.levels.length > 1 && design !== 'ibd') {
        const frc = LM.fit([icpt, { kind: 'main', f: F.rep, name: 'rep' }, { kind: 'main', f: F.entry, name: 'entry' }], y);
        const mrc = LM.lsmeans(frc, 2);
        const sedRc = LM.averageSed(frc, mrc);
        const sedIntra = LM.averageSed(fit, fixedMeans());
        out.efficiency = { rcbdMse: frc.mse, sedRcbd: sedRc, sedIntra, sedReml: sedAvg, intra: (sedRc * sedRc) / (sedIntra * sedIntra), reml: (sedRc * sedRc) / (sedAvg * sedAvg) };
      }
    } else {
      means = fixedMeans();
      sedAvg = LM.averageSed(fit, means);
      out.meansFrom = 'intrablock';
      out.notes.push({ level: 'info', es: 'Las medias son intrabloque (el ajuste REML no fue posible o el modelo es muy grande).', en: 'Means are intra-block (the REML fit was not possible or the model is too large).' });
    }
  } else {
    means = fixedMeans();
    sedAvg = LM.averageSed(fit, means);
    out.meansFrom = 'ls';
  }
  const nOf = new Map(); plots.forEach(p => nOf.set(p.entry, (nOf.get(p.entry) || 0) + 1));
  out.means = means.map(m => ({ entry: m.level, mean: m.mean, se: m.se, n: nOf.get(m.level), estimable: m.estimable, check: isCheck.has(m.level) }));
  out.sed = sedAvg;
  out.lsd = S.qt(0.975, fit.dfe) * sedAvg;
  if (out.means.some(m => !m.estimable)) out.notes.push({ level: 'warning', es: 'Algunas medias no son estimables (el diseño no está conectado para esas entradas).', en: 'Some means are not estimable (the design is not connected for those entries).' });

  /* residuals, outliers and assumptions */
  const st = LM.studentized(fit);
  out.residuals = plots.map((p, i) => ({ entry: p.entry, rep: p.repKey || p.block, row: p.row, col: p.col, y: p.y, fitted: fit.fitted[i], resid: fit.resid[i], r: st[i].r, t: st[i].t, p: st[i].p, pBonf: st[i].pBonf, lines: p.lines, ks: p.ks }));
  out.outliers = out.residuals.filter(r => r.pBonf < 0.05 || Math.abs(r.t) >= 3.5).map(r => Object.assign({ level: r.pBonf < 0.05 ? 'outlier' : 'check' }, r)).sort((a, b) => Math.abs(b.t) - Math.abs(a.t));
  const res = Array.from(fit.resid);
  if (res.length >= 3 && res.length <= 5000 && S.sd(res) > 0) out.shapiro = AS.shapiro(res);
  if (design === 'rcbd' && plots.length === F.rep.levels.length * F.entry.levels.length) out.tukey = LM.tukeyNonAdditivity(spec.terms, y);

  /* repeatability of the trial: entries random, checks fixed */
  if (o.heritability !== false) out.h2 = Trial.repeatability(design, F, plots, y, isCheck, o);
  return out;
};

Trial.repeatability = (design, F, plots, y, isCheck, o) => {
  const newEntries = F.entry.levels.filter(l => !isCheck.has(l));
  if (newEntries.length < 5) return null;
  const n = plots.length;
  const checkFac = LM.factor(plots.map(p => (isCheck.has(p.entry) ? p.entry : '~entries')));
  const fixed = [icpt];
  if (checkFac.levels.length > 1) fixed.push({ kind: 'main', f: checkFac, name: 'checks' });
  if (F.set && F.set.levels.length > 1) fixed.push({ kind: 'main', f: F.set, name: 'set' });
  if ((design === 'rcbd' || design === 'alpha' || design === 'rowcol') && F.rep.levels.length > 1) fixed.push({ kind: 'main', f: F.rep, name: 'rep' });
  if (design === 'augmented') fixed.push({ kind: 'main', f: F.group, name: 'block' });
  const g = LM.factor(plots.map(p => (isCheck.has(p.entry) ? '' : p.entry)));
  const random = [{ name: 'entry', f: g }];
  if (design === 'alpha' || design === 'ibd') random.push({ name: 'block', f: F.block });
  if (design === 'rowcol') random.push({ name: 'row', f: F.row }, { name: 'col', f: F.col });
  const dim = fixed.length + checkFac.levels.length + random.reduce((s, r) => s + r.f.levels.length, 0);
  if (dim > (o.maxDim || 1500)) return null;
  let rem;
  try { rem = LM.reml(fixed, random, y); } catch (e) { return null; }
  if (!rem || rem.error) return null;
  const s2g = rem.components[0].sigma2, s2e = rem.sigma2e;
  const counts = newEntries.map(l => plots.filter(p => p.entry === l).length);
  const rH = counts.length / counts.reduce((s, v) => s + 1 / v, 0);
  const standard = s2g > 0 ? s2g / (s2g + s2e / rH) : 0;
  let cullis = 0, vDelta = NaN;
  if (s2g > 0) {
    vDelta = avgPairs(g.levels.length, (i, j) => rem.pevDiff(0, i, j));
    cullis = Math.max(0, 1 - vDelta / (2 * s2g));
  }
  return { sigma2g: s2g, sigma2e: s2e, others: rem.components.slice(1), reps: rH, standard, cullis, vDelta, boundary: rem.components[0].boundary, converged: rem.converged };
};

/* The error that a second-stage analysis of the adjusted means must use, on the plot
   scale: the average variance of the means times their number of plots. With complete
   blocks it equals the error mean square; with incomplete blocks (intra-block or REML
   means) the adjusted means are less precise than MSE/r, and this is larger
   (Möhring & Piepho 2009). Means with an external error keep that error. */
Trial.meansError = res => {
  if (!(res.mse != null && res.dfe > 0)) return res.mseMeans;
  const v = (res.means || []).filter(m => isFinite(m.se) && m.se > 0 && m.n > 0).map(m => m.se * m.se * m.n);
  return v.length ? S.mean(v) : res.mse;
};

/* Bartlett's test from error variances and their degrees of freedom */
Trial.bartlett = (vars, dfs) => {
  const k = vars.length;
  if (k < 2) return null;
  const N = dfs.reduce((s, d) => s + d, 0);
  const sp = dfs.reduce((s, d, i) => s + d * vars[i], 0) / N;
  const num = N * Math.log(sp) - dfs.reduce((s, d, i) => s + d * Math.log(vars[i]), 0);
  const C = 1 + (dfs.reduce((s, d) => s + 1 / d, 0) - 1 / N) / (3 * (k - 1));
  const K2 = num / C;
  return { K2, df: k - 1, p: 1 - S.pchisq(K2, k - 1), pooled: sp, fmax: Math.max(...vars) / Math.min(...vars) };
};

/* all environments, one trait */
Trial.combined = (ds, field, t, perEnv, o) => {
  o = o || {};
  const ok = perEnv.filter(r => !r.error && r.fit);
  const out = { trait: t.name, notes: [] };
  if (ok.length < 2) return null;
  out.bartlett = Trial.bartlett(ok.map(r => r.mse), ok.map(r => r.dfe));
  out.envs = ok.map(r => ({ env: r.env, mse: r.mse, dfe: r.dfe, mean: r.mean, cv: r.cv, h2: r.h2 ? r.h2.cullis : NaN }));
  const designs = new Set(ok.map(r => r.design));
  const all = [];
  ok.forEach(r => r.plots.forEach(p => all.push(p)));
  const y = Float64Array.from(all, p => p.y);
  const envF = LM.factor(all.map(p => p.env));
  const entry = LM.factor(all.map(p => p.entry));
  const repF = LM.factor(all.map(p => p.env + '#' + (p.repKey || p.block)));
  const blockF = LM.factor(all.map(p => p.env + '#' + p.blockKey));
  const allRep = ok.every(r => r.design !== 'crd');
  const withBlocks = [...designs].every(d => d === 'alpha');
  const E = envF.levels.length, v = entry.levels.length;
  const dim = 1 + E + repF.levels.length + (withBlocks ? blockF.levels.length : 0) + v * E;
  out.twoStage = dim > (o.maxCombinedDim || 1400);
  if (!out.twoStage) {
    const terms = [icpt, { kind: 'main', f: envF, name: 'env' }];
    const labels = [null, 'env'];
    if (allRep) { terms.push({ kind: 'nested', f: repF, g: envF, name: 'rep' }); labels.push('repEnv'); }
    if (withBlocks) { terms.push({ kind: 'nested', f: blockF, g: repF, name: 'block' }); labels.push('block'); }
    terms.push({ kind: 'main', f: entry, name: 'entry' }, { kind: 'cross', f: entry, g: envF, name: 'entryEnv' });
    labels.push(withBlocks ? 'entryAdj' : 'entry', 'entryEnv');
    const fit = LM.fit(terms, y);
    const iEntry = terms.length - 2, iGE = terms.length - 1, iRep = allRep ? 2 : -1;
    const den = { [iEntry]: iGE };
    if (allRep) den[1] = iRep;
    const rows = LM.anovaTable(fit, labels, den);
    /* entries are also tested against the pooled error, for fixed environments */
    const er = rows.find(r => r.term === iEntry);
    if (er) { er.F2 = er.ms / fit.mse; er.p2 = 1 - S.pf(er.F2, er.df, fit.dfe); }
    rows[rows.length - 1].source = 'pooled';
    rows.push({ source: 'total', df: all.length - 1, ss: rows.reduce((s, r) => s + (isFinite(r.ss) ? r.ss : 0), 0), total: true });
    out.anova = rows; out.fit = fit; out.mse = fit.mse; out.dfe = fit.dfe;
    out.mean = S.mean(Array.from(y));
    out.cv = 100 * Math.sqrt(fit.mse) / Math.abs(out.mean);
    /* entry means over environments: complete entry × environment tables only */
    const ms = LM.lsmeans(fit, iEntry);
    if (ms.every(m => m.estimable)) {
      out.means = ms.map(m => ({ entry: m.level, mean: m.mean, se: m.se, estimable: true }));
      out.sed = LM.averageSed(fit, ms);
    } else {
      const add = LM.fit(terms.slice(0, -1), y);
      const ma = LM.lsmeans(add, iEntry);
      out.means = ma.map(m => ({ entry: m.level, mean: m.mean, se: m.se, estimable: m.estimable }));
      out.sed = LM.averageSed(add, ma);
      out.notes.push({ level: 'info', es: 'Hay combinaciones entrada × ambiente vacías: las medias generales vienen del modelo sin interacción.', en: 'Some entry × environment combinations are empty: overall means come from the model without interaction.' });
    }
    const ge = rows.find(r => r.term === iGE);
    out.lsd = S.qt(0.975, ge && ge.df > 0 ? ge.df : fit.dfe) * out.sed;
    if (withBlocks) out.notes.push({ level: 'info', es: 'En el análisis combinado los bloques incompletos son fijos (análisis intrabloque); las medias de cada ambiente usan REML.', en: 'In the combined analysis incomplete blocks are fixed (intra-block analysis); the means of each environment use REML.' });
    if (designs.size > 1) out.notes.push({ level: 'warning', es: 'Los ambientes tienen diseños de campo distintos; el análisis combinado usa solo las repeticiones.', en: 'Environments have different field designs; the combined analysis uses the replicates only.' });
  } else {
    /* two stages: entry × environment table of adjusted means, error pooled from stage one */
    const envs = ok.map(r => r.env), entries = [...new Set(ok.flatMap(r => r.means.map(m => m.entry)))].sort(LM.natCmp);
    const cell = new Map(); ok.forEach(r => r.means.forEach(m => cell.set(m.entry + '|' + r.env, m.mean)));
    const complete = entries.filter(e => envs.every(en => cell.has(e + '|' + en)));
    const rH = ok.length / ok.reduce((s, r) => s + 1 / r.harmonicReps, 0);
    const pooledMse = ok.reduce((s, r) => s + Trial.meansError(r) * r.dfe, 0) / ok.reduce((s, r) => s + r.dfe, 0);   /* the precision of the adjusted means, not the intra-block error */
    const dfPooled = ok.reduce((s, r) => s + r.dfe, 0);
    const e = envs.length, g = complete.length;
    const M = complete.map(en => envs.map(v2 => cell.get(en + '|' + v2)));
    const grand = S.mean(M.flat());
    const gm = M.map(r => S.mean(r)), em = envs.map((_, j) => S.mean(M.map(r => r[j])));
    let ssG = 0, ssE = 0, ssGE = 0;
    M.forEach((r, i) => r.forEach((x, j) => { ssGE += (x - gm[i] - em[j] + grand) ** 2; }));
    gm.forEach(v2 => { ssG += e * (v2 - grand) ** 2; });
    em.forEach(v2 => { ssE += g * (v2 - grand) ** 2; });
    const sc = rH;
    const rows = [
      { source: 'env', df: e - 1, ss: ssE * sc },
      { source: 'entry', df: g - 1, ss: ssG * sc },
      { source: 'entryEnv', df: (g - 1) * (e - 1), ss: ssGE * sc },
      { source: 'pooled', df: dfPooled, ss: pooledMse * dfPooled, ms: pooledMse, residual: true },
    ];
    rows.forEach(r => { if (r.ms == null) r.ms = r.ss / r.df; });
    rows[1].F = rows[1].ms / rows[2].ms; rows[1].p = 1 - S.pf(rows[1].F, rows[1].df, rows[2].df); rows[1].against = 'entryEnv';
    rows[1].F2 = rows[1].ms / pooledMse; rows[1].p2 = 1 - S.pf(rows[1].F2, rows[1].df, dfPooled);
    rows[2].F = rows[2].ms / pooledMse; rows[2].p = 1 - S.pf(rows[2].F, rows[2].df, dfPooled);
    out.anova = rows; out.mse = pooledMse; out.dfe = dfPooled; out.mean = grand;
    out.means = complete.map((en, i) => ({ entry: en, mean: gm[i], se: Math.sqrt(pooledMse / (rH * e)), estimable: true }));
    out.sed = Math.sqrt(2 * rows[2].ms / (rH * e));
    out.lsd = S.qt(0.975, rows[2].df) * out.sed;
    out.notes.push({ level: 'info', es: `Análisis en dos etapas (el modelo en una etapa tendría ${dim} parámetros): medias ajustadas de cada ambiente y error combinado, en la escala de parcela con ${fmtNum(rH, 2)} repeticiones (media armónica).`, en: `Two-stage analysis (the one-stage model would have ${dim} parameters): adjusted means of each environment and pooled error, on the plot scale with ${fmtNum(rH, 2)} replicates (harmonic mean).` });
    if (complete.length < entries.length) out.notes.push({ level: 'warning', es: `${entries.length - complete.length === 1 ? '1 entrada no está en todos los ambientes y se omitió' : (entries.length - complete.length) + ' entradas no están en todos los ambientes y se omitieron'}.`, en: `${entries.length - complete.length} entr${entries.length - complete.length === 1 ? 'y is' : 'ies are'} not in every environment and were left out.` });
  }
  if (out.bartlett && out.bartlett.p < 0.05) out.notes.push({ level: 'warning', es: `Las varianzas del error difieren entre ambientes (Bartlett, ${pEq(out.bartlett.p)}; cociente máximo/mínimo ${fmtNum(out.bartlett.fmax, 2)}). Las pruebas F combinadas son aproximadas; conviene un modelo con varianzas del error por ambiente (Bloque 9).`, en: `Error variances differ between environments (Bartlett, ${pEq(out.bartlett.p)}; largest/smallest ratio ${fmtNum(out.bartlett.fmax, 2)}). Combined F tests are approximate; a model with an error variance per environment is advisable (Block 9).` });
  return out;
};

/* everything for one trait */
Trial.run = (ds, rec, traitIndex, o) => {
  const t = ds.traits[traitIndex];
  const envs = rec.field.envs.map(E => Trial.analyseEnv(ds, E, t, o));
  const combined = rec.field.multiEnv ? Trial.combined(ds, rec.field, t, envs, o) : null;
  return { trait: t.name, envs, combined };
};

window.Trial = Trial;
