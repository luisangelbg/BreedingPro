/* BreedingPro — Block 10 engine: animal and sire models.
   y = Xb + Z_a a + Σ Z_k u_k + e with Var(a) = Aσ²a (animal model) or Var(s) = A_sσ²s, σ²s = ¼σ²a
   (sire model, s = transmitting ability), optional permanent-environment effects for repeated
   records, an optional maternal genetic effect Var(m) = Aσ²m (taken as uncorrelated with the
   direct effect), and further random factors with K = I. Henderson's mixed-model equations are
   solved with the variances given or estimated by REML (average information, LM.reml); every
   individual of the pedigree gets a breeding value, with its prediction-error variance,
   reliability r² = 1 − PEV/[(1 + Fᵢ)σ²a] and accuracy r. */

const AM = {};

/* records: [{ animal, y, fixed: {}, covs: {}, random: {} }], ped from PED.build */
AM.prepare = (records, ped, o) => {
  o = o || {};
  const issues = [];
  const recs = records.filter(r => isFinite(r.y) && r.animal != null && ped.index.has(String(r.animal)));
  const lost = records.length - recs.length;
  if (lost) issues.push({ level: 'warning', es: `${plural(lost, 'registro sin valor de la variable o sin individuo en el pedigrí se omite', 'registros sin valor de la variable o sin individuo en el pedigrí se omiten')}.`, en: `${plural(lost, 'record without a value of the trait or without an individual in the pedigree is left out', 'records without a value of the trait or without an individual in the pedigree are left out')}.` });
  const n = recs.length;
  const y = Float64Array.from(recs, r => r.y);
  const fixedNames = o.fixed || [], covNames = o.covs || [], randNames = o.random || [];
  const icpt = { kind: 'intercept', name: '(intercept)' };
  const fixed = [icpt];
  fixedNames.forEach(nm => fixed.push({ kind: 'main', f: LM.factor(recs.map(r => r.fixed[nm])), name: nm }));
  covNames.forEach(nm => fixed.push({ kind: 'covariate', x: Float64Array.from(recs, r => +r.covs[nm]), name: nm }));
  const random = [];
  const animals = recs.map(r => String(r.animal));
  const model = o.model || 'animal';
  if (model === 'sire') {
    const sireOf = a => { const k = ped.index.get(a); return ped.sire[k] >= 0 ? ped.ids[ped.sire[k]] : null; };
    const sires = [...new Set(animals.map(sireOf).filter(Boolean))];
    const noSire = animals.filter(a => !sireOf(a)).length;
    if (noSire) issues.push({ level: 'warning', es: `${plural(noSire, 'registro de un individuo sin padre conocido no aporta', 'registros de individuos sin padre conocido no aportan')} al efecto de padre.`, en: `${plural(noSire, 'record of an individual without a known sire does', 'records of individuals without a known sire do')} not contribute to the sire effect.` });
    const sped = PED.prune(ped, sires);
    random.push({ key: 'sire', name: 'sire', f: LM.factor(animals.map(sireOf), sped.ids), Kinv: PED.AinvDense(sped), logdetK: sped.logdetA, ped: sped });
  } else {
    random.push({ key: 'animal', name: 'animal', f: LM.factor(animals, ped.ids), Kinv: null, logdetK: ped.logdetA, ped });
  }
  if (o.pe) {
    const counts = new Map(); animals.forEach(a => counts.set(a, (counts.get(a) || 0) + 1));
    if ([...counts.values()].some(c => c > 1)) random.push({ key: 'pe', name: 'pe', f: LM.factor(animals) });
    else issues.push({ level: 'info', es: 'Ningún individuo tiene más de un registro: el efecto de ambiente permanente no es estimable y se omite.', en: 'No individual has more than one record: the permanent-environment effect is not estimable and is left out.' });
  }
  if (o.maternal) {
    const damOf = a => { const k = ped.index.get(a); return ped.dam[k] >= 0 ? ped.ids[ped.dam[k]] : null; };
    random.push({ key: 'maternal', name: 'maternal', f: LM.factor(animals.map(damOf), ped.ids), Kinv: null, logdetK: ped.logdetA, ped });
  }
  randNames.forEach(nm => random.push({ key: 'r:' + nm, name: nm, f: LM.factor(recs.map(r => r.random[nm])) }));
  /* the animal and maternal terms share A⁻¹ over the whole pedigree */
  const needA = random.some(r => r.key === 'animal' || r.key === 'maternal');
  const Ainv = needA ? PED.AinvDense(ped) : null;
  random.forEach(r => { if (r.key === 'animal' || r.key === 'maternal') r.Kinv = Ainv; });
  const d = fixed.length + random.reduce((s, r) => s + r.f.levels.length, 0);
  return { recs, n, y, fixed, random, ped, model, issues, size: d, fixedNames, covNames };
};

