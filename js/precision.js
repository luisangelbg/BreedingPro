/* BreedingPro — Block 2 engine, part 3: precision and power before sowing.

   Everything here is computed from the expected mean squares of the balanced
   analysis, before any data exist.

   σ²ₑ is the plot error variance; with r replicates and L locations the error
   variance of an entry mean is σ² = σ²ₑ/(rL). Environments are assumed to add
   no interaction with the genetic effects (the planning optimum); the texts say
   so.

   Griffing (1956b), balanced, verified formulas (research report 01 §1.5–1.6):
   - Var(ĝᵢ), Var(ŝᵢⱼ), Var of differences = coefficient × σ².
   - Fixed model: SS non-centralities λ = df · k · σ²_effect / σ², where k is the
     coefficient of the component in E(MS) under Model II and σ²_effect is the
     variance of the fixed effects on that same scale (Σg² = (p − 1)σ²_g).
   - Random model: F = M_GCA/M_SCA (exact for Methods 2–4, approximate for
     Method 1) and F = M_SCA/M'ₑ, so power follows from the central F
     distribution scaled by the ratio of expected mean squares.
   - Sampling variance of an ANOVA estimator Σcᵢ·MSᵢ: 2·Σcᵢ²·E(MSᵢ)²/dfᵢ.
   Line × tester (report 02 §5.3): exact variances M_e(l − 1)/(rlt), etc.
   North Carolina I, II, III (report 02 §1–3). */

const Precision = {};

/* ---------------- Griffing ---------------- */
Precision.griffingTable = p => ({
  1: { kg: 2 * p, dfg: p - 1, ks: 2 * (p * p - p + 1) / (p * p), ksInG: 2 * (p - 1) / p, dfs: p * (p - 1) / 2, kr: 2, dfr: p * (p - 1) / 2,
    vg: (p - 1) / (2 * p * p), vsii: (p - 1) * (p - 1) / (p * p), vsij: (p * p - 2 * p + 2) / (2 * p * p), vr: 0.5,
    dgg: 1 / p, dsik: (p - 1) / p, dskl: (p - 2) / p, drr: 1, entries: p * p },
  2: { kg: p + 2, dfg: p - 1, ks: 1, ksInG: 1, dfs: p * (p - 1) / 2,
    vg: (p - 1) / (p * (p + 2)), vsii: p * (p - 1) / ((p + 1) * (p + 2)), vsij: (p * p + p + 2) / ((p + 1) * (p + 2)),
    dgg: 2 / (p + 2), dsik: 2 * (p + 1) / (p + 2), dskl: 2 * p / (p + 2), entries: p * (p + 1) / 2 },
  3: { kg: 2 * (p - 2), dfg: p - 1, ks: 2, ksInG: 2, dfs: p * (p - 3) / 2, kr: 2, dfr: p * (p - 1) / 2,
    vg: (p - 1) / (2 * p * (p - 2)), vsij: (p - 3) / (2 * (p - 1)), vr: 0.5,
    dgg: 1 / (p - 2), dsik: (p - 3) / (p - 2), dskl: (p - 4) / (p - 2), drr: 1, entries: p * (p - 1) },
  4: { kg: p - 2, dfg: p - 1, ks: 1, ksInG: 1, dfs: p * (p - 3) / 2,
    vg: (p - 1) / (p * (p - 2)), vsij: (p - 3) / (p - 1),
    dgg: 2 / (p - 2), dsik: 2 * (p - 3) / (p - 2), dskl: 2 * (p - 4) / (p - 2), entries: p * (p - 1) / 2 },
});

/* o: p, method, r, L, sigma2e, alpha, power (target, for detectable differences),
      sdG, sdS, sdR (fixed effects, same scale as the trait), s2g, s2s, s2r (random components),
      F (parental inbreeding), extraEntries (checks or other entries in the same trial) */
