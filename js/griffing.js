/* BreedingPro — Block 4 engine: Griffing's (1956) diallel analyses,
   four methods × two models, in one environment and across environments.

   Method 1 parents + F1 + reciprocals (p² cells)   Method 3 F1 + reciprocals
   Method 2 parents + one F1 per pair               Method 4 one F1 per pair

   Everything is computed from one linear model on the cell means, weighted by the
   number of plots of each cell, with Griffing's own restrictions imposed exactly:
     Σ g_i = 0;  s_ij = s_ji;  r_ij = −r_ji
     Method 1:  Σ_j s_ij = 0 (s_ii counted once)
     Method 2:  2 s_ii + Σ_{j≠i} s_ij = 0
     Methods 3, 4:  Σ_{j≠i} s_ij = 0
     reciprocals split into maternal and non-maternal (Cockerham 1963):
     r_ij = m_i − m_j + n_ij, Σ m_i = 0, Σ_j n_ij = 0
   The estimates are obtained on a basis of the null space of the restrictions, so
   they are exact for balanced complete data (they reproduce Griffing's closed
   forms and the published standard errors) and remain valid, with the right
   standard errors, when crosses are missing or replication is unequal.

   Sums of squares are sequential (type I) on over-parameterised incidence
   matrices, which gives Griffing's orthogonal partition for balanced data and
   type-I sums of squares otherwise. Weights are the numbers of plots, so the sums
   of squares are on the plot scale; dividing by r gives the entry-mean scale.

   Model II (random parents) uses the expected mean squares of Griffing's tables;
   variance components come from the moment estimators, with standard errors from
   the variances of the mean squares (2 MS²/df). */

const Griffing = {};

Griffing.METHODS = {
  1: { es: 'Método 1: progenitores, F₁ y recíprocas', en: 'Method 1: parents, F₁ and reciprocals', selfs: true, recip: true },
  2: { es: 'Método 2: progenitores y F₁', en: 'Method 2: parents and F₁', selfs: true, recip: false },
  3: { es: 'Método 3: F₁ y recíprocas', en: 'Method 3: F₁ and reciprocals', selfs: false, recip: true },
  4: { es: 'Método 4: solo F₁', en: 'Method 4: F₁ only', selfs: false, recip: false },
};
Griffing.SOURCES = {
  env: { es: 'Ambientes', en: 'Environments' },
  gca: { es: 'Aptitud combinatoria general (ACG)', en: 'General combining ability (GCA)' },
  sca: { es: 'Aptitud combinatoria específica (ACE)', en: 'Specific combining ability (SCA)' },
  rec: { es: 'Efectos recíprocos', en: 'Reciprocal effects' },
  mat: { es: '  Maternos', en: '  Maternal' },
  nonmat: { es: '  No maternos', en: '  Non-maternal' },
  gcaEnv: { es: 'ACG × ambientes', en: 'GCA × environments' },
  scaEnv: { es: 'ACE × ambientes', en: 'SCA × environments' },
  recEnv: { es: 'Recíprocos × ambientes', en: 'Reciprocal × environments' },
  matEnv: { es: '  Maternos × ambientes', en: '  Maternal × environments' },
  nonmatEnv: { es: '  No maternos × ambientes', en: '  Non-maternal × environments' },
  entries: { es: 'Entradas', en: 'Entries' },
  entriesEnv: { es: 'Entradas × ambientes', en: 'Entries × environments' },
  error: { es: 'Error experimental', en: 'Experimental error' },
  total: { es: 'Total', en: 'Total' },
};

/* ---------------- parameter layout ---------------- */
function layout(p, method, nEnv) {
  const M = Griffing.METHODS[method];
  const pairs = [], pairIx = new Map();
  for (let i = 0; i < p; i++) for (let j = i; j < p; j++) {
    if (i === j && !M.selfs) continue;
    pairIx.set(i + '|' + j, pairs.length); pairs.push([i, j]);
  }
  const off = { mu: 0, g: 1, s: 1 + p };
  let m = off.s + pairs.length;
  const rpairs = [], rpairIx = new Map();
  if (M.recip) {
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) { rpairIx.set(i + '|' + j, rpairs.length); rpairs.push([i, j]); }
    off.m = m; m += p;
    off.n = m; m += rpairs.length;
  }
  if (nEnv > 1) { off.env = m; m += nEnv; }
  return { p, method, M, pairs, pairIx, rpairs, rpairIx, off, m, nEnv: nEnv || 1, sIx: (i, j) => pairIx.get(Math.min(i, j) + '|' + Math.max(i, j)), nIx: (i, j) => rpairIx.get(Math.min(i, j) + '|' + Math.max(i, j)) };
}
/* restrictions as rows of length m; L.omit holds parameters assumed to be zero
   (the specific effects of crosses that were not made, and the non-maternal effect
   of a pair evaluated in only one direction) */
