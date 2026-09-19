/* BreedingPro — Block 8: genetic parameters and selection.

   Variance components and heritability on a plot and on an entry-mean basis, with the
   delta-method standard error and the exact confidence interval of Knapp, Stroup & Ross
   (1985); coefficients of variation and genetic advance with the exact selection intensity
   (and its finite-population versions of Burrows 1972, Bulmer 1980 and the exact expected
   order statistics); genotypic, phenotypic and environmental correlations from mean
   cross-products with delta-method standard errors built on Wishart moments; path
   analysis; the selection indices of Smith–Hazel, the base index, the restricted index of
   Kempthorne & Nordskog, the predetermined proportional gains of Mallard/Tallis, the desired
   gains of Pesek & Baker, the eigen index, and the rank-sum and multiplicative indices; and
   the expected gain per cycle and per year of the recurrent-selection methods (Sprague &
   Eberhart 1977, as tabulated by Fehr 1987).

   One convention for the whole application: the variance of a mean square with f degrees
   of freedom is taken as 2M²/f (Blocks 4 and 6 use the same). */

const SEL = {};

/* ================= small matrix algebra ================= */
const mT = A => A[0].map((_, j) => A.map(r => r[j]));
const mMul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const mVec = (A, v) => A.map(r => r.reduce((s, x, k) => s + x * v[k], 0));
const vDot = (a, b) => a.reduce((s, x, k) => s + x * b[k], 0);
const mSub = (A, B) => A.map((r, i) => r.map((v, j) => v - B[i][j]));
const eye = n => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
const cols = (A, idx) => A.map(r => idx.map(j => r[j]));
SEL.mat = { mT, mMul, mVec, vDot, eye };

/* ================= 1 · selection intensity ================= */
/* truncation of the upper fraction p of an infinite normal population: i = φ(x_p)/p */
SEL.intensity = p => {
  if (!(p > 0 && p < 1)) return NaN;
  const x = S.qnorm(1 - p);
  return S.dnorm(x) / p;
};
/* N saved out of M measured: Burrows (1972), Bulmer (1980) and the exact mean of the N
   largest of M normal order statistics, (M/N)∫xφ(x)Pr[Bin(M−1, 1−Φ(x)) ≤ N−1]dx */
SEL.intensityFinite = (N, M) => {
  const p = N / M, i = SEL.intensity(p);
  const out = { p, i, burrows: i - (1 - p) / (2 * p * (M + 1)) / i, bulmer: SEL.intensity((N + 0.5) / (M + N / (2 * M))) };
  if (N >= 1 && N < M && M <= 100000) {
    const pr = x => { const q = 1 - S.pnorm(x); return S.betainc(1 - q, M - N, N); };   /* Pr[Bin(M−1, q) ≤ N−1] */
    const lo = -9, hi = 9, steps = 6000, h = (hi - lo) / steps;
    let s = 0;
    for (let k = 0; k <= steps; k++) {
      const x = lo + k * h;
      const f = x * S.dnorm(x) * pr(x);
      s += (k === 0 || k === steps ? 1 : k % 2 ? 4 : 2) * f;
    }
    out.exact = (M / N) * s * h / 3;
  }
  return out;
};

/* ================= 2 · heritability and its interval ================= */
/* Knapp, Stroup & Ross (1985): (M1/M2)(1 − H²) ~ F(f1, f2) */
SEL.knapp = (M1, f1, M2, f2, alpha) => {
  alpha = alpha || 0.05;
  const F = M1 / M2;
  if (!(F > 0) || !(f1 > 0) || !(f2 > 0)) return { lo: NaN, hi: NaN };
  return { lo: 1 - S.qf(1 - alpha / 2, f1, f2) / F, hi: 1 - S.qf(alpha / 2, f1, f2) / F, F };
};

/* genetic parameters of one trait from its analysis of variance. ms/df: G (entries),
   GE (entries × environments, when there are several) and E (error, plot scale); r = plots
   per entry and environment; e = environments; mean = trial mean; p = proportion selected */
