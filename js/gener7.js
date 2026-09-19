/* BreedingPro — Block 7: generations and heterosis.

   Generation mean analysis (the joint scaling test of Cavalli 1952 by weighted least
   squares, the individual scaling tests of Mather 1949 and the sequence of models up to the
   six-parameter one), generation variance analysis (the second-degree statistics D, H, F and
   E by least squares on the variances), heritability, the minimum number of effective
   factors (Castle–Wright as corrected by Lande 1981 and by Cockerham 1986), heterosis,
   inbreeding depression and the potence ratio.

   Two parametrisations are offered because the literature uses both and they are not the
   same numbers. With α = f(AA) − f(aa) and β = f(Aa) in the generation:
     Mather & Jinks F∞ metric:  μ = m + α[d] + β[h] + α²[i] + αβ[j] + β²[l]
     Hayman (1958) F₂ metric:   μ = m + αd + (β−½)h + α²i + 2α(β−½)j + (β−½)²l
   They are related by m_MJ = m_H − ½h_H + ¼l_H, [d] = d − j, [h] = h − l, [i] = i,
   [j] = 2j, [l] = l. Papers that quote "Hayman (1958)" often use the Jinks & Jones (1958)
   variant, which is Hayman's with [j] = 2j; that value is reported as well.

   Everything works from the statistics of every generation (n, mean, variance of the mean,
   variance among individuals and its degrees of freedom), so a table published as summary
   statistics can be analysed exactly like a data file. */

const GEN = {};

/* frequencies of the three genotypes in every generation, as α = f(AA) − f(aa) and
   β = f(Aa); P1 carries the increasing alleles */
GEN.AB = {
  P1: [1, 0], P2: [-1, 0], F1: [0, 1], RF1: [0, 1],
  F2: [0, 0.5], F3: [0, 0.25], BC1: [0.5, 0.5], BC2: [-0.5, 0.5],
  BC1S: [0.5, 0.25], BC2S: [-0.5, 0.25],
};
GEN.NAMES = {
  P1: { es: 'P₁', en: 'P₁' }, P2: { es: 'P₂', en: 'P₂' }, F1: { es: 'F₁', en: 'F₁' },
  RF1: { es: 'F₁ recíproca', en: 'reciprocal F₁' }, F2: { es: 'F₂', en: 'F₂' }, F3: { es: 'F₃', en: 'F₃' },
  BC1: { es: 'RC₁ (F₁ × P₁)', en: 'BC₁ (F₁ × P₁)' }, BC2: { es: 'RC₂ (F₁ × P₂)', en: 'BC₂ (F₁ × P₂)' },
  BC1S: { es: 'RC₁ autofecundada', en: 'selfed BC₁' }, BC2S: { es: 'RC₂ autofecundada', en: 'selfed BC₂' },
};
GEN.PARAMS = ['m', 'd', 'h', 'i', 'j', 'l'];
GEN.PARAM_LABEL = {
  MJ: { m: 'm', d: '[d]', h: '[h]', i: '[i]', j: '[j]', l: '[l]' },
  H: { m: 'm', d: 'd', h: 'h', i: 'i', j: 'j', l: 'l' },
};

/* the row of the design matrix of one generation */
GEN.row = (gen, metric) => {
  const ab = GEN.AB[gen];
  if (!ab) return null;
  const a = ab[0];
  const b = metric === 'H' ? ab[1] - 0.5 : ab[1];
  return metric === 'H' ? [1, a, b, a * a, 2 * a * b, b * b] : [1, a, b, a * a, a * b, b * b];
};

/* coefficients of D, H, F and E in the variance among the individuals of one generation
   (no linkage, no epistasis; D = Σd², H = Σh², F = Σdh with P1 carrying the increasing
   alleles). The selfed-backcross rows are derived from the genotype frequencies. */
GEN.VARCOEF = {
  P1: [0, 0, 0, 1], P2: [0, 0, 0, 1], F1: [0, 0, 0, 1], RF1: [0, 0, 0, 1],
  F2: [0.5, 0.25, 0, 1],
  F3: [0.75, 3 / 16, 0, 1],
  BC1: [0.25, 0.25, -0.5, 1], BC2: [0.25, 0.25, 0.5, 1],
  BC1S: [0.5, 3 / 16, -0.25, 1], BC2S: [0.5, 3 / 16, 0.25, 1],
};

