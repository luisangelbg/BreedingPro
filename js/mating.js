/* BreedingPro — Block 2 engine, part 1: crossing plans.

   Mating.build(cfg) turns a mating design into the list of crosses that must be
   made and the list of entries that will be evaluated in the field. Every design
   follows the conventions of its original paper:
   - Griffing (1956b) Methods 1–4: parents on the diagonal, F1 above it
     (female = row), reciprocals below it.
   - Partial diallel (Kempthorne & Curnow 1961): parent i is crossed with
     i + k, …, i + k + s − 1 (mod p), k = (p + 1 − s)/2; p and s of opposite
     parity and s < p − 1, so every parent enters exactly s crosses.
   - North Carolina I (Comstock & Robinson 1948): each male with f different
     females. North Carolina II: every male with every female, in sets.
   - North Carolina III (Comstock & Robinson 1952): n F2 plants, each crossed as
     male to both inbred parents P1 and P2.
   - Triple test cross (Kearsey & Jinks 1968): n F2 plants (or lines) crossed as
     males to P1, P2 and their F1.
   - Line × tester (Kempthorne 1957): lines as females, testers as males.
   - Generation means: P1, P2, F1, F2, BC1 = F1 × P1, BC2 = F1 × P2, and the
     optional reciprocal F1, F3 and selfed backcrosses.

   Codes are written female × male. Names are free text; duplicates are
   rejected because every later block identifies entries by name. */

const Mating = {};

/* ---------------- names ---------------- */
Mating.parseNames = (text, prefix, n) => {
  const raw = String(text || '').split(/[\n,;\t]+/).map(s => s.trim()).filter(Boolean);
  const out = [], dup = [];
  raw.forEach(s => { if (out.includes(s)) dup.push(s); else out.push(s); });
  if (!out.length && n > 0) for (let i = 1; i <= n; i++) out.push(prefix + i);
  return { names: out, duplicates: dup };
};

const X = (f, m) => `${f} × ${m}`;
const entry = (code, female, male, type, extra) => Object.assign({ code, female, male, type }, extra || {});

/* valid numbers of crosses per parent in a circulant partial diallel */
Mating.partialOptions = p => {
  const out = [];
  for (let s = 2; s < p - 1; s++) if ((p + 1 - s) % 2 === 0) out.push(s);
  return out;
};

/* ---------------- designs ---------------- */
function griffing(cfg) {
  const P = cfg.parents, p = P.length, m = cfg.method;
  const issues = [];
  if (p < 3) issues.push({ es: 'Se necesitan al menos 3 progenitores.', en: 'At least 3 parents are needed.' });
  if ((m === 3 || m === 4) && p < 4) issues.push({ es: 'Los métodos 3 y 4 necesitan al menos 4 progenitores para estimar la ACE.', en: 'Methods 3 and 4 need at least 4 parents to estimate SCA.' });
  const entries = [], crosses = [];
  if (m === 1 || m === 2) P.forEach(x => entries.push(entry(x, x, x, 'parent')));
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    const e = entry(X(P[i], P[j]), P[i], P[j], 'F1'); entries.push(e); crosses.push(e);
  }
  if (m === 1 || m === 3) for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    const e = entry(X(P[j], P[i]), P[j], P[i], 'reciprocal'); entries.push(e); crosses.push(e);
  }
  const cells = P.map((_, i) => P.map((_, j) => {
    if (i === j) return (m === 1 || m === 2) ? 'parent' : null;
    if (j > i) return 'F1';
    return (m === 1 || m === 3) ? 'reciprocal' : null;
  }));
  return { entries, crosses, issues, matrix: { rows: P, cols: P, cells, rowTitle: { es: 'hembra', en: 'female' }, colTitle: { es: 'macho', en: 'male' } } };
}