SEL.parameters = o => {
  const r = o.r || 1, e = o.e || 1;
  const MG = o.ms.G, ME = o.ms.E, fG = o.df.G, fE = o.df.E;
  const multi = o.ms.GE != null && e > 1;
  const MGE = multi ? o.ms.GE : null, fGE = multi ? o.df.GE : null;
  const out = { multi, r, e };
  /* components by moments */
  out.s2g = multi ? (MG - MGE) / (r * e) : (MG - ME) / r;
  out.s2ge = multi ? (MGE - ME) / r : NaN;
  out.s2e = ME;
  const denom = multi ? MGE : ME, fDen = multi ? fGE : fE;
  const c = 1 / (multi ? r * e : r);
  out.seS2g = Math.sqrt(c * c * (2 * MG * MG / fG + 2 * denom * denom / fDen));
  out.seS2ge = multi ? Math.sqrt((2 * MGE * MGE / fGE + 2 * ME * ME / fE) / (r * r)) : NaN;
  /* the phenotypic variance of an entry mean is the mean square of entries over r·e */
  out.s2pMean = MG / (r * e);
  out.s2pPlot = Math.max(0, out.s2g) + (multi ? Math.max(0, out.s2ge) : 0) + ME;
  out.h2mean = 1 - denom / MG;
  out.h2plot = out.s2g / (out.s2g + (multi ? Math.max(0, out.s2ge) : 0) + ME);
  /* delta method: Var(1 − M2/M1) = (M2/M1)²[2/f1 + 2/f2] */
  out.seH2mean = Math.abs(denom / MG) * Math.sqrt(2 / fG + 2 / fDen);
  const kn = SEL.knapp(MG, fG, denom, fDen, o.alpha);
  out.knapp = kn;
  out.Fratio = MG / denom; out.dfNum = fG; out.dfDen = fDen;
  out.pF = 1 - S.pf(MG / denom, fG, fDen);
  /* coefficients of variation (Burton & DeVane 1953), all on the entry-mean basis for PCV */
  const m = Math.abs(o.mean);
  out.gcv = out.s2g > 0 ? 100 * Math.sqrt(out.s2g) / m : NaN;
  out.pcv = 100 * Math.sqrt(out.s2pMean) / m;
  out.ecv = 100 * Math.sqrt(ME) / m;
  out.ratioGP = out.gcv / out.pcv;
  /* genetic advance (Johnson, Robinson & Comstock 1955): i·σP̄·H² on the entry-mean basis */
  const i = o.i != null ? o.i : SEL.intensity(o.p || 0.05);
  out.i = i;
  const h2 = Math.max(0, out.h2mean);
  out.ga = i * Math.sqrt(out.s2pMean) * h2;
  out.gaPct = 100 * out.ga / m;
  out.negative = !(out.s2g > 0);
  return out;
};

/* ================= 3 · correlations from mean cross-products ================= */
/* Wishart moments of the three statistics (Mxx, Myy, Mxy) of one source with f df */
const wishart = (xx, yy, xy, f) => [
  [2 * xx * xx / f, 2 * xy * xy / f, 2 * xx * xy / f],
  [2 * xy * xy / f, 2 * yy * yy / f, 2 * yy * xy / f],
  [2 * xx * xy / f, 2 * yy * xy / f, (xx * yy + xy * xy) / f],
];
const quad = (g, V) => { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += g[a] * V[a][b] * g[b]; return s; };

/* M = { G: {m: t×t matrix of mean squares and cross-products, df}, D: {…} the source whose
   expectation lacks only σ²G (E for one environment, GE for several), E: {…} error },
   k = the coefficient of σ²G in E(M_G) (r, or r·e) */