/* ================= 1 · statistics of every generation ================= */
/* rows: { gen, block, plot, y } at the level of the individual plant (or of the plot).
   The variance among individuals (for D, H, F and E) is the one within plots, or within
   blocks when every plant is its own plot. The variance of a generation mean depends on the
   design:
   · plants individually randomised (one plot per generation, or single-plant plots): the
     variance among individuals divided by their number;
   · replicated plots of several plants ('plots'): the plot means follow
     generation + block + plot error, and the variance of one plot mean of generation g is
     σ²p + s²g/k, the plot error shared by all generations plus the variance among the plants
     of g over the plants per plot. σ²p is the residual mean square of the plot means with the
     block effects taken out, minus its average plant part: blocks are shared by every
     generation and cancel in every comparison among their means, so they must not enter the
     weights. Degrees of freedom by Satterthwaite;
   · one value per plot, one plot per block: the residual mean square of the plot means,
     common to all generations. */
GEN.stats = (rows, o) => {
  o = o || {};
  const order = (o.order || Object.keys(GEN.AB)).filter(g => rows.some(r => r.gen === g && isFinite(r.y)));
  const avg = v => v.reduce((s, x) => s + x, 0) / v.length;
  /* the plots: the plants of one generation that share a plot (or a block when there is no plot) */
  const byKey = new Map();
  rows.forEach(r => {
    if (!isFinite(r.y) || !order.includes(r.gen)) return;
    const key = r.gen + ' ¦ ' + (r.plot != null ? r.plot : (r.block || ''));
    if (!byKey.has(key)) byKey.set(key, { gen: r.gen, block: r.block || '', vals: [] });
    byKey.get(key).vals.push(r.y);
  });
  const plots = [...byKey.values()];
  plots.forEach(p => { p.k = p.vals.length; p.mean = avg(p.vals); });
  /* plot means = generation + block + error, fitted by alternating means (exact when every
     generation is in every block, least squares when some plots are missing) */
  const blocks = [...new Set(plots.map(p => p.block))];
  const useB = blocks.length > 1;
  const ge = new Map(order.map(g => [g, 0])), be = new Map(blocks.map(b => [b, 0]));
  for (let it = 0; it < 2000; it++) {
    let move = 0;
    order.forEach(g => { const m = avg(plots.filter(p => p.gen === g).map(p => p.mean - be.get(p.block))); move = Math.max(move, Math.abs(m - ge.get(g))); ge.set(g, m); });
    if (!useB) break;
    blocks.forEach(b => { const m = avg(plots.filter(p => p.block === b).map(p => p.mean - ge.get(p.gen))); move = Math.max(move, Math.abs(m - be.get(b))); be.set(b, m); });
    if (move < 1e-13) break;
  }
  const dfPlot = plots.length - order.length - (useB ? blocks.length - 1 : 0);
  const msPlot = dfPlot > 0 ? plots.reduce((s, p) => s + (p.mean - ge.get(p.gen) - be.get(p.block)) ** 2, 0) / dfPlot : NaN;
  /* every generation: mean and variance among individuals */
  const G = order.map(g => {
    const P = plots.filter(p => p.gen === g);
    const y = [].concat(...P.map(p => p.vals));
    const n = y.length, nPlots = P.length;
    const mean = avg(y);
    const inPlots = n > nPlots;
    const bl = [...new Set(P.map(p => p.block))];
    let ss = 0, df = n - 1;
    if (inPlots && nPlots > 1) {
      P.forEach(p => p.vals.forEach(x => { ss += (x - p.mean) * (x - p.mean); }));
      df = n - nPlots;
    } else if (bl.length > 1 && n > bl.length) {
      /* single-plant plots in blocks: within blocks */
      bl.forEach(b => { const v = [].concat(...P.filter(p => p.block === b).map(p => p.vals)); const m = avg(v); v.forEach(x => { ss += (x - m) * (x - m); }); });
      df = n - bl.length;
    } else y.forEach(x => { ss += (x - mean) * (x - mean); });
    return { gen: g, P, n, nPlots, mean, inPlots, onePerBlock: !inPlots && useB && nPlots > 1 && nPlots <= bl.length,
      varWithin: df > 0 ? ss / df : NaN, dfWithin: df };
  });
  /* the plant part of the residual, averaged over the plots as the residual averages it */
  const plantPart = plots.reduce((s, p) => { const x = G.find(q => q.gen === p.gen); return s + (x.inPlots ? x.varWithin / p.k : NaN); }, 0) / plots.length;
  const s2p = isFinite(msPlot) && isFinite(plantPart) ? Math.max(0, msPlot - plantPart) : NaN;
  return G.map(x => {
    const base = { gen: x.gen, n: x.n, nPlots: x.nPlots, mean: x.mean, varWithin: x.varWithin, dfWithin: x.dfWithin, plotMeans: x.P.map(p => p.mean) };
    const wantPlots = x.nPlots > 1 && (o.weights === 'plots' || (!o.weights && (x.inPlots || x.onePerBlock)));
    /* Σk²/n²: 1/(number of plots) when the plots are the same size */
    const a = x.P.reduce((s, p) => s + p.k * p.k, 0) / (x.n * x.n);
    if (wantPlots && x.inPlots && isFinite(s2p)) {
      /* V(ȳg) = σ²p·Σk²/n² + s²g/n */
      const varMean = a * s2p + x.varWithin / x.n;
      /* the mean squares it is made of: varMean = a·MSplot + Σ_h e_h·s²_h, with the plant part
         of MSplot subtracted (e_h < 0) and s²_g/n added; with σ²p cut at zero only s²_g/n is left */
      const parts = s2p > 0
        ? [{ key: 'plot', ms: msPlot, df: dfPlot, c: a }].concat(G.map(h => ({ key: 'w:' + h.gen, ms: h.varWithin, df: h.dfWithin,
          c: -a * h.P.reduce((s, p) => s + 1 / p.k, 0) / plots.length + (h.gen === x.gen ? 1 / x.n : 0) })))
        : [{ key: 'w:' + x.gen, ms: x.varWithin, df: x.dfWithin, c: 1 / x.n }];
      return Object.assign(base, { varMean, seMean: Math.sqrt(varMean), dfMean: GEN.satt(parts), basis: 'plots', plotError: s2p, parts });
    }
    if (wantPlots && isFinite(msPlot)) {
      /* one value per plot: the residual of the plot means, common to every generation */
      const varMean = a * msPlot;
      return Object.assign(base, { varMean, seMean: Math.sqrt(varMean), dfMean: dfPlot, basis: 'plots', plotError: msPlot, plotLevel: !x.inPlots, parts: [{ key: 'plot', ms: msPlot, df: dfPlot, c: a }] });
    }
    const varMean = x.varWithin / x.n;
    return Object.assign(base, { varMean, seMean: Math.sqrt(varMean), dfMean: x.dfWithin, basis: 'plants', parts: [{ key: 'w:' + x.gen, ms: x.varWithin, df: x.dfWithin, c: 1 / x.n }] });
  });
};

