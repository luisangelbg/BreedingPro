/* BreedingPro — Block 9 engine: genotype × environment interaction and stability.
   Everything works on the two-way table of genotype means in every environment, with the
   pooled error of the trial on the plot scale and its number of replicates r: the analysis
   of variance of the table; the regressions on the environmental index (Finlay & Wilkinson
   1963; Eberhart & Russell 1966; Perkins & Jinks 1968); the stability variances of Wricke
   (1962) and Shukla (1972); superiority (Lin & Binns 1988); reliability (Annicchiarico
   1992); the rank statistics of Huehn (1979) with the tests of Nassar & Huehn (1987);
   yield–stability (Kang 1993); AMMI (Gollob 1968; Gauch 1988; Cornelius et al. 1992) with
   ASV and WAAS; and the GGE biplot (Yan et al. 2000). Missing cells are filled by EM-AMMI
   (Gauch & Zobel 1990) and flagged; the two-stage analysis with an error variance of its
   own in every environment uses the observed cells only. */

const GXE = {};
const gSum = a => { let s = 0; for (const v of a) s += v; return s; };
const gMean = a => gSum(a) / a.length;
const sq = x => x * x;
/* ranks that take values equal to 12 significant digits as ties: means of rounded data that tie
   exactly on paper do not tie after floating-point sums, and the ranks would depend on rounding */
const tieKey = v => +v.toPrecision(12);
GXE.ranks = a => S.ranks(a.map(tieKey));

/* ---------------- the table ---------------- */
GXE.fromTrial = (ds, field, t, o) => {
  o = o || {};
  const per = field.envs.map(E => Trial.analyseEnv(ds, E, t, { heritability: false, excluded: o.excluded, externalError: o.external }));
  const ok = per.filter(r => !r.error && r.means && r.means.length);
  const envs = ok.map(r => r.env);
  const seen = new Set();
  ok.forEach(r => r.means.forEach(m => { if (m.estimable !== false && isFinite(m.mean)) seen.add(m.entry); }));
  const genos = [...seen].sort(LM.natCmp);
  const gi = new Map(genos.map((g, i) => [g, i]));
  const blank = () => genos.map(() => envs.map(() => NaN));
  const Y = blank(), V = blank(), N = blank();
  ok.forEach((r, j) => {
    const counts = new Map();
    (r.plots || []).forEach(p => counts.set(p.entry, (counts.get(p.entry) || 0) + 1));
    r.means.forEach(m => {
      if (!gi.has(m.entry) || !isFinite(m.mean) || m.estimable === false) return;
      const i = gi.get(m.entry);
      Y[i][j] = m.mean;
      N[i][j] = counts.get(m.entry) || m.n || 1;
      V[i][j] = isFinite(m.se) && m.se > 0 ? m.se * m.se : (r.mse > 0 ? r.mse / N[i][j] : NaN);
    });
  });
  const meansOnly = ok.length > 0 && ok.every(r => r.design === 'means' || r.design === 'unreplicated');
  const out = { trait: t.name, genos, envs, Y, V, N, meansOnly, per: ok, notes: [] };
  if (meansOnly) {
    const ext = o.external && o.external[t.name];
    if (ext && ext.ms > 0 && ext.df > 0) {
      out.r = ext.r || 1;
      out.mse = ext.scale === 'plot' ? ext.ms : ext.ms * out.r;
      out.dfe = ext.df;
      out.external = true;
    } else { out.r = 1; out.mse = NaN; out.dfe = NaN; }
  } else {
    const withErr = ok.filter(x => x.mse > 0 && x.dfe > 0);
    out.dfe = gSum(withErr.map(x => x.dfe));
    out.mse = out.dfe > 0 ? gSum(withErr.map(x => x.mse * x.dfe)) / out.dfe : NaN;
    out.r = ok.length / gSum(ok.map(x => 1 / (x.harmonicReps || 1)));
    out.envErr = ok.map(x => ({ env: x.env, mse: x.mse, dfe: x.dfe, r: x.harmonicReps, design: x.design, mean: x.mean, cv: x.cv }));
    if (withErr.length >= 2) out.bartlett = Trial.bartlett(withErr.map(x => x.mse), withErr.map(x => x.dfe));
    /* replicates within environments, the error for environments */
    let ss = 0, df = 0, all = true;
    ok.forEach(x => { const row = (x.anova || []).find(a => a.source === 'rep'); if (row && isFinite(row.ss)) { ss += row.ss; df += row.df; } else all = false; });
    if (all && df > 0) out.rep = { ss, df };
  }
  return out;
};

/* genotypes and environments with too little data to enter the table */
GXE.prune = tab => {
  let keepG = tab.genos.map((_, i) => i), keepE = tab.envs.map((_, j) => j);
  for (let pass = 0; pass < 5; pass++) {
    const g2 = keepG.filter(i => keepE.filter(j => isFinite(tab.Y[i][j])).length >= Math.min(2, keepE.length));
    const e2 = keepE.filter(j => g2.filter(i => isFinite(tab.Y[i][j])).length >= Math.min(3, g2.length));
    if (g2.length === keepG.length && e2.length === keepE.length) break;
    keepG = g2; keepE = e2;
  }
  const pick = M => keepG.map(i => keepE.map(j => M[i][j]));
  const dropped = { genos: tab.genos.filter((_, i) => !keepG.includes(i)), envs: tab.envs.filter((_, j) => !keepE.includes(j)) };
  return Object.assign({}, tab, { genos: keepG.map(i => tab.genos[i]), envs: keepE.map(j => tab.envs[j]), Y: pick(tab.Y), V: pick(tab.V), N: pick(tab.N), dropped });
};

/* ---------------- singular value decomposition ----------------
   One-sided Jacobi (Hestenes 1958): the columns are rotated until they are orthogonal;
   accurate to rounding even for small singular values, unlike the eigenvalues of Z′Z. */