function restrictions(L) {
  const { p, method, M, pairs, off, m } = L;
  const rows = [];
  const zero = () => new Float64Array(m);
  let r = zero(); for (let i = 0; i < p; i++) r[off.g + i] = 1; rows.push(r);          // Σ g = 0
  for (let i = 0; i < p; i++) {
    r = zero();
    for (let j = 0; j < p; j++) {
      if (i === j) { if (!M.selfs) continue; r[off.s + L.sIx(i, i)] += method === 2 ? 2 : 1; }
      else r[off.s + L.sIx(i, j)] += 1;
    }
    rows.push(r);
  }
  if (L.nEnv > 1) { r = zero(); for (let e = 0; e < L.nEnv; e++) r[off.env + e] = 1; rows.push(r); }
  if (M.recip) {
    r = zero(); for (let i = 0; i < p; i++) r[off.m + i] = 1; rows.push(r);            // Σ m = 0
    for (let i = 0; i < p; i++) {
      r = zero();
      for (let j = 0; j < p; j++) if (j !== i) r[off.n + L.nIx(i, j)] += i < j ? 1 : -1;  // n antisymmetric
      rows.push(r);
    }
  }
  (L.omit || []).forEach(a => { const z = zero(); z[a] = 1; rows.push(z); });
  return rows;
}
/* one row of the design for a cell (female i, male j) */
function designRow(L, i, j, env) {
  const x = new Float64Array(L.m);
  x[L.off.mu] = 1;
  if (L.nEnv > 1 && env >= 0) x[L.off.env + env] = 1;
  x[L.off.g + i] += 1; x[L.off.g + j] += 1;
  x[L.off.s + L.sIx(i, j)] += 1;
  if (L.M.recip && i !== j) {
    x[L.off.m + i] += 1; x[L.off.m + j] -= 1;
    x[L.off.n + L.nIx(i, j)] += i < j ? 1 : -1;
  }
  return x;
}

/* ---------------- constrained weighted least squares ----------------
   The generic solver of linmod.js does the work: null space of the restrictions,
   weighted normal equations swept with a tolerance (Griffing's models are
   saturated, so a missing cross always costs estimability somewhere). */
function fitEffects(cells, L, sigma2) {
  return LM.constrained(cells.map(c => designRow(L, c.i, c.j, c.envIdx)), cells.map(c => c.y), cells.map(c => c.w), restrictions(L), sigma2);
}
/* ---------------- effects with standard errors ---------------- */
/* sigmaFor(kind) → { sigma2, df, against }: the variance and degrees of freedom that
   test each kind of effect (the pooled error, or the interaction mean square when
   environments are random) */
function effects(cells, L, sigmaFor, alpha) {
  const fit = fitEffects(cells, L, 1);
  if (!fit) return null;
  const { p, off } = L;
  const sig = k => sigmaFor(k) || { sigma2: NaN, df: 0 };
  const mkFor = kind => (est, v0, extra, Lmap) => {
    const s = sig(kind);
    const ok = !Lmap || fit.full || fit.estimable(Lmap);
    const se = ok ? Math.sqrt(Math.max(0, v0 * s.sigma2)) : NaN;
    const t = ok && se > 0 ? est / se : NaN;
    return Object.assign({ est: ok ? est : NaN, se, t, df: s.df, against: s.against, estimable: ok, p: isFinite(t) && s.df > 0 ? 2 * (1 - S.pt(Math.abs(t), s.df)) : NaN }, extra || {});
  };
  const one = a => new Map([[a, 1]]);
  const mk1 = mkFor('mu'), mkG = mkFor('gca'), mkS = mkFor('sca'), mkM = mkFor('mat'), mkN = mkFor('nonmat'), mkR = mkFor('rec');
  const tcrit = sig('gca').df > 0 ? S.qt(1 - (alpha || 0.05) / 2, sig('gca').df) : NaN;
  const out = { mu: mk1(fit.theta[off.mu], fit.varOf(one(off.mu)), null, one(off.mu)), tcrit, dfe: sig('gca').df, sigmaFor, full: fit.full };
  out.gca = [];
  for (let i = 0; i < p; i++) out.gca.push(mkG(fit.theta[off.g + i], fit.varOf(one(off.g + i)), { parent: i }, one(off.g + i)));
  out.sca = L.pairs.map(([i, j], idx) => mkS(fit.theta[off.s + idx], fit.varOf(one(off.s + idx)), { i, j, self: i === j }, one(off.s + idx)));
  if (L.M.recip) {
    out.maternal = [];
    for (let i = 0; i < p; i++) out.maternal.push(mkM(fit.theta[off.m + i], fit.varOf(one(off.m + i)), { parent: i }, one(off.m + i)));
    out.nonmaternal = L.rpairs.map(([i, j], idx) => mkN(fit.theta[off.n + idx], fit.varOf(one(off.n + idx)), { i, j }, one(off.n + idx)));
    out.recip = L.rpairs.map(([i, j]) => {
      const Lm = new Map([[off.m + i, 1], [off.m + j, -1], [off.n + L.nIx(i, j), 1]]);
      return mkR(fit.estOf(Lm), fit.varOf(Lm), { i, j }, Lm);
    });
  }
  /* differences: average SE and LSD of each kind */
  const diffs = [];
  const pairSE = (a, b, kind) => Math.sqrt(Math.max(0, fit.varOf(new Map([[a, 1], [b, -1]])) * sig(kind || 'gca').sigma2));
  const avg = list => (list.length ? list.reduce((s, v) => s + v * v, 0) / list.length : NaN);
  const gDiff = [];
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) gDiff.push(pairSE(off.g + i, off.g + j, 'gca'));
  if (gDiff.length) diffs.push({ key: 'gca', es: 'Entre dos efectos de ACG (ĝᵢ − ĝⱼ)', en: 'Between two GCA effects (ĝᵢ − ĝⱼ)', se: Math.sqrt(avg(gDiff)), n: gDiff.length });
  const share = [], apart = [], selfPairs = [];
  L.pairs.forEach(([i, j], a) => L.pairs.forEach(([k, l], b) => {
    if (b <= a) return;
    const se = pairSE(off.s + a, off.s + b, 'sca');
    const isSelf = i === j || k === l;
    const common = [i, j].some(x => [k, l].includes(x));
    if (isSelf) selfPairs.push(se); else if (common) share.push(se); else apart.push(se);
  }));
  if (share.length) diffs.push({ key: 'scaShare', es: 'Entre dos ACE con un progenitor común (ŝᵢⱼ − ŝᵢₖ)', en: 'Between two SCA effects sharing a parent (ŝᵢⱼ − ŝᵢₖ)', se: Math.sqrt(avg(share)), n: share.length });
  if (apart.length) diffs.push({ key: 'scaApart', es: 'Entre dos ACE sin progenitor común (ŝᵢⱼ − ŝₖₗ)', en: 'Between two SCA effects with no parent in common (ŝᵢⱼ − ŝₖₗ)', se: Math.sqrt(avg(apart)), n: apart.length });
  if (selfPairs.length) diffs.push({ key: 'scaSelf', es: 'Diferencias que incluyen un ŝᵢᵢ', en: 'Differences involving an ŝᵢᵢ', se: Math.sqrt(avg(selfPairs)), n: selfPairs.length });
  if (L.M.recip) {
    const rd = [];
    L.rpairs.forEach((x, a) => L.rpairs.forEach((y, b) => { if (b > a) rd.push(pairSE(off.n + a, off.n + b, 'nonmat')); }));
    if (rd.length) diffs.push({ key: 'nonmat', es: 'Entre dos efectos no maternos (n̂ᵢⱼ − n̂ₖₗ)', en: 'Between two non-maternal effects (n̂ᵢⱼ − n̂ₖₗ)', se: Math.sqrt(avg(rd)), n: rd.length });
    const md = [];
    for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) md.push(pairSE(off.m + i, off.m + j, 'mat'));
    if (md.length) diffs.push({ key: 'mat', es: 'Entre dos efectos maternos (m̂ᵢ − m̂ⱼ)', en: 'Between two maternal effects (m̂ᵢ − m̂ⱼ)', se: Math.sqrt(avg(md)), n: md.length });
  }
  diffs.forEach(d => { d.lsd = tcrit * d.se; });
  out.diffs = diffs;
  out.fit = fit;
  return out;
}