/* Satterthwaite (1946) degrees of freedom of Σ c·MS */
GEN.satt = parts => {
  let v = 0, den = 0;
  parts.forEach(p => { v += p.c * p.ms; den += p.c * p.c * p.ms * p.ms / p.df; });
  return den > 0 ? v * v / den : NaN;
};
/* the degrees of freedom of a contrast Σ w_g·ȳ_g: the mean squares shared by several
   generations (the plot error) are added before Satterthwaite, not counted twice */
GEN.contrastDf = (stats, w) => {
  const acc = new Map();
  stats.forEach(s => {
    const c = w[s.gen];
    if (!c) return;
    (s.parts || [{ key: 'm:' + s.gen, ms: s.varMean, df: s.dfMean, c: 1 }]).forEach(p => {
      if (!acc.has(p.key)) acc.set(p.key, { ms: p.ms, df: p.df, c: 0 });
      acc.get(p.key).c += c * c * p.c;
    });
  });
  return GEN.satt([...acc.values()]);
};

/* ================= 2 · individual scaling tests (Mather 1949) ================= */
GEN.scaling = stats => {
  const g = {};
  stats.forEach(s => { g[s.gen] = s; });
  const have = (...k) => k.every(x => g[x]);
  const V = k => g[k].varMean;
  const M = k => g[k].mean;
  const out = [];
  /* w: the coefficients of the contrast, for its Satterthwaite degrees of freedom */
  const add = (key, es, en, value, variance, w, meaning) => {
    const se = Math.sqrt(Math.max(0, variance));
    const d = GEN.contrastDf(stats, w);
    const uses = Object.keys(w);
    const t = se > 0 ? value / se : NaN;
    out.push({ key, es, en, value, se, t, df: d, p: isFinite(t) && d > 0 ? 2 * (1 - S.pt(Math.abs(t), d)) : NaN, uses, meaning });
  };
  if (have('BC1', 'P1', 'F1')) add('A', 'A = 2RC₁ − P₁ − F₁', 'A = 2BC₁ − P₁ − F₁',
    2 * M('BC1') - M('P1') - M('F1'), 4 * V('BC1') + V('P1') + V('F1'), { BC1: 2, P1: 1, F1: 1 },
    { es: '−½[i] + ½[j] − ½[l]', en: '−½[i] + ½[j] − ½[l]' });
  if (have('BC2', 'P2', 'F1')) add('B', 'B = 2RC₂ − P₂ − F₁', 'B = 2BC₂ − P₂ − F₁',
    2 * M('BC2') - M('P2') - M('F1'), 4 * V('BC2') + V('P2') + V('F1'), { BC2: 2, P2: 1, F1: 1 },
    { es: '−½[i] − ½[j] − ½[l]', en: '−½[i] − ½[j] − ½[l]' });
  if (have('F2', 'F1', 'P1', 'P2')) add('C', 'C = 4F₂ − 2F₁ − P₁ − P₂', 'C = 4F₂ − 2F₁ − P₁ − P₂',
    4 * M('F2') - 2 * M('F1') - M('P1') - M('P2'), 16 * V('F2') + 4 * V('F1') + V('P1') + V('P2'), { F2: 4, F1: 2, P1: 1, P2: 1 },
    { es: '−2[i] − [l]', en: '−2[i] − [l]' });
  if (have('F2', 'BC1', 'BC2')) add('D', 'D = 2F₂ − RC₁ − RC₂', 'D = 2F₂ − BC₁ − BC₂',
    2 * M('F2') - M('BC1') - M('BC2'), 4 * V('F2') + V('BC1') + V('BC2'), { F2: 2, BC1: 1, BC2: 1 },
    { es: '−½[i]', en: '−½[i]' });
  if (have('P1', 'P2', 'F2', 'F3')) add('Dp', 'D′ = P₁ + P₂ + 2F₂ − 4F₃', 'D′ = P₁ + P₂ + 2F₂ − 4F₃',
    M('P1') + M('P2') + 2 * M('F2') - 4 * M('F3'), V('P1') + V('P2') + 4 * V('F2') + 16 * V('F3'), { P1: 1, P2: 1, F2: 2, F3: 4 },
    { es: 'prueba [i] y [l] con F₃', en: 'tests [i] and [l] with F₃' });
  return out;
};

