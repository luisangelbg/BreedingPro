/* BreedingPro — Block 2 engine, part 2: field designs for the evaluation trial.

   Field.generate(entries, o) returns, for every location, the randomised plots
   with their replicate, block, field row and column and plot number.

   Designs
   - CRD: all plots randomised together.
   - RCBD: every replicate is a complete block, randomised independently.
   - Resolvable incomplete blocks ("alpha lattice", Patterson & Williams 1976):
     each replicate is split into s blocks of size k (or of two neighbouring
     sizes when v is not a multiple of k). When s is prime, r ≤ s and k ≤ s the
     cyclic alpha array {i·s + (b + i·c) mod s} gives an α(0,1) design, in which
     no two entries meet twice. Candidates also come from random generating
     arrays of any s and from an exchange algorithm (entries swapped between blocks
     of the same replicate) that minimises the sum of squared concurrences Σλᵢⱼ², a
     standard surrogate of A-optimality. The finalist with the highest exact
     efficiency is kept and, for up to 100 entries, polished by exchanges that raise
     that exact efficiency directly. The average efficiency factor
         E = (v − 1) / Σ 1/eᵢ,  eᵢ the non-zero eigenvalues of I − (1/r)·N·K⁻¹·N′,
     is computed exactly (through a Cholesky inverse) together with the upper
     bound U = (v − 1)(r − 1) / [(v − 1)(r − 1) + r(s − 1)] for resolvable designs.
   - Augmented RCBD (Federer 1956): checks in every block, new entries once.

   Randomisation (seeded, reproducible): entry labels are permuted, blocks are
   shuffled within replicates and plots within blocks, independently at every
   location. */

const Field = {};

/* ---------------- resolvable incomplete block designs ---------------- */
function blockSizes(v, k) {
  const s = Math.ceil(v / k), base = Math.floor(v / s), extra = v - s * base;
  return Array.from({ length: s }, (_, b) => base + (b < extra ? 1 : 0));
}
const isPrime = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

/* reps[c][b] = array of treatment indices 0..v−1 */
function cyclicAlpha(v, r, k) {
  const s = v / k, reps = [];
  for (let c = 0; c < r; c++) {
    const rep = [];
    for (let b = 0; b < s; b++) { const blk = []; for (let i = 0; i < k; i++) blk.push(i * s + ((b + i * c) % s)); rep.push(blk); }
    reps.push(rep);
  }
  return reps;
}
function randomResolvable(v, r, sizes, rand) {
  const reps = [];
  for (let c = 0; c < r; c++) {
    const perm = shuffle(Array.from({ length: v }, (_, i) => i), rand);
    const rep = []; let at = 0;
    sizes.forEach(sz => { rep.push(perm.slice(at, at + sz)); at += sz; });
    reps.push(rep);
  }
  return reps;
}
function concurrence(v, reps) {
  const L = new Int16Array(v * v);
  reps.forEach(rep => rep.forEach(blk => { for (let a = 0; a < blk.length; a++) for (let b = a + 1; b < blk.length; b++) { L[blk[a] * v + blk[b]]++; L[blk[b] * v + blk[a]]++; } }));
  return L;
}
function sumSq(v, L) { let s = 0; for (let i = 0; i < v; i++) for (let j = i + 1; j < v; j++) s += L[i * v + j] * L[i * v + j]; return s; }

