/* BreedingPro — Block 5 engine: Hayman's analysis of variance of the diallel
   table, Hayman–Jinks genetic components with the Wr–Vr graph, Morley Jones's
   half-diallel partition and Gardner & Eberhart's Analyses II and III.

   Hayman BI (1954) Biometrics 10:235–244 gives the items a, b1, b2, b3, c and d;
   Hayman BI (1954) Genetics 39:789–809 and Jinks JL (1954) Genetics 39:767–788 the
   components D, F, H1, H2 and h² and the Wr–Vr graph; Morley Jones RM (1965)
   Heredity 20:117–121 the half-diallel version; Gardner CO & Eberhart SA (1966)
   Biometrics 22:439–452 the variety and heterosis partition.

   All sums of squares are on the entry-mean scale (multiply by r for the plot
   scale). E is the variance of an entry mean (MSE/r).

   Half diallels: the classical error corrections of H1, H2 and h² assume a full
   table whose reciprocals were averaged, so each cross has variance E/2. When the
   crosses were grown once (half diallel) their variance is E and the corrections
   change to H1 − (5p − 4)E/p, H2 − 4E + 4(p − 1)E/p² and h² − 4(p² − 1)E/p³
   (derived and checked by simulation for BreedingPro; D and F keep their
   corrections). The classical set stays available for comparison. */

const HJ = {};

const dev2 = a => { const m = S.mean(a); return a.reduce((s, x) => s + (x - m) * (x - m), 0); };
const nan = n => { const a = new Float64Array(n); a.fill(NaN); return a; };

/* ---------------- the diallel table ---------------- */
/* cells: [{i, j, y, w}] of one environment (or means over environments) */
HJ.matrix = (cells, p) => {
  const y = nan(p * p), w = new Float64Array(p * p);
  cells.forEach(c => { const k = c.i * p + c.j; if (isNaN(y[k])) { y[k] = c.y; w[k] = c.w || 1; } else { const tw = w[k] + (c.w || 1); y[k] = (y[k] * w[k] + c.y * (c.w || 1)) / tw; w[k] = tw; } });
  let hasSelfs = true, hasRecip = true, complete = true, nCross = 0;
  for (let i = 0; i < p; i++) if (isNaN(y[i * p + i])) hasSelfs = false;
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    const d = !isNaN(y[i * p + j]), r = !isNaN(y[j * p + i]);
    if (d || r) nCross++;
    if (!(d && r)) hasRecip = false;
    if (!(d || r)) complete = false;
  }
  /* symmetric table: reciprocals averaged (or the half diallel completed) */
  const sym = nan(p * p), symW = new Float64Array(p * p);
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    const a = y[i * p + j], b = y[j * p + i];
    const wa = w[i * p + j], wb = w[j * p + i];
    if (i === j) { sym[i * p + j] = a; symW[i * p + j] = wa; continue; }
    if (!isNaN(a) && !isNaN(b)) { sym[i * p + j] = (a * wa + b * wb) / (wa + wb); symW[i * p + j] = wa + wb; }
    else if (!isNaN(a)) { sym[i * p + j] = a; symW[i * p + j] = wa; }
    else if (!isNaN(b)) { sym[i * p + j] = b; symW[i * p + j] = wb; }
  }
  const missing = [];
  for (let i = 0; i < p; i++) for (let j = i; j < p; j++) if (isNaN(sym[i * p + j])) missing.push([i, j]);
  return { y, w, sym, symW, p, hasSelfs, hasRecip, complete: complete && hasSelfs, missing, nCross };
};