SEL.correlations = (Mx, k) => {
  const t = Mx.G.m.length;
  const mk = () => Array.from({ length: t }, () => new Array(t).fill(NaN));
  const out = { rG: mk(), seG: mk(), rP: mk(), seP: mk(), rE: mk(), seE: mk(), covG: mk(), covP: mk(), covE: mk() };
  const G = Mx.G, D = Mx.D, E = Mx.E;
  for (let x = 0; x < t; x++) for (let y = 0; y < t; y++) {
    const gxx = G.m[x][x], gyy = G.m[y][y], gxy = G.m[x][y];
    const dxx = D.m[x][x], dyy = D.m[y][y], dxy = D.m[x][y];
    const exx = E.m[x][x], eyy = E.m[y][y], exy = E.m[x][y];
    const vx = (gxx - dxx) / k, vy = (gyy - dyy) / k, c = (gxy - dxy) / k;
    out.covG[x][y] = c; out.covP[x][y] = gxy / k; out.covE[x][y] = exy;
    if (x === y) { out.rG[x][y] = out.rP[x][y] = out.rE[x][y] = 1; out.seG[x][y] = out.seP[x][y] = out.seE[x][y] = 0; continue; }
    /* genotypic */
    if (vx > 0 && vy > 0) {
      const r = c / Math.sqrt(vx * vy);
      out.rG[x][y] = r;
      const gG = [-r / (2 * vx * k), -r / (2 * vy * k), 1 / (k * Math.sqrt(vx * vy))];
      const gD = gG.map(v => -v);
      out.seG[x][y] = Math.sqrt(Math.max(0, quad(gG, wishart(gxx, gyy, gxy, G.df)) + quad(gD, wishart(dxx, dyy, dxy, D.df))));
    }
    /* phenotypic, entry-mean basis */
    const rp = gxy / Math.sqrt(gxx * gyy);
    out.rP[x][y] = rp;
    out.seP[x][y] = Math.sqrt(Math.max(0, quad([-rp / (2 * gxx), -rp / (2 * gyy), 1 / Math.sqrt(gxx * gyy)], wishart(gxx, gyy, gxy, G.df))));
    /* environmental (residual) */
    const re = exy / Math.sqrt(exx * eyy);
    out.rE[x][y] = re;
    out.seE[x][y] = Math.sqrt(Math.max(0, quad([-re / (2 * exx), -re / (2 * eyy), 1 / Math.sqrt(exx * eyy)], wishart(exx, eyy, exy, E.df))));
  }
  /* a genotypic correlation outside [−1, 1] is a known outcome of the moment estimators */
  out.outOfBounds = [];
  for (let x = 0; x < t; x++) for (let y = x + 1; y < t; y++) if (Math.abs(out.rG[x][y]) > 1) out.outOfBounds.push([x, y]);
  /* the entry-mean matrices the indices use */
  out.P = Array.from({ length: t }, (_, x) => Array.from({ length: t }, (_, y) => G.m[x][y] / k));
  out.Gm = Array.from({ length: t }, (_, x) => Array.from({ length: t }, (_, y) => (G.m[x][y] - D.m[x][y]) / k));
  return out;
};
/* t test of a correlation against zero */
SEL.corTest = (r, n) => {
  const t = r * Math.sqrt((n - 2) / Math.max(1e-15, 1 - r * r));
  return { t, p: 2 * (1 - S.pt(Math.abs(t), n - 2)) };
};

/* ================= 4 · path analysis (Wright 1921; Dewey & Lu 1959) ================= */
SEL.path = (R, ry, o) => {
  o = o || {};
  const n = R.length;
  const k = o.ridge || 0;
  const Rk = R.map((r, i) => r.map((v, j) => v + (i === j ? k : 0)));
  const inv = S.inverse(Rk);
  if (!inv) return null;
  const direct = mVec(inv, ry);
  const indirect = R.map((row, i) => row.map((rij, j) => (i === j ? direct[i] : rij * direct[j])));
  const r2 = vDot(direct, ry);
  const eig = S.eigenSym(R).values;
  /* the ridge adds k to every eigenvalue; without it R has to be positive definite for the
     direct effects to mean anything (R² would otherwise exceed one) */
  const minEigen = eig[eig.length - 1] + k;
  const pd = minEigen > 1e-12;
  const vif = pd ? S.inverse(R) : null;
  return {
    direct, indirect, r2, residual: Math.sqrt(Math.max(0, 1 - r2)), pd, minEigen,
    check: R.map((row, i) => row.reduce((s, rij, j) => s + rij * direct[j], 0)),
    vif: vif && eig[eig.length - 1] > 0 ? vif.map((r, i) => r[i]) : null,
    condition: pd ? (eig[0] + k) / minEigen : Infinity,
    det: eig.reduce((s, v) => s * v, 1), eigen: eig, ridge: k,
  };
};

