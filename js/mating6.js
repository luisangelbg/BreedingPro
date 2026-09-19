/* BreedingPro — Block 6: the mating designs that are not complete diallels.

   North Carolina I (hierarchical), North Carolina II (factorial), North Carolina III
   and the triple test cross (every individual crossed to fixed testers), line × tester,
   and partial diallels.

   The analysis of variance is fitted on the plot values of every environment, so the
   error is the one the field design gives (Block 3), missing cells are handled by least
   squares, and the mating terms are a partition of the entry effect.

   The expected mean squares are not taken from a table: for every source of variation the
   coefficient of every random effect is the trace tr(A_t Z_k Z_k')/df_t, computed by
   fitting each indicator column of Z_k as if it were the response, which gives the
   sequential projection A_t applied to that column. With balanced data this reproduces the
   classical coefficients (r·f, r·m, r …) and with missing cells it stays exact.

   North Carolina III and the triple test cross are the exception: their testers are two or
   three fixed lines, so the interaction is not a sample of an infinite population and the
   moment estimators are written from the analysis of the sums and the differences of every
   individual, which is unambiguous:
       Var(L1 + L2) = 2(MS_plants − MS_e)/r = σ²A            (F₂ reference basis)
       Var(L1 − L2) = 2(MS_plants×testers − MS_e)/r = 2σ²D
   and, with the third tester, L1 + L2 − 2L3 measures epistasis (Kearsey & Jinks 1968). */

const MD = {};

/* the testers of a triple test cross in the order the theory needs: the two homozygous
   parents first and the heterozygous tester (their F₁) last */
MD.orderTesters = list => {
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const f1 = list.filter(x => /^(f1|f|hybrid|hibrido|híbrido|heterocigoto)/.test(norm(x)));
  const rest = list.filter(x => f1.indexOf(x) < 0);
  return rest.concat(f1);
};

const mdSum = a => a.reduce((s, x) => s + x, 0);
const mdDev2 = a => { const m = mdSum(a) / a.length; return mdSum(a.map(x => (x - m) * (x - m))); };
/* variance of a linear combination of mean squares: Var(Σ c_i M_i) = Σ c_i² 2 M_i²/df_i */
const mdVarComb = terms => Math.sqrt(terms.reduce((s, [c, ms, df]) => s + (df > 0 && isFinite(ms) ? c * c * 2 * ms * ms / df : 0), 0));

/* ================= 1 · the terms of every design ================= */
/* field strata: environments, sets and replicates inside them */
function mdStrata(obs, o) {
  const key = (...p) => p.join('|');
  const envF = LM.factor(obs.map(x => x.env || ''));
  const setF = LM.factor(obs.map(x => x.set || ''));
  const esF = LM.factor(obs.map(x => key(x.env || '', x.set || '')));
  const repF = LM.factor(obs.map(x => key(x.env || '', x.set || '', x.rep || '')));
  const multiEnv = envF.levels.length > 1, hasSet = setF.levels.length > 1;
  const terms = [{ kind: 'intercept', name: '(intercept)' }], labels = [null];
  if (multiEnv) { terms.push({ kind: 'main', f: envF, name: 'env' }); labels.push('env'); }
  if (hasSet) {
    terms.push(multiEnv ? { kind: 'nested', f: esF, g: envF, name: 'set' } : { kind: 'main', f: setF, name: 'set' });
    labels.push('set');
  }
  const strata = o.strata || {};
  if (strata.rep !== false) { terms.push({ kind: 'nested', f: repF, g: esF, name: 'rep' }); labels.push('rep'); }
  let blockF = null;
  if (strata.block) {
    blockF = LM.factor(obs.map(x => key(x.env || '', x.set || '', x.rep || '', x.block || '')));
    terms.push({ kind: 'nested', f: blockF, g: repF, name: 'block' });
    labels.push('block');
  }
  return { terms, labels, envF, setF, esF, repF, blockF, multiEnv, hasSet };
}

/* every design says which terms partition the entry effect and which of them are random
   samples of a population (the ones that carry variance components) */
