/* BreedingPro — Block 11 engine: genomic relationships, genomic prediction and hybrid prediction.
   Marker matrices in several codings with quality control and mean imputation; the genomic
   relationship matrix of VanRaden (2008), methods 1 and 2, its principal components, blending with
   the pedigree matrix; GBLUP with REML (LM.reml with K⁻¹ = G⁻¹) and the equivalent marker effects
   (RR-BLUP) back-solved from it; k-fold cross-validation with the variance components re-estimated in
   every training set; hybrid prediction with general combining ability of each heterotic group
   (K₁, K₂) and specific combining ability with the Kronecker kernel K₁ ⊗ K₂ (Bernardo 1994; Technow
   et al. 2014), untested crosses by BLUP and three-way and double crosses by Jenkins (1934);
   expected response to phenotypic and genomic selection per year. */

const GS = {};

/* ---------------- reading ---------------- */
/* compact example format: first line marker names, then "id,0120…" */
GS.fromCompact = text => {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  const markers = lines[0].split(',');
  const m = markers.length;
  const ids = [], rows = [];
  lines.slice(1).forEach(l => { const k = l.indexOf(','); ids.push(l.slice(0, k)); rows.push(l.slice(k + 1)); });
  const n = ids.length, M = new Float64Array(n * m);
  rows.forEach((s, i) => { for (let j = 0; j < m; j++) { const c = s.charCodeAt(j) - 48; M[i * m + j] = c >= 0 && c <= 9 ? c : NaN; } });
  return { ids, markers, n, m, M, coding: 'dosage' };
};

/* a genotype written as text → count of the second allele of the marker, or NaN */
const IUPAC_HET = new Set(['R', 'Y', 'S', 'W', 'K', 'M']);
GS.fromTable = (tab, o) => {
  o = o || {};
  let header = tab.header, rows = tab.rows;
  if (o.transpose) {
    /* markers in rows: first column marker names, the other columns individuals */
    const ids = header.slice(1);
    rows = ids.map((_, j) => rows.map(r => r[j + 1]));
    header = [header[0]].concat(tab.rows.map(r => String(r[0])));
    rows = ids.map((id, j) => [id].concat(rows[j]));
  }
  const ids = rows.map(r => String(r[0]).trim());
  const markers = header.slice(1);
  const n = ids.length, m = markers.length;
  const raw = rows.map(r => r.slice(1));
  /* numeric or text? */
  const sample = [];
  for (let i = 0; i < Math.min(n, 50); i++) for (let j = 0; j < Math.min(m, 200); j++) { const v = raw[i][j]; if (!Data.isMissing(v)) sample.push(String(v).trim()); }
  const numeric = sample.length && sample.every(s => /^-?\d+(\.\d+)?$/.test(s));
  const M = new Float64Array(n * m);
  let coding;
  if (numeric) {
    const vals = new Set();
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const v = raw[i][j]; if (!Data.isMissing(v)) vals.add(+v); }
    const has = x => vals.has(x);
    if (has(-1)) coding = 'minus1';                               /* −1/0/1 */
    else if (has(2)) coding = 'dosage';                           /* 0/1/2 */
    else coding = 'binary';                                       /* 0/1 */
    const shift = coding === 'minus1' ? 1 : 0, mult = coding === 'binary' && o.binaryAs !== 'dosage' ? 2 : 1;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const v = raw[i][j]; M[i * m + j] = Data.isMissing(v) ? NaN : (+v + shift) * mult; }
  } else {
    coding = 'letters';
    for (let j = 0; j < m; j++) {
      const alle = new Map();
      const geno = raw.map(r => {
        const v = r[j];
        if (Data.isMissing(v)) return null;
        let s = String(v).trim().toUpperCase().replace(/[\/|:\s-]/g, '');
        if (s === 'H' || (s.length === 1 && IUPAC_HET.has(s))) return 'het';
        if (s.length === 1) s = s + s;
        if (s.length !== 2) return null;
        [s[0], s[1]].forEach(a => alle.set(a, (alle.get(a) || 0) + 1));
        return s;
      });
      const al = [...alle.keys()].sort();
      const ref = al[al.length - 1];
      geno.forEach((g, i) => { M[i * m + j] = g == null ? NaN : g === 'het' ? 1 : (g[0] === ref ? 1 : 0) + (g[1] === ref ? 1 : 0); });
    }
  }
  return { ids, markers, n, m, M, coding };
};

