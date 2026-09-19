/* BreedingPro — Block 10 engine: crossbreeding parameters (Dickerson 1969, 1973).
   Every group is written as a cross expression, sire first: "A", "A×B", "C×(A×B)",
   "(A×B)×(A×B)". From it come the direct breed composition pᵢ = ½(p_sire + p_dam), the maternal
   composition (that of the dam), the direct heterozygosity h^I = 1 − Σ p_sire,k p_dam,k (or its
   breed-pair parts p_sire,k p_dam,l + p_sire,l p_dam,k), the maternal heterozygosity h^M (the dam's own
   h^I) and the recombination loss r^I = (h_sire + h_dam)/4 (Kinghorn 1980: ½ in the F₂; with the
   option "half" (h_sire + h_dam)/2, 1 in the F₂, as Dickerson 1973 wrote it). Group means are fitted by
   weighted least squares with Σ g^I = Σ g^M = 0 (LM.constrained), non-estimable parameters are
   flagged, and any cross or crossbreeding system (rotations, composites) is predicted with its
   standard error. The breed-pair heterosis of a breed diallel is split into average, breed and
   specific heterosis (Eisen et al. 1983). */

const XB = {};

/* ---------------- parsing ---------------- */
XB.normalize = s => String(s).replace(/[×✕✖*·]/g, '×').replace(/\s+[xX]\s+/g, '×').trim();
XB.parse = (expr, breeds) => {
  const s = XB.normalize(expr);
  const list = breeds.slice().sort((a, b) => b.length - a.length);
  let i = 0;
  const skip = () => { while (i < s.length && s[i] === ' ') i++; };
  const node = () => {
    skip();
    if (s[i] === '(') { i++; const v = cross(); skip(); if (s[i] !== ')') throw new Error(T(`falta «)» en «${expr}»`, `missing ")" in "${expr}"`)); i++; return v; }
    const hit = list.find(b => s.startsWith(b, i));
    if (!hit) throw new Error(T(`raza desconocida en «${expr}» (posición ${i + 1})`, `unknown breed in "${expr}" (position ${i + 1})`));
    i += hit.length;
    return { breed: hit };
  };
  const cross = () => {
    let left = node();
    skip();
    /* single-letter breeds may be joined by a bare x: "AxB" */
    while (i < s.length && (s[i] === '×' || ((s[i] === 'x' || s[i] === 'X') && list.some(b => s.startsWith(b, i + 1)) && !list.some(b => s.startsWith(b, i))))) { i++; const right = node(); left = { sire: left, dam: right }; skip(); }
    return left;
  };
  const v = cross();
  skip();
  if (i < s.length) throw new Error(T(`no se entiende «${s.slice(i)}» en «${expr}»`, `cannot read "${s.slice(i)}" in "${expr}"`));
  return v;
};

/* composition, heterozygosities and recombination of a node */
XB.describe = (tree, breeds, o) => {
  o = o || {};
  const B = breeds.length, k = new Map(breeds.map((b, j) => [b, j]));
  const rf = o.recomb === 'half' ? 0.5 : 0.25;
  const walk = t => {
    if (t.breed) { const p = new Array(B).fill(0); p[k.get(t.breed)] = 1; return { p, pd: p.slice(), hI: 0, hM: 0, rI: 0, rM: 0, pair: new Array(B * B).fill(0), pure: true }; }
    const S = walk(t.sire), D = walk(t.dam);
    const p = S.p.map((v, j) => 0.5 * (v + D.p[j]));
    let same = 0;
    const pair = new Array(B * B).fill(0);
    for (let a = 0; a < B; a++) { same += S.p[a] * D.p[a]; for (let b = a + 1; b < B; b++) pair[a * B + b] = S.p[a] * D.p[b] + S.p[b] * D.p[a]; }
    return { p, pd: D.p.slice(), hI: 1 - same, hM: D.hI, rI: rf * (S.hI + D.hI), rM: D.rI, pair, pure: false };
  };
  return walk(tree);
};