/* exchange algorithm with a short annealing schedule */
function improve(v, reps, rand, iters) {
  const L = concurrence(v, reps);
  let obj = sumSq(v, L);
  const r = reps.length;
  let T = 2;
  for (let it = 0; it < iters; it++) {
    const rep = reps[Math.floor(rand() * r)];
    if (rep.length < 2) continue;
    const b1 = Math.floor(rand() * rep.length); let b2 = Math.floor(rand() * (rep.length - 1)); if (b2 >= b1) b2++;
    const B1 = rep[b1], B2 = rep[b2];
    const p1 = Math.floor(rand() * B1.length), p2 = Math.floor(rand() * B2.length);
    const t1 = B1[p1], t2 = B2[p2];
    let delta = 0;
    for (const u of B1) if (u !== t1) { delta += -2 * L[t1 * v + u] + 1; delta += 2 * L[t2 * v + u] + 1; }
    for (const w of B2) if (w !== t2) { delta += -2 * L[t2 * v + w] + 1; delta += 2 * L[t1 * v + w] + 1; }
    if (delta <= 0 || rand() < Math.exp(-delta / T)) {
      for (const u of B1) if (u !== t1) { L[t1 * v + u]--; L[u * v + t1]--; L[t2 * v + u]++; L[u * v + t2]++; }
      for (const w of B2) if (w !== t2) { L[t2 * v + w]--; L[w * v + t2]--; L[t1 * v + w]++; L[w * v + t1]++; }
      B1[p1] = t2; B2[p2] = t1; obj += delta;
    }
    if (it % 2000 === 1999) T *= 0.8;
  }
  return { reps, obj: sumSq(v, concurrence(v, reps)) };
}

/* average efficiency factor of a (resolvable) incomplete block design */
Field.efficiency = (v, reps) => {
  const r = reps.length;
  const A = Array.from({ length: v }, () => new Float64Array(v));
  for (let i = 0; i < v; i++) A[i][i] = r;
  reps.forEach(rep => rep.forEach(blk => {
    const w = 1 / blk.length;
    blk.forEach(a => blk.forEach(b => { A[a][b] -= w; }));
  }));
  /* A/r + J/v has eigenvalue 1 on the constant vector and eᵢ elsewhere */
  for (let i = 0; i < v; i++) for (let j = 0; j < v; j++) A[i][j] = A[i][j] / r + 1 / v;
  const tr = S.traceInverseSPD(A);
  if (!isFinite(tr)) return { E: 0, connected: false };
  return { E: (v - 1) / (tr - 1), connected: true };
};
Field.upperBound = (v, r, s) => (r < 2 ? NaN : (v - 1) * (r - 1) / ((v - 1) * (r - 1) + r * (s - 1)));

/* α-design from a generating array A (k × r, entries in 0..s−1): block b of replicate c holds
   {i·s + (A[i][c] + b) mod s : i = 0..k−1} (Patterson & Williams 1976) */
function fromAlphaArray(A, v, r, k) {
  const s = v / k, reps = [];
  for (let c = 0; c < r; c++) {
    const rep = [];
    for (let b = 0; b < s; b++) { const blk = []; for (let i = 0; i < k; i++) blk.push(i * s + ((A[i][c] + b) % s)); rep.push(blk); }
    reps.push(rep);
  }
  return reps;
}
const cloneReps = reps => reps.map(rep => rep.map(b => b.slice()));