function partial(cfg) {
  const P = cfg.parents, p = P.length, s = cfg.s;
  const issues = [];
  const valid = Mating.partialOptions(p);
  if (p < 5) issues.push({ es: 'Un dialelo parcial necesita al menos 5 progenitores.', en: 'A partial diallel needs at least 5 parents.' });
  else if (!valid.includes(s)) issues.push({ es: `Con ${p} progenitores, s debe ser de paridad opuesta a p y menor que p − 1: ${valid.join(', ') || 'ninguno'}.`, en: `With ${p} parents, s must have the opposite parity to p and be below p − 1: ${valid.join(', ') || 'none'}.` });
  const entries = [], crosses = [];
  const cells = P.map(() => P.map(() => null));
  if (!issues.length) {
    const k = (p + 1 - s) / 2, seen = new Set();
    for (let i = 0; i < p; i++) for (let t = 0; t < s; t++) {
      const j = (i + k + t) % p, key = Math.min(i, j) + '|' + Math.max(i, j);
      if (seen.has(key)) continue;
      seen.add(key);
      const a = Math.min(i, j), b = Math.max(i, j);
      const e = entry(X(P[a], P[b]), P[a], P[b], 'F1'); crosses.push(e);
      cells[a][b] = 'F1';
      if (cfg.reciprocals) { const r = entry(X(P[b], P[a]), P[b], P[a], 'reciprocal'); crosses.push(r); cells[b][a] = 'reciprocal'; }
    }
    if (cfg.includeParents) P.forEach((x, i) => { entries.push(entry(x, x, x, 'parent')); cells[i][i] = 'parent'; });
    crosses.forEach(c => entries.push(c));
    /* every parent must appear in exactly s crosses */
    const count = P.map(x => crosses.filter(c => c.type === 'F1' && (c.female === x || c.male === x)).length);
    if (count.some(c => c !== s)) issues.push({ es: 'Error interno: la construcción circulante no es balanceada.', en: 'Internal error: the circulant construction is not balanced.' });
  }
  return { entries, crosses, issues, matrix: { rows: P, cols: P, cells, rowTitle: { es: 'hembra', en: 'female' }, colTitle: { es: 'macho', en: 'male' } } };
}

function nc1(cfg) {
  const entries = [], crosses = [], issues = [];
  const { m, f, sets } = cfg;
  if (m < 2 || f < 2) issues.push({ es: 'Se necesitan al menos 2 machos y 2 hembras por macho.', en: 'At least 2 males and 2 females per male are needed.' });
  const rows = [], cols = [], cells = [];
  for (let k = 1; k <= sets; k++) for (let i = 1; i <= m; i++) {
    const male = (sets > 1 ? `S${k}-` : '') + 'M' + i;
    for (let j = 1; j <= f; j++) {
      const female = (sets > 1 ? `S${k}-` : '') + `F${i}.${j}`;
      const e = entry(X(female, male), female, male, 'FS', { set: k, maleIndex: i, femaleIndex: j });
      entries.push(e); crosses.push(e);
    }
  }
  /* staircase matrix of the first set: male rows, their own females as columns */
  for (let i = 1; i <= m; i++) { rows.push('M' + i); for (let j = 1; j <= f; j++) cols.push(`F${i}.${j}`); }
  for (let i = 0; i < m; i++) cells.push(cols.map((_, c) => Math.floor(c / f) === i ? 'FS' : null));
  return { entries, crosses, issues, matrix: { rows, cols, cells, rowTitle: { es: 'macho', en: 'male' }, colTitle: { es: 'hembras de cada macho', en: 'females of each male' }, note: sets > 1 ? { es: 'se muestra el conjunto 1', en: 'set 1 shown' } : null } };
}

function nc2(cfg) {
  const entries = [], crosses = [], issues = [];
  const { m, f, sets } = cfg;
  if (m < 2 || f < 2) issues.push({ es: 'Se necesitan al menos 2 machos y 2 hembras.', en: 'At least 2 males and 2 females are needed.' });
  const males = cfg.males && cfg.males.length ? cfg.males : Array.from({ length: m }, (_, i) => 'M' + (i + 1));
  const females = cfg.females && cfg.females.length ? cfg.females : Array.from({ length: f }, (_, i) => 'F' + (i + 1));
  for (let k = 1; k <= sets; k++) females.forEach(fe => males.forEach(ma => {
    const ff = (sets > 1 ? `S${k}-` : '') + fe, mm = (sets > 1 ? `S${k}-` : '') + ma;
    const e = entry(X(ff, mm), ff, mm, 'FS', { set: k }); entries.push(e); crosses.push(e);
  }));
  const cells = females.map(() => males.map(() => 'FS'));
  return { entries, crosses, issues, matrix: { rows: females, cols: males, cells, rowTitle: { es: 'hembra', en: 'female' }, colTitle: { es: 'macho', en: 'male' }, note: sets > 1 ? { es: 'se muestra el conjunto 1', en: 'set 1 shown' } : null } };
}

