/* BreedingPro — Block 11 figures: minor-allele frequencies, principal components of the genomic
   relationships, a relationship (or hybrid) matrix as a heat map, a scatter with a 1:1 line (GEBV
   against phenotype, G against A, predicted against observed hybrids), marker effects along the
   genome and the predictive ability of every cross-validation replicate. */

const P11 = {};
const t11 = (cfg, es, en) => Object.assign({}, cfg, { title: cfg.title || T(es, en) });
const cut11 = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ---------------- histogram ---------------- */
P11.hist = (cfg0, values, o) => {
  const cfg = t11(cfg0, o.titleEs, o.titleEn);
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 76, right: 30, top: 56, bottom: 64 } });
  const lo = o.lo != null ? o.lo : Math.min(...values), hi = o.hi != null ? o.hi : Math.max(...values);
  const nb = o.bins || 25, w = (hi - lo) / nb || 1;
  const counts = new Array(nb).fill(0);
  values.forEach(v => { if (!isFinite(v)) return; counts[Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / w)))]++; });
  const sx = Fig.scaleLinear(lo, hi, f.x0, f.x1), sy = Fig.scaleLinear(0, Fig.niceDomain(0, Math.max(...counts), true)[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || o.xlab }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('frecuencia', 'count') }));
  const g = Fig.g(), col = Fig.color(cfg.palette, 0);
  counts.forEach((c, b) => { if (!c) return; const r = Fig.el('rect', { x: sx(lo + b * w) + 0.5, y: sy(c), width: Math.max(0.5, sx(lo + (b + 1) * w) - sx(lo + b * w) - 1), height: sy(0) - sy(c), fill: Fig.alpha(col, 0.8) }); r.appendChild(Fig.el('title', {}, `${fmtNum(lo + b * w, 3)}–${fmtNum(lo + (b + 1) * w, 3)}: ${c}`)); g.appendChild(r); });
  if (o.ref != null) g.appendChild(Fig.el('line', { x1: sx(o.ref), x2: sx(o.ref), y1: f.y0, y2: f.y1, stroke: f.t.fg, 'stroke-dasharray': '5 4' }));
  f.g.appendChild(g);
  return svg;
};