MD.layout = (design, obs, o) => {
  o = o || {};
  const st = mdStrata(obs, o);
  const terms = st.terms.slice(), labels = st.labels.slice();
  const sources = [];             /* random effects, in the order of the analysis */
  const key = (...p) => p.join('|');
  const add = (label, term, fac) => { terms.push(term); labels.push(label); if (fac) sources.push({ key: label, fac }); };
  const facOf = fn => LM.factor(obs.map(fn));
  const nest = (f, g, name) => ({ kind: 'nested', f, g, name });
  const out = { design, terms, labels, sources, strata: st, envF: st.envF };

  if (design === 'nc1') {
    const maleF = facOf(x => key(x.set || '', x.male));
    const femaleF = facOf(x => key(x.set || '', x.male, x.female));
    add('male', st.hasSet ? nest(maleF, st.setF, 'male') : { kind: 'main', f: maleF, name: 'male' }, maleF);
    add('female', nest(femaleF, maleF, 'female'), femaleF);
    if (st.multiEnv) {
      add('maleEnv', { kind: 'cross', f: maleF, g: st.envF, name: 'maleEnv' }, LM.combine(maleF, st.envF));
      add('femaleEnv', { kind: 'cross', f: femaleF, g: st.envF, name: 'femaleEnv' }, LM.combine(femaleF, st.envF));
    }
    out.maleF = maleF; out.femaleF = femaleF;
  } else if (design === 'nc2') {
    const maleF = facOf(x => key(x.set || '', x.male));
    const femaleF = facOf(x => key(x.set || '', x.female));
    const cellF = facOf(x => key(x.set || '', x.male, x.female));
    add('male', st.hasSet ? nest(maleF, st.setF, 'male') : { kind: 'main', f: maleF, name: 'male' }, maleF);
    add('female', st.hasSet ? nest(femaleF, st.setF, 'female') : { kind: 'main', f: femaleF, name: 'female' }, femaleF);
    add('maleFemale', { kind: 'main', f: cellF, name: 'maleFemale' }, cellF);
    if (st.multiEnv) {
      add('maleEnv', { kind: 'cross', f: maleF, g: st.envF, name: 'maleEnv' }, LM.combine(maleF, st.envF));
      add('femaleEnv', { kind: 'cross', f: femaleF, g: st.envF, name: 'femaleEnv' }, LM.combine(femaleF, st.envF));
      add('maleFemaleEnv', { kind: 'cross', f: cellF, g: st.envF, name: 'maleFemaleEnv' }, LM.combine(cellF, st.envF));
    }
    out.maleF = maleF; out.femaleF = femaleF; out.cellF = cellF;
  } else if (design === 'lxt') {
    /* the entries split into parents, crosses and the contrast between the two groups */
    const isCross = x => !!(x.line && x.tester);
    const parentF = LM.factor(obs.map(x => (isCross(x) ? '' : x.parent || x.entry)));
    const lineF = LM.factor(obs.map(x => (isCross(x) ? x.line : '')));
    const testerF = LM.factor(obs.map(x => (isCross(x) ? x.tester : '')));
    const crossF = LM.factor(obs.map(x => (isCross(x) ? key(x.line, x.tester) : '')));
    if (parentF.levels.length) {
      terms.push({ kind: 'covariate', x: obs.map(x => (isCross(x) ? 1 : 0)), name: 'pvc' }); labels.push('pvc');
      terms.push({ kind: 'main', f: parentF, name: 'parents' }); labels.push('parents');
    }
    add('line', { kind: 'main', f: lineF, name: 'line' }, lineF);
    add('tester', { kind: 'main', f: testerF, name: 'tester' }, testerF);
    add('lineTester', { kind: 'main', f: crossF, name: 'lineTester' }, crossF);
    if (st.multiEnv) {
      add('lineEnv', { kind: 'cross', f: lineF, g: st.envF, name: 'lineEnv' }, LM.combine(lineF, st.envF));
      add('testerEnv', { kind: 'cross', f: testerF, g: st.envF, name: 'testerEnv' }, LM.combine(testerF, st.envF));
      add('lineTesterEnv', { kind: 'cross', f: crossF, g: st.envF, name: 'lineTesterEnv' }, LM.combine(crossF, st.envF));
    }
    out.lineF = lineF; out.testerF = testerF; out.crossF = crossF; out.parentF = parentF;
  } else if (design === 'nc3' || design === 'ttc') {
    const plantF = facOf(x => key(x.set || '', x.plant));
    const testers = o.testers && o.testers.length ? o.testers : facOf(x => x.tester).levels;
    const testerF = facOf(x => x.tester);
    const cellF = facOf(x => key(x.set || '', x.plant, x.tester));
    add('plant', st.hasSet ? nest(plantF, st.setF, 'plant') : { kind: 'main', f: plantF, name: 'plant' }, plantF);
    if (design === 'ttc' && testers.length === 3) {
      /* the two degrees of freedom of the testers are the contrast between the two parents
         (additive) and the contrast of both against the F₁ (epistasis), and the interaction
         of every individual with each of them (Kearsey & Jinks 1968) */
      const [t1, t2, t3] = testers;
      const cAdd = obs.map(x => (x.tester === t1 ? 1 : x.tester === t2 ? -1 : 0));
      const cEpi = obs.map(x => (x.tester === t3 ? -2 : 1));
      terms.push({ kind: 'covariate', name: 'add', x: cAdd }); labels.push('testerAdd');
      terms.push({ kind: 'covariate', name: 'epi', x: cEpi }); labels.push('testerEpi');
      if (st.hasSet) { terms.push({ kind: 'cross', f: testerF, g: st.setF, name: 'testerSet' }); labels.push('testerSet'); }
      const perPlant = (col, name) => {
        const lv = plantF.levels;
        lv.forEach((l, k) => {
          terms.push({ kind: 'covariate', name: name + k, x: col.map((v, i) => (plantF.codes[i] === k ? v : 0)) });
          labels.push(k === 0 ? name : null);
        });
        sources.push({ key: name, cols: lv.map((l, k) => col.map((v, i) => (plantF.codes[i] === k ? v : 0))) });
      };
      perPlant(cAdd, 'plantAdd');
      perPlant(cEpi, 'plantEpi');
    } else {
      terms.push({ kind: 'main', f: testerF, name: 'tester' }); labels.push('tester');
      /* with several sets the testers can behave differently in each one: that part is taken
         out of the interaction, which then measures only individuals × testers inside sets */
      if (st.hasSet) { terms.push({ kind: 'cross', f: testerF, g: st.setF, name: 'testerSet' }); labels.push('testerSet'); }
      add('plantTester', { kind: 'main', f: cellF, name: 'plantTester' }, cellF);
    }
    if (st.multiEnv) add('plantEnv', { kind: 'cross', f: plantF, g: st.envF, name: 'plantEnv' }, LM.combine(plantF, st.envF));
    out.plantF = plantF; out.testerF = testerF; out.cellF = cellF; out.testers = testers;
  } else if (design === 'partial') {
    /* y_ij = μ + g_i + g_j + s_ij: over-parameterised columns swept in order, so the sums of
       squares are those of general and of specific combining ability, whatever crosses were
       made. One column per parent for the general effects, one per cross for the specific. */
    const P = o.parents, ix = new Map(P.map((x, k) => [x, k]));
    const nOf = x => (ix.get(x.female) == null ? -1 : ix.get(x.female));
    const pairKey = x => { const a = ix.get(x.female), b = ix.get(x.male); return Math.min(a, b) + '|' + Math.max(a, b); };
    const pairs = [...new Set(obs.map(pairKey))].sort(LM.natCmp);
    const group = (name, cols) => {
      cols.forEach((c, k) => { terms.push(c); labels.push(k === 0 ? name : null); });
    };
    const gcaCols = P.map((p, i) => ({ kind: 'covariate', name: 'g' + i, x: obs.map(x => (ix.get(x.female) === i ? 1 : 0) + (ix.get(x.male) === i ? 1 : 0)) }));
    const scaCols = pairs.map(pk => ({ kind: 'covariate', name: 's' + pk, x: obs.map(x => (pairKey(x) === pk ? 1 : 0)) }));
    group('gca', gcaCols);
    group('sca', scaCols);
    /* the incidence of a general effect has a 1 for each of the two parents of the cross,
       so the columns themselves are the Z matrix of the random effect */
    sources.push({ key: 'gca', cols: gcaCols.map(c => c.x) });
    sources.push({ key: 'sca', cols: scaCols.map(c => c.x) });
    if (st.multiEnv) {
      const E = st.envF.levels.length;
      const inter = (cols, name) => {
        const out2 = [];
        for (let e = 0; e < E; e++) cols.forEach(c => out2.push({ kind: 'covariate', name: c.name + ':E' + e, x: c.x.map((v, k) => (st.envF.codes[k] === e ? v : 0)) }));
        group(name, out2);
        sources.push({ key: name, cols: out2.map(c => c.x) });
      };
      inter(gcaCols, 'gcaEnv');
      inter(scaCols, 'scaEnv');
    }
    out.pairs = pairs; out.parents = P;
  }
  return out;
};