Precision.griffing = o => {
  const p = o.p, T = Precision.griffingTable(p)[o.method];
  const t = T.entries + (o.extraEntries || 0);
  const dfe = o.L * (o.r - 1) * (t - 1);
  const s2 = o.sigma2e / (o.r * o.L);
  const alpha = o.alpha || 0.05, tq = S.qt(1 - alpha / 2, dfe), tb = S.qt(o.power || 0.8, dfe);
  const se = v => v == null || !(v >= 0) ? NaN : Math.sqrt(v * s2);
  const effects = [
    { key: 'g', es: 'ĝᵢ', en: 'ĝᵢ', se: se(T.vg) },
    T.vsii != null ? { key: 'sii', es: 'ŝᵢᵢ', en: 'ŝᵢᵢ', se: se(T.vsii) } : null,
    { key: 'sij', es: 'ŝᵢⱼ', en: 'ŝᵢⱼ', se: se(T.vsij) },
    T.vr != null ? { key: 'r', es: 'r̂ᵢⱼ', en: 'r̂ᵢⱼ', se: se(T.vr) } : null,
  ].filter(Boolean);
  const diffs = [
    { key: 'gg', es: 'ĝᵢ − ĝⱼ', en: 'ĝᵢ − ĝⱼ', v: T.dgg },
    { key: 'sik', es: 'ŝᵢⱼ − ŝᵢₖ', en: 'ŝᵢⱼ − ŝᵢₖ', v: T.dsik },
    p >= 4 ? { key: 'skl', es: 'ŝᵢⱼ − ŝₖₗ', en: 'ŝᵢⱼ − ŝₖₗ', v: T.dskl } : null,
    T.drr != null ? { key: 'rr', es: 'r̂ᵢⱼ − r̂ₖₗ', en: 'r̂ᵢⱼ − r̂ₖₗ', v: T.drr } : null,
  ].filter(Boolean).map(d => Object.assign(d, { se: se(d.v), lsd: tq * se(d.v), detectable: (tq + tb) * se(d.v) }));

  /* fixed model: non-central F against the pooled error */
  const fixed = [];
  if (o.sdG > 0) fixed.push({ key: 'gca', es: 'ACG', en: 'GCA', df1: T.dfg, df2: dfe, ncp: T.dfg * T.kg * o.sdG * o.sdG / s2 });
  if (o.sdS > 0 && T.dfs > 0) fixed.push({ key: 'sca', es: 'ACE', en: 'SCA', df1: T.dfs, df2: dfe, ncp: T.dfs * T.ks * o.sdS * o.sdS / s2 });
  if (o.sdR > 0 && T.dfr) fixed.push({ key: 'rec', es: 'Recíprocos', en: 'Reciprocal', df1: T.dfr, df2: dfe, ncp: T.dfr * T.kr * o.sdR * o.sdR / s2 });
  fixed.forEach(x => { x.power = S.powerF(x.ncp, x.df1, x.df2, alpha); });

  /* random model */
  const EMe = s2, EMs = s2 + T.ks * (o.s2s || 0), EMg = s2 + T.ksInG * (o.s2s || 0) + T.kg * (o.s2g || 0);
  const random = [];
  if (o.s2g > 0 && T.dfs > 0) {
    const R = EMg / EMs, fc = S.qf(1 - alpha, T.dfg, T.dfs);
    random.push({ key: 'gca', es: 'σ²ACG > 0', en: 'σ²GCA > 0', df1: T.dfg, df2: T.dfs, ratio: R, power: 1 - S.pf(fc / R, T.dfg, T.dfs) });
  }
  if (o.s2s > 0) {
    const R = EMs / EMe, fc = S.qf(1 - alpha, T.dfs, dfe);
    random.push({ key: 'sca', es: 'σ²ACE > 0', en: 'σ²SCA > 0', df1: T.dfs, df2: dfe, ratio: R, power: 1 - S.pf(fc / R, T.dfs, dfe) });
  }
  if (o.s2r > 0 && T.dfr) {
    const EMr = s2 + T.kr * o.s2r, R = EMr / EMe, fc = S.qf(1 - alpha, T.dfr, dfe);
    random.push({ key: 'rec', es: 'σ²R > 0', en: 'σ²R > 0', df1: T.dfr, df2: dfe, ratio: R, power: 1 - S.pf(fc / R, T.dfr, dfe) });
  }
  /* sampling precision of the variance components and of σ²A, σ²D */
  const vComp = terms => 2 * terms.reduce((s, [c, EM, df]) => s + c * c * EM * EM / df, 0);
  let seS2g = NaN, seS2s = NaN;
  if (T.dfs > 0) {
    if (o.method === 1) {
      const d = p * p - p + 1;
      seS2g = Math.sqrt(vComp([[1 / (2 * p), EMg, T.dfg], [-p * (p - 1) / (d * 2 * p), EMs, T.dfs], [-1 / (d * 2 * p), EMe, dfe]]));
      seS2s = Math.sqrt(vComp([[p * p / (2 * d), EMs, T.dfs], [-p * p / (2 * d), EMe, dfe]]));
    } else {
      seS2g = Math.sqrt(vComp([[1 / T.kg, EMg, T.dfg], [-1 / T.kg, EMs, T.dfs]]));
      seS2s = Math.sqrt(vComp([[1 / T.ks, EMs, T.dfs], [-1 / T.ks, EMe, dfe]]));
    }
  }
  const F = o.F == null ? 1 : o.F;
  const components = {
    s2g: o.s2g, seS2g, s2s: o.s2s, seS2s,
    s2A: 4 * (o.s2g || 0) / (1 + F), seS2A: 4 * seS2g / (1 + F),
    s2D: 4 * (o.s2s || 0) / Math.pow(1 + F, 2), seS2D: 4 * seS2s / Math.pow(1 + F, 2),
  };
  return { T, t, dfe, s2, effects, diffs, fixed, random, components, EM: { g: EMg, s: EMs, e: EMe } };
};