/* ================= 3 · joint scaling test (Cavalli 1952) ================= */
/* weighted least squares on the generation means with w = 1/V(mean) */
GEN.fit = (stats, params, metric) => {
  const use = stats.filter(s => GEN.AB[s.gen] && isFinite(s.mean) && s.varMean > 0);
  const k = params.length;
  const ix = params.map(p => GEN.PARAMS.indexOf(p));
  const X = use.map(s => { const r = GEN.row(s.gen, metric); return ix.map(q => r[q]); });
  const y = use.map(s => s.mean), w = use.map(s => 1 / s.varMean);
  const A = [], b = [];
  for (let a = 0; a < k; a++) {
    b.push(use.reduce((s, _, q) => s + w[q] * X[q][a] * y[q], 0));
    A.push([]);
    for (let c = 0; c < k; c++) A[a].push(use.reduce((s, _, q) => s + w[q] * X[q][a] * X[q][c], 0));
  }
  const inv = S.inverse(A);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, c) => s + v * b[c], 0));
  const fitted = X.map(r => r.reduce((s, v, c) => s + v * beta[c], 0));
  const chi2 = use.reduce((s, _, q) => s + w[q] * (y[q] - fitted[q]) * (y[q] - fitted[q]), 0);
  const df = use.length - k;
  /* with individual plants the weights have enough degrees of freedom and the χ² of Cavalli
     serves (Gale, Mather & Jinks 1977). With plot means they have few, the χ² is liberal, and
     the test is the Welch–James approximation of Johansen (1980): χ²/c against F(q, ν), with
     A = Σ(1 − h_ii)²/f_i over the leverages h_ii of the weighted fit and the degrees of
     freedom f_i of every variance. With one value per plot every weight is a multiple of the
     same mean square, and χ²/q is exactly F(q, gl of the plots). */
  const plotBasis = use.length && use.every(s => s.basis === 'plots' && s.dfMean > 0);
  const oneMS = plotBasis && use.every(s => s.plotLevel);
  const pChi = df > 0 ? 1 - S.pchisq(chi2, df) : NaN;
  let p = pChi, test = 'chi2', nu = NaN, cWJ = NaN;
  if (plotBasis && df > 0) {
    if (oneMS) { nu = use[0].dfMean; cWJ = df; test = 'F'; }
    else {
      let Aj = 0;
      use.forEach((s, q) => {
        let h = 0;
        for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) h += X[q][a] * inv[a][c] * X[q][c];
        h *= w[q];
        Aj += (1 - h) * (1 - h) / s.dfMean;
      });
      cWJ = df + 2 * Aj - 6 * Aj / (df + 2); nu = df * (df + 2) / (3 * Aj); test = 'WJ';
    }
    p = 1 - S.pf(chi2 / cWJ, df, nu);
  }
  const est = params.map((p, a) => {
    const se = Math.sqrt(Math.max(0, inv[a][a]));
    const t = se > 0 ? beta[a] / se : NaN;
    /* one value per plot: t with the degrees of freedom of the plot error, exact */
    return { key: p, value: beta[a], se, t, p: !isFinite(t) ? NaN : oneMS ? 2 * (1 - S.pt(Math.abs(t), use[0].dfMean)) : 2 * (1 - S.pnorm(Math.abs(t))) };
  });
  return {
    params, metric, est, beta, cov: inv, chi2, df,
    p, pChi, test, nu, cWJ,
    generations: use.map(s => s.gen),
    observed: y, fitted, residual: y.map((v, q) => v - fitted[q]),
    weights: w, perfect: df === 0,
  };
};