/* fit with REML or with given variances (theta in the order of prep.random, then σ²e) */
AM.fit = (prep, o) => {
  o = o || {};
  const t0 = Date.now();
  const res = LM.reml(prep.fixed, prep.random, prep.y, o.theta ? { fixedTheta: o.theta } : { maxIter: o.maxIter || 100 });
  if (res.error) return { error: res.error };
  res.time = Date.now() - t0;
  const R = prep.random.length;
  const th = res.theta, cov = res.thetaCov;
  const comp = prep.random.map((r, k) => ({ key: r.key, name: r.name, sigma2: res.components[k].boundary && !o.theta ? 0 : th[k], se: cov && isFinite(cov[k][k]) ? Math.sqrt(Math.max(0, cov[k][k])) : NaN, boundary: res.components[k].boundary && !o.theta }));
  comp.push({ key: 'e', name: 'residual', sigma2: th[R], se: cov && isFinite(cov[R][R]) ? Math.sqrt(Math.max(0, cov[R][R])) : NaN });
  /* ratios with delta-method standard errors: σ²_k / Σσ² over all components */
  const total = th.reduce((s, v) => s + v, 0);
  const ratio = (num, scale) => {
    const v = scale * num.reduce((s, k) => s + th[k], 0) / total;
    let se = NaN;
    if (cov && !o.theta) {
      const g = th.map((_, j) => scale * ((num.includes(j) ? 1 : 0) / total - num.reduce((s, k) => s + th[k], 0) / (total * total)));
      let s = 0; let ok = true;
      for (let i = 0; i <= R; i++) for (let j = 0; j <= R; j++) { const c = cov[i][j]; if (g[i] && g[j]) { if (!isFinite(c)) ok = false; else s += g[i] * c * g[j]; } }
      se = ok ? Math.sqrt(Math.max(0, s)) : NaN;
    }
    return { v, se };
  };
  const iA = prep.random.findIndex(r => r.key === 'animal'), iS = prep.random.findIndex(r => r.key === 'sire');
  const iPE = prep.random.findIndex(r => r.key === 'pe'), iM = prep.random.findIndex(r => r.key === 'maternal');
  const out = { res, comp, total, n: prep.n, model: prep.model, given: !!o.theta, time: res.time };
  /* in the sire model σ²P = σ²s + σ²e (+ others) and h² = 4σ²s/σ²P */
  if (iA >= 0) out.h2 = ratio([iA], 1);
  if (iS >= 0) out.h2 = ratio([iS], 4);
  if (iPE >= 0 && iA >= 0) out.rep = ratio([iA, iPE], 1);
  if (iM >= 0) { out.m2 = ratio([iM], 1); if (iA >= 0) { const a = th[iA], m = th[iM]; out.h2T = { v: (a + 0.5 * m) / total, se: NaN }; } }
  prep.random.forEach((r, k) => { if (r.key.startsWith('r:')) (out.ratios || (out.ratios = [])).push(Object.assign({ name: r.name }, ratio([k], 1))); });
  /* breeding values */
  const gTerm = iA >= 0 ? iA : iS;
  const gPed = prep.random[gTerm].ped;
  const sg = th[gTerm];
  const nRec = new Map(); const sumRec = new Map();
  /* records of the individual itself, or in the sire model those of its progeny */
  const recKey = a => { if (iS < 0) return a; const k = prep.ped.index.get(a); return prep.ped.sire[k] >= 0 ? prep.ped.ids[prep.ped.sire[k]] : null; };
  prep.recs.forEach(r => { const a = recKey(String(r.animal)); if (a == null) return; nRec.set(a, (nRec.get(a) || 0) + 1); sumRec.set(a, (sumRec.get(a) || 0) + r.y); });
  const scale = iS >= 0 ? 2 : 1;                 /* breeding value = 2 × transmitting ability */
  out.ebv = res.blups[gTerm].map((b, l) => {
    const k = gPed.index.get(b.level);
    const F = gPed.F[k];
    const r2 = 1 - b.pev / ((1 + F) * sg);
    return {
      id: b.level, sire: gPed.sire[k] >= 0 ? gPed.ids[gPed.sire[k]] : '', dam: gPed.dam[k] >= 0 ? gPed.ids[gPed.dam[k]] : '',
      F, gen: gPed.generation[k], year: gPed.year ? gPed.year[k] : null, nrec: nRec.get(b.level) || 0, own: nRec.get(b.level) ? sumRec.get(b.level) / nRec.get(b.level) : NaN,
      u: b.u, ebv: scale * b.u, pev: b.pev, sep: Math.sqrt(Math.max(0, b.pev)) * scale, rel: Math.max(0, Math.min(1, r2)), acc: Math.sqrt(Math.max(0, Math.min(1, r2))),
    };
  });
  if (iPE >= 0) out.pe = res.blups[iPE].map(b => ({ id: b.level, u: b.u, pev: b.pev }));
  if (iM >= 0) out.mat = res.blups[iM].map(b => ({ id: b.level, u: b.u, pev: b.pev, rel: Math.max(0, 1 - b.pev / ((1 + prep.ped.F[prep.ped.index.get(b.level)]) * th[iM])) }));
  out.others = prep.random.map((r, k) => (r.key.startsWith('r:') ? { name: r.name, levels: res.blups[k] } : null)).filter(Boolean);
  /* fixed effects: least-squares means of every factor */
  out.lsm = prep.fixedNames.map((nm, j) => ({ name: nm, means: LM.lsmeans(res.fit, j + 1, { V: res.V, vScale: res.vScale }) }));
  out.b = res.fit.b; out.names = res.fit.D.names;
  /* genetic trend: mean breeding value by generation (and by year when given) */
  const groupMean = key => {
    const m = new Map();
    out.ebv.forEach(e => { const g = e[key]; if (g == null || g === '') return; if (!m.has(g)) m.set(g, []); m.get(g).push(e.ebv); });
    return [...m.entries()].map(([g, v]) => ({ g, n: v.length, mean: v.reduce((s, x) => s + x, 0) / v.length })).sort((a, b) => LM.natCmp(a.g, b.g));
  };
  out.trendGen = groupMean('gen');
  if (out.ebv.some(e => e.year != null && e.year !== '')) out.trendYear = groupMean('year');
  return out;
};