/* ---------------- principal components ---------------- */
P11.pca = (cfg0, pc, ids, groups) => {
  const cfg = t11(cfg0, 'Componentes principales de G', 'Principal components of G');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 76, right: 30, top: 56, bottom: 74 } });
  const xs = pc.scores.map(s => s[0]), ys = pc.scores.map(s => s[1]);
  const dx = Fig.niceDomain(Math.min(...xs), Math.max(...xs)), dy = Fig.niceDomain(Math.min(...ys), Math.max(...ys));
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || `PC1 (${fmtNum(pc.pct[0], 1)} %)` }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || `PC2 (${fmtNum(pc.pct[1], 1)} %)` }));
  const levels = groups ? [...new Set(groups)] : [''];
  const g = Fig.g();
  pc.scores.forEach((s, i) => {
    const k = groups ? levels.indexOf(groups[i]) : 0;
    const m = Fig.marker(sx(s[0]), sy(s[1]), 3.6, Fig.shapes[k % Fig.shapes.length], { fill: Fig.alpha(Fig.color(cfg.palette, k), 0.75), stroke: f.t.bg, 'stroke-width': 0.6 });
    m.appendChild(Fig.el('title', {}, `${ids[i]}${groups ? ' · ' + groups[i] : ''}`));
    g.appendChild(m);
  });
  f.g.appendChild(g);
  if (groups && levels.length > 1) Fig.legend(f, levels.map((l, k) => ({ label: l, color: Fig.color(cfg.palette, k), shape: 'circle' })), cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- a matrix as a heat map (rows × columns, already reduced) ---------------- */
P11.matrix = (cfg0, o) => {
  const cfg = t11(cfg0, o.titleEs, o.titleEn);
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const nr = o.rows.length, nc = o.cols.length;
  const showLab = nr <= 60 && nc <= 60;
  const f = Fig.frame(svg, cfg, { margin: { left: showLab ? 70 : 40, right: 110, top: showLab ? 86 : 50, bottom: o.note ? 44 : 24 } });
  const cw = (f.x1 - f.x0) / nc, ch = (f.y1 - f.y0) / nr;
  const vals = o.M.filter(isFinite);
  let lo = o.lo != null ? o.lo : Math.min(...vals), hi = o.hi != null ? o.hi : Math.max(...vals);
  if (o.symmetric) { const a = Math.max(Math.abs(lo), Math.abs(hi)); lo = -a; hi = a; }
  const ramp = Fig.colormaps[cfg.colormap || o.colormap || 'viridis'] || Fig.colormaps.viridis;
  const g = Fig.g();
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
    const v = o.M[i * nc + j];
    if (!isFinite(v)) continue;
    const fill = ramp(hi > lo ? (v - lo) / (hi - lo) : 0.5);
    const r = Fig.el('rect', { x: f.x0 + j * cw, y: f.y0 + i * ch, width: cw + 0.3, height: ch + 0.3, fill });
    if (showLab) r.appendChild(Fig.el('title', {}, `${o.rows[i]} · ${o.cols[j]} · ${fmtNum(v, 4)}`));
    g.appendChild(r);
    if (o.mark && o.mark[i * nc + j]) g.appendChild(Fig.el('rect', { x: f.x0 + j * cw + 0.8, y: f.y0 + i * ch + 0.8, width: Math.max(0.5, cw - 1.6), height: Math.max(0.5, ch - 1.6), fill: 'none', stroke: Fig.onColor(fill), 'stroke-width': 1 }));
  }
  if (showLab) {
    const fs = Math.max(6.5, Math.min(10, Math.min(cw, ch) * 0.7));
    o.rows.forEach((l, i) => g.appendChild(Fig.text(f.x0 - 4, f.y0 + i * ch + ch / 2 + fs * 0.35, cut11(l, 10), { size: fs, anchor: 'end', fill: f.t.fg, font: f.font, role: 'tick' })));
    o.cols.forEach((l, j) => g.appendChild(Fig.text(f.x0 + j * cw + cw / 2 + fs * 0.35, f.y0 - 4, cut11(l, 10), { size: fs, anchor: 'start', fill: f.t.fg, font: f.font, rotate: -60, role: 'tick' })));
  }
  if (o.axisRows) g.appendChild(Fig.text(f.x0 - 8, (f.y0 + f.y1) / 2, o.axisRows, { size: 11, anchor: 'middle', fill: f.t.muted, font: f.font, rotate: -90, role: 'axis' }));
  f.g.appendChild(g);
  P3.colorbar(f, cfg, lo, hi, ramp, o.barLabel || '');
  if (o.note) f.g.appendChild(Fig.text(f.x0, f.y1 + 22, o.note, { size: 10, fill: f.t.muted, font: f.font, role: 'legend' }));
  return svg;
};

/* ---------------- scatter with a 1:1 line ---------------- */
P11.scatter = (cfg0, o) => {
  const cfg = t11(cfg0, o.titleEs, o.titleEn);
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: o.legend ? 78 : 64 } });
  const xs = o.x.filter(isFinite), ys = o.y.filter(isFinite);
  const both = o.sameScale ? xs.concat(ys) : null;
  const dx = Fig.niceDomain(Math.min(...(both || xs)), Math.max(...(both || xs))), dy = o.sameScale ? dx : Fig.niceDomain(Math.min(...ys), Math.max(...ys));
  const sx = Fig.scaleLinear(dx[0], dx[1], f.x0, f.x1), sy = Fig.scaleLinear(dy[0], dy[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || o.xlab }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || o.ylab }));
  const g = Fig.g();
  if (o.sameScale) g.appendChild(Fig.el('line', { x1: sx(dx[0]), y1: sy(dx[0]), x2: sx(dx[1]), y2: sy(dx[1]), stroke: f.t.muted, 'stroke-dasharray': '5 4' }));
  o.x.forEach((x, i) => {
    const y = o.y[i];
    if (!isFinite(x) || !isFinite(y)) return;
    const k = o.cls ? o.cls[i] : 0;
    const m = Fig.marker(sx(x), sy(y), o.r || 3.4, 'circle', { fill: Fig.alpha(Fig.color(cfg.palette, k), o.alpha || 0.65) });
    if (o.labels) m.appendChild(Fig.el('title', {}, `${o.labels[i]} · ${fmtNum(x, 4)} · ${fmtNum(y, 4)}`));
    g.appendChild(m);
  });
  f.g.appendChild(g);
  if (o.note) f.g.appendChild(Fig.text(f.x0 + 8, f.y0 + 16, o.note, { size: 11, fill: f.t.fg, font: f.font, role: 'legend', halo: f.t.bg }));
  if (o.legend) Fig.legend(f, o.legend.map((l, k) => ({ label: l, color: Fig.color(cfg.palette, k), shape: 'circle' })), cfg, { pos: 'bottom' });
  return svg;
};