GXE.svd = Z => {
  const g = Z.length, e = Z[0].length, tr = e > g;
  const m = tr ? e : g, n = tr ? g : e;
  const A = Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => (tr ? Z[j][i] : Z[i][j])));
  const W = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let al = 0, be = 0, ga = 0;
      for (let i = 0; i < m; i++) { const x = A[i][p], y = A[i][q]; al += x * x; be += y * y; ga += x * y; }
      if (al === 0 || be === 0) continue;
      const rel = Math.abs(ga) / Math.sqrt(al * be);
      if (rel < 1e-15) continue;
      off = Math.max(off, rel);
      const zeta = (be - al) / (2 * ga);
      const t = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
      const c = 1 / Math.sqrt(1 + t * t), s = c * t;
      for (let i = 0; i < m; i++) { const x = A[i][p], y = A[i][q]; A[i][p] = c * x - s * y; A[i][q] = s * x + c * y; }
      for (let i = 0; i < n; i++) { const x = W[i][p], y = W[i][q]; W[i][p] = c * x - s * y; W[i][q] = s * x + c * y; }
    }
    if (off < 1e-15) break;
  }
  const norms = Array.from({ length: n }, (_, k) => Math.sqrt(gSum(A.map(r => r[k] * r[k]))));
  const order = norms.map((_, k) => k).sort((a, b) => norms[b] - norms[a]);
  const top = norms[order[0]] || 0;
  const keep = order.filter(k => norms[k] > 1e-11 * top && norms[k] > 0);
  const d = keep.map(k => norms[k]);
  const L = A.map(r => keep.map((k, q) => r[k] / d[q]));          /* m × K */
  const R = W.map(r => keep.map(k => r[k]));                        /* n × K */
  return tr ? { d, U: R, V: L } : { d, U: L, V: R };
};
/* the sign of every axis is arbitrary; make it reproducible */
GXE.orient = (sv, rule) => {
  sv.d.forEach((_, k) => {
    let flip;
    if (rule === 'meanEnv' && k === 0) flip = gSum(sv.V.map(r => r[k])) < 0;
    else {
      let best = 0, arg = 0;
      sv.V.forEach((r, j) => { if (Math.abs(r[k]) > best + 1e-12) { best = Math.abs(r[k]); arg = j; } });
      flip = sv.V[arg][k] < 0;
    }
    if (flip) { sv.U.forEach(r => { r[k] = -r[k]; }); sv.V.forEach(r => { r[k] = -r[k]; }); }
  });
  return sv;
};

/* additive decomposition of a complete table */
GXE.additive = Y => {
  const g = Y.length, e = Y[0].length;
  const grand = gMean(Y.flat());
  const gm = Y.map(r => gMean(r));
  const em = Y[0].map((_, j) => gMean(Y.map(r => r[j])));
  const Z = Y.map((r, i) => r.map((v, j) => v - gm[i] - em[j] + grand));
  return { g, e, grand, gm, em, Z };
};

/* ---------------- EM-AMMI imputation (Gauch & Zobel 1990) ---------------- */
GXE.impute = (Y, o) => {
  o = o || {};
  const g = Y.length, e = Y[0].length;
  const miss = Y.map(r => r.map(v => !isFinite(v)));
  const nMiss = miss.flat().filter(Boolean).length;
  const X = Y.map(r => r.slice());
  if (!nMiss) return { Y: X, imputed: miss, n: 0, iter: 0, converged: true, axes: 0 };
  const axes = Math.max(0, Math.min(o.axes == null ? 1 : o.axes, Math.min(g, e) - 2));
  /* start: additive fit to the observed cells */
  const obs = Y.flat().filter(isFinite);
  const grand = gMean(obs);
  const rowM = Y.map(r => { const v = r.filter(isFinite); return v.length ? gMean(v) : grand; });
  const colM = Y[0].map((_, j) => { const v = Y.map(r => r[j]).filter(isFinite); return v.length ? gMean(v) : grand; });
  for (let i = 0; i < g; i++) for (let j = 0; j < e; j++) if (miss[i][j]) X[i][j] = rowM[i] + colM[j] - grand;
  const sd = Math.sqrt(gMean(obs.map(v => sq(v - grand)))) || 1;
  let iter = 0, converged = false;
  for (; iter < (o.maxIter || 5000); iter++) {
    const A = GXE.additive(X);
    let fit = X.map((r, i) => r.map((_, j) => A.gm[i] + A.em[j] - A.grand));
    if (axes > 0) {
      const sv = GXE.svd(A.Z);
      for (let k = 0; k < Math.min(axes, sv.d.length); k++) for (let i = 0; i < g; i++) for (let j = 0; j < e; j++) fit[i][j] += sv.d[k] * sv.U[i][k] * sv.V[j][k];
    }
    let delta = 0;
    for (let i = 0; i < g; i++) for (let j = 0; j < e; j++) if (miss[i][j]) { delta = Math.max(delta, Math.abs(fit[i][j] - X[i][j])); X[i][j] = fit[i][j]; }
    if (delta < (o.tol || 1e-10) * sd) { converged = true; iter++; break; }
  }
  return { Y: X, imputed: miss, n: nMiss, iter, converged, axes };
};

