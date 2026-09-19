/* BreedingPro — Block 10 figures: inbreeding by generation, the relationship matrix, breeding
   values with their reliability, the genetic trend, BLUP against the observed mean, and the
   predicted performance of crosses and crossbreeding systems. */

const P10 = {};
const t10 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut10 = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------------- 1 · inbreeding by generation ---------------- */
P10.inbreeding = (cfg0, byGen) => {
  const cfg = t10(cfg0, 'Consanguinidad por generación', 'Inbreeding by generation');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const labels = byGen.map(g => T('Gen. ', 'Gen. ') + g.g);
  const top = Math.max(0.05, ...byGen.map(g => g.maxF));
  const C = Fig.bandPlot(svg, cfg, labels, [0, Math.min(1, Fig.niceDomain(0, top, true)[1])], { catLabel: '', valueLabel: 'F', padding: 0.35 });
  const f = C.f, g = Fig.g();
  const col = Fig.color(cfg.palette, 0), col2 = Fig.color(cfg.palette, 5);
  byGen.forEach((b, i) => {
    g.appendChild(C.bar(i, b.meanF, { fill: Fig.alpha(col, 0.8), rx: 2 }));
    g.appendChild(C.marker(C.center(i), b.maxF, 4.5, 'diamond', { fill: col2, stroke: f.t.bg, 'stroke-width': 1 }));
    g.appendChild(C.valueText(C.center(i), Math.max(b.meanF, b.maxF), 'n = ' + b.n, { size: 9.5, fill: f.t.muted }, 10));
  });
  f.g.appendChild(g);
  Fig.legend(f, [{ label: T('F media', 'mean F'), color: Fig.alpha(col, 0.8) }, { label: T('F máxima', 'largest F'), color: col2, shape: 'circle' }], cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- 2 · relationship matrix ---------------- */
P10.relationship = (cfg0, A, ids) => {
  const cfg = t10(cfg0, 'Matriz de parentesco aditivo A', 'Additive relationship matrix A');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const n = ids.length;
  const f = Fig.frame(svg, cfg, { margin: { left: 70, right: 110, top: 86, bottom: 30 } });
  const cell = Math.max(4, Math.min((f.x1 - f.x0) / n, (f.y1 - f.y0) / n));
  const top = Math.max(1, ...Array.from(A));
  const ramp = Fig.colormaps[cfg.colormap] || Fig.colormaps.heat;
  const g = Fig.g();
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = A[i * n + j];
    const fill = ramp(Math.max(0, Math.min(1, v / top)));
    const r = Fig.el('rect', { x: f.x0 + j * cell, y: f.y0 + i * cell, width: cell, height: cell, fill, stroke: f.t.bg, 'stroke-width': cell > 8 ? 0.5 : 0 });
    r.appendChild(Fig.el('title', {}, `${ids[i]} · ${ids[j]} · a = ${fmtFixed(v, 4)}`));
    g.appendChild(r);
    if (cell >= 30) g.appendChild(Fig.text(f.x0 + j * cell + cell / 2, f.y0 + i * cell + cell / 2 + 3.5, fmtFixed(v, 3), { size: Math.min(10, cell * 0.28), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
  }
  const fs = Math.max(7, Math.min(11, cell * 0.6));
  if (cell >= 7) ids.forEach((id, i) => {
    g.appendChild(Fig.text(f.x0 - 5, f.y0 + i * cell + cell / 2 + fs * 0.35, cut10(id, 10), { size: fs, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' }));
    g.appendChild(Fig.text(f.x0 + i * cell + cell / 2 + fs * 0.35, f.y0 - 5, cut10(id, 10), { size: fs, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' }));
  });
  f.g.appendChild(g);
  f.x1 = f.x0 + n * cell;
  P3.colorbar(f, cfg, 0, top, ramp, 'a');
  return svg;
};

/* ---------------- 3 · breeding values ---------------- */
P10.ebv = (cfg0, rows, o) => {
  const cfg = t10(cfg0, 'Valores genéticos estimados', 'Estimated breeding values');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  if (cfg.show === 'scatter') {
    const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: 64 } });
    const xs = rows.map(r => r.ebv), ys = rows.map(r => r.acc);
    const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs)), dy = [0, 1];
    const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(0, 1, f.y1, f.y0);
    Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || o.label }));
    Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('exactitud r', 'accuracy r') }));
    const g = Fig.g();
    g.appendChild(Fig.el('line', { x1: sx(0), x2: sx(0), y1: f.y0, y2: f.y1, stroke: f.t.muted, 'stroke-dasharray': '4 4' }));
    const c0 = Fig.color(cfg.palette, 0), c1 = Fig.color(cfg.palette, 1);
    rows.forEach(r => {
      const m = Fig.marker(sx(r.ebv), sy(r.acc), 3.6, r.nrec ? 'circle' : 'triangle', { fill: Fig.alpha(r.nrec ? c0 : c1, 0.75), stroke: f.t.bg, 'stroke-width': 0.6 });
      m.appendChild(Fig.el('title', {}, `${r.id} · ${fmtNum(r.ebv, 4)} · r = ${fmtFixed(r.acc, 3)}`));
      g.appendChild(m);
    });
    f.g.appendChild(g);
    Fig.legend(f, [{ label: T('con registros', 'with records'), color: c0, shape: 'circle' }, { label: T('sin registros', 'without records'), color: c1, shape: 'circle' }], cfg, { pos: 'bottom' });
    return svg;
  }
  const top = rows.slice().sort((a, b) => (o.lower ? a.ebv - b.ebv : b.ebv - a.ebv)).slice(0, Math.max(5, Math.min(60, cfg.topN || 25)));
  const labels = top.map(r => cut10(r.id, 14));
  const lo = Math.min(0, ...top.map(r => r.ebv - r.sep)), hi = Math.max(0, ...top.map(r => r.ebv + r.sep));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(lo, hi, true), { catLabel: '', valueLabel: o.label, padding: 0.3 });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1 }));
  top.forEach((r, i) => {
    const colr = Fig.color(cfg.palette, r.nrec ? 0 : 1);
    const bar = C.bar(i, r.ebv, { fill: Fig.alpha(colr, 0.35 + 0.55 * r.acc), rx: 2 });
    bar.appendChild(Fig.el('title', {}, `${r.id} · ${fmtNum(r.ebv, 4)} ± ${fmtNum(r.sep, 4)} · r = ${fmtFixed(r.acc, 3)}`));
    g.appendChild(bar);
    if (cfg.showSep !== false) g.appendChild(C.whisker(C.center(i), r.ebv - r.sep, r.ebv + r.sep, Math.min(5, C.bw * 0.2), { stroke: f.t.fg, 'stroke-width': 1 }));
  });
  f.g.appendChild(g);
  if (top.some(r => !r.nrec)) Fig.legend(f, [{ label: T('con registros', 'with records'), color: Fig.color(cfg.palette, 0) }, { label: T('sin registros', 'without records'), color: Fig.color(cfg.palette, 1) }], cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- 4 · genetic trend ---------------- */
P10.trend = (cfg0, trend, o) => {
  const cfg = t10(cfg0, 'Tendencia genética', 'Genetic trend');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: 64 } });
  /* a mean that is zero up to rounding (the founders) is written as 0; fixed decimals by the scale */
  const big = Math.max(...trend.map(t => Math.abs(t.mean))) || 1;
  trend = trend.map(t => Object.assign({}, t, { mean: Math.abs(t.mean) < 1e-9 * big ? 0 : t.mean }));
  const dec = big >= 100 ? 1 : big >= 1 ? 2 : 3;
  const ys = trend.map(t => t.mean);
  const dy = Fig.niceDomain(Math.min(0, ...ys), Math.max(0, ...ys), true);
  const band = Fig.scaleBand(trend.map(t => String(t.g)), f.x0, f.x1, 0.4);
  const sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || o.label }));
  Fig.axisXBand(f, band, trend.map(t => String(t.g)), Object.assign({}, cfg, { xlab: cfg.xlab || o.xlab }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(0), y2: sy(0), stroke: f.t.muted, 'stroke-dasharray': '4 4' }));
  const col = Fig.color(cfg.palette, 0);
  g.appendChild(Fig.el('path', { d: trend.map((t, i) => (i ? 'L' : 'M') + band.center(i).toFixed(1) + ' ' + sy(t.mean).toFixed(1)).join(' '), fill: 'none', stroke: col, 'stroke-width': 2.2 }));
  trend.forEach((t, i) => {
    const m = Fig.marker(band.center(i), sy(t.mean), 5, 'circle', { fill: col, stroke: f.t.bg, 'stroke-width': 1.2 });
    m.appendChild(Fig.el('title', {}, `${t.g} · n = ${t.n} · ${fmtNum(t.mean, 4)}`));
    g.appendChild(m);
    g.appendChild(Fig.text(band.center(i), sy(t.mean) - 10, fmtFixed(t.mean, dec), { size: 10, anchor: 'middle', fill: f.t.fg, font: f.font, role: 'label', halo: f.t.bg }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 5 · BLUP against the observed mean ---------------- */
P10.shrink = (cfg0, rows, o) => {
  const cfg = t10(cfg0, 'Media observada y valor predicho (BLUP)', 'Observed mean and predicted value (BLUP)');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: 64 } });
  const all = rows.map(r => r.raw).concat(rows.map(r => r.pred));
  const d = Fig.niceDomain(Math.min(...all), Math.max(...all));
  const sx = Fig.scaleLinear(d[0], d[1], f.x0, f.x1), sy = Fig.scaleLinear(d[0], d[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || T('media observada de la entrada', 'observed mean of the entry') }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('valor predicho (BLUP)', 'predicted value (BLUP)') }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: sx(d[0]), y1: sy(d[0]), x2: sx(d[1]), y2: sy(d[1]), stroke: f.t.muted, 'stroke-dasharray': '5 4' }));
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(o.mean), y2: sy(o.mean), stroke: f.t.muted, 'stroke-width': 0.8 }));
  const col = Fig.color(cfg.palette, 0), col2 = Fig.color(cfg.palette, 5);
  const items = [];
  const best = new Set(rows.slice().sort((a, b) => (o.lower ? a.pred - b.pred : b.pred - a.pred)).slice(0, 8).map(r => r.entry));
  rows.forEach(r => {
    const on = best.has(r.entry);
    const m = Fig.marker(sx(r.raw), sy(r.pred), on ? 5 : 3.8, 'circle', { fill: Fig.alpha(on ? col2 : col, 0.8), stroke: f.t.bg, 'stroke-width': 0.8 });
    m.appendChild(Fig.el('title', {}, `${r.entry} · ${fmtNum(r.raw, 4)} → ${fmtNum(r.pred, 4)} · r² = ${fmtFixed(r.rel, 3)}`));
    g.appendChild(m);
    if (on) items.push({ x: sx(r.raw), y: sy(r.pred), text: cut10(r.entry, 12), r: 5 });
  });
  f.g.appendChild(g);
  Fig.repelLabels(g, f, items, {});
  f.g.appendChild(Fig.text(f.x1 - 6, sy(d[1]) + 14, '1 : 1', { size: 10, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
  return svg;
};

/* ---------------- 6 · crosses and crossbreeding systems ---------------- */
P10.crosses = (cfg0, preds, o) => {
  const cfg = t10(cfg0, 'Desempeño predicho', 'Predicted performance');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const ok = preds.filter(p => isFinite(p.est));
  const labels = ok.map(p => cut10(p.label || p.expr, 22));
  const vals = ok.flatMap(p => [p.est - (isFinite(p.se) ? p.se : 0), p.est + (isFinite(p.se) ? p.se : 0)]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = 0.15 * (hi - lo || Math.abs(hi) || 1);
  const dom = cfg.fromZero ? Fig.niceDomain(Math.min(0, lo), hi, true) : Fig.niceDomain(lo - pad, hi + pad);
  const C = Fig.bandPlot(svg, cfg, labels, dom, { catLabel: '', valueLabel: o.label, padding: 0.3, margin: { right: 60 } });
  const f = C.f, g = Fig.g();
  const kind = p => (p.c.system ? 2 : p.c.pure ? 0 : 1);
  ok.forEach((p, i) => {
    const colr = Fig.color(cfg.palette, [0, 1, 5][kind(p)]);
    g.appendChild(C.bar(i, p.est, { fill: Fig.alpha(colr, 0.85), rx: 2 }, dom[0]));
    if (isFinite(p.se)) g.appendChild(C.whisker(C.center(i), p.est - p.se, p.est + p.se, Math.min(5, C.bw * 0.2), { stroke: f.t.fg, 'stroke-width': 1.1 }));
    g.appendChild(C.edgeText(C.center(i), fmtNum(p.est, 2), { size: 9.5, fill: f.t.fg }));
  });
  f.g.appendChild(g);
  Fig.legend(f, [{ label: T('razas puras', 'purebreds'), color: Fig.color(cfg.palette, 0) }, { label: T('cruzas', 'crosses'), color: Fig.color(cfg.palette, 1) }, { label: T('sistemas (rotaciones, compuestas)', 'systems (rotations, composites)'), color: Fig.color(cfg.palette, 5) }], cfg, { pos: 'bottom' });
  return svg;
};

window.P10 = P10;