/* ================= 2 · the analysis of variance ================= */
/* the labels of a design's own terms, in order; the merged groups keep one line */
MD.anova = (L, y, o) => {
  o = o || {};
  const fit = LM.fit(L.terms, y, o.weights ? { weights: o.weights } : undefined);
  const rows = [];
  let seen = 0;
  fit.lines.forEach((l, k) => {
    if (l.kind === 'intercept') return;
    const label = L.labels[k];
    if (label == null) {  /* a continuation column of the previous group */
      const prev = rows[rows.length - 1];
      if (prev) { prev.df += l.df; prev.ss += l.ss; prev.ms = prev.df > 0 ? prev.ss / prev.df : NaN; }
      return;
    }
    rows.push({ source: label, df: l.df, ss: l.ss, ms: l.df > 0 ? l.ss / l.df : NaN });
    seen++;
  });
  return { rows, fit, mse: fit.mse, dfe: fit.dfe, n: y.length };
};

/* ================= 3 · expected mean squares by traces ================= */
/* coefficient of σ²_k in E[MS_t]: tr(A_t Z_k Z_k')/df_t, where A_t is the sequential
   projection of the analysis of variance. Fitting a column of Z_k as the response gives
   z' A_t z directly, so the whole table of coefficients comes from the same engine. */
MD.emsCoefficients = (L, sources, o) => {
  o = o || {};
  const coef = {};                                    /* coef[source of variation][random effect] */
  const cols = [];
  sources.forEach(s => {
    if (s.cols) { s.cols.forEach(z => cols.push({ src: s.key, z })); return; }
    const f = s.fac, N = f.codes.length;
    f.levels.forEach((lv, j) => {
      const z = new Float64Array(N);
      for (let i = 0; i < N; i++) if (f.codes[i] === j) z[i] = 1;
      cols.push({ src: s.key, z });
    });
  });
  if (cols.length > (o.maxColumns || 1200)) return null;
  const acc = {};
  cols.forEach(c => {
    MD.anova(L, Array.from(c.z), {}).rows.forEach(r => {
      if (!acc[r.source]) acc[r.source] = {};
      acc[r.source][c.src] = (acc[r.source][c.src] || 0) + r.ss;
    });
  });
  Object.keys(acc).forEach(src => { coef[src] = Object.assign({}, acc[src]); });
  return coef;
};

/* moment estimators: E[MS_t] = σ²e + Σ_k c_tk σ²_k, solved from the last source upwards.
   Every component is kept as a linear combination of mean squares so that its standard
   error is Var(Σ c_i M_i) = Σ c_i² 2M_i²/df_i. */
MD.components = (rows, coef, sources, mse, dfe, o) => {
  o = o || {};
  const msOf = {}, dfOf = {};
  rows.forEach(r => { msOf[r.source] = r.ms; dfOf[r.source] = r.df; });
  msOf.error = mse; dfOf.error = dfe;
  const keys = sources.map(s => s.key).filter(k => msOf[k] != null && dfOf[k] > 0);
  const comb = {};                                   /* comb[k] = {msSource: coefficient} */
  const value = {};
  for (let i = keys.length - 1; i >= 0; i--) {
    const k = keys[i];
    const c = (coef[k] && coef[k][k] != null ? coef[k][k] : 0) / (dfOf[k] || 1);
    if (!(Math.abs(c) > 1e-9)) { value[k] = NaN; comb[k] = {}; continue; }
    const lin = { [k]: 1 / c, error: -1 / c };
    for (let j = i + 1; j < keys.length; j++) {
      const kj = keys[j];
      const cj = (coef[k] && coef[k][kj] != null ? coef[k][kj] : 0) / (dfOf[k] || 1);
      if (Math.abs(cj) < 1e-9 || !comb[kj]) continue;
      Object.keys(comb[kj]).forEach(src => { lin[src] = (lin[src] || 0) - cj / c * comb[kj][src]; });
    }
    comb[k] = lin;
    value[k] = Object.keys(lin).reduce((s, src) => s + lin[src] * msOf[src], 0);
  }
  const list = keys.map(k => ({
    key: k, value: value[k],
    se: mdVarComb(Object.keys(comb[k]).map(src => [comb[k][src], msOf[src], dfOf[src]])),
    coefficients: Object.assign({}, coef[k]),
    combination: comb[k],
  }));
  list.forEach(c => { c.t = c.se > 0 ? c.value / c.se : NaN; c.p = isFinite(c.t) ? 2 * (1 - S.pnorm(Math.abs(c.t))) : NaN; });
  list.push({ key: 'error', value: mse, se: mse * Math.sqrt(2 / Math.max(1, dfe)), coefficients: {}, combination: { error: 1 } });
  return list;
};

/* ================= 4 · F tests with the right denominator ================= */
/* a source is tested against the mean square whose expectation differs from its own only
   by the term being tested: that denominator is found from the coefficient table itself */
