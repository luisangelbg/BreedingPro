/* BreedingPro — Block 4 figures: combining-ability effects, the matrix of specific
   and reciprocal effects, observed against predicted crosses, variance components
   and the comparison of Griffing's four methods. */

const P4 = {};
const t4 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const clip = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

P4.starOf = p => (!isFinite(p) ? '' : p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : '');

/* ---------------- 1 · GCA (or maternal) effects ---------------- */
P4.effects = (cfg0, list, o) => {
  const cfg = t4(cfg0, 'Efectos de aptitud combinatoria general', 'General combining ability effects');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const items = list.slice().sort((a, b) => (cfg.order === 'name' ? LM.natCmp(a.name, b.name) : b.est - a.est));
  const tcrit = o.tcrit || 1.96;
  let lo = Math.min(0, ...items.map(m => m.est - tcrit * m.se)), hi = Math.max(0, ...items.map(m => m.est + tcrit * m.se));
  /* room for the significance stars beyond the outermost whiskers, so they never reach the axis labels */
  const room = (hi - lo) * 0.1;
  if (items.some(m => m.est < 0 && P4.starOf(m.p))) lo -= room;
  if (items.some(m => m.est >= 0 && P4.starOf(m.p))) hi += room;
  const dom = Fig.niceDomain(lo, hi, true);
  const C = Fig.bandPlot(svg, cfg, items.map(m => clip(m.name, 18)), dom, { catLabel: T('Progenitor', 'Parent'), valueLabel: o.label, padding: 0.28 });
  const f = C.f, g = Fig.g();
  const pos = Fig.color(cfg.palette, 0), neg = Fig.color(cfg.palette, 3);
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1.2 }));
  if (o.lsd && cfg.showLsd !== false) {
    g.appendChild(C.span(-o.lsd / 2, o.lsd / 2, { fill: Fig.alpha(f.t.muted, 0.13) }));
    g.appendChild(C.refLabel ? C.refLabel(o.lsd / 2, T('± DMS/2', '± LSD/2'), { fill: f.t.muted }) : Fig.g());
  }
  items.forEach((m, i) => {
    const col = m.est >= 0 ? pos : neg;
    if (cfg.style === 'bars') g.appendChild(C.bar(i, m.est, { fill: Fig.alpha(col, 0.85), rx: 2 }));
    const [x, y] = C.P(C.center(i), m.est);
    if (cfg.style !== 'bars') g.appendChild(Fig.marker(x, y, 4.4, 'circle', { fill: col, stroke: f.t.bg, 'stroke-width': 1 }));
    if (isFinite(m.se) && cfg.showCI !== false) g.appendChild(C.whisker(C.center(i), m.est - tcrit * m.se, m.est + tcrit * m.se, Math.min(4.5, C.bw * 0.28), { stroke: col, 'stroke-width': 1.5 }));
    const star = P4.starOf(m.p);
    if (star) {
      const [sx, sy] = C.P(C.center(i), m.est + Math.sign(m.est || 1) * (tcrit * (isFinite(m.se) ? m.se : 0) + (dom[1] - dom[0]) * 0.03));
      /* below a negative effect the star hangs under the whisker (text grows upwards from its baseline) */
      g.appendChild(Fig.text(sx, sy + (cfg.flip ? 4 : m.est < 0 ? 9 : 0), star, { size: 11, anchor: 'middle', fill: f.t.fg, font: f.font, weight: 'bold', role: 'label' }));
    }
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 2 · matrix of effects ---------------- */
/* upper triangle (and diagonal) = SCA; lower triangle = reciprocal effects, when present */
P4.matrix = (cfg0, o) => {
  const cfg = t4(cfg0, 'Efectos de aptitud combinatoria específica', 'Specific combining ability effects');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const names = o.parents, p = names.length;
  const labW = Math.min(140, 16 + 7 * Math.max(...names.map(x => clip(x, 16).length)));
  const labH = Math.min(110, 14 + 6.4 * Math.max(...names.map(x => clip(x, 14).length)));
  const f = Fig.frame(svg, cfg, { margin: { left: labW + 30, right: 118, top: 50 + labH, bottom: 66 } });
  const cell = Math.max(14, Math.min((f.x1 - f.x0) / p, (f.y1 - f.y0) / p, 62));
  const vals = [];
  o.cells.forEach(c => { if (isFinite(c.est)) vals.push(Math.abs(c.est)); });
  const mx = vals.length ? Math.max(...vals) : 1;
  const ramp = Fig.colormaps[cfg.colormap] || Fig.colormaps.rdbu;
  const ink = v => ramp(0.5 + 0.5 * Math.max(-1, Math.min(1, v / mx)));
  const byKey = new Map(o.cells.map(c => [c.i + '|' + c.j + '|' + c.kind, c]));
  const g = Fig.g();
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    const x = f.x0 + j * cell, y = f.y0 + i * cell;
    const kind = i <= j ? 'sca' : 'rec';
    const c = byKey.get(Math.min(i, j) + '|' + Math.max(i, j) + '|' + kind);
    if (!c) { g.appendChild(Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: 'none', stroke: f.t.grid === 'none' ? f.t.axis : f.t.grid, 'stroke-dasharray': '2 2' })); continue; }
    const fill = ink(c.est);
    const rect = Fig.el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill, rx: 3 });
    rect.appendChild(Fig.el('title', {}, `${names[c.i]} × ${names[c.j]} · ${kind === 'sca' ? T('ACE', 'SCA') : T('recíproco', 'reciprocal')} ${fmtNum(c.est, 3)} ± ${fmtNum(c.se, 3)}${isFinite(c.p) ? ' · ' + pEq(c.p) : ''}`));
    g.appendChild(rect);
    if (cfg.showValues !== false && cell >= 30) {
      const txt = fmtNum(c.est, Math.abs(c.est) >= 100 ? 0 : 1) + P4.starOf(c.p);
      g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + 3.5, txt, { size: Math.min(10.5, cell * 0.26), anchor: 'middle', fill: Fig.onColor(fill), font: f.font, role: 'label' }));
    } else if (cell >= 14 && P4.starOf(c.p)) g.appendChild(Fig.text(x + cell / 2, y + cell / 2 + 3, P4.starOf(c.p), { size: Math.min(10, cell * 0.4), anchor: 'middle', fill: Fig.onColor(fill), font: f.font }));
  }
  const fs = Math.max(7, Math.min(11, cell * 0.42));
  names.forEach((nm, i) => {
    g.appendChild(Fig.text(f.x0 - 6, f.y0 + i * cell + cell / 2 + fs * 0.35, clip(nm, 16), { size: fs, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' }));
    g.appendChild(Fig.text(f.x0 + i * cell + cell / 2 + fs * 0.35, f.y0 - 6, clip(nm, 14), { size: fs, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' }));
  });
  f.g.appendChild(g);
  f.x1 = f.x0 + p * cell; f.y1 = f.y0 + p * cell;
  P3.colorbar(f, cfg, -mx, mx, ramp, o.label || T('efecto', 'effect'));
  const note = o.hasRecip ? T('triángulo superior: ACE · triángulo inferior: efectos recíprocos', 'upper triangle: SCA · lower triangle: reciprocal effects') : T('* p < 0.05  ** p < 0.01  *** p < 0.001', '* p < 0.05  ** p < 0.01  *** p < 0.001');
  f.g.appendChild(Fig.text(f.x0, f.y1 + 34, note, { size: 10.5, fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- 3 · observed against predicted ---------------- */
P4.observedPredicted = (cfg0, list, o) => {
  const cfg = t4(cfg0, 'Observado contra predicho por la ACG', 'Observed against GCA prediction');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const pts = list.filter(c => isFinite(c.observed) && isFinite(cfg.withSca ? c.predicted : c.predictedGca));
  const px = c => (cfg.withSca ? c.predicted : c.predictedGca);
  const xs = pts.map(px), ys = pts.map(c => c.observed);
  const all = xs.concat(ys);
  const dom = Fig.niceDomain(Math.min(...all), Math.max(...all));
  const f = Fig.frame(svg, cfg, { margin: { left: 78, right: 150, top: 56, bottom: 64 } });
  const sx = Fig.scaleLinear(dom[0], dom[1], f.x0, f.x1), sy = Fig.scaleLinear(dom[0], dom[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || T('Predicho: μ̂ + ĝᵢ + ĝⱼ', 'Predicted: μ̂ + ĝᵢ + ĝⱼ') + (cfg.withSca ? T(' + ŝᵢⱼ', ' + ŝᵢⱼ') : '') }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('Media observada', 'Observed mean') }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: sx(dom[0]), y1: sy(dom[0]), x2: sx(dom[1]), y2: sy(dom[1]), stroke: f.t.muted, 'stroke-dasharray': '6 4', 'stroke-width': 1.3 }));
  const kinds = [['self', T('progenitor', 'parent'), 1], ['cross', T('cruza', 'cross'), 0]];
  pts.forEach(c => {
    const col = Fig.color(cfg.palette, c.self ? 1 : 0);
    const dot = Fig.marker(sx(px(c)), sy(c.observed), c.self ? 4 : 4.4, c.self ? 'square' : 'circle', { fill: Fig.alpha(col, 0.8), stroke: f.t.bg, 'stroke-width': 0.8 });
    dot.appendChild(Fig.el('title', {}, `${c.name} · ${T('obs.', 'obs.')} ${fmtNum(c.observed, 3)} · ${T('pred.', 'pred.')} ${fmtNum(px(c), 3)}${isFinite(c.sca) ? ' · ACE ' + fmtNum(c.sca, 3) : ''}`));
    g.appendChild(dot);
  });
  /* label the crosses that depart most from the prediction */
  const labels = pts.map(c => ({ c, d: Math.abs(c.observed - px(c)) })).sort((a, b) => b.d - a.d).slice(0, +(cfg.labels == null ? 6 : cfg.labels));
  f.g.appendChild(g);
  Fig.repelLabels(g, f, labels.map(l => ({ x: sx(px(l.c)), y: sy(l.c.observed), text: clip(l.c.name, 16), r: 4.4 })), { obstacles: pts.map(c => ({ x: sx(px(c)), y: sy(c.observed), r: 4 })) });
  const r2 = (() => { const mx = S.mean(xs), my = S.mean(ys); let sxy = 0, sxx = 0, syy = 0; pts.forEach(c => { sxy += (px(c) - mx) * (c.observed - my); sxx += (px(c) - mx) ** 2; syy += (c.observed - my) ** 2; }); return sxy * sxy / (sxx * syy); })();
  f.g.appendChild(Fig.text(f.x1, f.y0 - 12, `r² = ${fmtFixed(r2, 3)}`, { size: 11.5, anchor: 'end', fill: f.t.muted, font: f.font, role: 'label' }));
  Fig.legend(f, kinds.filter(([k]) => pts.some(c => (k === 'self') === !!c.self)).map(([k, lab]) => ({ label: lab, color: Fig.color(cfg.palette, k === 'self' ? 1 : 0), shape: k === 'self' ? 'square' : 'circle' })), cfg, { pos: 'right' });
  return svg;
};

/* ---------------- 4 · variance components ---------------- */
P4.components = (cfg0, comps, o) => {
  const cfg = t4(cfg0, 'Componentes de varianza', 'Variance components');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const items = comps.filter(c => c.key !== 'e' || cfg.withError);
  const labels = items.map(c => T(c));
  const lo = Math.min(0, ...items.map(c => c.value - (isFinite(c.se) ? c.se : 0)));
  const hi = Math.max(...items.map(c => c.value + (isFinite(c.se) ? c.se : 0)));
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(lo, hi, true), { catLabel: '', valueLabel: o.label || T('varianza', 'variance'), padding: 0.34 });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1 }));
  items.forEach((c, i) => {
    const col = Fig.color(cfg.palette, i);
    g.appendChild(C.bar(i, c.value, { fill: Fig.alpha(col, 0.85), rx: 3 }));
    if (isFinite(c.se)) g.appendChild(C.whisker(C.center(i), c.value - c.se, c.value + c.se, Math.min(5, C.bw * 0.22), { stroke: f.t.fg, 'stroke-width': 1.2 }));
    /* the label sits beyond the whisker so it never covers it */
    const tip = c.value + (isFinite(c.se) ? Math.sign(c.value || 1) * c.se : 0);
    const [tx, ty] = C.P(C.center(i), tip);
    g.appendChild(Fig.text(tx + (cfg.flip ? 10 : 0), ty + (cfg.flip ? 4 : (c.value >= 0 ? -9 : 15)), fmtNum(c.value, 3), { size: 10, anchor: cfg.flip ? 'start' : 'middle', fill: f.t.fg, font: f.font, role: 'label' }));
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- 5 · comparison of the four methods ---------------- */
P4.methods = (cfg0, rows, o) => {
  const cfg = t4(cfg0, 'Los cuatro métodos de Griffing sobre los mismos datos', "Griffing's four methods on the same data");
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const all = cfg.show === 'components' ? [['g', 'σ²ACG', 'σ²GCA'], ['s', 'σ²ACE', 'σ²SCA'], ['r', 'σ²recíprocos', 'σ²reciprocal']] : [['gca', 'ACG', 'GCA'], ['sca', 'ACE', 'SCA'], ['rec', 'Recíprocos', 'Reciprocal']];
  /* only the effects that at least one method estimates */
  const keys = all.filter(([k]) => rows.some(r => r.values[k] != null && isFinite(r.values[k])));
  const labels = rows.map(r => T(`Método ${r.method}`, `Method ${r.method}`));
  const vals = rows.flatMap(r => keys.map(([k]) => (r.values[k] == null ? 0 : r.values[k])));
  const dom = Fig.niceDomain(Math.min(0, ...vals), Math.max(...vals), true);
  const C = Fig.bandPlot(svg, cfg, labels, dom, { catLabel: '', valueLabel: o.label, padding: 0.3, legendLabels: keys.map(k => T(k[1], k[2])) });
  const f = C.f, g = Fig.g();
  const bw = C.bw / keys.length;
  g.appendChild(C.ref(0, { stroke: f.t.fg, 'stroke-width': 1 }));
  rows.forEach((r, i) => keys.forEach(([k], q) => {
    const v = r.values[k];
    if (v == null || !isFinite(v)) return;
    const col = Fig.color(cfg.palette, q);
    g.appendChild(C.rect(C.start(i) + q * bw, bw * 0.92, 0, v, { fill: Fig.alpha(col, 0.85), rx: 2 }));
  }));
  f.g.appendChild(g);
  Fig.legend(f, keys.map(([k, es, en], q) => ({ label: T(es, en), color: Fig.color(cfg.palette, q) })), cfg, { pos: 'right' });
  return svg;
};

/* ---------------- 6 · GCA across environments ---------------- */
P4.gcaEnv = (cfg0, series, o) => {
  const cfg = t4(cfg0, 'ACG en cada ambiente', 'GCA in each environment');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const envs = o.envs;
  const all = series.flatMap(s => s.values.filter(isFinite));
  const dom = Fig.niceDomain(Math.min(...all), Math.max(...all), true);
  const f = Fig.frame(svg, cfg, { margin: { left: 78, right: 150, top: 56, bottom: 74 } });
  const band = Fig.scaleBand(envs, f.x0, f.x1, 0.2);
  const sy = Fig.scaleLinear(dom[0], dom[1], f.y1, f.y0);
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: o.label }));
  Fig.axisXBand(f, band, envs, Object.assign({}, cfg, { xlab: T('Ambiente', 'Environment') }));
  const g = Fig.g();
  g.appendChild(Fig.el('line', { x1: f.x0, x2: f.x1, y1: sy(0), y2: sy(0), stroke: f.t.muted, 'stroke-dasharray': '4 4' }));
  series.forEach((s, k) => {
    const col = Fig.color(cfg.palette, k);
    const d = s.values.map((v, i) => (isFinite(v) ? (i ? 'L' : 'M') + band.center(i).toFixed(1) + ' ' + sy(v).toFixed(1) : '')).filter(Boolean).join(' ');
    g.appendChild(Fig.el('path', { d, fill: 'none', stroke: col, 'stroke-width': 2 }));
    s.values.forEach((v, i) => { if (isFinite(v)) g.appendChild(Fig.marker(band.center(i), sy(v), 3.4, Fig.shapes[k % Fig.shapes.length], { fill: col })); });
  });
  f.g.appendChild(g);
  Fig.legend(f, series.map((s, k) => ({ label: clip(s.name, 14), color: Fig.color(cfg.palette, k), shape: 'line' })), cfg, { pos: 'right' });
  return svg;
};

window.P4 = P4;
