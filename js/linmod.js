/* BreedingPro — linear and mixed models for field trials.

   Fixed effects: least squares through the sweep operator on the cross-product
   matrix (Goodnight 1979). Terms are swept in order, so every term gets its
   sequential sum of squares; a column whose residual is null after the previous
   columns is aliased and skipped, which gives the right degrees of freedom for
   unbalanced data, empty cells and nested factors. From the swept matrix come the
   solutions, the generalised inverse, leverages, estimability checks and
   least-squares means with standard errors.

   Mixed models: REML variance components by average-information iterations
   (Gilmour, Thompson & Cullis 1995) on Henderson's mixed-model equations, with
   EM steps to start and step halving and bounds to keep every component
   non-negative. Dense matrices: ample for the few hundred parameters of a trial.

   Records enter as parallel arrays of level codes (Int32Array, −1 = absent) built
   with LM.factor; a term is
     { kind: 'intercept' }
     { kind: 'main', f }                   reference coding (first level dropped)
     { kind: 'nested', f, g }              levels of f inside each level of g
     { kind: 'cross', f, g }               interaction f × g
     { kind: 'covariate', x }              numeric column
   A record whose code is −1 for a term contributes no column to it. */

const LM = {};

LM.natCmp = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

LM.factor = (values, levels) => {
  const lv = levels ? levels.map(String) : [...new Set(values.filter(v => v != null && v !== '').map(String))].sort(LM.natCmp);
  const map = new Map(lv.map((l, i) => [l, i]));
  const codes = new Int32Array(values.length);
  values.forEach((v, i) => { codes[i] = v == null || v === '' || !map.has(String(v)) ? -1 : map.get(String(v)); });
  return { levels: lv, codes, map };
};
/* the factor restricted to some records (levels not observed there are dropped) */
LM.subset = (fac, idx) => LM.factor(Array.from(idx, i => fac.codes[i] < 0 ? '' : fac.levels[fac.codes[i]]), fac.levels.filter((l, k) => idx.some(i => fac.codes[i] === k)));
/* combine two factors into one (e.g. block inside replicate) */
LM.combine = (f, g, sep) => LM.factor(Array.from(f.codes, (c, i) => c < 0 || g.codes[i] < 0 ? '' : g.levels[g.codes[i]] + (sep || ' · ') + f.levels[c]));

/* ---------------- design ---------------- */
LM.design = (terms, n) => {
  const K = terms.length;
  const cols = new Int32Array(n * K).fill(-1), vals = new Float64Array(n * K);
  const out = { n, K, cols, vals, terms: [], names: [] };
  let d = 0;
  const firstOf = (codes, filter) => { let m = Infinity; for (let i = 0; i < n; i++) if (codes[i] >= 0 && (!filter || filter(i))) m = Math.min(m, codes[i]); return m; };
  terms.forEach((t, k) => {
    const T0 = Object.assign({}, t, { start: d, keys: new Map() });
    if (t.kind === 'intercept') { T0.keys.set('1', d); out.names.push('(intercept)'); for (let i = 0; i < n; i++) { cols[i * K + k] = d; vals[i * K + k] = 1; } d++; }
    else if (t.kind === 'covariate') { T0.keys.set('x', d); out.names.push(t.name || 'x'); for (let i = 0; i < n; i++) { cols[i * K + k] = d; vals[i * K + k] = t.x[i]; } d++; }
    else {
      /* collect the keys the data use, in a stable order, then number the columns */
      const keys = new Map();
      if (t.kind === 'main') {
        const first = firstOf(t.f.codes);
        T0.first = first;
        for (let i = 0; i < n; i++) { const a = t.f.codes[i]; if (a >= 0 && a !== first) keys.set(a, [a]); }
      } else if (t.kind === 'nested') {
        const firstIn = new Map();
        for (let i = 0; i < n; i++) { const a = t.f.codes[i], g = t.g.codes[i]; if (a < 0 || g < 0) continue; if (!firstIn.has(g) || a < firstIn.get(g)) firstIn.set(g, a); }
        T0.firstIn = firstIn;
        const L = t.f.levels.length;
        for (let i = 0; i < n; i++) { const a = t.f.codes[i], g = t.g.codes[i]; if (a < 0 || g < 0 || a === firstIn.get(g)) continue; keys.set(g * L + a, [g, a]); }
      } else if (t.kind === 'cross') {
        const fa = firstOf(t.f.codes), fb = firstOf(t.g.codes);
        T0.firstF = fa; T0.firstG = fb;
        const L = t.g.levels.length;
        for (let i = 0; i < n; i++) { const a = t.f.codes[i], b = t.g.codes[i]; if (a < 0 || b < 0 || a === fa || b === fb) continue; keys.set(a * L + b, [a, b]); }
      }
      [...keys.entries()].sort((x, y) => x[0] - y[0]).forEach(([key, parts]) => {
        T0.keys.set(key, d);
        const label = t.kind === 'main' ? t.f.levels[parts[0]] : t.kind === 'nested' ? t.g.levels[parts[0]] + ':' + t.f.levels[parts[1]] : t.f.levels[parts[0]] + ':' + t.g.levels[parts[1]];
        out.names.push((t.name || t.kind) + '[' + label + ']');
        d++;
      });
      for (let i = 0; i < n; i++) {
        let key = null;
        if (t.kind === 'main') { const a = t.f.codes[i]; if (a >= 0) key = a; }
        else if (t.kind === 'nested') { const a = t.f.codes[i], g = t.g.codes[i]; if (a >= 0 && g >= 0) key = g * t.f.levels.length + a; }
        else { const a = t.f.codes[i], b = t.g.codes[i]; if (a >= 0 && b >= 0) key = a * t.g.levels.length + b; }
        if (key != null && T0.keys.has(key)) { cols[i * K + k] = T0.keys.get(key); vals[i * K + k] = 1; }
      }
    }
    T0.end = d;
    out.terms.push(T0);
  });
  out.d = d;
  return out;
};
/* the columns a hypothetical record would use: codes = {termIndex: [a] or [a, b]} */
LM.columnOf = (T, parts) => {
  if (T.kind === 'intercept') return { col: T.start, ok: true };
  if (T.kind === 'main') { const a = parts[0]; if (a === T.first) return { col: -1, ok: true }; const c = T.keys.get(a); return { col: c == null ? -1 : c, ok: c != null }; }
  if (T.kind === 'nested') { const [a, g] = parts; if (a === T.firstIn.get(g)) return { col: -1, ok: true }; const c = T.keys.get(g * T.f.levels.length + a); return { col: c == null ? -1 : c, ok: c != null }; }
  if (T.kind === 'cross') { const [a, b] = parts; if (a === T.firstF || b === T.firstG) return { col: -1, ok: true }; const c = T.keys.get(a * T.g.levels.length + b); return { col: c == null ? -1 : c, ok: c != null }; }
  return { col: -1, ok: false };
};