function backcrossFamilies(cfg, testers, kind) {
  const entries = [], crosses = [], issues = [];
  const n = cfg.n;
  if (n < 2) issues.push({ es: 'Se necesitan al menos 2 plantas F₂ (se recomiendan 20 o más).', en: 'At least 2 F₂ plants are needed (20 or more recommended).' });
  const plants = cfg.plants && cfg.plants.length ? cfg.plants : Array.from({ length: n }, (_, i) => (cfg.source === 'lines' ? 'L' : 'F2-') + (i + 1));
  if (cfg.includeParents) testers.forEach(t => entries.push(entry(t, t, t, t === testers[2] ? 'F1' : 'parent')));
  plants.forEach((x, i) => testers.forEach((t, ti) => {
    const e = entry(X(t, x), t, x, kind + (ti + 1), { plant: x, plantIndex: i + 1, tester: t });
    entries.push(e); crosses.push(e);
  }));
  const shown = plants.slice(0, 24);
  const cells = shown.map(() => testers.map((_, ti) => kind + (ti + 1)));
  return { entries, crosses, issues, plants, matrix: { rows: shown, cols: testers, cells, rowTitle: { es: cfg.source === 'lines' ? 'línea (macho)' : 'planta F₂ (macho)', en: cfg.source === 'lines' ? 'line (male)' : 'F₂ plant (male)' }, colTitle: { es: 'probador (hembra)', en: 'tester (female)' }, note: plants.length > 24 ? { es: `primeras 24 de ${plants.length}`, en: `first 24 of ${plants.length}` } : null } };
}
const nc3 = cfg => backcrossFamilies(cfg, [cfg.p1, cfg.p2], 'L');
const ttc = cfg => backcrossFamilies(cfg, [cfg.p1, cfg.p2, cfg.f1 || X(cfg.p1, cfg.p2)], 'L');

function lxt(cfg) {
  const entries = [], crosses = [], issues = [];
  const L = cfg.lines, Tt = cfg.testers;
  if (L.length < 2 || Tt.length < 1) issues.push({ es: 'Se necesitan al menos 2 líneas y 1 probador.', en: 'At least 2 lines and 1 tester are needed.' });
  if (Tt.length === 1) issues.push({ es: 'Con un solo probador (cruza de prueba) no se estima la ACE ni la ACG de probadores.', en: 'With a single tester (topcross) neither SCA nor tester GCA can be estimated.', level: 'warning' });
  if (cfg.includeParents) { L.forEach(x => entries.push(entry(x, x, x, 'line'))); Tt.forEach(x => entries.push(entry(x, x, x, 'tester'))); }
  L.forEach(l => Tt.forEach(t => { const e = entry(X(l, t), l, t, 'F1'); entries.push(e); crosses.push(e); }));
  const cells = L.map(() => Tt.map(() => 'F1'));
  return { entries, crosses, issues, matrix: { rows: L, cols: Tt, cells, rowTitle: { es: 'línea (hembra)', en: 'line (female)' }, colTitle: { es: 'probador (macho)', en: 'tester (male)' } } };
}

/* generations with their pedigree; plants = individuals to evaluate per generation */
Mating.GENERATIONS = {
  P1: { female: 'P1', male: 'P1', seg: false, es: 'progenitor 1', en: 'parent 1' },
  P2: { female: 'P2', male: 'P2', seg: false, es: 'progenitor 2', en: 'parent 2' },
  F1: { female: 'P1', male: 'P2', seg: false, es: 'P₁ × P₂', en: 'P₁ × P₂' },
  RF1: { female: 'P2', male: 'P1', seg: false, es: 'recíproca P₂ × P₁', en: 'reciprocal P₂ × P₁' },
  F2: { female: 'F1', male: 'F1', seg: true, es: 'F₁ autofecundada', en: 'selfed F₁' },
  BC1: { female: 'F1', male: 'P1', seg: true, es: 'F₁ × P₁', en: 'F₁ × P₁' },
  BC2: { female: 'F1', male: 'P2', seg: true, es: 'F₁ × P₂', en: 'F₁ × P₂' },
  F3: { female: 'F2', male: 'F2', seg: true, es: 'familias F₂ autofecundadas', en: 'selfed F₂ families' },
  BC1S: { female: 'BC1', male: 'BC1', seg: true, es: 'BC₁ autofecundada', en: 'selfed BC₁' },
  BC2S: { female: 'BC2', male: 'BC2', seg: true, es: 'BC₂ autofecundada', en: 'selfed BC₂' },
};
function generations(cfg) {
  const entries = [], crosses = [], issues = [];
  const gens = cfg.gens.filter(g => Mating.GENERATIONS[g]);
  ['P1', 'P2', 'F1', 'F2'].forEach(g => { if (!gens.includes(g)) issues.push({ es: `Falta ${g}: las pruebas de escala lo requieren.`, en: `${g} is missing: the scaling tests need it.`, level: 'warning' }); });
  if (!gens.includes('BC1') || !gens.includes('BC2')) issues.push({ es: 'Sin BC₁ y BC₂ solo se ajusta el modelo aditivo–dominante con la prueba C.', en: 'Without BC₁ and BC₂ only the additive–dominance model with test C can be fitted.', level: 'warning' });
  const name = g => g === 'P1' ? cfg.p1 : g === 'P2' ? cfg.p2 : g;
  gens.forEach(g => {
    const G = Mating.GENERATIONS[g];
    const e = entry(g, name(G.female), name(G.male), 'generation', { generation: g, segregating: G.seg, plants: (cfg.plants && cfg.plants[g]) || (G.seg ? 100 : 30) });
    entries.push(e);
    if (G.female !== G.male) crosses.push(e);
  });
  return { entries, crosses, issues, matrix: null };
}