/* ---------------- sums of squares ---------------- */
/* over-parameterised incidence columns, as covariate groups for LM.fit */
function anovaTerms(cells, L, envFac) {
  const n = cells.length, p = L.p;
  const terms = [{ kind: 'intercept', name: '(intercept)' }];
  const col = (fn, name, group) => ({ kind: 'covariate', x: Array.from({ length: n }, (_, k) => fn(cells[k])), name, group });
  const blocks = [];
  if (envFac) terms.push({ kind: 'main', f: envFac, name: 'env', group: 'env' });
  const gcaCols = [];
  for (let i = 0; i < p; i++) gcaCols.push(col(c => (c.i === i ? 1 : 0) + (c.j === i ? 1 : 0), 'g' + i, 'gca'));
  const scaCols = L.pairs.map(([i, j], idx) => col(c => (L.sIx(c.i, c.j) === idx ? 1 : 0), 's' + i + '_' + j, 'sca'));
  const matCols = [], nonCols = [];
  if (L.M.recip) {
    for (let i = 0; i < p; i++) matCols.push(col(c => (c.i === c.j ? 0 : (c.i === i ? 1 : 0) - (c.j === i ? 1 : 0)), 'm' + i, 'mat'));
    L.rpairs.forEach(([i, j], idx) => nonCols.push(col(c => (c.i === c.j || L.nIx(c.i, c.j) !== idx ? 0 : (c.i < c.j ? 1 : -1)), 'n' + i + '_' + j, 'nonmat')));
  }
  const gen = [['gca', gcaCols], ['sca', scaCols]].concat(L.M.recip ? [['mat', matCols], ['nonmat', nonCols]] : []);
  gen.forEach(([, cols]) => cols.forEach(c => terms.push(c)));
  blocks.push(...gen.map(([g]) => g));
  if (envFac) {
    /* interactions: every genetic column times every environment indicator */
    const E = envFac.levels.length;
    gen.forEach(([g, cols]) => {
      const key = g + 'Env';
      cols.forEach(c => {
        for (let e = 0; e < E; e++) terms.push({ kind: 'covariate', name: c.name + ':E' + e, group: key, x: c.x.map((v, k) => (envFac.codes[k] === e ? v : 0)) });
      });
      blocks.push(key);
    });
  }
  return { terms, blocks };
}

function anovaOf(cells, L, o) {
  const envFac = o.envFac || null;
  const { terms } = anovaTerms(cells, L, envFac);
  const y = cells.map(c => c.y), w = cells.map(c => c.w);
  const fit = LM.fit(terms, y, { weights: w });
  const rows = [];
  fit.lines.forEach(l => { if (l.kind === 'intercept') return; rows.push({ source: l.group || l.name, df: l.df, ss: l.ss, ms: l.df > 0 ? l.ss / l.df : NaN }); });
  return { rows, fit };
}