/* ---------------- quality control ---------------- */
GS.qc = (D, o) => {
  o = Object.assign({ maxMissMarker: 0.2, maxMissInd: 0.2, minMAF: 0.05 }, o || {});
  const { n, m, M } = D;
  const missInd = new Float64Array(n);
  for (let i = 0; i < n; i++) { let c = 0; for (let j = 0; j < m; j++) if (!(M[i * m + j] >= 0)) c++; missInd[i] = c / m; }
  const keepI = []; for (let i = 0; i < n; i++) if (missInd[i] <= o.maxMissInd) keepI.push(i);
  const nI = keepI.length;
  const stat = { miss: new Float64Array(m), p: new Float64Array(m), het: new Float64Array(m) };
  const keepM = [];
  let mono = 0, rare = 0, missing = 0;
  for (let j = 0; j < m; j++) {
    let s = 0, c = 0, h = 0;
    keepI.forEach(i => { const v = M[i * m + j]; if (v >= 0) { s += v; c++; if (v === 1) h++; } });
    stat.miss[j] = 1 - c / nI;
    const p = c ? s / (2 * c) : NaN;
    stat.p[j] = p; stat.het[j] = c ? h / c : NaN;
    const maf = Math.min(p, 1 - p);
    if (stat.miss[j] > o.maxMissMarker) missing++;
    else if (!(maf > 0)) mono++;
    else if (maf < o.minMAF) rare++;
    else keepM.push(j);
  }
  const mK = keepM.length;
  const Q = new Float64Array(nI * mK), p = new Float64Array(mK);
  let imputed = 0;
  keepM.forEach((j, q) => { p[q] = stat.p[j]; });
  keepI.forEach((i, r) => keepM.forEach((j, q) => { const v = M[i * m + j]; if (v >= 0) Q[r * mK + q] = v; else { Q[r * mK + q] = 2 * p[q]; imputed++; } }));
  const hetInd = keepI.map(i => { let h = 0, c = 0; keepM.forEach(j => { const v = M[i * m + j]; if (v >= 0) { c++; if (v === 1) h++; } }); return c ? h / c : NaN; });
  return {
    ids: keepI.map(i => D.ids[i]), markers: keepM.map(j => D.markers[j]), n: nI, m: mK, M: Q, p,
    dropped: { individuals: n - nI, missing, mono, rare }, imputed, missInd: keepI.map(i => missInd[i]), hetInd,
    maf: Array.from(p, v => Math.min(v, 1 - v)), all: stat, opts: o, coding: D.coding,
  };
};