/* the sequence of models the literature follows: increase the model until the fit is not
   rejected and every parameter in it is significant */
GEN.models = (stats, metric, alpha) => {
  alpha = alpha || 0.05;
  const sets = [
    ['m', 'd', 'h'],
    ['m', 'd', 'h', 'i'],
    ['m', 'd', 'h', 'l'],
    ['m', 'd', 'h', 'i', 'j'],
    ['m', 'd', 'h', 'i', 'l'],
    ['m', 'd', 'h', 'i', 'j', 'l'],
  ];
  const out = [];
  sets.forEach(ps => {
    const f = GEN.fit(stats, ps, metric);
    if (!f || f.df < 0) return;
    f.allSignificant = f.est.every(e => e.key === 'm' || (isFinite(e.p) && e.p < alpha));
    f.fits = !(f.df > 0) || f.p >= alpha;
    out.push(f);
  });
  /* the chosen model: the simplest one that is not rejected and has every parameter
     significant; if none qualifies, the simplest one that is not rejected */
  let chosen = out.find(f => f.df > 0 && f.fits && f.allSignificant);
  if (!chosen) chosen = out.find(f => f.df > 0 && f.fits);
  /* then the parameters that are not significant are dropped one at a time, the least
     significant first, while the smaller model is still not rejected (Jayasekara & Jinks
     1976, following Mather & Jinks) */
  if (chosen && !chosen.allSignificant) {
    let cur = chosen;
    for (;;) {
      const weak = cur.est.filter(e => e.key !== 'm' && !(e.p < alpha)).sort((a, b) => b.p - a.p)[0];
      if (!weak) break;
      const f = GEN.fit(stats, cur.params.filter(k => k !== weak.key), metric);
      if (!f) break;
      f.allSignificant = f.est.every(e => e.key === 'm' || (isFinite(e.p) && e.p < alpha));
      f.fits = !(f.df > 0) || f.p >= alpha;
      if (!f.fits) break;
      f.reduced = true;
      cur = f;
    }
    if (cur !== chosen) { out.push(cur); chosen = cur; }
  }
  if (!chosen) chosen = out.find(f => f.params.length === 6) || out[out.length - 1];
  return { list: out, chosen };
};

/* the same estimates in the other metric, through the exact transformation */
GEN.toMJ = est => {
  const g = k => { const e = est.find(x => x.key === k); return e ? e.value : 0; };
  const se = k => { const e = est.find(x => x.key === k); return e ? e.se : NaN; };
  return {
    m: g('m') - 0.5 * g('h') + 0.25 * g('l'),
    d: g('d') - g('j'), h: g('h') - g('l'), i: g('i'), j: 2 * g('j'), l: g('l'),
    seJ: 2 * se('j'),
  };
};

/* ================= 4 · second-degree statistics ================= */
/* least squares on the variances of the generations, with the weights of Mather & Jinks
   w = df/(2V̂²) iterated on the fitted values, or unweighted as in Mather (1949) */