/* ---------------- Hayman's items on a full p × p table ---------------- */
HJ.haymanItems = (y, p) => {
  const R = new Float64Array(p), C = new Float64Array(p), d = new Float64Array(p);
  let T = 0, D = 0;
  for (let r = 0; r < p; r++) {
    for (let s = 0; s < p; s++) { R[r] += y[r * p + s]; C[r] += y[s * p + r]; }
    d[r] = y[r * p + r]; T += R[r]; D += d[r];
  }
  let sa = 0, sb2 = 0, sb3 = 0, sc = 0, sd = 0, sRC2 = 0;
  for (let r = 0; r < p; r++) {
    sa += (R[r] + C[r]) * (R[r] + C[r]);
    sb2 += (R[r] + C[r] - p * d[r]) * (R[r] + C[r] - p * d[r]);
    sRC2 += (R[r] + C[r] - 2 * d[r]) * (R[r] + C[r] - 2 * d[r]);
    sc += (R[r] - C[r]) * (R[r] - C[r]);
  }
  for (let r = 0; r < p; r++) for (let s = r + 1; s < p; s++) {
    const u = y[r * p + s] + y[s * p + r], v = y[r * p + s] - y[s * p + r];
    sb3 += u * u; sd += v * v;
  }
  const a = sa / (2 * p) - 2 * T * T / (p * p);
  const b1 = (T - p * D) * (T - p * D) / (p * p * (p - 1));
  const b2 = sb2 / (p * (p - 2)) - (2 * T - p * D) * (2 * T - p * D) / (p * p * (p - 2));
  const b3 = sb3 / 2 - sRC2 / (2 * (p - 2)) + (T - D) * (T - D) / ((p - 1) * (p - 2));
  const c = sc / (2 * p);
  const dd = sd / 2 - c;
  /* Walters & Gale (1977): with reciprocal effects the genic effects are tested by
     the sum of squares among the parents */
  const genic = dev2(Array.from(d));
  return { a, b1, b2, b3, b: b1 + b2 + b3, c, d: dd, genic, total: a + b1 + b2 + b3 + c + dd };
};
HJ.haymanDf = p => ({ a: p - 1, b1: 1, b2: p - 1, b3: p * (p - 3) / 2, b: p * (p - 1) / 2, c: p - 1, d: (p - 1) * (p - 2) / 2, genic: p - 1 });

/* ---------------- Morley Jones's items on a half table ---------------- */
HJ.jonesItems = (sym, p) => {
  const rowTotal = new Float64Array(p), self = new Float64Array(p);
  let all = 0, selfSum = 0, n = 0, sq = 0;
  for (let r = 0; r < p; r++) {
    for (let s = 0; s < p; s++) rowTotal[r] += sym[r * p + s];
    self[r] = sym[r * p + r];
    selfSum += self[r];
  }
  for (let r = 0; r < p; r++) for (let s = r; s < p; s++) { all += sym[r * p + s]; n++; sq += sym[r * p + s] * sym[r * p + s]; }
  const u = [], t = [];
  for (let r = 0; r < p; r++) { u.push(rowTotal[r] + self[r]); t.push(2 * rowTotal[r] - p * self[r]); }
  const a = dev2(u) / (p + 2);
  const b1 = (2 * all - (p + 1) * selfSum) * (2 * all - (p + 1) * selfSum) / (p * (p * p - 1));
  const b2 = dev2(t) / (p * p - 4);
  const total = sq - all * all / n;
  const b3 = total - a - b1 - b2;
  const genic = dev2(Array.from(self));
  return { a, b1, b2, b3, b: b1 + b2 + b3, total, genic };
};
HJ.jonesDf = p => ({ a: p - 1, b1: 1, b2: p - 1, b3: p * (p - 3) / 2, b: p * (p + 1) / 2 - p, genic: p - 1 });