/* ---------------- genomic relationships ---------------- */
/* VanRaden (2008): method 1 G = ZZ′/(2Σpq), Z = M − 2P; method 2 G = Z*Z*′/m with Z* standardized */
GS.G = (Q, o) => {
  o = o || {};
  const { n, m, M, p } = Q;
  const method = o.method || 'vr1';
  const Z = new Float64Array(n * m);
  let denom = 0;
  const sd = new Float64Array(m);
  for (let j = 0; j < m; j++) { const v = 2 * p[j] * (1 - p[j]); denom += v; sd[j] = Math.sqrt(v); }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const z = M[i * m + j] - 2 * p[j]; Z[i * m + j] = method === 'vr2' ? (sd[j] > 0 ? z / sd[j] : 0) : z; }
  const scale = method === 'vr2' ? m : denom;
  const G = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    const ri = i * m;
    for (let k = i; k < n; k++) {
      const rk = k * m;
      let s = 0;
      for (let j = 0; j < m; j++) s += Z[ri + j] * Z[rk + j];
      G[i * n + k] = G[k * n + i] = s / scale;
    }
  }
  return { G, Z, n, m, denom, scale, method, ids: Q.ids };
};
GS.stats = (K, n) => {
  let tr = 0, sum = 0, offS = 0, offMin = Infinity, offMax = -Infinity, dMin = Infinity, dMax = -Infinity;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = K[i * n + j];
    sum += v;
    if (i === j) { tr += v; dMin = Math.min(dMin, v); dMax = Math.max(dMax, v); }
    else if (j > i) { offS += v; offMin = Math.min(offMin, v); offMax = Math.max(offMax, v); }
  }
  return { meanDiag: tr / n, meanOff: offS / (n * (n - 1) / 2), asv: tr / n - sum / (n * n), diagMin: dMin, diagMax: dMax, offMin, offMax };
};
/* K = (1 − w)G + wA, plus a small ridge so that K is positive definite */
GS.kernel = (G, n, o) => {
  o = o || {};
  const K = new Float64Array(n * n);
  const w = o.A ? o.w || 0 : 0;
  for (let t = 0; t < n * n; t++) K[t] = (1 - w) * G[t] + (o.A ? w * o.A[t] : 0);
  let md = 0; for (let i = 0; i < n; i++) md += K[i * n + i];
  md /= n;
  const eps = (o.ridge == null ? 1e-3 : o.ridge) * md;
  for (let i = 0; i < n; i++) K[i * n + i] += eps;
  return { K, ridge: eps, w };
};
/* inverse and log-determinant of a positive-definite matrix through Cholesky */
GS.invert = (K, n) => {
  const L = S.cholesky(Array.from({ length: n }, (_, i) => K.subarray ? K.subarray(i * n, i * n + n) : K.slice(i * n, i * n + n)));
  if (!L) return null;
  let logdet = 0;
  for (let i = 0; i < n; i++) logdet += 2 * Math.log(L[i][i]);
  /* L⁻¹ by forward substitution, then K⁻¹ = L⁻ᵀL⁻¹ */
  const Li = Array.from({ length: n }, () => new Float64Array(n));
  for (let j = 0; j < n; j++) {
    Li[j][j] = 1 / L[j][j];
    for (let i = j + 1; i < n; i++) { let s = 0; for (let k = j; k < i; k++) s += L[i][k] * Li[k][j]; Li[i][j] = -s / L[i][i]; }
  }
  const Ki = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    let s = 0;
    for (let k = j; k < n; k++) s += Li[k][i] * Li[k][j];
    Ki[i * n + j] = Ki[j * n + i] = s;
  }
  return { Kinv: Ki, logdet };
};
/* leading principal components of the double-centred matrix, by subspace iteration */
GS.pca = (K, n, k) => {
  k = k || 3;
  const C = new Float64Array(n * n);
  const rm = new Float64Array(n); let gm = 0;
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < n; j++) s += K[i * n + j]; rm[i] = s / n; gm += s; }
  gm /= n * n;
  let tr = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = K[i * n + j] - rm[i] - rm[j] + gm; C[i * n + j] = v; if (i === j) tr += v; }
  const r = rng(11);
  let Qm = Array.from({ length: k }, () => Float64Array.from({ length: n }, () => r() - 0.5));
  const orth = V => { for (let a = 0; a < V.length; a++) { for (let b = 0; b < a; b++) { let d = 0; for (let i = 0; i < n; i++) d += V[a][i] * V[b][i]; for (let i = 0; i < n; i++) V[a][i] -= d * V[b][i]; } let nn = 0; for (let i = 0; i < n; i++) nn += V[a][i] * V[a][i]; nn = Math.sqrt(nn) || 1; for (let i = 0; i < n; i++) V[a][i] /= nn; } return V; };
  Qm = orth(Qm);
  let lam = new Array(k).fill(0);
  for (let it = 0; it < 300; it++) {
    const Y = Qm.map(q => { const y = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; const ri = i * n; for (let j = 0; j < n; j++) s += C[ri + j] * q[j]; y[i] = s; } return y; });
    const nl = Y.map((y, a) => { let s = 0; for (let i = 0; i < n; i++) s += y[i] * Qm[a][i]; return s; });
    Qm = orth(Y);
    const conv = nl.every((v, a) => Math.abs(v - lam[a]) <= 1e-10 * Math.abs(v));
    lam = nl;
    if (conv && it > 5) break;
  }
  return { values: lam, pct: lam.map(v => 100 * v / tr), scores: Array.from({ length: n }, (_, i) => Qm.map((q, a) => q[i] * Math.sqrt(Math.max(0, lam[a])))), trace: tr };
};