/* ---------------- Model II: expected mean squares and components ---------------- */
Griffing.coefficients = (p, method) => (
  method === 1 ? { cg: 2 * p, csG: 2 * (p - 1) / p, csS: 2 * (p * p - p + 1) / (p * p), exactG: false }
    : method === 2 ? { cg: p + 2, csG: 1, csS: 1, exactG: true }
      : method === 3 ? { cg: 2 * (p - 2), csG: 2, csS: 2, exactG: true }
        : { cg: p - 2, csG: 1, csS: 1, exactG: true });

/* variance of a linear combination of mean squares: Var(Σ c_i M_i) = Σ c_i² 2 M_i²/df_i */
const varComb = terms => Math.sqrt(terms.reduce((s, [c, ms, df]) => s + (df > 0 ? c * c * 2 * ms * ms / df : 0), 0));

function componentsSingle(ms, p, method, F) {
  /* ms: { gca, sca, rec, mat, nonmat, error } on the entry-mean scale, with df */
  const C = Griffing.coefficients(p, method);
  const out = [], get = k => ms[k] || null;
  const g = get('gca'), s = get('sca'), e = get('error');
  if (!g || !s || !e) return out;
  let s2g, seG, s2s, seS;
  if (method === 1) {
    const den = p * p - p + 1;
    s2s = p * p * (s.ms - e.ms) / (2 * den);
    seS = p * p / (2 * den) * varComb([[1, s.ms, s.df], [-1, e.ms, e.df]]);
    s2g = (g.ms - (e.ms + p * (p - 1) * s.ms) / den) / (2 * p);
    seG = varComb([[1 / (2 * p), g.ms, g.df], [-1 / (2 * p * den), e.ms, e.df], [-p * (p - 1) / (2 * p * den), s.ms, s.df]]);
  } else {
    const cs = C.csS;
    s2s = (s.ms - e.ms) / cs;
    seS = varComb([[1 / cs, s.ms, s.df], [-1 / cs, e.ms, e.df]]);
    s2g = (g.ms - s.ms) / C.cg;
    seG = varComb([[1 / C.cg, g.ms, g.df], [-1 / C.cg, s.ms, s.df]]);
  }
  out.push({ key: 'g', es: 'σ²ACG', en: 'σ²GCA', value: s2g, se: seG });
  out.push({ key: 's', es: 'σ²ACE', en: 'σ²SCA', value: s2s, se: seS });
  const r = get('rec');
  if (r) {
    out.push({ key: 'r', es: 'σ²recíprocos', en: 'σ²reciprocal', value: (r.ms - e.ms) / 2, se: varComb([[0.5, r.ms, r.df], [-0.5, e.ms, e.df]]) });
    const mt = get('mat'), nm = get('nonmat');
    if (mt && nm) {
      out.push({ key: 'm', es: 'σ²maternos', en: 'σ²maternal', value: (mt.ms - nm.ms) / (2 * p), se: varComb([[1 / (2 * p), mt.ms, mt.df], [-1 / (2 * p), nm.ms, nm.df]]) });
      out.push({ key: 'n', es: 'σ²no maternos', en: 'σ²non-maternal', value: (nm.ms - e.ms) / 2, se: varComb([[0.5, nm.ms, nm.df], [-0.5, e.ms, e.df]]) });
    }
  }
  out.push({ key: 'e', es: 'σ²error (media de entrada)', en: 'σ²error (entry mean)', value: e.ms, se: varComb([[1, e.ms, e.df]]) });
  return out;
}

function componentsMulti(ms, p, method, e) {
  const C = Griffing.coefficients(p, method);
  const out = [];
  const g = ms.gca, s = ms.sca, ge = ms.gcaEnv, se = ms.scaEnv, err = ms.error;
  if (!g || !s || !ge || !se || !err) return out;
  const s2se = (se.ms - err.ms) / C.csS;
  const s2ge = (ge.ms - se.ms) / C.cg;
  const s2s = (s.ms - se.ms) / (e * C.csS);
  const s2g = (g.ms - ge.ms - s.ms + se.ms) / (e * C.cg);
  out.push({ key: 'g', es: 'σ²ACG', en: 'σ²GCA', value: s2g, se: varComb([[1 / (e * C.cg), g.ms, g.df], [-1 / (e * C.cg), ge.ms, ge.df], [-1 / (e * C.cg), s.ms, s.df], [1 / (e * C.cg), se.ms, se.df]]) });
  out.push({ key: 's', es: 'σ²ACE', en: 'σ²SCA', value: s2s, se: varComb([[1 / (e * C.csS), s.ms, s.df], [-1 / (e * C.csS), se.ms, se.df]]) });
  out.push({ key: 'ge', es: 'σ²ACG × ambiente', en: 'σ²GCA × environment', value: s2ge, se: varComb([[1 / C.cg, ge.ms, ge.df], [-1 / C.cg, se.ms, se.df]]) });
  out.push({ key: 'se', es: 'σ²ACE × ambiente', en: 'σ²SCA × environment', value: s2se, se: varComb([[1 / C.csS, se.ms, se.df], [-1 / C.csS, err.ms, err.df]]) });
  if (ms.rec && ms.recEnv) {
    out.push({ key: 'r', es: 'σ²recíprocos', en: 'σ²reciprocal', value: (ms.rec.ms - ms.recEnv.ms) / (2 * e), se: varComb([[1 / (2 * e), ms.rec.ms, ms.rec.df], [-1 / (2 * e), ms.recEnv.ms, ms.recEnv.df]]) });
    out.push({ key: 're', es: 'σ²recíprocos × ambiente', en: 'σ²reciprocal × environment', value: (ms.recEnv.ms - err.ms) / 2, se: varComb([[0.5, ms.recEnv.ms, ms.recEnv.df], [-0.5, err.ms, err.df]]) });
  }
  out.push({ key: 'e', es: 'σ²error (media de entrada)', en: 'σ²error (entry mean)', value: err.ms, se: varComb([[1, err.ms, err.df]]) });
  return out;
}