Field._alphaCache = new Map();
Field.alphaDesign = (v, r, k, seed) => {
  const key = [v, r, k, seed].join('|');
  if (Field._alphaCache.has(key)) return Field._alphaCache.get(key);
  const rand = rng(seed);
  const sizes = blockSizes(v, k), s = sizes.length;
  const equal = sizes.every(x => x === k);
  const cands = [];
  const score = reps => sumSq(v, concurrence(v, reps));
  /* 1. cyclic α(0,1) when s is prime */
  if (equal && isPrime(s) && r <= s && k <= s) { const reps = cyclicAlpha(v, r, k); cands.push({ reps, obj: score(reps), how: 'cyclic' }); }
  /* 2. random generating arrays (first row and column zero), best by concurrences */
  let bestArray = null;
  if (equal) {
    const nArr = Math.max(5, Math.min(400, Math.floor(3e7 / (v * v))));
    const pool = [];
    for (let t = 0; t < nArr; t++) {
      const A = Array.from({ length: k }, (_, i) => Array.from({ length: r }, (_, c) => (i === 0 || c === 0) ? 0 : Math.floor(rand() * s)));
      const reps = fromAlphaArray(A, v, r, k);
      pool.push({ reps, obj: score(reps), how: 'array' });
    }
    pool.sort((a, b) => a.obj - b.obj);
    pool.slice(0, 3).forEach(p => cands.push(p));
    bestArray = pool[0];
  }
  /* 3. exchange algorithm from random starts and from the best array */
  const iters = Math.min(200000, 4000 + 60 * v * r);
  const restarts = v <= 100 ? 8 : v <= 300 ? 4 : 2;
  for (let t = 0; t < restarts; t++) { const res = improve(v, randomResolvable(v, r, sizes, rand), rand, iters); cands.push({ reps: res.reps, obj: res.obj, how: 'search' }); }
  if (bestArray) { const res = improve(v, cloneReps(bestArray.reps), rand, iters); cands.push({ reps: res.reps, obj: res.obj, how: 'array+search' }); }
  /* 4. final choice: exact average efficiency factor among the candidates with the fewest
     repeated concurrences (several designs share the same Σλ² but not the same E) */
  cands.sort((a, b) => a.obj - b.obj);
  const minObj = cands[0].obj;
  let finalists = cands.filter(c => c.obj <= minObj * 1.02 + 1e-9);
  if (v > 300) finalists = finalists.slice(0, 2);
  else if (v > 150) finalists = finalists.slice(0, 5);
  let best = null;
  finalists.forEach(c => { c.E = v <= 900 ? Field.efficiency(v, c.reps).E : NaN; if (!best || (isFinite(c.E) && c.E > best.E + 1e-12) || (!isFinite(best.E) && c.obj < best.obj)) best = c; });
  /* 5. for small trials, polish the winner by exchanges that raise the exact efficiency factor
     (a time budget keeps the interface responsive) */
  if (v <= 100 && isFinite(best.E) && !(equal && best.E >= Field.upperBound(v, r, s) - 1e-9)) {
    const reps = cloneReps(best.reps);
    let E = best.E;
    const t0 = Date.now(), budget = v <= 40 ? 600 : 1000;
    while (Date.now() - t0 < budget) {
      const rep = reps[Math.floor(rand() * r)];
      const b1 = Math.floor(rand() * rep.length); let b2 = Math.floor(rand() * (rep.length - 1)); if (b2 >= b1) b2++;
      const p1 = Math.floor(rand() * rep[b1].length), p2 = Math.floor(rand() * rep[b2].length);
      const t1 = rep[b1][p1], t2 = rep[b2][p2];
      rep[b1][p1] = t2; rep[b2][p2] = t1;
      const e = Field.efficiency(v, reps).E;
      if (e > E + 1e-12) E = e; else { rep[b1][p1] = t1; rep[b2][p2] = t2; }
    }
    if (E > best.E + 1e-12) best = { reps, obj: sumSq(v, concurrence(v, reps)), E, how: best.how + '+E' };
  }
  const L = concurrence(v, best.reps);
  let maxL = 0; for (let i = 0; i < L.length; i++) if (L[i] > maxL) maxL = L[i];
  const out = { reps: best.reps, sizes, s, cyclic: best.how === 'cyclic', how: best.how, maxConcurrence: maxL, efficiency: best.E, connected: best.E > 0, upperBound: equal ? Field.upperBound(v, r, s) : NaN, candidates: cands.length };
  Field._alphaCache.set(key, out);
  return out;
};

/* ---------------- geometry: rows × columns of every block, then arrangement ---------------- */
function layoutBlocks(blocks, o) {
  /* every replicate is a stack of its blocks; a block wraps into `cols` columns; replicates
     are placed one below the other or side by side, with a one-plot alley between them */
  const cols = Math.max(1, o.plotsPerRow || Math.max(...blocks.map(b => b.cells.length)));
  const reps = [];
  blocks.forEach(b => { let R = reps.find(x => x.rep === b.rep); if (!R) { R = { rep: b.rep, blocks: [] }; reps.push(R); } R.blocks.push(b); });
  const plots = [], boxes = [];
  const side = o.arrangement === 'side';
  let r0 = 0, c0 = 0;
  reps.forEach(R => {
    let row = r0, width = 0;
    R.blocks.forEach(b => {
      const nRows = Math.ceil(b.cells.length / cols), w = Math.min(cols, b.cells.length);
      b.cells.forEach((cell, i) => plots.push(Object.assign({ rep: b.rep, block: b.block, row: row + Math.floor(i / cols), col: c0 + (i % cols), inBlock: i + 1 }, cell)));
      boxes.push({ kind: 'block', rep: b.rep, block: b.block, r0: row, c0, r1: row + nRows - 1, c1: c0 + w - 1 });
      row += nRows; width = Math.max(width, w);
    });
    boxes.push({ kind: 'rep', rep: R.rep, r0, c0, r1: row - 1, c1: c0 + width - 1 });
    if (side) c0 += width + 1; else r0 = row + 1;
  });
  const nRows = Math.max(...plots.map(p => p.row)) + 1, nCols = Math.max(...plots.map(p => p.col)) + 1;
  return { plots, boxes, nRows, nCols };
}