/* ---------------- GBLUP ---------------- */
/* recs: [{ id, y, fixed: {} }]; ids: the individuals of K (all get a prediction) */
GS.gblup = (recs, ids, K, Kinv, logdetK, o) => {
  o = o || {};
  const n = ids.length;
  const idSet = new Map(ids.map((id, i) => [id, i]));
  const use = recs.filter(r => isFinite(r.y) && idSet.has(r.id));
  if (use.length < 5) return { error: T('Hay muy pocos individuos con fenotipo y marcadores.', 'Too few individuals have both phenotype and markers.') };
  const y = Float64Array.from(use, r => r.y);
  const fixed = [{ kind: 'intercept', name: '(intercept)' }];
  (o.fixed || []).forEach(nm => fixed.push({ kind: 'main', f: LM.factor(use.map(r => r.fixed[nm])), name: nm }));
  const random = [{ key: 'g', name: 'genomic', f: LM.factor(use.map(r => r.id), ids), Kinv, logdetK }];
  (o.random || []).forEach(nm => random.push({ key: 'r:' + nm, name: nm, f: LM.factor(use.map(r => r.random[nm])) }));
  const res = LM.reml(fixed, random, y, o.theta ? { fixedTheta: o.theta } : { maxIter: o.maxIter || 100, start: o.start });
  if (res.error) return { error: T('El modelo no se pudo ajustar.', 'The model could not be fitted.') };
  const th = res.theta, R = random.length, cov = res.thetaCov;
  const st = GS.stats(K, n);
  const s2g = th[0], s2e = th[R];
  const vg = s2g * st.asv;
  const h2 = vg / (vg + s2e);
  let h2se = NaN;
  if (cov && isFinite(cov[0][0]) && isFinite(cov[R][R]) && isFinite(cov[0][R]) && R === 1) {
    const a = st.asv, den = (a * s2g + s2e) * (a * s2g + s2e);
    const g1 = a * s2e / den, g2 = -a * s2g / den;
    h2se = Math.sqrt(Math.max(0, g1 * g1 * cov[0][0] + 2 * g1 * g2 * cov[0][R] + g2 * g2 * cov[R][R]));
  }
  /* the mean of the fixed part over the records */
  const D = res.fit.D;
  let fm = 0; for (let i = 0; i < use.length; i++) { let v = 0; for (let k = 0; k < D.K; k++) { const c = D.cols[i * D.K + k]; if (c >= 0) v += D.vals[i * D.K + k] * res.fit.b[c]; } fm += v; }
  fm /= use.length;
  const phen = new Map();
  use.forEach(r => { if (!phen.has(r.id)) phen.set(r.id, []); phen.get(r.id).push(r.y); });
  const gebv = res.blups[0].map((b, i) => ({ id: b.level, g: b.u, pred: fm + b.u, pev: b.pev, sep: Math.sqrt(Math.max(0, b.pev)), rel: Math.max(0, Math.min(1, 1 - b.pev / (K[i * n + i] * s2g))), y: phen.has(b.level) ? phen.get(b.level).reduce((s, v) => s + v, 0) / phen.get(b.level).length : NaN, nrec: phen.has(b.level) ? phen.get(b.level).length : 0 }));
  return { res, s2g, s2e, se: [cov && Math.sqrt(cov[0][0]), cov && Math.sqrt(cov[R][R])], boundary: !!res.components[0].boundary, h2, h2se, vg, asv: st.asv, fixedMean: fm, gebv, nRec: use.length, nPhen: phen.size, n, theta: th, others: random.slice(1).map((r, k) => ({ name: r.name, sigma2: th[k + 1] })) };
};
/* marker effects equivalent to GBLUP (RR-BLUP): β̂ = Z′K⁻¹ĝ/scale (exact when K = G) */
GS.markerEffects = (gr, Kinv, g, n) => {
  const { Z, m, scale } = gr;
  const Kg = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < n; k++) s += Kinv[i * n + k] * g[k]; Kg[i] = s; }
  const beta = new Float64Array(m);
  for (let j = 0; j < m; j++) { let s = 0; for (let i = 0; i < n; i++) s += Z[i * m + j] * Kg[i]; beta[j] = s / scale; }
  return beta;
};

/* ---------------- cross-validation ----------------
   k folds of individuals (new lines, CV1): the test individuals keep their place in K but lose
   their records; REML is repeated in every training set unless the variances are fixed. */
GS.cv = async (recs, ids, K, Kinv, logdetK, o, progress) => {
  o = Object.assign({ folds: 5, reps: 1, seed: 1, refit: true }, o || {});
  const phenIds = [...new Set(recs.filter(r => isFinite(r.y)).map(r => r.id))].filter(id => ids.includes(id));
  const full = o.refit ? null : GS.gblup(recs, ids, K, Kinv, logdetK, { fixed: o.fixed });
  const out = [];
  let done = 0;
  const total = o.reps * o.folds;
  for (let rep = 0; rep < o.reps; rep++) {
    const r = rng(o.seed + 7919 * rep);
    const perm = shuffle(phenIds.slice(), r);
    const fold = new Map(perm.map((id, k) => [id, k % o.folds]));
    const pred = new Map(), gpred = new Map();
    const foldStats = [];
    for (let f = 0; f < o.folds; f++) {
      const train = recs.filter(x => fold.get(x.id) !== f);
      const fit = GS.gblup(train, ids, K, Kinv, logdetK, { fixed: o.fixed, theta: full ? full.theta : null });
      if (fit.error) continue;
      const byId = new Map(fit.gebv.map(e => [e.id, e]));
      const test = perm.filter(id => fold.get(id) === f);
      test.forEach(id => { pred.set(id, byId.get(id).pred); gpred.set(id, byId.get(id).g); });
      foldStats.push({ fold: f, s2g: fit.s2g, s2e: fit.s2e, h2: fit.h2 });
      done++;
      if (progress) await progress(done / total);
    }
    const obs = new Map();
    recs.forEach(x => { if (isFinite(x.y)) { if (!obs.has(x.id)) obs.set(x.id, []); obs.get(x.id).push(x.y); } });
    const idsT = [...pred.keys()];
    const yv = idsT.map(id => obs.get(id).reduce((s, v) => s + v, 0) / obs.get(id).length), pv = idsT.map(id => pred.get(id));
    const rr = S.pearson(pv, yv);
    const my = S.mean(yv), mp = S.mean(pv);
    let sxy = 0, sxx = 0, se = 0; pv.forEach((p, i) => { sxy += (p - mp) * (yv[i] - my); sxx += (p - mp) ** 2; se += (yv[i] - p) ** 2; });
    const row = { rep, r: rr, mse: se / yv.length, slope: sxy / sxx, n: yv.length, folds: foldStats, pred, gpred, fold };
    if (o.truth) { const tv = idsT.map(id => o.truth[id]); row.rTrue = S.pearson(idsT.map(id => gpred.get(id)), tv); }
    out.push(row);
  }
  const mean = key => out.reduce((s, x) => s + x[key], 0) / out.length;
  const sd = key => { const m = mean(key); return out.length > 1 ? Math.sqrt(out.reduce((s, x) => s + (x[key] - m) ** 2, 0) / (out.length - 1)) : NaN; };
  return { reps: out, r: mean('r'), rSD: sd('r'), mse: mean('mse'), slope: mean('slope'), rTrue: o.truth ? mean('rTrue') : NaN, rTrueSD: o.truth ? sd('rTrue') : NaN, refit: o.refit, folds: o.folds };
};