MD.tests = (rows, coef, sources, mse, dfe, o) => {
  o = o || {};
  const msOf = {}, dfOf = {};
  rows.forEach(r => { msOf[r.source] = r.ms; dfOf[r.source] = r.df; });
  const keys = sources.map(s => s.key);
  const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
  rows.forEach(r => {
    const mine = coef[r.source] || {};
    const cOwn = k => (mine[k] != null ? mine[k] / (r.df || 1) : 0);
    let den = null;
    /* the candidate is another source whose expectation has the same coefficients for
       every random effect except the one this line tests */
    keys.forEach(k => {
      if (k === r.source || !(dfOf[k] > 0) || den) return;
      const other = coef[k] || {};
      const cOther = j => (other[j] != null ? other[j] / (dfOf[k] || 1) : 0);
      const ok = keys.every(j => (j === r.source ? true : near(cOwn(j), cOther(j)))) && cOther(r.source) < 1e-9;
      if (ok && keys.indexOf(k) > keys.indexOf(r.source)) den = { key: k, ms: msOf[k], df: dfOf[k] };
    });
    if (!den && keys.every(j => j === r.source || Math.abs(cOwn(j)) < 1e-9)) den = { key: 'error', ms: mse, df: dfe };
    if (!den) {
      /* Satterthwaite: build the linear combination that matches the other coefficients */
      const parts = [];
      keys.forEach(k => {
        if (k === r.source) return;
        const c = cOwn(k);
        if (Math.abs(c) < 1e-9 || !(dfOf[k] > 0)) return;
        parts.push([c, k]);
      });
      if (parts.length) {
        /* M = Σ (c_k / c_kk) MS_k + (1 − Σ c_k/c_kk) MSE  */
        const terms = [];
        let rest = 1;
        parts.forEach(([c, k]) => {
          const ck = (coef[k] && coef[k][k] != null ? coef[k][k] / (dfOf[k] || 1) : 0);
          if (!(Math.abs(ck) > 1e-9)) return;
          terms.push([c / ck, msOf[k], dfOf[k]]);
          rest -= c / ck;
        });
        terms.push([rest, mse, dfe]);
        const m = terms.reduce((s, [c, ms]) => s + c * ms, 0);
        const dfq = m > 0 ? (m * m) / terms.reduce((s, [c, ms, df]) => s + (df > 0 ? c * c * ms * ms / df : 0), 0) : NaN;
        den = { key: 'quasi', ms: m, df: dfq, terms: terms.map(([c, , ], i) => c) };
      } else den = { key: 'error', ms: mse, df: dfe };
    }
    r.denom = den.key; r.dfDen = den.df;
    r.F = den.ms > 0 ? r.ms / den.ms : NaN;
    r.p = isFinite(r.F) && den.df > 0 && r.df > 0 ? 1 - S.pf(r.F, r.df, den.df) : NaN;
  });
  return rows;
};

/* ================= 5 · effects by constrained least squares ================= */
/* the effects of a factorial (lines × testers, males × females) with Σ = 0 in every margin,
   which are the published estimates and their standard errors */
MD.factorialEffects = (cells, rowsN, colsN, sigma2, df) => {
  const m = 1 + rowsN + colsN + rowsN * colsN;
  const off = { mu: 0, row: 1, col: 1 + rowsN, cell: 1 + rowsN + colsN };
  const cellIx = (i, j) => off.cell + i * colsN + j;
  const X = cells.map(c => {
    const x = new Float64Array(m);
    x[off.mu] = 1; x[off.row + c.i] = 1; x[off.col + c.j] = 1; x[cellIx(c.i, c.j)] = 1;
    return x;
  });
  const C = [];
  const zero = () => new Float64Array(m);
  let r = zero(); for (let i = 0; i < rowsN; i++) r[off.row + i] = 1; C.push(r);
  r = zero(); for (let j = 0; j < colsN; j++) r[off.col + j] = 1; C.push(r);
  for (let i = 0; i < rowsN; i++) { const z = zero(); for (let j = 0; j < colsN; j++) z[cellIx(i, j)] = 1; C.push(z); }
  for (let j = 0; j < colsN; j++) { const z = zero(); for (let i = 0; i < rowsN; i++) z[cellIx(i, j)] = 1; C.push(z); }
  /* a cross that was not made cannot have an effect of its own */
  const seen = new Set(cells.map(c => c.i * colsN + c.j));
  for (let i = 0; i < rowsN; i++) for (let j = 0; j < colsN; j++) if (!seen.has(i * colsN + j)) { const z = zero(); z[cellIx(i, j)] = 1; C.push(z); }
  const fit = LM.constrained(X, cells.map(c => c.y), cells.map(c => c.w), C, sigma2);
  if (!fit) return null;
  const one = a => new Map([[a, 1]]);
  const mk = (k, extra) => {
    const L1 = one(k);
    const ok = fit.full || fit.estimable(L1);
    const se = ok ? Math.sqrt(Math.max(0, fit.varOf(L1))) : NaN;
    const est = ok ? fit.theta[k] : NaN;
    const t = se > 0 ? est / se : NaN;
    return Object.assign({ est, se, t, estimable: ok, p: isFinite(t) && df > 0 ? 2 * (1 - S.pt(Math.abs(t), df)) : NaN }, extra || {});
  };
  const out = { mu: mk(off.mu), rows: [], cols: [], cells: [], fit, off, df };
  for (let i = 0; i < rowsN; i++) out.rows.push(mk(off.row + i, { i }));
  for (let j = 0; j < colsN; j++) out.cols.push(mk(off.col + j, { j }));
  cells.forEach(c => out.cells.push(mk(cellIx(c.i, c.j), { i: c.i, j: c.j, y: c.y })));
  const sed = (a, b) => Math.sqrt(Math.max(0, fit.varOf(new Map([[a, 1], [b, -1]]))));
  out.sed = {
    row: rowsN > 1 ? sed(off.row, off.row + 1) : NaN,
    col: colsN > 1 ? sed(off.col, off.col + 1) : NaN,
    cell: cells.length > 1 ? sed(cellIx(cells[0].i, cells[0].j), cellIx(cells[1].i, cells[1].j)) : NaN,
  };
  /* the predicted value of every cross, μ + row + col + cell */
  out.predict = cells.map(c => {
    const L1 = new Map([[off.mu, 1], [off.row + c.i, 1], [off.col + c.j, 1], [cellIx(c.i, c.j), 1]]);
    const ok = fit.full || fit.estimable(L1);
    return { i: c.i, j: c.j, est: ok ? fit.estOf(L1) : NaN, se: ok ? Math.sqrt(Math.max(0, fit.varOf(L1))) : NaN, estimable: ok };
  });
  return out;
};

/* the effects of a hierarchical design: males with Σ = 0 and females with Σ = 0 inside
   every male, which is how North Carolina I is written */