function numberPlots(L, o) {
  if (o.numbering === 'block') {
    const perRep = {};
    L.plots.forEach(p => { perRep[p.rep] = (perRep[p.rep] || 0) + 1; });
    const width = Math.max(...Object.values(perRep)) >= 100 ? 1000 : 100;
    const counters = {};
    L.plots.slice().sort((a, b) => a.row - b.row || a.col - b.col).forEach(p => { counters[p.rep] = (counters[p.rep] || 0) + 1; p.plot = p.rep * width + counters[p.rep]; });
    return;
  }
  const byRow = {};
  L.plots.forEach(p => (byRow[p.row] = byRow[p.row] || []).push(p));
  let n = o.startPlot || 1;
  Object.keys(byRow).map(Number).sort((a, b) => a - b).forEach((r, ri) => {
    const row = byRow[r].sort((a, b) => a.col - b.col);
    if (o.numbering === 'serpentine' && ri % 2 === 1) row.reverse();
    row.forEach(p => { p.plot = n++; });
  });
}

/* ---------------- one location ---------------- */
function oneLocation(entries, o, structure, locIndex) {
  const rand = rng((o.seed >>> 0) + 7919 * (locIndex + 1));
  const v = entries.length;
  const cell = i => ({ entryIndex: i, entry: entries[i].entry, code: entries[i].code, female: entries[i].female, male: entries[i].male, type: entries[i].type });
  let blocks = [];
  if (o.design === 'crd') {
    const all = [];
    for (let rr = 1; rr <= o.reps; rr++) entries.forEach((_, i) => all.push(Object.assign(cell(i), { occurrence: rr })));
    blocks = [{ rep: 1, block: 1, cells: shuffle(all, rand) }];
  } else if (o.design === 'rcbd') {
    for (let rr = 1; rr <= o.reps; rr++) blocks.push({ rep: rr, block: 1, cells: shuffle(entries.map((_, i) => cell(i)), rand) });
  } else if (o.design === 'alpha') {
    const perm = shuffle(Array.from({ length: v }, (_, i) => i), rand);   // design index → entry
    structure.reps.forEach((rep, rr) => {
      const order = shuffle(rep.map((_, b) => b), rand);
      order.forEach((b, bi) => blocks.push({ rep: rr + 1, block: bi + 1, cells: shuffle(rep[b].map(t => cell(perm[t])), rand) }));
    });
  } else if (o.design === 'augmented') {
    const checks = entries.map((e, i) => e.type === 'check' ? i : -1).filter(i => i >= 0);
    const news = shuffle(entries.map((e, i) => e.type === 'check' ? -1 : i).filter(i => i >= 0), rand);
    const b = o.blocks, per = Math.ceil(news.length / b);
    for (let bb = 0; bb < b; bb++) {
      const mine = news.slice(bb * per, (bb + 1) * per).map(cell);
      blocks.push({ rep: bb + 1, block: 1, cells: shuffle(checks.map(cell).concat(mine), rand) });
    }
  }
  const L = layoutBlocks(blocks, o);
  numberPlots(L, o);
  L.plots.sort((a, b) => a.plot - b.plot);
  return L;
}