/* ---------------- hybrid prediction ---------------- */
/* hyb: [{ p1, p2, y }]; K1, K2 with their ids; SCA kernel (K₁ ⊗ K₂) on the observed crosses */
GS.hybrid = (hyb, ids1, K1, ids2, K2, o) => {
  o = o || {};
  const i1 = new Map(ids1.map((x, i) => [x, i])), i2 = new Map(ids2.map((x, i) => [x, i]));
  const use = hyb.filter(h => isFinite(h.y) && i1.has(h.p1) && i2.has(h.p2));
  if (use.length < 5) return { error: T('Hay muy pocos híbridos con fenotipo y progenitores genotipados.', 'Too few hybrids have a phenotype and genotyped parents.') };
  const n1 = ids1.length, n2 = ids2.length;
  const inv1 = GS.invert(K1, n1), inv2 = GS.invert(K2, n2);
  if (!inv1 || !inv2) return { error: T('Una matriz de parentesco no es definida positiva.', 'A relationship matrix is not positive definite.') };
  const y = Float64Array.from(use, h => h.y);
  const fixed = [{ kind: 'intercept', name: '(intercept)' }];
  const random = [
    { key: 'gca1', name: 'GCA 1', f: LM.factor(use.map(h => h.p1), ids1), Kinv: inv1.Kinv, logdetK: inv1.logdet },
    { key: 'gca2', name: 'GCA 2', f: LM.factor(use.map(h => h.p2), ids2), Kinv: inv2.Kinv, logdetK: inv2.logdet },
  ];
  const keys = [...new Set(use.map(h => h.p1 + '×' + h.p2))];
  let Ks = null, invS = null;
  if (o.sca) {
    const ns = keys.length;
    const pr = keys.map(k => k.split('×'));
    Ks = new Float64Array(ns * ns);
    for (let a = 0; a < ns; a++) for (let b = a; b < ns; b++) { const v = K1[i1.get(pr[a][0]) * n1 + i1.get(pr[b][0])] * K2[i2.get(pr[a][1]) * n2 + i2.get(pr[b][1])]; Ks[a * ns + b] = Ks[b * ns + a] = v; }
    let md = 0; for (let a = 0; a < ns; a++) md += Ks[a * ns + a];
    for (let a = 0; a < ns; a++) Ks[a * ns + a] += 1e-3 * md / ns;
    invS = GS.invert(Ks, ns);
    if (!invS) return { error: T('El núcleo de ACE no es definido positivo.', 'The SCA kernel is not positive definite.') };
    random.push({ key: 'sca', name: 'SCA', f: LM.factor(use.map(h => h.p1 + '×' + h.p2), keys), Kinv: invS.Kinv, logdetK: invS.logdet });
  }
  const res = LM.reml(fixed, random, y, o.theta ? { fixedTheta: o.theta } : { maxIter: o.maxIter || 100 });
  if (res.error) return { error: T('El modelo no se pudo ajustar.', 'The model could not be fitted.') };
  const R = random.length, th = res.theta, cov = res.thetaCov;
  const comp = random.map((r, k) => ({ key: r.key, name: r.name, sigma2: th[k], se: cov && isFinite(cov[k][k]) ? Math.sqrt(cov[k][k]) : NaN, boundary: res.components[k].boundary }));
  comp.push({ key: 'e', name: 'residual', sigma2: th[R], se: cov && isFinite(cov[R][R]) ? Math.sqrt(cov[R][R]) : NaN });
  const mu = res.fit.b[0];
  const g1 = res.blups[0].map(b => b.u), g2 = res.blups[1].map(b => b.u);
  /* SCA of untested crosses: K_s(new, obs) K_s(obs, obs)⁻¹ ŝ_obs */
  let wS = null, sObs = null;
  if (o.sca) {
    sObs = new Map(res.blups[2].map(b => [b.level, b.u]));
    const s = Float64Array.from(keys, k => sObs.get(k));
    const ns = keys.length;
    wS = new Float64Array(ns);
    for (let a = 0; a < ns; a++) { let t = 0; for (let b = 0; b < ns; b++) t += invS.Kinv[a * ns + b] * s[b]; wS[a] = t; }
  }
  const pr = keys.map(k => k.split('×'));
  const s2e = th[R], Ci = res.Cinv, d = res.d, o1 = res.offs[0], o2 = res.offs[1];
  const observed = new Map();
  use.forEach(h => { const k = h.p1 + '×' + h.p2; if (!observed.has(k)) observed.set(k, []); observed.get(k).push(h.y); });
  const predict = (a, b) => {
    const ia = i1.get(a), ib = i2.get(b);
    let v = mu + g1[ia] + g2[ib], sca = 0;
    if (o.sca) {
      const key = a + '×' + b;
      if (sObs.has(key)) sca = sObs.get(key);
      else { for (let q = 0; q < pr.length; q++) sca += K1[ia * n1 + i1.get(pr[q][0])] * K2[ib * n2 + i2.get(pr[q][1])] * wS[q]; }
    }
    const pevG = s2e * (Ci[(o1 + ia) * d + o1 + ia] + Ci[(o2 + ib) * d + o2 + ib] + 2 * Ci[(o1 + ia) * d + o2 + ib]);
    const ob = observed.get(a + '×' + b);
    return { p1: a, p2: b, gca1: g1[ia], gca2: g2[ib], sca, pred: v + sca, seGCA: Math.sqrt(Math.max(0, pevG)), obs: ob ? ob.reduce((s, x) => s + x, 0) / ob.length : NaN, tested: !!ob };
  };
  return { res, comp, mu, g1, g2, ids1, ids2, predict, keys, nObs: use.length, nCross: keys.length, sca: !!o.sca, theta: th };
};
/* cross-validation of hybrids (Technow et al. 2014): scheme 'hybrids' leaves out random hybrids (their
   parents keep other hybrids in training: T2); scheme 'lines' leaves out lines of both groups with all
   their hybrids, so a test hybrid has one parent (T1) or none (T0) with hybrids in training */