MD.nestedEffects = (cells, nMales, sigma2, df) => {
  const nF = cells.length;
  const m = 1 + nMales + nF;
  const off = { mu: 0, male: 1, female: 1 + nMales };
  const X = cells.map((c, k) => {
    const x = new Float64Array(m);
    x[off.mu] = 1; x[off.male + c.male] = 1; x[off.female + k] = 1;
    return x;
  });
  const C = [];
  const zero = () => new Float64Array(m);
  let r = zero(); for (let i = 0; i < nMales; i++) r[off.male + i] = 1; C.push(r);
  for (let i = 0; i < nMales; i++) {
    const z = zero();
    cells.forEach((c, k) => { if (c.male === i) z[off.female + k] = 1; });
    C.push(z);
  }
  const fit = LM.constrained(X, cells.map(c => c.y), cells.map(c => c.w), C, sigma2);
  if (!fit) return null;
  const one = a => new Map([[a, 1]]);
  const mk = (k, extra) => {
    const L1 = one(k);
    const ok = fit.full || fit.estimable(L1);
    const se = ok ? Math.sqrt(Math.max(0, fit.varOf(L1))) : NaN;
    const est = ok ? fit.theta[k] : NaN;
    const t = se > 0 ? est / se : NaN;
    return Object.assign({ est, se, t, estimable: ok, p: isFinite(t) && df > 0 ? 2 * (1 - S.pt(Math.abs(t), df)) : NaN }, extra || {});
  };
  const out = { mu: mk(off.mu), males: [], females: [], fit, off, df };
  for (let i = 0; i < nMales; i++) out.males.push(mk(off.male + i, { i }));
  cells.forEach((c, k) => out.females.push(mk(off.female + k, { male: c.male, k, y: c.y, name: c.name })));
  return out;
};

/* ================= 6 · genetic interpretation ================= */
/* Cov(HS) and Cov(FS) of every design, and from them σ²A and σ²D with the coefficient
   of inbreeding of the parents: Cov(HS) = (1+F)/4 σ²A, Cov(FS) = (1+F)/2 σ²A + ((1+F)/2)² σ²D */
MD.genetic = (design, comp, o) => {
  o = o || {};
  const F = o.F == null ? 0 : o.F;
  const k1 = (1 + F) / 4, k2 = (1 + F) * (1 + F) / 4;
  const get = k => { const c = comp.find(x => x.key === k); return c ? c.value : NaN; };
  const seOf = k => { const c = comp.find(x => x.key === k); return c ? c.se : NaN; };
  const combOf = k => { const c = comp.find(x => x.key === k); return c ? c.combination : null; };
  const msOf = o.msOf || {}, dfOf = o.dfOf || {};
  /* the standard error of a linear combination of components, through the mean squares */
  const seComb = parts => {
    const lin = {};
    parts.forEach(([c, k]) => { const cb = combOf(k); if (!cb) return; Object.keys(cb).forEach(s => { lin[s] = (lin[s] || 0) + c * cb[s]; }); });
    return mdVarComb(Object.keys(lin).map(s => [lin[s], msOf[s], dfOf[s]]));
  };
  const out = { F, design, notes: [] };
  let covHS = NaN, covFS = NaN, seHS = NaN, seFS = NaN, parts = null;
  if (design === 'nc1') {
    const sm = get('male'), sf = get('female');
    covHS = sm; seHS = seOf('male');
    covFS = sm + sf; seFS = seComb([[1, 'male'], [1, 'female']]);
    out.sigma2m = sm; out.sigma2f = sf;
    out.s2A = 4 * sm / (1 + F); out.seA = 4 * seOf('male') / (1 + F);
    out.s2D = 4 * (sf - sm) / ((1 + F) * (1 + F));
    out.seD = 4 * seComb([[1, 'female'], [-1, 'male']]) / ((1 + F) * (1 + F));
    out.notes.push({ level: 'info', es: 'En Carolina del Norte I el componente de hembras dentro de machos incluye los efectos maternos, si los hay: σ²D queda sobrestimado cuando la madre influye en la parcela.', en: 'In North Carolina I the component of females within males includes maternal effects, if any: σ²D is overestimated when the mother influences the plot.' });
  } else if (design === 'nc2') {
    const sm = get('male'), sf = get('female'), si = get('maleFemale');
    const gca = (sm + sf) / 2;
    out.sigma2m = sm; out.sigma2f = sf; out.sigma2mf = si; out.sigma2gca = gca;
    covHS = gca; seHS = seComb([[0.5, 'male'], [0.5, 'female']]);
    covFS = 2 * gca + si; seFS = seComb([[1, 'male'], [1, 'female'], [1, 'maleFemale']]);
    out.s2A = 4 * gca / (1 + F); out.seA = 4 * seHS / (1 + F);
    out.s2D = 4 * si / ((1 + F) * (1 + F)); out.seD = 4 * seOf('maleFemale') / ((1 + F) * (1 + F));
    out.sigma2mFromMales = 4 * sm / (1 + F); out.sigma2mFromFemales = 4 * sf / (1 + F);
  } else if (design === 'lxt') {
    const sl = get('line'), st = get('tester'), si = get('lineTester');
    const gca = (sl + st) / 2;
    out.sigma2line = sl; out.sigma2tester = st; out.sigma2sca = si; out.sigma2gca = gca;
    covHS = gca; seHS = seComb([[0.5, 'line'], [0.5, 'tester']]);
    covFS = 2 * gca + si; seFS = seComb([[1, 'line'], [1, 'tester'], [1, 'lineTester']]);
    out.s2A = 4 * gca / (1 + F); out.seA = 4 * seHS / (1 + F);
    out.s2D = 4 * si / ((1 + F) * (1 + F)); out.seD = 4 * seOf('lineTester') / ((1 + F) * (1 + F));
    out.notes.push({ level: 'info', es: 'σ²D = 4σ²ACE/(1+F)²: con progenitores endogámicos (F = 1) es σ²ACE, no 2σ²ACE. Cov(HS) es el promedio de las varianzas de líneas y probadores; si los probadores son pocos y elegidos a propósito, la varianza de probadores no estima Cov(HS) de la población.', en: 'σ²D = 4σ²SCA/(1+F)²: with inbred parents (F = 1) it is σ²SCA, not 2σ²SCA. Cov(HS) is the average of the line and tester variances; when the testers are few and chosen on purpose, the tester variance does not estimate Cov(HS) of the population.' });
  } else if (design === 'partial') {
    const sg = get('gca'), ss = get('sca');
    out.sigma2gca = sg; out.sigma2sca = ss;
    covHS = sg; seHS = seOf('gca');
    covFS = 2 * sg + ss; seFS = seComb([[2, 'gca'], [1, 'sca']]);
    out.s2A = 4 * sg / (1 + F); out.seA = 4 * seOf('gca') / (1 + F);
    out.s2D = 4 * ss / ((1 + F) * (1 + F)); out.seD = 4 * seOf('sca') / ((1 + F) * (1 + F));
    /* like Block 4: the ratio needs both components; with a negative σ²SCA it would exceed 1 */
    out.baker = sg > 0 && ss >= 0 ? 2 * sg / (2 * sg + ss) : NaN;
  }
  out.covHS = covHS; out.seHS = seHS; out.covFS = covFS; out.seFS = seFS;
  return MD.finishGenetic(out, o);
};

