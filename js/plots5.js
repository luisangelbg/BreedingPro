/* BreedingPro — Block 5 figures: the Wr–Vr graph with its limiting parabola, the
   items of Hayman's analysis of variance, the variety and heterosis effects of
   Gardner & Eberhart, the heterosis of every cross and the order of dominance. */

const P5 = {};
const t5 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut5 = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------------- 1 · Wr–Vr graph ---------------- */
P5.wrvr = (cfg0, st, reg, o) => {
  const cfg = t5(cfg0, 'Gráfico Wr–Vr', 'Wr–Vr graph');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 82, right: 170, top: 58, bottom: 66 } });
  const pts = st.arrays;
  const xs = pts.map(a => a.Vr), ys = pts.map(a => a.Wr);
  const extra = [];
  if (cfg.showParabola !== false) reg.parabola.forEach(([v, w]) => { extra.push([v, w]); });
  if (reg.dom) extra.push([reg.dom.V, reg.dom.W]);
  if (reg.rec) extra.push([reg.rec.V, reg.rec.W]);
  const allX = xs.concat(extra.map(e => e[0]), [0]), allY = ys.concat(extra.map(e => e[1]), [0]);
  const dx = Fig.niceDomain(Math.min(...allX), Math.max(...allX), true);
  const dy = Fig.niceDomain(Math.min(...allY), Math.max(...allY), true);
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || 'Vr' }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || 'Wr' }));
  const g = Fig.g();
  const col = { par: Fig.color(cfg.palette, 5), unit: Fig.color(cfg.palette, 2), fit: Fig.color(cfg.palette, 0), pt: Fig.color(cfg.palette, 3) };
  const clipY = w => Math.max(dy[0], Math.min(dy[1], w));
  /* limiting parabola Wr² = Vr · V0L0 */
  if (cfg.showParabola !== false) {
    const d = reg.parabola.filter(([v]) => v >= dx[0] && v <= dx[1]).map(([v, w], i) => (i ? 'L' : 'M') + sx(v).toFixed(1) + ' ' + sy(clipY(w)).toFixed(1)).join(' ');
    g.appendChild(Fig.el('path', { d, fill: 'none', stroke: col.par, 'stroke-width': 1.6, 'stroke-dasharray': '2 3' }));
  }
  /* line of unit slope and fitted regression */
  const line = (aa, bb, colr, dash) => {
    const v0 = dx[0], v1 = dx[1];
    const w0 = aa + bb * v0, w1 = aa + bb * v1;
    g.appendChild(Fig.el('line', { x1: sx(v0), y1: sy(clipY(w0)), x2: sx(v1), y2: sy(clipY(w1)), stroke: colr, 'stroke-width': 2, 'stroke-dasharray': dash || null }));
  };
  if (cfg.showUnit !== false) line(reg.unit.a, 1, col.unit, '7 4');
  if (cfg.showFit !== false) line(reg.a, reg.b, col.fit, null);
  /* the intersections mark the completely dominant and recessive ends */
  if (cfg.showEnds !== false && reg.dom && reg.rec) {
    [[reg.dom, T('dominante', 'dominant')], [reg.rec, T('recesivo', 'recessive')]].forEach(([q, lab]) => {
      g.appendChild(Fig.marker(sx(q.V), sy(clipY(q.W)), 5, 'diamond', { fill: 'none', stroke: col.par, 'stroke-width': 1.6 }));
      g.appendChild(Fig.text(sx(q.V), sy(clipY(q.W)) + 15, lab, { size: 9.5, anchor: 'middle', fill: col.par, font: f.font, role: 'label', halo: f.t.bg }));
    });
  }
  pts.forEach(a => {
    const m = Fig.marker(sx(a.Vr), sy(a.Wr), 4.6, 'circle', { fill: col.pt, stroke: f.t.bg, 'stroke-width': 1 });
    m.appendChild(Fig.el('title', {}, `${o.names[a.i]} · Vr ${fmtNum(a.Vr, 3)} · Wr ${fmtNum(a.Wr, 3)}`));
    g.appendChild(m);
  });
  f.g.appendChild(g);
  Fig.repelLabels(g, f, pts.map(a => ({ x: sx(a.Vr), y: sy(a.Wr), text: cut5(o.names[a.i], 12), r: 5 })), {});
  /* the reading of the graph */
  const notes = [
    T(`b = ${fmtFixed(reg.b, 3)} ± ${fmtFixed(reg.seb, 3)}`, `b = ${fmtFixed(reg.b, 3)} ± ${fmtFixed(reg.seb, 3)}`),
    T(`t(b = 1) = ${fmtFixed(reg.t1, 2)}, ${pEq(reg.p1)}`, `t(b = 1) = ${fmtFixed(reg.t1, 2)}, ${pEq(reg.p1)}`),
    T(`intercepto = ${fmtNum(reg.a, 3)}`, `intercept = ${fmtNum(reg.a, 3)}`),
    reg.a > 0 ? T('dominancia parcial', 'partial dominance') : Math.abs(reg.a) < 1e-9 ? T('dominancia completa', 'complete dominance') : T('sobredominancia', 'overdominance'),
  ];
  if (cfg.legendPos !== 'none') {
    const bx = f.x1 + 18;
    const lg = f.g.appendChild(Fig.g({ 'data-role': 'legend' }));   /* notes and key in one group for the figure studio; data-li = entry */
    notes.forEach((s, k) => lg.appendChild(Fig.text(bx, f.y0 + 14 + k * 16, s, { size: 10.5, fill: f.t.fg, font: f.font, role: 'legend' })));
    /* the lines run almost on top of each other, so they are named in the margin */
    const keys = [];
    if (cfg.showParabola !== false) keys.push([col.par, '2 3', T('parábola límite', 'limiting parabola')]);
    if (cfg.showUnit !== false) keys.push([col.unit, '7 4', T('pendiente 1', 'unit slope')]);
    if (cfg.showFit !== false) keys.push([col.fit, null, T('ajustada', 'fitted')]);
    keys.forEach(([c, dash, lab], k) => {
      const yy = f.y0 + 26 + notes.length * 16 + k * 16;
      lg.appendChild(Fig.el('line', { x1: bx, x2: bx + 18, y1: yy - 4, y2: yy - 4, stroke: c, 'stroke-width': 2, 'stroke-dasharray': dash || null, 'data-li': k }));
      lg.appendChild(Fig.text(bx + 24, yy, lab, { size: 10, fill: f.t.fg, font: f.font, role: 'legend' })).setAttribute('data-li', k);
    });
  }
  return svg;
};