GS.hybridCV = async (hyb, ids1, K1, ids2, K2, o, progress) => {
  o = Object.assign({ folds: 5, reps: 1, seed: 1 }, o || {});
  const s1 = new Set(ids1), s2 = new Set(ids2);
  const ok = hyb.filter(h => isFinite(h.y) && s1.has(h.p1) && s2.has(h.p2));
  const keys = [...new Set(ok.map(h => h.p1 + '×' + h.p2))];
  const obsMean = new Map();
  keys.forEach(k => { const v = ok.filter(h => h.p1 + '×' + h.p2 === k).map(h => h.y); obsMean.set(k, v.reduce((s, x) => s + x, 0) / v.length); });
  const acc = () => ({ p: [], y: [], t: [] });
  const cls = { T2: acc(), T1: acc(), T0: acc(), hybrids: acc(), lines: acc() };
  const total = 2 * o.reps * o.folds;
  let done = 0;
  const run = async (train, test, scheme) => {
    const fit = GS.hybrid(train, ids1, K1, ids2, K2, { sca: o.sca });
    done++;
    if (progress) await progress(done / total);
    if (fit.error) return;
    const t1 = new Set(train.map(h => h.p1)), t2 = new Set(train.map(h => h.p2));
    test.forEach(k => {
      const [a, b] = k.split('×');
      const pr = fit.predict(a, b).pred;
      const c = (t1.has(a) ? 1 : 0) + (t2.has(b) ? 1 : 0);
      [cls[c === 2 ? 'T2' : c === 1 ? 'T1' : 'T0'], cls[scheme]].forEach(z => { z.p.push(pr); z.y.push(obsMean.get(k)); if (o.truth) z.t.push(o.truth[k]); });
    });
  };
  for (let rep = 0; rep < o.reps; rep++) {
    const r = rng(o.seed + 104729 * rep);
    /* scheme 1: random hybrids */
    const perm = shuffle(keys.slice(), r);
    const fold = new Map(perm.map((k, i) => [k, i % o.folds]));
    for (let f = 0; f < o.folds; f++) await run(ok.filter(h => fold.get(h.p1 + '×' + h.p2) !== f), perm.filter(k => fold.get(k) === f), 'hybrids');
    /* scheme 2: new lines; a hybrid whose two parents fall in different folds is tested in one of them */
    const l1 = shuffle(ids1.slice(), r), l2 = shuffle(ids2.slice(), r);
    const f1 = new Map(l1.map((id, i) => [id, i % o.folds])), f2 = new Map(l2.map((id, i) => [id, i % o.folds]));
    const at = new Map(keys.map(k => { const [a, b] = k.split('×'); const fa = f1.get(a), fb = f2.get(b); return [k, fa === fb || r() < 0.5 ? fa : fb]; }));
    for (let f = 0; f < o.folds; f++) await run(ok.filter(h => f1.get(h.p1) !== f && f2.get(h.p2) !== f), keys.filter(k => at.get(k) === f), 'lines');
  }
  const sum = z => ({ n: z.p.length, r: z.p.length > 2 ? S.pearson(z.p, z.y) : NaN, rTrue: o.truth && z.p.length > 2 ? S.pearson(z.p, z.t) : NaN });
  return { T2: sum(cls.T2), T1: sum(cls.T1), T0: sum(cls.T0), hybrids: sum(cls.hybrids), lines: sum(cls.lines), folds: o.folds, reps: o.reps };
};