/* ---------------- sweep ---------------- */
function sweepAt(A, m, k) {
  const dk = A[k * m + k], rk = k * m;
  for (let j = 0; j < m; j++) A[rk + j] /= dk;
  for (let i = 0; i < m; i++) {
    if (i === k) continue;
    const ri = i * m, b = A[ri + k];
    if (b === 0) continue;
    for (let j = 0; j < m; j++) A[ri + j] -= b * A[rk + j];
    A[ri + k] = -b / dk;
  }
  A[rk + k] = 1 / dk;
}
LM.crossprod = (D, y, w) => {
  const d = D.d, m = d + 1, A = new Float64Array(m * m), K = D.K;
  for (let i = 0; i < D.n; i++) {
    const wi = w ? w[i] : 1, yi = y[i];
    for (let a = 0; a < K; a++) {
      const ca = D.cols[i * K + a]; if (ca < 0) continue;
      const va = D.vals[i * K + a] * wi;
      for (let b = 0; b < K; b++) { const cb = D.cols[i * K + b]; if (cb >= 0) A[ca * m + cb] += va * D.vals[i * K + b]; }
      A[ca * m + d] += va * yi;
      A[d * m + ca] += va * yi;
    }
    A[d * m + d] += wi * yi * yi;
  }
  return A;
};

/* Least-squares fit with sequential (type I) sums of squares.
   Returns the ANOVA lines of every term, the residual, solutions, generalised
   inverse (swept block), fitted values, residuals and leverages. */
LM.fit = (terms, y, o) => {
  o = o || {};
  const n = y.length;
  const D = LM.design(terms, n);
  const d = D.d, m = d + 1;
  const A = LM.crossprod(D, y, o.weights);
  const orig = new Float64Array(d);
  for (let j = 0; j < d; j++) orig[j] = A[j * m + j];
  const swept = new Uint8Array(d);
  const tol = o.tol || 1e-9;
  const lines = [];
  let rss = A[d * m + d], rank = 0;
  D.terms.forEach((T, k) => {
    let df = 0;
    for (let j = T.start; j < T.end; j++) {
      if (!(orig[j] > 0) || A[j * m + j] <= tol * orig[j]) continue;
      sweepAt(A, m, j); swept[j] = 1; df++;
    }
    const now = A[d * m + d];
    lines.push({ term: k, name: T.name, kind: T.kind, df, ss: Math.max(0, rss - now) });
    rss = now; rank += df;
  });
  /* terms that share a `group` (e.g. the p − 1 columns of GCA) make one ANOVA line */
  const grouped = [];
  lines.forEach(l => {
    const g = terms[l.term].group;
    const prev = grouped[grouped.length - 1];
    if (g && prev && prev.group === g) { prev.df += l.df; prev.ss += l.ss; prev.lastTerm = l.term; }
    else grouped.push(Object.assign({}, l, { group: g, lastTerm: l.term }));
  });
  if (grouped.length !== lines.length) { lines.length = 0; grouped.forEach(l => lines.push(l)); }
  const sse = Math.max(0, rss), dfe = n - rank;
  const mse = dfe > 0 ? sse / dfe : NaN;
  const b = new Float64Array(d);
  for (let j = 0; j < d; j++) b[j] = swept[j] ? A[j * m + d] : 0;
  const fitted = new Float64Array(n), resid = new Float64Array(n), hat = new Float64Array(n);
  const K = D.K;
  for (let i = 0; i < n; i++) {
    let f = 0, h = 0;
    for (let a = 0; a < K; a++) {
      const ca = D.cols[i * K + a]; if (ca < 0 || !swept[ca]) continue;
      const va = D.vals[i * K + a];
      f += va * b[ca];
      for (let c = 0; c < K; c++) { const cc = D.cols[i * K + c]; if (cc >= 0 && swept[cc]) h += va * D.vals[i * K + c] * A[ca * m + cc]; }
    }
    fitted[i] = f; resid[i] = y[i] - f; hat[i] = h;
  }
  return { D, A, m, swept, lines, sse, dfe, mse, rank, b, fitted, resid, hat, n, y };
};