/* power curve against the number of parents or of replicates */
Precision.griffingCurve = (o, vary, from, to) => {
  const pts = [];
  for (let x = from; x <= to; x++) {
    const q = Object.assign({}, o, { [vary]: x });
    if (vary === 'p' && ((q.method >= 3 && x < 5) || x < 3)) continue;
    const res = Precision.griffing(q);
    const pick = (list, key) => { const it = list.find(z => z.key === key); return it ? it.power : NaN; };
    pts.push({ x, fixedG: pick(res.fixed, 'gca'), fixedS: pick(res.fixed, 'sca'), randomG: pick(res.random, 'gca'), randomS: pick(res.random, 'sca'), seDiffG: res.diffs[0].se });
  }
  return pts;
};

/* ---------------- line × tester ---------------- */
/* o: l, t, r, L, sigma2e, alpha, sdGl, sdGt, sdS, s2gl, s2gt, s2s, includeParents, extraEntries */
Precision.lxt = o => {
  const { l, t } = o, rL = o.r * o.L, alpha = o.alpha || 0.05;
  const entries = l * t + (o.includeParents ? l + t : 0) + (o.extraEntries || 0);
  const dfe = o.L * (o.r - 1) * (entries - 1);
  const s2e = o.sigma2e;
  const tq = S.qt(1 - alpha / 2, dfe), tb = S.qt(o.power || 0.8, dfe);
  const row = (key, es, en, exact, conventional) => ({ key, es, en, se: Math.sqrt(exact * s2e), seConventional: Math.sqrt(conventional * s2e), lsd: tq * Math.sqrt(exact * s2e), detectable: (tq + tb) * Math.sqrt(exact * s2e) });
  const effects = [
    row('gl', 'ĝ línea', 'ĝ line', (l - 1) / (rL * l * t), 1 / (rL * t)),
    row('gt', 'ĝ probador', 'ĝ tester', (t - 1) / (rL * l * t), 1 / (rL * l)),
    row('s', 'ŝᵢⱼ', 'ŝᵢⱼ', (l - 1) * (t - 1) / (rL * l * t), 1 / rL),
    row('dl', 'ĝ línea − ĝ línea', 'ĝ line − ĝ line', 2 / (rL * t), 2 / (rL * t)),
    row('dt', 'ĝ probador − ĝ probador', 'ĝ tester − ĝ tester', 2 / (rL * l), 2 / (rL * l)),
    row('ds', 'ŝᵢⱼ − ŝₖⱼ (mismo probador)', 'ŝᵢⱼ − ŝₖⱼ (same tester)', 2 * (t - 1) / (rL * t), 2 / rL),
  ];
  const fixed = [];
  if (o.sdGl > 0) fixed.push({ key: 'lines', es: 'Líneas', en: 'Lines', df1: l - 1, df2: dfe, ncp: rL * t * (l - 1) * o.sdGl * o.sdGl / s2e });
  if (o.sdGt > 0 && t > 1) fixed.push({ key: 'testers', es: 'Probadores', en: 'Testers', df1: t - 1, df2: dfe, ncp: rL * l * (t - 1) * o.sdGt * o.sdGt / s2e });
  if (o.sdS > 0 && t > 1) fixed.push({ key: 'lxt', es: 'Líneas × probadores', en: 'Lines × testers', df1: (l - 1) * (t - 1), df2: dfe, ncp: rL * (l - 1) * (t - 1) * o.sdS * o.sdS / s2e });
  fixed.forEach(x => { x.power = S.powerF(x.ncp, x.df1, x.df2, alpha); });
  const random = [];
  const EMlt = s2e + rL * (o.s2s || 0);
  if (o.s2gl > 0 && t > 1) { const R = (EMlt + rL * t * o.s2gl) / EMlt, fc = S.qf(1 - alpha, l - 1, (l - 1) * (t - 1)); random.push({ key: 'lines', es: 'σ²ACG líneas > 0', en: 'σ²GCA lines > 0', df1: l - 1, df2: (l - 1) * (t - 1), ratio: R, power: 1 - S.pf(fc / R, l - 1, (l - 1) * (t - 1)) }); }
  if (o.s2gt > 0 && t > 1) { const R = (EMlt + rL * l * o.s2gt) / EMlt, fc = S.qf(1 - alpha, t - 1, (l - 1) * (t - 1)); random.push({ key: 'testers', es: 'σ²ACG probadores > 0', en: 'σ²GCA testers > 0', df1: t - 1, df2: (l - 1) * (t - 1), ratio: R, power: 1 - S.pf(fc / R, t - 1, (l - 1) * (t - 1)) }); }
  if (o.s2s > 0 && t > 1) { const R = EMlt / s2e, fc = S.qf(1 - alpha, (l - 1) * (t - 1), dfe); random.push({ key: 'lxt', es: 'σ²ACE > 0', en: 'σ²SCA > 0', df1: (l - 1) * (t - 1), df2: dfe, ratio: R, power: 1 - S.pf(fc / R, (l - 1) * (t - 1), dfe) }); }
  return { entries, dfe, effects, fixed, random };
};