/* Jenkins (1934): a three-way or double cross predicted from single crosses, weighted by the share
   of every line on each side: (A×B)×C = ½(AC + BC), (A×B)×(C×D) = ¼(AC + AD + BC + BD) */
GS.jenkins = (expr, lines, sc) => {
  const tree = XB.parse(expr, lines);
  if (!tree.sire || tree.breed) throw new Error(T('Escriba una cruza triple o doble, por ejemplo (A×B)×C.', 'Write a three-way or double cross, for example (A×B)×C.'));
  const pS = XB.describe(tree.sire, lines).p, pD = XB.describe(tree.dam, lines).p;
  let v = 0, w = 0;
  lines.forEach((a, i) => { if (!pS[i]) return; lines.forEach((b, j) => { if (!pD[j]) return; const x = sc(a, b); if (!isFinite(x)) return; v += pS[i] * pD[j] * x; w += pS[i] * pD[j]; }); });
  return w > 0.999 ? v : NaN;
};

/* expected gain per year: phenotypic selection i·h·σA/L against genomic selection i·r·σA/L */
GS.response = o => ({ pheno: o.i * o.h * o.sigmaA / o.Lp, genomic: o.i * o.r * o.sigmaA / o.Lg });

/* ---------------- simulated data ---------------- */
/* a genome of chromosomes of 100 cM with loci at random positions; gametes by Haldane crossovers */
function genome(r, nChr, perChr) {
  const pos = [];
  for (let c = 0; c < nChr; c++) { const p = Array.from({ length: perChr }, () => r() * 100).sort((a, b) => a - b); p.forEach((x, k) => pos.push({ c, x, first: k === 0 })); }
  const rec = pos.map((l, k) => (l.first ? 0.5 : 0.5 * (1 - Math.exp(-2 * (l.x - pos[k - 1].x) / 100))));
  return { pos, rec, L: pos.length };
}
function gamete(r, gen, h1, h2) {
  const g = new Uint8Array(gen.L);
  let cur = r() < 0.5 ? h1 : h2;
  /* between chromosomes the recombination fraction is ½: independent assortment */
  for (let k = 0; k < gen.L; k++) { if (k && r() < gen.rec[k]) cur = cur === h1 ? h2 : h1; g[k] = cur[k]; }
  return g;
}
function population(r, gen, freq, size, gens) {
  let pop = Array.from({ length: size }, () => [Uint8Array.from(freq, p => (r() < p ? 1 : 0)), Uint8Array.from(freq, p => (r() < p ? 1 : 0))]);
  for (let t = 0; t < gens; t++) pop = pop.map(() => { const a = pop[Math.floor(r() * size)], b = pop[Math.floor(r() * size)]; return [gamete(r, gen, a[0], a[1]), gamete(r, gen, b[0], b[1])]; });
  return pop;
}
/* 300 doubled-haploid lines, 1000 SNPs and 60 QTL off the panel; σ²G among lines 1, h² = 0.4 */
GS.simLines = seed => {
  const r = rng(seed || 2027);
  const gen = genome(r, 5, 260);
  const freq = Array.from({ length: gen.L }, () => 0.1 + 0.8 * r());
  const pop = population(r, gen, freq, 80, 12);
  const lines = Array.from({ length: 300 }, () => { const par = pop[Math.floor(r() * pop.length)]; return gamete(r, gen, par[0], par[1]); });
  const idx = shuffle(Array.from({ length: gen.L }, (_, k) => k), r);
  const qtl = idx.slice(0, 60), snps = idx.slice(60, 1060).sort((a, b) => a - b);
  const eff = qtl.map(() => randn(r));
  const g0 = lines.map(l => qtl.reduce((s, q, k) => s + 2 * l[q] * eff[k], 0));
  const m = S.mean(g0), v = S.variance(g0);
  const g = g0.map(x => (x - m) / Math.sqrt(v));
  const s2e = 1.5;
  const ids = lines.map((_, i) => 'L' + String(i + 1).padStart(3, '0'));
  const markers = snps.map((k, j) => `c${gen.pos[k].c + 1}_${String(j + 1).padStart(4, '0')}`);
  const text = markers.join(',') + '\n' + lines.map((l, i) => ids[i] + ',' + snps.map(k => 2 * l[k]).join('')).join('\n');
  const phen = [['Linea', 'Rendimiento']].concat(ids.map((id, i) => [id, +(10 + g[i] + Math.sqrt(s2e) * randn(r)).toFixed(3)]));
  return { markersText: text, pheno: phen, truth: Object.fromEntries(ids.map((id, i) => [id, g[i]])), params: { sigma2g: 1, sigma2e: s2e, h2: 1 / (1 + s2e), qtl: 60, snps: 1000, lines: 300 } };
};
/* two heterotic pools (30 and 25 inbred lines), 800 SNPs and 100 QTL with additive and dominance
   effects; 200 of the 750 single crosses are evaluated, the true value of all 750 is known */