/* ---------------- analysis of variance with block interactions ---------------- */
/* o = { blocks: [{ key, cells }], mse, dfe, r, alpha, half } */
HJ.anova = (cells, p, o) => {
  o = o || {};
  const M = HJ.matrix(cells, p);
  const half = o.half != null ? o.half : !M.hasRecip;
  const items = half ? HJ.jonesItems(M.sym, p) : HJ.haymanItems(M.y, p);
  const df = half ? HJ.jonesDf(p) : HJ.haymanDf(p);
  const keys = half ? ['a', 'b1', 'b2', 'b3'] : ['a', 'b1', 'b2', 'b3', 'c', 'd'];
  const r = o.r || 1;
  const rows = keys.map(k => ({ item: k, df: df[k], ss: items[k], ms: items[k] / df[k] }));
  /* item × blocks, when the per-block tables are available */
  let blockRows = null;
  if (o.blocks && o.blocks.length > 1) {
    const rb = o.blocks.length;
    const per = o.blocks.map(b => {
      const mb = HJ.matrix(b.cells, p);
      if (half ? mb.missing.length : !mb.complete) return null;
      return half ? HJ.jonesItems(mb.sym, p) : HJ.haymanItems(mb.y, p);
    });
    if (per.every(Boolean)) {
      blockRows = keys.map(k => {
        const ss = per.reduce((s, it) => s + it[k], 0) - rb * items[k];
        return { item: k, df: df[k] * (rb - 1), ss: Math.max(0, ss), ms: Math.max(0, ss) / (df[k] * (rb - 1)) };
      });
    }
  }
  const pooled = { ms: o.mse != null ? o.mse / r : NaN, df: o.dfe };
  const useBlocks = o.error === 'blocks' && blockRows;
  rows.forEach((row, k) => {
    const den = useBlocks ? blockRows[k] : pooled;
    row.against = useBlocks ? 'blocks' : 'pooled';
    row.F = row.ms / den.ms;
    row.dfDen = den.df;
    row.p = isFinite(row.F) && den.df > 0 ? 1 - S.pf(row.F, row.df, den.df) : NaN;
    if (blockRows) { row.FB = row.ms / blockRows[k].ms; row.pB = 1 - S.pf(row.FB, row.df, blockRows[k].df); }
    row.Fp = row.ms / pooled.ms;
    row.pp = isFinite(row.Fp) && pooled.df > 0 ? 1 - S.pf(row.Fp, row.df, pooled.df) : NaN;
  });
  /* total dominance line and the Walters & Gale genic line */
  const bTotal = { item: 'b', df: df.b, ss: items.b, ms: items.b / df.b, summary: true };
  bTotal.F = bTotal.ms / pooled.ms; bTotal.p = 1 - S.pf(bTotal.F, bTotal.df, pooled.df);
  const genic = { item: 'genic', df: df.genic, ss: items.genic, ms: items.genic / df.genic };
  genic.F = genic.ms / pooled.ms; genic.p = 1 - S.pf(genic.F, genic.df, pooled.df);
  return { half, items, df, rows, blockRows, bTotal, genic, pooled, matrix: M, r };
};

/* ---------------- Hayman–Jinks statistics ---------------- */
HJ.stats = (sym, p) => {
  const P = [], rowMean = [], Vr = [], Wr = [];
  for (let r = 0; r < p; r++) P.push(sym[r * p + r]);
  const Pbar = S.mean(P);
  for (let r = 0; r < p; r++) {
    const row = [];
    for (let s = 0; s < p; s++) row.push(sym[r * p + s]);
    const m = S.mean(row);
    rowMean.push(m);
    Vr.push(row.reduce((s2, x) => s2 + (x - m) * (x - m), 0) / (p - 1));
    let sp = 0;
    for (let s = 0; s < p; s++) sp += row[s] * P[s];
    Wr.push((sp - row.reduce((s2, x) => s2 + x, 0) * P.reduce((s2, x) => s2 + x, 0) / p) / (p - 1));
  }
  let T = 0;
  for (let k = 0; k < p * p; k++) T += sym[k];
  return {
    p, parents: P, Pbar,
    V0L0: dev2(P) / (p - 1),
    Vr, V1L1: S.mean(Vr),
    V0L1: dev2(rowMean) / (p - 1),
    Wr, W0L01: S.mean(Wr),
    ML1: T / (p * p), ML0: Pbar,
    rowMean,
    arrays: P.map((v, i) => ({ i, parent: v, Wr: Wr[i], Vr: Vr[i], sum: Wr[i] + Vr[i], diff: Wr[i] - Vr[i], mean: rowMean[i] })),
  };
};