GEN.varComponents = (stats, o) => {
  o = o || {};
  const withF = o.withF !== false;
  const use = stats.filter(s => GEN.VARCOEF[s.gen] && isFinite(s.varWithin) && s.dfWithin > 0);
  if (use.length < (withF ? 3 : 2)) return null;
  const cols = withF ? [0, 1, 2, 3] : [0, 1, 3];
  const names = (withF ? ['D', 'H', 'F', 'E'] : ['D', 'H', 'E']);
  const X = use.map(s => cols.map(c => GEN.VARCOEF[s.gen][c]));
  const y = use.map(s => s.varWithin);
  const k = cols.length;
  if (use.length < k) return null;
  let fitted = y.slice(), beta = null, inv = null;
  const solve = w => {
    const A = [], b = [];
    for (let a = 0; a < k; a++) {
      b.push(use.reduce((s, _, q) => s + w[q] * X[q][a] * y[q], 0));
      A.push([]);
      for (let c = 0; c < k; c++) A[a].push(use.reduce((s, _, q) => s + w[q] * X[q][a] * X[q][c], 0));
    }
    const iv = S.inverse(A);
    if (!iv) return null;
    return { beta: iv.map(row => row.reduce((s, v, c) => s + v * b[c], 0)), inv: iv };
  };
  const weightsOf = f => use.map((s, q) => (o.weighted === false ? 1 : s.dfWithin / (2 * Math.max(1e-12, f[q] * f[q]))));
  let w = weightsOf(fitted);
  for (let it = 0; it < (o.weighted === false ? 1 : 12); it++) {
    const r = solve(w);
    if (!r) return null;
    beta = r.beta; inv = r.inv;
    const f2 = X.map(row => row.reduce((s, v, c) => s + v * beta[c], 0));
    const move = Math.max(...f2.map((v, q) => Math.abs(v - fitted[q])));
    fitted = f2.map(v => Math.max(1e-9, v));
    w = weightsOf(fitted);
    if (o.weighted === false || move < 1e-10) break;
  }
  const chi2 = use.reduce((s, _, q) => s + w[q] * (y[q] - X[q].reduce((t, v, c) => t + v * beta[c], 0)) ** 2, 0);
  const df = use.length - k;
  const comp = names.map((nm, a) => {
    /* unweighted least squares takes the residual mean square as the scale, as Mather did */
    const scale = o.weighted === false && df > 0 ? chi2 / df : 1;
    const se = Math.sqrt(Math.max(0, inv[a][a] * (o.weighted === false ? scale : 1)));
    return { key: nm, value: beta[a], se, t: se > 0 ? beta[a] / se : NaN };
  });
  comp.forEach(c => { c.p = isFinite(c.t) ? 2 * (1 - S.pnorm(Math.abs(c.t))) : NaN; });
  const get = k2 => { const c = comp.find(x => x.key === k2); return c ? c.value : NaN; };
  const D = get('D'), H = get('H'), E = get('E'), F = get('F');
  const varF2 = (stats.find(s => s.gen === 'F2') || {}).varWithin;
  const vB1 = (stats.find(s => s.gen === 'BC1') || {}).varWithin;
  const vB2 = (stats.find(s => s.gen === 'BC2') || {}).varWithin;
  const okD = D > 0, okH = H >= 0;
  const denom = 0.5 * D + 0.25 * H + E;
  return {
    list: comp, D, H, F, E, chi2, df, p: df > 0 ? 1 - S.pchisq(chi2, df) : NaN,
    weighted: o.weighted !== false,
    generations: use.map(s => s.gen),
    observed: y, fitted: X.map(row => row.reduce((s, v, c) => s + v * beta[c], 0)),
    dominance: okD && okH ? Math.sqrt(H / D) : NaN,
    sigma2A: 0.5 * D, sigma2D: 0.25 * H,
    h2n: okD && denom > 0 ? 0.5 * D / denom : NaN,
    h2b: okD && okH && denom > 0 ? (0.5 * D + 0.25 * H) / denom : NaN,
    /* Warner (1952): the same narrow-sense heritability straight from three variances */
    warner: isFinite(varF2) && isFinite(vB1) && isFinite(vB2) && varF2 > 0 ? (2 * varF2 - (vB1 + vB2)) / varF2 : NaN,
    h2bF2: isFinite(varF2) && varF2 > 0 && isFinite(E) ? (varF2 - E) / varF2 : NaN,
  };
};

/* ================= 5 · minimum number of effective factors ================= */
/* Castle–Wright with the four segregation variances of Lande (1981) and the correction of
   Cockerham (1986) for the sampling error of the parental means */