/* ---------------- 1 · analysis of variance of the table ---------------- */
GXE.anova = (Y, o) => {
  const A = GXE.additive(Y), { g, e } = A;
  const r = o.r || 1, mse = o.mse, dfe = o.dfe;
  const ssG = r * e * gSum(A.gm.map(v => sq(v - A.grand)));
  const ssE = r * g * gSum(A.em.map(v => sq(v - A.grand)));
  const ssGE = r * gSum(A.Z.flat().map(sq));
  const rows = [];
  const pf = (F, d1, d2) => (isFinite(F) && d1 > 0 && d2 > 0 ? 1 - S.pf(F, d1, d2) : NaN);
  const env = { key: 'env', df: e - 1, ss: ssE };
  env.ms = env.ss / env.df;
  rows.push(env);
  if (o.rep && o.rep.df > 0) {
    const rp = { key: 'rep', df: o.rep.df, ss: o.rep.ss, ms: o.rep.ss / o.rep.df };
    rp.F = rp.ms / mse; rp.p = pf(rp.F, rp.df, dfe);
    env.F = env.ms / rp.ms; env.p = pf(env.F, env.df, rp.df); env.against = 'rep';
    rows.push(rp);
  }
  const gen = { key: 'geno', df: g - 1, ss: ssG, ms: ssG / (g - 1) };
  /* every imputed cell costs the interaction one degree of freedom (as a missing plot costs the error one) */
  const dfGE = (g - 1) * (e - 1) - (o.nMissing || 0);
  const ge = { key: 'ge', df: dfGE, ss: ssGE, ms: ssGE / dfGE };
  gen.F = gen.ms / ge.ms; gen.p = pf(gen.F, gen.df, ge.df); gen.against = 'ge';
  if (mse > 0) { gen.F2 = gen.ms / mse; gen.p2 = pf(gen.F2, gen.df, dfe); ge.F = ge.ms / mse; ge.p = pf(ge.F, ge.df, dfe); }
  rows.push(gen, ge);
  if (mse > 0) rows.push({ key: 'error', df: dfe, ss: mse * dfe, ms: mse, residual: true });
  const tot = ssG + ssE + ssGE;
  [env, gen, ge].forEach(x => { x.pct = 100 * x.ss / tot; });
  return { rows, ssG, ssE, ssGE, msGE: ge.ms, g, e, r, grand: A.grand, gm: A.gm, em: A.em, cv: mse > 0 ? 100 * Math.sqrt(mse) / Math.abs(A.grand) : NaN };
};

/* ---------------- 2 · regression on the environmental index ---------------- */
GXE.regression = (Y, o) => {
  o = o || {};
  const A = GXE.additive(Y), { g, e, grand, gm, em } = A;
  const r = o.r || 1, mse = o.mse, dfe = o.dfe;
  const I = em.map(v => v - grand);
  const sI2 = gSum(I.map(sq));
  const msMean = mse > 0 ? mse / r : NaN;                  /* error of a cell mean */
  const geno = Y.map((row, i) => {
    const b = gSum(row.map((v, j) => (v - gm[i]) * I[j])) / sI2;
    const dev = row.map((v, j) => v - gm[i] - b * I[j]);
    const ssDev = gSum(dev.map(sq));
    const ssTot = gSum(row.map(v => sq(v - gm[i])));
    const msDev = ssDev / (e - 2);
    return { i, mean: gm[i], b, beta: b - 1, dev, ssDev, msDev, r2: ssTot > 0 ? 1 - ssDev / ssTot : NaN, s2d: msDev - msMean, rmse: Math.sqrt(ssDev / e) };
  });
  const ssPool = gSum(geno.map(x => x.ssDev));
  const dfPool = (g - 1) * (e - 2);
  const msPool = ssPool / dfPool;
  const mode = o.seMode || 'own';
  geno.forEach(x => {
    const v = mode === 'pooled' ? msPool : mode === 'error' ? msMean : x.msDev;
    const df = mode === 'pooled' ? dfPool : mode === 'error' ? dfe : e - 2;
    x.seB = Math.sqrt(v / sI2);
    x.dfB = df;
    x.t = (x.b - 1) / x.seB;
    x.p = isFinite(x.t) && df > 0 ? 2 * (1 - S.pt(Math.abs(x.t), df)) : NaN;
    x.Fdev = x.msDev / msMean;
    x.pDev = isFinite(x.Fdev) ? 1 - S.pf(x.Fdev, e - 2, dfe) : NaN;
  });
  /* Eberhart & Russell's analysis of variance, on the plot scale (× r) */
  const ssG = r * e * gSum(gm.map(v => sq(v - grand)));
  const ssE = r * g * sI2;
  const ssLin = r * gSum(geno.map(x => x.b * x.b)) * sI2;   /* Σ (Σ_j Y_ij I_j)² / Σ I² */
  const ssHet = ssLin - ssE;
  const ssTot = r * gSum(Y.flat().map(v => sq(v - grand)));
  const pf = (F, d1, d2) => (isFinite(F) && d2 > 0 ? 1 - S.pf(F, d1, d2) : NaN);
  const poolRow = { key: 'pooledDev', df: dfPool, ss: r * ssPool, ms: r * msPool };
  const rows = [
    { key: 'total', df: g * e - 1, ss: ssTot },
    { key: 'geno', df: g - 1, ss: ssG, ms: ssG / (g - 1) },
    { key: 'envGe', df: g * (e - 1), ss: ssTot - ssG },
    { key: 'envLin', df: 1, ss: ssE, ms: ssE, sub: true },
    { key: 'geLin', df: g - 1, ss: ssHet, ms: ssHet / (g - 1), sub: true },
    Object.assign(poolRow, { sub: true }),
  ];
  rows[1].F = rows[1].ms / poolRow.ms; rows[1].p = pf(rows[1].F, g - 1, dfPool);
  rows[4].F = rows[4].ms / poolRow.ms; rows[4].p = pf(rows[4].F, g - 1, dfPool);
  if (mse > 0) { poolRow.F = poolRow.ms / mse; poolRow.p = pf(poolRow.F, dfPool, dfe); }
  geno.forEach(x => rows.push({ key: 'dev', i: x.i, df: e - 2, ss: r * x.ssDev, ms: r * x.msDev, F: x.Fdev, p: x.pDev, sub: true, deep: true }));
  if (mse > 0) rows.push({ key: 'error', df: dfe, ss: mse * dfe, ms: mse, residual: true });
  return { geno, I, sI2, rows, msPool, dfPool, dfPoolER: g * (e - 2), msPoolER: ssPool / (g * (e - 2)), ssHet, seMode: mode };
};