/* crossbreeding systems at equilibrium, averaged over the cycle */
XB.system = (kind, list, breeds, o) => {
  o = o || {};
  const B = breeds.length, k = new Map(breeds.map((b, j) => [b, j]));
  const rf = o.recomb === 'half' ? 0.5 : 0.25;
  const idx = list.map(b => { if (!k.has(b)) throw new Error(T(`raza desconocida: ${b}`, `unknown breed: ${b}`)); return k.get(b); });
  if (kind === 'comp') {
    /* composite (synthetic) after random mating: equal shares unless given */
    const w = (o.shares || idx.map(() => 1 / idx.length));
    const p = new Array(B).fill(0); idx.forEach((j, q) => { p[j] += w[q]; });
    const h = 1 - p.reduce((s, v) => s + v * v, 0);
    const pair = new Array(B * B).fill(0);
    for (let a = 0; a < B; a++) for (let b = a + 1; b < B; b++) pair[a * B + b] = 2 * p[a] * p[b];
    return { p, pd: p.slice(), hI: h, hM: h, rI: rf * 2 * h, rM: rf * 2 * h, pair };
  }
  /* rotation: iterate until the cycle repeats, then average one cycle */
  let fem = { p: (() => { const p = new Array(B).fill(0); p[idx[1 % idx.length]] = 1; return p; })(), h: 0, r: 0 };
  const cycle = [];
  for (let g = 0; g < 200; g++) {
    const b = idx[g % idx.length];
    const pS = new Array(B).fill(0); pS[b] = 1;
    const p = pS.map((v, j) => 0.5 * (v + fem.p[j]));
    const hI = 1 - fem.p[b];
    const pair = new Array(B * B).fill(0);
    for (let a = 0; a < B; a++) for (let c = a + 1; c < B; c++) pair[a * B + c] = pS[a] * fem.p[c] + pS[c] * fem.p[a];
    const cur = { p, pd: fem.p.slice(), hI, hM: fem.h, rI: rf * fem.h, rM: fem.r, pair };
    if (g >= 200 - idx.length) cycle.push(cur);
    fem = { p, h: hI, r: cur.rI };
  }
  const avg = key => cycle[0][key].map((_, j) => cycle.reduce((s, c) => s + c[key][j], 0) / cycle.length);
  const one = key => cycle.reduce((s, c) => s + c[key], 0) / cycle.length;
  return { p: avg('p'), pd: avg('pd'), hI: one('hI'), hM: one('hM'), rI: one('rI'), rM: one('rM'), pair: avg('pair'), cycle };
};

/* an expression or a system: "A×B", "rot(A,B)", "comp(A,B,C)" */
XB.coefficients = (expr, breeds, o) => {
  const s = String(expr).trim();
  const m = /^(rot|rotation|rotación|rotacion|comp|composite|compuesta|sintetica|sintética)\s*\(([^)]*)\)$/i.exec(s);
  if (m) {
    const kind = /^rot/i.test(m[1]) ? 'rot' : 'comp';
    const items = m[2].split(/[,;]/).map(x => x.trim()).filter(Boolean);
    let shares = null;
    const list = items.map(x => { const q = /^(.+?)\s*[:=]\s*([\d.]+)$/.exec(x); if (q) { (shares || (shares = [])).push(+q[2]); return q[1].trim(); } return x; });
    if (shares) { const t = shares.reduce((a, b) => a + b, 0); shares = shares.map(v => v / t); }
    return Object.assign({ system: kind }, XB.system(kind, list, breeds, Object.assign({}, o, { shares })));
  }
  return XB.describe(XB.parse(s, breeds), breeds, o);
};

