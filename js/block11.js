/* BreedingPro — Block 11 interface: genomics and hybrid prediction. Markers with quality control,
   the genomic relationship matrix and population structure, GBLUP with marker effects,
   cross-validation with the expected response per year, and the prediction of untested single,
   three-way and double crosses from two heterotic groups. */

(function () {
  const B11 = {
    src: null, D: null, Q: null, gr: null, kern: null, inv: null, pc: null,
    method: 'vr1', ridge: 0.001, wA: 0, qc: { maxMissMarker: 0.2, maxMissInd: 0.2, minMAF: 0.05 },
    phen: null, trait: 0, phenSource: 'example', fit: null, beta: null,
    cvModels: ['G'], folds: 5, reps: 2, refit: true, cv: null,
    hyb: null, hTrait: 0, hSCA: false, hres: null, hcv: null,
    built: false,
  };
  window.B11 = B11;

  const msg = (host, list) => { clearMessages(host); (list || []).forEach(x => showMessage(host, x.level === 'error' ? 'error' : x.level === 'warning' ? 'warning' : 'info', T(x))); };
  const table = (host, cols, rows, limit) => {
    host = typeof host === 'string' ? el(host) : host;
    const shown = limit ? rows.slice(0, limit) : rows;
    let h = '<table><thead><tr>' + cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('') + '</tr></thead><tbody>';
    shown.forEach(r => { h += `<tr class="${r._cls || ''}">` + cols.map(c => { const v = c.get(r); return `<td class="${c.num ? 'num' : ''}">${v == null || v === '' ? '—' : v}</td>`; }).join('') + '</tr>'; });
    h += '</tbody></table>';
    if (limit && rows.length > limit) h += `<p class="hint">${T(`Se muestran ${limit} de ${rows.length} filas.`, `Showing ${limit} of ${rows.length} rows.`)}</p>`;
    host.innerHTML = h;
  };
  function mountFig(hostId, spec, size) {
    const prev = Fig.registry[hostId];
    const keep = prev ? Object.assign({}, prev.cfg, size) : null;
    Fig.mount(hostId, Object.assign({ defaults: Object.assign({ palette: 'breeding' }, size) }, spec, keep ? { _cfg: keep } : {}));
  }
  const f4 = x => fmtFixed(x, 4);
  const pm = (v, se, d) => (isFinite(v) ? `${fmtNum(v, d || 4)}${isFinite(se) ? ` <span class="hint">± ${fmtNum(se, d || 4)}</span>` : ''}` : '—');
  const tiles = (host, items) => { el(host).innerHTML = items.map(([es, en, v, sub]) => `<div class="stat-tile"><div class="stat-label">${keepGreek(T(es, en))}</div><div class="stat-value">${v}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`).join(''); };
  const yieldUI = () => new Promise(r => setTimeout(r, 20));
  /* heavy work run from a click or a change: the LABG waiting window shows up if it lasts */
  const heavy = (es, en, f) => bpAfterPaint(f, bpWork(es, en));

  /* ================= examples ================= */
  const EX11 = [
    { id: 'wheat', es: 'Trigo CIMMYT: 599 líneas, 1279 DArT, 4 ambientes', en: 'CIMMYT wheat: 599 lines, 1279 DArT, 4 environments',
      load: () => ({ markers: GS.fromCompact(EXDATA11.wheatMarkers), phen: Data.table(Data.parseDelimited(EXDATA11.wheatPheno)) }),
      cite: { es: 'Crossa J, de los Campos G, Pérez P, Gianola D, Burgueño J, Araus JL, Makumbi D, Singh RP, Dreisigacker S, Yan J, Arief V, Bänziger M, Braun HJ (2010). Prediction of genetic values of quantitative traits in plant breeding using pedigree and molecular markers. Genetics 186: 713–724. Datos del Centro Internacional de Mejoramiento de Maíz y Trigo (CIMMYT) distribuidos con software libre bajo la licencia GPL.', en: 'Crossa J, de los Campos G, Pérez P, Gianola D, Burgueño J, Araus JL, Makumbi D, Singh RP, Dreisigacker S, Yan J, Arief V, Bänziger M, Braun HJ (2010). Prediction of genetic values of quantitative traits in plant breeding using pedigree and molecular markers. Genetics 186: 713–724. Data of the International Maize and Wheat Improvement Center (CIMMYT) distributed with free software under the GPL.' } },
    { id: 'technow', es: 'Maíz dentado × cristalino: 1254 híbridos', en: 'Dent × Flint maize: 1254 hybrids',
      load: () => ({ markers: GS.fromCompact(EXDATA11.technowMarkers), hyb: Data.table(Data.parseDelimited(EXDATA11.technowPheno)) }),
      cite: { es: 'Technow F, Schrag TA, Schipprack W, Bauer E, Simianer H, Melchinger AE (2014). Genome properties and prospects of genomic prediction of hybrid performance in a breeding program of maize. Genetics 197: 1343–1355. Datos distribuidos con software libre bajo la licencia GPL; aquí, 2000 de los 35 478 SNP (polimórficos y espaciados de manera uniforme).', en: 'Technow F, Schrag TA, Schipprack W, Bauer E, Simianer H, Melchinger AE (2014). Genome properties and prospects of genomic prediction of hybrid performance in a breeding program of maize. Genetics 197: 1343–1355. Data distributed with free software under the GPL; here 2000 of the 35 478 SNPs (polymorphic, evenly spaced).' } },
    { id: 'simLines', es: 'Simulado: 300 líneas, 1000 SNP, h² = 0.4', en: 'Simulated: 300 lines, 1000 SNPs, h² = 0.4',
      load: () => { const s = GS.simLines(); return { markers: GS.fromCompact(s.markersText), phen: Data.table(s.pheno), truth: s.truth, params: s.params }; },
      cite: { es: 'Simulado por BreedingPro con semilla fija: 300 líneas doble haploides de una población con 12 generaciones de apareamiento al azar, 1000 SNP y 60 QTL fuera del panel; σ²G = 1, σ²e = 1.5.', en: 'Simulated by BreedingPro with a fixed seed: 300 doubled-haploid lines from a population after 12 generations of random mating, 1000 SNPs and 60 QTL off the panel; σ²G = 1, σ²e = 1.5.' } },
    { id: 'simHyb', es: 'Simulado: híbridos de dos grupos, 200 de 750', en: 'Simulated: two-group hybrids, 200 of 750', load: () => { const s = GS.simHybrids(); return { markers: GS.fromCompact(s.markersText), hyb: Data.table(s.pheno), truth: s.truth, params: s.params }; },
      cite: { es: 'Simulado por BreedingPro con semilla fija: 30 líneas dentadas y 25 cristalinas de dos grupos heteróticos, 800 SNP y 100 QTL con efectos aditivos y de dominancia; se evalúan 200 de las 750 cruzas simples y se conoce el valor verdadero de todas.', en: 'Simulated by BreedingPro with a fixed seed: 30 dent and 25 flint lines from two heterotic groups, 800 SNPs and 100 QTL with additive and dominance effects; 200 of the 750 single crosses are evaluated and the true value of all is known.' } },
  ];

  function loadExample(id) {
    const e = EX11.find(x => x.id === id);
    const got = e.load();
    B11.src = { id, name: T(e.es, e.en), cite: e.cite, truth: got.truth || null, params: got.params || null };
    B11.D = got.markers;
    B11.phen = got.phen ? phenFrom(got.phen) : null;
    B11.hyb = got.hyb ? hybFrom(got.hyb) : null;
    B11.phenSource = B11.phen ? 'example' : (state.data ? 'block3' : 'example');
    resetResults();
    process();
  }
  const phenFrom = tab => {
    const traits = tab.header.slice(1).filter((h, j) => tab.rows.some(r => isFinite(parseFloat(r[j + 1]))));
    return { tab, idCol: 0, traits };
  };
  const hybFrom = tab => {
    const traits = tab.header.slice(2).filter((h, j) => tab.rows.some(r => isFinite(parseFloat(r[j + 2]))));
    return { tab, traits };
  };
  function resetResults() {
    B11.fit = null; B11.beta = null; B11.cv = null; B11.hres = null; B11.hcv = null; B11.trait = 0; B11.hTrait = 0;
    /* the inputs of the response per year belong to the previous data */
    if (el('b11SigA')) { el('b11SigA').value = ''; el('b11Hp').value = ''; }
  }

  /* ================= 1 · markers ================= */
  function process() {
    if (!B11.D) { renderAll(); return; }
    B11.Q = GS.qc(B11.D, B11.qc);
    rebuildG();
    renderAll();
  }
  function groupsOf(ids) {
    if (!B11.hyb) return null;
    const s1 = new Set(B11.hyb.tab.rows.map(r => String(r[0]))), s2 = new Set(B11.hyb.tab.rows.map(r => String(r[1])));
    const n1 = B11.hyb.tab.header[0], n2 = B11.hyb.tab.header[1];
    return ids.map(id => (s1.has(id) ? n1 : s2.has(id) ? n2 : T('sin híbridos', 'no hybrids')));
  }
  function pedA(ids) {
    /* the pedigree of Block 10, if it has these individuals */
    const P = window.B10 && B10.ped;
    if (!P) return null;
    const idx = ids.map(id => P.index.get(id));
    if (idx.some(k => k == null)) return null;
    const A = PED.A(P), n = ids.length, N = P.n, out = new Float64Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out[i * n + j] = A[idx[i] * N + idx[j]];
    return out;
  }
  function rebuildG() {
    const Q = B11.Q;
    B11.gr = GS.G(Q, { method: B11.method });
    B11.A = pedA(Q.ids);
    B11.kern = GS.kernel(B11.gr.G, Q.n, { ridge: B11.ridge, A: B11.A, w: B11.A ? B11.wA : 0 });
    B11.inv = GS.invert(B11.kern.K, Q.n);
    B11.pc = GS.pca(B11.gr.G, Q.n, 3);
    B11.fit = null; B11.beta = null; B11.cv = null; B11.hres = null; B11.hcv = null;
  }
  function renderMarkers() {
    el('b11ExRow').innerHTML = EX11.map(e => `<button type="button" class="btn btn-secondary btn-sm${B11.src && B11.src.id === e.id ? ' active' : ''}" data-ex11="${e.id}">${T(e.es, e.en)}</button>`).join('');
    el('b11ExRow').querySelectorAll('[data-ex11]').forEach(b => b.addEventListener('click', () => heavy('Preparando los marcadores', 'Preparing the markers', () => loadExample(b.dataset.ex11))));
    const box = el('b11MarkBox');
    if (!B11.Q) { box.style.display = 'none'; el('b11Source').innerHTML = T('Elija un ejemplo o cargue un archivo de marcadores: una fila por individuo, la primera columna con su identificador y una columna por marcador (0/1/2, −1/0/1, 0/1 o letras como AA/AB/BB).', 'Pick an example or load a marker file: one row per individual, the first column with its identifier and one column per marker (0/1/2, −1/0/1, 0/1 or letters such as AA/AB/BB).'); return; }
    box.style.display = '';
    const src = B11.src, Q = B11.Q, D = B11.D;
    el('b11Source').innerHTML = `<b>${esc(src.name)}</b> · <span class="hint">${esc(typeof src.cite === 'string' ? src.cite : T(src.cite))}</span>`;
    const codingName = { dosage: T('dosis 0/1/2', 'dosage 0/1/2'), minus1: T('−1/0/1 (se suma 1)', '−1/0/1 (1 is added)'), binary: T('binaria 0/1 de líneas puras → 0/2', 'binary 0/1 of pure lines → 0/2'), letters: T('letras (alelo contado por marcador)', 'letters (allele counted per marker)') }[D.coding] || D.coding;
    const meanMaf = Q.maf.reduce((s, v) => s + v, 0) / Q.m, meanHet = Q.hetInd.filter(isFinite).reduce((s, v) => s + v, 0) / Q.n;
    tiles('b11MarkTiles', [
      ['Individuos', 'Individuals', Q.n, Q.dropped.individuals ? T(`${Q.dropped.individuals} omitidos`, `${Q.dropped.individuals} left out`) : ''],
      ['Marcadores leídos', 'Markers read', D.m], ['Marcadores usados', 'Markers used', Q.m],
      ['Omitidos', 'Left out', Q.dropped.rare + Q.dropped.mono + Q.dropped.missing, T(`MAF ${Q.dropped.rare} · monomórficos ${Q.dropped.mono} · faltantes ${Q.dropped.missing}`, `MAF ${Q.dropped.rare} · monomorphic ${Q.dropped.mono} · missing ${Q.dropped.missing}`)],
      ['Genotipos imputados', 'Imputed genotypes', fmtNum(100 * Q.imputed / (Q.n * Q.m), 2) + ' %'],
      ['MAF media', 'Mean MAF', fmtFixed(meanMaf, 3)], ['Heterocigosis media', 'Mean heterozygosity', fmtFixed(meanHet, 3)],
    ]);
    el('b11MarkNote').innerHTML = T(
      `Codificación detectada: ${codingName}. Se omiten los marcadores con más de ${fmtNum(100 * B11.qc.maxMissMarker, 0)} % de datos faltantes, los monomórficos y los de frecuencia del alelo menor (MAF) por debajo de ${B11.qc.minMAF}; los individuos con más de ${fmtNum(100 * B11.qc.maxMissInd, 0)} % faltante. Los datos que faltan se reemplazan por la dosis media 2p del marcador.`,
      `Coding detected: ${codingName}. Markers with more than ${fmtNum(100 * B11.qc.maxMissMarker, 0)} % missing data, monomorphic ones and those with minor-allele frequency (MAF) below ${B11.qc.minMAF} are left out; so are individuals with more than ${fmtNum(100 * B11.qc.maxMissInd, 0)} % missing. Missing data are replaced by the mean dosage 2p of the marker.`);
    mountFig('b11FigMaf', {
      title: () => T('Frecuencia del alelo menor', 'Minor-allele frequency'), fileName: 'maf',
      render: c => P11.hist(c, Q.maf, { titleEs: 'Frecuencia del alelo menor', titleEn: 'Minor-allele frequency', xlab: 'MAF', lo: 0, hi: 0.5, bins: 25 }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 720, height: 400 });
    const groups = groupsOf(Q.ids);
    mountFig('b11FigPca', {
      title: () => T('Estructura: componentes principales de G', 'Structure: principal components of G'), fileName: 'pca_G',
      render: c => P11.pca(c, B11.pc, Q.ids, groups),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 760, height: 560 });
  }

  /* ================= 2 · G ================= */
  function renderG() {
    const box = el('b11GBox');
    if (!B11.Q) { box.style.display = 'none'; return; }
    box.style.display = '';
    const Q = B11.Q, n = Q.n, st = GS.stats(B11.gr.G, n);
    el('b11Method').value = B11.method;
    el('b11Ridge').value = String(B11.ridge);
    el('b11BlendField').style.display = B11.A ? '' : 'none';
    el('b11WA').value = String(B11.wA);
    const items = [['Diagonal media', 'Mean diagonal', fmtFixed(st.meanDiag, 4)], ['Fuera de la diagonal', 'Off-diagonal mean', fmtFixed(st.meanOff, 4)], ['Semivarianza media', 'Average semivariance', fmtFixed(st.asv, 4), T('de G, sin la cresta', 'of G, without the ridge')], ['Rango fuera de la diagonal', 'Off-diagonal range', `${fmtFixed(st.offMin, 3)} ${T('a', 'to')} ${fmtFixed(st.offMax, 3)}`], ['Diagonal', 'Diagonal', `${fmtFixed(st.diagMin, 3)} ${T('a', 'to')} ${fmtFixed(st.diagMax, 3)}`]];
    if (!B11.inv) items.push(['Aviso', 'Warning', T('G + λI no es definida positiva', 'G + λI is not positive definite')]);
    tiles('b11GTiles', items);
    el('b11GNote').innerHTML = T(
      `${B11.method === 'vr2' ? 'VanRaden (2008) método 2: G = Z*Z*′/m con cada marcador estandarizado por √(2pq).' : 'VanRaden (2008) método 1: G = ZZ′/(2Σpq), Z = M − 2P.'} Con las frecuencias alélicas de los propios datos la media de G es 0 y G es singular; para invertirla se suma λ = ${fmtNum(B11.kern.ridge, 4)} (${B11.ridge} × diagonal media) a la diagonal${B11.A && B11.wA ? ` y se mezcla con el parentesco del pedigrí: K = ${1 - B11.wA}G + ${B11.wA}A` : ''}. En líneas homocigotas codificadas 0/2 la diagonal ronda 2 = 1 + F, en la misma escala que A.`,
      `${B11.method === 'vr2' ? 'VanRaden (2008) method 2: G = Z*Z*′/m with every marker standardized by √(2pq).' : 'VanRaden (2008) method 1: G = ZZ′/(2Σpq), Z = M − 2P.'} With the allele frequencies of the data themselves the mean of G is 0 and G is singular; to invert it λ = ${fmtNum(B11.kern.ridge, 4)} (${B11.ridge} × mean diagonal) is added to the diagonal${B11.A && B11.wA ? ` and it is blended with the pedigree relationships: K = ${1 - B11.wA}G + ${B11.wA}A` : ''}. In homozygous lines coded 0/2 the diagonal is near 2 = 1 + F, on the same scale as A.`);
    /* the matrix, ordered by the first component and averaged in blocks when large */
    const order = Q.ids.map((_, i) => i).sort((a, b) => B11.pc.scores[a][0] - B11.pc.scores[b][0]);
    const k = Math.ceil(n / 120), nb = Math.ceil(n / k);
    const Mb = new Float64Array(nb * nb), cnt = new Float64Array(nb * nb);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) { const i = Math.floor(a / k), j = Math.floor(b / k); Mb[i * nb + j] += B11.gr.G[order[a] * n + order[b]]; cnt[i * nb + j]++; }
    for (let t = 0; t < nb * nb; t++) Mb[t] /= cnt[t];
    const labs = Array.from({ length: nb }, (_, i) => (k === 1 ? Q.ids[order[i]] : `${i * k + 1}–${Math.min(n, (i + 1) * k)}`));
    mountFig('b11FigG', {
      title: () => T('Matriz de parentesco genómico', 'Genomic relationship matrix'), fileName: 'G_matrix',
      render: c => P11.matrix(c, { titleEs: 'Matriz de parentesco genómico G', titleEn: 'Genomic relationship matrix G', M: Mb, rows: labs, cols: labs, colormap: 'heat', barLabel: 'G', note: k > 1 ? T(`Individuos ordenados por el primer componente; cada celda es el promedio de bloques de ${k}.`, `Individuals ordered by the first component; every cell is the average of blocks of ${k}.`) : T('Individuos ordenados por el primer componente.', 'Individuals ordered by the first component.') }),
      controls: () => [P2.titleControl(), { key: 'colormap', label: T('Colores', 'Colours'), type: 'select', options: Object.entries(Fig.colormapNames) }],
    }, { width: 760, height: 720, colormap: 'heat' });
    el('b11GABox').style.display = B11.A ? '' : 'none';
    if (B11.A) {
      const xs = [], ys = [];
      for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { xs.push(B11.A[i * n + j]); ys.push(B11.gr.G[i * n + j]); }
      const r = S.pearson(xs, ys);
      mountFig('b11FigGA', {
        title: () => T('Parentesco genómico contra pedigrí', 'Genomic against pedigree relationships'), fileName: 'G_vs_A',
        render: c => P11.scatter(c, { titleEs: 'G contra A', titleEn: 'G against A', x: xs, y: ys, xlab: T('A (pedigrí)', 'A (pedigree)'), ylab: T('G (marcadores)', 'G (markers)'), sameScale: true, r: 2.2, alpha: 0.35, note: `r = ${fmtFixed(r, 3)}` }),
        controls: () => [P2.titleControl(), P2.paletteControl()],
      }, { width: 700, height: 600 });
    }
  }

  /* ================= 3 · GBLUP ================= */
  function phenRecords() {
    const P = B11.phen, Q = B11.Q;
    if (B11.phenSource === 'block3') return null;
    if (!P) return null;
    const j = P.tab.header.indexOf(P.traits[B11.trait]);
    return P.tab.rows.map(r => ({ id: String(r[0]).trim(), y: parseFloat(r[j]), fixed: {}, random: {} }));
  }
  function renderGblupForm() {
    const box = el('b11GblupBox');
    if (!B11.Q) { box.style.display = 'none'; return; }
    box.style.display = '';
    const opts = [];
    if (B11.phen) opts.push(['example', T('fenotipos cargados con los marcadores', 'phenotypes loaded with the markers')]);
    if (state.data && state.data.mating.design !== 'generations') opts.push(['block3', T('ensayo del Bloque 3 (parcelas, una etapa)', 'Block 3 trial (plots, one stage)')]);
    el('b11PhenSource').innerHTML = opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    if (!opts.some(o => o[0] === B11.phenSource)) B11.phenSource = opts.length ? opts[0][0] : '';
    el('b11PhenSource').value = B11.phenSource;
    const traits = B11.phenSource === 'block3' ? state.data.ds.traits.map(t => t.name) : B11.phen ? B11.phen.traits : [];
    if (B11.trait >= traits.length) B11.trait = 0;
    el('b11Trait').innerHTML = traits.map((t, j) => `<option value="${j}">${esc(t)}</option>`).join('');
    el('b11Trait').value = String(B11.trait);
    el('b11RunG').disabled = !traits.length || !B11.inv;
    if (B11.phenSource === 'block3') {
      const ents = [...new Set(Data.entryTable(state.data.ds).map(e => String(e.name)))], known = new Set(B11.Q.ids);
      const hit = ents.filter(e => known.has(e)).length;
      msg('b11GblupMsg', [{ level: hit ? 'info' : 'warning', es: `${hit} de ${ents.length} entradas del ensayo tienen marcadores${hit < ents.length ? '; las demás se omiten' : ''}.`, en: `${hit} of ${ents.length} entries of the trial have markers${hit < ents.length ? '; the others are left out' : ''}.` }]);
      if (!hit) el('b11RunG').disabled = true;
    } else if (opts.length) clearMessages('b11GblupMsg');
    if (!opts.length) msg('b11GblupMsg', [{ level: 'info', es: 'Cargue fenotipos: con un ejemplo, con un archivo (identificador y variables) o con un ensayo en el Bloque 3 cuyos genotipos tengan marcadores.', en: 'Load phenotypes: with an example, with a file (identifier and traits) or with a trial in Block 3 whose genotypes have markers.' }]);
  }
  async function runGblup() {
    const Q = B11.Q;
    msg('b11GblupMsg', [{ level: 'info', es: 'Calculando…', en: 'Computing…' }]);
    el('b11RunG').disabled = true;
    const w = bpWork('Ajustando el GBLUP', 'Fitting GBLUP');
    await bpAfterPaint(() => { try {
      const t0 = Date.now();
      let fit;
      if (B11.phenSource === 'block3') {
        const D = state.data;
        const T3 = AM.trial(D.ds, D.field, D.ds.traits[B11.trait], { excluded: D.excluded, genetic: 'A', K: { ids: Q.ids, K: B11.kern.K, Kinv: B11.inv.Kinv, logdet: B11.inv.logdet } });
        if (T3.error) { msg('b11GblupMsg', [{ level: 'error', es: T3.error, en: T3.error }]); return; }
        const s2g = T3.comp[0].sigma2, s2e = T3.comp[T3.comp.length - 1].sigma2, st = GS.stats(B11.kern.K, Q.n);
        const byId = new Map(T3.rows.map(r => [r.entry, r]));
        const add = T3.res.blups[T3.comp.findIndex(c => c.key === 'add')];
        fit = {
          s2g, s2e, se: [T3.comp[0].se, T3.comp[T3.comp.length - 1].se], boundary: !!T3.comp[0].boundary, h2: NaN, h2se: NaN, asv: st.asv, fixedMean: T3.fixedMean, comp: T3.comp, trial: T3,
          gebv: add.map((b, i) => ({ id: b.level, g: b.u, pred: T3.fixedMean + b.u, pev: b.pev, sep: Math.sqrt(Math.max(0, b.pev)), rel: Math.max(0, Math.min(1, 1 - b.pev / (B11.kern.K[i * Q.n + i] * s2g))), y: byId.has(b.level) ? byId.get(b.level).raw : NaN, nrec: byId.has(b.level) ? byId.get(b.level).n : 0 })),
          nPhen: T3.rows.length, n: Q.n, H2cullis: T3.H2cullis, issues: T3.issues,
        };
      } else {
        fit = GS.gblup(phenRecords(), Q.ids, B11.kern.K, B11.inv.Kinv, B11.inv.logdet, {});
        if (fit.error) { msg('b11GblupMsg', [{ level: 'error', es: fit.error, en: fit.error }]); return; }
      }
      fit.time = Date.now() - t0;
      B11.fit = fit;
      /* the response per year starts from this fit; the values can still be changed by hand */
      el('b11SigA').value = fmtFixed(Math.sqrt(fit.s2g * fit.asv), 4);
      el('b11Hp').value = isFinite(fit.h2) ? fmtFixed(Math.sqrt(fit.h2), 3) : '';
      B11.beta = B11.wA === 0 ? GS.markerEffects(B11.gr, B11.inv.Kinv, fit.gebv.map(e => e.g), Q.n) : null;
      const notes = (fit.issues || []).slice();
      notes.push({ level: 'info', es: `Listo en ${fmtNum(fit.time / 1000, 2)} s.`, en: `Done in ${fmtNum(fit.time / 1000, 2)} s.` });
      msg('b11GblupMsg', notes);
      renderGblup();
      renderCVForm();
    } finally { el('b11RunG').disabled = false; } }, w);
  }
  function renderGblup() {
    const F = B11.fit, host = el('b11GblupRes');
    if (!F) { host.style.display = 'none'; return; }
    host.style.display = '';
    const items = [['Individuos con marcadores', 'Individuals with markers', F.n], ['Con fenotipo', 'With phenotype', F.nPhen], ['σ²g', 'σ²g', F.boundary ? '0' : pm(F.s2g, F.se && F.se[0])], ['σ²e', 'σ²e', pm(F.s2e, F.se && F.se[1])]];
    if (isFinite(F.h2)) items.push(['h² genómica', 'Genomic h²', pm(F.h2, F.h2se, 3)]);
    if (isFinite(F.H2cullis)) items.push(['H² de Cullis', 'Cullis H²', fmtFixed(F.H2cullis, 3)]);
    tiles('b11GblupTiles', items);
    el('b11GblupNote').innerHTML = T(
      `GBLUP: y = μ + g + e con g ~ N(0, Kσ²g). ${B11.phenSource === 'block3' ? 'Modelo en una etapa sobre las parcelas del ensayo (ambientes y repeticiones fijos, genotipo × ambiente aleatorio). ' : ''}La heredabilidad genómica usa la varianza genética efectiva σ²g·SM, con SM = tr(K)/n − 1′K1/n² = ${fmtNum(F.asv, 4)} la semivarianza media de K (Legarra 2016; Feldmann y col. 2022): con líneas homocigotas SM ≈ 2 y la varianza entre líneas es el doble de σ²g. Es la varianza que capturan los marcadores: si parte de los QTL está en desequilibrio incompleto con ellos, sale menor que la heredabilidad verdadera (en las simulaciones de BreedingPro, 0.34 frente a 0.40). Confiabilidad = 1 − PEV/(K<sub>ii</sub>σ²g). Los individuos sin fenotipo reciben su valor genómico por su parentesco con los que sí tienen.`,
      `GBLUP: y = μ + g + e with g ~ N(0, Kσ²g). ${B11.phenSource === 'block3' ? 'One-stage model on the plots of the trial (environments and replicates fixed, genotype × environment random). ' : ''}Genomic heritability uses the effective genetic variance σ²g·ASV, with ASV = tr(K)/n − 1′K1/n² = ${fmtNum(F.asv, 4)} the average semivariance of K (Legarra 2016; Feldmann et al. 2022): with homozygous lines ASV ≈ 2 and the variance among lines is twice σ²g. It is the variance the markers capture: when part of the QTL are in incomplete disequilibrium with them it comes out below the true heritability (0.34 against 0.40 in the simulations of BreedingPro). Reliability = 1 − PEV/(K<sub>ii</sub>σ²g). Individuals without phenotype get their genomic value through their relationship with those that have one.`);
    const rows = F.gebv.slice().sort((a, b) => b.g - a.g);
    rows.forEach((r, i) => { r.rank = i + 1; r._cls = r.nrec ? '' : 'row-flag'; });
    table('b11Gebv', [
      { label: T('Lugar', 'Rank'), num: true, get: r => r.rank },
      { label: T('Individuo', 'Individual'), get: r => esc(r.id) },
      { label: T('Fenotipo', 'Phenotype'), num: true, get: r => (r.nrec ? f4(r.y) : `<span class="hint">${T('sin dato', 'none')}</span>`) },
      { label: T('Valor genómico (GEBV)', 'Genomic value (GEBV)'), num: true, get: r => `<b>${f4(r.g)}</b>` },
      { label: T('Predicho', 'Predicted'), num: true, get: r => f4(r.pred) },
      { label: T('EEP', 'SEP'), num: true, get: r => f4(r.sep) },
      { label: T('Confiabilidad', 'Reliability'), num: true, get: r => fmtFixed(r.rel, 3) },
    ], rows, 50);
    const withY = F.gebv.filter(e => e.nrec);
    const truth = B11.src && B11.src.truth && !B11.hyb ? B11.src.truth : null;
    el('b11GblupTruth').innerHTML = truth ? T(`Datos simulados: correlación del valor genómico con el verdadero ${fmtFixed(S.pearson(F.gebv.map(e => e.g), F.gebv.map(e => truth[e.id])), 3)} (con fenotipo; la validación cruzada mide la de individuos sin él).`, `Simulated data: correlation of the genomic value with the true one ${fmtFixed(S.pearson(F.gebv.map(e => e.g), F.gebv.map(e => truth[e.id])), 3)} (with phenotype; cross-validation measures it for individuals without one).`) : '';
    mountFig('b11FigGebv', {
      title: () => T('Fenotipo y valor genómico', 'Phenotype and genomic value'), fileName: 'gebv',
      render: c => P11.scatter(c, { titleEs: 'Fenotipo y valor predicho (GBLUP)', titleEn: 'Phenotype and predicted value (GBLUP)', x: withY.map(e => e.y), y: withY.map(e => e.pred), labels: withY.map(e => e.id), xlab: T('fenotipo', 'phenotype'), ylab: T('predicho', 'predicted'), sameScale: true, note: `r = ${fmtFixed(S.pearson(withY.map(e => e.y), withY.map(e => e.pred)), 3)}` }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 700, height: 600 });
    el('b11EffBox').style.display = B11.beta ? '' : 'none';
    if (B11.beta) {
      mountFig('b11FigEff', {
        title: () => T('Efectos de los marcadores', 'Marker effects'), fileName: 'marker_effects',
        render: c => P11.effects(c, B11.beta, B11.Q.markers),
        controls: () => [P2.titleControl(), P2.paletteControl()],
      }, { width: 900, height: 420 });
      const top = Array.from(B11.beta, (b, j) => ({ j, b })).sort((a, b) => Math.abs(b.b) - Math.abs(a.b)).slice(0, 15);
      table('b11EffTable', [
        { label: T('Marcador', 'Marker'), get: r => esc(B11.Q.markers[r.j]) },
        { label: T('Efecto de sustitución', 'Substitution effect'), num: true, get: r => fmtNum(r.b, 5) },
        { label: 'p', num: true, get: r => fmtFixed(B11.Q.p[r.j], 3) },
      ], top);
      el('b11EffNote').innerHTML = T(`RR-BLUP equivalente: β̂ = Z′K⁻¹ĝ/${B11.method === 'vr2' ? 'm (escala estandarizada)' : '2Σpq'}; con K = G exacto, Wβ̂ = ĝ salvo la pequeña cresta λ. Un efecto grande no es una asociación probada: GBLUP reparte el efecto entre marcadores en desequilibrio.`, `Equivalent RR-BLUP: β̂ = Z′K⁻¹ĝ/${B11.method === 'vr2' ? 'm (standardized scale)' : '2Σpq'}; with K = G exact, Wβ̂ = ĝ up to the small ridge λ. A large effect is not a proven association: GBLUP spreads the effect over markers in disequilibrium.`);
    }
  }

  /* ================= 4 · cross-validation ================= */
  function renderCVForm() {
    const box = el('b11CvBox');
    const ok = B11.Q && B11.inv && B11.phenSource !== 'block3' && B11.phen;
    box.style.display = ok ? '' : 'none';
    if (!ok) { msg('b11CvMsg', B11.Q ? [{ level: 'info', es: 'La validación cruzada usa fenotipos por individuo (ejemplo o archivo); con un ensayo del Bloque 3 use sus medias ajustadas como archivo de fenotipos.', en: 'Cross-validation uses phenotypes per individual (example or file); with a Block 3 trial use its adjusted means as a phenotype file.' }] : []); return; }
    clearMessages('b11CvMsg');
    el('b11CvA').disabled = !B11.A;
    el('b11Folds').value = String(B11.folds); el('b11Reps').value = String(B11.reps); el('b11Refit').checked = B11.refit;
    if (B11.fit) {
      const sa = Math.sqrt(B11.fit.s2g * B11.fit.asv);
      if (!el('b11SigA').value) el('b11SigA').value = fmtNum(sa, 4);
      if (!el('b11Hp').value && isFinite(B11.fit.h2)) el('b11Hp').value = fmtNum(Math.sqrt(B11.fit.h2), 3);
    }
  }
  async function runCV() {
    const Q = B11.Q, recs = phenRecords();
    const models = [{ key: 'G', name: T('GBLUP (G)', 'GBLUP (G)'), K: B11.kern.K, inv: B11.inv }];
    if (el('b11CvA').checked && B11.A) {
      const kA = GS.kernel(B11.A, Q.n, { ridge: 1e-6 }), iA = GS.invert(kA.K, Q.n);
      if (iA) models.push({ key: 'A', name: T('Pedigrí (A)', 'Pedigree (A)'), K: kA.K, inv: iA });
    }
    B11.folds = +el('b11Folds').value; B11.reps = +el('b11Reps').value; B11.refit = el('b11Refit').checked;
    el('b11RunCv').disabled = true;
    const truth = B11.src && B11.src.truth && !B11.hyb ? B11.src.truth : null;
    /* the window follows the folds; the seed and the order of the folds are the same as before */
    const w = bpWork('Validación cruzada genómica', 'Genomic cross-validation');
    await bpAfterPaint(async () => { try {
      const out = [];
      for (let q = 0; q < models.length; q++) {
        const m = models[q];
        const cv = await GS.cv(recs, Q.ids, m.K, m.inv.Kinv, m.inv.logdet, { folds: B11.folds, reps: B11.reps, refit: B11.refit, seed: 20260918, truth }, async p => { msg('b11CvMsg', [{ level: 'info', es: `${m.name}: ${fmtNum(100 * p, 0)} %…`, en: `${m.name}: ${fmtNum(100 * p, 0)} %…` }]); if (w) w.update((q + p) / models.length, `${m.name}: ${fmtNum(100 * p, 0)} %`); await yieldUI(); });
        out.push(Object.assign({}, m, { cv }));
      }
      B11.cv = out;
      clearMessages('b11CvMsg');
      renderCV();
    } finally { el('b11RunCv').disabled = false; } }, w);
  }
  function renderCV() {
    const C = B11.cv, host = el('b11CvRes');
    if (!C) { host.style.display = 'none'; return; }
    host.style.display = '';
    const h2 = B11.fit ? B11.fit.h2 : NaN;
    const truth = C.some(m => isFinite(m.cv.rTrue));
    table('b11CvTable', [
      { label: T('Modelo', 'Model'), get: r => r.name },
      { label: T('r(predicho, observado)', 'r(predicted, observed)'), num: true, get: r => `<b>${fmtFixed(r.cv.r, 3)}</b>${isFinite(r.cv.rSD) ? ` <span class="hint">± ${fmtFixed(r.cv.rSD, 3)}</span>` : ''}` },
      { label: T('r/√h² (aprox.)', 'r/√h² (approx.)'), num: true, get: r => (isFinite(h2) ? fmtFixed(r.cv.r / Math.sqrt(h2), 3) : '') },
      { label: T('Pendiente', 'Slope'), num: true, get: r => fmtFixed(r.cv.slope, 3) },
      { label: T('ECM', 'MSE'), num: true, get: r => f4(r.cv.mse) },
    ].concat(truth ? [{ label: T('Exactitud verdadera', 'True accuracy'), num: true, get: r => `${fmtFixed(r.cv.rTrue, 3)}${isFinite(r.cv.rTrueSD) ? ` <span class="hint">± ${fmtFixed(r.cv.rTrueSD, 3)}</span>` : ''}` }] : []), C);
    el('b11CvNote').innerHTML = T(
      `Validación cruzada de ${C[0].cv.folds} grupos con ${plural(C[0].cv.reps.length, 'repetición', 'repeticiones')}: cada individuo con fenotipo se predice una vez por repetición desde un modelo ajustado sin él (esquema CV1, individuos nuevos). ${C[0].cv.refit ? 'Las varianzas se vuelven a estimar por REML en cada conjunto de entrenamiento; estimarlas con todos los datos antes de dividirlos infla la capacidad predictiva.' : 'Las varianzas se fijaron con todos los datos: la capacidad predictiva sale algo optimista.'} La exactitud se aproxima con r/√h² usando la h² genómica; la pendiente de la regresión del observado sobre el predicho cerca de 1 indica predicciones sin sesgo de escala.`,
      `${C[0].cv.folds}-fold cross-validation with ${plural(C[0].cv.reps.length, 'replicate', 'replicates')}: every individual with a phenotype is predicted once per replicate from a model fitted without it (scheme CV1, new individuals). ${C[0].cv.refit ? 'Variances are re-estimated by REML in every training set; estimating them with all the data before splitting inflates predictive ability.' : 'Variances were fixed with all the data: predictive ability comes out somewhat optimistic.'} Accuracy is approximated by r/√h² with the genomic h²; a slope of the regression of observed on predicted near 1 means predictions without scale bias.`);
    mountFig('b11FigCv', {
      title: () => T('Capacidad predictiva', 'Predictive ability'), fileName: 'cross_validation',
      render: c => P11.cv(c, C),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 640, height: 420 });
    renderResponse();
  }
  function renderResponse() {
    const C = B11.cv;
    if (!C) return;
    const i = SEL.intensity(parseFloat(el('b11Prop').value) || 0.1);
    const sa = parseFloat(el('b11SigA').value), hp = parseFloat(el('b11Hp').value), Lp = parseFloat(el('b11Lp').value), Lg = parseFloat(el('b11Lg').value);
    const h2 = B11.fit ? B11.fit.h2 : NaN;
    const r = C[0].cv.r / Math.sqrt(isFinite(h2) ? h2 : 1);
    const R = GS.response({ i, h: hp, r: Math.min(1, r), sigmaA: sa, Lp, Lg });
    el('b11Resp').innerHTML = T(
      `Con i = ${fmtFixed(i, 3)}, σ<sub>A</sub> = ${fmtNum(sa, 4)}: selección fenotípica ${fmtNum(R.pheno, 4)} por año (exactitud ${fmtFixed(hp, 3)}, ${fmtNum(Lp, 2)} años por ciclo); selección genómica ${fmtNum(R.genomic, 4)} por año (exactitud ${fmtFixed(Math.min(1, r), 3)}, ${fmtNum(Lg, 2)} años por ciclo). Cociente ${fmtNum(R.genomic / R.pheno, 3)}. ΔG/año = i·r·σ<sub>A</sub>/L (Heffner y col. 2010).`,
      `With i = ${fmtFixed(i, 3)}, σ<sub>A</sub> = ${fmtNum(sa, 4)}: phenotypic selection ${fmtNum(R.pheno, 4)} per year (accuracy ${fmtFixed(hp, 3)}, ${fmtNum(Lp, 2)} years per cycle); genomic selection ${fmtNum(R.genomic, 4)} per year (accuracy ${fmtFixed(Math.min(1, r), 3)}, ${fmtNum(Lg, 2)} years per cycle). Ratio ${fmtNum(R.genomic / R.pheno, 3)}. ΔG/year = i·r·σ<sub>A</sub>/L (Heffner et al. 2010).`);
  }

  /* ================= 5 · hybrids ================= */
  function groupKernels() {
    const Q = B11.Q, H = B11.hyb;
    const s1 = [...new Set(H.tab.rows.map(r => String(r[0]).trim()))], s2 = [...new Set(H.tab.rows.map(r => String(r[1]).trim()))];
    const idx = new Map(Q.ids.map((id, i) => [id, i]));
    const g1 = s1.filter(id => idx.has(id)), g2 = s2.filter(id => idx.has(id));
    const sub = ids => {
      const rows = ids.map(id => idx.get(id));
      const n = ids.length, m = Q.m;
      const M = new Float64Array(n * m), p = new Float64Array(m);
      rows.forEach((i, r) => { for (let j = 0; j < m; j++) { const v = Q.M[i * m + j]; M[r * m + j] = v; p[j] += v; } });
      for (let j = 0; j < m; j++) p[j] /= 2 * n;
      /* markers fixed within a group carry no information on relationships inside it */
      const G = GS.G({ n, m, M, p, ids }, { method: B11.method });
      return GS.kernel(G.G, n, { ridge: Math.max(B11.ridge, 1e-3) }).K;
    };
    return { g1, g2, K1: sub(g1), K2: sub(g2), missing: s1.length - g1.length + s2.length - g2.length };
  }
  function renderHybForm() {
    const box = el('b11HybBox');
    const ok = B11.Q && B11.hyb;
    box.style.display = ok ? '' : 'none';
    if (!ok) { msg('b11HybMsg', B11.Q ? [{ level: 'info', es: 'Para predecir híbridos cargue una tabla con las columnas del progenitor de cada grupo heterótico y las variables (un ejemplo de híbridos o un archivo), con los marcadores de todos los progenitores.', en: 'To predict hybrids load a table with the columns of the parent of each heterotic group and the traits (a hybrid example or a file), with the markers of all the parents.' }] : []); return; }
    clearMessages('b11HybMsg');
    el('b11HTrait').innerHTML = B11.hyb.traits.map((t, j) => `<option value="${j}">${esc(t)}</option>`).join('');
    el('b11HTrait').value = String(B11.hTrait);
    const nH = new Set(B11.hyb.tab.rows.map(r => r[0] + '×' + r[1])).size;
    el('b11HSCA').disabled = nH > 700;
    if (nH > 700) { el('b11HSCA').checked = false; B11.hSCA = false; }
    el('b11HSCAnote').innerHTML = nH > 700 ? T(`Con ${nH} híbridos el núcleo de ACE (${nH} × ${nH}) es demasiado grande para resolverlo aquí de forma exacta; se usa el modelo de ACG.`, `With ${nH} hybrids the SCA kernel (${nH} × ${nH}) is too large to solve exactly here; the GCA model is used.`) : '';
  }
  function hybRecords() {
    const H = B11.hyb, j = H.tab.header.indexOf(H.traits[B11.hTrait]);
    return H.tab.rows.map(r => ({ p1: String(r[0]).trim(), p2: String(r[1]).trim(), y: parseFloat(r[j]) }));
  }
  async function runHyb() {
    msg('b11HRunMsg', [{ level: 'info', es: 'Calculando…', en: 'Computing…' }]);
    el('b11RunH').disabled = true;
    const w = bpWork('Ajustando el modelo de híbridos', 'Fitting the hybrid model');
    await bpAfterPaint(() => { try {
      const k = groupKernels();
      const t0 = Date.now();
      const res = GS.hybrid(hybRecords(), k.g1, k.K1, k.g2, k.K2, { sca: B11.hSCA });
      if (res.error) { msg('b11HRunMsg', [{ level: 'error', es: res.error, en: res.error }]); return; }
      res.time = Date.now() - t0;
      res.kern = k;
      res.asv1 = GS.stats(k.K1, k.g1.length).asv; res.asv2 = GS.stats(k.K2, k.g2.length).asv;
      B11.hres = res; B11.hcv = null;
      msg('b11HRunMsg', (k.missing ? [{ level: 'warning', es: `${plural(k.missing, 'progenitor sin marcadores se omite', 'progenitores sin marcadores se omiten')}.`, en: `${plural(k.missing, 'parent without markers is left out', 'parents without markers are left out')}.` }] : []).concat([{ level: 'info', es: `Listo en ${fmtNum(res.time / 1000, 2)} s.`, en: `Done in ${fmtNum(res.time / 1000, 2)} s.` }]));
      renderHyb();
    } finally { el('b11RunH').disabled = false; } }, w);
  }
  function renderHyb() {
    const H = B11.hres, host = el('b11HybRes');
    if (!H) { host.style.display = 'none'; return; }
    host.style.display = '';
    const n1 = H.ids1.length, n2 = H.ids2.length;
    const cName = k => ({ gca1: T(`ACG del grupo 1 (${B11.hyb.tab.header[0]})`, `GCA of group 1 (${B11.hyb.tab.header[0]})`), gca2: T(`ACG del grupo 2 (${B11.hyb.tab.header[1]})`, `GCA of group 2 (${B11.hyb.tab.header[1]})`), sca: T('ACE', 'SCA'), e: T('residual', 'residual') }[k]);
    const th = H.comp;
    tiles('b11HTiles', [['Híbridos evaluados', 'Hybrids evaluated', H.nCross], ['Cruzas posibles', 'Possible crosses', n1 * n2], ['Líneas', 'Lines', `${n1} × ${n2}`]].concat(th.map(c => [cName(c.key), cName(c.key), c.boundary ? `0 <span class="hint">${T('(en la frontera)', '(at the boundary)')}</span>` : pm(c.sigma2, c.se)])));
    table('b11HComp', [
      { label: T('Componente', 'Component'), get: r => cName(r.key) },
      { label: T('Varianza', 'Variance'), num: true, get: r => (r.boundary ? '0' : fmtNum(r.sigma2, 5)) },
      { label: T('EE', 'SE'), num: true, get: r => (r.boundary ? '' : fmtNum(r.se, 4)) },
    ], th);
    /* all crosses */
    const all = [];
    H.ids1.forEach(a => H.ids2.forEach(b => all.push(H.predict(a, b))));
    B11.hAll = all;
    const untested = all.filter(p => !p.tested).sort((a, b) => b.pred - a.pred);
    table('b11HTop', [
      { label: T('Híbrido', 'Hybrid'), get: r => esc(r.p1 + ' × ' + r.p2) },
      { label: T('ACG 1', 'GCA 1'), num: true, get: r => f4(r.gca1) },
      { label: T('ACG 2', 'GCA 2'), num: true, get: r => f4(r.gca2) },
      ...(H.sca ? [{ label: T('ACE', 'SCA'), num: true, get: r => f4(r.sca) }] : []),
      { label: T('Predicho', 'Predicted'), num: true, get: r => `<b>${f4(r.pred)}</b>` },
      { label: T('EE (ACG)', 'SE (GCA)'), num: true, get: r => f4(r.seGCA) },
    ], untested, 20);
    const truth = B11.src && B11.src.truth && B11.hyb ? B11.src.truth : null;
    el('b11HNote').innerHTML = T(
      `Modelo: y = μ + ACG₁ + ACG₂${H.sca ? ' + ACE' : ''} + e, con Var(ACG₁) = K₁σ², Var(ACG₂) = K₂σ²${H.sca ? ' y Var(ACE) = (K₁ ⊗ K₂)σ² restringida a las cruzas' : ''}; K₁ y K₂ son los parentescos genómicos dentro de cada grupo (Bernardo 1994; Technow y col. 2014). Un híbrido no evaluado se predice con los BLUP de las ACG de sus progenitores${H.sca ? ' y la ACE que su parentesco con los evaluados permite predecir' : ''}. El EE incluye solo la parte de ACG. Las varianzas de ACG están en la escala de K: la varianza entre líneas es σ²·SM (SM₁ = ${fmtNum(H.asv1, 3)}, SM₂ = ${fmtNum(H.asv2, 3)}).${truth ? ` Datos simulados: correlación de lo predicho con el valor verdadero ${fmtFixed(S.pearson(all.filter(p => !p.tested).map(p => p.pred), all.filter(p => !p.tested).map(p => truth[p.p1 + '×' + p.p2])), 3)} en las ${untested.length} cruzas no evaluadas.` : ''}`,
      `Model: y = μ + GCA₁ + GCA₂${H.sca ? ' + SCA' : ''} + e, with Var(GCA₁) = K₁σ², Var(GCA₂) = K₂σ²${H.sca ? ' and Var(SCA) = (K₁ ⊗ K₂)σ² restricted to the crosses' : ''}; K₁ and K₂ are the genomic relationships within each group (Bernardo 1994; Technow et al. 2014). An untested hybrid is predicted from the BLUPs of the GCA of its parents${H.sca ? ' and the SCA its relationship with the tested ones allows to predict' : ''}. The SE covers the GCA part only. The GCA variances are on the scale of K: the variance among lines is σ²·ASV (ASV₁ = ${fmtNum(H.asv1, 3)}, ASV₂ = ${fmtNum(H.asv2, 3)}).${truth ? ` Simulated data: correlation of the predicted with the true value ${fmtFixed(S.pearson(all.filter(p => !p.tested).map(p => p.pred), all.filter(p => !p.tested).map(p => truth[p.p1 + '×' + p.p2])), 3)} over the ${untested.length} untested crosses.` : ''}`);
    /* matrix of predictions, lines ordered by GCA */
    const o1 = H.ids1.map((_, i) => i).sort((a, b) => H.g1[b] - H.g1[a]), o2 = H.ids2.map((_, j) => j).sort((a, b) => H.g2[b] - H.g2[a]);
    const Mx = new Float64Array(n1 * n2), mark = new Uint8Array(n1 * n2);
    o1.forEach((a, i) => o2.forEach((b, j) => { const p = H.predict(H.ids1[a], H.ids2[b]); Mx[i * n2 + j] = p.pred; mark[i * n2 + j] = p.tested ? 1 : 0; }));
    mountFig('b11FigH', {
      title: () => T('Híbridos predichos', 'Predicted hybrids'), fileName: 'hybrid_matrix',
      render: c => P11.matrix(c, { titleEs: 'Desempeño predicho de todas las cruzas simples', titleEn: 'Predicted performance of every single cross', M: Mx, rows: o1.map(a => H.ids1[a]), cols: o2.map(b => H.ids2[b]), mark, colormap: 'viridis', barLabel: T('predicho', 'predicted'), note: T('Líneas ordenadas por su ACG; recuadro = híbrido evaluado.', 'Lines ordered by their GCA; outlined = hybrid evaluated.') }),
      controls: () => [P2.titleControl(), { key: 'colormap', label: T('Colores', 'Colours'), type: 'select', options: Object.entries(Fig.colormapNames) }],
    }, { width: 860, height: 760 });
    const tested = all.filter(p => p.tested);
    mountFig('b11FigHObs', {
      title: () => T('Observado y predicho', 'Observed and predicted'), fileName: 'hybrid_fit',
      render: c => P11.scatter(c, { titleEs: 'Híbridos evaluados: observado y predicho', titleEn: 'Evaluated hybrids: observed and predicted', x: tested.map(p => p.obs), y: tested.map(p => p.pred), labels: tested.map(p => p.p1 + '×' + p.p2), xlab: T('observado', 'observed'), ylab: T('predicho', 'predicted'), sameScale: true, note: `r = ${fmtFixed(S.pearson(tested.map(p => p.obs), tested.map(p => p.pred)), 3)}` }),
      controls: () => [P2.titleControl(), P2.paletteControl()],
    }, { width: 640, height: 560 });
    const jb = el('b11Jenkins');
    if (!jb.value.trim() || jb.dataset.auto === '1') {
      const t1 = o1.map(a => H.ids1[a]), t2 = o2.map(b => H.ids2[b]);
      jb.value = [`(${t1[0]}×${t1[1]})×${t2[0]}`, `(${t2[0]}×${t2[1]})×${t1[0]}`, `(${t1[0]}×${t1[1]})×(${t2[0]}×${t2[1]})`].join(String.fromCharCode(10));
      jb.dataset.auto = '1';
    }
    renderHybCV();
    runJenkins();
  }
  async function runHybCV() {
    const k = B11.hres && B11.hres.kern;
    if (!k) return;
    el('b11RunHcv').disabled = true;
    const w = bpWork('Validación cruzada de híbridos', 'Hybrid cross-validation');
    await bpAfterPaint(async () => { try {
      const truth = B11.src && B11.src.truth && B11.hyb ? B11.src.truth : null;
      B11.hcv = await GS.hybridCV(hybRecords(), k.g1, k.K1, k.g2, k.K2, { folds: 5, reps: +el('b11HReps').value, sca: B11.hSCA, seed: 20260918, truth }, async p => { msg('b11HcvMsg', [{ level: 'info', es: `${fmtNum(100 * p, 0)} %…`, en: `${fmtNum(100 * p, 0)} %…` }]); if (w) w.update(p, `${fmtNum(100 * p, 0)} %`); await yieldUI(); });
      clearMessages('b11HcvMsg');
      renderHybCV();
    } finally { el('b11RunHcv').disabled = false; } }, w);
  }
  function renderHybCV() {
    const C = B11.hcv;
    el('b11HcvRes').style.display = C ? '' : 'none';
    if (!C) return;
    const truth = isFinite(C.hybrids.rTrue);
    table('b11HcvTable', [
      { label: T('Híbridos de prueba', 'Test hybrids'), get: r => r.name },
      { label: 'n', num: true, get: r => r.v.n },
      { label: T('r(predicho, observado)', 'r(predicted, observed)'), num: true, get: r => (isFinite(r.v.r) ? `<b>${fmtFixed(r.v.r, 3)}</b>` : '') },
    ].concat(truth ? [{ label: T('r con el valor verdadero', 'r with the true value'), num: true, get: r => (isFinite(r.v.rTrue) ? fmtFixed(r.v.rTrue, 3) : '') }] : []), [
      { name: T('Esquema 1, híbridos apartados al azar', 'Scheme 1, hybrids left out at random'), v: C.hybrids },
      { name: T('Esquema 2, líneas apartadas con todos sus híbridos', 'Scheme 2, lines left out with all their hybrids'), v: C.lines },
      { name: T('T2: los dos progenitores tienen otros híbridos en el entrenamiento', 'T2: both parents have other hybrids in training'), v: C.T2 },
      { name: T('T1: solo un progenitor', 'T1: only one parent'), v: C.T1 },
      { name: T('T0: ninguno', 'T0: neither'), v: C.T0 },
    ]);
    el('b11HcvNote').innerHTML = T(
      `${C.folds} grupos y ${plural(C.reps, 'repetición', 'repeticiones')} de cada esquema; las varianzas se reestiman en cada entrenamiento. En el esquema 2 las líneas de cada grupo se reparten en ${C.folds} grupos y en cada vuelta se quitan del entrenamiento todos los híbridos de las líneas apartadas; un híbrido cuyos dos progenitores caen en vueltas distintas se prueba en una de ellas. Las clases T2, T1 y T0 (Technow y col. 2014) reúnen las predicciones de los dos esquemas según cuántos progenitores tenían otros híbridos en el entrenamiento: la capacidad predictiva baja de T2 a T0.`,
      `${C.folds} folds and ${plural(C.reps, 'replicate', 'replicates')} of each scheme; variances are re-estimated in every training set. In scheme 2 the lines of each group are split into ${C.folds} folds and in every round all the hybrids of the lines left out are removed from training; a hybrid whose two parents fall in different rounds is tested in one of them. Classes T2, T1 and T0 (Technow et al. 2014) pool the predictions of both schemes by how many parents had other hybrids in training: predictive ability falls from T2 to T0.`);
  }
  function runJenkins() {
    const H = B11.hres;
    if (!H) return;
    const lines = H.ids1.concat(H.ids2);
    const g1 = new Set(H.ids1);
    const sc = (a, b) => { if (g1.has(a) && !g1.has(b)) return H.predict(a, b).pred; if (g1.has(b) && !g1.has(a)) return H.predict(b, a).pred; return NaN; };
    const exprs = String(el('b11Jenkins').value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const rows = exprs.map(e => { try { return { expr: e, v: GS.jenkins(e, lines, sc) }; } catch (err) { return { expr: e, err: err.message }; } });
    table('b11JTable', [
      { label: T('Cruza', 'Cross'), get: r => esc(r.expr) },
      { label: T('Predicho (Jenkins)', 'Predicted (Jenkins)'), num: true, get: r => (r.err ? `<span class="hint">${esc(r.err)}</span>` : isFinite(r.v) ? `<b>${f4(r.v)}</b>` : T('requiere cruzas dentro de un grupo, que el modelo no predice', 'needs crosses within a group, which the model does not predict')) },
    ], rows);
  }

  /* ================= 6 · notes ================= */
  function renderNotes() {
    const host = el('b11Notes');
    if (!host) return;
    const notes = [
      { es: ['Parentesco genómico', 'VanRaden (2008): método 1, G = ZZ′/(2Σp<sub>j</sub>q<sub>j</sub>) con Z = M − 2P; método 2, cada marcador estandarizado por √(2p<sub>j</sub>q<sub>j</sub>) y G = Z*Z*′/m (equivale al de Yang y col. 2010 fuera de la diagonal). Con frecuencias de los propios datos G es singular; se suma una cresta pequeña a la diagonal o se mezcla con A del pedigrí (VanRaden 2008; Aguilar y col. 2010). Los componentes principales de G muestran la estructura de la población.'],
        en: ['Genomic relationships', 'VanRaden (2008): method 1, G = ZZ′/(2Σp<sub>j</sub>q<sub>j</sub>) with Z = M − 2P; method 2, every marker standardized by √(2p<sub>j</sub>q<sub>j</sub>) and G = Z*Z*′/m (equal to that of Yang et al. 2010 off the diagonal). With frequencies from the data themselves G is singular; a small ridge is added to the diagonal or it is blended with the pedigree A (VanRaden 2008; Aguilar et al. 2010). The principal components of G show the structure of the population.'] },
      { es: ['GBLUP y RR-BLUP', 'GBLUP (VanRaden 2008) resuelve las ecuaciones del modelo mixto con K⁻¹ = G⁻¹ y REML por información promedio; es equivalente a la regresión en cresta de todos los marcadores (Meuwissen, Hayes y Goddard 2001; Habier y col. 2007) con σ²g = 2Σpq·σ²β, y los efectos de los marcadores se recuperan como β̂ = Z′G⁻¹ĝ/(2Σpq). La heredabilidad genómica usa la semivarianza media de K (Legarra 2016).'],
        en: ['GBLUP and RR-BLUP', 'GBLUP (VanRaden 2008) solves the mixed-model equations with K⁻¹ = G⁻¹ and REML by average information; it is equivalent to ridge regression on all markers (Meuwissen, Hayes & Goddard 2001; Habier et al. 2007) with σ²g = 2Σpq·σ²β, and the marker effects are recovered as β̂ = Z′G⁻¹ĝ/(2Σpq). Genomic heritability uses the average semivariance of K (Legarra 2016).'] },
      { es: ['Validación cruzada', 'Esquemas de Burgueño y col. (2012): CV1 predice individuos nuevos (aquí), CV2 individuos evaluados en otros ambientes. En híbridos (Technow y col. 2014): T2, T1 y T0 según cuántos progenitores tienen otros híbridos en el entrenamiento. La capacidad predictiva r(ŷ, y) se divide entre √h² para aproximar la exactitud; las varianzas se reestiman en cada entrenamiento.'],
        en: ['Cross-validation', 'Schemes of Burgueño et al. (2012): CV1 predicts new individuals (here), CV2 individuals tested in other environments. In hybrids (Technow et al. 2014): T2, T1 and T0 by how many parents have other hybrids in training. Predictive ability r(ŷ, y) is divided by √h² to approximate accuracy; variances are re-estimated in every training set.'] },
      { es: ['Híbridos', 'Bernardo (1994) predijo cruzas simples no evaluadas con las ACG y ACE ligadas por el parentesco de los progenitores; con marcadores, Var(ACE) = (K₁ ⊗ K₂)σ²ACE en las cruzas (Technow y col. 2012, 2014). Jenkins (1934): una cruza doble (A×B)×(C×D) se predice con el promedio de las cuatro cruzas simples no progenitoras AC, AD, BC y BD, y una triple (A×B)×C con ½(AC + BC).'],
        en: ['Hybrids', 'Bernardo (1994) predicted untested single crosses from GCA and SCA linked by the relationships of the parents; with markers, Var(SCA) = (K₁ ⊗ K₂)σ²SCA on the crosses (Technow et al. 2012, 2014). Jenkins (1934): a double cross (A×B)×(C×D) is predicted by the mean of the four non-parental single crosses AC, AD, BC and BD, and a three-way cross (A×B)×C by ½(AC + BC).'] },
    ];
    const cites = [
      'Jenkins MT (1934). Methods of estimating the performance of double crosses in corn. Journal of the American Society of Agronomy 26: 199–204.',
      'Bernardo R (1994). Prediction of maize single-cross performance using RFLPs and information from related hybrids. Crop Science 34: 20–25.',
      'Meuwissen THE, Hayes BJ, Goddard ME (2001). Prediction of total genetic value using genome-wide dense marker maps. Genetics 157: 1819–1829.',
      'Habier D, Fernando RL, Dekkers JCM (2007). The impact of genetic relationship information on genome-assisted breeding values. Genetics 177: 2389–2397.',
      'VanRaden PM (2008). Efficient methods to compute genomic predictions. Journal of Dairy Science 91: 4414–4423.',
      'Aguilar I, Misztal I, Johnson DL, Legarra A, Tsuruta S, Lawlor TJ (2010). A unified approach to utilize phenotypic, full pedigree, and genomic information for genetic evaluation of Holstein final score. Journal of Dairy Science 93: 743–752.',
      'Crossa J et al. (2010). Prediction of genetic values of quantitative traits in plant breeding using pedigree and molecular markers. Genetics 186: 713–724.',
      'Heffner EL, Lorenz AJ, Jannink JL, Sorrells ME (2010). Plant breeding with genomic selection: gain per unit time and cost. Crop Science 50: 1681–1690.',
      'Yang J, Benyamin B, McEvoy BP et al. (2010). Common SNPs explain a large proportion of the heritability for human height. Nature Genetics 42: 565–569.',
      'Burgueño J, de los Campos G, Weigel K, Crossa J (2012). Genomic prediction of breeding values when modeling genotype × environment interaction using pedigree and dense molecular markers. Crop Science 52: 707–719.',
      'Technow F, Riedelsheimer C, Schrag TA, Melchinger AE (2012). Genomic prediction of hybrid performance in maize with models incorporating dominance and population specific marker effects. Theoretical and Applied Genetics 125: 1181–1194.',
      'Technow F et al. (2014). Genome properties and prospects of genomic prediction of hybrid performance in a breeding program of maize. Genetics 197: 1343–1355.',
      'Legarra A (2016). Comparing estimates of genetic variance across different relationship models. Theoretical Population Biology 107: 26–30.',
      'Feldmann MJ, Piepho HP, Knapp SJ (2022). Average semivariance directly yields accurate estimates of the genomic variance in complex trait analyses. G3 Genes|Genomes|Genetics 12: jkac080.',
    ];
    host.innerHTML = notes.map(n => `<div class="method-note"><h4>${T(n.es[0], n.en[0])}</h4><p>${T(n.es[1], n.en[1])}</p></div>`).join('')
      + `<div class="method-note"><h4>${T('Referencias', 'References')}</h4><ul class="ref-list">${cites.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div>`;
  }

  /* ================= downloads ================= */
  function downloadXlsx() {
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name.slice(0, 28));
    if (B11.Q) add(T('Marcadores', 'Markers'), [['marker', 'p', 'MAF', 'missing', 'heterozygosity']].concat(B11.Q.markers.map((mk, q) => [mk, B11.Q.p[q], B11.Q.maf[q], B11.Q.all.miss[B11.D.markers.indexOf(mk)], B11.Q.all.het[B11.D.markers.indexOf(mk)]])));
    if (B11.Q && B11.Q.n <= 1500) add('G', [[''].concat(B11.Q.ids)].concat(B11.Q.ids.map((id, i) => [id].concat(Array.from(B11.gr.G.subarray(i * B11.Q.n, (i + 1) * B11.Q.n))))));
    if (B11.fit) add('GEBV', [['id', 'phenotype', 'GEBV', 'predicted', 'SEP', 'reliability']].concat(B11.fit.gebv.map(e => [e.id, e.nrec ? e.y : '', e.g, e.pred, e.sep, e.rel])));
    if (B11.beta) add(T('Efectos', 'Effects'), [['marker', 'effect']].concat(B11.Q.markers.map((mk, j) => [mk, B11.beta[j]])));
    if (B11.cv) add(T('Validación', 'Validation'), [['model', 'replicate', 'r', 'slope', 'MSE', 'true r']].concat(B11.cv.flatMap(m => m.cv.reps.map(r => [m.key, r.rep + 1, r.r, r.slope, r.mse, isFinite(r.rTrue) ? r.rTrue : '']))));
    if (B11.hAll) add(T('Híbridos', 'Hybrids'), [['parent 1', 'parent 2', 'GCA1', 'GCA2', 'SCA', 'predicted', 'SE GCA', 'tested', 'observed']].concat(B11.hAll.map(p => [p.p1, p.p2, p.gca1, p.gca2, p.sca, p.pred, p.seGCA, p.tested ? 1 : 0, p.tested ? p.obs : ''])));
    if (!wb.SheetNames.length) return;
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), slug(T('genomica', 'genomics')) + '.xlsx');
  }

  /* ================= run ================= */
  function renderAll() {
    renderMarkers();
    renderG();
    renderGblupForm();
    renderGblup();
    renderCVForm();
    renderCV();
    renderHybForm();
    renderHyb();
    const s = STEPS[11];
    el('b11Next').disabled = !s.ready;
    el('b11NextLabel').innerHTML = s.ready ? T(`Continuar: ${s.es} →`, `Continue: ${s.en} →`) : T(`Siguiente: ${s.es} (Bloque 12, en construcción)`, `Next: ${s.en} (Block 12, under construction)`);
  }
  async function readMarkers(file) {
    const got = await Data.readFile(file);
    const rows = got.kind === 'workbook' ? Data.sheetRows(got.workbook, got.sheets[0]) : Data.parseDelimited(got.text);
    const tab = Data.table(rows);
    B11.D = GS.fromTable(tab, { transpose: el('b11Transpose').checked, binaryAs: el('b11Binary').value });
    B11.src = { id: 'file', name: file.name, cite: T('Archivo del usuario.', 'User file.') };
    resetResults();
    process();
  }
  async function readPheno(file, kind) {
    const got = await Data.readFile(file);
    const rows = got.kind === 'workbook' ? Data.sheetRows(got.workbook, got.sheets[0]) : Data.parseDelimited(got.text);
    const tab = Data.table(rows);
    if (kind === 'hyb') { B11.hyb = hybFrom(tab); B11.hres = null; B11.hcv = null; }
    else { B11.phen = phenFrom(tab); B11.phenSource = 'example'; B11.fit = null; B11.cv = null; }
    renderAll();
  }

  function init() {
    if (!el('b11Markers')) return;
    renderNotes();
    const errMsg = host => err => msg(host, [{ level: 'error', es: String(err.message || err), en: String(err.message || err) }]);
    el('b11FileM').addEventListener('change', e => { const f = e.target.files[0]; if (f) heavy('Leyendo los marcadores', 'Reading the markers', () => readMarkers(f).catch(errMsg('b11MarkMsg'))); e.target.value = ''; });
    el('b11FileP').addEventListener('change', e => { const f = e.target.files[0]; if (f) readPheno(f, 'phen').catch(errMsg('b11GblupMsg')); e.target.value = ''; });
    el('b11FileH').addEventListener('change', e => { const f = e.target.files[0]; if (f) readPheno(f, 'hyb').catch(errMsg('b11HybMsg')); e.target.value = ''; });
    [['b11MissM', 'maxMissMarker', 0.01], ['b11MissI', 'maxMissInd', 0.01], ['b11MAF', 'minMAF', 1]].forEach(([id, k, f]) => el(id).addEventListener('change', () => { const v = parseFloat(el(id).value); if (isFinite(v)) { B11.qc[k] = v * f; if (B11.D) heavy('Filtrando los marcadores', 'Filtering the markers', process); } }));
    el('b11Method').addEventListener('change', () => { B11.method = el('b11Method').value; if (B11.Q) heavy('Construyendo el parentesco genómico', 'Building the genomic relationships', () => { rebuildG(); renderAll(); }); });
    el('b11Ridge').addEventListener('change', () => { B11.ridge = parseFloat(el('b11Ridge').value) || 0.001; if (B11.Q) heavy('Construyendo el parentesco genómico', 'Building the genomic relationships', () => { rebuildG(); renderAll(); }); });
    el('b11WA').addEventListener('change', () => { B11.wA = parseFloat(el('b11WA').value) || 0; if (B11.Q) heavy('Construyendo el parentesco genómico', 'Building the genomic relationships', () => { rebuildG(); renderAll(); }); });
    el('b11PhenSource').addEventListener('change', () => { B11.phenSource = el('b11PhenSource').value; B11.trait = 0; B11.fit = null; renderGblupForm(); renderGblup(); renderCVForm(); });
    el('b11Trait').addEventListener('change', () => { B11.trait = +el('b11Trait').value; B11.fit = null; B11.cv = null; renderGblup(); renderCV(); });
    el('b11RunG').addEventListener('click', runGblup);
    el('b11RunCv').addEventListener('click', runCV);
    ['b11Prop', 'b11SigA', 'b11Hp', 'b11Lp', 'b11Lg'].forEach(id => el(id).addEventListener('change', renderResponse));
    el('b11HTrait').addEventListener('change', () => { B11.hTrait = +el('b11HTrait').value; B11.hres = null; B11.hcv = null; renderHyb(); });
    el('b11HSCA').addEventListener('change', () => { B11.hSCA = el('b11HSCA').checked; B11.hres = null; B11.hcv = null; renderHyb(); });
    el('b11RunH').addEventListener('click', runHyb);
    el('b11RunHcv').addEventListener('click', runHybCV);
    el('b11JRun').addEventListener('click', runJenkins);
    el('b11Jenkins').addEventListener('input', () => { el('b11Jenkins').dataset.auto = '0'; });
    el('b11DlXlsx').addEventListener('click', downloadXlsx);
    el('b11Back').addEventListener('click', () => goStep(10));
    el('b11Next').addEventListener('click', () => { if (STEPS[11].ready) goStep(12); });
    document.addEventListener('datachange', () => { if (B11.phenSource === 'block3') { B11.fit = null; } if (B11.built) renderGblupForm(); });
    document.addEventListener('stepchange', e => { if (e.detail.step === 11 && !B11.built) { B11.built = true; renderAll(); } else if (e.detail.step === 11) { if (B11.Q) { B11.A = pedA(B11.Q.ids); } renderAll(); } });
    document.addEventListener('langchange', () => { renderNotes(); if (B11.built) renderAll(); });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
