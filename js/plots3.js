/* BreedingPro — Block 3 figures: which crosses are in the data, the field map of
   a trait or of its residuals, distributions by environment, residual
   diagnostics and adjusted means. Editable and exportable like every figure. */

const P3 = {};
const t3 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

P3.colormapControl = def => ({ key: 'colormap', label: T('Escala de color', 'Colour scale'), type: 'select', options: Object.entries(Fig.colormapNames), def });

/* vertical colour bar at the right of a frame */
P3.colorbar = (f, cfg, lo, hi, ramp, label) => {
  const g = Fig.g();
  const x = f.x1 + 22, y0 = f.y0 + 6, h = Math.min(220, f.y1 - f.y0 - 12), w = 13;
  const id = 'cb' + Math.random().toString(36).slice(2, 8);
  const defs = Fig.el('defs');
  const grad = Fig.el('linearGradient', { id, x1: 0, y1: 1, x2: 0, y2: 0 });
  for (let k = 0; k <= 10; k++) grad.appendChild(Fig.el('stop', { offset: k / 10, 'stop-color': ramp(k / 10) }));
  defs.appendChild(grad); g.appendChild(defs);
  g.appendChild(Fig.el('rect', { x, y: y0, width: w, height: h, fill: `url(#${id})`, stroke: f.t.axis, 'stroke-width': 0.6 }));
  const sc = Fig.scaleLinear(lo, hi, y0 + h, y0);
  Fig.ticks(lo, hi, 5).forEach(v => {
    if (v < Math.min(lo, hi) - 1e-9 || v > Math.max(lo, hi) + 1e-9) return;
    g.appendChild(Fig.el('line', { x1: x + w, x2: x + w + 4, y1: sc(v), y2: sc(v), stroke: f.t.axis }));
    g.appendChild(Fig.text(x + w + 7, sc(v) + 4, Fig.fmtTick(v), { size: 10, fill: f.t.fg, font: f.font, role: 'tick' }));
  });
  if (label) g.appendChild(Fig.text(x, y0 - 8, label, { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend', weight: 'bold' }));
  f.g.appendChild(g);
};

/* ---------------- 1 · crosses present in the data ---------------- */
P3.presence = (cfg0, M, cells, o) => {
  const cfg = t3(cfg0, 'Cruzas presentes en los datos', 'Crosses present in the data');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const rows = M.rows, cols = M.cols;
  const rowLab = Math.min(150, 16 + 6.8 * Math.max(...rows.map(x => cut(x, 18).length)));
  const colLab = Math.min(110, 14 + 6.2 * Math.max(...cols.map(x => cut(x, 16).length)));
  const f = Fig.frame(svg, cfg, { margin: { left: rowLab + 34, right: 120, top: 50 + colLab, bottom: 58 } });
  const nr = rows.length, nc = cols.length;
  const cell = Math.max(3, Math.min((f.x1 - f.x0) / nc, (f.y1 - f.y0) / nr, 46));
  const by = cfg.colorBy || 'count';
  const vals = [];
  cells.forEach(c => { const v = by === 'mean' ? c.mean : c.n; if (isFinite(v)) vals.push(v); });
  const lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
  const ramp = Fig.colormaps[cfg.colormap] || Fig.colormaps.viridis;
  const g = Fig.g();
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
    const x = f.x0 + j * cell, y = f.y0 + i * cell;
    const c = cells.get(M.key(rows[i], cols[j]));
    if (!c) {
      g.appendChild(Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: 'none', stroke: f.t.grid === 'none' ? f.t.axis : f.t.grid, 'stroke-dasharray': '2 2', rx: Math.min(4, cell / 6) }));
      if (o && o.expected && o.expected(rows[i], cols[j]) && cell >= 10) {
        const k = cell * 0.22;
        g.appendChild(Fig.el('path', { d: `M${x + cell / 2 - k} ${y + cell / 2 - k}L${x + cell / 2 + k} ${y + cell / 2 + k}M${x + cell / 2 + k} ${y + cell / 2 - k}L${x + cell / 2 - k} ${y + cell / 2 + k}`, stroke: Fig.color(cfg.palette, 3), 'stroke-width': 1.8 }));
      }
      continue;
    }
    const v = by === 'mean' ? c.mean : c.n;
    const fill = hi > lo ? ramp((v - lo) / (hi - lo)) : ramp(0.6);
    const rect = Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill, rx: Math.min(4, cell / 6) });
    rect.appendChild(Fig.el('title', {}, `${c.name} · ${T('parcelas', 'plots')}: ${c.n}${isFinite(c.mean) ? ' · ' + T('media', 'mean') + ': ' + fmtNum(c.mean, 3) : ''}`));
    g.appendChild(rect);
    if (cfg.showValues !== false && cell >= 26) g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + 4, by === 'mean' ? fmtNum(v, v >= 100 ? 0 : 1) : String(v), { size: Math.min(11, cell * 0.3), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
    if (c.parent && cell >= 12) g.appendChild(Fig.el('rect', { x: x + 2.5, y: y + 2.5, width: cell - 5, height: cell - 5, fill: 'none', stroke: Fig.onColor(fill), 'stroke-width': 1.2, rx: Math.min(3, cell / 7), opacity: 0.7 }));
  }
  const fs = Math.max(6.5, Math.min(11, cell * 0.55));
  rows.forEach((r, i) => g.appendChild(Fig.text(f.x0 - 6, f.y0 + i * cell + cell / 2 + fs * 0.35, cut(r, 18), { size: fs, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
  cols.forEach((c, j) => g.appendChild(Fig.text(f.x0 + j * cell + cell / 2 + fs * 0.35, f.y0 - 6, cut(c, 16), { size: fs, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' })));
  g.appendChild(Fig.text(f.x0 - rowLab - 20, f.y0 + nr * cell / 2, T(M.rowTitle), { size: 12, anchor: 'middle', fill: f.t.muted, font: f.font, rotate: -90, role: 'axis', weight: 'bold' }));
  g.appendChild(Fig.text(f.x0 + nc * cell / 2, f.y0 + nr * cell + 22, T(M.colTitle), { size: 12, anchor: 'middle', fill: f.t.muted, font: f.font, role: 'axis', weight: 'bold' }));
  f.g.appendChild(g);
  f.x1 = f.x0 + nc * cell; f.y1 = f.y0 + nr * cell;
  if (vals.length && hi > lo) P3.colorbar(f, cfg, lo, hi, ramp, by === 'mean' ? T('media', 'mean') : T('parcelas', 'plots'));
  const anyMissing = o && o.expected && rows.some(a => cols.some(b => !cells.has(M.key(a, b)) && o.expected(a, b)));
  if (anyMissing) {
    const lg = Fig.g();
    const lx = f.x0, ly = f.y1 + 42;
    lg.appendChild(Fig.el('path', { d: `M${lx} ${ly - 8}l8 8M${lx + 8} ${ly - 8}l-8 8`, stroke: Fig.color(cfg.palette, 3), 'stroke-width': 1.8 }));
    lg.appendChild(Fig.text(lx + 14, ly, T('falta en los datos', 'missing from the data'), { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend' }));
    f.g.appendChild(lg);
  }
  return svg;
};

/* ---------------- 2 · field map ---------------- */
P3.fieldMap = (cfg0, plots, o) => {
  const cfg = t3(cfg0, 'Mapa de campo', 'Field map');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 60, right: 110, top: 54, bottom: 52 } });
  /* coordinates: row and column when present, otherwise plots in order inside each replicate */
  let pts;
  const hasRC = plots.every(p => p.row !== '' && p.col !== '' && isFinite(+p.row) && isFinite(+p.col));
  if (hasRC) pts = plots.map(p => ({ p, r: +p.row, c: +p.col }));
  else {
    const reps = [...new Set(plots.map(p => p.repKey || p.block || '1'))].sort(LM.natCmp);
    const k = new Map();
    pts = plots.map(p => { const rp = p.repKey || p.block || '1'; const i = k.get(rp) || 0; k.set(rp, i + 1); return { p, r: reps.indexOf(rp) + 1, c: i + 1 }; });
  }
  const rmin = Math.min(...pts.map(q => q.r)), rmax = Math.max(...pts.map(q => q.r));
  const cmin = Math.min(...pts.map(q => q.c)), cmax = Math.max(...pts.map(q => q.c));
  const nr = rmax - rmin + 1, nc = cmax - cmin + 1;
  const cw = Math.min((f.x1 - f.x0) / nc, 60), ch = Math.min((f.y1 - f.y0) / nr, 44);
  const val = q => o.value(q.p);
  const vals = pts.map(val).filter(isFinite);
  const diverging = o.diverging;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (diverging) { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; lo = -m; hi = m; }
  const ramp = Fig.colormaps[cfg.colormap] || (diverging ? Fig.colormaps.rdbu : Fig.colormaps.viridis);
  const g = Fig.g();
  pts.forEach(q => {
    const x = f.x0 + (q.c - cmin) * cw, y = f.y0 + (q.r - rmin) * ch, v = val(q);
    const fill = isFinite(v) ? ramp(hi > lo ? (v - lo) / (hi - lo) : 0.5) : f.t.bg;
    const flagged = o.flag && o.flag(q.p);
    const rect = Fig.el('rect', { x: x + 0.7, y: y + 0.7, width: cw - 1.4, height: ch - 1.4, fill, stroke: flagged ? Fig.color(cfg.palette, 3) : f.t.axis, 'stroke-width': flagged ? 2.6 : 0.4, rx: 1.5 });
    rect.appendChild(Fig.el('title', {}, `${q.p.entry} · ${o.label}: ${fmtNum(v, 3)}${q.p.repKey ? ' · ' + T('rep. ', 'rep ') + q.p.repKey : ''}`));
    g.appendChild(rect);
    if (cfg.showEntry && cw >= 34 && ch >= 16) g.appendChild(Fig.text(x + cw / 2, y + ch / 2 + 3.5, cut(q.p.entry, Math.floor(cw / 5.5)), { size: Math.min(9, ch * 0.4), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
  });
  f.g.appendChild(g);
  const axisG = Fig.g();
  const step = n => (n > 30 ? 5 : n > 15 ? 2 : 1);
  for (let c = cmin; c <= cmax; c += step(nc)) axisG.appendChild(Fig.text(f.x0 + (c - cmin + 0.5) * cw, f.y0 + nr * ch + 16, String(c), { size: 10, anchor: 'middle', fill: f.t.muted, font: f.font, role: 'tick' }));
  for (let r = rmin; r <= rmax; r += step(nr)) axisG.appendChild(Fig.text(f.x0 - 8, f.y0 + (r - rmin + 0.5) * ch + 4, String(r), { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'tick' }));
  axisG.appendChild(Fig.text(f.x0 + nc * cw / 2, f.y0 + nr * ch + 38, hasRC ? T('Columna', 'Column') : T('Parcela dentro de la repetición', 'Plot within replicate'), { size: 12, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'axis' }));
  axisG.appendChild(Fig.text(22, f.y0 + nr * ch / 2, hasRC ? T('Fila', 'Row') : T('Repetición', 'Replicate'), { size: 12, anchor: 'middle', fill: f.t.fg, font: f.font, rotate: -90, role: 'axis' }));
  f.g.appendChild(axisG);
  f.x1 = f.x0 + nc * cw; f.y1 = f.y0 + nr * ch;
  if (vals.length) P3.colorbar(f, cfg, lo, hi, ramp, cut(o.label, 16));
  return svg;
};

/* ---------------- 3 · distributions by environment ---------------- */
P3.distribution = (cfg0, groups, o) => {
  const cfg = t3(cfg0, 'Distribución por ambiente', 'Distribution by environment');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const all = groups.flatMap(g => g.values);
  const dom = Fig.niceDomain(Math.min(...all), Math.max(...all));
  const labels = groups.map(g => g.name);
  const C = Fig.bandPlot(svg, cfg, labels, dom, { catLabel: T('Ambiente', 'Environment'), valueLabel: o.label, padding: 0.35 });
  const f = C.f, g = Fig.g();
  const r = rng(7);
  groups.forEach((gr, i) => {
    const b = S.boxStats(gr.values);
    const col = Fig.color(cfg.palette, i);
    const pos = C.start(i), w = C.bw, mid = C.center(i);
    g.appendChild(C.rect(pos, w, b.q1, b.q3, { fill: Fig.alpha(col, 0.22), stroke: col, 'stroke-width': 1.6, rx: 3 }));
    g.appendChild(C.line(pos, b.median, pos + w, b.median, { stroke: col, 'stroke-width': 2.6 }));
    g.appendChild(C.whisker(mid, b.whiskerLo, b.q1, w * 0.18, { stroke: col, 'stroke-width': 1.3 }));
    g.appendChild(C.whisker(mid, b.q3, b.whiskerHi, w * 0.18, { stroke: col, 'stroke-width': 1.3 }));
    if (cfg.points !== false) gr.items.forEach(it => {
      const off = (r() - 0.5) * w * 0.7;
      const [x, y] = C.P(mid + off, it.value);
      const bad = o.flag && o.flag(it);
      const c = Fig.el('circle', { cx: x, cy: y, r: bad ? 4.2 : 2.3, fill: bad ? Fig.color(cfg.palette, 3) : Fig.alpha(col, 0.55), stroke: bad ? f.t.fg : 'none', 'stroke-width': bad ? 1 : 0 });
      c.appendChild(Fig.el('title', {}, `${it.entry}: ${fmtNum(it.value, 3)}`));
      g.appendChild(c);
    });
    const [mx, my] = C.P(mid, gr.mean);
    g.appendChild(Fig.marker(mx, my, 4.2, 'diamond', { fill: f.t.bg, stroke: f.t.fg, 'stroke-width': 1.3 }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 4 · residual diagnostics ---------------- */
P3.residuals = (cfg0, res, o) => {
  const cfg = t3(cfg0, 'Diagnóstico de residuales', 'Residual diagnostics');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const W = cfg.width, gap = 70;
  const pts = res.filter(r => isFinite(r.r));
  const col = Fig.color(cfg.palette, 0), bad = Fig.color(cfg.palette, 3);
  const flagged = r => r.pBonf < 0.05 || Math.abs(r.t) >= 3.5;
  /* left: studentised residuals against fitted values */
  const fL = Fig.frame(svg, cfg, { margin: { left: 74, right: W / 2 + gap / 2, top: 64, bottom: 64 } });
  const xs = pts.map(r => r.fitted), ys = pts.map(r => r.r);
  const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs));
  const ym = Math.max(3.5, ...ys.map(Math.abs)) * 1.05;
  const sx = Fig.scaleLinear(dx[0], dx[1], fL.x0, fL.x1), sy = Fig.scaleLinear(-ym, ym, fL.y1, fL.y0);
  Fig.axisX(fL, sx, Object.assign({}, cfg, { xlab: T('Valor ajustado', 'Fitted value') }));
  Fig.axisY(fL, sy, Object.assign({}, cfg, { ylab: T('Residual estandarizado', 'Standardised residual') }));
  const g = Fig.g();
  [-3, 0, 3].forEach(v => g.appendChild(Fig.el('line', { x1: fL.x0, x2: fL.x1, y1: sy(v), y2: sy(v), stroke: v ? bad : fL.t.muted, 'stroke-dasharray': v ? '5 4' : null, 'stroke-width': 1.1, opacity: v ? 0.7 : 1 })));
  pts.forEach(r => {
    const c = Fig.el('circle', { cx: sx(r.fitted), cy: sy(r.r), r: flagged(r) ? 4.5 : 3, fill: flagged(r) ? bad : Fig.alpha(col, 0.6), stroke: flagged(r) ? fL.t.fg : 'none' });
    c.appendChild(Fig.el('title', {}, `${r.entry} · ${T('rep. ', 'rep ')}${r.rep} · ${fmtNum(r.y, 3)}`));
    g.appendChild(c);
  });
  g.appendChild(Fig.text((fL.x0 + fL.x1) / 2, fL.y0 - 10, T('Residuales contra valores ajustados', 'Residuals against fitted values'), { size: 12, anchor: 'middle', fill: fL.t.muted, font: fL.font, role: 'subtitle', weight: 'bold' }));
  fL.g.appendChild(g);
  /* right: normal quantile plot */
  const fR = { g: fL.g, x0: W / 2 + gap / 2 + 20, x1: W - 30, y0: fL.y0, y1: fL.y1, t: fL.t, font: fL.font, W, H: fL.H, m: {} };
  const sorted = pts.map(r => r).sort((a, b) => a.r - b.r);
  const n = sorted.length;
  const q = sorted.map((r, i) => ({ r, z: S.qnorm((i + 1 - 0.375) / (n + 0.25)) }));
  const zm = Math.max(...q.map(v => Math.abs(v.z))) * 1.08;
  const qx = Fig.scaleLinear(-zm, zm, fR.x0, fR.x1), qy = Fig.scaleLinear(-ym, ym, fR.y1, fR.y0);
  const axX = Fig.axisX(fR, qx, Object.assign({}, cfg, { xlab: T('Cuantil normal teórico', 'Theoretical normal quantile') }));
  const axY = Fig.axisY(fR, qy, Object.assign({}, cfg, { ylab: '' }));
  axX.querySelectorAll('text').forEach(t => { if (+t.getAttribute('y') > fR.y1 + 30) t.setAttribute('x', (fR.x0 + fR.x1) / 2); });
  const g2 = Fig.g();
  g2.appendChild(Fig.el('line', { x1: qx(-zm), y1: qy(-zm), x2: qx(zm), y2: qy(zm), stroke: fL.t.muted, 'stroke-width': 1.3, 'stroke-dasharray': '6 4' }));
  q.forEach(v => g2.appendChild(Fig.el('circle', { cx: qx(v.z), cy: qy(v.r.r), r: flagged(v.r) ? 4.5 : 3, fill: flagged(v.r) ? bad : Fig.alpha(col, 0.6), stroke: flagged(v.r) ? fL.t.fg : 'none' })));
  g2.appendChild(Fig.text((fR.x0 + fR.x1) / 2, fR.y0 - 10, o && o.shapiro ? `Shapiro–Wilk W = ${fmtFixed(o.shapiro.W, 4)}, ${pEq(o.shapiro.p)}` : T('Gráfico cuantil–cuantil normal', 'Normal quantile–quantile plot'), { size: 12, anchor: 'middle', fill: fL.t.muted, font: fL.font, role: 'subtitle', weight: 'bold' }));
  fL.g.appendChild(g2);
  return svg;
};

/* ---------------- 5 · adjusted means ---------------- */
P3.means = (cfg0, means, o) => {
  const cfg = t3(cfg0, 'Medias ajustadas', 'Adjusted means');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  let list = means.filter(m => isFinite(m.mean)).slice().sort((a, b) => (cfg.order === 'name' ? LM.natCmp(a.entry, b.entry) : b.mean - a.mean));
  const maxN = +cfg.maxEntries || 60;
  let note = '';
  if (list.length > maxN) {
    const half = Math.floor(maxN / 2);
    note = T(`${half} mejores y ${half} peores de ${list.length}`, `best ${half} and worst ${half} of ${list.length}`);
    list = list.slice(0, half).concat(list.slice(-half));
  }
  const tcrit = o.df > 0 ? S.qt(0.975, o.df) : 1.96;
  const lo = Math.min(...list.map(m => m.mean - (isFinite(m.se) ? tcrit * m.se : 0))), hi = Math.max(...list.map(m => m.mean + (isFinite(m.se) ? tcrit * m.se : 0)));
  const dom = Fig.niceDomain(lo, hi);
  const labels = list.map(m => cut(m.entry, 22));
  const types = [...new Set(list.map(m => m.type))];
  const cfgB = Object.assign({}, cfg, { subtitle: cfg.subtitle || note });
  const C = Fig.bandPlot(svg, cfgB, labels, dom, { catLabel: T('Entrada', 'Entry'), valueLabel: o.label, padding: 0.2, legendLabels: types.map(o.typeName) });
  const f = C.f, g = Fig.g();
  if (isFinite(o.grand)) { g.appendChild(C.ref(o.grand, { stroke: f.t.muted, 'stroke-dasharray': '6 4', 'stroke-width': 1.2 })); }
  list.forEach((m, i) => {
    const colr = Fig.color(cfg.palette, types.indexOf(m.type));
    if (isFinite(m.se) && cfg.showCI !== false) g.appendChild(C.whisker(C.center(i), m.mean - tcrit * m.se, m.mean + tcrit * m.se, Math.min(4, C.bw * 0.3), { stroke: colr, 'stroke-width': 1.3, opacity: 0.8 }));
    const [x, y] = C.P(C.center(i), m.mean);
    const dot = Fig.marker(x, y, Math.max(2.4, Math.min(5, C.bw * 0.4)), m.type === 'check' ? 'diamond' : m.type === 'parent' ? 'square' : 'circle', { fill: colr, stroke: f.t.bg, 'stroke-width': 0.8 });
    g.appendChild(dot);
  });
  f.g.appendChild(g);
  if (types.length > 1 || types[0] !== 'entry') Fig.legend(f, types.map((tp, k) => ({ label: o.typeName(tp), color: Fig.color(cfg.palette, k), shape: 'circle' })), cfg, { pos: 'right' });
  return svg;
};

window.P3 = P3;