/* ================= 5 · positive definiteness and bending ================= */
SEL.isPD = A => !!S.cholesky(A);
/* positive semidefinite: no eigenvalue below zero beyond rounding */
SEL.isPSD = A => { const v = S.eigenSym(A).values; const top = Math.max(1e-300, ...v.map(Math.abs)); return v.every(x => x > -1e-10 * top); };
/* Schaeffer (2014): the negative eigenvalues are replaced by small positive ones that keep
   their order, and the matrix is rebuilt from the same eigenvectors */
SEL.bend = A => {
  const e = S.eigenSym(A);
  const neg = e.values.filter(v => v < 0);
  if (!neg.length) return { matrix: A.map(r => r.slice()), bent: false, values: e.values };
  const s = 2 * neg.reduce((a, v) => a + v, 0);
  const t = 100 * s * s + 1;
  const pos = e.values.filter(v => v > 0);
  const p = Math.min(...pos);
  const vals = e.values.map(v => (v < 0 ? p * (s - v) * (s - v) / t : v));
  const n = A.length;
  const B = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => vals.reduce((acc, lv, k) => acc + lv * e.vectors[k][i] * e.vectors[k][j], 0)));
  return { matrix: B, bent: true, values: e.values, newValues: vals };
};

/* G must be compatible with P: on the scale where P = I (M = L⁻¹GL⁻ᵀ, P = LLᵀ) the eigenvalues
   of G are the canonical heritabilities, which have to lie in [0, 1]. The ones outside are
   clamped and G is rebuilt, which keeps both G and P − G positive semidefinite (the idea of
   Hayes & Hill 1981, who shrink the same eigenvalues towards their mean). */
SEL.bendCanonical = (P, G, top) => {
  top = top == null ? 0.99 : top;
  const L = S.cholesky(P);
  if (!L) return null;
  const Lm = L.map(r => Array.from(r));
  const Li = S.inverse(Lm);
  const M = mMul(mMul(Li, G), mT(Li));
  const Ms = M.map((r, i) => r.map((v, j) => (v + M[j][i]) / 2));
  const e = S.eigenSym(Ms);
  const vals = e.values.map(v => Math.min(top, Math.max(0, v)));
  const changed = e.values.filter((v, k) => Math.abs(v - vals[k]) > 1e-12).length;
  const n = G.length;
  const Mb = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => vals.reduce((acc, lv, k) => acc + lv * e.vectors[k][i] * e.vectors[k][j], 0)));
  return { matrix: mMul(mMul(Lm, Mb), mT(Lm)), changed, values: e.values, newValues: vals };
};

/* ================= 6 · selection indices ================= */
/* what every linear index reports: b, σ_I, response in the aggregate genotype, gains per
   trait, accuracy and index heritability (Cerón-Rojas & Crossa 2018, ch. 2–3) */
const indexSummary = (b, P, G, w, k) => {
  const Pb = mVec(P, b), Gb = mVec(G, b);
  const s2I = vDot(b, Pb), sI = Math.sqrt(Math.max(0, s2I));
  const E = Gb.map(v => k * v / sI);
  const out = { b, sI, E, R: k * sI, h2I: s2I > 0 ? vDot(b, Gb) / s2I : NaN };
  if (w) {
    const Gw = mVec(G, w);
    const sH = Math.sqrt(Math.max(0, vDot(w, Gw)));
    out.sH = sH;
    out.rho = sH > 0 && sI > 0 ? vDot(w, Gb) / (sH * sI) : NaN;
    out.dH = vDot(w, E);
  }
  return out;
};