/* genetic parameters from the components */
Griffing.genetic = (comps, o) => {
  const get = k => { const c = comps.find(x => x.key === k); return c ? c.value : NaN; };
  const s2g = get('g'), s2s = get('s'), s2e = get('e'), s2r = get('r');
  const F = o.F == null ? 1 : o.F;
  const s2A = 4 * s2g / (1 + F), s2D = 4 * s2s / ((1 + F) * (1 + F));
  const r = o.r || 1, e = o.e || 1;
  const s2ge = get('ge'), s2se = get('se');
  const gxe = isFinite(s2ge) ? s2ge : 0, sxe = isFinite(s2se) ? s2se : 0;
  const plotErr = o.plotMse != null ? o.plotMse : s2e * r;
  const varP = s2A + s2D + (isFinite(s2ge) ? 4 * gxe / (1 + F) + 4 * sxe / ((1 + F) * (1 + F)) : 0) + plotErr;
  const varPmean = s2A + s2D + (isFinite(s2ge) ? (4 * gxe / (1 + F) + 4 * sxe / ((1 + F) * (1 + F))) / e : 0) + plotErr / (r * e);
  const obs = 2 * s2g + s2s + (isFinite(s2r) ? s2r : 0) + plotErr;
  /* ratios and heritabilities only make sense with non-negative components */
  const okA = s2A > 0, okD = s2D >= 0;
  return {
    F, s2g, s2s, s2r, s2A, s2D, negative: !okA || !okD,
    baker: s2g > 0 && 2 * s2g + s2s > 0 ? 2 * s2g / (2 * s2g + s2s) : NaN,
    bakerMS: o.msG != null && o.msS != null && o.msG > 0 && 2 * o.msG + o.msS > 0 ? 2 * o.msG / (2 * o.msG + o.msS) : NaN,
    ratio: s2s > 0 && s2g > 0 ? s2g / s2s : NaN,
    dominance: okA && okD ? Math.sqrt(2 * s2D / s2A) : NaN,
    h2ns: okA && varP > 0 ? s2A / varP : NaN, h2bs: okA && okD && varP > 0 ? (s2A + s2D) / varP : NaN,
    h2nsMean: okA && varPmean > 0 ? s2A / varPmean : NaN, h2bsMean: okA && okD && varPmean > 0 ? (s2A + s2D) / varPmean : NaN,
    varP, varPmean, varObs: obs, h2obs: obs > 0 ? s2A / obs : NaN,
    plotErr, r, e,
  };
};