/* ---------------- 2 · items of the analysis of variance ---------------- */
P5.items = (cfg0, rows, o) => {
  const cfg = t5(cfg0, 'Partición de Hayman', "Hayman's partition");
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const items = rows.filter(r => !r.summary);
  const total = items.reduce((s, r) => s + Math.max(0, r.ss), 0) || 1;
  const labels = items.map(r => T(o.names[r.item] || { es: r.item, en: r.item }));
  const vals = items.map(r => (cfg.show === 'ms' ? r.ms : 100 * r.ss / total));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(0, Math.max(...vals), true), { catLabel: '', valueLabel: cfg.show === 'ms' ? T('cuadrado medio', 'mean square') : T('% de la suma de cuadrados', '% of the sum of squares'), padding: 0.3 });
  const f = C.f, g = Fig.g();
  items.forEach((r, i) => {
    const colr = Fig.color(cfg.palette, i);
    g.appendChild(C.bar(i, vals[i], { fill: Fig.alpha(colr, 0.85), rx: 3 }));
    const [tx, ty] = C.P(C.center(i), vals[i]);
    const txt = (cfg.show === 'ms' ? fmtNum(vals[i], 2) : fmtNum(vals[i], 1) + ' %') + (P4.starOf(r.p) ? ' ' + P4.starOf(r.p) : '');
    g.appendChild(Fig.text(tx + (cfg.flip ? 8 : 0), ty + (cfg.flip ? 4 : -8), txt, { size: 10.5, anchor: cfg.flip ? 'start' : 'middle', fill: f.t.fg, font: f.font, role: 'label' }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 3 · Gardner–Eberhart variety and heterosis effects ---------------- */
P5.geEffects = (cfg0, ge2, o) => {
  const cfg = t5(cfg0, 'Efectos de variedad y de heterosis', 'Variety and heterosis effects');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const idx = ge2.v.map((_, i) => i).sort((a, b) => (cfg.order === 'name' ? LM.natCmp(o.names[a], o.names[b]) : ge2.v[b].est - ge2.v[a].est));
  const series = [{ key: 'v', label: T('efecto de variedad (vⱼ)', 'variety effect (vⱼ)'), get: i => ge2.v[i] }, { key: 'h', label: T('heterosis de variedad (hⱼ)', 'variety heterosis (hⱼ)'), get: i => ge2.h[i] }];
  const tcrit = o.tcrit || 1.96;
  const all = idx.flatMap(i => series.flatMap(s => { const e = s.get(i); return [e.est - tcrit * e.se, e.est + tcrit * e.se]; })).filter(isFinite);
  const C = Fig.bandPlot(svg, cfg, idx.map(i => cut5(o.names[i], 16)), Fig.niceDomain(Math.min(0, ...all), Math.max(0, ...all), true), { catLabel: T('Variedad', 'Variety'), valueLabel: o.label, padding: 0.28, legendLabels: series.map(s => s.label) });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1.1 }));
  const off = C.bw / 4;
  idx.forEach((i, k) => series.forEach((s, q) => {
    const e = s.get(i);
    if (!isFinite(e.est)) return;
    const colr = Fig.color(cfg.palette, q);
    const pos = C.center(k) + (q === 0 ? -off : off);
    if (isFinite(e.se) && cfg.showCI !== false) g.appendChild(C.whisker(pos, e.est - tcrit * e.se, e.est + tcrit * e.se, Math.min(3.6, C.bw * 0.18), { stroke: colr, 'stroke-width': 1.4 }));
    const [x, y] = C.P(pos, e.est);
    g.appendChild(Fig.marker(x, y, 4.2, q === 0 ? 'circle' : 'square', { fill: colr, stroke: f.t.bg, 'stroke-width': 0.8 }));
    const star = P4.starOf(e.p);
    if (star) {
      /* beyond the end of the interval, so the star never sits on the whisker */
      const ci = isFinite(e.se) && cfg.showCI !== false ? tcrit * e.se : 0;
      const [sx, sy] = C.P(pos, e.est + (e.est >= 0 ? ci : -ci));
      g.appendChild(Fig.text(sx + (cfg.flip ? (e.est >= 0 ? 7 : -7) : 0), sy + (cfg.flip ? 4 : (e.est >= 0 ? -6 : 13)), star, { size: 10, anchor: cfg.flip ? (e.est >= 0 ? 'start' : 'end') : 'middle', fill: colr, font: f.font, role: 'label' }));
    }
  }));
  f.g.appendChild(g);
  Fig.legend(f, series.map((s, q) => ({ label: s.label, color: Fig.color(cfg.palette, q), shape: 'circle' })), cfg, { pos: 'right' });
  return svg;
};

/* ---------------- 4 · heterosis of every cross ---------------- */
P5.heterosis = (cfg0, list, o) => {
  const cfg = t5(cfg0, 'Heterosis de cada cruza', 'Heterosis of every cross');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const field = cfg.kind === 'bph' ? 'bphPct' : 'mphPct';
  const pField = cfg.kind === 'bph' ? 'pBph' : 'pMph';
  let rows = list.filter(h => isFinite(h[field])).sort((a, b) => b[field] - a[field]);
  const maxN = +cfg.maxCrosses || 40;
  let sub = '';
  if (rows.length > maxN) { const half = Math.floor(maxN / 2); sub = T(`${half} mayores y ${half} menores de ${rows.length}`, `${half} highest and ${half} lowest of ${rows.length}`); rows = rows.slice(0, half).concat(rows.slice(-half)); }
  const nameOf = o.nameOf || (h => o.names[h.i] + ' × ' + o.names[h.j]);
  const labels = rows.map(h => cut5(nameOf(h), 20));
  const vals = rows.map(h => h[field]);
  const C = Fig.bandPlot(svg, Object.assign({}, cfg, { subtitle: cfg.subtitle || sub }), labels, Fig.niceDomain(Math.min(0, ...vals), Math.max(0, ...vals), true), { catLabel: T('Cruza', 'Cross'), valueLabel: cfg.kind === 'bph' ? T('heterosis respecto al mejor progenitor (%)', 'better-parent heterosis (%)') : T('heterosis respecto a la media de los progenitores (%)', 'mid-parent heterosis (%)'), padding: 0.25 });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1.1 }));
  rows.forEach((h, i) => {
    const colr = Fig.color(cfg.palette, h[field] >= 0 ? 0 : 3);
    g.appendChild(C.bar(i, h[field], { fill: Fig.alpha(colr, h[pField] < 0.05 ? 0.9 : 0.4), rx: 2, stroke: h[pField] < 0.05 ? colr : 'none', 'stroke-width': h[pField] < 0.05 ? 0.8 : 0 }));
  });
  f.g.appendChild(g);
  f.g.appendChild(Fig.text(f.x1, f.y0 - 10, T('relleno sólido: significativa (p < 0.05)', 'solid fill: significant (p < 0.05)'), { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- 5 · order of dominance ---------------- */
P5.dominance = (cfg0, st, reg, o) => {
  const cfg = t5(cfg0, 'Orden de dominancia de los progenitores', 'Order of dominance of the parents');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 150, top: 58, bottom: 66 } });
  const xs = st.arrays.map(a => a.sum), ys = st.arrays.map(a => a.parent);
  const ends = [reg.dom, reg.rec].filter(Boolean).map(q => q.V + q.W);
  const dx = Fig.niceDomain(Math.min(...xs, ...ends), Math.max(...xs, ...ends));
  const dy = Fig.niceDomain(Math.min(...ys, reg.predictDominant, reg.predictRecessive), Math.max(...ys, reg.predictDominant, reg.predictRecessive));
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || 'Wr + Vr' }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || o.label }));
  const g = Fig.g();
  if (isFinite(reg.bY)) {
    const y0 = reg.aY + reg.bY * dx[0], y1 = reg.aY + reg.bY * dx[1];
    g.appendChild(Fig.el('line', { x1: sx(dx[0]), y1: sy(y0), x2: sx(dx[1]), y2: sy(y1), stroke: Fig.color(cfg.palette, 0), 'stroke-width': 1.8, 'stroke-dasharray': '6 4' }));
  }
  st.arrays.forEach(a => {
    const m = Fig.marker(sx(a.sum), sy(a.parent), 4.6, 'circle', { fill: Fig.color(cfg.palette, 3), stroke: f.t.bg, 'stroke-width': 1 });
    m.appendChild(Fig.el('title', {}, `${o.names[a.i]} · Wr + Vr ${fmtNum(a.sum, 3)} · ${o.label} ${fmtNum(a.parent, 3)}`));
    g.appendChild(m);
  });
  [[reg.dom, reg.predictDominant, T('dominante', 'dominant')], [reg.rec, reg.predictRecessive, T('recesivo', 'recessive')]].forEach(([q, y, lab], k) => {
    if (!q || !isFinite(y)) return;
    const x = q.V + q.W;
    g.appendChild(Fig.marker(sx(x), sy(y), 5.5, 'diamond', { fill: 'none', stroke: Fig.color(cfg.palette, 2), 'stroke-width': 1.8 }));
    /* an end that falls on the edge of the frame gets its label turned inwards */
    const near = sx(x) > f.x1 - 50 ? 'end' : sx(x) < f.x0 + 50 ? 'start' : 'middle';
    const lx = near === 'end' ? sx(x) - 8 : near === 'start' ? sx(x) + 8 : sx(x);
    g.appendChild(Fig.text(lx, sy(y) - 10, `${lab}: ${fmtNum(y, 2)}`, { size: 9.5, anchor: near, fill: Fig.color(cfg.palette, 2), font: f.font, role: 'label', halo: f.t.bg }));
  });
  f.g.appendChild(g);
  Fig.repelLabels(g, f, st.arrays.map(a => ({ x: sx(a.sum), y: sy(a.parent), text: cut5(o.names[a.i], 12), r: 5 })), {});
  f.g.appendChild(Fig.text(f.x1 + 14, f.y0 + 14, `r = ${fmtFixed(reg.corrYr, 3)}`, { size: 10.5, fill: f.t.fg, font: f.font, role: 'legend' }));
  f.g.appendChild(Fig.text(f.x1 + 14, f.y0 + 30, `r² = ${fmtFixed(reg.r2, 3)}`, { size: 10.5, fill: f.t.fg, font: f.font, role: 'legend' }));
  /* the reading is written on two short lines so that it stays inside the right margin */
  const read = T(reg.corrYr < 0 ? ['los genes dominantes', 'aumentan el valor'] : ['los genes dominantes', 'disminuyen el valor'], reg.corrYr < 0 ? ['dominant genes', 'increase the value'] : ['dominant genes', 'decrease the value']);
  read.forEach((s, k) => f.g.appendChild(Fig.text(f.x1 + 14, f.y0 + 52 + k * 14, s, { size: 10, fill: f.t.muted, font: f.font, role: 'legend' })));
  return svg;
};

window.P5 = P5;