/* Smith (1936) – Hazel (1943): b = P⁻¹Gw */
SEL.smithHazel = (P, G, w, k) => {
  const Pi = S.inverse(P);
  if (!Pi) return null;
  const b = mVec(Pi, mVec(G, w));
  const out = indexSummary(b, P, G, w, k);
  out.R = k * out.sI;
  /* the economic value each trait contributes, and the loss of dropping it */
  const s2I = out.sI * out.sI;
  out.contribution = b.map((_, j) => 100 * w[j] * vDot(b, G.map(r => r[j])) / s2I);
  out.loss = b.map((bj, j) => 100 * (1 - Math.sqrt(Math.max(0, 1 - bj * bj / (s2I * Pi[j][j])))));
  return out;
};
/* base index (Williams 1962): b = w; the response in units of H is k·w′Gw/√(w′Pw) */
SEL.baseIndex = (P, G, w, k) => {
  const out = indexSummary(w.slice(), P, G, w, k);
  out.R = k * vDot(w, mVec(G, w)) / out.sI;
  return out;
};
/* restricted index of Kempthorne & Nordskog (1959): no change in the traits U */
SEL.restricted = (P, G, w, U, k) => {
  const Pi = S.inverse(P);
  if (!Pi || !U.length) return null;
  const b = mVec(Pi, mVec(G, w));
  const C = cols(G, U);
  const PiC = mMul(Pi, C);
  const mid = S.inverse(mMul(mT(C), PiC));
  if (!mid) return null;
  const Q = mMul(mMul(PiC, mid), mT(C));
  const bR = mVec(mSub(eye(P.length), Q), b);
  const out = indexSummary(bR, P, G, w, k);
  out.restricted = U;
  return out;
};
/* predetermined proportional gains (Mallard 1972; Tallis 1985): the traits U change in the
   proportions d, and θ says whether the index really moves them that way */
SEL.ppg = (P, G, w, U, d, k) => {
  const Pi = S.inverse(P);
  if (!Pi || U.length < 1) return null;
  const b = mVec(Pi, mVec(G, w));
  const r = U.length;
  const C = cols(G, U);
  let bM = b.slice();
  if (r > 1) {
    /* Mallard's D′ = [d_r·I | −(d₁ … d_{r−1})′] */
    const Dp = Array.from({ length: r - 1 }, (_, i) => Array.from({ length: r }, (_, j) => (j === r - 1 ? -d[i] : i === j ? d[r - 1] : 0)));
    const M = mMul(C, mT(Dp));
    const PiM = mMul(Pi, M);
    const mid = S.inverse(mMul(mT(M), PiM));
    if (!mid) return null;
    bM = mVec(mSub(eye(P.length), mMul(mMul(PiM, mid), mT(M))), b);
  }
  const out = indexSummary(bM, P, G, w, k);
  const CPC = S.inverse(mMul(mT(C), mMul(Pi, C)));
  if (CPC) {
    const num = vDot(mVec(mT(C), b), mVec(CPC, d));
    const den = vDot(d, mVec(CPC, d));
    out.theta = den !== 0 ? num / den : NaN;
  }
  out.targets = U; out.d = d;
  return out;
};
/* desired gains (Pesek & Baker 1969): b = P⁻¹G_U(G_U′P⁻¹G_U)⁻¹d, gains proportional to d */
SEL.desiredGains = (P, G, U, d, k) => {
  const Pi = S.inverse(P);
  if (!Pi) return null;
  const GU = cols(G, U);
  const PiG = mMul(Pi, GU);
  const mid = S.inverse(mMul(mT(GU), PiG));
  if (!mid) return null;
  const b = mVec(PiG, mVec(mid, d));
  const out = indexSummary(b, P, G, null, k);
  out.targets = U; out.d = d;
  return out;
};
/* eigen selection index (Cerón-Rojas et al. 2006): Gb = λ²Pb with the largest λ², solved as a
   symmetric problem through the Cholesky factor of P */