/* ---------------- 3 · stability variances ---------------- */
GXE.variances = (Y, o) => {
  const A = GXE.additive(Y), { g, e, Z } = A;
  const r = o.r || 1, mse = o.mse, dfe = o.dfe;
  const W = Z.map(row => r * gSum(row.map(sq)));                         /* Wricke's ecovalence */
  const sW = gSum(W);
  /* Shukla's stability variance: an estimate of Var(GE_ij + ε_ij) for genotype i, plot scale */
  const sig = W.map(w => (g * (g - 1) * w - sW) / ((g - 1) * (g - 2) * (e - 1)));
  /* Shukla's s²: the same after removing the regression on the environmental index */
  const reg = GXE.regression(Y, o);
  const sa = reg.geno.map(x => x.ssDev);
  const sSa = gSum(sa);
  const s2 = sa.map(v => r * (g / ((g - 2) * (e - 2))) * (v - sSa / (g * (g - 1))));
  const pf = (F, d1) => (isFinite(F) && dfe > 0 ? 1 - S.pf(Math.max(0, F), d1, dfe) : NaN);
  return Y.map((_, i) => ({
    i, W: W[i], Wpct: 100 * W[i] / sW,
    sigma2: sig[i], F: mse > 0 ? sig[i] / mse : NaN, p: mse > 0 ? pf(sig[i] / mse, e - 1) : NaN,
    s2: s2[i], Fs: mse > 0 ? s2[i] / mse : NaN, ps: mse > 0 ? pf(s2[i] / mse, e - 2) : NaN,
    sigma2GE: mse > 0 ? sig[i] - mse : NaN,
  }));
};

/* ---------------- 4 · superiority and reliability ---------------- */
GXE.superiority = (Y, o) => {
  o = o || {};
  const A = GXE.additive(Y), { e, em, grand } = A;
  const lower = o.lower;
  const best = Y[0].map((_, j) => (lower ? Math.min : Math.max)(...Y.map(r => r[j])));
  const fav = em.map(v => (lower ? v <= grand : v >= grand));
  const P = cols => Y.map(row => (cols.length ? gSum(cols.map(j => sq(row[j] - best[j]))) / (2 * cols.length) : NaN));
  const all = Y[0].map((_, j) => j);
  const pa = P(all), pf = P(all.filter(j => fav[j])), pu = P(all.filter(j => !fav[j]));
  const mBest = gMean(best);
  return {
    best, fav,
    rows: Y.map((row, i) => {
      const gi = gMean(row);
      const gen = e * sq(gi - mBest) / (2 * e);
      return { i, P: pa[i], Pfav: pf[i], Punf: pu[i], Pgen: gen, Pge: pa[i] - gen };
    }),
  };
};
GXE.annicchiarico = (Y, o) => {
  o = o || {};
  const A = GXE.additive(Y), { em, grand } = A;
  const z = S.qnorm(1 - (o.alpha == null ? 0.25 : o.alpha));
  const fav = em.map(v => v >= grand);
  const one = cols => Y.map(row => {
    const rp = cols.map(j => 100 * row[j] / em[j]);
    const m = rp.length ? gMean(rp) : NaN;
    const s = rp.length > 1 ? Math.sqrt(gSum(rp.map(v => sq(v - m))) / (rp.length - 1)) : NaN;
    return { mean: m, sd: s, W: m - z * s };
  });
  const all = Y[0].map((_, j) => j);
  const a = one(all), f = one(all.filter(j => fav[j])), u = one(all.filter(j => !fav[j]));
  return { z, fav, rows: Y.map((_, i) => ({ i, all: a[i], fav: f[i], unf: u[i] })) };
};

/* ---------------- 5 · rank statistics (Huehn 1979; Nassar & Huehn 1987) ---------------- */
GXE.huehn = Y => {
  const A = GXE.additive(Y), { g, e, grand, gm } = A;
  const rankCols = M => { const R = M.map(r => r.slice()); for (let j = 0; j < e; j++) { const rk = GXE.ranks(M.map(r => r[j])); rk.forEach((v, i) => { R[i][j] = v; }); } return R; };
  const Rc = rankCols(Y.map((row, i) => row.map(v => v - gm[i] + grand)));   /* corrected for genotype effects */
  const Ru = rankCols(Y);                                                      /* uncorrected */
  const K = g, N = e;
  const E1 = (K * K - 1) / (3 * K), V1 = (K * K - 1) * ((K * K - 4) * (N + 3) + 30) / (45 * K * K * N * (N - 1));
  const E2 = (K * K - 1) / 12, V2 = (K * K - 1) * (2 * (K * K - 4) * (N - 1) + 5 * (K * K - 1)) / (360 * N * (N - 1));
  const rows = Y.map((_, i) => {
    const rc = Rc[i], ru = Ru[i];
    let s1 = 0;
    for (let j = 0; j < N; j++) for (let k = j + 1; k < N; k++) s1 += Math.abs(rc[j] - rc[k]);
    s1 = 2 * s1 / (N * (N - 1));
    const mc = gMean(rc), mu = gMean(ru);
    const s2 = gSum(rc.map(v => sq(v - mc))) / (N - 1);
    const s3 = gSum(ru.map(v => sq(v - mu))) / mu;
    const s6 = gSum(ru.map(v => Math.abs(v - mu))) / mu;
    const z1 = sq(s1 - E1) / V1, z2 = sq(s2 - E2) / V2;
    return { i, S1: s1, S2: s2, S3: s3, S6: s6, Z1: z1, Z2: z2, p1: 1 - S.pchisq(z1, 1), p2: 1 - S.pchisq(z2, 1), meanRank: mu };
  });
  const sZ1 = gSum(rows.map(x => x.Z1)), sZ2 = gSum(rows.map(x => x.Z2));
  return { rows, E1, V1, E2, V2, sumZ1: sZ1, sumZ2: sZ2, pSum1: 1 - S.pchisq(sZ1, g), pSum2: 1 - S.pchisq(sZ2, g), ranks: Rc };
};