/* the ratios and heritabilities every design shares */
MD.finishGenetic = (out, o) => {
  o = o || {};
  const s2A = out.s2A, s2D = out.s2D;
  const okA = isFinite(s2A) && s2A > 0, okD = isFinite(s2D) && s2D >= 0;
  const plotErr = o.plotMse != null ? o.plotMse : NaN;
  const within = o.within || null;
  const gxe = (out.s2AE || 0) + (out.s2DE || 0);
  const varP = (okA ? s2A : 0) + (okD ? s2D : 0) + gxe + (isFinite(plotErr) ? plotErr : 0);
  out.varP = varP;
  out.dominance = okA && okD ? Math.sqrt(2 * s2D / s2A) : NaN;
  out.h2ns = okA && varP > 0 ? s2A / varP : NaN;
  out.h2bs = okA && okD && varP > 0 ? (s2A + s2D) / varP : NaN;
  if (within && within.sigma2w > 0) {
    const plantP = (okA ? s2A : 0) + (okD ? s2D : 0) + gxe + within.sigma2plot + within.sigma2w;
    out.varPplant = plantP;
    out.h2nsPlant = okA && plantP > 0 ? s2A / plantP : NaN;
    out.h2bsPlant = okA && okD && plantP > 0 ? (s2A + s2D) / plantP : NaN;
  }
  /* the variance of a family mean, which is what selection uses */
  const r = o.r || 1, e = o.e || 1;
  const varMean = (okA ? s2A : 0) + (okD ? s2D : 0) + (isFinite(plotErr) ? plotErr / (r * e) : 0);
  out.h2nsMean = okA && varMean > 0 ? s2A / varMean : NaN;
  out.negative = !okA || !okD;
  return out;
};

/* ================= 7 · North Carolina III and the triple test cross ================= */
/* the analysis of the sums and the differences of every individual, and the epistasis
   contrast of the triple test cross */
MD.sumsAndDifferences = (obs, o) => {
  o = o || {};
  const testers = o.testers;                 /* [L1, L2] or [L1, L2, L3] */
  const mse = o.mse, dfe = o.dfe, r = o.r || 1;
  const byPlant = new Map();
  obs.forEach(x => {
    const k = (x.set || '') + '|' + x.plant;
    if (!byPlant.has(k)) byPlant.set(k, { key: k, set: x.set || '', plant: x.plant, y: {}, n: {} });
    const p = byPlant.get(k);
    p.y[x.tester] = (p.y[x.tester] || 0) + x.y;
    p.n[x.tester] = (p.n[x.tester] || 0) + 1;
  });
  const plants = [...byPlant.values()];
  plants.forEach(p => { testers.forEach(t => { p[t] = p.n[t] ? p.y[t] / p.n[t] : NaN; }); });
  const full = plants.filter(p => testers.every(t => isFinite(p[t])));
  const t1 = testers[0], t2 = testers[1], t3 = testers[2];
  full.forEach(p => {
    p.sum = p[t1] + p[t2];
    p.diff = p[t1] - p[t2];
    if (t3) p.epi = p[t1] + p[t2] - 2 * p[t3];
  });
  const n = full.length;
  const sets = [...new Set(full.map(p => p.set))];
  const out = { plants: full, n, testers, r, mse, dfe, sets: sets.length };
  if (n - sets.length < 2) return out;
  /* the variances are pooled inside sets, because every set has its own F₂ and its own
     testers: deviations are taken from the mean of the set */
  const pooled = pick => {
    let ss = 0;
    sets.forEach(s => {
      const v = full.filter(p => p.set === s).map(pick);
      ss += mdDev2(v);
    });
    return ss / (n - sets.length);
  };
  const pooledCov = () => {
    let sp = 0;
    sets.forEach(s => {
      const g = full.filter(p => p.set === s);
      const mS = mdSum(g.map(p => p.sum)) / g.length, mD = mdSum(g.map(p => p.diff)) / g.length;
      g.forEach(p => { sp += (p.sum - mS) * (p.diff - mD); });
    });
    return sp / (n - sets.length);
  };
  const dfPlants = n - sets.length;
  const sums = full.map(p => p.sum), diffs = full.map(p => p.diff);
  const vS = pooled(p => p.sum), vD = pooled(p => p.diff);
  /* the error of a plant mean is mse/r, so Var(observed sum) = Var(sum) + 2 mse/r */
  const errPair = 2 * mse / r;
  out.dfPlants = dfPlants;
  out.varSum = vS; out.varDiff = vD;
  /* one locus of an F₂ crossed to both parents gives sums (a+d, d, d−a) and differences
     (a−d, a, a+d) with frequencies ¼, ½, ¼, so Var(sum) = Σa²/2 = D/2 = σ²A and
     Var(difference) = Σd²/2 = H/2 = 2σ²D */
  out.s2A = vS - errPair;                                     /* σ²A on the F₂ basis */
  out.s2D = (vD - errPair) / 2;                               /* σ²D on the F₂ basis */
  out.D = 2 * out.s2A; out.H = 4 * out.s2D;
  out.seA = mdVarComb([[1, vS, dfPlants], [-2 / r, mse, dfe]]);
  out.seD = mdVarComb([[0.5, vD, dfPlants], [-1 / r, mse, dfe]]);
  out.dominance = out.s2A > 0 && out.s2D >= 0 ? Math.sqrt(out.H / out.D) : NaN;
  /* the mean difference estimates the additive difference between the two testers */
  const mS = mdSum(sums) / n, mD = mdSum(diffs) / n;
  out.meanSum = mS; out.meanDiff = mD;
  out.seMeanDiff = Math.sqrt(vD / n);
  out.tMeanDiff = out.seMeanDiff > 0 ? mD / out.seMeanDiff : NaN;
  out.pMeanDiff = isFinite(out.tMeanDiff) ? 2 * (1 - S.pt(Math.abs(out.tMeanDiff), dfPlants)) : NaN;
  /* direction of dominance: the covariance of sums and differences carries the sign of Σ a·d */
  const cov = pooledCov();
  out.covSD = cov;
  out.corSD = vS > 0 && vD > 0 ? cov / Math.sqrt(vS * vD) : NaN;
  out.Fcomp = -2 * cov;                                        /* F = Σ a·d in Mather's notation */
  out.tCor = isFinite(out.corSD) && Math.abs(out.corSD) < 1 ? out.corSD * Math.sqrt(dfPlants / (1 - out.corSD * out.corSD)) : NaN;
  out.pCor = isFinite(out.tCor) ? 2 * (1 - S.pt(Math.abs(out.tCor), dfPlants)) : NaN;
  /* epistasis, when the third tester is there (Kearsey & Jinks 1968) */
  if (t3) {
    const epi = full.map(p => p.epi);
    const mE = mdSum(epi) / n;
    const ssTotal = mdSum(epi.map(x => x * x)) * r / 6;        /* Var(contrast) = 6 σ²e / r */
    const ssMean = n * mE * mE * r / 6;
    const ssAmong = Math.max(0, ssTotal - ssMean);
    out.epistasis = {
      values: epi, mean: mE,
      seMean: Math.sqrt(6 * mse / (r * n)),
      overall: { df: 1, ss: ssMean, ms: ssMean },
      among: { df: n - 1, ss: ssAmong, ms: n > 1 ? ssAmong / (n - 1) : NaN },
      total: { df: n, ss: ssTotal, ms: ssTotal / n },
    };
    ['overall', 'among', 'total'].forEach(k => {
      const x = out.epistasis[k];
      x.F = mse > 0 ? x.ms / mse : NaN;
      x.p = isFinite(x.F) && dfe > 0 && x.df > 0 ? 1 - S.pf(x.F, x.df, dfe) : NaN;
    });
    out.epistasis.tOverall = out.epistasis.seMean > 0 ? mE / out.epistasis.seMean : NaN;
    out.epistasis.pOverall = isFinite(out.epistasis.tOverall) ? 2 * (1 - S.pt(Math.abs(out.epistasis.tOverall), dfe)) : NaN;
  }
  return out;
};

