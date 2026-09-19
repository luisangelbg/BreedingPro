/* BreedingPro — Block 10 engine: pedigrees.
   Cleaning and ordering (parents before offspring, founders added, loops and conflicts
   reported), generation numbers, inbreeding coefficients by the path vectors of Meuwissen
   & Luo (1992), the numerator relationship matrix A by the tabular method (Henderson 1976)
   and its inverse by the rules of Henderson (1976) and Quaas (1976), log|A| = Σ log bᵢ.
   For plants a sire may equal the dam (selfing), founders may be inbred, and an individual
   may be a line derived by t generations of selfing from the cross of its parents: its
   coancestry with others is that of the F₁, and Fᵢ = 1 − (½)ᵗ(1 − f_sd). */

const PED = {};
PED.UNKNOWN = new Set(['', '0', 'na', 'n/a', 'nan', 'null', '-', '--', '.', '*', '?', 'unknown', 'desconocido', 'desconocida', 'none', 'ninguno']);
PED.isUnknown = v => v == null || PED.UNKNOWN.has(String(v).trim().toLowerCase());

/* rows: [{ id, sire, dam, t, F0, year }]; o: { selfing: allow sire = dam } */
PED.build = (rows, o) => {
  o = o || {};
  const issues = [];
  const recs = new Map();
  const order = [];
  rows.forEach((r, k) => {
    const id = String(r.id == null ? '' : r.id).trim();
    if (PED.isUnknown(id)) { issues.push({ level: 'warning', es: `Fila ${k + 1}: individuo sin identificador; se omite.`, en: `Row ${k + 1}: individual without an identifier; skipped.` }); return; }
    const sire = PED.isUnknown(r.sire) ? null : String(r.sire).trim();
    const dam = PED.isUnknown(r.dam) ? null : String(r.dam).trim();
    const t = r.t != null && isFinite(+r.t) && +r.t > 0 ? +r.t : 0;
    const F0 = r.F0 != null && isFinite(+r.F0) && +r.F0 > 0 ? Math.min(1, +r.F0) : 0;
    if (recs.has(id)) {
      const p = recs.get(id);
      if (p.sire !== sire || p.dam !== dam) issues.push({ level: 'error', es: `${id} aparece dos veces con padres distintos (${p.sire || '?'} × ${p.dam || '?'} y ${sire || '?'} × ${dam || '?'}); se conserva la primera.`, en: `${id} appears twice with different parents (${p.sire || '?'} × ${p.dam || '?'} and ${sire || '?'} × ${dam || '?'}); the first is kept.` });
      return;
    }
    recs.set(id, { id, sire, dam, t, F0, year: r.year });
    order.push(id);
  });
  /* parents that are not listed become founders */
  let added = 0;
  [...recs.values()].forEach(r => [r.sire, r.dam].forEach(p => { if (p && !recs.has(p)) { recs.set(p, { id: p, sire: null, dam: null, t: 0, F0: 0, added: true }); order.push(p); added++; } }));
  if (added) issues.push({ level: 'info', es: `${added === 1 ? '1 progenitor sin fila propia se agregó como fundador' : added + ' progenitores sin fila propia se agregaron como fundadores'}.`, en: `${added === 1 ? '1 parent without a row of its own was added as a founder' : added + ' parents without a row of their own were added as founders'}.` });
  /* own parent, sex conflicts */
  const asSire = new Set(), asDam = new Set();
  [...recs.values()].forEach(r => {
    if (r.sire === r.id || r.dam === r.id) { issues.push({ level: 'error', es: `${r.id} figura como su propio progenitor; se borra ese progenitor.`, en: `${r.id} is listed as its own parent; that parent is removed.` }); if (r.sire === r.id) r.sire = null; if (r.dam === r.id) r.dam = null; }
    if (r.sire) asSire.add(r.sire);
    if (r.dam) asDam.add(r.dam);
    if (r.sire && r.sire === r.dam && !o.selfing) issues.push({ level: 'warning', es: `${r.id} tiene el mismo padre y madre (${r.sire}): autofecundación.`, en: `${r.id} has the same sire and dam (${r.sire}): selfing.` });
  });
  const both = [...asSire].filter(x => asDam.has(x));
  if (both.length && !o.selfing) issues.push({ level: 'warning', es: `${both.length === 1 ? '1 individuo aparece' : both.length + ' individuos aparecen'} como padre y como madre (${both.slice(0, 6).join(', ')}${both.length > 6 ? '…' : ''}); es normal en plantas monoicas, no en animales.`, en: `${both.length === 1 ? '1 individual appears' : both.length + ' individuals appear'} both as sire and as dam (${both.slice(0, 6).join(', ')}${both.length > 6 ? '…' : ''}); normal in monoecious plants, not in animals.` });
  /* topological order (Kahn); a loop leaves individuals unplaced */
  const kids = new Map(), indeg = new Map();
  order.forEach(id => { kids.set(id, []); indeg.set(id, 0); });
  order.forEach(id => { const r = recs.get(id); [...new Set([r.sire, r.dam].filter(Boolean))].forEach(p => { kids.get(p).push(id); indeg.set(id, indeg.get(id) + 1); }); });
  const gen = new Map();
  let queue = order.filter(id => indeg.get(id) === 0);
  queue.forEach(id => gen.set(id, 0));
  const placed = [];
  while (queue.length) {
    const next = [];
    queue.forEach(id => {
      placed.push(id);
      kids.get(id).forEach(c => {
        gen.set(c, Math.max(gen.get(c) || 0, gen.get(id) + 1));
        indeg.set(c, indeg.get(c) - 1);
        if (indeg.get(c) === 0) next.push(c);
      });
    });
    queue = next;
  }
  if (placed.length < order.length) {
    const loop = order.filter(id => !placed.includes(id));
    issues.push({ level: 'error', es: `Hay un ciclo en el pedigrí (un individuo es su propio ancestro): ${loop.slice(0, 8).join(', ')}${loop.length > 8 ? '…' : ''}.`, en: `The pedigree has a loop (an individual is its own ancestor): ${loop.slice(0, 8).join(', ')}${loop.length > 8 ? '…' : ''}.` });
    return { ok: false, issues };
  }
  /* by generation, then as given */
  const first = new Map(order.map((id, k) => [id, k]));
  const ids = placed.sort((a, b) => gen.get(a) - gen.get(b) || first.get(a) - first.get(b));
  const index = new Map(ids.map((id, k) => [id, k]));
  const n = ids.length;
  const sire = new Int32Array(n), dam = new Int32Array(n), t = new Float64Array(n), F0 = new Float64Array(n), generation = new Int32Array(n);
  const year = new Array(n);
  ids.forEach((id, k) => {
    const r = recs.get(id);
    sire[k] = r.sire ? index.get(r.sire) : -1;
    dam[k] = r.dam ? index.get(r.dam) : -1;
    t[k] = r.t; F0[k] = r.F0; generation[k] = gen.get(id); year[k] = r.year;
  });
  const ped = { n, ids, index, sire, dam, t, F0, generation, year, added: new Set([...recs.values()].filter(r => r.added).map(r => r.id)) };
  PED.inbreeding(ped);
  return { ok: true, ped, issues };
};