GS.simHybrids = seed => {
  const r = rng(seed || 3141);
  const gen = genome(r, 4, 225);
  const f0 = Array.from({ length: gen.L }, () => 0.15 + 0.7 * r());
  const fD = f0.map(p => Math.min(0.97, Math.max(0.03, p + 0.25 * randn(r)))), fF = f0.map(p => Math.min(0.97, Math.max(0.03, p + 0.25 * randn(r))));
  const pD = population(r, gen, fD, 50, 10), pF = population(r, gen, fF, 50, 10);
  const dh = (pop, n) => Array.from({ length: n }, () => { const par = pop[Math.floor(r() * pop.length)]; return gamete(r, gen, par[0], par[1]); });
  const D = dh(pD, 30), F = dh(pF, 25);
  const idx = shuffle(Array.from({ length: gen.L }, (_, k) => k), r);
  const qtl = idx.slice(0, 100), snps = idx.slice(100, 900).sort((a, b) => a - b);
  const a = qtl.map(() => randn(r)), dd = qtl.map((_, k) => Math.abs(a[k]) * (0.5 + 0.4 * randn(r)));
  const val = (x, y) => qtl.reduce((s, q, k) => s + (x[q] === y[q] ? (x[q] ? a[k] : -a[k]) : dd[k]), 0);
  const idsD = D.map((_, i) => 'D' + String(i + 1).padStart(2, '0')), idsF = F.map((_, i) => 'F' + String(i + 1).padStart(2, '0'));
  const G = {};
  D.forEach((x, i) => F.forEach((y, j) => { G[idsD[i] + '×' + idsF[j]] = val(x, y); }));
  const gv = Object.values(G), m = S.mean(gv), sdv = Math.sqrt(S.variance(gv));
  Object.keys(G).forEach(k => { G[k] = 10 * (G[k] - m) / sdv; });
  const all = Object.keys(G);
  const tested = new Set(shuffle(all.slice(), r).slice(0, 200));
  const s2e = 60;
  const markers = snps.map((k, j) => `c${gen.pos[k].c + 1}_${String(j + 1).padStart(4, '0')}`);
  const text = markers.join(',') + '\n' + D.map((l, i) => idsD[i] + ',' + snps.map(k => 2 * l[k]).join('')).concat(F.map((l, i) => idsF[i] + ',' + snps.map(k => 2 * l[k]).join(''))).join('\n');
  const phen = [['Dentado', 'Cristalino', 'Rendimiento']];
  all.filter(k => tested.has(k)).forEach(k => { const [p1, p2] = k.split('×'); phen.push([p1, p2, +(100 + G[k] + Math.sqrt(s2e) * randn(r)).toFixed(2)]); });
  return { markersText: text, pheno: phen, truth: G, params: { sigma2G: 100, sigma2e: s2e, tested: 200, possible: all.length } };
};

window.GS = GS;