/* ---------------- marker effects along the genome ---------------- */
P11.effects = (cfg0, beta, names) => {
  const cfg = t11(cfg0, 'Efectos de los marcadores (RR-BLUP)', 'Marker effects (RR-BLUP)');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const f = Fig.frame(svg, cfg, { margin: { left: 80, right: 30, top: 56, bottom: 64 } });
  const chr = names.map(nm => { const m = /^c(\d+)[_.]/i.exec(nm) || /chr?(\d+)/i.exec(nm); return m ? +m[1] : null; });
  const hasChr = chr.every(c => c != null);
  const vals = Array.from(beta, v => Math.abs(v));
  const sx = Fig.scaleLinear(0, beta.length, f.x0, f.x1), sy = Fig.scaleLinear(0, Fig.niceDomain(0, Math.max(...vals), true)[1], f.y1, f.y0);
  Fig.axisX(f, sx, Object.assign({}, cfg, { xlab: cfg.xlab || (hasChr ? T('marcador (orden en el genoma; color = cromosoma)', 'marker (genome order; colour = chromosome)') : T('marcador (orden del archivo)', 'marker (file order)')) }));
  Fig.axisY(f, sy, Object.assign({}, cfg, { ylab: cfg.ylab || T('|efecto|', '|effect|') }));
  const g = Fig.g();
  vals.forEach((v, j) => {
    const k = hasChr ? chr[j] - 1 : 0;
    const c = Fig.el('circle', { cx: sx(j + 0.5), cy: sy(v), r: 2, fill: Fig.alpha(Fig.color(cfg.palette, k % 2 ? 1 : 0), 0.8) });
    c.appendChild(Fig.el('title', {}, `${names[j]} · ${fmtNum(beta[j], 4)}`));
    g.appendChild(c);
  });
  f.g.appendChild(g);
  return svg;
};

/* ---------------- predictive ability of the cross-validation ---------------- */
P11.cv = (cfg0, models) => {
  const cfg = t11(cfg0, 'Capacidad predictiva por validación cruzada', 'Predictive ability by cross-validation');
  const svg = Fig.svg(cfg.width, cfg.height, cfg.theme);
  const labels = models.map(m => m.name);
  const all = models.flatMap(m => m.cv.reps.map(r => r.r)).concat([0]);
  const C = Fig.bandPlot(svg, cfg, labels, Fig.niceDomain(Math.min(...all), Math.max(...all, 0.1), true), { catLabel: '', valueLabel: T('r(predicho, observado)', 'r(predicted, observed)'), padding: 0.45 });
  const f = C.f, g = Fig.g();
  g.appendChild(C.ref(0, { stroke: f.t.fg }));
  models.forEach((m, i) => {
    const col = Fig.color(cfg.palette, i);
    g.appendChild(C.bar(i, m.cv.r, { fill: Fig.alpha(col, 0.35), rx: 2 }));
    m.cv.reps.forEach((r, k) => g.appendChild(C.marker(C.start(i) + C.bw * (0.2 + 0.6 * (m.cv.reps.length > 1 ? k / (m.cv.reps.length - 1) : 0.5)), r.r, 4, 'circle', { fill: col, stroke: f.t.bg })));
    const hi = m.cv.r >= 0 ? Math.max(m.cv.r, ...m.cv.reps.map(r => r.r)) : Math.min(m.cv.r, ...m.cv.reps.map(r => r.r));
    g.appendChild(C.valueText(C.center(i), hi, fmtFixed(m.cv.r, 3), { size: 10, fill: f.t.fg }, 10));
  });
  f.g.appendChild(g);
  return svg;
};

window.P11 = P11;