/* ---------------- one analysis (single environment or across environments) ---------------- */
function oneAnalysis(cells, L, o) {
  const res = { method: L.method, p: L.p, cells: cells.length };
  const A = anovaOf(cells, L, { envFac: o.envFac });
  const r = o.r || 1;
  const e = o.e || 1;
  const msOf = {};
  A.rows.forEach(row => { msOf[row.source] = { ms: row.ms / r, ss: row.ss / r, df: row.df }; });   /* entry-mean scale */
  msOf.error = { ms: o.mse / r, df: o.dfe };
  const rows = A.rows.map(row => Object.assign({}, row));
  /* entries and entries × environments as the sum of their parts */
  const sum = keys => {
    const parts = rows.filter(x => keys.includes(x.source));
    if (!parts.length) return null;
    const df = parts.reduce((s, x) => s + x.df, 0), ss = parts.reduce((s, x) => s + x.ss, 0);
    return { df, ss, ms: df > 0 ? ss / df : NaN };
  };
  res.entries = sum(['gca', 'sca', 'mat', 'nonmat']);
  res.entriesEnv = sum(['gcaEnv', 'scaEnv', 'matEnv', 'nonmatEnv']);
  if (L.M.recip) {
    const rec = sum(['mat', 'nonmat']);
    if (rec) rows.splice(rows.findIndex(x => x.source === 'mat'), 0, Object.assign({ source: 'rec' }, rec));
    const recEnv = sum(['matEnv', 'nonmatEnv']);
    if (recEnv) rows.splice(rows.findIndex(x => x.source === 'matEnv'), 0, Object.assign({ source: 'recEnv' }, recEnv));
    rows.forEach(x => { if (['mat', 'nonmat', 'matEnv', 'nonmatEnv'].includes(x.source)) x.sub = true; });
    if (rec) msOf.rec = { ms: rec.ms / r, df: rec.df };
    if (recEnv) msOf.recEnv = { ms: recEnv.ms / r, df: recEnv.df };
  }
  /* F tests under three scenarios:
       I  = genetic effects and environments fixed → everything against the error
       E  = genetic effects fixed, environments random → each term against its interaction
       II = all random (Model II) → Griffing's denominators, with a quasi-F for GCA
            across environments (Satterthwaite) */
  const msFor = k => (k === 'error' ? { ms: o.mse, df: o.dfe } : rows.find(x => x.source === k));
  const den = { I: {}, E: {}, II: {} };
  rows.forEach(x => { den.I[x.source] = 'error'; den.E[x.source] = 'error'; den.II[x.source] = 'error'; });
  if (o.envFac) {
    ['gca', 'sca', 'rec', 'mat', 'nonmat'].forEach(k => { den.E[k] = k + 'Env'; });
    den.II.sca = 'scaEnv'; den.II.rec = 'recEnv'; den.II.mat = 'matEnv'; den.II.nonmat = 'nonmatEnv';
    den.II.gcaEnv = 'scaEnv';
  } else den.II.gca = 'sca';
  rows.forEach(x => {
    ['I', 'E', 'II'].forEach(mod => {
      const key = den[mod][x.source] || 'error';
      const d = msFor(key);
      if (!d || !(d.ms > 0) || !(x.df > 0)) return;
      const F = x.ms / d.ms;
      x['F' + mod] = F;
      x['p' + mod] = 1 - S.pf(F, x.df, d.df);
      x['den' + mod] = key;
    });
  });
  if (o.envFac) {
    /* GCA in the fully random model: M_GCA / (M_GCA×E + M_SCA − M_SCA×E) */
    const g = msFor('gca'), ge = msFor('gcaEnv'), s = msFor('sca'), se = msFor('scaEnv');
    if (g && ge && s && se) {
      const L2 = ge.ms + s.ms - se.ms;
      const dfL = L2 > 0 ? (L2 * L2) / (ge.ms * ge.ms / ge.df + s.ms * s.ms / s.df + se.ms * se.ms / se.df) : NaN;
      if (L2 > 0 && isFinite(dfL)) {
        g.FII = g.ms / L2; g.pII = 1 - S.pf(g.FII, g.df, dfL); g.denII = 'quasi'; g.dfQuasi = dfL;
      } else { g.FII = NaN; g.pII = NaN; g.denII = 'quasi'; }
    }
  }
  res.anova = rows;
  res.msMean = msOf;
  res.mse = o.mse; res.dfe = o.dfe; res.r = r; res.e = e;
  /* the weights are numbers of plots, so the variance of a unit-weight observation is
     the error mean square itself; with random environments each kind of effect is
     tested against its own interaction mean square */
  const errSig = { sigma2: o.mse, df: o.dfe, against: 'error' };
  const msSig = key => { const x = rows.find(z => z.source === key); return x && x.ms > 0 ? { sigma2: x.ms, df: x.df, against: key } : errSig; };
  const sigmaFor = kind => {
    if (!o.envFac || !o.envRandom) return errSig;
    return { gca: msSig('gcaEnv'), sca: msSig('scaEnv'), mat: msSig('matEnv'), nonmat: msSig('nonmatEnv'), rec: msSig('recEnv'), mu: msSig('env') }[kind] || errSig;
  };
  res.effects = effects(cells, L, sigmaFor, o.alpha);
  /* Model I "components" (quadratic forms of the fixed effects) */
  const C = Griffing.coefficients(L.p, L.method);
  res.modelI = [];
  if (msOf.gca) res.modelI.push({ key: 'g', es: 'Σĝᵢ²/(p − 1)', en: 'Σĝᵢ²/(p − 1)', value: (msOf.gca.ms - msOf.error.ms) / C.cg });
  if (msOf.sca) res.modelI.push({ key: 's', es: 'Σŝᵢⱼ² por grado de libertad', en: 'Σŝᵢⱼ² per degree of freedom', value: msOf.sca.ms - msOf.error.ms });
  if (msOf.rec) res.modelI.push({ key: 'r', es: 'Σr̂ᵢⱼ² por grado de libertad', en: 'Σr̂ᵢⱼ² per degree of freedom', value: (msOf.rec.ms - msOf.error.ms) / 2 });
  /* Model II components and genetic parameters */
  res.components = o.envFac ? componentsMulti(msOf, L.p, L.method, e) : componentsSingle(msOf, L.p, L.method, o.F);
  res.genetic = Griffing.genetic(res.components, { F: o.F, r, e, plotMse: o.mse, msG: msOf.gca ? msOf.gca.ms : null, msS: msOf.sca ? msOf.sca.ms : null });
  if (L.method === 1) res.approxGcaF = true;
  return res;
}