/* likelihood-ratio test of every random term except the genetic one: REML without it */
AM.lrt = (prep, fit) => {
  const out = [];
  prep.random.forEach((r, k) => {
    if (k === 0) return;
    const reduced = prep.random.filter((_, j) => j !== k);
    const res = LM.reml(prep.fixed, reduced, prep.y, { maxIter: 100 });
    if (res.error) return;
    const lr = Math.max(0, 2 * (fit.res.logLikREML - res.logLikREML));
    out.push({ name: r.name, key: r.key, lr, p: 0.5 * (1 - S.pchisq(lr, 1)) });
  });
  /* and the genetic term itself (with no random term left, the model of fixed effects) */
  const res0 = LM.reml(prep.fixed, prep.random.slice(1), prep.y, { maxIter: 100 });
  if (!res0.error) { const lr = Math.max(0, 2 * (fit.res.logLikREML - res0.logLikREML)); out.unshift({ name: prep.random[0].name, key: prep.random[0].key, lr, p: 0.5 * (1 - S.pchisq(lr, 1)) }); }
  return out;
};

/* ---------------- genotypes of a field trial ----------------
   Plot records of every environment; environments and replicates within them fixed, incomplete
   blocks random; genotypes random with K = I, with K = A from a pedigree (additive), or both
   (additive + non-additive, Oakey et al. 2006); genotype × environment random. The genotypic
   value of an entry is its additive plus non-additive BLUP; its reliability uses the PEV of that
   sum, and the generalized heritability of Cullis, Smith & Coombes (2006) the mean PEV of the
   differences between entries. */