GEN.factors = (stats, o) => {
  o = o || {};
  const g = {};
  stats.forEach(s => { g[s.gen] = s; });
  const have = (...k) => k.every(x => g[x]);
  const V = k => g[k].varWithin, N = k => g[k].n, M = k => g[k].mean;
  const out = { list: [] };
  if (!have('P1', 'P2')) return out;
  const delta = M('P2') - M('P1');
  const d2 = delta * delta;
  out.delta = delta;
  const add = (key, es, en, s2, varS2) => {
    if (!isFinite(s2) || s2 <= 0) return;
    const n = d2 / (8 * s2);
    /* Lande (1981) equation 7 */
    const varN = n * n * (4 * (V('P1') / N('P1') + V('P2') / N('P2')) / d2 + varS2 / (s2 * s2));
    out.list.push({ key, es, en, sigma2s: s2, n, se: Math.sqrt(Math.max(0, varN)) });
  };
  if (have('F2', 'F1')) add('a', 'V(F₂) − V(F₁)', 'V(F₂) − V(F₁)',
    V('F2') - V('F1'), 2 * V('F2') ** 2 / N('F2') + 2 * V('F1') ** 2 / N('F1'));
  if (have('F2', 'F1', 'P1', 'P2')) add('b', 'V(F₂) − [½V(F₁) + ¼V(P₁) + ¼V(P₂)]', 'V(F₂) − [½V(F₁) + ¼V(P₁) + ¼V(P₂)]',
    V('F2') - (0.5 * V('F1') + 0.25 * V('P1') + 0.25 * V('P2')),
    2 * V('F2') ** 2 / N('F2') + 0.5 * V('F1') ** 2 / N('F1') + 0.125 * V('P1') ** 2 / N('P1') + 0.125 * V('P2') ** 2 / N('P2'));
  if (have('F2', 'BC1', 'BC2')) add('c', '2V(F₂) − V(RC₁) − V(RC₂)', '2V(F₂) − V(BC₁) − V(BC₂)',
    2 * V('F2') - V('BC1') - V('BC2'),
    8 * V('F2') ** 2 / N('F2') + 2 * V('BC1') ** 2 / N('BC1') + 2 * V('BC2') ** 2 / N('BC2'));
  if (have('BC1', 'BC2', 'F1', 'P1', 'P2')) add('d', 'V(RC₁) + V(RC₂) − [V(F₁) + ½V(P₁) + ½V(P₂)]', 'V(BC₁) + V(BC₂) − [V(F₁) + ½V(P₁) + ½V(P₂)]',
    V('BC1') + V('BC2') - (V('F1') + 0.5 * V('P1') + 0.5 * V('P2')),
    2 * V('BC1') ** 2 / N('BC1') + 2 * V('BC2') ** 2 / N('BC2') + 2 * V('F1') ** 2 / N('F1') + 0.5 * V('P1') ** 2 / N('P1') + 0.5 * V('P2') ** 2 / N('P2'));
  /* Cockerham (1986): one segregation variance from all the variances at once, and the
     numerator corrected for the sampling variance of the two parental means */
  if (have('P1', 'P2', 'F1', 'F2', 'BC1', 'BC2')) {
    const s2s = 0.2 * (4 * V('F2') + V('BC1') + V('BC2')) - 0.4 * (V('P1') + V('P2') + V('F1'));
    const E = 0.3 * (V('P1') + V('P2') + V('F1')) + 0.1 * (V('BC1') + V('BC2') - V('F2'));
    const num = d2 - (V('P1') / N('P1') + V('P2') / N('P2'));
    out.cockerham = { sigma2s: s2s, E, n: s2s > 0 ? num / (8 * s2s) : NaN, numerator: num };
  }
  return out;
};

/* ================= 6 · heterosis and inbreeding depression ================= */
/* one contrast of means with its standard error, Satterthwaite df and t test */
GEN.hetRow = (stats, key, es, en, value, variance, base, w) => {
  const se = Math.sqrt(Math.max(0, variance));
  const t = se > 0 ? value / se : NaN;
  const df = GEN.contrastDf(stats, w);
  return {
    key, es, en, value, se, t, df, base,
    pct: base !== 0 ? 100 * value / Math.abs(base) : NaN,
    p: isFinite(t) && df > 0 ? 2 * (1 - S.pt(Math.abs(t), df)) : NaN,
  };
};
GEN.heterosis = (stats, o) => {
  o = o || {};
  const g = {};
  stats.forEach(s => { g[s.gen] = s; });
  const out = { list: [] };
  if (!g.P1 || !g.P2 || !g.F1) return out;
  const goal = o.goal === 'low' ? -1 : 1;
  const mp = (g.P1.mean + g.P2.mean) / 2;
  const better = goal > 0 ? (g.P1.mean >= g.P2.mean ? 'P1' : 'P2') : (g.P1.mean <= g.P2.mean ? 'P1' : 'P2');
  const add = (...a) => out.list.push(GEN.hetRow(stats, ...a));
  add('mph', 'Heterosis sobre la media de los progenitores', 'Mid-parent heterosis',
    g.F1.mean - mp, g.F1.varMean + 0.25 * g.P1.varMean + 0.25 * g.P2.varMean, mp, { F1: 1, P1: 0.5, P2: 0.5 });
  add('bph', 'Heterosis sobre el mejor progenitor', 'Better-parent heterosis',
    g.F1.mean - g[better].mean, g.F1.varMean + g[better].varMean, g[better].mean, { F1: 1, [better]: 1 });
  if (g.F2) add('id', 'Depresión endogámica (F₁ − F₂)', 'Inbreeding depression (F₁ − F₂)',
    g.F1.mean - g.F2.mean, g.F1.varMean + g.F2.varMean, g.F1.mean, { F1: 1, F2: 1 });
  /* potence ratio: +1 is complete dominance towards the higher parent */
  const dd = g.P1.mean - g.P2.mean;
  if (Math.abs(dd) > 1e-12) {
    const hp = (2 * g.F1.mean - g.P1.mean - g.P2.mean) / Math.abs(dd);
    const hi = g.P1.mean >= g.P2.mean ? 'P1' : 'P2', lo = hi === 'P1' ? 'P2' : 'P1';
    const varHp = (4 * g.F1.varMean + (1 + hp) * (1 + hp) * g[hi].varMean + (1 - hp) * (1 - hp) * g[lo].varMean) / (dd * dd);
    out.potence = { value: hp, se: Math.sqrt(Math.max(0, varHp)) };
  }
  out.midParent = mp; out.better = better;
  /* expectations without epistasis, for the reading */
  if (g.F2) {
    out.expectedF2 = mp + 0.5 * (g.F1.mean - mp);
    out.observedF2 = g.F2.mean;
  }
  return out;
};