/* ---------------- North Carolina designs (random model, one location) ---------------- */
/* o: design ('nc1'|'nc2'|'nc3'), m, f, n, sets, r, sigma2e, s2A, s2D, F, alpha */
Precision.nc = o => {
  const F = o.F == null ? 0 : o.F, alpha = o.alpha || 0.05, r = o.r, s2 = o.sigma2e, sets = o.sets || 1;
  const covHS = 0.25 * (1 + F) * o.s2A;
  const tests = [], comps = [];
  const test = (key, es, en, EMnum, EMden, df1, df2) => {
    const R = EMnum / EMden, fc = S.qf(1 - alpha, df1, df2);
    tests.push({ key, es, en, df1, df2, ratio: R, power: 1 - S.pf(fc / R, df1, df2) });
  };
  const vComp = terms => Math.sqrt(2 * terms.reduce((s, [c, EM, df]) => s + c * c * EM * EM / df, 0));
  if (o.design === 'nc1') {
    const { m, f } = o;
    const s2m = covHS, s2fm = covHS + 0.25 * Math.pow(1 + F, 2) * o.s2D;
    const dfm = sets * (m - 1), dffm = sets * m * (f - 1), dfe = sets * (r - 1) * (m * f - 1);
    const EMm = s2 + r * s2fm + r * f * s2m, EMfm = s2 + r * s2fm;
    test('males', 'Machos (σ²A)', 'Males (σ²A)', EMm, EMfm, dfm, dffm);
    test('females', 'Hembras/machos (σ²A + σ²D)', 'Females/males (σ²A + σ²D)', EMfm, s2, dffm, dfe);
    const seS2m = vComp([[1 / (r * f), EMm, dfm], [-1 / (r * f), EMfm, dffm]]);
    const seS2fm = vComp([[1 / r, EMfm, dffm], [-1 / r, s2, dfe]]);
    const k = 4 / (1 + F);
    comps.push({ key: 's2A', es: 'σ²A = 4σ²m/(1+F)', en: 'σ²A = 4σ²m/(1+F)', value: o.s2A, se: k * seS2m });
    comps.push({ key: 's2D', es: 'σ²D = 4(σ²f/m − σ²m)/(1+F)²', en: 'σ²D = 4(σ²f/m − σ²m)/(1+F)²', value: o.s2D, se: 4 / Math.pow(1 + F, 2) * vComp([[1 / r + 1 / (r * f), EMfm, dffm], [-1 / r, s2, dfe], [-1 / (r * f), EMm, dfm]]) });
    return { tests, comps, dfe, families: sets * m * f };
  }
  if (o.design === 'nc2') {
    const { m, f } = o;
    const s2m = covHS, s2mf = 0.25 * Math.pow(1 + F, 2) * o.s2D;
    const dfm = sets * (m - 1), dff = sets * (f - 1), dfmf = sets * (m - 1) * (f - 1), dfe = sets * (r - 1) * (m * f - 1);
    const EMmf = s2 + r * s2mf, EMm = EMmf + r * f * s2m, EMf = EMmf + r * m * s2m;
    test('males', 'Machos (σ²A)', 'Males (σ²A)', EMm, EMmf, dfm, dfmf);
    test('females', 'Hembras (σ²A)', 'Females (σ²A)', EMf, EMmf, dff, dfmf);
    test('mf', 'Machos × hembras (σ²D)', 'Males × females (σ²D)', EMmf, s2, dfmf, dfe);
    /* pooled σ̂²A from males and females, σ̂²D from the interaction */
    const seM = vComp([[1 / (r * f), EMm, dfm], [-1 / (r * f), EMmf, dfmf]]);
    const seF = vComp([[1 / (r * m), EMf, dff], [-1 / (r * m), EMmf, dfmf]]);
    const seMF = vComp([[1 / r, EMmf, dfmf], [-1 / r, s2, dfe]]);
    /* σ̂²m + σ̂²f share the M × F mean square, so their sampling covariance is kept */
    const seMplusF = vComp([[1 / (r * f), EMm, dfm], [1 / (r * m), EMf, dff], [-(1 / (r * f) + 1 / (r * m)), EMmf, dfmf]]);
    void seM; void seF;
    comps.push({ key: 's2A', es: 'σ²A = 2(σ²m + σ²f)/(1+F)', en: 'σ²A = 2(σ²m + σ²f)/(1+F)', value: o.s2A, se: 2 / (1 + F) * seMplusF });
    comps.push({ key: 's2D', es: 'σ²D = 4σ²mf/(1+F)²', en: 'σ²D = 4σ²mf/(1+F)²', value: o.s2D, se: 4 / Math.pow(1 + F, 2) * seMF });
    return { tests, comps, dfe, families: sets * m * f };
  }
  /* NC III on an F2 (Comstock & Robinson parametrisation): σ²m = ¼σ²A, σ²ml = σ²D */
  const n = o.n, dfm = n - 1, dfe = (r - 1) * (2 * n - 1);
  const EMm = s2 + 2 * r * 0.25 * o.s2A, EMml = s2 + r * o.s2D;
  test('males', 'Plantas F₂ (σ²A)', 'F₂ plants (σ²A)', EMm, s2, dfm, dfe);
  test('ml', 'F₂ × probadores (σ²D)', 'F₂ × testers (σ²D)', EMml, s2, dfm, dfe);
  const seM = vComp([[1 / (2 * r), EMm, dfm], [-1 / (2 * r), s2, dfe]]);
  const seML = vComp([[1 / r, EMml, dfm], [-1 / r, s2, dfe]]);
  comps.push({ key: 's2A', es: 'σ²A = 4σ²m', en: 'σ²A = 4σ²m', value: o.s2A, se: 4 * seM });
  comps.push({ key: 's2D', es: 'σ²D = σ²ml', en: 'σ²D = σ²ml', value: o.s2D, se: seML });
  return { tests, comps, dfe, families: 2 * n };
};