/* path vector of individual k: coefficients L_kj over its ancestors j (and itself), A = LDL′ */
function pathVector(ped, k) {
  const L = new Map([[k, 1]]);
  const stack = [k], seen = new Set([k]);
  while (stack.length) { const j = stack.pop(); [ped.sire[j], ped.dam[j]].forEach(p => { if (p >= 0 && !seen.has(p)) { seen.add(p); stack.push(p); } }); }
  const anc = [...seen].sort((a, b) => b - a);          /* youngest first: parents have smaller indices */
  anc.forEach(j => {
    const lj = L.get(j) || 0;
    if (!lj) return;
    const s = ped.sire[j], d = ped.dam[j];
    if (s >= 0) L.set(s, (L.get(s) || 0) + 0.5 * lj);
    if (d >= 0) L.set(d, (L.get(d) || 0) + 0.5 * lj);
  });
  return L;
}
/* additive relationship between two individuals already processed */
PED.relationship = (ped, i, j) => {
  if (i < 0 || j < 0) return 0;
  if (i === j) return 1 + ped.F[i];
  const Li = pathVector(ped, i), Lj = pathVector(ped, j);
  let s = 0;
  Li.forEach((v, k) => { const w = Lj.get(k); if (w) s += v * w * ped.b[k]; });
  return s;
};

/* inbreeding Fᵢ and Mendelian-sampling variances bᵢ = Var(mᵢ)/σ²a, in pedigree order */
PED.inbreeding = ped => {
  const n = ped.n;
  const F = new Float64Array(n), b = new Float64Array(n);
  ped.F = F; ped.b = b;
  for (let k = 0; k < n; k++) {
    const s = ped.sire[k], d = ped.dam[k];
    let ass = 0, add = 0, asd = 0;
    if (s >= 0) ass = 1 + F[s];
    if (d >= 0) add = 1 + F[d];
    if (s >= 0 && d >= 0) asd = s === d ? 1 + F[s] : PED.relationship(ped, s, d);
    let Fk;
    if (ped.t[k] > 0) Fk = 1 - Math.pow(0.5, ped.t[k]) * (1 - 0.5 * asd);  /* lines from t selfings of the s × d cross */
    else if (s < 0 && d < 0) Fk = ped.F0[k];
    else Fk = 0.5 * asd;
    F[k] = Fk;
    b[k] = (1 + Fk) - 0.25 * (ass + add + 2 * asd);
    if (!(b[k] > 1e-12)) b[k] = 1e-12;
  }
  ped.logdetA = b.reduce((acc, v) => acc + Math.log(v), 0);
  return ped;
};