/* ---------------- 6 · yield–stability of Kang (1993) ---------------- */
GXE.kang = (Y, vars, o) => {
  const A = GXE.additive(Y), { g, e, gm } = A;
  const r = o.r || 1, mse = o.mse, dfe = o.dfe, lower = o.lower;
  if (!(mse > 0 && dfe > 0)) return null;
  const lsd = S.qt(1 - (o.alphaLSD || 0.05), dfe) * Math.sqrt(2 * mse / (r * e));
  const mm = gMean(gm);
  const fq = p => S.qf(1 - p, e - 1, dfe);
  const F10 = fq(0.10), F05 = fq(0.05), F01 = fq(0.01);
  const rows = gm.map((m, i) => {
    const km = tieKey(m), rank = 1 + gm.filter(v => (lower ? tieKey(v) > km : tieKey(v) < km)).length;
    const d = lower ? mm - m : m - mm;
    let adj = d > 0 ? 1 : d < 0 ? -1 : 0;
    if (d >= lsd) adj = 2; if (d >= 2 * lsd) adj = 3;
    if (d <= -lsd) adj = -2; if (d <= -2 * lsd) adj = -3;
    const F = vars[i].F;
    const stab = F >= F01 ? -8 : F >= F05 ? -4 : F >= F10 ? -2 : 0;
    return { i, mean: m, rank, adj, adjRank: rank + adj, sigma2: vars[i].sigma2, stab, ysi: rank + adj + stab };
  });
  const mY = gMean(rows.map(x => x.ysi));
  rows.forEach(x => { x.selected = x.ysi > mY; });
  return { rows, lsd, meanYsi: mY, F: { F10, F05, F01 } };
};

/* ---------------- 7 · AMMI ---------------- */
GXE.ammi = (Y, o) => {
  o = o || {};
  const A = GXE.additive(Y), { g, e, grand, gm, em, Z } = A;
  const r = o.r || 1, mse = o.mse, dfe = o.dfe, alpha = o.alpha || 0.05;
  const sv = GXE.orient(GXE.svd(Z));
  const m = Math.min(sv.d.length, g - 1, e - 1);
  const ssGE = r * gSum(Z.flat().map(sq));
  const pf = (F, d1, d2) => (isFinite(F) && d1 > 0 && d2 > 0 ? 1 - S.pf(F, d1, d2) : NaN);
  let cum = 0;
  const axes = [];
  for (let k = 0; k < m; k++) {
    const ss = r * sv.d[k] * sv.d[k];
    cum += ss;
    const df = g + e - 1 - 2 * (k + 1);
    const ax = { k: k + 1, sv: sv.d[k], ss, pct: 100 * ss / ssGE, cum: 100 * cum / ssGE, df };
    if (df > 0) { ax.ms = ss / df; if (mse > 0) { ax.F = ax.ms / mse; ax.p = pf(ax.F, df, dfe); } }
    axes.push(ax);
  }
  const listed = axes.filter(a => a.df > 0);
  const resid = { ss: ssGE - gSum(listed.map(a => a.ss)), df: (g - 1) * (e - 1) - gSum(listed.map(a => a.df)) };
  if (resid.df > 0) { resid.ms = resid.ss / resid.df; if (mse > 0) { resid.F = resid.ms / mse; resid.p = pf(resid.F, resid.df, dfe); } }
  /* Cornelius et al. (1992): F_R of the residual after n axes */
  const FR = [];
  let ssR = ssGE;
  for (let n = 0; n < m; n++) {
    const df = (g - 1 - n) * (e - 1 - n);
    if (df <= 0) break;
    const row = { n, ss: ssR, df, ms: ssR / df };
    if (mse > 0) { row.F = row.ms / mse; row.p = pf(row.F, df, dfe); }
    FR.push(row);
    ssR -= axes[n].ss;
  }
  let nGollob = 0;
  while (nGollob < listed.length && listed[nGollob].p < alpha) nGollob++;
  let nFR = FR.findIndex(x => !(x.p < alpha));
  if (nFR < 0) nFR = FR.length;
  /* symmetric scores: U·√λ and V·√λ */
  const G = sv.U.map(u => u.slice(0, m).map((v, k) => v * Math.sqrt(sv.d[k])));
  const E = sv.V.map(u => u.slice(0, m).map((v, k) => v * Math.sqrt(sv.d[k])));
  const out = { axes, resid, FR, nGollob, nFR, G, E, sv, ssGE, grand, gm, em, g, e, m };
  /* ASV (Purchase 1997) */
  if (m >= 2) out.asv = G.map(s => Math.sqrt(sq(axes[0].ss / axes[1].ss * s[0]) + sq(s[1])));
  /* WAAS (Olivoto et al. 2019), weighted by the share of every axis */
  /* the number of axes: the F_R test by default (Gollob's F declares the first axis significant far
     too often when there is no interaction; Cornelius et al. 1993, Piepho 1995) */
  const rule = o.axesRule || 'FR';
  const byTest = rule === 'gollob' ? nGollob : nFR;
  const p = Math.max(1, Math.min(m, o.p || (mse > 0 ? Math.max(1, byTest) : Math.min(2, m))));
  out.p = p; out.axesRule = o.p ? 'fixed' : mse > 0 ? rule : 'none';
  const wsum = gSum(axes.slice(0, p).map(a => a.pct));
  out.waas = G.map(s => gSum(s.slice(0, p).map((v, k) => Math.abs(v) * axes[k].pct)) / wsum);
  out.waasEnv = E.map(s => gSum(s.slice(0, p).map((v, k) => Math.abs(v) * axes[k].pct)) / wsum);
  const wY = o.wY == null ? 50 : o.wY, wS = o.wS == null ? 50 : o.wS;
  const rescale = (v, lo, hi, best) => { const a = Math.min(...v), b = Math.max(...v); return v.map(x => (b > a ? (best === 'high' ? lo + (hi - lo) * (x - a) / (b - a) : hi - (hi - lo) * (x - a) / (b - a)) : 100)); };
  out.rY = rescale(gm, 0, 100, o.lower ? 'low' : 'high');
  out.rW = rescale(out.waas, 0, 100, 'low');
  out.waasy = out.rY.map((v, i) => (v * wY + out.rW[i] * wS) / (wY + wS));
  out.wY = wY; out.wS = wS;
  /* yield stability index of Farshadfar (2008): rank of ASV + rank of the mean */
  if (out.asv) {
    const rA = GXE.ranks(out.asv), rM = GXE.ranks(gm.map(v => (o.lower ? v : -v)));
    out.ysi = rA.map((v, i) => v + rM[i]); out.rankAsv = rA; out.rankMean = rM;
  }
  /* AMMI-n predictions and the winner of every environment */
  out.predict = n => Y.map((row, i) => row.map((_, j) => {
    let v = gm[i] + em[j] - grand;
    for (let k = 0; k < Math.min(n, m); k++) v += sv.d[k] * sv.U[i][k] * sv.V[j][k];
    return v;
  }));
  out.winners = (n, top) => {
    const P = out.predict(n);
    return em.map((_, j) => {
      const idx = P.map((_, i) => i).sort((a, b) => (o.lower ? P[a][j] - P[b][j] : P[b][j] - P[a][j]));
      return idx.slice(0, top || 4).map(i => ({ i, y: P[i][j] }));
    });
  };
  return out;
};