/* F tests for the ANOVA lines: every term against the residual unless a
   denominator term is named, e.g. { 3: 2 } tests term 3 against term 2 */
LM.anovaTable = (fit, labels, denominators) => {
  const rows = fit.lines.filter(l => l.kind !== 'intercept').map(l => ({ term: l.term, source: labels ? labels[l.term] : l.name, df: l.df, ss: l.ss, ms: l.df > 0 ? l.ss / l.df : NaN }));
  rows.forEach(r => {
    const den = denominators && denominators[r.term] != null ? rows.find(x => x.term === denominators[r.term]) : null;
    const msd = den ? den.ms : fit.mse, dfd = den ? den.df : fit.dfe;
    r.F = r.df > 0 && msd > 0 ? r.ms / msd : NaN;
    r.p = isFinite(r.F) && dfd > 0 ? 1 - S.pf(r.F, r.df, dfd) : NaN;
    r.against = den ? den.source : null;
  });
  rows.push({ source: 'residual', df: fit.dfe, ss: fit.sse, ms: fit.mse, residual: true });
  return rows;
};

/* externally studentised residuals and Bonferroni outlier p values (Cook & Weisberg 1982) */
LM.studentized = fit => {
  const n = fit.n, out = [];
  for (let i = 0; i < n; i++) {
    const h = fit.hat[i], e = fit.resid[i];
    if (h > 1 - 1e-8 || fit.dfe < 2) { out.push({ i, r: NaN, t: NaN, p: NaN, pBonf: NaN, h }); continue; }
    const r = e / Math.sqrt(fit.mse * (1 - h));
    const s2i = (fit.sse - e * e / (1 - h)) / (fit.dfe - 1);
    const t = s2i > 0 ? e / Math.sqrt(s2i * (1 - h)) : NaN;
    const p = isFinite(t) ? 2 * (1 - S.pt(Math.abs(t), fit.dfe - 1)) : NaN;
    out.push({ i, r, t, p, pBonf: Math.min(1, p * n), h });
  }
  return out;
};

/* Linear function L'b of the solutions: estimate, variance factor and estimability.
   L is a Map col → coefficient over the columns of fit.D. V is the matrix giving the
   variances (the swept block for least squares, or C⁻¹ for REML). */
LM.linear = (fit, L, V, vScale) => {
  const m = fit.m, A = fit.A;
  let est = 0, v = 0, estimable = true;
  const keep = [];
  L.forEach((c, j) => { if (fit.swept[j]) keep.push([j, c]); });
  /* estimability: each aliased column must be the same combination of the kept ones */
  L.forEach((c, j) => { if (fit.swept[j] || !(fit.D.d > j)) return; let s = 0; keep.forEach(([jj, cc]) => { s += cc * A[jj * m + j]; }); if (Math.abs(s - c) > 1e-6 * Math.max(1, Math.abs(c))) estimable = false; });
  /* aliased columns that L ignores must also be reproduced (their weight is zero) */
  for (let j = 0; j < fit.D.d; j++) {
    if (fit.swept[j] || L.has(j)) continue;
    let s = 0; keep.forEach(([jj, cc]) => { s += cc * A[jj * m + j]; });
    if (Math.abs(s) > 1e-6) { estimable = false; break; }
  }
  keep.forEach(([j, c]) => { est += c * fit.b[j]; });
  const getV = V || ((a, b2) => A[a * m + b2]);
  keep.forEach(([j, c]) => keep.forEach(([k, c2]) => { v += c * c2 * getV(j, k); }));
  return { est, v: v * (vScale == null ? 1 : vScale), estimable };
};

/* Least-squares means of one factor (term index `target`), averaging the other
   terms over the combinations of their levels that occur in the data (like the
   usual "marginal means" of a balanced reference grid). */