AM.trial = (ds, field, trait, o) => {
  o = o || {};
  const issues = [];
  const plots = [];
  field.envs.forEach(E => { Trial.plots(ds, E.key, trait, { excluded: o.excluded }).plots.forEach(p => plots.push(Object.assign({ design: E.design }, p))); });
  /* a genomic (or any) relationship matrix given directly: entries without it are left out */
  if (o.K && (o.genetic === 'A' || o.genetic === 'AI')) {
    const known = new Set(o.K.ids);
    const before = plots.length;
    for (let i = plots.length - 1; i >= 0; i--) if (!known.has(String(plots[i].entry))) plots.splice(i, 1);
    if (before > plots.length) issues.push({ level: 'warning', es: `${plural(before - plots.length, 'parcela de una entrada sin marcadores se omite', 'parcelas de entradas sin marcadores se omiten')}.`, en: `${plural(before - plots.length, 'plot of an entry without markers is left out', 'plots of entries without markers are left out')}.` });
  }
  const n = plots.length;
  if (n < 5) return { error: T('Hay muy pocas parcelas con dato.', 'Too few plots have data.') };
  const y = Float64Array.from(plots, p => p.y);
  const multi = new Set(plots.map(p => p.env)).size > 1;
  const icpt = { kind: 'intercept', name: '(intercept)' };
  const envF = LM.factor(plots.map(p => p.env));
  const fixed = [icpt];
  if (multi) fixed.push({ kind: 'main', f: envF, name: 'env' });
  const hasRep = plots.every(p => p.repKey);
  if (hasRep) fixed.push({ kind: 'nested', f: LM.factor(plots.map(p => p.env + '#' + p.repKey)), g: envF, name: 'rep' });
  const random = [];
  const incomplete = plots.some(p => p.design === 'alpha' || p.design === 'ibd');
  if (incomplete) random.push({ key: 'block', name: 'block', f: LM.factor(plots.map(p => p.env + '#' + p.blockKey)) });
  const entries = plots.map(p => String(p.entry));
  const model = o.genetic || 'I';
  let ped = null;
  if ((model === 'A' || model === 'AI') && o.K) {
    const K = o.K, nK = K.ids.length;
    const F = Float64Array.from(K.ids, (_, i) => K.K[i * nK + i] - 1);
    ped = { ids: K.ids, index: new Map(K.ids.map((id, i) => [id, i])), F, sire: new Int32Array(nK).fill(-1), dam: new Int32Array(nK).fill(-1), genomic: true };
    random.push({ key: 'add', name: 'additive', f: LM.factor(entries, K.ids), Kinv: K.Kinv, logdetK: K.logdet, ped });
  } else   if ((model === 'A' || model === 'AI') && o.pedRows) {
    const known = new Set(o.pedRows.map(r => String(r.id).trim()));
    const missing = [...new Set(entries)].filter(e => !known.has(e));
    if (missing.length) issues.push({ level: 'warning', es: `${missing.length === 1 ? '1 entrada no está en el pedigrí y entra como fundador no emparentado' : missing.length + ' entradas no están en el pedigrí y entran como fundadores no emparentados'} (${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}).`, en: `${missing.length} entr${missing.length === 1 ? 'y is' : 'ies are'} not in the pedigree and enter as unrelated founders (${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}).` });
    const built = PED.build(o.pedRows.concat(missing.map(id => ({ id, sire: null, dam: null }))), { selfing: true });
    if (!built.ok) return { error: T('El pedigrí tiene errores que impiden construir A.', 'The pedigree has errors that prevent building A.'), issues: built.issues };
    ped = built.ped;
    random.push({ key: 'add', name: 'additive', f: LM.factor(entries, ped.ids), Kinv: PED.AinvDense(ped), logdetK: ped.logdetA, ped });
  }
  if (model === 'I' || model === 'AI' || !ped) random.push({ key: 'gen', name: 'genotype', f: LM.factor(entries) });
  /* G × E needs replicated genotype-environment cells; otherwise it is the residual itself */
  const cells = new Map();
  plots.forEach(p => { const k = p.entry + '|' + p.env; cells.set(k, (cells.get(k) || 0) + 1); });
  const geRep = [...cells.values()].some(c => c > 1);
  if (multi && geRep) random.push({ key: 'ge', name: 'genotype × environment', f: LM.factor(plots.map(p => p.entry + '|' + p.env)) });
  else if (multi) issues.push({ level: 'info', es: 'Sin repeticiones dentro de ambiente la interacción genotipo × ambiente no se separa del residual.', en: 'Without replicates within environment the genotype × environment interaction is not separated from the residual.' });
  const res = LM.reml(fixed, random, y, { maxIter: 150 });
  if (res.error) return { error: T('El modelo no se pudo ajustar.', 'The model could not be fitted.'), issues };
  const R = random.length, th = res.theta, cov = res.thetaCov;
  const comp = random.map((r, k) => ({ key: r.key, name: r.name, sigma2: th[k], se: cov && isFinite(cov[k][k]) ? Math.sqrt(Math.max(0, cov[k][k])) : NaN, boundary: res.components[k].boundary }));
  comp.push({ key: 'e', name: 'residual', sigma2: th[R], se: cov && isFinite(cov[R][R]) ? Math.sqrt(Math.max(0, cov[R][R])) : NaN });
  const iA = random.findIndex(r => r.key === 'add'), iG = random.findIndex(r => r.key === 'gen');
  /* genotypic value of every entry: its levels in the additive and non-additive terms */
  const ents = [...new Set(entries)].sort(LM.natCmp);
  const pos = ents.map(e => {
    const js = [];
    if (iA >= 0) js.push(res.offs[iA] + random[iA].f.map.get(e));
    if (iG >= 0) js.push(res.offs[iG] + random[iG].f.map.get(e));
    return js;
  });
  const s2e = th[R];
  const Cij = (a, b) => res.Cinv[a * res.d + b] * s2e;
  const nE = ents.length;
  const P = Array.from({ length: nE }, (_, i) => Array.from({ length: nE }, (_, j) => pos[i].reduce((s, a) => s + pos[j].reduce((t, b) => t + Cij(a, b), 0), 0)));
  /* the fixed part averaged over the plots */
  const fixedMean = (() => { let s = 0; for (let i = 0; i < n; i++) { let v = 0; for (let k = 0; k < res.fit.D.K; k++) { const c = res.fit.D.cols[i * res.fit.D.K + k]; if (c >= 0) v += res.fit.D.vals[i * res.fit.D.K + k] * res.fit.b[c]; } s += v; } return s / n; })();
  const raw = new Map();
  plots.forEach(p => { const e = String(p.entry); if (!raw.has(e)) raw.set(e, []); raw.get(e).push(p.y); });
  const rows = ents.map((e, i) => {
    const a = iA >= 0 ? res.blups[iA][random[iA].f.map.get(e)].u : 0;
    const g = iG >= 0 ? res.blups[iG][random[iG].f.map.get(e)].u : 0;
    const F = ped ? ped.F[ped.index.get(e)] : 0;
    const varG = (iA >= 0 ? (1 + F) * th[iA] : 0) + (iG >= 0 ? th[iG] : 0);
    const pev = P[i][i];
    const k = ped ? ped.index.get(e) : -1;
    return {
      entry: e, sire: ped && ped.sire[k] >= 0 ? ped.ids[ped.sire[k]] : '', dam: ped && ped.dam[k] >= 0 ? ped.ids[ped.dam[k]] : '', F,
      n: raw.get(e).length, raw: raw.get(e).reduce((s, v) => s + v, 0) / raw.get(e).length,
      a, i: g, g: a + g, pred: fixedMean + a + g, sep: Math.sqrt(Math.max(0, pev)), rel: varG > 0 ? Math.max(0, Math.min(1, 1 - pev / varG)) : NaN,
    };
  });
  /* Cullis et al. (2006): 1 − v̄/(2σ²G), v̄ the mean PEV of a difference */
  let tr = 0, tot = 0;
  for (let i = 0; i < nE; i++) { tr += P[i][i]; for (let j = 0; j < nE; j++) tot += P[i][j]; }
  const vbar = 2 / (nE - 1) * (tr - tot / nE);
  const Fbar = ped ? ents.reduce((s, e) => s + ped.F[ped.index.get(e)], 0) / nE : 0;
  const sigmaG = (iA >= 0 ? (1 + Fbar) * th[iA] : 0) + (iG >= 0 ? th[iG] : 0);
  const out = { comp, rows, fixedMean, H2cullis: 1 - vbar / (2 * sigmaG), vbar, sigmaG, Fbar, multi, n, nEntries: nE, model: ped ? model : 'I', res, issues, ped, logLik: res.logLikREML };
  /* is the pedigree worth it? the same fixed effects with genotypes independent */
  if (iA >= 0) {
    const alt = LM.reml(fixed, random.filter(r => r.key !== 'add').concat(iG >= 0 ? [] : [{ key: 'gen', name: 'genotype', f: LM.factor(entries) }]), y, { maxIter: 150 });
    if (!alt.error) { out.altLogLik = alt.logLikREML; out.altParams = random.length - (iG >= 0 ? 1 : 0); }
  }
  return out;
};

window.AM = AM;