/* ---------------- dispatcher ---------------- */
Mating.build = cfg => {
  const d = cfg.design;
  const res = d === 'griffing' ? griffing(cfg) : d === 'partial' ? partial(cfg) : d === 'nc1' ? nc1(cfg) : d === 'nc2' ? nc2(cfg)
    : d === 'nc3' ? nc3(cfg) : d === 'ttc' ? ttc(cfg) : d === 'lxt' ? lxt(cfg) : generations(cfg);
  (cfg.checks || []).forEach(c => {
    if (res.entries.some(e => e.code === c)) res.issues.push({ es: `El testigo «${c}» repite el nombre de una entrada.`, en: `Check "${c}" repeats the name of an entry.` });
    else res.entries.push(entry(c, c, c, 'check'));
  });
  res.entries.forEach((e, i) => { e.entry = i + 1; });
  res.design = d; res.cfg = cfg;
  res.errors = res.issues.filter(x => x.level !== 'warning');
  res.warnings = res.issues.filter(x => x.level === 'warning');
  return res;
};

/* ---------------- seed and pollination budget ----------------
   o: seedsPerPlot, reps, locations, safety (fraction), seedsPerPollination,
      success (fraction), femaleUnitsPerPlant, pollinationsPerMale */
Mating.budget = (plan, o) => {
  const evalSeed = plan.design === 'generations'
    ? e => Math.ceil(e.plants * o.locations * (1 + o.safety))
    : () => Math.ceil(o.seedsPerPlot * o.reps * o.locations * (1 + o.safety));
  const yieldPer = o.seedsPerPollination * o.success;
  const perEntry = plan.entries.map(e => {
    const seed = evalSeed(e);
    const crossed = e.female !== e.male && e.type !== 'check';
    const polls = yieldPer > 0 ? Math.ceil(seed / yieldPer) : NaN;
    return { code: e.code, type: e.type, female: e.female, male: e.male, seed, pollinations: e.type === 'check' ? 0 : polls, kind: e.type === 'check' ? 'check' : crossed ? 'cross' : 'self' };
  });
  /* parents: female units (ears, heads, flowers) used and pollinations given as male */
  const byParent = new Map();
  const get = n => { if (!byParent.has(n)) byParent.set(n, { name: n, asFemale: 0, asMale: 0, selfs: 0 }); return byParent.get(n); };
  perEntry.forEach(x => {
    if (x.kind === 'check') return;
    if (x.kind === 'self') get(x.female).selfs += x.pollinations;
    else { get(x.female).asFemale += x.pollinations; get(x.male).asMale += x.pollinations; }
  });
  const parents = [...byParent.values()].map(p => Object.assign(p, {
    femalePlants: Math.ceil((p.asFemale + p.selfs) / Math.max(1, o.femaleUnitsPerPlant)),
    malePlants: Math.ceil(p.asMale / Math.max(1, o.pollinationsPerMale)),
  }));
  const warnings = [];
  /* single plants used as males (F2 plants, population plants) cannot be multiplied */
  if (['nc1', 'nc3', 'ttc'].includes(plan.design) || (plan.design === 'nc2' && plan.cfg.population)) {
    const maxUse = Math.max(0, ...parents.filter(p => p.asMale > 0).map(p => p.asMale));
    if (maxUse > o.pollinationsPerMale) warnings.push({
      es: `Cada macho es una sola planta y debe dar polen para ${maxUse} polinizaciones, más de las ${o.pollinationsPerMale} que se supusieron por planta. Reduzca la semilla por parcela, escalone las siembras de las hembras o use varias espigas (o flores) por planta.`,
      en: `Each male is a single plant and must supply pollen for ${maxUse} pollinations, more than the ${o.pollinationsPerMale} assumed per plant. Reduce seed per plot, stagger the planting of the females, or use several tassels (or flowers) per plant.` });
  }
  if (plan.design === 'nc2' && plan.cfg.population) {
    /* a population plant used as a female receives the pollen of every male of its set */
    const maxF = Math.max(0, ...parents.filter(p => p.asFemale > 0).map(p => p.asFemale));
    if (maxF > o.femaleUnitsPerPlant) warnings.push({
      es: `Cada hembra es una sola planta y recibe polen de los ${plan.cfg.m} machos de su conjunto: necesita ${maxF} polinizaciones, y con ${plural(o.femaleUnitsPerPlant, 'unidad femenina', 'unidades femeninas')} por planta no alcanzará la semilla. Use como hembras líneas o clones que puedan multiplicarse, o una especie con muchas flores por planta.`,
      en: `Each female is a single plant and receives pollen from the ${plan.cfg.m} males of its set: it needs ${maxF} pollinations, and with ${plural(o.femaleUnitsPerPlant, 'female unit', 'female units')} per plant there will not be enough seed. Use lines or clones that can be multiplied as females, or a species with many flowers per plant.` });
  }
  if (plan.design === 'nc1') {
    const maxF = Math.max(0, ...parents.filter(p => p.asFemale > 0).map(p => p.asFemale));
    if (maxF > o.femaleUnitsPerPlant) warnings.push({
      es: `Cada hembra de Carolina del Norte I es una planta distinta y necesita ${maxF} polinizaciones; con ${plural(o.femaleUnitsPerPlant, 'unidad femenina', 'unidades femeninas')} por planta no alcanzará la semilla.`,
      en: `Each North Carolina I female is a different plant and needs ${maxF} pollinations; with ${plural(o.femaleUnitsPerPlant, 'female unit', 'female units')} per plant there will not be enough seed.` });
  }
  const sum = f => perEntry.reduce((s, x) => s + f(x), 0);
  return {
    perEntry, parents, warnings,
    totals: {
      seed: sum(x => x.seed),
      crossPollinations: sum(x => x.kind === 'cross' ? x.pollinations : 0),
      selfPollinations: sum(x => x.kind === 'self' ? x.pollinations : 0),
      femalePlants: parents.reduce((s, p) => s + p.femalePlants, 0),
      malePlants: parents.reduce((s, p) => s + p.malePlants, 0),
    },
  };
};