/* ---------------- the design matrix ---------------- */
XB.columns = (breeds, o) => {
  const B = breeds.length, cols = [{ key: 'mu', es: 'media (μ)', en: 'mean (μ)' }];
  breeds.forEach(b => cols.push({ key: 'gI:' + b, kind: 'gI', breed: b, es: `aditivo directo ${b}`, en: `direct additive ${b}` }));
  if (o.maternal !== false) breeds.forEach(b => cols.push({ key: 'gM:' + b, kind: 'gM', breed: b, es: `aditivo materno ${b}`, en: `maternal additive ${b}` }));
  if (o.pairs) { for (let a = 0; a < B; a++) for (let c = a + 1; c < B; c++) cols.push({ key: `hI:${breeds[a]}·${breeds[c]}`, kind: 'hPair', a, c, es: `heterosis directa ${breeds[a]}·${breeds[c]}`, en: `direct heterosis ${breeds[a]}·${breeds[c]}` }); }
  else cols.push({ key: 'hI', kind: 'hI', es: 'heterosis directa', en: 'direct heterosis' });
  if (o.hM !== false) cols.push({ key: 'hM', kind: 'hM', es: 'heterosis materna', en: 'maternal heterosis' });
  if (o.rI !== false) cols.push({ key: 'rI', kind: 'rI', es: 'pérdida por recombinación', en: 'recombination loss' });
  if (o.rM) cols.push({ key: 'rM', kind: 'rM', es: 'pérdida por recombinación materna', en: 'maternal recombination loss' });
  return cols;
};
XB.row = (c, cols, breeds) => {
  const B = breeds.length, k = new Map(breeds.map((b, j) => [b, j]));
  return cols.map(col => {
    switch (col.kind) {
      case 'gI': return c.p[k.get(col.breed)];
      case 'gM': return c.pd[k.get(col.breed)];
      case 'hI': return c.hI;
      case 'hPair': return c.pair[col.a * B + col.c];
      case 'hM': return c.hM;
      case 'rI': return c.rI;
      case 'rM': return c.rM;
      default: return 1;
    }
  });
};