SEL.esim = (P, G, k) => {
  const L = S.cholesky(P);
  if (!L) return null;
  const n = P.length;
  const Li = S.inverse(L.map(r => Array.from(r)));
  const M = mMul(mMul(Li, G), mT(Li));
  const Ms = M.map((r, i) => r.map((v, j) => (v + M[j][i]) / 2));
  const e = S.eigenSym(Ms);
  let b = mVec(mT(Li), e.vectors[0]);
  const norm = Math.sqrt(vDot(b, b));
  b = b.map(v => v / norm);
  /* the sign of an eigenvector is arbitrary: the one that raises most of the traits is kept */
  if (vDot(mVec(G, b), new Array(n).fill(1)) < 0) b = b.map(v => -v);
  const out = indexSummary(b, P, G, null, k);
  out.lambda2 = e.values[0];
  out.rho = Math.sqrt(Math.max(0, e.values[0]));
  return out;
};
/* Mulamba & Mock (1978): sum of ranks, rank 1 the best in the wanted direction, ties averaged */
SEL.rankSum = (X, dirs, weights) => {
  const n = X.length, t = X[0].length;
  const ranks = X.map(() => new Array(t).fill(0));
  for (let j = 0; j < t; j++) {
    const order = X.map((r, i) => [r[j], i]).sort((a, b) => (dirs[j] >= 0 ? b[0] - a[0] : a[0] - b[0]));
    let i = 0;
    while (i < n) {
      let k = i;
      while (k + 1 < n && order[k + 1][0] === order[i][0]) k++;
      const avg = (i + k) / 2 + 1;
      for (let q = i; q <= k; q++) ranks[order[q][1]][j] = avg;
      i = k + 1;
    }
  }
  return X.map((_, i) => -ranks[i].reduce((s, v, j) => s + (weights ? weights[j] : 1) * v, 0));
};
/* Elston (1963): product of the distances to the least acceptable value of every trait */
SEL.elston = (X, dirs) => {
  const t = X[0].length;
  const lim = Array.from({ length: t }, (_, j) => {
    const v = X.map(r => r[j]);
    return dirs[j] >= 0 ? Math.min(...v) : Math.max(...v);
  });
  return X.map(r => r.reduce((s, v, j) => s * (dirs[j] >= 0 ? v - lim[j] : lim[j] - v), 1));
};

/* select the best fraction p by an index score and report what the selected group gains */
SEL.selectBy = (names, scores, X, h2, p) => {
  const n = names.length;
  const nSel = Math.max(1, Math.round(p * n));
  const order = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  const chosen = order.slice(0, nSel);
  const t = X[0].length;
  const mean = j => X.reduce((s, r) => s + r[j], 0) / n;
  const trait = Array.from({ length: t }, (_, j) => {
    const x0 = mean(j);
    const xs = chosen.reduce((s, i) => s + X[i][j], 0) / nSel;
    const ds = xs - x0;
    return { x0, xs, ds, dsPct: 100 * ds / Math.abs(x0), gs: ds * h2[j], gsPct: 100 * ds * h2[j] / Math.abs(x0) };
  });
  return { order, chosen, nSel, trait, ranks: order.map((i, k) => ({ name: names[i], score: scores[i], rank: k + 1, selected: k < nSel })) };
};

/* ================= 7 · gain per cycle of recurrent selection ================= */
/* Sprague & Eberhart (1977) as tabulated by Fehr (1987, Tables 17-1 and 17-2). Every method
   is a sequence of seasons: M needs the target environment (evaluation), A any season
   (selfing, crossing, recombination). */