LM.lsmeans = (fit, target, o) => {
  o = o || {};
  const D = fit.D, K = D.K, n = D.n;
  const T = D.terms[target];
  const fac = T.f;
  /* the grid: distinct combinations of the codes of the other terms */
  const others = D.terms.map((t, k) => k).filter(k => k !== target && D.terms[k].kind !== 'intercept' && D.terms[k].kind !== 'covariate' && !(D.terms[k].kind === 'cross' && (D.terms[k].f === fac || D.terms[k].g === fac)));
  const crossWith = D.terms.map((t, k) => k).filter(k => D.terms[k].kind === 'cross' && (D.terms[k].f === fac || D.terms[k].g === fac));
  const combos = new Map();
  for (let i = 0; i < n; i++) {
    const key = others.map(k => { const t = D.terms[k]; return t.kind === 'main' ? t.f.codes[i] : t.f.codes[i] + ',' + t.g.codes[i]; }).join('|');
    if (!combos.has(key)) combos.set(key, i);
  }
  const grid = [...combos.values()];
  const covMeans = D.terms.map((t, k) => t.kind === 'covariate' ? S.mean(Array.from(t.x)) : null);
  const icpt = D.terms.findIndex(t => t.kind === 'intercept');
  /* terms in which the target is nested (e.g. entries inside sets): average only over
     the levels where the target level occurs */
  const restrict = (o.restrict || []).map(k => D.terms[k]);
  const levels = fac.levels.map((lab, a) => {
    const present = Array.prototype.some.call(fac.codes, c => c === a);
    if (!present) return null;
    const L = new Map();
    let ok = true;
    const add = (col, w) => { if (col >= 0) L.set(col, (L.get(col) || 0) + w); };
    let myGrid = grid;
    if (restrict.length) {
      const codeOf = (t, i) => (t.kind === 'nested' ? t.g.codes[i] : t.f.codes[i]);
      const seen = restrict.map(t => { const s = new Set(); for (let i = 0; i < n; i++) if (fac.codes[i] === a) s.add(codeOf(t, i)); return s; });
      myGrid = grid.filter(i => restrict.every((t, k) => seen[k].has(codeOf(t, i))));
    }
    myGrid.forEach(i => {
      const w = 1 / myGrid.length;
      if (icpt >= 0) add(D.terms[icpt].start, w);
      const own = LM.columnOf(T, [a]); if (!own.ok) ok = false; add(own.col, w);
      others.forEach(k => {
        const t = D.terms[k];
        const c = t.kind === 'main' ? LM.columnOf(t, [t.f.codes[i]]) : LM.columnOf(t, [t.f.codes[i], t.g.codes[i]]);
        add(c.col, w);
      });
      crossWith.forEach(k => {
        const t = D.terms[k];
        const parts = t.f === fac ? [a, t.g.codes[i]] : [t.f.codes[i], a];
        const c = LM.columnOf(t, parts); if (!c.ok) ok = false; add(c.col, w);
      });
      D.terms.forEach((t, k) => { if (t.kind === 'covariate') add(t.start, w * covMeans[k]); });
    });
    const r = LM.linear(fit, L, o.V, o.vScale != null ? o.vScale : fit.mse);
    return { level: lab, code: a, mean: r.est, se: Math.sqrt(Math.max(0, r.v)), estimable: ok && r.estimable, L };
  }).filter(Boolean);
  return levels;
};

/* Standard error of the difference between two levels of the target factor */
LM.sed = (fit, a, b, o) => {
  o = o || {};
  const L = new Map(a.L);
  b.L.forEach((c, j) => L.set(j, (L.get(j) || 0) - c));
  const r = LM.linear(fit, L, o.V, o.vScale != null ? o.vScale : fit.mse);
  return Math.sqrt(Math.max(0, r.v));
};
/* average SED over all pairs (or a sample of pairs when there are many levels) */
LM.averageSed = (fit, means, o) => {
  const k = means.length;
  if (k < 2) return NaN;
  let s2 = 0, cnt = 0;
  const step = k > 160 ? Math.ceil(k * (k - 1) / 2 / 12000) : 1;
  let pair = 0;
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    if (pair++ % step) continue;
    const se = LM.sed(fit, means[i], means[j], o);
    s2 += se * se; cnt++;
  }
  return Math.sqrt(s2 / cnt);
};

/* Tukey's one-degree-of-freedom test for non-additivity: the squared fitted
   values of the additive model enter as a covariate (Tukey 1949). */
LM.tukeyNonAdditivity = (terms, y) => {
  const f0 = LM.fit(terms, y);
  if (f0.dfe < 3) return null;
  const mean = S.mean(Array.from(f0.fitted));
  const x = Array.from(f0.fitted, v => (v - mean) ** 2);
  const f1 = LM.fit(terms.concat([{ kind: 'covariate', x, name: 'fitted²' }]), y);
  const df = f0.dfe - f1.dfe;
  if (df !== 1) return null;
  const ss = f0.sse - f1.sse;
  const F = ss / f1.mse;
  return { ss, df, F, df2: f1.dfe, p: 1 - S.pf(F, 1, f1.dfe) };
};

/* ================= dense symmetric helpers (flat arrays) ================= */
function cholFlat(C, d) {
  const L = new Float64Array(d * d);
  for (let j = 0; j < d; j++) {
    let s = C[j * d + j];
    const rj = j * d;
    for (let k = 0; k < j; k++) s -= L[rj + k] * L[rj + k];
    if (!(s > 1e-12 * Math.max(1, Math.abs(C[j * d + j])))) return null;
    const ljj = Math.sqrt(s);
    L[rj + j] = ljj;
    for (let i = j + 1; i < d; i++) {
      const ri = i * d;
      let t = C[ri + j];
      for (let k = 0; k < j; k++) t -= L[ri + k] * L[rj + k];
      L[ri + j] = t / ljj;
    }
  }
  return L;
}
function cholSolve(L, d, b) {
  const x = Float64Array.from(b);
  for (let i = 0; i < d; i++) { let s = x[i]; const ri = i * d; for (let k = 0; k < i; k++) s -= L[ri + k] * x[k]; x[i] = s / L[ri + i]; }
  for (let i = d - 1; i >= 0; i--) { let s = x[i]; for (let k = i + 1; k < d; k++) s -= L[k * d + i] * x[k]; x[i] = s / L[i * d + i]; }
  return x;
}
/* full inverse from the Cholesky factor */
function cholInverse(L, d) {
  const Li = new Float64Array(d * d);
  for (let j = 0; j < d; j++) {
    Li[j * d + j] = 1 / L[j * d + j];
    for (let i = j + 1; i < d; i++) {
      let s = 0; const ri = i * d;
      for (let k = j; k < i; k++) s -= L[ri + k] * Li[k * d + j];
      Li[ri + j] = s / L[ri + i];
    }
  }
  const Inv = new Float64Array(d * d);
  for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) {
    let s = 0;
    for (let k = i; k < d; k++) s += Li[k * d + i] * Li[k * d + j];
    Inv[i * d + j] = s; Inv[j * d + i] = s;
  }
  return Inv;
}
LM._chol = { cholFlat, cholSolve, cholInverse };