/* standard heterosis: the F₁ against every check (a commercial variety or hybrid grown in the
   same trial). The checks are fitted jointly with the generations, so the block effects and the
   plot error come from the whole trial; they do not enter the scaling tests, the models or the
   other heterosis measures. A check is a row whose generation is 'CK:' + the name of the entry. */
GEN.isCheck = g => String(g).startsWith('CK:');
GEN.standardHeterosis = (joint, keys) => {
  const f1 = joint.find(s => s.gen === 'F1');
  if (!f1) return [];
  return keys.map(k => joint.find(s => s.gen === k)).filter(Boolean).map(c => {
    const name = c.gen.slice(3);
    return Object.assign(GEN.hetRow(joint, 'sh:' + name, `Heterosis estándar (contra ${name})`, `Standard heterosis (against ${name})`,
      f1.mean - c.mean, f1.varMean + c.varMean, c.mean, { F1: 1, [c.gen]: 1 }), { check: name });
  });
};

/* ================= 7 · the whole analysis ================= */
GEN.analyse = o => {
  const stats = o.stats || GEN.stats(o.rows.filter(r => !GEN.isCheck(r.gen)), o);
  const metric = o.metric === 'H' ? 'H' : 'MJ';
  const out = { stats, metric, issues: [] };
  if (stats.length < 3) {
    out.issues.push({ level: 'error', es: 'Se necesitan al menos tres generaciones.', en: 'At least three generations are needed.' });
    return out;
  }
  const missing = ['P1', 'P2', 'F1'].filter(k => !stats.some(s => s.gen === k));
  if (missing.length) out.issues.push({ level: 'warning', es: `Faltan generaciones básicas (${missing.join(', ')}): varias pruebas y la heterosis no se pueden calcular.`, en: `Basic generations are missing (${missing.join(', ')}): several tests and heterosis cannot be computed.` });
  out.scaling = GEN.scaling(stats);
  out.models = GEN.models(stats, metric, o.alpha || 0.05);
  out.perfect = GEN.fit(stats, GEN.PARAMS, metric);
  /* with one value per plot there is no variance among plants: D, H, F, E and the effective
     factors are left out instead of being computed on the wrong scale */
  out.plotLevel = stats.every(s => s.plotLevel);
  out.variances = out.plotLevel ? null : GEN.varComponents(stats, o);
  out.factors = out.plotLevel ? { list: [] } : GEN.factors(stats, o);
  out.heterosis = GEN.heterosis(stats, o);
  const ckRows = o.rows ? o.rows.filter(r => GEN.isCheck(r.gen) && isFinite(r.y)) : [];
  out.checks = [];
  if (ckRows.length) {
    const keys = [...new Set(ckRows.map(r => r.gen))];
    const joint = GEN.stats(o.rows, Object.assign({}, o, { order: (o.order || Object.keys(GEN.AB)).concat(keys) }));
    out.checks = joint.filter(s => keys.includes(s.gen));
    out.jointStats = joint;
    GEN.standardHeterosis(joint, keys).forEach(x => out.heterosis.list.push(x));
  }
  if (out.perfect && metric === 'H') out.jinksJones = GEN.toMJ(out.perfect.est);
  /* type of epistasis: the signs of [h] and [l] (Jinks & Jones 1958) */
  const chosen = out.models.chosen;
  const hv = chosen && chosen.est.find(e => e.key === 'h');
  const lv = chosen && chosen.est.find(e => e.key === 'l');
  if (hv && lv && isFinite(hv.value) && isFinite(lv.value)) {
    out.epistasisType = hv.value * lv.value > 0 ? 'complementary' : 'duplicate';
  }
  if (stats.some(s => s.basis === 'plots') && stats.some(s => s.basis === 'plants')) {
    out.issues.push({ level: 'warning', es: 'Las varianzas de las medias no vienen todas de la misma fuente: revise la opción de pesos.', en: 'The variances of the means do not all come from the same source: check the weighting option.' });
  }
  return out;
};

window.GEN = GEN;