/* ---------------- season calendar ---------------- */
const task = (es, en) => ({ es, en });
Mating.seasons = (plan, o) => {
  const d = plan.design, cfg = plan.cfg, L = o.locations, r = o.reps;
  const evalTask = task(`Evaluación de ${plan.entries.length} entradas: ${plural(r, 'repetición', 'repeticiones')} × ${plural(L, 'localidad', 'localidades')}`, `Evaluation of ${plan.entries.length} entries: ${plural(r, 'replicate', 'replicates')} × ${plural(L, 'location', 'locations')}`);
  const S = [];
  if (d === 'griffing' || d === 'partial' || d === 'lxt') {
    const rec = plan.crosses.some(c => c.type === 'reciprocal');
    S.push({ title: task('Bloque de cruzamiento', 'Crossing block'), tasks: [
      task(`${plan.crosses.length} cruzas${rec ? ' (directas y recíprocas)' : ''} con polinización controlada`, `${plan.crosses.length} crosses${rec ? ' (direct and reciprocal)' : ''} by controlled pollination`),
      task('Autofecundar los progenitores para renovar su semilla', 'Self the parents to renew their seed'),
      task('Siembras escalonadas si los progenitores no florecen al mismo tiempo', 'Staggered sowings if the parents do not flower together'),
    ] });
    S.push({ title: task('Evaluación', 'Evaluation'), tasks: [evalTask] });
  } else if (d === 'nc1' || d === 'nc2') {
    S.push({ title: task('Bloque de cruzamiento', 'Crossing block'), tasks: [
      task(d === 'nc1' ? `${cfg.m * cfg.sets} machos, cada uno con ${cfg.f} hembras distintas tomadas al azar de la población` : `${plural(cfg.sets, 'conjunto', 'conjuntos')} de ${cfg.m} × ${cfg.f}: todos los machos con todas las hembras`, d === 'nc1' ? `${cfg.m * cfg.sets} males, each with ${cfg.f} different females taken at random from the population` : `${plural(cfg.sets, 'set', 'sets')} of ${cfg.m} × ${cfg.f}: every male with every female`),
      d === 'nc1' ? task('Etiquetar cada planta; cada hembra se cruza con un solo macho', 'Label every plant; each female is crossed to one male only')
        : task('Etiquetar cada planta; cada hembra recibe polen de todos los machos de su conjunto', 'Label every plant; each female receives pollen from every male of its set'),
    ] });
    S.push({ title: task('Evaluación', 'Evaluation'), tasks: [evalTask, task('Conjuntos como experimentos separados, cada uno con sus repeticiones', 'Sets as separate experiments, each with its own replicates')] });
  } else if (d === 'nc3' || d === 'ttc') {
    if (!cfg.haveF2) {
      S.push({ title: task('Formar la F₁', 'Make the F₁'), tasks: [task(`${cfg.p1} × ${cfg.p2}`, `${cfg.p1} × ${cfg.p2}`), task('Autofecundar P₁ y P₂', 'Self P₁ and P₂')] });
      S.push({ title: task('Formar la F₂', 'Make the F₂'), tasks: [task('Autofecundar plantas F₁', 'Self F₁ plants'), d === 'ttc' ? task('Rehacer la F₁ para usarla como probador', 'Remake the F₁ to use it as a tester') : task('Incrementar P₁ y P₂', 'Increase P₁ and P₂')] });
    }
    S.push({ title: task('Retrocruzas de prueba', 'Test crosses'), tasks: [
      task(`${cfg.n} ${cfg.source === 'lines' ? 'líneas' : 'plantas F₂'} × ${d === 'ttc' ? 'P₁, P₂ y F₁' : 'P₁ y P₂'} (${plan.crosses.length} familias)`, `${cfg.n} ${cfg.source === 'lines' ? 'lines' : 'F₂ plants'} × ${d === 'ttc' ? 'P₁, P₂ and F₁' : 'P₁ and P₂'} (${plan.crosses.length} families)`),
      task('Cada macho da polen a todos sus probadores el mismo día', 'Each male pollinates all its testers on the same day'),
    ] });
    S.push({ title: task('Evaluación', 'Evaluation'), tasks: [evalTask, task('Las familias de un mismo macho, en parcelas contiguas o en el mismo bloque incompleto', 'Families of the same male in adjacent plots or the same incomplete block')] });
  } else {
    const has = g => cfg.gens.includes(g);
    S.push({ title: task('Formar la F₁', 'Make the F₁'), tasks: [task(`${cfg.p1} × ${cfg.p2}`, `${cfg.p1} × ${cfg.p2}`), has('RF1') ? task('Recíproca P₂ × P₁', 'Reciprocal P₂ × P₁') : null, task('Autofecundar P₁ y P₂', 'Self P₁ and P₂')].filter(Boolean) });
    S.push({ title: task('Generaciones segregantes', 'Segregating generations'), tasks: [
      task('Autofecundar F₁ → F₂', 'Self F₁ → F₂'),
      has('BC1') ? task('F₁ × P₁ → BC₁', 'F₁ × P₁ → BC₁') : null,
      has('BC2') ? task('F₁ × P₂ → BC₂', 'F₁ × P₂ → BC₂') : null,
      task('Rehacer la F₁ e incrementar P₁ y P₂ para evaluarlas juntas', 'Remake the F₁ and increase P₁ and P₂ so all are evaluated together'),
    ].filter(Boolean) });
    if (has('F3') || has('BC1S') || has('BC2S')) S.push({ title: task('Tercera generación', 'Third generation'), tasks: [
      has('F3') ? task('Autofecundar plantas F₂ → familias F₃', 'Self F₂ plants → F₃ families') : null,
      has('BC1S') ? task('Autofecundar BC₁', 'Self BC₁') : null, has('BC2S') ? task('Autofecundar BC₂', 'Self BC₂') : null,
    ].filter(Boolean) });
    S.push({ title: task('Evaluación conjunta', 'Joint evaluation'), tasks: [task('Todas las generaciones en el mismo ensayo y el mismo ciclo', 'All generations in the same trial and season'), evalTask] });
  }
  return S;
};

window.Mating = Mating;