/* ---------------- generation means: plants per generation ----------------
   Expected variances with no epistasis, no linkage and F = 0 (report 02 §7.1):
   V(P1) = V(P2) = V(F1) = E; V(F2) = ½D + ¼H + E; V(B1) ≈ V(B2) = ¼D + ¼H + E.
   Allocating plants in proportion to these variances equalises the standard
   errors of the generation means (Kearsey 1980), with a floor for the
   non-segregating generations. */
Precision.generationAllocation = o => {
  const E = 1, H2 = Math.min(0.95, Math.max(0.01, o.h2F2)), a2 = o.dominanceRatio * o.dominanceRatio;
  const G = H2 / (1 - H2);                     // ½D + ¼H on the scale E = 1
  const D = G / (0.5 + 0.25 * a2), H = a2 * D;
  const V = { P1: E, P2: E, F1: E, RF1: E, F2: 0.5 * D + 0.25 * H + E, BC1: 0.25 * D + 0.25 * H + E, BC2: 0.25 * D + 0.25 * H + E,
    F3: 0.75 * D + 0.1875 * H + E, BC1S: 0.5 * D + 0.25 * H + E, BC2S: 0.5 * D + 0.25 * H + E };
  /* F3 = between (½D + H/16) plus mean within (¼D + H/8) F3-family variance; for the selfed
     backcrosses the F2 variance is used as a conservative stand-in */
  const gens = o.gens.filter(g => V[g] != null);
  const sumV = gens.reduce((s, g) => s + V[g], 0);
  const out = {};
  gens.forEach(g => { out[g] = Math.max(o.minPlants || 20, Math.round(o.total * V[g] / sumV)); });
  return { plants: out, variances: V, D, H };
};