/* ---------------- genetic components ---------------- */
HJ.components = (st, E, o) => {
  o = o || {};
  const p = st.p;
  const half = !!o.half, classic = !!o.classic;
  const cH1 = half && !classic ? (5 * p - 4) / p : (3 * p - 2) / p;
  const cH2 = half && !classic ? 4 - 4 * (p - 1) / (p * p) : 2;
  const cHh = half && !classic ? 4 * (p * p - 1) / (p * p * p) : 4 * (p - 1) / (p * p);
  const D = st.V0L0 - E;
  const F = 2 * st.V0L0 - 4 * st.W0L01 - 2 * (p - 2) * E / p;
  const H1 = st.V0L0 - 4 * st.W0L01 + 4 * st.V1L1 - cH1 * E;
  const H2 = 4 * st.V1L1 - 4 * st.V0L1 - cH2 * E;
  const md = st.ML1 - st.ML0;
  const h2 = 4 * md * md - cHh * E;
  /* standard errors: S² = ½ Var(Wr − Vr) with Hayman's coefficients */
  const diffs = st.arrays.map(a => a.diff);
  const S2 = 0.5 * dev2(diffs) / (p - 1);
  const p5 = Math.pow(p, 5);
  const coef = {
    E: Math.pow(p, 4) / p5,
    D: (p5 + Math.pow(p, 4)) / p5,
    F: (4 * p5 + 20 * Math.pow(p, 4) - 16 * Math.pow(p, 3) + 16 * p * p) / p5,
    H1: (p5 + 41 * Math.pow(p, 4) - 12 * Math.pow(p, 3) + 4 * p * p) / p5,
    H2: 36 * Math.pow(p, 4) / p5,
    h2: (16 * Math.pow(p, 4) + 16 * p * p - 32 * p + 16) / p5,
  };
  const se = k => Math.sqrt(coef[k] * S2);
  const mk = (key, es, en, value, k) => {
    const s = se(k), t = s > 0 ? value / s : NaN;
    return { key, es, en, value, se: s, t, p: isFinite(t) ? 2 * (1 - S.pt(Math.abs(t), Math.max(1, p - 2))) : NaN };
  };
  const list = [
    mk('E', 'E (ambiental)', 'E (environmental)', E, 'E'),
    mk('D', 'D (aditivo)', 'D (additive)', D, 'D'),
    mk('F', 'F (frecuencias de alelos)', 'F (allele frequencies)', F, 'F'),
    mk('H1', 'H₁ (dominancia)', 'H₁ (dominance)', H1, 'H1'),
    mk('H2', 'H₂ (dominancia, asimetría)', 'H₂ (dominance, asymmetry)', H2, 'H2'),
    mk('h2', 'h² (dominancia global)', 'h² (overall dominance)', h2, 'h2'),
  ];
  const sA = 0.5 * (D + H1 - H2 - F), sD = 0.25 * H2;
  const denom = 0.5 * D + 0.5 * H1 - 0.25 * H2 - 0.5 * F + E;
  const ratios = {
    dominance: D > 0 && H1 >= 0 ? Math.sqrt(H1 / D) : NaN,
    asymmetry: H1 > 0 ? H2 / (4 * H1) : NaN,
    kdkr: D > 0 && H1 > 0 && Math.abs(Math.sqrt(4 * D * H1) - F) > 1e-12 ? (Math.sqrt(4 * D * H1) + F) / (Math.sqrt(4 * D * H1) - F) : NaN,
    genes: H2 > 0 ? h2 / H2 : NaN,
    sigma2A: sA, sigma2D: sD,
    h2ns: denom > 0 ? (0.5 * D + 0.5 * H1 - 0.5 * H2 - 0.5 * F) / denom : NaN,
    H2bs: denom > 0 ? (0.5 * D + 0.5 * H1 - 0.25 * H2 - 0.5 * F) / denom : NaN,
  };
  return { list, D, F, H1, H2, h2, E, S2, half, classic, corrections: { H1: cH1, H2: cH2, h2: cHh }, ratios };
};

/* ---------------- Wr–Vr regression and graph ---------------- */
HJ.regression = (st) => {
  const p = st.p;
  const V = st.Vr, W = st.Wr;
  const vv = dev2(V) / (p - 1), ww = dev2(W) / (p - 1);
  const mv = S.mean(V), mw = S.mean(W);
  let vw = 0;
  for (let i = 0; i < p; i++) vw += (V[i] - mv) * (W[i] - mw);
  const cov = vw / (p - 1);
  const b = cov / vv;
  const a = mw - b * mv;
  const dfr = p - 2;
  const resid = (ww * (p - 1) - b * vw) / dfr;
  const seb = Math.sqrt(Math.max(0, resid / (vv * (p - 1))));
  const t0 = b / seb, t1 = (1 - b) / seb;
  /* Pitman–Morgan test of equality of the two variances (Hayman's t²) */
  const t2num = (p - 2) / 4 * (vv - ww) * (vv - ww);
  const t2den = vv * ww - cov * cov;
  const t2 = t2den > 0 ? t2num / t2den : NaN;
  /* limiting parabola and the lines */
  const V0 = st.V0L0;
  const vmax = Math.max(...V, V0) * 1.08;
  const parabola = [];
  for (let k = 0; k <= 60; k++) { const v = vmax * k / 60; parabola.push([v, Math.sqrt(Math.max(0, v * V0))]); }
  const unit = { a: mw - mv, b: 1 };
  /* intersections of the unit-slope line with the parabola */
  let dom = null, rec = null;
  const disc = V0 * V0 - 4 * V0 * unit.a;
  if (disc >= 0 && V0 > 0) {
    const x1 = (V0 + Math.sqrt(disc)) / (2 * V0), x2 = 1 - x1;
    rec = { V: V0 * x1 * x1, W: V0 * x1 };
    dom = { V: V0 * x2 * x2, W: V0 * x2 };
  }
  /* order of dominance and prediction of the extreme parents */
  const sums = st.arrays.map(x => x.sum), ys = st.arrays.map(x => x.parent);
  const r = S.pearson(sums, ys);
  const msum = S.mean(sums), my = S.mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < p; i++) { num += (sums[i] - msum) * (ys[i] - my); den += (sums[i] - msum) * (sums[i] - msum); }
  const bY = den > 0 ? num / den : NaN, aY = my - bY * msum;
  return {
    b, a, seb, t0, t1, dfr,
    p0: isFinite(t0) ? 2 * (1 - S.pt(Math.abs(t0), dfr)) : NaN,
    p1: isFinite(t1) ? 2 * (1 - S.pt(Math.abs(t1), dfr)) : NaN,
    t2, pt2: isFinite(t2) ? 1 - S.pf(t2, 1, dfr) : NaN,
    varV: vv, varW: ww, cov, parabola, unit, V0, dom, rec,
    corrYr: r, r2: r * r, bY, aY,
    predictDominant: dom && isFinite(bY) ? aY + bY * (dom.V + dom.W) : NaN,
    predictRecessive: rec && isFinite(bY) ? aY + bY * (rec.V + rec.W) : NaN,
    order: st.arrays.slice().sort((x, y2) => x.sum - y2.sum).map(x => x.i),
  };
};