/* ================= 8 · heterosis of every cross (model free) ================= */
MD.heterosis = (cells, parentMeans, o) => {
  o = o || {};
  const mse = o.mse, df = o.df, r = o.r || 1, alpha = o.alpha || 0.05;
  const t = df > 0 ? S.qt(1 - alpha / 2, df) : NaN;
  const list = [];
  cells.forEach(c => {
    const a = parentMeans[c.rowName], b = parentMeans[c.colName];
    if (a == null || b == null) return;
    const mp = (a.mean + b.mean) / 2;
    const better = o.goal === 'low' ? Math.min(a.mean, b.mean) : Math.max(a.mean, b.mean);
    const bp = o.goal === 'low' ? (a.mean < b.mean ? a : b) : (a.mean > b.mean ? a : b);
    /* variances of the contrasts, with the number of plots of every mean */
    const vC = mse / (c.n || r), vA = mse / (a.n || r), vB = mse / (b.n || r);
    const seMP = Math.sqrt(vC + 0.25 * vA + 0.25 * vB);
    const seBP = Math.sqrt(vC + mse / (bp.n || r));
    const mph = c.y - mp, bph = c.y - better;
    list.push({
      i: c.i, j: c.j, row: c.rowName, col: c.colName, name: c.rowName + ' × ' + c.colName,
      mean: c.y, midParent: mp, betterParent: better,
      mph, mphPct: mp !== 0 ? 100 * mph / Math.abs(mp) : NaN, seMph: seMP, tMph: seMP > 0 ? mph / seMP : NaN,
      bph, bphPct: better !== 0 ? 100 * bph / Math.abs(better) : NaN, seBph: seBP, tBph: seBP > 0 ? bph / seBP : NaN,
      loMph: mph - t * seMP, hiMph: mph + t * seMP,
    });
  });
  list.forEach(x => {
    x.pMph = isFinite(x.tMph) && df > 0 ? 2 * (1 - S.pt(Math.abs(x.tMph), df)) : NaN;
    x.pBph = isFinite(x.tBph) && df > 0 ? 2 * (1 - S.pt(Math.abs(x.tBph), df)) : NaN;
  });
  return list;
};

/* ================= 9 · cell means, one group per set ================= */
/* every set of a North Carolina design has its own parents, so the effects are estimated
   inside each set; a design without sets gives a single group */
MD.cellMeans = (design, obs, o) => {
  o = o || {};
  const setsOf = new Map();
  const isCross = x => (design === 'lxt' ? !!(x.line && x.tester) : true);
  obs.forEach(x => {
    if (!isCross(x)) return;
    const s = x.set || '';
    if (!setsOf.has(s)) setsOf.set(s, new Map());
    const rowKey = design === 'nc1' || design === 'nc2' ? x.male : x.line;
    const colKey = design === 'nc1' || design === 'nc2' ? x.female : x.tester;
    const k = rowKey + '|' + colKey;
    const m = setsOf.get(s);
    if (!m.has(k)) m.set(k, { rowName: rowKey, colName: colKey, sum: 0, n: 0 });
    const c = m.get(k);
    c.sum += x.y; c.n++;
  });
  const sets = [];
  [...setsOf.keys()].sort(LM.natCmp).forEach(s => {
    const list = [...setsOf.get(s).values()];
    const rows = [...new Set(list.map(c => c.rowName))].sort(LM.natCmp);
    const cols = [...new Set(list.map(c => c.colName))].sort(LM.natCmp);
    const ri = new Map(rows.map((x, k) => [x, k])), ci = new Map(cols.map((x, k) => [x, k]));
    const cells = list.map(c => ({
      i: ri.get(c.rowName), j: ci.get(c.colName), male: ri.get(c.rowName),
      rowName: c.rowName, colName: c.colName, name: c.rowName + ' × ' + c.colName,
      y: c.sum / c.n, w: c.n, n: c.n,
    }));
    cells.sort((a, b) => a.i - b.i || a.j - b.j);
    sets.push({ set: s, rows, cols, cells, nMales: rows.length });
  });
  /* the parents evaluated beside the crosses, for heterosis */
  const parents = {};
  obs.forEach(x => {
    if (isCross(x)) return;
    const k = x.parent || x.entry;
    if (!parents[k]) parents[k] = { name: k, sum: 0, n: 0 };
    parents[k].sum += x.y; parents[k].n++;
  });
  Object.keys(parents).forEach(k => { parents[k].mean = parents[k].sum / parents[k].n; });
  return { sets, parents };
};