/* ---------------- 8 · GGE biplot (Yan et al. 2000; Yan & Kang 2003) ---------------- */
GXE.gge = (Y, o) => {
  o = o || {};
  const g = Y.length, e = Y[0].length;
  const em = Y[0].map((_, j) => gMean(Y.map(r => r[j])));
  const sdv = Y[0].map((_, j) => Math.sqrt(gSum(Y.map(r => sq(r[j] - em[j]))) / (g - 1)));
  const sign = o.lower ? -1 : 1;
  const Z = Y.map(row => row.map((v, j) => sign * (v - em[j]) / (o.scaling === 'sd' && sdv[j] > 0 ? sdv[j] : 1)));
  const sv = GXE.orient(GXE.svd(Z), 'meanEnv');
  const tot = gSum(sv.d.map(sq));
  const pct = sv.d.map(v => 100 * v * v / tot);
  const coords = svp => {
    const f = svp === 'environment' ? 0 : svp === 'symmetric' ? 0.5 : 1;
    return {
      G: sv.U.map(u => u.map((v, k) => v * Math.pow(sv.d[k], f))),
      E: sv.V.map(u => u.map((v, k) => v * Math.pow(sv.d[k], 1 - f))),
    };
  };
  return { sv, pct, coords, em, sd: sdv, Z, scaling: o.scaling || 'none', lower: !!o.lower };
};

/* convex hull of 2-D points, counter-clockwise (Andrew's monotone chain) */
GXE.hull = P => {
  const idx = P.map((_, i) => i).sort((a, b) => P[a][0] - P[b][0] || P[a][1] - P[b][1]);
  const cross = (o, a, b) => (P[a][0] - P[o][0]) * (P[b][1] - P[o][1]) - (P[a][1] - P[o][1]) * (P[b][0] - P[o][0]);
  const lower = [], upper = [];
  idx.forEach(i => { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 1e-12) lower.pop(); lower.push(i); });
  idx.slice().reverse().forEach(i => { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 1e-12) upper.pop(); upper.push(i); });
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};

/* which won where: the vertices of the hull win the sectors cut by the outward normals of
   its edges; every environment belongs to the genotype of largest projection on it */
GXE.whichWon = (G, E) => {
  const P = G.map(s => [s[0], s[1]]);
  const hull = GXE.hull(P);
  const rays = hull.map((a, q) => {
    const b = hull[(q + 1) % hull.length];
    const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1];
    return { a, b, nx: dy, ny: -dx };
  });
  const winner = E.map(s => {
    let best = -Infinity, arg = -1;
    P.forEach((p, i) => { const v = p[0] * s[0] + p[1] * s[1]; if (v > best) { best = v; arg = i; } });
    return arg;
  });
  const mega = new Map();
  winner.forEach((w, j) => { if (!mega.has(w)) mega.set(w, []); mega.get(w).push(j); });
  return { hull, rays, winner, mega: [...mega.entries()].map(([w, envs]) => ({ winner: w, envs })) };
};

/* the average-environment coordination (Yan 2001) */
GXE.aec = (G, E) => {
  const a = [gMean(E.map(s => s[0])), gMean(E.map(s => s[1]))];
  const len = Math.hypot(a[0], a[1]) || 1;
  const u = [a[0] / len, a[1] / len];
  const proj = G.map(s => s[0] * u[0] + s[1] * u[1]);
  const perp = G.map(s => Math.abs(s[0] * u[1] - s[1] * u[0]));
  const gLen = G.map(s => Math.hypot(s[0], s[1]));
  const eLen = E.map(s => Math.hypot(s[0], s[1]));
  const idealG = Math.max(...gLen.filter((_, i) => proj[i] > 0), 0);
  const idealE = Math.max(...eLen);
  const ig = [u[0] * idealG, u[1] * idealG], ie = [u[0] * idealE, u[1] * idealE];
  return {
    a, u, proj, perp, idealG: ig, idealE: ie,
    distG: G.map(s => Math.hypot(s[0] - ig[0], s[1] - ig[1])),
    distE: E.map(s => Math.hypot(s[0] - ie[0], s[1] - ie[1])),
    eLen, cosE: E.map((s, j) => (eLen[j] > 0 ? (s[0] * u[0] + s[1] * u[1]) / eLen[j] : NaN)),
  };
};
/* two genotypes: the environments on either side of the perpendicular to their connector */
GXE.compare = (G, E, a, b) => E.map(s => (s[0] * (G[a][0] - G[b][0]) + s[1] * (G[a][1] - G[b][1]) > 0 ? a : b));