/* ---------------- predictions and rankings ---------------- */
Griffing.predictions = (res, L, parents, cells) => {
  const eff = res.effects;
  if (!eff) return null;
  const seen = new Map();
  cells.forEach(c => { const k = Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j); const v = seen.get(k) || { n: 0, sum: 0 }; v.n++; v.sum += c.y; seen.set(k, v); });
  const list = [];
  for (let i = 0; i < L.p; i++) for (let j = i + (L.M.selfs ? 0 : 1); j < L.p; j++) {
    const key = i + '|' + j;
    const obs = seen.get(key);
    const sIdx = L.pairIx.get(key);
    const sca = sIdx == null || !eff.sca[sIdx].estimable ? null : eff.sca[sIdx];
    const gi = eff.gca[i], gj = eff.gca[j];
    const Lgca = new Map([[L.off.mu, 1], [L.off.g + i, 1], [L.off.g + j, 1]]);
    const predG = eff.fit.estOf(Lgca);
    const seG = Math.sqrt(Math.max(0, eff.fit.varOf(Lgca)));
    const Lfull = new Map(Lgca);
    if (sca) Lfull.set(L.off.s + sIdx, 1);
    list.push({
      i, j, self: i === j,
      observed: obs ? obs.sum / obs.n : NaN, tested: !!obs,
      predictedGca: predG, seGca: seG, gcaEstimable: eff.fit.full || eff.fit.estimable(Lgca),
      predicted: sca ? eff.fit.estOf(Lfull) : predG,
      sePredicted: Math.sqrt(Math.max(0, eff.fit.varOf(Lfull))),
      sca: sca ? sca.est : NaN, scaSe: sca ? sca.se : NaN, scaP: sca ? sca.p : NaN,
      gcaSum: gi.est + gj.est,
    });
  }
  return list;
};

/* ---------------- entry point ---------------- */
/* o = { parents, cells: [{env, i, j, y, w}], method, envs: [{key, name, mse, dfe, r}],
        F, alpha, envFixed, byEnv } */