/* ---------------- Wr ± Vr over blocks ---------------- */
HJ.blockWrVr = (blocks, p) => {
  const per = blocks.map(b => {
    const m = HJ.matrix(b.cells, p);
    if (m.missing.length) return null;
    return HJ.stats(m.sym, p);
  });
  if (!per.every(Boolean) || per.length < 2) return null;
  const rb = per.length;
  const build = f => {
    const y = [], arr = [], blk = [];
    per.forEach((st, k) => st.arrays.forEach(a => { y.push(f(a)); arr.push('A' + a.i); blk.push('B' + k); }));
    const fit = LM.fit([{ kind: 'intercept' }, { kind: 'main', f: LM.factor(arr), name: 'array' }, { kind: 'main', f: LM.factor(blk), name: 'block' }], y);
    const rows = LM.anovaTable(fit, [null, 'array', 'block']);
    return { rows, mse: fit.mse, dfe: fit.dfe };
  };
  return { diff: build(a => a.diff), sum: build(a => a.sum), blocks: rb, per };
};

/* ---------------- Gardner & Eberhart ---------------- */
const GE = {};
GE.layout = (p, kind) => {
  const pairs = [], ix = new Map();
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) { ix.set(i + '|' + j, pairs.length); pairs.push([i, j]); }
  const off = kind === 'ge2'
    ? { mu: 0, v: 1, hbar: 1 + p, h: 2 + p, s: 2 + 2 * p }
    : { muv: 0, sp: 1, muc: 1 + p, g: 2 + p, s: 2 + 2 * p };
  return { p, kind, pairs, pairIx: ix, off, m: 2 + 2 * p + pairs.length, sIx: (i, j) => ix.get(Math.min(i, j) + '|' + Math.max(i, j)) };
};
GE.row = (L, i, j) => {
  const x = new Float64Array(L.m), o = L.off;
  if (L.kind === 'ge2') {
    x[o.mu] = 1;
    if (i === j) { x[o.v + i] += 1; return x; }
    x[o.v + i] += 0.5; x[o.v + j] += 0.5;
    x[o.hbar] = 1; x[o.h + i] += 1; x[o.h + j] += 1;
    x[o.s + L.sIx(i, j)] = 1;
    return x;
  }
  if (i === j) { x[o.muv] = 1; x[o.sp + i] = 1; return x; }
  x[o.muc] = 1; x[o.g + i] += 1; x[o.g + j] += 1; x[o.s + L.sIx(i, j)] = 1;
  return x;
};
GE.restrictions = (L, omit) => {
  const { p, off, m } = L;
  const rows = [], zero = () => new Float64Array(m);
  let r = zero();
  if (L.kind === 'ge2') { for (let i = 0; i < p; i++) r[off.v + i] = 1; rows.push(r); r = zero(); for (let i = 0; i < p; i++) r[off.h + i] = 1; rows.push(r); }
  else { for (let i = 0; i < p; i++) r[off.sp + i] = 1; rows.push(r); r = zero(); for (let i = 0; i < p; i++) r[off.g + i] = 1; rows.push(r); }
  for (let i = 0; i < p; i++) {
    const row = zero();
    for (let j = 0; j < p; j++) if (j !== i) row[off.s + L.sIx(i, j)] += 1;
    rows.push(row);
  }
  (omit || []).forEach(a => { const z = zero(); z[a] = 1; rows.push(z); });
  return rows;
};
/* cells must be the half-diallel set (parents + one value per pair) */
GE.fit = (cells, p, kind, sigma2, alpha) => {
  const L = GE.layout(p, kind);
  const seen = new Set(cells.filter(c => c.i !== c.j).map(c => Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j)));
  const omit = [];
  L.pairs.forEach(([i, j], idx) => { if (!seen.has(i + '|' + j)) omit.push(L.off.s + idx); });
  const X = cells.map(c => GE.row(L, Math.min(c.i, c.j), Math.max(c.i, c.j)));
  const fit = LM.constrained(X, cells.map(c => c.y), cells.map(c => c.w), GE.restrictions(L, omit), sigma2);
  if (!fit) return null;
  const one = a => new Map([[a, 1]]);
  const mk = (est, Lmap, extra) => {
    const ok = fit.full || fit.estimable(Lmap);
    const v = fit.varOf(Lmap), se = ok ? Math.sqrt(Math.max(0, v)) : NaN;
    const t = se > 0 ? est / se : NaN;
    return Object.assign({ est: ok ? est : NaN, se, t, estimable: ok, p: isFinite(t) ? 2 * (1 - S.pt(Math.abs(t), alpha.df)) : NaN }, extra || {});
  };
  const out = { L, fit, omit };
  const o = L.off;
  if (kind === 'ge2') {
    out.mu = mk(fit.theta[o.mu], one(o.mu));
    out.v = []; out.h = [];
    for (let i = 0; i < p; i++) out.v.push(mk(fit.theta[o.v + i], one(o.v + i), { parent: i }));
    out.hbar = mk(fit.theta[o.hbar], one(o.hbar));
    for (let i = 0; i < p; i++) out.h.push(mk(fit.theta[o.h + i], one(o.h + i), { parent: i }));
  } else {
    out.muv = mk(fit.theta[o.muv], one(o.muv));
    out.muc = mk(fit.theta[o.muc], one(o.muc));
    out.sp = []; out.g = [];
    for (let i = 0; i < p; i++) out.sp.push(mk(fit.theta[o.sp + i], one(o.sp + i), { parent: i }));
    for (let i = 0; i < p; i++) out.g.push(mk(fit.theta[o.g + i], one(o.g + i), { parent: i }));
  }
  out.s = L.pairs.map(([i, j], idx) => mk(fit.theta[o.s + idx], one(o.s + idx), { i, j }));
  return out;
};
/* sequential sums of squares of the two analyses */
GE.anova = (cells, p, kind) => {
  const n = cells.length;
  const pairsIx = new Map();
  let np = 0;
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) pairsIx.set(i + '|' + j, np++);
  const col = (fn, name, group) => ({ kind: 'covariate', name, group, x: cells.map(fn) });
  const isCross = c => c.i !== c.j;
  const key = c => Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j);
  const terms = [{ kind: 'intercept', name: '(intercept)' }];
  terms.push(col(c => (isCross(c) ? 1 : 0), 'hbar', 'hbar'));
  if (kind === 'ge2') {
    for (let i = 0; i < p; i++) terms.push(col(c => (c.i === i ? (isCross(c) ? 0.5 : 1) : 0) + (c.j === i && isCross(c) ? 0.5 : 0), 'v' + i, 'v'));
    for (let i = 0; i < p; i++) terms.push(col(c => (isCross(c) ? (c.i === i ? 1 : 0) + (c.j === i ? 1 : 0) : 0), 'h' + i, 'h'));
  } else {
    for (let i = 0; i < p; i++) terms.push(col(c => (!isCross(c) && c.i === i ? 1 : 0), 'sp' + i, 'sp'));
    for (let i = 0; i < p; i++) terms.push(col(c => (isCross(c) ? (c.i === i ? 1 : 0) + (c.j === i ? 1 : 0) : 0), 'g' + i, 'g'));
  }
  pairsIx.forEach((idx, k) => terms.push(col(c => (isCross(c) && key(c) === k ? 1 : 0), 's' + k, 's')));
  const fit = LM.fit(terms, cells.map(c => c.y), { weights: cells.map(c => c.w) });
  const rows = [];
  fit.lines.forEach(l => { if (l.kind === 'intercept') return; rows.push({ source: l.group, df: l.df, ss: l.ss, ms: l.df > 0 ? l.ss / l.df : NaN }); });
  return rows;
};
GE.SOURCES = {
  hbar: { es: 'Heterosis promedio (' + HBAR + ')', en: 'Average heterosis (' + HBAR + ')' },
  v: { es: 'Efectos de variedad (vⱼ)', en: 'Variety effects (vⱼ)' },
  h: { es: 'Heterosis de variedad (hⱼ)', en: 'Variety heterosis (hⱼ)' },
  sp: { es: 'Progenitores (spⱼ)', en: 'Parents (spⱼ)' },
  g: { es: 'ACG entre cruzas (gⱼ)', en: 'GCA among crosses (gⱼ)' },
  s: { es: 'Heterosis específica (sⱼⱼ′)', en: 'Specific heterosis (sⱼⱼ′)' },
};