/* ---------------- 9 · two-stage analysis with an error variance in every environment ----
   y_ij = μ + a_i + b_j + ge_ij + ε_ij, ge ~ N(0, σ²GE), Var(ε_ij) = v_ij known from stage one
   (Smith, Cullis & Thompson 2005; Möhring & Piepho 2009). σ²GE by REML (one parameter). */
GXE.stageTwo = (tab, o) => {
  o = o || {};
  const cells = [];
  tab.Y.forEach((row, i) => row.forEach((y, j) => { const v = tab.V[i][j]; if (isFinite(y) && v > 0) cells.push({ i, j, y, v }); }));
  const g = tab.Y.length, e = tab.envs.length, n = cells.length;
  const p = g + e - 1;
  if (n <= p + 1 || e < 2 || g < 2) return null;
  const E1 = e - 1;
  /* genotype effects absorbed; environment j = 0 is the reference */
  const absorb = s2 => {
    const w = cells.map(c => 1 / (s2 + c.v));
    const Da = new Array(g).fill(0), ra = new Array(g).fill(0), Da2 = new Array(g).fill(0);
    const B = Array.from({ length: g }, () => new Array(E1).fill(0)), B2 = Array.from({ length: g }, () => new Array(E1).fill(0));
    const Db = new Array(E1).fill(0), rb = new Array(E1).fill(0), Db2 = new Array(E1).fill(0);
    cells.forEach((c, k) => {
      const wk = w[k];
      Da[c.i] += wk; ra[c.i] += wk * c.y; Da2[c.i] += wk * wk;
      if (c.j > 0) { const a = c.j - 1; B[c.i][a] += wk; B2[c.i][a] += wk * wk; Db[a] += wk; Db2[a] += wk * wk; rb[a] += wk * c.y; }
    });
    const Sm = Array.from({ length: E1 }, (_, a) => Array.from({ length: E1 }, (_, b) => (a === b ? Db[a] : 0)));
    const rs = rb.slice();
    for (let i = 0; i < g; i++) for (let a = 0; a < E1; a++) {
      if (!B[i][a]) continue;
      rs[a] -= B[i][a] * ra[i] / Da[i];
      for (let b = 0; b < E1; b++) Sm[a][b] -= B[i][a] * B[i][b] / Da[i];
    }
    const L = S.cholesky(Sm);
    if (!L) return null;
    const solveL = rhs => {
      const z = rhs.slice();
      for (let a = 0; a < z.length; a++) { for (let k = 0; k < a; k++) z[a] -= L[a][k] * z[k]; z[a] /= L[a][a]; }
      for (let a = z.length - 1; a >= 0; a--) { for (let k = a + 1; k < z.length; k++) z[a] -= L[k][a] * z[k]; z[a] /= L[a][a]; }
      return z;
    };
    const bh = solveL(rs);
    const ah = Da.map((d, i) => (ra[i] - gSum(B[i].map((x, a) => x * bh[a]))) / d);
    const res = cells.map(c => c.y - ah[c.i] - (c.j > 0 ? bh[c.j - 1] : 0));
    return { w, Da, Da2, B, B2, Db2, L, solveL, ah, bh, res };
  };
  const logLik = A => {
    let q = 0, logV = 0;
    cells.forEach((c, k) => { q += A.w[k] * A.res[k] * A.res[k]; logV -= Math.log(A.w[k]); });
    return -0.5 * (logV + gSum(A.Da.map(Math.log)) + 2 * gSum(A.L.map((r, a) => Math.log(r[a]))) + q);
  };
  const inverseS = A => Array.from({ length: E1 }, (_, a) => A.solveL(Array.from({ length: E1 }, (_, b) => (a === b ? 1 : 0))));
  /* REML score: ½[y′PPy − tr P], tr P = Σw − tr[(X′WX)⁻¹X′W²X] through the absorbed blocks */
  const score = s2 => {
    const A = absorb(s2);
    if (!A) return NaN;
    const Si = inverseS(A);
    const H = A.B.map((row, i) => row.map(x => x / A.Da[i]));
    const HS = H.map(row => Si.map(col => gSum(row.map((x, a) => x * col[a]))));
    let tr = 0;
    for (let i = 0; i < g; i++) {
      tr += A.Da2[i] * (1 / A.Da[i] + gSum(HS[i].map((x, a) => x * H[i][a])));
      tr -= 2 * gSum(HS[i].map((x, a) => x * A.B2[i][a]));
    }
    for (let a = 0; a < E1; a++) tr += Si[a][a] * A.Db2[a];
    const trP = gSum(A.w) - tr;
    const yPPy = gSum(A.res.map((r, k) => A.w[k] * A.w[k] * r * r));
    return 0.5 * (yPPy - trP);
  };
  const ll = s2 => { const A = absorb(s2); return A ? logLik(A) : -Infinity; };
  const ll0 = ll(0);
  if (!isFinite(ll0)) return null;
  /* a grid on √σ², then the root of the score by bisection and secant steps */
  const ys = cells.map(c => c.y);
  const hi = Math.max(1e-8, 4 * gSum(ys.map(v => sq(v - gMean(ys)))) / n);
  let s2 = 0, bestLL = ll0;
  const grid = 60;
  for (let k = 1; k <= grid; k++) { const t = hi * sq(k / grid), f = ll(t); if (f > bestLL) { bestLL = f; s2 = t; } }
  if (score(0) > 0 || s2 > 0) {
    let lo = s2 > 0 ? hi * sq(Math.max(0, Math.sqrt(s2 / hi) - 1 / grid)) : 0, up = hi * sq(Math.sqrt(s2 / hi) + 1 / grid);
    let fl = score(lo), fu = score(up);
    if (fl > 0 && fu < 0) {
      for (let it = 0; it < 200; it++) {
        let mid = lo - fl * (up - lo) / (fu - fl);                   /* false position, */
        if (!(mid > lo && mid < up) || it % 3 === 2) mid = (lo + up) / 2;  /* bisected every third step */
        const fm = score(mid);
        if (fm > 0) { lo = mid; fl = fm; } else { up = mid; fu = fm; }
        if (up - lo <= 1e-15 * up || fm === 0) break;
      }
      /* the end of the bracket closest to the root (an exact zero ends the search there) */
      s2 = Math.abs(fl) < Math.abs(fu) ? lo : up;
    }
  }
  if (ll(s2) < ll0) s2 = 0;
  const A = absorb(s2);
  const Si = inverseS(A);
  /* genotype means over the environments, m = a + 1c′b, and their covariance
     Cov(m) = D_a⁻¹ + H S⁻¹ H′ − H S⁻¹ c 1′ − 1 c′ S⁻¹ H′ + c′S⁻¹c 1 1′ */
  const c = new Array(E1).fill(1 / e);
  const Sc = Si.map(r => gSum(r.map((x, b) => x * c[b])));
  const cSc = gSum(Sc.map((x, a) => x * c[a]));
  const H = A.B.map((row, i) => row.map(x => x / A.Da[i]));
  const HS = H.map(row => Si.map(col => gSum(row.map((x, a) => x * col[a]))));
  const HSc = H.map(row => gSum(row.map((x, a) => x * Sc[a])));
  const means = A.ah.map(a => a + gSum(A.bh.map((x, k) => x * c[k])));
  const M = Array.from({ length: g }, (_, i) => Array.from({ length: g }, (_, k) => (i === k ? 1 / A.Da[i] : 0)
    + gSum(HS[i].map((x, a) => x * H[k][a])) - HSc[i] - HSc[k] + cSc));
  const llHat = logLik(A);
  const lrt = Math.max(0, 2 * (llHat - ll0));
  /* Wald test for equal genotype means (g − 1 contrasts with the last) */
  const K = g - 1;
  const d = means.slice(0, K).map(m => m - means[K]);
  const C = Array.from({ length: K }, (_, a) => Array.from({ length: K }, (_, b) => M[a][b] - M[a][K] - M[K][b] + M[K][K]));
  const Cd = S.solve(C, d);
  const Fw = gSum(d.map((x, a) => x * Cd[a])) / K;
  const df2 = n - p;
  let sed = 0, cnt = 0;
  for (let a = 0; a < g; a++) for (let b = a + 1; b < g; b++) { sed += M[a][a] + M[b][b] - 2 * M[a][b]; cnt++; }
  return {
    s2GE: s2, score: s2 > 0 ? score(s2) : NaN, scoreAt: score, llAt: ll, ll: llHat, ll0, lrt, pLrt: 0.5 * (1 - S.pchisq(lrt, 1)),
    means, se: M.map((r, i) => Math.sqrt(r[i])), sed: Math.sqrt(sed / cnt), F: Fw, df1: K, df2, p: 1 - S.pf(Fw, K, df2), n,
  };
};