Field.check = (entries, o) => {
  const issues = [];
  const v = entries.length;
  if (!v) issues.push({ es: 'No hay entradas: defina primero el plan de cruzamientos.', en: 'There are no entries: define the crossing plan first.' });
  if (o.design !== 'augmented' && o.reps < 2) issues.push({ es: 'Se necesitan al menos 2 repeticiones para estimar el error.', en: 'At least 2 replicates are needed to estimate error.' });
  if (o.design === 'alpha') {
    if (o.k < 2 || o.k >= v) issues.push({ es: 'El tamaño de bloque debe estar entre 2 y el número de entradas − 1.', en: 'Block size must be between 2 and the number of entries − 1.' });
    const sizes = blockSizes(v, o.k);
    if (Math.max(...sizes) - Math.min(...sizes) > 1) issues.push({ es: 'Los bloques quedarían muy desiguales; elija otro tamaño.', en: 'Blocks would be very unequal; choose another size.' });
  }
  if (o.design === 'augmented') {
    const c = entries.filter(e => e.type === 'check').length;
    if (c < 2) issues.push({ es: 'El diseño aumentado necesita al menos 2 testigos repetidos en cada bloque.', en: 'The augmented design needs at least 2 checks repeated in every block.' });
    if (o.blocks < 2) issues.push({ es: 'Se necesitan al menos 2 bloques.', en: 'At least 2 blocks are needed.' });
    const df = (o.blocks - 1) * (c - 1);
    if (c >= 2 && o.blocks >= 2 && df < 12) issues.push({ es: `Solo ${df} grados de libertad para el error (se recomiendan 12 o más): agregue testigos o bloques.`, en: `Only ${df} error degrees of freedom (12 or more recommended): add checks or blocks.`, level: 'warning' });
  }
  return issues;
};

Field.generate = (entries, o) => {
  const issues = Field.check(entries, o);
  if (issues.some(x => x.level !== 'warning')) return { issues };
  const v = entries.length;
  const structure = o.design === 'alpha' ? Field.alphaDesign(v, o.reps, o.k, o.seed) : null;
  const locations = o.locations.map((name, li) => Object.assign({ name }, oneLocation(entries, o, structure, li)));
  const errorDf = o.design === 'crd' ? v * (o.reps - 1)
    : o.design === 'rcbd' ? (o.reps - 1) * (v - 1)
      : o.design === 'alpha' ? v * o.reps - 1 - (v - 1) - (o.reps - 1) - o.reps * (structure.s - 1)
        : (o.blocks - 1) * (entries.filter(e => e.type === 'check').length - 1);
  return { issues, design: o.design, structure, locations, errorDf, plotsPerLocation: locations[0].plots.length, options: o };
};

/* ---------------- field book ---------------- */
Field.book = (plan, field, o) => {
  const lang = (es, en) => (o.lang === 'en' ? en : es);
  const header = [lang('Localidad', 'Location'), lang('Parcela', 'Plot'), lang('Repetición', 'Replicate'), lang('Bloque', 'Block'),
    lang('Fila', 'Row'), lang('Columna', 'Column'), lang('Entrada', 'Entry'), lang('Genotipo', 'Genotype'), lang('Hembra', 'Female'), lang('Macho', 'Male'), lang('Tipo', 'Type')];
  (o.traits || []).forEach(t => header.push(t));
  const rows = [];
  field.locations.forEach(L => L.plots.forEach(p => {
    const r = [L.name, p.plot, p.rep, p.block, p.row + 1, p.col + 1, p.entry, p.code, p.female, p.male, o.typeName ? o.typeName(p) : p.type];
    (o.traits || []).forEach(() => r.push(''));
    rows.push(r);
  }));
  /* the first line declares the design so Block 3 can read it back without guessing */
  const c = plan.cfg;
  const meta = ['#BreedingPro fieldbook', `mating=${plan.design}`, c.method ? `method=${c.method}` : null, `field=${field.design}`,
    `reps=${field.options.reps}`, field.design === 'alpha' ? `k=${field.options.k}` : null, field.design === 'augmented' ? `blocks=${field.options.blocks}` : null,
    `locations=${field.locations.length}`, `entries=${plan.entries.length}`, `seed=${field.options.seed}`, c.F != null ? `F=${c.F}` : null].filter(Boolean).join(', ');
  return { header, rows, meta };
};

window.Field = Field;