/* ================= constrained weighted least squares =================
   Genetic models (Griffing, Hayman, Gardner–Eberhart) are written with more
   parameters than the data can identify and a set of restrictions Cθ = 0. The fit
   works on an orthonormal basis of the null space of C, so the estimates are the
   constrained ones, exact for balanced complete data, and the normal equations are
   swept with a tolerance: whatever the data support is estimated and anything else
   is reported as not estimable. */
LM.nullBasis = (C, m) => {
  const dotv = (a, b) => { let s = 0; for (let i = 0; i < m; i++) s += a[i] * b[i]; return s; };
  const rows = [];
  const orth = (v, list) => { list.forEach(b => { const d = dotv(v, b); for (let i = 0; i < m; i++) v[i] -= d * b[i]; }); };
  C.forEach(r => {
    const v = Float64Array.from(r);
    orth(v, rows);
    const nn = Math.sqrt(dotv(v, v));
    if (nn > 1e-8) { for (let i = 0; i < m; i++) v[i] /= nn; rows.push(v); }
  });
  const N = [];
  for (let i = 0; i < m && N.length < m - rows.length; i++) {
    const v = new Float64Array(m); v[i] = 1;
    orth(v, rows); orth(v, N);
    const nn = Math.sqrt(dotv(v, v));
    if (nn > 1e-7) { for (let k = 0; k < m; k++) v[k] /= nn; N.push(v); }
  }
  return N;
};
/* X: rows of the design (arrays of length m); y, w: values and weights; C: restrictions */
LM.constrained = (X, y, w, C, sigma2) => {
  const n = X.length, m = X[0].length;
  const N = LM.nullBasis(C, m), k = N.length;
  if (!k) return null;
  const XtWX = new Float64Array(m * m), XtWy = new Float64Array(m);
  for (let i = 0; i < n; i++) {
    const x = X[i], wi = w ? w[i] : 1;
    const nz = [];
    for (let a = 0; a < m; a++) if (x[a]) nz.push(a);
    nz.forEach(a => { XtWy[a] += wi * x[a] * y[i]; nz.forEach(b => { XtWX[a * m + b] += wi * x[a] * x[b]; }); });
  }
  const MN = new Float64Array(m * k);
  for (let a = 0; a < m; a++) for (let q = 0; q < k; q++) { let s = 0; const row = a * m; for (let b = 0; b < m; b++) { const v = XtWX[row + b]; if (v) s += v * N[q][b]; } MN[a * k + q] = s; }
  const w2 = k + 1, Aug = new Float64Array(w2 * w2);
  for (let q = 0; q < k; q++) {
    for (let s2 = q; s2 < k; s2++) { let s = 0; for (let a = 0; a < m; a++) s += N[q][a] * MN[a * k + s2]; Aug[q * w2 + s2] = Aug[s2 * w2 + q] = s; }
    let bq = 0; for (let a = 0; a < m; a++) bq += N[q][a] * XtWy[a];
    Aug[q * w2 + k] = bq; Aug[k * w2 + q] = bq;
  }
  const orig = new Float64Array(k);
  for (let q = 0; q < k; q++) orig[q] = Aug[q * w2 + q];
  const swept = new Uint8Array(k);
  let rank = 0;
  for (let q = 0; q < k; q++) {
    if (!(orig[q] > 0) || Aug[q * w2 + q] <= 1e-9 * orig[q]) continue;
    const dq = Aug[q * w2 + q], rq = q * w2;
    for (let j = 0; j < w2; j++) Aug[rq + j] /= dq;
    for (let i = 0; i < w2; i++) {
      if (i === q) continue;
      const ri = i * w2, bq = Aug[ri + q];
      if (bq === 0) continue;
      for (let j = 0; j < w2; j++) Aug[ri + j] -= bq * Aug[rq + j];
      Aug[ri + q] = -bq / dq;
    }
    Aug[rq + q] = 1 / dq;
    swept[q] = 1; rank++;
  }
  const theta = new Float64Array(m);
  for (let a = 0; a < m; a++) { let s = 0; for (let q = 0; q < k; q++) if (swept[q]) s += N[q][a] * Aug[q * w2 + k]; theta[a] = s; }
  const coords = Lmap => { const v = new Float64Array(k); for (let q = 0; q < k; q++) { let s = 0; Lmap.forEach((c, a) => { s += c * N[q][a]; }); v[q] = s; } return v; };
  const estimable = Lmap => {
    if (rank === k) return true;
    const v = coords(Lmap);
    for (let q = 0; q < k; q++) {
      if (swept[q]) continue;
      let s = 0;
      for (let j = 0; j < k; j++) if (swept[j]) s += v[j] * Aug[j * w2 + q];
      if (Math.abs(s - v[q]) > 1e-7 * Math.max(1, Math.abs(v[q]))) return false;
    }
    return true;
  };
  const varOf = Lmap => {
    const v = coords(Lmap);
    let s = 0;
    for (let q = 0; q < k; q++) { if (!swept[q]) continue; for (let s2 = 0; s2 < k; s2++) if (swept[s2]) s += v[q] * Aug[q * w2 + s2] * v[s2]; }
    return s * (sigma2 == null ? 1 : sigma2);
  };
  const estOf = Lmap => { let s = 0; Lmap.forEach((c, a) => { s += c * theta[a]; }); return s; };
  return { theta, varOf, estOf, estimable, rank, full: rank === k, k, N, m };
};