/* heterosis of every cross from the cell means (model free) */
GE.heterosis = (cells, p, o) => {
  o = o || {};
  const mse = o.mse != null ? o.mse : NaN;          // plot scale; weights are plots
  const M = new Map();
  cells.forEach(c => { const k = Math.min(c.i, c.j) + '|' + Math.max(c.i, c.j); const prev = M.get(k); if (!prev) M.set(k, { y: c.y, w: c.w, i: Math.min(c.i, c.j), j: Math.max(c.i, c.j) }); else { const w = prev.w + c.w; prev.y = (prev.y * prev.w + c.y * c.w) / w; prev.w = w; } });
  const self = i => M.get(i + '|' + i);
  const out = [];
  const tcrit = o.df > 0 ? S.qt(1 - (o.alpha || 0.05) / 2, o.df) : NaN;
  M.forEach(cell => {
    const { i, j } = cell;
    if (i === j) return;
    const Pi = self(i), Pj = self(j);
    if (!Pi || !Pj) return;
    const mid = (Pi.y + Pj.y) / 2;
    const varMid = mse * (1 / cell.w + 0.25 / Pi.w + 0.25 / Pj.w);
    const mph = cell.y - mid;
    const better = o.goal === 'low' ? (Pi.y <= Pj.y ? Pi : Pj) : (Pi.y >= Pj.y ? Pi : Pj);
    const bph = cell.y - better.y;
    const varB = mse * (1 / cell.w + 1 / better.w);
    const tM = mph / Math.sqrt(varMid), tB = bph / Math.sqrt(varB);
    out.push({
      i, j, cross: cell.y, mid, better: better.y,
      mph, mphPct: mid !== 0 ? 100 * mph / Math.abs(mid) : NaN, seMph: Math.sqrt(varMid), tMph: tM,
      pMph: isFinite(tM) && o.df > 0 ? 2 * (1 - S.pt(Math.abs(tM), o.df)) : NaN,
      bph, bphPct: better.y !== 0 ? 100 * bph / Math.abs(better.y) : NaN, seBph: Math.sqrt(varB), tBph: tB,
      pBph: isFinite(tB) && o.df > 0 ? 2 * (1 - S.pt(Math.abs(tB), o.df)) : NaN,
      lsdMph: tcrit * Math.sqrt(varMid), lsdBph: tcrit * Math.sqrt(varB),
    });
  });
  return out;
};