window.Precision = Precision;

/* ---------------- circulant partial diallel (Kempthorne & Curnow 1961) ----------------
   E(M_GCA) = σ² + σ²s + [s(p − 2)/(p − 1)]σ²g, E(M_SCA) = σ² + σ²s (report 01 §7.1);
   Var(ĝᵢ − ĝⱼ) = (cᵢᵢ + cⱼⱼ − 2cᵢⱼ)σ², C = (A + J)⁻¹ − J/p², depends on the circulant distance. */
Precision.partial = o => {
  const { p, s } = o, N = p * s / 2, alpha = o.alpha || 0.05;
  const t = N + (o.includeParents ? p : 0) + (o.extraEntries || 0);
  const dfe = o.L * (o.r - 1) * (t - 1), s2 = o.sigma2e / (o.r * o.L);
  const k = s * (p - 2) / (p - 1), dfg = p - 1, dfs = N - p;
  /* A = Z'Z of the GCA incidence of the crosses */
  const kk = (p + 1 - s) / 2;
  const A = Array.from({ length: p }, () => new Array(p).fill(1));      // + J
  /* every pair is generated from both of its ends, so only [i][j] is incremented */
  for (let i = 0; i < p; i++) { A[i][i] += s; for (let q = 0; q < s; q++) { const j = (i + kk + q) % p; A[i][j] += 1; } }
  const Ainv = S.inverse(A);
  const dist = [];
  if (Ainv) for (let j = 1; j <= Math.floor(p / 2); j++) {
    const v = Ainv[0][0] + Ainv[j][j] - 2 * Ainv[0][j];
    dist.push({ distance: j, se: Math.sqrt(v * s2) });
  }
  const tq = S.qt(1 - alpha / 2, dfe);
  const fixed = o.sdG > 0 ? [{ key: 'gca', es: 'ACG', en: 'GCA', df1: dfg, df2: dfe, ncp: dfg * k * o.sdG * o.sdG / s2 }] : [];
  if (o.sdS > 0 && dfs > 0) fixed.push({ key: 'sca', es: 'ACE', en: 'SCA', df1: dfs, df2: dfe, ncp: dfs * o.sdS * o.sdS / s2 });
  fixed.forEach(x => { x.power = S.powerF(x.ncp, x.df1, x.df2, alpha); });
  const EMs = s2 + (o.s2s || 0), EMg = EMs + k * (o.s2g || 0);
  const random = [];
  if (o.s2g > 0 && dfs > 0) { const R = EMg / EMs, fc = S.qf(1 - alpha, dfg, dfs); random.push({ key: 'gca', es: 'σ²ACG > 0', en: 'σ²GCA > 0', df1: dfg, df2: dfs, ratio: R, power: 1 - S.pf(fc / R, dfg, dfs) }); }
  if (o.s2s > 0 && dfs > 0) { const R = EMs / s2, fc = S.qf(1 - alpha, dfs, dfe); random.push({ key: 'sca', es: 'σ²ACE > 0', en: 'σ²SCA > 0', df1: dfs, df2: dfe, ratio: R, power: 1 - S.pf(fc / R, dfs, dfe) }); }
  return { N, t, dfe, s2, k, distances: dist.map(d => Object.assign(d, { lsd: tq * d.se })), fixed, random };
};