SEL.METHODS = [
  { key: 'phen', c: 0.5, seq: 'M', es: 'Fenotípica, un progenitor seleccionado después de la floración', en: 'Phenotypic, one parent selected after flowering', shortEs: 'Fenotípica (un progenitor)', shortEn: 'Phenotypic (one parent)' },
  { key: 'ear', c: 0.5, seq: 'M', es: 'Mazorca por surco modificado, un progenitor', en: 'Modified ear-to-row, one parent', shortEs: 'Mazorca por surco', shortEn: 'Ear-to-row' },
  { key: 'hsRem', c: 1, seq: 'MA', es: 'Medios hermanos, recombinando semilla remanente', en: 'Half-sib, recombining remnant seed', shortEs: 'Medios hermanos (remanente)', shortEn: 'Half-sib (remnant)' },
  { key: 'hsSelf', c: 2, seq: 'AMA', es: 'Medios hermanos, recombinando semilla autofecundada', en: 'Half-sib, recombining selfed seed', shortEs: 'Medios hermanos (autofecundada)', shortEn: 'Half-sib (selfed)' },
  { key: 'fs', c: 1, seq: 'MA', es: 'Hermanos completos', en: 'Full-sib', shortEs: 'Hermanos completos', shortEn: 'Full-sib' },
  { key: 's01', c: 1, seq: 'AMA', es: 'Líneas S₀:₁', en: 'S₀:₁ lines', shortEs: 'Líneas S₀:₁', shortEn: 'S₀:₁ lines' },
  { key: 'sLines', c: 1, seq: null, es: 'Líneas autofecundadas de progenitores con endogamia F', en: 'Selfed lines from parents with inbreeding F', shortEs: 'Líneas de progenitores con F', shortEn: 'Lines from parents with F' },
];
SEL.gainPerCycle = (v, key, o) => {
  o = o || {};
  const k = v.k, r = v.r, t = v.t;
  const err = v.s2e / (r * t);
  const m = SEL.METHODS.find(x => x.key === key);
  let num, den;
  if (key === 'phen') {
    num = k * m.c * v.s2A;
    den = v.s2w + (o.grid ? 0 : v.s2plot) + v.s2AE + v.s2DE + v.s2A + v.s2D;
  } else if (key === 'ear' || key === 'hsRem' || key === 'hsSelf') {
    num = k * m.c * 0.25 * v.s2A;
    den = err + 0.25 * v.s2AE / t + 0.25 * v.s2A;
  } else if (key === 'fs') {
    num = k * m.c * 0.5 * v.s2A;
    den = err + (0.5 * v.s2AE + 0.25 * v.s2DE) / t + 0.5 * v.s2A + 0.25 * v.s2D;
  } else {
    const F = key === 's01' ? 0 : (o.F || 0);
    const a = 1 + F, d = 0.25 * (1 - F) * (1 + F);
    num = k * m.c * a * v.s2A;
    den = err + (a * v.s2AE + d * v.s2DE) / t + a * v.s2A + d * v.s2D;
  }
  return num / Math.sqrt(den);
};
/* seasons of the selfed-line method: generations of selfing to reach F, one more for the
   family seed, one evaluation and the recombination seasons */
SEL.sequenceOf = (key, o) => {
  o = o || {};
  const m = SEL.METHODS.find(x => x.key === key);
  if (m.seq) return m.seq;
  const g = Math.round(Math.log2(1 / Math.max(1e-9, 1 - (o.F || 0))));
  return 'A'.repeat(g + 1) + 'M' + 'A'.repeat(Math.max(1, o.recomb || 1));
};
/* years per cycle in steady state on a calendar of seasons (M = target environment,
   O = off-season): the sequence is laid on the calendar cycle after cycle */
SEL.CALENDARS = { one: 'M', twoSimilar: 'MM', twoDifferent: 'MO', three: 'MOO' };
SEL.yearsPerCycle = (seq, cal) => {
  const pattern = SEL.CALENDARS[cal] || cal;
  const per = pattern.length;
  let slot = 0;
  const run = cycles => {
    for (let c = 0; c < cycles; c++) {
      for (const need of seq) {
        while (need === 'M' && pattern[slot % per] !== 'M') slot++;
        slot++;
      }
    }
  };
  run(8);                                   /* reach the steady state */
  const start = slot;
  run(24);
  return (slot - start) / 24 / per;
};

window.SEL = SEL;