/* ================= REML ================= */
/* fixed: terms as in LM.fit; random: [{ name, f }] (every level gets an effect,
   records with code −1 get none). Returns variance components, solutions, the
   inverse of the coefficient matrix and a design object usable with LM.lsmeans. */
LM.reml = (fixed, random, y, o) => {
  o = o || {};
  const n = y.length;
  /* rank of the fixed part */
  const fx = LM.fit(fixed, y);
  const D = fx.D, K = D.K;
  const keptCols = [];
  for (let j = 0; j < D.d; j++) if (fx.swept[j]) keptCols.push(j);
  const p = keptCols.length;
  const pos = new Int32Array(D.d).fill(-1);
  keptCols.forEach((j, i) => { pos[j] = i; });
  const R = random.length;
  const qs = random.map(r => r.f.levels.length);
  /* a random term may carry the inverse of its relationship matrix (row-major q × q, e.g. A⁻¹
     from a pedigree) and log|K|; without it K = I */
  const Kinv = random.map(r => r.Kinv || null);
  const logdetK = random.reduce((s, r) => s + (r.Kinv ? (r.logdetK || 0) : 0), 0);
  const quadK = (r, sol) => {
    const o0 = offs[r], qr = qs[r], Ki = Kinv[r];
    let s = 0;
    if (!Ki) { for (let l = 0; l < qr; l++) { const u = sol[o0 + l]; s += u * u; } return s; }
    for (let l = 0; l < qr; l++) { const ul = sol[o0 + l]; if (!ul) continue; const kr = l * qr; let t = 0; for (let m = 0; m < qr; m++) { const v = Ki[kr + m]; if (v) t += v * sol[o0 + m]; } s += ul * t; }
    return s;
  };
  const offs = []; let q = 0; qs.forEach(v => { offs.push(p + q); q += v; });
  const d = p + q;
  /* W'W and W'y */
  const WW = new Float64Array(d * d), Wy = new Float64Array(d);
  let yy = 0;
  const idx = new Int32Array(K + R), vv = new Float64Array(K + R);
  for (let i = 0; i < n; i++) {
    let c = 0;
    for (let a = 0; a < K; a++) { const col = D.cols[i * K + a]; if (col >= 0 && pos[col] >= 0) { idx[c] = pos[col]; vv[c] = D.vals[i * K + a]; c++; } }
    for (let r = 0; r < R; r++) { const code = random[r].f.codes[i]; if (code >= 0) { idx[c] = offs[r] + code; vv[c] = 1; c++; } }
    for (let a = 0; a < c; a++) { Wy[idx[a]] += vv[a] * y[i]; for (let b = 0; b < c; b++) WW[idx[a] * d + idx[b]] += vv[a] * vv[b]; }
    yy += y[i] * y[i];
  }
  /* W times a vector, and W' times a vector */
  const Wtimes = sol => {
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let a = 0; a < K; a++) { const col = D.cols[i * K + a]; if (col >= 0 && pos[col] >= 0) s += D.vals[i * K + a] * sol[pos[col]]; }
      for (let r = 0; r < R; r++) { const code = random[r].f.codes[i]; if (code >= 0) s += sol[offs[r] + code]; }
      out[i] = s;
    }
    return out;
  };
  const Wt = v => {
    const out = new Float64Array(d);
    for (let i = 0; i < n; i++) {
      const vi = v[i]; if (vi === 0) continue;
      for (let a = 0; a < K; a++) { const col = D.cols[i * K + a]; if (col >= 0 && pos[col] >= 0) out[pos[col]] += D.vals[i * K + a] * vi; }
      for (let r = 0; r < R; r++) { const code = random[r].f.codes[i]; if (code >= 0) out[offs[r] + code] += vi; }
    }
    return out;
  };

  const vy = fx.mse > 0 ? fx.mse : S.variance(Array.from(y));
  const lower = 1e-9 * Math.max(vy, 1e-12);
  let th = o.fixedTheta ? o.fixedTheta.slice() : o.start ? o.start.slice() : random.map(() => vy * 0.5 / Math.max(1, R)).concat([vy * 0.5]);
  const fixedAtBound = new Uint8Array(R);

  function evaluate(theta, wantInverse) {
    const s2e = theta[R];
    const C = Float64Array.from(WW);
    for (let r = 0; r < R; r++) {
      const lam = s2e / theta[r], Ki = Kinv[r], qr = qs[r], o0 = offs[r];
      if (Ki) { for (let l = 0; l < qr; l++) { const row = (o0 + l) * d + o0, kr = l * qr; for (let m = 0; m < qr; m++) { const v = Ki[kr + m]; if (v) C[row + m] += lam * v; } } }
      else for (let l = 0; l < qr; l++) C[(o0 + l) * d + o0 + l] += lam;
    }
    const L = cholFlat(C, d);
    if (!L) return null;
    let logdet = 0;
    for (let j = 0; j < d; j++) logdet += 2 * Math.log(L[j * d + j]);
    const sol = cholSolve(L, d, Wy);
    let solRhs = 0; for (let j = 0; j < d; j++) solRhs += sol[j] * Wy[j];
    const yPy = Math.max(0, yy - solRhs);          // σ²e · y'Py
    let m2l = (n - p - q) * Math.log(s2e) + logdet + yPy / s2e + logdetK;
    for (let r = 0; r < R; r++) m2l += qs[r] * Math.log(theta[r]);
    const res = { theta: theta.slice(), L, sol, yPy, m2l, logdet };
    if (wantInverse) res.Cinv = cholInverse(L, d);
    return res;
  }
  function traces(ev) {
    /* diagonal of C⁻¹ over each random block, from the inverse of L */
    const tr = new Float64Array(R);
    if (!ev.Cinv) ev.Cinv = cholInverse(ev.L, d);
    for (let r = 0; r < R; r++) {
      let s = 0;
      const Ki = Kinv[r], qr = qs[r], o0 = offs[r];
      if (Ki) { for (let l = 0; l < qr; l++) { const kr = l * qr; for (let m = 0; m < qr; m++) { const v = Ki[kr + m]; if (v) s += v * ev.Cinv[(o0 + m) * d + o0 + l]; } } }
      else for (let l = 0; l < qr; l++) { const j = o0 + l; s += ev.Cinv[j * d + j]; }
      tr[r] = s;                                     /* tr(K⁻¹C^kk), C from the σ²e-scaled equations */
    }
    return tr;
  }
  function emStep(ev) {
    const tr = traces(ev), s2e = ev.theta[R];
    const nt = ev.theta.slice();
    for (let r = 0; r < R; r++) {
      if (fixedAtBound[r]) continue;
      const uu = quadK(r, ev.sol);
      nt[r] = Math.max(lower, (uu + s2e * tr[r]) / qs[r]);
    }
    nt[R] = Math.max(lower, ev.yPy / (n - p));
    return nt;
  }

  /* score and average-information matrix of the free parameters (Gilmour, Thompson & Cullis 1995) */
  function aiAt(ev) {
    const theta = ev.theta, s2e = theta[R];
    const tr = traces(ev);
    const e = new Float64Array(n); const fitv = Wtimes(ev.sol);
    for (let i = 0; i < n; i++) e[i] = y[i] - fitv[i];
    let ee = 0; for (let i = 0; i < n; i++) ee += e[i] * e[i];
    const free = [];
    for (let r = 0; r < R; r++) if (!fixedAtBound[r]) free.push(r);
    free.push(R);
    const score = free.map(r => {
      if (r === R) { let s = (n - p - q) / s2e; for (let k = 0; k < R; k++) s += tr[k] / theta[k]; return -0.5 * (s - ee / (s2e * s2e)); }
      const uu = quadK(r, ev.sol);
      return -0.5 * (qs[r] / theta[r] - s2e * tr[r] / (theta[r] * theta[r]) - uu / (theta[r] * theta[r]));
    });
    /* working variates: Zûₖ/σ²ₖ (also with K ≠ I, since ûₖ = σ²ₖKZ′Py) and ê/σ²e */
    const works = free.map(r => {
      if (r === R) return Float64Array.from(e, v => v / s2e);
      const w = new Float64Array(n);
      for (let i = 0; i < n; i++) { const code = random[r].f.codes[i]; if (code >= 0) w[i] = ev.sol[offs[r] + code] / theta[r]; }
      return w;
    });
    const Wtw = works.map(Wt);
    const CWtw = Wtw.map(v => cholSolve(ev.L, d, v));
    const F = free.length;
    const AI = Array.from({ length: F }, () => new Array(F).fill(0));
    for (let a = 0; a < F; a++) for (let b = a; b < F; b++) {
      let ww = 0; for (let i = 0; i < n; i++) ww += works[a][i] * works[b][i];
      let wcw = 0; for (let j = 0; j < d; j++) wcw += Wtw[a][j] * CWtw[b][j];
      AI[a][b] = AI[b][a] = 0.5 * (ww - wcw) / s2e;
    }
    return { free, score, AI };
  }

  let ev = evaluate(th, true);
  if (!ev) return { error: 'singular' };
  let it = 0, converged = false, method = 'AI';
  const history = [];
  const given = !!o.fixedTheta;
  if (given) { method = 'given'; converged = true; }
  for (let k = 0; k < (given ? 0 : 3); k++) { const nt = emStep(ev); const e2 = evaluate(nt, true); if (!e2) break; ev = e2; it++; history.push(ev.m2l); }
  for (let pass = 0; pass < (given ? 0 : 3); pass++) {
  converged = false;
  for (; it < (o.maxIter || 200); it++) {
    const theta = ev.theta;
    const { free, score, AI } = aiAt(ev);
    const AIinv = S.inverse(AI);
    let next = null, stepOk = false;
    if (AIinv) {
      const delta = free.map((r, a) => AIinv[a].reduce((s, v, b) => s + v * score[b], 0));
      let t = 1;
      for (let h = 0; h < 12; h++, t /= 2) {
        const nt = theta.slice();
        let neg = false;
        free.forEach((r, a) => { nt[r] = theta[r] + t * delta[a]; if (!(nt[r] > lower)) neg = true; });
        if (neg) continue;
        const e2 = evaluate(nt, false);
        if (e2 && e2.m2l <= ev.m2l + 1e-10 * Math.abs(ev.m2l)) { next = e2; stepOk = true; break; }
      }
      /* a component heading below zero: pin it at the bound and continue */
      if (!stepOk) {
        const nt = theta.slice();
        let pinned = false;
        free.forEach((r, a) => { if (r < R && theta[r] + delta[a] <= lower) { nt[r] = lower; fixedAtBound[r] = 1; pinned = true; } });
        if (pinned) { const e2 = evaluate(nt, false); if (e2) { next = e2; stepOk = true; } }
      }
    }
    if (!stepOk) {
      method = 'EM';
      const e2 = evaluate(emStep(ev), false);
      if (!e2) break;
      next = e2;
    }
    const change = Math.max(...next.theta.map((v, k) => Math.abs(v - ev.theta[k]) / Math.max(v, ev.theta[k], lower)));
    const dm2l = Math.abs(next.m2l - ev.m2l);
    next.Cinv = null;
    ev = next;
    history.push(ev.m2l);
    if ((change < 1e-7 && dm2l < 1e-8) || dm2l < 1e-11 * Math.max(1, Math.abs(ev.m2l)) && change < 1e-5) { converged = true; it++; break; }
    /* components that EM keeps pushing to the bound */
    for (let r = 0; r < R; r++) if (!fixedAtBound[r] && ev.theta[r] < 1e-7 * vy) { const t2 = ev.theta.slice(); t2[r] = lower; fixedAtBound[r] = 1; ev = evaluate(t2, false); }
  }
  /* a component pinned at zero comes back if the likelihood rises when it grows */
  let reopened = false;
  for (let r = 0; r < R; r++) {
    if (!fixedAtBound[r]) continue;
    const t2 = ev.theta.slice(); t2[r] = 0.01 * vy;
    const e2 = evaluate(t2, false);
    if (e2 && e2.m2l < ev.m2l - 1e-8) { fixedAtBound[r] = 0; ev = e2; reopened = true; }
  }
  if (!reopened) break;
  }
  ev = evaluate(ev.theta, true);
  const s2e = ev.theta[R];
  /* sampling covariance of the variance parameters: the inverse of the average information */
  let thetaCov = null, finalScore = null;
  { const fin = aiAt(ev); const inv = S.inverse(fin.AI); finalScore = fin.score;
    if (inv) { thetaCov = Array.from({ length: R + 1 }, () => new Array(R + 1).fill(NaN)); fin.free.forEach((r, a) => fin.free.forEach((s, b) => { thetaCov[r][s] = inv[a][b]; })); } }
  const fitted = Wtimes(ev.sol);
  const resid = Float64Array.from(y, (v, i) => v - fitted[i]);
  /* fixed solutions on the columns of D, and the random effects */
  const b = new Float64Array(D.d);
  keptCols.forEach((j, i) => { b[j] = ev.sol[i]; });
  const blups = random.map((r, k) => r.f.levels.map((lab, l) => ({ level: lab, u: ev.sol[offs[k] + l], pev: s2e * ev.Cinv[(offs[k] + l) * d + offs[k] + l] })));
  const components = random.map((r, k) => ({ name: r.name, sigma2: fixedAtBound[k] || ev.theta[k] <= lower * 10 ? 0 : ev.theta[k], boundary: !!fixedAtBound[k] || ev.theta[k] <= lower * 10, q: qs[k] }));
  /* a fit object that LM.lsmeans can use: V = C⁻¹ fixed block, scaled by σ²e */
  const V = (a, c) => (pos[a] < 0 || pos[c] < 0 ? 0 : ev.Cinv[pos[a] * d + pos[c]]);
  const fitObj = Object.assign({}, fx, { b, fitted, resid, mse: s2e, reml: true });
  return {
    components, sigma2e: s2e, theta: ev.theta.slice(), thetaCov, score: finalScore, m2l: ev.m2l, logLikREML: -0.5 * (ev.m2l + (n - p) * Math.log(2 * Math.PI)),
    iterations: it, converged, method, history,
    fit: fitObj, V, vScale: s2e, blups, Cinv: ev.Cinv, d, p, q, offs, pos, keptCols, n,
    pevDiff: (k, l1, l2) => s2e * (ev.Cinv[(offs[k] + l1) * d + offs[k] + l1] + ev.Cinv[(offs[k] + l2) * d + offs[k] + l2] - 2 * ev.Cinv[(offs[k] + l1) * d + offs[k] + l2]),
  };
};

window.LM = LM;