/* A⁻¹ by the rules of Henderson (1976) and Quaas (1976), for any bᵢ: sparse rows */
PED.Ainv = ped => {
  const n = ped.n;
  const rows = Array.from({ length: n }, () => new Map());
  const add = (i, j, v) => { rows[i].set(j, (rows[i].get(j) || 0) + v); };
  for (let k = 0; k < n; k++) {
    const a = 1 / ped.b[k], s = ped.sire[k], d = ped.dam[k];
    add(k, k, a);
    const par = [s, d].filter(p => p >= 0);
    par.forEach(p => { add(k, p, -a / 2); add(p, k, -a / 2); });
    par.forEach(p => par.forEach(q => add(p, q, a / 4)));
  }
  return rows;
};
PED.AinvDense = (ped, subset) => {
  const rows = PED.Ainv(ped);
  const n = ped.n;
  const M = new Float64Array(n * n);
  rows.forEach((row, i) => row.forEach((v, j) => { M[i * n + j] = v; }));
  return M;
};
/* A by the tabular method (dense; for moderate pedigrees) */
PED.A = ped => {
  const n = ped.n, A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    const s = ped.sire[i], d = ped.dam[i];
    for (let j = 0; j < i; j++) {
      const v = 0.5 * ((s >= 0 ? A[j * n + s] : 0) + (d >= 0 ? A[j * n + d] : 0));
      A[i * n + j] = A[j * n + i] = v;
    }
    A[i * n + i] = 1 + ped.F[i];
  }
  return A;
};
/* the ancestors of a set of individuals (with the individuals themselves) */
PED.ancestors = (ped, keep) => {
  const on = new Uint8Array(ped.n);
  const stack = [...keep];
  stack.forEach(k => { on[k] = 1; });
  while (stack.length) { const j = stack.pop(); [ped.sire[j], ped.dam[j]].forEach(p => { if (p >= 0 && !on[p]) { on[p] = 1; stack.push(p); } }); }
  return on;
};
/* the pedigree restricted to the ancestors of some individuals (inbreeding is kept) */
PED.prune = (ped, keepIds) => {
  const on = PED.ancestors(ped, keepIds.map(id => ped.index.get(id)).filter(k => k != null));
  const kept = [];
  for (let k = 0; k < ped.n; k++) if (on[k]) kept.push(k);
  const map = new Map(kept.map((k, i) => [k, i]));
  const n = kept.length;
  const out = { n, ids: kept.map(k => ped.ids[k]), sire: new Int32Array(n), dam: new Int32Array(n), t: new Float64Array(n), F0: new Float64Array(n), generation: new Int32Array(n), year: kept.map(k => ped.year[k]), added: ped.added };
  kept.forEach((k, i) => { out.sire[i] = ped.sire[k] >= 0 ? map.get(ped.sire[k]) : -1; out.dam[i] = ped.dam[k] >= 0 ? map.get(ped.dam[k]) : -1; out.t[i] = ped.t[k]; out.F0[i] = ped.F0[k]; out.generation[i] = ped.generation[k]; });
  out.index = new Map(out.ids.map((id, i) => [id, i]));
  PED.inbreeding(out);
  return out;
};
PED.stats = ped => {
  const n = ped.n;
  let founders = 0, one = 0, both = 0, inbred = 0, sumF = 0, maxF = 0, maxGen = 0;
  for (let k = 0; k < n; k++) {
    const s = ped.sire[k], d = ped.dam[k];
    if (s < 0 && d < 0) founders++; else if (s < 0 || d < 0) one++; else both++;
    if (ped.F[k] > 1e-12) inbred++;
    sumF += ped.F[k]; maxF = Math.max(maxF, ped.F[k]); maxGen = Math.max(maxGen, ped.generation[k]);
  }
  const byGen = [];
  for (let g = 0; g <= maxGen; g++) {
    const ks = []; for (let k = 0; k < n; k++) if (ped.generation[k] === g) ks.push(k);
    byGen.push({ g, n: ks.length, meanF: ks.reduce((s, k) => s + ped.F[k], 0) / ks.length, maxF: Math.max(...ks.map(k => ped.F[k])) });
  }
  const sires = new Set(), dams = new Set();
  for (let k = 0; k < n; k++) { if (ped.sire[k] >= 0) sires.add(ped.sire[k]); if (ped.dam[k] >= 0) dams.add(ped.dam[k]); }
  return { n, founders, one, both, inbred, meanF: sumF / n, maxF, generations: maxGen + 1, byGen, sires: sires.size, dams: dams.size };
};

window.PED = PED;