/* ---------------- everything for one table ---------------- */
GXE.run = (tab, o) => {
  o = o || {};
  const base = { r: tab.r, mse: tab.mse, dfe: tab.dfe, lower: o.lower };
  const imp = GXE.impute(tab.Y, { axes: o.imputeAxes });
  const Y = imp.Y;
  const g = Y.length, e = Y[0].length;
  const out = { tab, imp, Y, g, e, lower: !!o.lower };
  out.anova = GXE.anova(Y, Object.assign({ rep: tab.rep, nMissing: imp.n }, base));
  if (e >= 3) out.reg = GXE.regression(Y, Object.assign({ seMode: o.seMode }, base));
  if (g >= 3 && e >= 3) out.vars = GXE.variances(Y, base);
  out.sup = GXE.superiority(Y, base);
  if (!o.lower) out.ann = GXE.annicchiarico(Y, { alpha: o.annAlpha });
  if (g >= 3 && e >= 3) out.huehn = GXE.huehn(Y);
  if (out.vars) out.kang = GXE.kang(Y, out.vars, Object.assign({ alphaLSD: o.alphaLSD }, base));
  if (g >= 3 && e >= 3) out.ammi = GXE.ammi(Y, Object.assign({ p: o.waasAxes, axesRule: o.axesRule, wY: o.wY, wS: o.wS, alpha: o.alpha }, base));
  if (g >= 3 && e >= 2) out.gge = GXE.gge(Y, { scaling: o.scaling, lower: o.lower });
  if (tab.envErr && tab.V) out.stage2 = GXE.stageTwo(tab);
  return out;
};

/* Spearman correlations between the mean and the stability statistics */
GXE.statColumns = res => {
  const cols = [];
  const add = (key, name, v) => { if (v && v.every(x => isFinite(x))) cols.push({ key, name, v }); };
  add('mean', T('Media', 'Mean'), res.anova.gm);
  if (res.reg) { add('b', 'b', res.reg.geno.map(x => x.b)); add('s2d', 'S²d', res.reg.geno.map(x => x.s2d)); add('r2', 'R²', res.reg.geno.map(x => x.r2)); }
  if (res.vars) { add('W', 'W', res.vars.map(x => x.W)); add('sigma2', 'σ²', res.vars.map(x => x.sigma2)); }
  add('P', 'Pi', res.sup.rows.map(x => x.P));
  if (res.ann) add('ann', T('Wi (Annicchiarico)', 'Wi (Annicchiarico)'), res.ann.rows.map(x => x.all.W));
  if (res.huehn) { add('S1', 'S1', res.huehn.rows.map(x => x.S1)); add('S2', 'S2', res.huehn.rows.map(x => x.S2)); add('S3', 'S3', res.huehn.rows.map(x => x.S3)); add('S6', 'S6', res.huehn.rows.map(x => x.S6)); }
  if (res.kang) add('ysi', 'YSi', res.kang.rows.map(x => x.ysi));
  if (res.ammi) { if (res.ammi.asv) add('asv', 'ASV', res.ammi.asv); add('waas', 'WAAS', res.ammi.waas); add('waasy', 'WAASY', res.ammi.waasy); }
  return cols;
};
GXE.spearman = cols => cols.map(a => cols.map(b => S.spearman(a.v, b.v)));

window.GXE = GXE;