Griffing.analyse = o => {
  const p = o.parents.length;
  const L1 = layout(p, o.method);
  const L = L1;
  const issues = [];
  if (p < 3) issues.push({ level: 'error', es: 'Se necesitan al menos 3 progenitores.', en: 'At least 3 parents are needed.' });
  if ((o.method === 3 || o.method === 4) && p < 4) issues.push({ level: 'error', es: 'Los métodos 3 y 4 necesitan al menos 4 progenitores para estimar la ACE.', en: 'Methods 3 and 4 need at least 4 parents to estimate SCA.' });
  /* without reciprocal effects the orientation carries no information: the pair is
     ordered i ≤ j and, if both orientations are present, their means are pooled */
  let cells = o.cells.filter(c => c.i >= 0 && c.j >= 0 && isFinite(c.y) && (L.M.selfs || c.i !== c.j));
  let pooledPairs = 0;
  if (!L.M.recip) {
    const byKey = new Map();
    cells.forEach(c => {
      const key = c.env + '|' + Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j);
      const prev = byKey.get(key);
      if (!prev) byKey.set(key, Object.assign({}, c, { i: Math.min(c.i, c.j), j: Math.max(c.i, c.j) }));
      else { const w = prev.w + c.w; prev.y = (prev.y * prev.w + c.y * c.w) / w; prev.w = w; prev.pooled = true; pooledPairs++; }
    });
    cells = [...byKey.values()];
  }
  if (pooledPairs) issues.push({ level: 'info', es: `${plural(pooledPairs, 'pareja tenía', 'parejas tenían')} las dos orientaciones: sus medias se promediaron, porque este método no estima efectos recíprocos.`, en: `${plural(pooledPairs, 'pair had', 'pairs had')} both orientations: their means were pooled, because this method does not estimate reciprocal effects.` });
  const envKeys = [...new Set(cells.map(c => c.env))];
  const e = envKeys.length;
  const expected = o.method === 1 ? p * p : o.method === 2 ? p * (p + 1) / 2 : o.method === 3 ? p * (p - 1) : p * (p - 1) / 2;
  const perEnv = envKeys.map(k => cells.filter(c => c.env === k).length);
  const complete = perEnv.every(n => n === expected);
  const reps = [...new Set(cells.map(c => c.w))];
  const balanced = reps.length === 1;
  const rHarm = cells.length / cells.reduce((s, c) => s + 1 / c.w, 0);
  if (!complete) issues.push({ level: 'warning', es: `Faltan entradas del diseño (${perEnv.map(n => expected - n).join(', ')} de ${expected}): las sumas de cuadrados son secuenciales y los errores estándar se calculan para los datos que hay.`, en: `Entries are missing from the design (${perEnv.map(n => expected - n).join(', ')} of ${expected}): sums of squares are sequential and standard errors are computed for the data at hand.` });
  if (!balanced) issues.push({ level: 'info', es: `Las entradas no tienen el mismo número de parcelas (${Math.min(...reps)}–${Math.max(...reps)}); se usa mínimos cuadrados ponderados y r̄ = ${fmtNum(rHarm, 2)} (media armónica) en los componentes.`, en: `Entries do not have the same number of plots (${Math.min(...reps)}–${Math.max(...reps)}); weighted least squares is used and r̄ = ${fmtNum(rHarm, 2)} (harmonic mean) in the components.` });
  /* Griffing's models have as many parameters as cells, so anything the data cannot
     support is assumed to be zero and said so: the specific effect of a cross that
     was not made, and the non-maternal effect of a pair grown in one direction only. */
  const seenPair = new Map();
  cells.forEach(c => { const k = Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j); if (!seenPair.has(k)) seenPair.set(k, new Set()); seenPair.get(k).add(c.i <= c.j ? 'd' : 'r'); });
  const omit = [], omitted = { sca: [], nonmat: [] };
  L.pairs.forEach(([i, j], idx) => { if (!seenPair.has(i + '|' + j)) { omit.push(L.off.s + idx); omitted.sca.push([i, j]); } });
  if (L.M.recip) L.rpairs.forEach(([i, j], idx) => { const s = seenPair.get(i + '|' + j); if (!s || s.size < 2) { omit.push(L.off.n + idx); omitted.nonmat.push([i, j]); } });
  L.omit = omit;
  const nameOf = k => o.parents[k];
  if (omitted.sca.length) issues.push({ level: 'info', es: `Se supone ACE = 0 en ${plural(omitted.sca.length, 'cruza que no se hizo', 'cruzas que no se hicieron')} (${omitted.sca.slice(0, 6).map(([i, j]) => nameOf(i) + ' × ' + nameOf(j)).join(', ')}${omitted.sca.length > 6 ? '…' : ''}).`, en: `SCA is assumed to be zero for ${plural(omitted.sca.length, 'cross that was not made', 'crosses that were not made')} (${omitted.sca.slice(0, 6).map(([i, j]) => nameOf(i) + ' × ' + nameOf(j)).join(', ')}${omitted.sca.length > 6 ? '…' : ''}).` });
  if (omitted.nonmat.length) issues.push({ level: 'info', es: `Se supone efecto no materno = 0 en ${plural(omitted.nonmat.length, 'pareja evaluada', 'parejas evaluadas')} en un solo sentido; su efecto materno sí se estima.`, en: `The non-maternal effect is assumed to be zero for ${plural(omitted.nonmat.length, 'pair grown', 'pairs grown')} in one direction only; their maternal effect is still estimated.` });
  const out = { p, method: o.method, L, parents: o.parents.slice(), issues, complete, balanced, expected, cells, e, envKeys, r: rHarm, omitted };
  if (issues.some(i => i.level === 'error')) return out;

  /* error variance on the plot scale */
  const envList = (o.envs || []).filter(x => envKeys.includes(x.key));
  const pooled = envList.length ? { ms: envList.reduce((s, x) => s + x.mse * x.dfe, 0) / envList.reduce((s, x) => s + x.dfe, 0), df: envList.reduce((s, x) => s + x.dfe, 0) } : { ms: o.mse, df: o.dfe };
  out.pooledError = pooled;

  /* per environment */
  if (e > 1 || o.byEnv) {
    out.envs = envKeys.map(k => {
      const env = envList.find(x => x.key === k) || {};
      const sub = cells.filter(c => c.env === k);
      const rr = sub.length / sub.reduce((s, c) => s + 1 / c.w, 0);
      const one = oneAnalysis(sub, L, { mse: env.mse != null ? env.mse : pooled.ms, dfe: env.dfe != null ? env.dfe : pooled.df, r: rr, F: o.F, alpha: o.alpha });
      one.env = env.name || k; one.key = k;
      return one;
    });
  }
  /* main analysis: one environment, or the table of means across environments */
  if (e === 1) {
    const env = envList[0] || {};
    out.main = oneAnalysis(cells, L, { mse: env.mse != null ? env.mse : pooled.ms, dfe: env.dfe != null ? env.dfe : pooled.df, r: rHarm, F: o.F, alpha: o.alpha });
    out.main.env = env.name || envKeys[0];
  } else {
    const envFac = LM.factor(cells.map(c => String(c.env)));
    /* environments enter the model for the effects too, so they are estimated free of
       environment means even when a cross is missing in one environment */
    const Le = layout(p, o.method, e);
    Le.omit = omit;
    cells.forEach(c => { c.envIdx = envFac.codes[0] != null ? envFac.levels.indexOf(String(c.env)) : -1; });
    out.main = oneAnalysis(cells, Le, { mse: pooled.ms, dfe: pooled.df, r: rHarm, e, F: o.F, alpha: o.alpha, envFac, envRandom: o.envRandom });
    out.main.multiEnv = true;
    out.Le = Le;
  }
  out.predictions = Griffing.predictions(out.main, out.Le || L, o.parents, cells);
  return out;
};

/* the cells of a data set analysed as another method (subsets of the same table) */
Griffing.subset = (cells, method, o) => {
  o = o || {};
  const M = Griffing.METHODS[method];
  const out = [];
  const byKey = new Map();
  cells.forEach(c => {
    if (c.i === c.j) { if (M.selfs) out.push(c); return; }
    if (M.recip) { out.push(c); return; }
    const key = c.env + '|' + Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j);
    const prev = byKey.get(key);
    if (!prev) byKey.set(key, [c]); else prev.push(c);
  });
  byKey.forEach(list => {
    if (list.length === 1 || o.reciprocals !== 'average') {
      const direct = list.find(c => c.i < c.j) || list[0];
      out.push(Object.assign({}, direct, { i: Math.min(direct.i, direct.j), j: Math.max(direct.i, direct.j) }));
    } else {
      const w = list.reduce((s, c) => s + c.w, 0);
      const y = list.reduce((s, c) => s + c.y * c.w, 0) / w;
      out.push({ env: list[0].env, i: Math.min(list[0].i, list[0].j), j: Math.max(list[0].i, list[0].j), y, w, averaged: true });
    }
  });
  return out;
};

window.Griffing = Griffing;