/* ================= 10 · the whole analysis ================= */
MD.analyse = o => {
  const design = o.design;
  const obs = o.obs;
  const out = { design, n: obs.length, issues: [], sets: o.sets || [], envs: o.envs || [] };
  if (!obs.length) { out.issues.push({ level: 'error', es: 'No hay datos.', en: 'There are no data.' }); return out; }
  const L = MD.layout(design, obs, o);
  out.layout = L;
  const y = obs.map(x => x.y);
  const A = MD.anova(L, y, {});
  out.mse = A.mse; out.dfe = A.dfe;
  out.rows = A.rows;
  out.fit = A.fit;
  if (!(A.dfe > 0)) { out.issues.push({ level: 'error', es: 'No quedan grados de libertad para el error.', en: 'No degrees of freedom are left for error.' }); return out; }
  /* expected mean squares and the moment estimators */
  const sources = L.sources;
  const coef = MD.emsCoefficients(L, sources, {});
  /* North Carolina III: the testers are fixed, so the interaction of an individual with them
     sums to zero over the testers (the restricted mixed model of Comstock & Robinson 1952) and
     does not enter the expectation of the individuals or of the sets. The traces treat it as
     an unrestricted random effect, which would test the individuals against the interaction
     instead of the error and contradict σ²A from the sums. The triple test cross is already
     written with contrasts that are orthogonal to the individuals. */
  if (coef && L.sources.some(s => s.key === 'plantTester')) {
    Object.keys(coef).forEach(src => { if (!/^(plantTester|tester|testerSet)$/.test(src) && coef[src].plantTester != null) coef[src].plantTester = 0; });
  }
  out.coef = coef;
  const msOf = {}, dfOf = {};
  A.rows.forEach(r => { msOf[r.source] = r.ms; dfOf[r.source] = r.df; });
  msOf.error = A.mse; dfOf.error = A.dfe;
  if (coef) {
    MD.tests(A.rows, coef, sources, A.mse, A.dfe, {});
    out.components = MD.components(A.rows, coef, sources, A.mse, A.dfe, {});
  } else {
    out.issues.push({ level: 'warning', es: 'El diseño tiene demasiados niveles para calcular los coeficientes exactos de los cuadrados medios esperados.', en: 'The design has too many levels to compute the exact coefficients of the expected mean squares.' });
    A.rows.forEach(r => { r.F = r.ms / A.mse; r.p = 1 - S.pf(r.F, r.df, A.dfe); r.denom = 'error'; r.dfDen = A.dfe; });
  }
  /* the effects: constrained least squares on the cell means, with the number of plots as
     weights, so the variance of a unit-weight observation is the error mean square itself */
  out.cells = MD.cellMeans(design, obs, o);
  if (design === 'nc1') {
    out.effects = out.cells.sets.map(g => MD.nestedEffects(g.cells, g.nMales, A.mse, A.dfe));
  } else if (design === 'nc2' || design === 'lxt') {
    out.effects = out.cells.sets.map(g => MD.factorialEffects(g.cells, g.rows.length, g.cols.length, A.mse, A.dfe));
  }
  if (design === 'nc3' || design === 'ttc') {
    out.sd = MD.sumsAndDifferences(obs, { testers: o.testers || out.layout.testerF.levels, mse: A.mse, dfe: A.dfe, r: o.r || 1 });
    /* the heritabilities come from the sums and differences, which are the unambiguous
       estimators of this design */
    if (isFinite(out.sd.s2A)) {
      out.genetic = MD.finishGenetic({
        design, F: o.F == null ? 0 : o.F, notes: [],
        s2A: out.sd.s2A, seA: out.sd.seA, s2D: out.sd.s2D, seD: out.sd.seD,
        covHS: out.sd.s2A / 4, covFS: out.sd.s2A / 2 + out.sd.s2D,
      }, Object.assign({}, o, { plotMse: A.mse }));
      out.genetic.fromSums = true;
    }
  }
  if (out.components && !out.sd) {
    out.genetic = MD.genetic(design, out.components, Object.assign({}, o, { msOf, dfOf, plotMse: A.mse }));
    /* the interaction with environments, expressed as variances of the same kind */
    const gi = k => { const c = out.components.find(x => x.key === k); return c ? c.value : NaN; };
    const F = o.F == null ? 0 : o.F;
    const pairs = { nc1: ['maleEnv', 'femaleEnv'], nc2: ['maleEnv', 'maleFemaleEnv'], lxt: ['lineEnv', 'lineTesterEnv'], partial: ['gcaEnv', 'scaEnv'] }[design];
    if (pairs && isFinite(gi(pairs[0]))) {
      out.genetic.s2AE = 4 * gi(pairs[0]) / (1 + F);
      out.genetic.s2DE = 4 * gi(pairs[1]) / ((1 + F) * (1 + F));
      MD.finishGenetic(out.genetic, Object.assign({}, o, { plotMse: A.mse }));
    }
  }
  /* heterosis over the parents that were evaluated in the same trial */
  if (Object.keys(out.cells.parents).length >= 2) {
    const all = [];
    out.cells.sets.forEach(g => g.cells.forEach(c => all.push(c)));
    out.heterosis = MD.heterosis(all, out.cells.parents, { mse: A.mse, df: A.dfe, r: o.r || 1, alpha: o.alpha, goal: o.goal });
  }
  /* the proportional contribution of every source to the variation among crosses */
  const cross = { nc1: ['male', 'female'], nc2: ['male', 'female', 'maleFemale'], lxt: ['line', 'tester', 'lineTester'], partial: ['gca', 'sca'], nc3: ['plant', 'tester', 'plantTester'], ttc: ['plant', 'tester', 'plantTester'] }[design] || [];
  const ssOf = k => { const r = A.rows.find(x => x.source === k); return r ? r.ss : 0; };
  const totalCross = cross.reduce((s, k) => s + ssOf(k), 0);
  out.contribution = cross.map(k => ({ source: k, ss: ssOf(k), pct: totalCross > 0 ? 100 * ssOf(k) / totalCross : NaN }));
  return out;
};

window.MD = MD;