/* groups: [{ name, expr, n, mean, se }] */
XB.estimate = (groups, breeds, o) => {
  o = o || {};
  const cols = XB.columns(breeds, o);
  const m = cols.length;
  const rows = groups.map(g => ({ g, c: XB.coefficients(g.expr || g.name, breeds, o) }));
  const X = rows.map(r => XB.row(r.c, cols, breeds));
  const y = groups.map(g => g.mean);
  const withSE = groups.every(g => g.se > 0);
  const w = groups.map(g => (withSE ? 1 / (g.se * g.se) : g.n > 0 ? g.n : 1));
  /* Σ g^I = 0 and Σ g^M = 0 */
  const C = [];
  const sumOf = kind => cols.map(col => (col.kind === kind ? 1 : 0));
  C.push(sumOf('gI'));
  if (o.maternal !== false) C.push(sumOf('gM'));
  const fit0 = LM.constrained(X, y, w, C, 1);
  if (!fit0) return { error: T('No hay parámetros estimables.', 'No parameter is estimable.') };
  const fitted = X.map(x => x.reduce((s, v, j) => s + v * fit0.theta[j], 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const df = groups.length - fit0.rank;
  const Q = resid.reduce((s, e, i) => s + w[i] * e * e, 0);
  /* with standard errors the weights are 1/SE² and σ² = 1 (Q tests the lack of fit);
     with group sizes only, σ² is estimated from the residual when there are degrees of freedom */
  const sigma2 = withSE ? 1 : df > 0 ? Q / df : NaN;
  const fit = withSE ? fit0 : LM.constrained(X, y, w, C, sigma2);
  const Lof = col => new Map([[col, 1]]);
  const par = cols.map((col, j) => {
    const L = Lof(j);
    const est = fit.estimable(L);
    const v = est ? fit.varOf(L) : NaN;
    return Object.assign({}, col, { estimable: est, est: est ? fit.estOf(L) : NaN, se: est && isFinite(v) ? Math.sqrt(v) : NaN });
  });
  par.forEach(p => { p.t = p.est / p.se; p.p = isFinite(p.t) ? 2 * (1 - (withSE || !(df > 0) ? S.pnorm(Math.abs(p.t)) : S.pt(Math.abs(p.t), df))) : NaN; });
  const predict = expr => {
    const c = XB.coefficients(expr, breeds, o);
    const x = XB.row(c, cols, breeds);
    const L = new Map(); x.forEach((v, j) => { if (v) L.set(j, v); });
    const est = fit.estimable(L);
    const v = est ? fit.varOf(L) : NaN;
    return { expr, c, x, estimable: est, est: est ? fit.estOf(L) : NaN, se: est && isFinite(v) ? Math.sqrt(v) : NaN };
  };
  const out = { cols, par, rows: rows.map((r, i) => ({ name: r.g.name || r.g.expr, expr: r.g.expr || r.g.name, c: r.c, x: X[i], y: y[i], w: w[i], fitted: fitted[i], resid: resid[i] })), df, Q, withSE, wKind: withSE ? 'se' : groups.every(g => g.n > 0) ? 'n' : groups.some(g => g.n > 0) ? 'mixed' : 'equal', sigma2, rank: fit.rank, predict, fit };
  if (withSE && df > 0) out.pLof = 1 - S.pchisq(Q, df);
  if (!withSE && df > 0) out.pLof = NaN;
  /* breed diallel: average, breed and specific heterosis (Eisen et al. 1983) */
  if (o.pairs && breeds.length >= 3) {
    const B = breeds.length;
    const pj = new Map();
    cols.forEach((col, j) => { if (col.kind === 'hPair') pj.set(col.a * B + col.c, j); });
    const hIdx = (a, b) => pj.get(Math.min(a, b) * B + Math.max(a, b));
    const nP = B * (B - 1) / 2;
    const comb = (fn) => { const L = new Map(); fn((j, v) => L.set(j, (L.get(j) || 0) + v)); return L; };
    const mean = comb(add => pj.forEach(j => add(j, 1 / nP)));
    const breedH = a => comb(add => { for (let b = 0; b < B; b++) if (b !== a) add(hIdx(a, b), 2 / (B - 2)); pj.forEach(j => add(j, -2 * (B - 1) / (B - 2) / nP)); });
    const specific = (a, b) => {
      const L = new Map([[hIdx(a, b), 1]]);
      const addMap = (M, f) => M.forEach((v, j) => L.set(j, (L.get(j) || 0) + f * v));
      addMap(mean, -1); addMap(breedH(a), -0.5); addMap(breedH(b), -0.5);
      return L;
    };
    const show = L => { const e = fit.estimable(L); const v = e ? fit.varOf(L) : NaN; return { est: e ? fit.estOf(L) : NaN, se: e && isFinite(v) ? Math.sqrt(v) : NaN, estimable: e }; };
    out.diallel = { mean: show(mean), breed: breeds.map((b, a) => Object.assign({ breed: b }, show(breedH(a)))), specific: [] };
    for (let a = 0; a < B; a++) for (let b = a + 1; b < B; b++) out.diallel.specific.push(Object.assign({ pair: breeds[a] + '·' + breeds[b] }, show(specific(a, b))));
  }
  return out;
};

/* prediction from given parameters in base-breed coding: μ is the base breed, gI:k and gM:k
   are differences from it, and hI, hM, rI, rM the heterosis and recombination effects */
XB.predictGiven = (params, exprs, breeds, o) => exprs.map(expr => {
  const c = XB.coefficients(expr, breeds, o);
  const k = new Map(breeds.map((b, j) => [b, j]));
  let v = params.mu || 0;
  Object.entries(params).forEach(([key, val]) => {
    const [kind, br] = key.split(':');
    if (kind === 'gI' && k.has(br)) v += val * c.p[k.get(br)];
    else if (kind === 'gM' && k.has(br)) v += val * c.pd[k.get(br)];
    else if (kind === 'hI') v += val * c.hI;
    else if (kind === 'hM') v += val * c.hM;
    else if (kind === 'rI') v += val * c.rI;
    else if (kind === 'rM') v += val * c.rM;
  });
  return { expr, c, est: v };
});

/* multiplicative heterosis: breed average (from purebred means, or from μ plus direct and
   maternal breed effects) × (1 + H_I h^I) × (1 + H_M h^M) × (1 − R r^I) */
XB.predictPercent = (o, exprs, breeds) => exprs.map(expr => {
  const c = XB.coefficients(expr, breeds, o);
  let base;
  if (o.mode === 'effects') base = (o.mu || 0) + breeds.reduce((s, b, j) => s + c.p[j] * (o.gI[b] || 0) + c.pd[j] * (o.gM[b] || 0), 0);
  else base = breeds.reduce((s, b, j) => s + c.p[j] * (o.means[b] || 0), 0);
  const afterI = base * (1 + (o.HI || 0) / 100 * c.hI);
  const afterM = afterI * (1 + (o.HM || 0) / 100 * c.hM);
  const afterR = afterM * (1 - (o.R || 0) / 100 * c.rI);
  return { expr, c, base, afterI, afterM, final: afterR };
});

/* simulated experiments with known parameters (fixed seeds): group means and their standard
   errors from simulated individuals.
   'sim3': three breeds, purebreds, reciprocal F₁, backcrosses, F₂ and three-breed crosses;
   'dial4': a full four-breed diallel (purebreds and the 12 reciprocal F₁) with pair heterosis. */
XB.simulate = (kind, seed) => {
  const r = rng(seed != null ? seed : kind === 'dial4' ? 424242 : 777);
  const draw = (m, n, sd) => {
    const xs = Array.from({ length: n }, () => m + sd * randn(r));
    const mean = xs.reduce((a, b) => a + b, 0) / n;
    return { mean, se: Math.sqrt(xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1) / n) };
  };
  if (kind === 'dial4') {
    const br = ['A', 'B', 'C', 'D'];
    const t = { mu: 50, gI: { A: 3, B: -1, C: -2.5, D: 0.5 }, gM: { A: -1, B: 1.5, C: 0, D: -0.5 }, pair: { 'A·B': 4, 'A·C': 6, 'A·D': 2, 'B·C': 3, 'B·D': 5, 'C·D': 4 } };
    const lines = [], groups = [];
    br.forEach(s => br.forEach(d => {
      const expr = s === d ? s : s + '×' + d;
      const m = t.mu + 0.5 * (t.gI[s] + t.gI[d]) + t.gM[d] + (s === d ? 0 : t.pair[[s, d].sort().join('·')]);
      const x = draw(m, 25, 5);
      groups.push({ expr, n: 25, mean: x.mean, se: x.se, true: m });
      lines.push(`${expr}, 25, ${x.mean.toFixed(3)}, ${x.se.toFixed(3)}`);
    }));
    return { breeds: 'A, B, C, D', groups: lines.join('\n'), list: groups, truth: t };
  }
  const br = ['A', 'B', 'C'];
  const t = { mu: 100, gI: { A: 6, B: -2, C: -4 }, gM: { A: -3, B: 2, C: 1 }, hI: 8, hM: 5, rI: -4 };
  const names = ['A', 'B', 'C', 'A×B', 'B×A', 'A×C', 'C×A', 'B×C', 'C×B', 'A×(A×B)', 'B×(A×B)', '(A×B)×(A×B)', 'C×(A×B)', 'A×(B×C)', '(A×C)×(A×C)', 'B×(B×C)'];
  const lines = [], groups = [];
  names.forEach(g => {
    const c = XB.coefficients(g, br);
    const m = t.mu + br.reduce((s, b, j) => s + c.p[j] * t.gI[b] + c.pd[j] * t.gM[b], 0) + t.hI * c.hI + t.hM * c.hM + t.rI * c.rI;
    const x = draw(m, 30, 10);
    groups.push({ expr: g, n: 30, mean: x.mean, se: x.se, true: m });
    lines.push(`${g}, 30, ${x.mean.toFixed(3)}, ${x.se.toFixed(3)}`);
  });
  return { breeds: 'A, B, C', groups: lines.join('\n'), list: groups, truth: t };
};

window.XB = XB;