/* ---------------- everything for one trait ---------------- */
/* o = { cells (one environment or means), p, parents, mse, dfe, r, blocks, alpha, half, classic, goal } */
HJ.analyse = o => {
  const p = o.parents.length;
  const M = HJ.matrix(o.cells, p);
  const out = { p, parents: o.parents.slice(), matrix: M, issues: [] };
  const alpha = { df: o.dfe, level: o.alpha || 0.05 };
  const E = o.mse / (o.r || 1);
  out.E = E;
  const half = o.half != null ? o.half : !M.hasRecip;
  out.half = half;
  if (!M.hasSelfs) out.issues.push({ level: 'warning', es: 'Sin progenitores en el experimento no se pueden estimar los componentes de Hayman y Jinks ni los análisis de Gardner y Eberhart (necesitan las líneas por sí mismas).', en: 'Without the parents in the experiment neither the Hayman–Jinks components nor the Gardner–Eberhart analyses can be estimated (they need the lines themselves).' });
  if (M.missing.length) out.issues.push({ level: 'warning', es: `${M.missing.length === 1 ? "Falta 1 entrada" : "Faltan " + M.missing.length + " entradas"} de la tabla dialélica: los estadísticos Wr, Vr y los componentes necesitan la tabla completa.`, en: `${M.missing.length} entr${M.missing.length === 1 ? 'y is' : 'ies are'} missing from the diallel table: the Wr, Vr statistics and the components need the complete table.` });
  /* analysis of variance */
  out.anova = HJ.anova(o.cells, p, { blocks: o.blocks, mse: o.mse, dfe: o.dfe, r: o.r, half, error: o.error });
  /* Hayman–Jinks components and the graph */
  if (M.hasSelfs && !M.missing.length) {
    out.stats = HJ.stats(M.sym, p);
    out.components = HJ.components(out.stats, E, { half, classic: o.classic });
    out.regression = HJ.regression(out.stats);
    if (o.blocks && o.blocks.length > 1) out.blockWrVr = HJ.blockWrVr(o.blocks, p);
    if (half) out.issues.push({ level: 'info', es: o.classic
      ? 'Medio dialelo con las correcciones clásicas: H₁, H₂ y h² quedan sesgados porque esas correcciones suponen recíprocas promediadas (varianza E/2 por cruza).'
      : 'Medio dialelo: se usan las correcciones por error deducidas para cruzas evaluadas una sola vez (H₁ − (5p − 4)E/p, H₂ − 4E + 4(p − 1)E/p², h² − 4(p² − 1)E/p³). Las clásicas suponen recíprocas promediadas y sobrestiman H₁ y H₂.',
      en: o.classic
        ? 'Half diallel with the classical corrections: H₁, H₂ and h² are biased because those corrections assume averaged reciprocals (variance E/2 per cross).'
        : 'Half diallel: the error corrections derived for crosses grown once are used (H₁ − (5p − 4)E/p, H₂ − 4E + 4(p − 1)E/p², h² − 4(p² − 1)E/p³). The classical ones assume averaged reciprocals and overestimate H₁ and H₂.' });
  }
  /* Gardner–Eberhart on the half-diallel set (parents + one value per pair).
     The classical analysis weights every entry mean equally, so the sums of squares
     are on the entry-mean scale and comparable with Morley Jones's items; the
     heterosis of each cross does use the real number of plots of each entry. */
  if (M.hasSelfs) {
    const geCells = [], geWeighted = [];
    for (let i = 0; i < p; i++) for (let j = i; j < p; j++) {
      const v = M.sym[i * p + j];
      if (isNaN(v)) continue;
      geCells.push({ i, j, y: v, w: 1 });
      geWeighted.push({ i, j, y: v, w: M.symW[i * p + j] });
    }
    out.geCells = geCells;
    out.jones = M.missing.length ? null : HJ.jonesItems(M.sym, p);
    out.ge2 = GE.fit(geCells, p, 'ge2', E, alpha);
    out.ge3 = GE.fit(geCells, p, 'ge3', E, alpha);
    out.ge2Anova = GE.anova(geCells, p, 'ge2');
    out.ge3Anova = GE.anova(geCells, p, 'ge3');
    out.heterosis = GE.heterosis(geWeighted, p, { mse: o.mse, df: o.dfe, alpha: o.alpha, goal: o.goal });
    if (!half) out.issues.push({ level: 'info', es: 'Con tabla completa, los análisis de Gardner y Eberhart se hacen sobre la tabla con recíprocas promediadas (medio dialelo): sus sumas de cuadrados no son comparables con los ítems de Hayman de la tabla completa, y las pruebas F de las cruzas son conservadoras porque cada cruza es la media de dos recíprocas.', en: 'With a full table, the Gardner–Eberhart analyses are done on the reciprocal-averaged (half-diallel) table: their sums of squares are not comparable with Hayman\'s items of the full table, and the F tests of the crosses are conservative because each cross is the mean of two reciprocals.' });
    if (out.ge2 && out.ge3) {
      let worst = 0;
      for (let i = 0; i < p; i++) {
        const a = out.ge3.g[i].est, b = 0.5 * out.ge2.v[i].est + out.ge2.h[i].est;
        if (isFinite(a) && isFinite(b)) worst = Math.max(worst, Math.abs(a - b));
      }
      out.geIdentity = worst;
    }
  }
  return out;
};

window.HJ = HJ;
window.GE = GE;
